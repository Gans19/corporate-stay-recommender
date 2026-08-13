export interface EmployeeSummary {
  employeeId: number;
  name: string;
  role: string | null;
  homeCity: string | null;
  company: string;
  stays: number;
}

export interface StaySummary {
  hotelId: number;
  hotel: string;
  city: string;
  rating: number | null;
  purpose: string | null;
  cost: number | null;
}

export interface EmployeeDetail {
  employeeId: number;
  name: string;
  role: string | null;
  homeCity: string | null;
  company: string;
  recentStays: StaySummary[];
}

export interface CitySummary {
  name: string;
  tier: number | null;
  state: string | null;
  hotels: number;
}

export interface Recommendation {
  hotelId: number;
  name: string;
  pricePerNight: number;
  starRating: number | null;
  safetyScore: number | null;
  gstRegistered: boolean | null;
  city: string;
  colleagueCount: number;
  colleagueAvgRating: number | null;
  colleagues: string[];
  purposes: string[];
  amenities: string[];
}

export interface SimilarHotel {
  hotelId: number;
  name: string;
  pricePerNight: number;
  starRating: number | null;
  city: string;
  sharedAmenities: number;
  sharedAmenityNames: string[];
}

export interface PathNode {
  label: string;
  name: string | null;
}

export interface ConnectionPath {
  nodes: PathNode[];
  relationships: string[];
  hops: number;
}

export interface GraphStats {
  companies: number;
  employees: number;
  hotels: number;
  cities: number;
  stays: number;
}

export interface HealthStatus {
  status: string;
  database: string;
}

export const PURPOSES = [
  "FMCG Field Visit",
  "New Hire Onboarding",
  "Long Stay",
  "MICE Event",
  "Client Meeting",
] as const;
