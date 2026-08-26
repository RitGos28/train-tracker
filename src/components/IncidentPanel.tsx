"use client";

import { useMemo, useState } from "react";
import { getActiveTrains } from "@/lib/schedule";
import type { Incident, IncidentSeverity, IncidentType, Station, Train } from "@/lib/types";
import styles from "./IncidentPanel.module.css";

const TYPE_OPTIONS: { value: IncidentType; label: string }[] = [
  { value: "track-damage", label: "Track damage" },
  { value: "train-fault", label: "Train fault" },
  { value: "congestion", label: "Congestion" },
];

const SEVERITY_OPTIONS: IncidentSeverity[] = ["minor", "moderate", "severe"];

export default function IncidentPanel({
  incidents,
  stations,
  trains,
  now,
  onChanged,
}: {
  incidents: Incident[];
  stations: Station[];
  trains: Train[];
  now: Date;
  onChanged: () => void;
}) {
  const segments = useMemo(
    () =>
      stations.slice(0, -1).map((station, i) => ({
        fromStationId: station.id,
        toStationId: stations[i + 1].id,
        label: `${station.name} ↔ ${stations[i + 1].name}`,
      })),
    [stations],
  );
  const activeTrains = useMemo(() => getActiveTrains(trains, now), [trains, now]);

  const [type, setType] = useState<IncidentType>("track-damage");
  const [severity, setSeverity] = useState<IncidentSeverity>("moderate");
  const [segmentIndex, setSegmentIndex] = useState(0);
  const [trainId, setTrainId] = useState(activeTrains[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const body =
      type === "train-fault"
        ? { type, severity, targetTrainId: trainId }
        : { type, severity, targetSegment: segments[segmentIndex] };

    try {
      const res = await fetch("/api/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Failed to add incident");
      } else {
        onChanged();
      }
    } catch {
      setError("Failed to add incident");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemove(id: string) {
    await fetch(`/api/incidents/${id}`, { method: "DELETE" });
    onChanged();
  }

  return (
    <div className={styles.panel}>
      <h2 className={styles.heading}>Report an incident</h2>
      <form className={styles.form} onSubmit={handleSubmit}>
        <label className={styles.field}>
          Type
          <select value={type} onChange={(e) => setType(e.target.value as IncidentType)}>
            {TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        {type === "train-fault" ? (
          <label className={styles.field}>
            Train
            {activeTrains.length === 0 ? (
              <span className={styles.muted}>No active trains right now</span>
            ) : (
              <select value={trainId} onChange={(e) => setTrainId(e.target.value)}>
                {activeTrains.map((train) => (
                  <option key={train.id} value={train.id}>
                    {train.id}
                  </option>
                ))}
              </select>
            )}
          </label>
        ) : (
          <label className={styles.field}>
            Segment
            <select value={segmentIndex} onChange={(e) => setSegmentIndex(Number(e.target.value))}>
              {segments.map((seg, i) => (
                <option key={`${seg.fromStationId}-${seg.toStationId}`} value={i}>
                  {seg.label}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className={styles.field}>
          Severity
          <select value={severity} onChange={(e) => setSeverity(e.target.value as IncidentSeverity)}>
            {SEVERITY_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        <button
          type="submit"
          className={styles.submit}
          disabled={submitting || (type === "train-fault" && activeTrains.length === 0)}
        >
          Add incident
        </button>
        {error && <p className={styles.error}>{error}</p>}
      </form>

      <ul className={styles.list}>
        {incidents.map((incident) => (
          <li key={incident.id} className={styles.listItem}>
            <span>
              {incident.type} · {incident.severity}
              {incident.source === "baseline" && <em className={styles.baselineTag}> (auto)</em>}
            </span>
            <button type="button" onClick={() => handleRemove(incident.id)} className={styles.remove}>
              Remove
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
