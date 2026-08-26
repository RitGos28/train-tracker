"use client";

import { useMemo } from "react";
import { getUpcomingStops } from "@/lib/schedule";
import { predictArrival } from "@/lib/predict";
import type { Incident, Train, WeatherResult } from "@/lib/types";
import DelayBadge from "./DelayBadge";
import styles from "./ArrivalsBoard.module.css";

function formatTime(date: Date): string {
  return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export default function ArrivalsBoard({
  trains,
  stationId,
  now,
  weather,
  incidents,
}: {
  trains: Train[];
  stationId: string;
  now: Date;
  weather: WeatherResult | null;
  incidents: Incident[];
}) {
  const predictions = useMemo(() => {
    const upcoming = getUpcomingStops(trains, stationId, now, 8);
    return upcoming
      .map((train) => predictArrival(train, stationId, now, weather, incidents))
      .filter((p) => p !== null);
  }, [trains, stationId, now, weather, incidents]);

  return (
    <div className={styles.board}>
      <h2 className={styles.heading}>Upcoming arrivals</h2>
      {predictions.length === 0 ? (
        <p className={styles.empty}>No upcoming trains for this station right now.</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Train</th>
              <th>Scheduled</th>
              <th>Predicted</th>
              <th>Status</th>
              <th>Reason</th>
            </tr>
          </thead>
          <tbody>
            {predictions.map((prediction) => (
              <tr key={prediction.trainId}>
                <td>{prediction.trainId}</td>
                <td>{formatTime(prediction.scheduledArrival)}</td>
                <td>{formatTime(prediction.predictedArrival)}</td>
                <td>
                  <DelayBadge status={prediction.status} delayMinutes={prediction.delayMinutes} />
                </td>
                <td className={styles.reason}>{prediction.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
