"use client";

import { useMemo } from "react";
import { getActiveTrains, getTrainPosition } from "@/lib/schedule";
import type { Incident, Station, Train } from "@/lib/types";
import styles from "./LineMap.module.css";

const MARGIN = 40;
const SPACING = 130;
const LINE_Y = 60;
const TRAIN_OFFSET = 10;

function xFor(index: number): number {
  return MARGIN + index * SPACING;
}

export default function LineMap({
  stations,
  trains,
  now,
  incidents,
}: {
  stations: Station[];
  trains: Train[];
  now: Date;
  incidents: Incident[];
}) {
  const width = MARGIN * 2 + (stations.length - 1) * SPACING;
  const activeTrains = useMemo(() => getActiveTrains(trains, now), [trains, now]);

  const flaggedSegments = useMemo(() => {
    const set = new Set<string>();
    for (const incident of incidents) {
      if (incident.type === "train-fault" || !incident.targetSegment) continue;
      set.add(`${incident.targetSegment.fromStationId}|${incident.targetSegment.toStationId}`);
    }
    return set;
  }, [incidents]);

  const faultedTrainIds = useMemo(
    () => new Set(incidents.filter((i) => i.type === "train-fault").map((i) => i.targetTrainId)),
    [incidents],
  );

  function isSegmentFlagged(a: Station, b: Station): boolean {
    return flaggedSegments.has(`${a.id}|${b.id}`) || flaggedSegments.has(`${b.id}|${a.id}`);
  }

  return (
    <div className={styles.mapWrapper}>
      <h2 className={styles.heading}>Live line map</h2>
      <svg
        className={styles.svg}
        viewBox={`0 0 ${width} 140`}
        role="img"
        aria-label="Schematic map of the Meridian Line showing live train positions"
      >
        {stations.slice(0, -1).map((station, i) => {
          const next = stations[i + 1];
          const flagged = isSegmentFlagged(station, next);
          return (
            <line
              key={station.id}
              x1={xFor(station.index)}
              y1={LINE_Y}
              x2={xFor(next.index)}
              y2={LINE_Y}
              className={flagged ? styles.segmentFlagged : styles.segment}
            />
          );
        })}

        {stations.map((station) => (
          <g key={station.id}>
            <circle cx={xFor(station.index)} cy={LINE_Y} r={6} className={styles.stationDot} />
            <text x={xFor(station.index)} y={LINE_Y + 24} className={styles.stationLabel} textAnchor="middle">
              {station.name}
            </text>
          </g>
        ))}

        {activeTrains.map((train) => {
          const position = getTrainPosition(train, now);
          if (!position) return null;
          const x =
            xFor(position.stationIndex) +
            position.progress * (xFor(position.nextStationIndex) - xFor(position.stationIndex));
          const y = LINE_Y + (train.direction === "EB" ? -TRAIN_OFFSET : TRAIN_OFFSET);
          const faulted = faultedTrainIds.has(train.id);

          return (
            <g key={train.id} transform={`translate(${x}, ${y})`}>
              <circle r={5} className={faulted ? styles.trainFaulted : styles.train} />
              {faulted && (
                <text x={0} y={-8} textAnchor="middle" className={styles.faultIcon}>
                  ⚠
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
