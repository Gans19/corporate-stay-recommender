"""Cypher queries for the corporate business-stay graph.

Domain model
------------
    (:Employee)-[:WORKS_FOR]->(:Company)
    (:Company)-[:HAS_OFFICE]->(:Office)-[:IN_CITY]->(:City)
    (:Hotel)-[:LOCATED_IN]->(:City)
    (:Hotel)-[:NEAR {distanceKm}]->(:Office)
    (:Hotel)-[:HAS_AMENITY]->(:Amenity)
    (:Employee)-[:STAYED_AT {rating, cost, purpose, nights, checkIn}]->(:Hotel)

Every query is parameterised. User-supplied values are always passed as query
parameters ($name), never concatenated into the query string.
"""
from __future__ import annotations

from typing import Any

from . import db


# --------------------------------------------------------------------------- #
# Reference / browse
# --------------------------------------------------------------------------- #
def list_employees(limit: int = 60) -> list[dict[str, Any]]:
    """Employees who have travel history, so the demo can pick a traveler."""
    query = """
    MATCH (e:Employee)-[:WORKS_FOR]->(c:Company)
    OPTIONAL MATCH (e)-[s:STAYED_AT]->(:Hotel)
    WITH e, c, count(s) AS stays
    RETURN e.employeeId AS employeeId,
           e.name       AS name,
           e.role       AS role,
           e.homeCity    AS homeCity,
           c.name        AS company,
           stays
    ORDER BY stays DESC, e.name
    LIMIT $limit
    """
    return db.run_read(query, limit=limit)


def list_cities() -> list[dict[str, Any]]:
    """Cities that have at least one hotel, for the destination picker."""
    query = """
    MATCH (city:City)<-[:LOCATED_IN]-(h:Hotel)
    WITH city, count(h) AS hotels
    RETURN city.name AS name, city.tier AS tier, city.state AS state, hotels
    ORDER BY city.tier, city.name
    """
    return db.run_read(query)


def search_hotels(term: str, limit: int = 20) -> list[dict[str, Any]]:
    query = """
    MATCH (h:Hotel)-[:LOCATED_IN]->(city:City)
    WHERE toLower(h.name) CONTAINS toLower($term)
       OR toLower(city.name) CONTAINS toLower($term)
    RETURN h.hotelId AS hotelId,
           h.name    AS name,
           h.pricePerNight AS pricePerNight,
           h.starRating    AS starRating,
           city.name AS city
    ORDER BY h.name
    LIMIT $limit
    """
    return db.run_read(query, term=term, limit=limit)


# --------------------------------------------------------------------------- #
# Profiles
# --------------------------------------------------------------------------- #
def get_employee(employee_id: int) -> dict[str, Any] | None:
    query = """
    MATCH (e:Employee {employeeId: $employeeId})-[:WORKS_FOR]->(c:Company)
    OPTIONAL MATCH (e)-[s:STAYED_AT]->(h:Hotel)-[:LOCATED_IN]->(city:City)
    WITH e, c,
         collect(CASE WHEN h IS NULL THEN NULL ELSE {
            hotelId: h.hotelId, hotel: h.name, city: city.name,
            rating: s.rating, purpose: s.purpose, cost: s.cost
         } END)[0..12] AS stays
    RETURN e.employeeId AS employeeId,
           e.name  AS name,
           e.role  AS role,
           e.homeCity AS homeCity,
           c.name  AS company,
           [x IN stays WHERE x IS NOT NULL] AS recentStays
    """
    rows = db.run_read(query, employeeId=employee_id)
    return rows[0] if rows else None


