import type { PredictionStatus } from "@/lib/types";
import styles from "./DelayBadge.module.css";

const LABEL: Record<PredictionStatus, string> = {
  "on-time": "On time",
  "minor-delay": "Minor delay",
  "major-delay": "Major delay",
};

export default function DelayBadge({
  status,
  delayMinutes,
}: {
  status: PredictionStatus;
  delayMinutes: number;
}) {
  return (
    <span className={`${styles.badge} ${styles[status]}`}>
      {LABEL[status]}
      {delayMinutes > 0 && ` (+${delayMinutes} min)`}
    </span>
  );
}
