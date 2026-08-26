import { getHeadwayMinutes } from "./historicalDelays";
import type { Direction, Station, Train, TrainStop } from "./types";

export const STATIONS: Station[] = [
  { id: "westbrook", name: "Westbrook Terminal", index: 0 },
  { id: "ashford", name: "Ashford Junction", index: 1 },
  { id: "central", name: "Central Crossing", index: 2 },
  { id: "lakeview", name: "Lakeview", index: 3 },
  { id: "brookfield", name: "Brookfield", index: 4 },
  { id: "highland", name: "Highland Park Terminal", index: 5 },
];

// Minutes to travel segment i -> i+1 (STATIONS[i] to STATIONS[i+1]).
const SEGMENT_TRAVEL_MINUTES = [8, 6, 9, 7, 10];
const DWELL_MINUTES_AT_INTERMEDIATE_STOP = 1;

const SERVICE_START_MINUTE = 5 * 60; // 05:00
const SERVICE_END_MINUTE = 24 * 60; // 24:00 (midnight)

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addMinutes(base: Date, minutes: number): Date {
  return new Date(base.getTime() + minutes * 60000);
}

function segmentTravelMinutes(lowIndex: number): number {
  return SEGMENT_TRAVEL_MINUTES[lowIndex];
}

function buildStops(
  midnight: Date,
  stationOrder: Station[],
  departureMinute: number,
): TrainStop[] {
  const stops: TrainStop[] = [];
  let clock = departureMinute;

  for (let i = 0; i < stationOrder.length; i++) {
    const station = stationOrder[i];
    const isFirst = i === 0;
    const isLast = i === stationOrder.length - 1;

    const arrival = isFirst ? null : addMinutes(midnight, clock);

    let departure: Date | null;
    if (isLast) {
      departure = null;
    } else if (isFirst) {
      departure = addMinutes(midnight, clock);
    } else {
      clock += DWELL_MINUTES_AT_INTERMEDIATE_STOP;
      departure = addMinutes(midnight, clock);
    }

    stops.push({ stationId: station.id, scheduledArrival: arrival, scheduledDeparture: departure });

    if (!isLast) {
      const lowIndex = Math.min(station.index, stationOrder[i + 1].index);
      clock += segmentTravelMinutes(lowIndex);
    }
  }

  return stops;
}

function generateDirectionSchedule(
  midnight: Date,
  direction: Direction,
  stationOrder: Station[],
): Train[] {
  const trains: Train[] = [];
  let clock = SERVICE_START_MINUTE;
  let sequence = 1;

  while (clock < SERVICE_END_MINUTE) {
    const departureTime = addMinutes(midnight, clock);
    const stops = buildStops(midnight, stationOrder, clock);
    const id = `MER-${direction}-${String(sequence).padStart(3, "0")}`;
    trains.push({ id, direction, stops });

    const headway = getHeadwayMinutes(departureTime);
    clock += headway;
    sequence += 1;
  }

  return trains;
}

export function generateDaySchedule(baseDate: Date = new Date()): Train[] {
  const midnight = startOfDay(baseDate);
  const eastbound = generateDirectionSchedule(midnight, "EB", STATIONS);
  const westbound = generateDirectionSchedule(midnight, "WB", [...STATIONS].reverse());

  return [...eastbound, ...westbound].sort((a, b) => {
    const aTime = (a.stops[0].scheduledDeparture ?? a.stops[0].scheduledArrival)!.getTime();
    const bTime = (b.stops[0].scheduledDeparture ?? b.stops[0].scheduledArrival)!.getTime();
    return aTime - bTime;
  });
}

export function getUpcomingStops(
  trains: Train[],
  stationId: string,
  now: Date,
  count = 8,
): Train[] {
  const nowTime = now.getTime();

  return trains
    .filter((train) => {
      const stop = train.stops.find((s) => s.stationId === stationId);
      if (!stop) return false;
      const referenceTime = (stop.scheduledArrival ?? stop.scheduledDeparture)!.getTime();
      return referenceTime >= nowTime - 60000; // small grace window
    })
    .sort((a, b) => {
      const aStop = a.stops.find((s) => s.stationId === stationId)!;
      const bStop = b.stops.find((s) => s.stationId === stationId)!;
      const aTime = (aStop.scheduledArrival ?? aStop.scheduledDeparture)!.getTime();
      const bTime = (bStop.scheduledArrival ?? bStop.scheduledDeparture)!.getTime();
      return aTime - bTime;
    })
    .slice(0, count);
}

export function getActiveTrains(trains: Train[], now: Date): Train[] {
  const nowTime = now.getTime();

  return trains.filter((train) => {
    const first = train.stops[0];
    const last = train.stops[train.stops.length - 1];
    const startTime = (first.scheduledDeparture ?? first.scheduledArrival)!.getTime();
    const endTime = (last.scheduledArrival ?? last.scheduledDeparture)!.getTime();
    return nowTime >= startTime && nowTime <= endTime;
  });
}

export function isAdjacentSegment(fromStationId: string, toStationId: string): boolean {
  const from = STATIONS.find((s) => s.id === fromStationId);
  const to = STATIONS.find((s) => s.id === toStationId);
  if (!from || !to) return false;
  return Math.abs(from.index - to.index) === 1;
}

export function getStationById(stationId: string): Station | undefined {
  return STATIONS.find((s) => s.id === stationId);
}

export interface TrainPosition {
  stationIndex: number;
  nextStationIndex: number;
  progress: number; // 0..1 along the leg from stationIndex to nextStationIndex
}

export function getTrainPosition(train: Train, now: Date): TrainPosition | null {
  const nowTime = now.getTime();
  const stops = train.stops;

  // Dwelling at an intermediate station?
  for (const stop of stops) {
    if (stop.scheduledArrival && stop.scheduledDeparture) {
      const arr = stop.scheduledArrival.getTime();
      const dep = stop.scheduledDeparture.getTime();
      if (nowTime >= arr && nowTime <= dep) {
        const idx = getStationById(stop.stationId)!.index;
        return { stationIndex: idx, nextStationIndex: idx, progress: 0 };
      }
    }
  }

  // Mid-leg between two stops?
  for (let i = 0; i < stops.length - 1; i++) {
    const from = stops[i];
    const to = stops[i + 1];
    const legStart = (from.scheduledDeparture ?? from.scheduledArrival)?.getTime();
    const legEnd = (to.scheduledArrival ?? to.scheduledDeparture)?.getTime();
    if (legStart == null || legEnd == null) continue;

    if (nowTime >= legStart && nowTime <= legEnd) {
      const progress = legEnd === legStart ? 0 : (nowTime - legStart) / (legEnd - legStart);
      return {
        stationIndex: getStationById(from.stationId)!.index,
        nextStationIndex: getStationById(to.stationId)!.index,
        progress: Math.min(1, Math.max(0, progress)),
      };
    }
  }

  return null;
}
