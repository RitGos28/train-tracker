import type { Incident, WeatherResult } from "@/lib/types";
import styles from "./ConditionsBanner.module.css";

const INCIDENT_TYPE_LABEL: Record<Incident["type"], string> = {
  "track-damage": "Track damage",
  "train-fault": "Train fault",
  congestion: "Congestion",
};

function describeIncident(incident: Incident): string {
  const label = INCIDENT_TYPE_LABEL[incident.type];
  if (incident.targetTrainId) return `${label} — ${incident.targetTrainId}`;
  if (incident.targetSegment) {
    return `${label} — ${incident.targetSegment.fromStationId} ↔ ${incident.targetSegment.toStationId}`;
  }
  return label;
}

export default function ConditionsBanner({
  weather,
  incidents,
}: {
  weather: WeatherResult | null;
  incidents: Incident[];
}) {
  return (
    <div className={styles.banner}>
      <div className={styles.weather}>
        {weather === null ? (
          <span className={styles.muted}>Loading weather…</span>
        ) : weather.ok ? (
          <>
            <span className={styles.temperature}>{Math.round(weather.temperatureC)}°C</span>
            <span>{weather.conditionLabel}</span>
            {weather.delayMinutes > 0 && (
              <span className={styles.weatherDelay}>+{weather.delayMinutes} min impact</span>
            )}
          </>
        ) : (
          <span className={styles.muted}>Weather unavailable</span>
        )}
      </div>
      <div className={styles.incidents}>
        <span className={styles.incidentCount}>
          {incidents.length} active incident{incidents.length === 1 ? "" : "s"}
        </span>
        {incidents.length > 0 && (
          <ul className={styles.incidentList}>
            {incidents.map((incident) => (
              <li key={incident.id} className={styles[`severity-${incident.severity}`]}>
                {describeIncident(incident)}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
