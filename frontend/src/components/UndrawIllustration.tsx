/**
 * Illustrations from unDraw (https://undraw.co) — MIT licensed, free to use
 * and modify without attribution. Recolored to match the app's violet/indigo
 * accent (#6c63ff -> #7c6cf6, blue -> our sky, green -> our mint, etc.) and
 * bundled as static SVG assets, rendered via <img> (Vite resolves the import
 * to a hashed URL).
 *
 * Source repo (MIT mirror of unDraw): https://github.com/cuuupid/undraw-illustrations
 */
import travel from "../assets/illustrations/hero-travel.svg";
import connected from "../assets/illustrations/overview-connected.svg";
import network from "../assets/illustrations/how-it-works-network.svg";
import searchEmpty from "../assets/illustrations/empty-search.svg";
import noData from "../assets/illustrations/error-warning.svg";

const SOURCES = {
  travel,
  connected,
  network,
  searchEmpty,
  noData,
} as const;

export type IllustrationName = keyof typeof SOURCES;

export function Illustration({
  name,
  className,
  alt = "",
}: {
  name: IllustrationName;
  className?: string;
  alt?: string;
}) {
  return <img src={SOURCES[name]} className={className} alt={alt} draggable={false} />;
}
