"""FastAPI application entry point.

Exposes a small REST API over the corporate business-stay graph. Every endpoint
degrades gracefully with a 503 when the database is unreachable, so the UI can
show a friendly error state instead of crashing.
"""
from __future__ import annotations

import logging

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from . import db, queries
from .config import get_settings
from .models import (
    CitySummary,
    ConnectionPath,
    EmployeeDetail,
    EmployeeSummary,
    GraphStats,
    HealthStatus,
    HotelDetail,
    HotelSummary,
    NearOfficeHotel,
    Recommendation,
    SimilarHotel,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("app")

settings = get_settings()

app = FastAPI(
    title="Corporate Stay Recommender",
    description=(
        "Explainable, colleague-based corporate hotel recommendations backed by "
        "CognoDB (openCypher / Bolt)."
    ),
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
def _shutdown() -> None:
    db.close_driver()


def _db_guard(fn, *args, **kwargs):
    """Run a query function and translate DB outages into a clean 503."""
    try:
        return fn(*args, **kwargs)
    except db.DatabaseUnavailable as exc:
        raise HTTPException(status_code=503, detail=f"Database unreachable: {exc}")


# --------------------------------------------------------------------------- #
# System
# --------------------------------------------------------------------------- #
@app.get("/api/health", response_model=HealthStatus, tags=["system"])
def health() -> HealthStatus:
    reachable = db.verify_connectivity()
    return HealthStatus(
        status="ok" if reachable else "degraded",
        database="connected" if reachable else "unreachable",
    )


@app.get("/api/stats", response_model=GraphStats, tags=["system"])
def stats() -> GraphStats:
    return GraphStats(**_db_guard(queries.graph_stats))


# --------------------------------------------------------------------------- #
# Reference data
# --------------------------------------------------------------------------- #
@app.get("/api/employees", response_model=list[EmployeeSummary], tags=["employees"])
def employees(limit: int = Query(60, ge=1, le=200)) -> list[EmployeeSummary]:
    rows = _db_guard(queries.list_employees, limit)
    return [EmployeeSummary(**r) for r in rows]


@app.get("/api/employees/{employee_id}", response_model=EmployeeDetail, tags=["employees"])
def employee_detail(employee_id: int) -> EmployeeDetail:
    row = _db_guard(queries.get_employee, employee_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Employee not found")
    return EmployeeDetail(**row)


@app.get("/api/cities", response_model=list[CitySummary], tags=["reference"])
def cities() -> list[CitySummary]:
    return [CitySummary(**r) for r in _db_guard(queries.list_cities)]


@app.get("/api/hotels/search", response_model=list[HotelSummary], tags=["hotels"])
def search(
    q: str = Query(..., min_length=1),
    limit: int = Query(20, ge=1, le=100),
) -> list[HotelSummary]:
    return [HotelSummary(**r) for r in _db_guard(queries.search_hotels, q, limit)]


@app.get("/api/hotels/{hotel_id}", response_model=HotelDetail, tags=["hotels"])
def hotel_detail(hotel_id: int) -> HotelDetail:
    row = _db_guard(queries.get_hotel, hotel_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Hotel not found")
    return HotelDetail(**row)


@app.get("/api/hotels/{hotel_id}/similar", response_model=list[SimilarHotel], tags=["hotels"])
def hotel_similar(
    hotel_id: int, limit: int = Query(6, ge=1, le=20)
) -> list[SimilarHotel]:
    return [SimilarHotel(**r) for r in _db_guard(queries.similar_hotels, hotel_id, limit)]


# --------------------------------------------------------------------------- #
# Recommendations
# --------------------------------------------------------------------------- #
@app.get(
    "/api/employees/{employee_id}/recommendations",
    response_model=list[Recommendation],
    tags=["recommendations"],
)
def recommendations(
    employee_id: int,
    city: str = Query(..., description="Destination city"),
    purpose: str | None = Query(None, description="Trip purpose filter"),
    max_price: int | None = Query(None, ge=0, description="Max price per night (INR)"),
    limit: int = Query(10, ge=1, le=50),
    min_rating: float = Query(4.0, ge=0.5, le=5.0),
) -> list[Recommendation]:
    rows = _db_guard(
        queries.colleague_recommendations,
        employee_id,
        city,
        purpose,
        max_price,
        limit,
        min_rating,
    )
    return [Recommendation(**r) for r in rows]


@app.get(
    "/api/near-office",
    response_model=list[NearOfficeHotel],
    tags=["recommendations"],
)
def near_office(
    company: str = Query(..., description="Company name"),
    city: str = Query(..., description="City name"),
    max_km: float = Query(5.0, ge=0.1, le=50),
    max_price: int | None = Query(None, ge=0),
) -> list[NearOfficeHotel]:
    rows = _db_guard(queries.near_office_hotels, company, city, max_km, max_price)
    return [NearOfficeHotel(**r) for r in rows]


@app.get(
    "/api/employees/{employee_id}/connection/{hotel_id}",
    response_model=ConnectionPath,
    tags=["recommendations"],
)
def connection(employee_id: int, hotel_id: int) -> ConnectionPath:
    path = _db_guard(queries.connection_path, employee_id, hotel_id)
    if path is None:
        raise HTTPException(status_code=404, detail="No connecting path found")
    return ConnectionPath(**path)
