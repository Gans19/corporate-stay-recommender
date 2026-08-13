import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { api } from "../api";
import type { ConnectionPath, MapContext, Recommendation } from "../types";
import { cardIn } from "../motion";
import { ConnectionPathView } from "./ConnectionPathView";
import { AvatarStack, HotelMonogram } from "./Avatars";
import { RouteMap } from "./RouteMap";

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

function explanation(rec: Recommendation) {
  const names = rec.colleagues.slice(0, 2).join(", ");
  const extra = rec.colleagueCount - Math.min(2, rec.colleagues.length);
  const who =
    extra > 0 ? `${names} +${extra} more` : names || `${rec.colleagueCount} colleagues`;
  const purpose = rec.purposes[0] ? ` for ${rec.purposes[0].toLowerCase()}s` : "";
  return (
    <>
      <b>{who}</b> from your company rated it <b>{rec.colleagueAvgRating}★</b>
      {purpose} in {rec.city}.
    </>
  );
}

export function RecommendationCard({
  rec,
  employeeId,
}: {
  rec: Recommendation;
  employeeId: number;
}) {
  const [path, setPath] = useState<ConnectionPath | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [mapCtx, setMapCtx] = useState<MapContext | null>(null);
  const [mapLoading, setMapLoading] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  const togglePath = async () => {
    if (path) {
      setPath(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setPath(await api.connection(employeeId, rec.hotelId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load path");
    } finally {
      setLoading(false);
    }
  };

  const toggleMap = async () => {
    if (mapCtx) {
      setMapCtx(null);
      return;
    }
    setMapLoading(true);
    setMapError(null);
    try {
      setMapCtx(await api.mapContext(employeeId, rec.hotelId));
    } catch (e) {
      setMapError(e instanceof Error ? e.message : "Could not load map");
    } finally {
      setMapLoading(false);
    }
  };

  return (
    <motion.article
      className="rec-card"
      variants={cardIn}
      layout
      whileHover={{ y: -3 }}
      transition={{ duration: 0.1, ease: "easeOut" }}
    >
      {/* Thumbnail header */}
      <div className="rec-thumb">
        <HotelMonogram name={rec.name} />
        <div className="rec-thumb-body">
          <h3 className="rec-title">{rec.name}</h3>
          <div className="rec-city">{rec.city}</div>
        </div>
        {rec.colleagueAvgRating != null && (
          <div className="score-badge" title="Average colleague rating">
            {rec.colleagueAvgRating}
          </div>
        )}
      </div>

      {/* Colleague proof */}
      <div className="colleague-row">
        <AvatarStack names={rec.colleagues} total={rec.colleagueCount} />
        <span className="colleague-label">
          {rec.colleagueCount} colleague{rec.colleagueCount === 1 ? "" : "s"} stayed here
        </span>
      </div>

      <div className="meta-row">
        <span className="price-tag">
          {inr(rec.pricePerNight)} <em>/ night</em>
        </span>
        {rec.starRating != null && <span className="meta-pill">★ {rec.starRating}</span>}
        {rec.safetyScore != null && <span className="meta-pill">Safety {rec.safetyScore}</span>}
        {rec.gstRegistered && <span className="chip good">GST</span>}
      </div>

      <div className="chips">
        {rec.amenities.slice(0, 4).map((a) => (
          <span className="chip muted" key={a}>
            {a}
          </span>
        ))}
      </div>

      <div className="why">
        <span>{explanation(rec)}</span>
      </div>

      <div className="card-toggles">
        <button
          className={"link-btn" + (path ? " open" : "")}
          onClick={togglePath}
          disabled={loading}
          aria-expanded={!!path}
        >
          {loading ? "Loading…" : path ? "Hide graph path" : "Why this? Show graph path"}
          <span className="chev">↓</span>
        </button>
        <button
          className={"link-btn" + (mapCtx ? " open" : "")}
          onClick={toggleMap}
          disabled={mapLoading}
          aria-expanded={!!mapCtx}
        >
          {mapLoading ? "Loading…" : mapCtx ? "Hide map" : "Show on map"}
          <span className="chev">↓</span>
        </button>
      </div>

      {error && <div className="error-box">{error}</div>}
      {mapError && <div className="error-box">{mapError}</div>}

      <AnimatePresence initial={false}>
        {path && (
          <motion.div
            key="path"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            style={{ overflow: "hidden" }}
          >
            <ConnectionPathView path={path} />
          </motion.div>
        )}
        {mapCtx && (
          <motion.div
            key="map"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            style={{ overflow: "hidden" }}
          >
            <RouteMap context={mapCtx} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}
