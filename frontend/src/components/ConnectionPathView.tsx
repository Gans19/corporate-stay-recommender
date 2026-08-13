import { motion } from "framer-motion";
import type { ConnectionPath } from "../types";
import { pathNode, staggerContainer } from "../motion";

const humanRel = (rel: string) => rel.replace(/_/g, " ").toLowerCase();

/**
 * Renders the shortest graph path between the traveler and a hotel, e.g.
 *   You → Sunrise FMCG → Salem Office → Hotel
 * Rendered as plain bordered nodes and arrow labels — no icons, no color —
 * consistent with the line-based, typography-led visual system.
 */
export function ConnectionPathView({ path }: { path: ConnectionPath }) {
  return (
    <motion.div
      className="path-viz"
      aria-label="Graph connection path"
      variants={staggerContainer}
      initial="hidden"
      animate="show"
    >
      {path.nodes.map((node, i) => {
        const endpoint = i === 0 || i === path.nodes.length - 1;
        return (
          <span key={i} className="path-seg">
            <motion.span
              className={"path-node" + (endpoint ? " endpoint" : "")}
              variants={pathNode}
            >
              <span className="label">{node.label}</span>
              <span className="name">{node.name ?? "—"}</span>
            </motion.span>
            {i < path.relationships.length && (
              <motion.span className="path-rel" variants={pathNode}>
                <span className="arrow">→</span>
                <span>{humanRel(path.relationships[i])}</span>
              </motion.span>
            )}
          </span>
        );
      })}
    </motion.div>
  );
}
