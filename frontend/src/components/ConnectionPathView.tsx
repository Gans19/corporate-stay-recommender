import { motion } from "framer-motion";
import type { ConnectionPath } from "../types";
import { pathNode, staggerContainer } from "../motion";

const humanRel = (rel: string) => rel.replace(/_/g, " ").toLowerCase();

const BADGE: Record<string, string> = {
  Employee: "E",
  Company: "C",
  Office: "O",
  Hotel: "H",
  City: "T",
  Amenity: "A",
};

/**
 * Renders the shortest graph path between the traveler and a hotel as a
 * vertical flowchart/tree — a badge + card per node, connected by a rail
 * line with the relationship name shown as a small pill on the connector
 * (workflow-builder style), instead of a flat left-to-right chip chain.
 */
export function ConnectionPathView({ path }: { path: ConnectionPath }) {
  return (
    <motion.div
      className="tree-graph"
      aria-label="Graph connection path"
      variants={staggerContainer}
      initial="hidden"
      animate="show"
    >
      {path.nodes.map((node, i) => {
        const endpoint = i === 0 || i === path.nodes.length - 1;
        const isLast = i === path.nodes.length - 1;
        return (
          <div key={i}>
            <motion.div className="tree-node-row" variants={pathNode}>
              <div className={"tree-rail" + (isLast ? " tree-rail-end" : "")}>
                <span className={"tree-dot" + (endpoint ? " tree-dot-endpoint" : "")}>
                  {BADGE[node.label] ?? "•"}
                </span>
              </div>
              <div className={"tree-card" + (endpoint ? " tree-card-endpoint" : "")}>
                <span className="tree-card-label">{node.label}</span>
                <span className="tree-card-name">{node.name ?? "—"}</span>
              </div>
            </motion.div>

            {i < path.relationships.length && (
              <motion.div className="tree-connector-row" variants={pathNode}>
                <div className="tree-rail">
                  <span className="tree-rail-line" />
                </div>
                <div className="tree-connector-content">
                  <span className="tree-rel-pill">{humanRel(path.relationships[i])}</span>
                </div>
              </motion.div>
            )}
          </div>
        );
      })}
    </motion.div>
  );
}
