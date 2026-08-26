// Placeholder representative point for the fictional Meridian Line.
// Swap these for a real lat/lon if this is ever pointed at a real line.
export const LINE_COORDINATES = {
  latitude: 40.71,
  longitude: -74.01,
  label: "Meridian Line corridor (placeholder coordinates)",
};

export const OPEN_METEO_BASE_URL = "https://api.open-meteo.com/v1/forecast";
export const WEATHER_MAX_DELAY_MINUTES = 12;

interface WeatherCodeEntry {
  delay: number;
  label: string;
}

// WMO weather codes, as returned by Open-Meteo's `weather_code` field.
const CODE_TABLE: Record<number, WeatherCodeEntry> = {
  0: { delay: 0, label: "Clear" },
  1: { delay: 0, label: "Mostly clear" },
  2: { delay: 0, label: "Partly cloudy" },
  3: { delay: 1, label: "Overcast" },
  45: { delay: 4, label: "Fog" },
  48: { delay: 4, label: "Fog" },
  51: { delay: 2, label: "Drizzle" },
  53: { delay: 2, label: "Drizzle" },
  55: { delay: 2, label: "Drizzle" },
  56: { delay: 2, label: "Freezing drizzle" },
  57: { delay: 2, label: "Freezing drizzle" },
  61: { delay: 3, label: "Rain" },
  63: { delay: 3, label: "Rain" },
  80: { delay: 3, label: "Rain showers" },
  65: { delay: 6, label: "Heavy rain" },
  66: { delay: 6, label: "Freezing rain" },
  67: { delay: 6, label: "Freezing rain" },
  81: { delay: 6, label: "Heavy rain showers" },
  82: { delay: 6, label: "Heavy rain showers" },
  71: { delay: 5, label: "Snow" },
  73: { delay: 5, label: "Snow" },
  77: { delay: 5, label: "Snow grains" },
  75: { delay: 9, label: "Heavy snow" },
  85: { delay: 9, label: "Snow showers" },
  86: { delay: 9, label: "Heavy snow showers" },
  95: { delay: 7, label: "Thunderstorms" },
  96: { delay: 10, label: "Thunderstorms with hail" },
  99: { delay: 10, label: "Severe thunderstorms with hail" },
};

export function mapWeatherToDelay(input: {
  weatherCode: number;
  precipitationMm: number;
  windSpeedKmh: number;
}): { delayMinutes: number; conditionLabel: string } {
  const base = CODE_TABLE[input.weatherCode] ?? { delay: 0, label: "Unknown conditions" };
  let delay = base.delay;
  let label = base.label;

  if (input.precipitationMm >= 4) {
    delay += 2;
    label += ", heavy precipitation";
  }
  if (input.windSpeedKmh >= 40) {
    delay += 2;
    label += ", high winds";
  }

  return { delayMinutes: Math.min(delay, WEATHER_MAX_DELAY_MINUTES), conditionLabel: label };
}

export function buildOpenMeteoUrl(): string {
  const params = new URLSearchParams({
    latitude: String(LINE_COORDINATES.latitude),
    longitude: String(LINE_COORDINATES.longitude),
    current: "temperature_2m,precipitation,weather_code,wind_speed_10m",
    timezone: "auto",
  });
  return `${OPEN_METEO_BASE_URL}?${params.toString()}`;
}
