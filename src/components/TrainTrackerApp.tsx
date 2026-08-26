"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { generateDaySchedule, STATIONS } from "@/lib/schedule";
import type { Incident, WeatherResult } from "@/lib/types";
import ConditionsBanner from "./ConditionsBanner";
import StationSelector from "./StationSelector";
import ArrivalsBoard from "./ArrivalsBoard";
import IncidentPanel from "./IncidentPanel";
import LineMap from "./LineMap";
import styles from "./TrainTrackerApp.module.css";

const POLL_INTERVAL_MS = 20000;

export default function TrainTrackerApp() {
  const trains = useMemo(() => generateDaySchedule(), []);
  const [now, setNow] = useState<Date | null>(null);
  const [selectedStationId, setSelectedStationId] = useState(STATIONS[0].id);
  const [weather, setWeather] = useState<WeatherResult | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);

  const refreshIncidents = useCallback(() => {
    fetch("/api/incidents")
      .then((res) => res.json())
      .then((data) => setIncidents(data.incidents ?? []))
      .catch(() => {
        /* keep previous incidents on transient network errors */
      });
  }, []);

  const refreshWeather = useCallback(() => {
    fetch("/api/weather")
      .then((res) => res.json())
      .then((data: WeatherResult) => setWeather(data))
      .catch(() => setWeather({ ok: false, error: "Weather data unavailable" }));
  }, []);

  useEffect(() => {
    function tick() {
      setNow(new Date());
      refreshWeather();
      refreshIncidents();
    }
    tick();
    const id = setInterval(tick, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [refreshWeather, refreshIncidents]);

  if (!now) {
    return <div className={styles.loading}>Loading Meridian Line data…</div>;
  }

  return (
    <div className={styles.app}>
      <ConditionsBanner weather={weather} incidents={incidents} />
      <div className={styles.mainGrid}>
        <section className={styles.primaryColumn}>
          <StationSelector
            stations={STATIONS}
            value={selectedStationId}
            onChange={setSelectedStationId}
          />
          <ArrivalsBoard
            trains={trains}
            stationId={selectedStationId}
            now={now}
            weather={weather}
            incidents={incidents}
          />
        </section>
        <section className={styles.secondaryColumn}>
          <LineMap stations={STATIONS} trains={trains} now={now} incidents={incidents} />
          <IncidentPanel
            incidents={incidents}
            stations={STATIONS}
            trains={trains}
            now={now}
            onChanged={refreshIncidents}
          />
        </section>
      </div>
    </div>
  );
}
