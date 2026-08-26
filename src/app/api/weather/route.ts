import { buildOpenMeteoUrl, mapWeatherToDelay } from "@/lib/weather";

interface OpenMeteoCurrent {
  temperature_2m: number;
  precipitation: number;
  weather_code: number;
  wind_speed_10m: number;
}

export async function GET() {
  try {
    const res = await fetch(buildOpenMeteoUrl(), {
      next: { revalidate: 600 },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      throw new Error(`Open-Meteo responded ${res.status}`);
    }

    const json = await res.json();
    const current = json.current as OpenMeteoCurrent;

    const { delayMinutes, conditionLabel } = mapWeatherToDelay({
      weatherCode: current.weather_code,
      precipitationMm: current.precipitation,
      windSpeedKmh: current.wind_speed_10m,
    });

    return Response.json({
      ok: true,
      fetchedAt: new Date().toISOString(),
      temperatureC: current.temperature_2m,
      weatherCode: current.weather_code,
      conditionLabel,
      delayMinutes,
    });
  } catch {
    // Always respond 200 with an ok:false payload — a weather outage must
    // never break the predictor, only drop its contribution to the delay.
    return Response.json({ ok: false, error: "Weather data unavailable" });
  }
}
