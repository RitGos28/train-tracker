import { getTimeBucket, HISTORICAL_DELAY_BY_BUCKET } from "./historicalDelays";
import { hashString } from "./random";
import { SEVERITY_MINUTES } from "./incidents";
import type { Incident, PredictionResult, PredictionStatus, Train, WeatherResult } from "./types";

const MAX_DELAY_MINUTES = 45;
const ON_TIME_THRESHOLD = 2; // < 2 min => on-time
const MAJOR_THRESHOLD = 10; // >= 10 min => major-delay, else minor-delay

const SEVERITY_RANK: Record<Incident["severity"], number> = {
  minor: 1,
  moderate: 2,
  severe: 3,
};

// Deterministic, stateless "live" drift: a smooth function of (train,
// station, now) so predictions gently vary from poll to poll without any
// stored history or true randomness.
export function computeDrift(trainId: string, stationId: string, now: Date): number {
  const seed = hashString(`${trainId}:${stationId}`);
  const amplitudeMinutes = 1 + (seed % 3); // 1..3
  const periodMinutes = 6 + (Math.floor(seed / 3) % 10); // 6..15
  const phase = seed % 1000;
  const minutesSinceEpoch = now.getTime() / 60000;
  return amplitudeMinutes * Math.sin((2 * Math.PI * (minutesSinceEpoch + phase)) / periodMinutes);
}

function matchingIncidents(train: Train, stationId: string, incidents: Incident[]): Incident[] {
  const idx = train.stops.findIndex((s) => s.stationId === stationId);
  const prevStationId = idx > 0 ? train.stops[idx - 1].stationId : null;

  return incidents.filter((inc) => {
    if (inc.type === "train-fault") return inc.targetTrainId === train.id;
    if (!prevStationId || !inc.targetSegment) return false;
    const seg = inc.targetSegment;
    return (
      (seg.fromStationId === prevStationId && seg.toStationId === stationId) ||
      (seg.fromStationId === stationId && seg.toStationId === prevStationId)
    );
  });
}

export function predictArrival(
  train: Train,
  stationId: string,
  now: Date,
  weather: WeatherResult | null,
  incidents: Incident[],
): PredictionResult | null {
  const stop = train.stops.find((s) => s.stationId === stationId);
  if (!stop || !stop.scheduledArrival) return null;

  const bucket = getTimeBucket(stop.scheduledArrival);
  const historical = HISTORICAL_DELAY_BY_BUCKET[bucket];

  const relevant = matchingIncidents(train, stationId, incidents);
  const dominantIncident =
    relevant.length > 0
      ? [...relevant].sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity])[0]
      : null;
  const incidentMinutes = relevant.reduce((sum, i) => sum + SEVERITY_MINUTES[i.severity], 0);

  const weatherMinutes = weather?.ok ? weather.delayMinutes : 0;
  const jitter = computeDrift(train.id, stationId, now);

  const rawTotal = historical.avgDelayMinutes + weatherMinutes + incidentMinutes + jitter;
  const delayMinutes = Math.max(0, Math.min(MAX_DELAY_MINUTES, Math.round(rawTotal)));

  const status: PredictionStatus =
    delayMinutes < ON_TIME_THRESHOLD
      ? "on-time"
      : delayMinutes < MAJOR_THRESHOLD
        ? "minor-delay"
        : "major-delay";

  // Delay minutes sum all contributing factors above; the displayed reason
  // only names the single dominant cause, prioritizing incidents over
  // weather over the historical baseline.
  const reason = dominantIncident
    ? dominantIncident.reason
    : weather?.ok && weatherMinutes > 0
      ? `Weather: ${weather.conditionLabel}`
      : historical.cause;

  return {
    trainId: train.id,
    direction: train.direction,
    stationId,
    scheduledArrival: stop.scheduledArrival,
    predictedArrival: new Date(stop.scheduledArrival.getTime() + delayMinutes * 60000),
    delayMinutes,
    status,
    reason,
  };
}
