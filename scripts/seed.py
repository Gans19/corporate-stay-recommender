"""Seed the CognoDB graph for the Corporate Business-Stay Recommender.

Usage (from the repo root, with backend/.env populated):
    python scripts/seed.py

The script is idempotent: it wipes the graph, creates constraints/indexes,
then loads a realistic corporate-travel dataset. Employees from the same
company cluster their stays on a handful of "preferred" hotels per city, so
the colleague-based recommendation query returns meaningful, explainable
results.

All writes use parameterised Cypher (UNWIND over list parameters). No user
value is ever concatenated into a query string.
"""
from __future__ import annotations

import json
import math
import os
import random
import sys
from pathlib import Path

from dotenv import load_dotenv
from neo4j import GraphDatabase
from neo4j.exceptions import AuthError, ServiceUnavailable

DATA_FILE = Path(__file__).parent / "data" / "dataset.json"
ENV_FILE = Path(__file__).parent.parent / "backend" / ".env"

random.seed(7)  # reproducible seed data


def jitter_coords(lat: float, lng: float, max_km: float = 6.0) -> tuple[float, float]:
    """Offset a lat/lng by a random distance (0..max_km) in a random direction.

    Used to place offices and hotels at distinct, realistic-looking points
    within a city rather than stacking every node on the same coordinate.
    """
    # ~111km per degree latitude; longitude degrees shrink with cos(latitude).
    radius_km = random.uniform(0.3, max_km)
    angle = random.uniform(0, 2 * math.pi)
    dlat = (radius_km * math.cos(angle)) / 111.0
    dlng = (radius_km * math.sin(angle)) / (111.0 * math.cos(math.radians(lat)) or 1.0)
    return round(lat + dlat, 6), round(lng + dlng, 6)


