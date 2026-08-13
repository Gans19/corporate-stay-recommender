import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { fadeUp } from "../motion";
import { Illustration } from "./UndrawIllustration";

export function EmptyState({
  title,
  message,
  cta,
}: {
  icon?: "compass" | "search";
  title: string;
  message: string;
  cta?: ReactNode;
}) {
  return (
    <motion.div className="state" variants={fadeUp} initial="hidden" animate="show">
      <motion.div
        className="state-illustration"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.15 }}
      >
        <Illustration name="searchEmpty" alt="No results found" />
      </motion.div>
      <h3>{title}</h3>
      <p>{message}</p>
      {cta}
    </motion.div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <motion.div
      className="state"
      role="alert"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <motion.div
        className="state-illustration"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.15 }}
      >
        <Illustration name="noData" alt="Connection problem" />
      </motion.div>
      <h3 className="state-error-title">Something went wrong</h3>
      <p>{message}</p>
      {onRetry && (
        <button className="state-cta" onClick={onRetry}>
          Try again
        </button>
      )}
    </motion.div>
  );
}
