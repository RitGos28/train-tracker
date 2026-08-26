import type { TimeBucket } from "./types";

export interface BucketProfile {
  startMinute: number; // minutes from midnight, inclusive
  endMinute: number; // minutes from midnight, exclusive
  headwayMinutes: number;
  avgDelayMinutes: number;
  cause: string;
}

// Historical on-time-performance table for the Meridian Line, bucketed by
// time of day. This is the "small hand-authored table" the statistical
// predictor is built on; everything else (schedule generation, live
// adjustments) is computed programmatically from it.
export const HISTORICAL_DELAY_BY_BUCKET: Record<TimeBucket, BucketProfile> = {
  earlyMorning: {
    startMinute: 5 * 60,
    endMinute: 7 * 60,
    headwayMinutes: 30,
    avgDelayMinutes: 1,
    cause: "Light early-morning service, minimal congestion",
  },
  peak: {
    // Peak is two windows; see getTimeBucket for the actual matching logic.
    startMinute: 7 * 60,
    endMinute: 9.5 * 60,
    headwayMinutes: 12,
    avgDelayMinutes: 6,
    cause: "Peak-hour passenger volume and signal spacing",
  },
  midday: {
    startMinute: 9.5 * 60,
    endMinute: 16 * 60,
    headwayMinutes: 20,
    avgDelayMinutes: 2,
    cause: "Routine midday operations",
  },
  evening: {
    startMinute: 19 * 60,
    endMinute: 22.5 * 60,
    headwayMinutes: 20,
    avgDelayMinutes: 3,
    cause: "Moderate evening ridership",
  },
  night: {
    startMinute: 22.5 * 60,
    endMinute: 29 * 60, // wraps past midnight, handled in getTimeBucket
    headwayMinutes: 45,
    avgDelayMinutes: 1,
    cause: "Sparse night service, occasional freight-crossing priority",
  },
};

const PEAK_WINDOWS: Array<[number, number]> = [
  [7 * 60, 9.5 * 60],
  [16 * 60, 19 * 60],
];

export function getTimeBucket(date: Date): TimeBucket {
  const minutes = date.getHours() * 60 + date.getMinutes();

  if (PEAK_WINDOWS.some(([start, end]) => minutes >= start && minutes < end)) {
    return "peak";
  }
  if (minutes >= 5 * 60 && minutes < 7 * 60) return "earlyMorning";
  if (minutes >= 9.5 * 60 && minutes < 16 * 60) return "midday";
  if (minutes >= 19 * 60 && minutes < 22.5 * 60) return "evening";
  return "night";
}

export function getHeadwayMinutes(date: Date): number {
  return HISTORICAL_DELAY_BY_BUCKET[getTimeBucket(date)].headwayMinutes;
}