def get_hotel(hotel_id: int) -> dict[str, Any] | None:
    query = """
    MATCH (h:Hotel {hotelId: $hotelId})-[:LOCATED_IN]->(city:City)
    OPTIONAL MATCH (h)-[:HAS_AMENITY]->(a:Amenity)
    OPTIONAL MATCH (h)-[n:NEAR]->(o:Office)<-[:HAS_OFFICE]-(oc:Company)
    OPTIONAL MATCH (h)<-[s:STAYED_AT]-(:Employee)
    RETURN h.hotelId AS hotelId,
           h.name AS name,
           h.pricePerNight AS pricePerNight,
           h.starRating   AS starRating,
           h.safetyScore  AS safetyScore,
           h.gstRegistered AS gstRegistered,
           city.name AS city,
           city.tier AS cityTier,
           collect(DISTINCT a.name) AS amenities,
           collect(DISTINCT {company: oc.name, office: o.name, distanceKm: n.distanceKm})[0..5] AS nearOffices,
           round(avg(s.rating) * 100.0) / 100.0 AS avgRating,
           count(s) AS stayCount
    """
    rows = db.run_read(query, hotelId=hotel_id)
    return rows[0] if rows else None


# --------------------------------------------------------------------------- #
# THE killer query: colleague-based, explainable recommendation
# --------------------------------------------------------------------------- #
def colleague_recommendations(
    employee_id: int,
    city: str,
    purpose: str | None = None,
    max_price: int | None = None,
    limit: int = 10,
    min_rating: float = 4.0,
) -> list[dict[str, Any]]:
    """Recommend hotels in `city` based on colleagues' well-rated stays.

    Traversal (>= 3 hops):
        (me)-[:WORKS_FOR]->(company)<-[:WORKS_FOR]-(colleague)
            -[:STAYED_AT]->(hotel)-[:LOCATED_IN]->(city)

    We return *why* each hotel is recommended: how many colleagues rated it
    highly, their average rating, and the trip purposes — the explanation path
    that makes the graph the star of the show. Optional purpose/price filters
    mirror Hummingbird's real booking constraints (e.g. FMCG stays <2500).
    """
    query = """
    MATCH (me:Employee {employeeId: $employeeId})-[:WORKS_FOR]->(company:Company)
    OPTIONAL MATCH (me)-[:STAYED_AT]->(mine:Hotel)
    WITH me, company, collect(DISTINCT mine.hotelId) AS myHotels
    MATCH (city:City {name: $city})
    MATCH (company)<-[:WORKS_FOR]-(colleague:Employee)-[s:STAYED_AT]->(hotel:Hotel)-[:LOCATED_IN]->(city)
    WHERE colleague <> me
      AND s.rating >= $minRating
      AND ($purpose IS NULL OR s.purpose = $purpose)
      AND ($maxPrice IS NULL OR hotel.pricePerNight <= $maxPrice)
      AND NOT hotel.hotelId IN myHotels
    WITH hotel, city,
         count(DISTINCT colleague) AS colleagueCount,
         avg(s.rating) AS avgRating,
         collect(DISTINCT colleague.name)[0..4] AS colleagues,
         collect(DISTINCT s.purpose) AS purposes
    OPTIONAL MATCH (hotel)-[:HAS_AMENITY]->(a:Amenity)
    RETURN hotel.hotelId AS hotelId,
           hotel.name    AS name,
           hotel.pricePerNight AS pricePerNight,
           hotel.starRating    AS starRating,
           hotel.safetyScore   AS safetyScore,
           hotel.gstRegistered AS gstRegistered,
           city.name AS city,
           colleagueCount,
           round(avgRating * 100.0) / 100.0 AS colleagueAvgRating,
           colleagues,
           purposes,
           collect(DISTINCT a.name)[0..5] AS amenities
    ORDER BY colleagueCount DESC, colleagueAvgRating DESC, hotel.pricePerNight ASC
    LIMIT $limit
    """
    return db.run_read(
        query,
        employeeId=employee_id,
        city=city,
        purpose=purpose,
        maxPrice=max_price,
        minRating=min_rating,
        limit=limit,
    )


