export interface WeatherData {
  temp_f: number;
  condition: string;
  wind_mph: number;
  precip_prob: number;
}

const WMO_CONDITIONS: Record<number, string> = {
  0: 'Clear', 1: 'Mainly Clear', 2: 'Partly Cloudy', 3: 'Overcast',
  45: 'Foggy', 48: 'Foggy', 51: 'Light Drizzle', 53: 'Drizzle', 55: 'Heavy Drizzle',
  61: 'Light Rain', 63: 'Rain', 65: 'Heavy Rain', 71: 'Light Snow', 73: 'Snow',
  75: 'Heavy Snow', 80: 'Showers', 81: 'Showers', 82: 'Heavy Showers',
  95: 'Thunderstorm', 96: 'Thunderstorm', 99: 'Thunderstorm',
};

export async function fetchWeather(lat: number, lng: number): Promise<WeatherData | null> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,precipitation_probability,weathercode,windspeed_10m&temperature_unit=fahrenheit&windspeed_unit=mph`;
    const res = await fetch(url);
    const data = await res.json();
    const c = data.current;
    return {
      temp_f: Math.round(c.temperature_2m),
      condition: WMO_CONDITIONS[c.weathercode] || 'Unknown',
      wind_mph: Math.round(c.windspeed_10m),
      precip_prob: c.precipitation_probability ?? 0,
    };
  } catch {
    return null;
  }
}

export function getWeatherWarning(w: WeatherData): string | null {
  if (w.precip_prob > 30) return `🌧️ Rain likely (${w.precip_prob}%) — consider a jacket`;
  if (w.temp_f > 95) return '🌡️ Extreme heat — bring extra water';
  if (w.temp_f < 25) return '🥶 Freezing conditions — layer up';
  if (w.wind_mph > 25) return `💨 High winds (${w.wind_mph}mph) today`;
  return null;
}