def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Great-circle distance in km — keeps the displayed NEAR distance
    consistent with the actual map coordinates."""
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlmb = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlmb / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))

FIRST_NAMES = [
    "Aarav", "Vivaan", "Aditya", "Diya", "Ananya", "Ishaan", "Kavya", "Rohan",
    "Meera", "Karthik", "Sneha", "Arjun", "Priya", "Rahul", "Divya", "Nikhil",
    "Pooja", "Vikram", "Anjali", "Suresh", "Lakshmi", "Farhan", "Zoya", "Rajesh",
    "Neha", "Sanjay", "Ritu", "Deepak", "Swati", "Manish",
]
LAST_NAMES = [
    "Sharma", "Reddy", "Nair", "Iyer", "Patel", "Menon", "Rao", "Gupta",
    "Krishnan", "Desai", "Joshi", "Pillai", "Shetty", "Verma", "Kulkarni",
    "Bose", "Chauhan", "Naidu", "Fernandes", "Bhat",
]
ROLES = [
    "Area Sales Manager", "Field Executive", "Regional Head", "Project Engineer",
    "Account Manager", "Territory Lead", "Trainee", "Operations Manager",
    "Business Analyst", "Consultant", "Auditor", "Product Specialist",
]

# Which trip purposes fit which industry (drives realistic stay records).
PURPOSE_BY_INDUSTRY = {
    "FMCG": ["FMCG Field Visit", "MICE Event", "New Hire Onboarding"],
    "IT Services": ["Client Meeting", "New Hire Onboarding", "Long Stay"],
    "Pharma": ["FMCG Field Visit", "Client Meeting", "MICE Event"],
    "Agri-business": ["FMCG Field Visit", "Long Stay", "Client Meeting"],
    "BFSI": ["Client Meeting", "MICE Event", "New Hire Onboarding"],
}

PRICE_BANDS = {1: (2500, 6000), 2: (1800, 3800), 3: (1200, 2600)}
HOTELS_PER_TIER = {1: 6, 2: 5, 3: 4}


def load_dataset() -> dict:
    with DATA_FILE.open() as f:
        return json.load(f)


def build_graph(data: dict) -> dict:
    cities = data["cities"]
    companies_in = data["companies"]
    amenities = data["amenities"]
    prefixes = data["hotelBrandPrefixes"]
    suffixes = data["hotelBrandSuffixes"]

    city_by_name = {c["name"]: c for c in cities}

    # ---- Offices (one per company-city) ----
    companies: list[dict] = []
    office_id = 1
    offices_by_city: dict[str, list[dict]] = {c["name"]: [] for c in cities}
    for co in companies_in:
        offices = []
        for city in co["officeCities"]:
            base = city_by_name[city]
            olat, olng = jitter_coords(base["lat"], base["lng"], max_km=4.0)
            office = {
                "officeId": office_id,
                "name": f"{co['name']} — {city} Office",
                "city": city,
                "lat": olat,
                "lng": olng,
            }
            offices.append(office)
            offices_by_city[city].append(office)
            office_id += 1
        companies.append({**co, "offices": offices})

    # ---- Hotels ----
    hotels: list[dict] = []
    hotel_amenities: list[dict] = []
    hotel_near: list[dict] = []
    hotels_by_city: dict[str, list[dict]] = {c["name"]: [] for c in cities}
    hotel_id = 1
    used_names: set[str] = set()

    for city in cities:
        tier = city["tier"]
        for _ in range(HOTELS_PER_TIER[tier]):
            # unique-ish hotel name
            for _try in range(20):
                name = f"{random.choice(prefixes)} {random.choice(suffixes)} {city['name']}"
                if name not in used_names:
                    break
            used_names.add(name)

            lo, hi = PRICE_BANDS[tier]
            price = random.randrange(lo, hi, 50)
            safety = round(random.uniform(3.2, 5.0), 1)
            star = round(random.choice([2.5, 3.0, 3.0, 3.5, 3.5, 4.0, 4.5]), 1)

            # amenity subset; safer hotels more likely women-safe certified
            base = random.sample(amenities, k=random.randint(5, 9))
            if safety >= 4.3 and "Women-Safe Certified" not in base:
                base.append("Women-Safe Certified")

            hlat, hlng = jitter_coords(city["lat"], city["lng"], max_km=8.0)
            hotel = {
                "hotelId": hotel_id,
                "name": name,
                "city": city["name"],
                "pricePerNight": price,
                "starRating": star,
                "safetyScore": safety,
                "gstRegistered": random.random() > 0.12,
                "lat": hlat,
                "lng": hlng,
            }
            hotels.append(hotel)
            hotels_by_city[city["name"]].append(hotel)
            for am in set(base):
                hotel_amenities.append({"hotelId": hotel_id, "amenity": am})
            # NEAR relationships to offices in the same city — distance is the
            # real great-circle distance between the hotel and office
            # coordinates, so the map and the stated km always agree.
            for office in offices_by_city[city["name"]]:
                dist = round(haversine_km(hlat, hlng, office["lat"], office["lng"]), 1)
                hotel_near.append(
                    {"hotelId": hotel_id, "officeId": office["officeId"], "distanceKm": dist}
                )
            hotel_id += 1

    # ---- Per-(company, city) preferred hotels (creates colleague clustering) ----
    preferred: dict[tuple[int, str], list[int]] = {}
    for co in companies:
        for city in co["officeCities"]:
            pool = hotels_by_city[city]
            if not pool:
                continue
            k = min(3, len(pool))
            preferred[(co["companyId"], city)] = [
                h["hotelId"] for h in random.sample(pool, k=k)
            ]

    hotels_index = {h["hotelId"]: h for h in hotels}

    # ---- Employees + stays ----
    employees: list[dict] = []
    stays: list[dict] = []
    employee_id = 1
    for co in companies:
        n_emp = random.randint(16, 22)
        purposes = PURPOSE_BY_INDUSTRY[co["industry"]]
        for _ in range(n_emp):
            home = random.choice(co["officeCities"])
            emp = {
                "employeeId": employee_id,
                "name": f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}",
                "role": random.choice(ROLES),
                "homeCity": home,
                "companyId": co["companyId"],
            }
            employees.append(emp)

            # Each employee takes several trips to company cities (often not home)
            trip_cities = [c for c in co["officeCities"]]
            random.shuffle(trip_cities)
            n_trips = random.randint(3, 6)
            for city in trip_cities[:n_trips]:
                pool = hotels_by_city[city]
                if not pool:
                    continue
                pref = preferred.get((co["companyId"], city), [])
                # 70% stay at a preferred hotel -> strong colleague signal
                if pref and random.random() < 0.7:
                    hid = random.choice(pref)
                    rating = random.choice([4.0, 4.5, 4.5, 5.0])
                else:
                    hid = random.choice(pool)["hotelId"]
                    rating = random.choice([3.0, 3.5, 4.0, 4.5])
                purpose = random.choice(purposes)
                nights = random.randint(30, 120) if purpose == "Long Stay" else random.randint(1, 4)
                price = hotels_index[hid]["pricePerNight"]
                stays.append(
                    {
                        "employeeId": employee_id,
                        "hotelId": hid,
                        "rating": rating,
                        "cost": price * nights,
                        "purpose": purpose,
                        "nights": nights,
                    }
                )
            employee_id += 1

    return {
        "cities": cities,
        "amenities": amenities,
        "companies": companies,
        "hotels": hotels,
        "hotel_amenities": hotel_amenities,
        "hotel_near": hotel_near,
        "employees": employees,
        "stays": stays,
    }


CONSTRAINTS = [
    "CREATE CONSTRAINT company_id IF NOT EXISTS FOR (c:Company) REQUIRE c.companyId IS UNIQUE",
    "CREATE CONSTRAINT employee_id IF NOT EXISTS FOR (e:Employee) REQUIRE e.employeeId IS UNIQUE",
    "CREATE CONSTRAINT hotel_id IF NOT EXISTS FOR (h:Hotel) REQUIRE h.hotelId IS UNIQUE",
    "CREATE CONSTRAINT office_id IF NOT EXISTS FOR (o:Office) REQUIRE o.officeId IS UNIQUE",
    "CREATE CONSTRAINT city_name IF NOT EXISTS FOR (ci:City) REQUIRE ci.name IS UNIQUE",
    "CREATE CONSTRAINT amenity_name IF NOT EXISTS FOR (a:Amenity) REQUIRE a.name IS UNIQUE",
]


def load(session, g: dict) -> None:
    print("Wiping existing graph data...")
    session.run("MATCH (n) DETACH DELETE n")

    print("Creating constraints/indexes...")
    for stmt in CONSTRAINTS:
        session.run(stmt)

    print(f"Loading {len(g['cities'])} cities + {len(g['amenities'])} amenities...")
    session.run(
        "UNWIND $cities AS c MERGE (ci:City {name: c.name}) "
        "SET ci.tier = c.tier, ci.state = c.state, ci.lat = c.lat, ci.lng = c.lng",
        cities=g["cities"],
    )
    session.run(
        "UNWIND $amenities AS a MERGE (:Amenity {name: a})",
        amenities=g["amenities"],
    )

    print(f"Loading {len(g['companies'])} companies + offices...")
    session.run(
        """
        UNWIND $companies AS co
        MERGE (c:Company {companyId: co.companyId})
          SET c.name = co.name, c.industry = co.industry
        WITH c, co
        UNWIND co.offices AS off
          MERGE (o:Office {officeId: off.officeId})
            SET o.name = off.name, o.lat = off.lat, o.lng = off.lng
          MERGE (c)-[:HAS_OFFICE]->(o)
          WITH o, off
          MATCH (ci:City {name: off.city})
          MERGE (o)-[:IN_CITY]->(ci)
        """,
        companies=g["companies"],
    )

    print(f"Loading {len(g['hotels'])} hotels...")
    session.run(
        """
        UNWIND $hotels AS h
        MERGE (hotel:Hotel {hotelId: h.hotelId})
          SET hotel.name = h.name,
              hotel.pricePerNight = h.pricePerNight,
              hotel.starRating = h.starRating,
              hotel.safetyScore = h.safetyScore,
              hotel.gstRegistered = h.gstRegistered,
              hotel.lat = h.lat,
              hotel.lng = h.lng
        WITH hotel, h
        MATCH (ci:City {name: h.city})
        MERGE (hotel)-[:LOCATED_IN]->(ci)
        """,
        hotels=g["hotels"],
    )
    session.run(
        """
        UNWIND $links AS l
        MATCH (h:Hotel {hotelId: l.hotelId})
        MATCH (a:Amenity {name: l.amenity})
        MERGE (h)-[:HAS_AMENITY]->(a)
        """,
        links=g["hotel_amenities"],
    )
    session.run(
        """
        UNWIND $links AS l
        MATCH (h:Hotel {hotelId: l.hotelId})
        MATCH (o:Office {officeId: l.officeId})
        MERGE (h)-[rel:NEAR]->(o)
          SET rel.distanceKm = l.distanceKm
        """,
        links=g["hotel_near"],
    )

    print(f"Loading {len(g['employees'])} employees...")
    session.run(
        """
        UNWIND $employees AS e
        MERGE (emp:Employee {employeeId: e.employeeId})
          SET emp.name = e.name, emp.role = e.role, emp.homeCity = e.homeCity
        WITH emp, e
        MATCH (c:Company {companyId: e.companyId})
        MERGE (emp)-[:WORKS_FOR]->(c)
        """,
        employees=g["employees"],
    )

    print(f"Loading {len(g['stays'])} stays...")
    session.run(
        """
        UNWIND $stays AS s
        MATCH (e:Employee {employeeId: s.employeeId})
        MATCH (h:Hotel {hotelId: s.hotelId})
        MERGE (e)-[r:STAYED_AT {purpose: s.purpose}]->(h)
          SET r.rating = s.rating, r.cost = s.cost, r.nights = s.nights
        """,
        stays=g["stays"],
    )


def main() -> int:
    load_dotenv(ENV_FILE)
    uri = os.getenv("NEO4J_URI")
    user = os.getenv("NEO4J_USER", "cognodb")
    password = os.getenv("NEO4J_PASSWORD")
    database = os.getenv("NEO4J_DATABASE", "neo4j")

    if not uri or not password:
        print(
            "ERROR: NEO4J_URI and NEO4J_PASSWORD must be set.\n"
            f"Copy backend/.env.example to backend/.env and fill in your CognoDB "
            f"connection details (looked in {ENV_FILE}).",
            file=sys.stderr,
        )
        return 1

    data = load_dataset()
    g = build_graph(data)

    try:
        driver = GraphDatabase.driver(uri, auth=(user, password))
        driver.verify_connectivity()
    except (ServiceUnavailable, AuthError, OSError) as exc:
        print(f"ERROR: could not connect to the database: {exc}", file=sys.stderr)
        return 2

    with driver.session(database=database) as session:
        load(session, g)
        counts = session.run(
            """
            MATCH (c:Company)  WITH count(c) AS companies
            MATCH (e:Employee) WITH companies, count(e) AS employees
            MATCH (h:Hotel)    WITH companies, employees, count(h) AS hotels
            MATCH (ci:City)    WITH companies, employees, hotels, count(ci) AS cities
            MATCH (:Employee)-[s:STAYED_AT]->(:Hotel)
            RETURN companies, employees, hotels, cities, count(s) AS stays
            """
        ).single()

    driver.close()
    print("\nSeed complete:")
    print(f"  Companies: {counts['companies']}")
    print(f"  Employees: {counts['employees']}")
    print(f"  Hotels   : {counts['hotels']}")
    print(f"  Cities   : {counts['cities']}")
    print(f"  Stays    : {counts['stays']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
