import { seededRandomSequence } from "./random";
import { generateDaySchedule, getActiveTrains, isAdjacentSegment, STATIONS } from "./schedule";
import type { Incident, IncidentInput, IncidentSeverity, IncidentType } from "./types";

export const SEVERITY_MINUTES: Record<IncidentSeverity, number> = {
  minor: 3,
  moderate: 7,
  severe: 15,
};

const INCIDENT_TYPES: IncidentType[] = ["track-damage", "train-fault", "congestion"];
const SEVERITIES: IncidentSeverity[] = ["minor", "moderate", "severe"];

const DEFAULT_REASON: Record<IncidentType, string> = {
  "track-damage": "Track inspection / damage repair in progress",
  "train-fault": "Mechanical fault reported on train",
  congestion: "Heavy passenger congestion",
};

// Module-scope in-memory store. This is intentionally NOT a database: state
// resets on dev-server restart and isn't shared across multiple server
// instances. Acceptable for this app's scope (mock/demo data only).
let incidents: Incident[] = [];
let baselineDateKey: string | null = null;
let nextManualId = 1;

function todayKey(now: Date): string {
  return now.toISOString().slice(0, 10);
}

function generateBaseline(now: Date): Incident[] {
  const rand = seededRandomSequence(`meridian-baseline-${todayKey(now)}`);
  const count = Math.floor(rand() * 4); // 0..3
  const activeTrainIds = getActiveTrains(generateDaySchedule(now), now).map((t) => t.id);
  const out: Incident[] = [];

  for (let i = 0; i < count; i++) {
    const type = INCIDENT_TYPES[Math.floor(rand() * INCIDENT_TYPES.length)];
    const severity = SEVERITIES[Math.floor(rand() * SEVERITIES.length)];
    const base = {
      id: `baseline-${todayKey(now)}-${i}`,
      severity,
      source: "baseline" as const,
      createdAt: now.toISOString(),
    };

    if (type === "train-fault" && activeTrainIds.length > 0) {
      out.push({
        ...base,
        type: "train-fault",
        targetTrainId: activeTrainIds[Math.floor(rand() * activeTrainIds.length)],
        reason: DEFAULT_REASON["train-fault"],
      });
    } else {
      const segIndex = Math.floor(rand() * (STATIONS.length - 1));
      const resolvedType = type === "train-fault" ? "congestion" : type;
      out.push({
        ...base,
        type: resolvedType,
        targetSegment: {
          fromStationId: STATIONS[segIndex].id,
          toStationId: STATIONS[segIndex + 1].id,
        },
        reason: DEFAULT_REASON[resolvedType],
      });
    }
  }

  return out;
}

export function ensureBaselineForToday(now: Date = new Date()): void {
  const key = todayKey(now);
  if (baselineDateKey !== key) {
    const manual = incidents.filter((i) => i.source === "manual");
    incidents = [...generateBaseline(now), ...manual];
    baselineDateKey = key;
  }
}

export function getAllIncidents(now: Date = new Date()): Incident[] {
  ensureBaselineForToday(now);
  return incidents;
}

export class IncidentValidationError extends Error {}

export function addIncident(input: IncidentInput, now: Date = new Date()): Incident {
  ensureBaselineForToday(now);

  if (!INCIDENT_TYPES.includes(input.type)) {
    throw new IncidentValidationError(`Invalid incident type: ${String(input.type)}`);
  }
  if (!SEVERITIES.includes(input.severity)) {
    throw new IncidentValidationError(`Invalid severity: ${String(input.severity)}`);
  }

  if (input.type === "train-fault") {
    if (!input.targetTrainId) {
      throw new IncidentValidationError("targetTrainId is required for train-fault incidents");
    }
    const activeTrainIds = getActiveTrains(generateDaySchedule(now), now).map((t) => t.id);
    if (!activeTrainIds.includes(input.targetTrainId)) {
      throw new IncidentValidationError(`Train ${input.targetTrainId} is not currently active`);
    }
  } else {
    const seg = input.targetSegment;
    if (!seg || !seg.fromStationId || !seg.toStationId) {
      throw new IncidentValidationError("targetSegment is required for this incident type");
    }
    if (!isAdjacentSegment(seg.fromStationId, seg.toStationId)) {
      throw new IncidentValidationError("targetSegment must reference two adjacent stations");
    }
  }

  const incident: Incident = {
    id: `manual-${nextManualId++}`,
    type: input.type,
    severity: input.severity,
    reason: input.reason?.trim() || DEFAULT_REASON[input.type],
    targetSegment: input.targetSegment,
    targetTrainId: input.targetTrainId,
    source: "manual",
    createdAt: now.toISOString(),
  };

  incidents.push(incident);
  return incident;
}

export function removeIncident(id: string): boolean {
  const before = incidents.length;
  incidents = incidents.filter((i) => i.id !== id);
  return incidents.length < before;
}
