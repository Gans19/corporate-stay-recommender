"""Pydantic response models — used for API docs and response validation."""
from __future__ import annotations

from pydantic import BaseModel


class EmployeeSummary(BaseModel):
    employeeId: int
    name: str
    role: str | None = None
    homeCity: str | None = None
    company: str
    stays: int = 0


class StaySummary(BaseModel):
    hotelId: int
    hotel: str
    city: str
    rating: float | None = None
    purpose: str | None = None
    cost: int | None = None


class EmployeeDetail(BaseModel):
    employeeId: int
    name: str
    role: str | None = None
    homeCity: str | None = None
    company: str
    recentStays: list[StaySummary] = []


class CitySummary(BaseModel):
    name: str
    tier: int | None = None
    state: str | None = None
    hotels: int = 0


class NearOffice(BaseModel):
    company: str | None = None
    office: str | None = None
    distanceKm: float | None = None


class HotelSummary(BaseModel):
    hotelId: int
    name: str
    pricePerNight: int
    starRating: float | None = None
    city: str


class HotelDetail(BaseModel):
    hotelId: int
    name: str
    pricePerNight: int
    starRating: float | None = None
    safetyScore: float | None = None
    gstRegistered: bool | None = None
    city: str
    cityTier: int | None = None
    amenities: list[str] = []
    nearOffices: list[NearOffice] = []
    avgRating: float | None = None
    stayCount: int = 0


class Recommendation(BaseModel):
    hotelId: int
    name: str
    pricePerNight: int
    starRating: float | None = None
    safetyScore: float | None = None
    gstRegistered: bool | None = None
    city: str
    lat: float | None = None
    lng: float | None = None
    colleagueCount: int
    colleagueAvgRating: float | None = None
    colleagues: list[str] = []
    purposes: list[str] = []
    amenities: list[str] = []


class NearOfficeHotel(BaseModel):
    hotelId: int
    name: str
    pricePerNight: int
    starRating: float | None = None
    office: str
    distanceKm: float
    avgRating: float | None = None


class SimilarHotel(BaseModel):
    hotelId: int
    name: str
    pricePerNight: int
    starRating: float | None = None
    city: str
    sharedAmenities: int
    sharedAmenityNames: list[str] = []


class PathNode(BaseModel):
    label: str
    name: str | None = None


class ConnectionPath(BaseModel):
    nodes: list[PathNode]
    relationships: list[str]
    hops: int


class MapOffice(BaseModel):
    officeId: int | None = None
    name: str | None = None
    lat: float | None = None
    lng: float | None = None
    distanceKm: float | None = None


class MapContext(BaseModel):
    city: str
    cityLat: float | None = None
    cityLng: float | None = None
    hotelId: int
    hotelName: str
    hotelLat: float | None = None
    hotelLng: float | None = None
    offices: list[MapOffice] = []


class GraphStats(BaseModel):
    companies: int = 0
    employees: int = 0
    hotels: int = 0
    cities: int = 0
    stays: int = 0


class HealthStatus(BaseModel):
    status: str
    database: str