def near_office_hotels(
    company_name: str, city: str, max_km: float = 5.0, max_price: int | None = None
) -> list[dict[str, Any]]:
    """Hotels within `max_km` of the company's office in `city`.

    Supports the "quality service apartments within 5 km of workplace" rule.
    """
    query = """
    MATCH (c:Company {name: $company})-[:HAS_OFFICE]->(o:Office)-[:IN_CITY]->(city:City {name: $city})
    MATCH (h:Hotel)-[n:NEAR]->(o)
    WHERE n.distanceKm <= $maxKm
      AND ($maxPrice IS NULL OR h.pricePerNight <= $maxPrice)
    OPTIONAL MATCH (h)<-[s:STAYED_AT]-(:Employee)
    RETURN h.hotelId AS hotelId,
           h.name AS name,
           h.pricePerNight AS pricePerNight,
           h.starRating   AS starRating,
           o.name AS office,
           n.distanceKm AS distanceKm,
           round(avg(s.rating) * 100.0) / 100.0 AS avgRating
    ORDER BY n.distanceKm ASC, h.pricePerNight ASC
    """
    return db.run_read(
        query, company=company_name, city=city, maxKm=max_km, maxPrice=max_price
    )


def similar_hotels(hotel_id: int, limit: int = 6) -> list[dict[str, Any]]:
    """Fallback finder: hotels in the same city sharing amenities + budget band.

    Used when a preferred hotel is full. Similarity via shared amenities is a
    natural graph traversal, awkward as a relational query.
    """
    query = """
    MATCH (base:Hotel {hotelId: $hotelId})-[:LOCATED_IN]->(city:City)
    MATCH (base)-[:HAS_AMENITY]->(a:Amenity)<-[:HAS_AMENITY]-(other:Hotel)-[:LOCATED_IN]->(city)
    WHERE other <> base
      AND abs(other.pricePerNight - base.pricePerNight) <= 800
    WITH other, city, count(DISTINCT a) AS sharedAmenities,
         collect(DISTINCT a.name)[0..5] AS sharedList
    RETURN other.hotelId AS hotelId,
           other.name    AS name,
           other.pricePerNight AS pricePerNight,
           other.starRating    AS starRating,
           city.name AS city,
           sharedAmenities,
           sharedList AS sharedAmenityNames
    ORDER BY sharedAmenities DESC, other.pricePerNight ASC
    LIMIT $limit
    """
    return db.run_read(query, hotelId=hotel_id, limit=limit)


def connection_path(employee_id: int, hotel_id: int) -> dict[str, Any] | None:
    """Explain how an employee connects to a recommended hotel.

    Returns the shortest path (up to 5 hops) between the employee and the
    hotel — e.g. Employee -> Company <- Colleague -> Hotel. This variable-length
    path query is exactly the kind of thing a relational database handles very
    awkwardly.
    """
    query = """
    MATCH (e:Employee {employeeId: $employeeId}), (h:Hotel {hotelId: $hotelId})
    MATCH p = shortestPath((e)-[*..5]-(h))
    WITH p, nodes(p) AS ns, relationships(p) AS rs
    RETURN [n IN ns |
              { label: head(labels(n)),
                name:  coalesce(n.name, n.title) }] AS nodes,
           [r IN rs | type(r)] AS relationships,
           length(p) AS hops
    """
    rows = db.run_read(query, employeeId=employee_id, hotelId=hotel_id)
    return rows[0] if rows else None


# --------------------------------------------------------------------------- #
# Stats
# --------------------------------------------------------------------------- #
def graph_stats() -> dict[str, Any]:
    query = """
    OPTIONAL MATCH (c:Company)  WITH count(c) AS companies
    OPTIONAL MATCH (e:Employee) WITH companies, count(e) AS employees
    OPTIONAL MATCH (h:Hotel)    WITH companies, employees, count(h) AS hotels
    OPTIONAL MATCH (ci:City)    WITH companies, employees, hotels, count(ci) AS cities
    OPTIONAL MATCH (:Employee)-[s:STAYED_AT]->(:Hotel)
    RETURN companies, employees, hotels, cities, count(s) AS stays
    """
    rows = db.run_read(query)
    return rows[0] if rows else {}
