import type {
  CitySummary,
  ConnectionPath,
  EmployeeDetail,
  EmployeeSummary,
  GraphStats,
  HealthStatus,
  MapContext,
  Recommendation,
  SimilarHotel,
} from "./types";

const BASE = import.meta.env.VITE_API_BASE_URL ?? "";

/** Thrown for any non-2xx API response so the UI can show an error state. */
export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

async function getJSON<T>(path: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`);
  } catch {
    throw new ApiError(0, "Cannot reach the server. Is the backend running?");
  }
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail ?? detail;
    } catch {
      /* ignore parse errors */
    }
    throw new ApiError(res.status, detail);
  }
  return res.json() as Promise<T>;
}

const qs = (params: Record<string, string | number | undefined | null>) => {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
};

export const api = {
  health: () => getJSON<HealthStatus>("/api/health"),
  stats: () => getJSON<GraphStats>("/api/stats"),
  employees: () => getJSON<EmployeeSummary[]>("/api/employees"),
  employee: (id: number) => getJSON<EmployeeDetail>(`/api/employees/${id}`),
  cities: () => getJSON<CitySummary[]>("/api/cities"),
  recommendations: (
    employeeId: number,
    opts: { city: string; purpose?: string; maxPrice?: number }
  ) =>
    getJSON<Recommendation[]>(
      `/api/employees/${employeeId}/recommendations${qs({
        city: opts.city,
        purpose: opts.purpose,
        max_price: opts.maxPrice,
      })}`
    ),
  similar: (hotelId: number) =>
    getJSON<SimilarHotel[]>(`/api/hotels/${hotelId}/similar`),
  connection: (employeeId: number, hotelId: number) =>
    getJSON<ConnectionPath>(`/api/employees/${employeeId}/connection/${hotelId}`),
  mapContext: (employeeId: number, hotelId: number) =>
    getJSON<MapContext>(`/api/employees/${employeeId}/map/${hotelId}`),
};
