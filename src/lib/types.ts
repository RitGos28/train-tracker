export type Direction = "EB" | "WB";

export interface Station {
  id: string;
  name: string;
  index: number;
}

export interface TrainStop {
  stationId: string;
  scheduledArrival: Date | null;
  scheduledDeparture: Date | null;
}

export interface Train {
  id: string;
  direction: Direction;
  stops: TrainStop[];
}

export type TimeBucket =
  | "earlyMorning"
  | "peak"
  | "midday"
  | "evening"
  | "night";

export type IncidentType = "track-damage" | "train-fault" | "congestion";
export type IncidentSeverity = "minor" | "moderate" | "severe";
export type IncidentSource = "baseline" | "manual";

export interface IncidentSegment {
  fromStationId: string;
  toStationId: string;
}

export interface Incident {
  id: string;
  type: IncidentType;
  severity: IncidentSeverity;
  reason: string;
  targetSegment?: IncidentSegment;
  targetTrainId?: string;
  source: IncidentSource;
  createdAt: string;
}

export type IncidentInput = {
  type: IncidentType;
  severity: IncidentSeverity;
  reason?: string;
  targetSegment?: IncidentSegment;
  targetTrainId?: string;
};

export type WeatherResult =
  | {
      ok: true;
      fetchedAt: string;
      temperatureC: number;
      weatherCode: number;
      conditionLabel: string;
      delayMinutes: number;
    }
  | { ok: false; error: string };

export type PredictionStatus = "on-time" | "minor-delay" | "major-delay";

export interface PredictionResult {
  trainId: string;
  direction: Direction;
  stationId: string;
  scheduledArrival: Date;
  predictedArrival: Date;
  delayMinutes: number;
  status: PredictionStatus;
  reason: string;
}
