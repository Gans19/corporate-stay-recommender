import { useMemo } from "react";
import { MapContainer, Marker, Polyline, Popup, TileLayer } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { MapContext } from "../types";

/**
 * Colored circular pin icons (office = violet, hotel = mint) built as plain
 * divIcons so we don't need to ship Leaflet's default marker image assets.
 */
function pin(color: string, label: string) {
  return L.divIcon({
    className: "route-pin",
    html: `<span style="background:${color}">${label}</span>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

const officeIcon = pin("#7c6cf6", "O");
const hotelIcon = pin("#22c8a0", "H");

/** Road-sign style distance badge placed at the midpoint of the route line. */
function distanceIcon(km: number) {
  return L.divIcon({
    className: "route-distance-pin",
    html: `<span>${km} km</span>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

/**
 * Renders a real route map (OpenStreetMap via Leaflet) showing the traveler's
 * company office and the recommended hotel as pins, connected by a line — a
 * concrete, geographic answer to "how close is this, really?" that
 * complements the abstract graph-path view.
 */
export function RouteMap({ context }: { context: MapContext }) {
  const hasHotel = context.hotelLat != null && context.hotelLng != null;
  const office = context.offices.find((o) => o.lat != null && o.lng != null);

  const bounds = useMemo(() => {
    const points: [number, number][] = [];
    if (hasHotel) points.push([context.hotelLat!, context.hotelLng!]);
    if (office) points.push([office.lat!, office.lng!]);
    return points;
  }, [context, hasHotel, office]);

  if (!hasHotel) {
    return <p className="map-empty">No coordinates available for this hotel yet.</p>;
  }

  const center: [number, number] = office
    ? [(context.hotelLat! + office.lat!) / 2, (context.hotelLng! + office.lng!) / 2]
    : [context.hotelLat!, context.hotelLng!];

  return (
    <div className="route-map">
      <MapContainer
        center={center}
        zoom={office ? 12 : 13}
        scrollWheelZoom={false}
        style={{ height: "260px", width: "100%" }}
        bounds={bounds.length === 2 ? bounds : undefined}
        boundsOptions={{ padding: [36, 36] }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {office && bounds.length === 2 && (
          <Polyline
            positions={bounds}
            pathOptions={{ color: "#7c6cf6", weight: 3, dashArray: "6 8", opacity: 0.8 }}
          />
        )}
        {office && bounds.length === 2 && office.distanceKm != null && (
          <Marker
            position={[
              (bounds[0][0] + bounds[1][0]) / 2,
              (bounds[0][1] + bounds[1][1]) / 2,
            ]}
            icon={distanceIcon(office.distanceKm)}
            interactive={false}
          />
        )}
        {office && (
          <Marker position={[office.lat!, office.lng!]} icon={officeIcon}>
            <Popup>
              <b>{office.name ?? "Office"}</b>
              <br />
              {office.distanceKm != null && `${office.distanceKm} km from hotel`}
            </Popup>
          </Marker>
        )}
        <Marker position={[context.hotelLat!, context.hotelLng!]} icon={hotelIcon}>
          <Popup>
            <b>{context.hotelName}</b>
            <br />
            {context.city}
          </Popup>
        </Marker>
      </MapContainer>
      <div className="map-legend">
        <span className="map-legend-item">
          <span className="map-dot" style={{ background: "#7c6cf6" }} /> Office
        </span>
        <span className="map-legend-item">
          <span className="map-dot" style={{ background: "#22c8a0" }} /> Hotel
        </span>
        {office?.distanceKm != null && (
          <span className="map-legend-item muted">{office.distanceKm} km apart</span>
        )}
      </div>
    </div>
  );
}
