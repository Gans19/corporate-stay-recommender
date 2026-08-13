import { motion } from "framer-motion";
import { staggerContainer, cardIn } from "../motion";
import { Illustration } from "./UndrawIllustration";

const STEPS = [
  {
    title: "Pick a traveler & city",
    text: "Choose who's traveling and where. Optionally filter by trip purpose or nightly budget.",
  },
  {
    title: "We traverse the graph",
    text: "StayGraph hops from the traveler to their company, out to colleagues, and into the hotels they rated well.",
  },
  {
    title: "Get explained picks",
    text: "Every hotel comes with the reason and the exact graph path behind it — no black box.",
  },
];

/** Informative idle state shown before a search is run. */
export function HowItWorks() {
  return (
    <motion.div
      className="how"
      variants={staggerContainer}
      initial="hidden"
      animate="show"
    >
      <div className="how-graphic" aria-hidden="true">
        <Illustration name="connected" alt="Colleagues connected in a network" />
      </div>
      <h3 className="how-heading">Recommendations, explained by the graph</h3>
      <p className="how-sub">
        Pick a traveler and destination on the left to see hotels your colleagues actually
        stayed at — here's how it works.
      </p>
      <div className="how-steps">
        {STEPS.map((s, i) => (
          <motion.div className="how-step" key={i} variants={cardIn}>
            <div className="how-step-num">{i + 1}</div>
            <div className="how-step-title">{s.title}</div>
            <div className="how-step-text">{s.text}</div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
