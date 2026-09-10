(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.SkyCastCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
  const WMO = {
    0:["Clear sky","☀","clear"],1:["Mainly clear","🌤","clear"],2:["Partly cloudy","⛅","cloud"],3:["Overcast","☁","cloud"],
    45:["Fog","≋","cloud"],48:["Rime fog","≋","cloud"],51:["Light drizzle","🌦","rain"],53:["Drizzle","🌦","rain"],55:["Dense drizzle","🌧","rain"],
    56:["Freezing drizzle","🌧","rain"],57:["Dense freezing drizzle","🌧","rain"],61:["Light rain","🌦","rain"],63:["Rain","🌧","rain"],65:["Heavy rain","🌧","rain"],
    66:["Freezing rain","🌧","rain"],67:["Heavy freezing rain","🌧","rain"],71:["Light snow","🌨","snow"],73:["Snow","❄","snow"],75:["Heavy snow","❄","snow"],77:["Snow grains","❄","snow"],
    80:["Rain showers","🌦","rain"],81:["Rain showers","🌧","rain"],82:["Heavy rain showers","🌧","rain"],85:["Snow showers","🌨","snow"],86:["Heavy snow showers","❄","snow"],
    95:["Thunderstorm","⛈","rain"],96:["Thunderstorm with hail","⛈","rain"],99:["Severe thunderstorm with hail","⛈","rain"]
  };

  function weatherForCode(code) { return WMO[Number(code)] || ["Variable conditions","☁","cloud"]; }
  function formatTemp(value) { return Number.isFinite(Number(value)) ? `${Math.round(Number(value))}°` : "—"; }
  function formatPct(value) { return Number.isFinite(Number(value)) ? `${Math.round(Number(value))}%` : "—"; }
  function formatTime(localIso) {
    if (!localIso || !String(localIso).includes("T")) return "—";
    const [h,m] = String(localIso).split("T")[1].split(":");
    const hour = Number(h);
    if (!Number.isFinite(hour)) return "—";
    const suffix = hour >= 12 ? "PM" : "AM";
    return `${hour % 12 || 12}:${m} ${suffix}`;
  }
  function windDirection(degrees) {
    if (!Number.isFinite(Number(degrees))) return "";
    const dirs = ["N","NE","E","SE","S","SW","W","NW"];
    return dirs[Math.round(Number(degrees) / 45) % 8];
  }
  function ageLabel(savedAt, now = Date.now()) {
    const minutes = Math.max(1, Math.round((now - savedAt) / 60000));
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.round(minutes / 60);
    return `${hours} hr${hours === 1 ? "" : "s"} ago`;
  }
  function cacheKey(city, unit) { return `skycastForecast:v4:${city.lat}:${city.lon}:${unit}`; }
  function isCacheFresh(savedAt, now = Date.now(), ttl = CACHE_TTL_MS) {
    return Number.isFinite(Number(savedAt)) && now - Number(savedAt) <= ttl;
  }

  function buildForecastURL(city, unit) {
    if (!city || !Number.isFinite(Number(city.lat)) || !Number.isFinite(Number(city.lon))) throw new Error("City coordinates are invalid");
    if (!['celsius','fahrenheit'].includes(unit)) throw new Error("Temperature unit is invalid");
    const params = new URLSearchParams({
      latitude:String(city.lat), longitude:String(city.lon), timezone:"auto", forecast_days:"7",
      temperature_unit:unit, wind_speed_unit:unit === "fahrenheit" ? "mph" : "kmh", precipitation_unit:unit === "fahrenheit" ? "inch" : "mm",
      current:"temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m,wind_gusts_10m,is_day",
      hourly:"temperature_2m,apparent_temperature,precipitation_probability,weather_code,wind_speed_10m,is_day",
      daily:"weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,precipitation_probability_max,precipitation_sum,wind_speed_10m_max,wind_gusts_10m_max,sunrise,sunset"
    });
    return `https://api.open-meteo.com/v1/forecast?${params}`;
  }

  function normalizeForecast(api) {
    const d = api?.daily || {};
    const h = api?.hourly || {};
    if (!api?.current || !Array.isArray(d.time) || d.time.length < 1 || !Array.isArray(h.time) || h.time.length < 1) {
      throw new Error("Forecast payload is incomplete");
    }
    const days = d.time.slice(0,7).map((date,index) => ({
      date, code:d.weather_code?.[index], high:d.temperature_2m_max?.[index], low:d.temperature_2m_min?.[index],
      feelsHigh:d.apparent_temperature_max?.[index], feelsLow:d.apparent_temperature_min?.[index], rainChance:d.precipitation_probability_max?.[index],
      precipitation:d.precipitation_sum?.[index], wind:d.wind_speed_10m_max?.[index], gust:d.wind_gusts_10m_max?.[index], sunrise:d.sunrise?.[index], sunset:d.sunset?.[index]
    }));
    const currentHour = `${String(api.current.time || "").slice(0,13)}:00`;
    let start = h.time.findIndex(time => time >= currentHour);
    if (start < 0) start = 0;
    const hours = h.time.slice(start,start+12).map((time,offset) => {
      const index = start + offset;
      return {time, temp:h.temperature_2m?.[index], feels:h.apparent_temperature?.[index], rainChance:h.precipitation_probability?.[index], code:h.weather_code?.[index], wind:h.wind_speed_10m?.[index], isDay:h.is_day?.[index]};
    });
    return {current:api.current, days, hours, timezone:api.timezone || "Local time", timezoneAbbr:api.timezone_abbreviation || ""};
  }

  function deriveInsights(days) {
    if (!Array.isArray(days) || days.length === 0) return null;
    const warmest = days.reduce((a,b)=>Number(b.high)>Number(a.high)?b:a);
    const wettest = days.reduce((a,b)=>Number(b.rainChance||0)>Number(a.rainChance||0)?b:a);
    const windiest = days.reduce((a,b)=>Number(b.wind||0)>Number(a.wind||0)?b:a);
    const clearest = days.filter(d=>[0,1,2].includes(Number(d.code))).length;
    return {warmest, wettest, windiest, clearest};
  }

  return { CACHE_TTL_MS, WMO, weatherForCode, formatTemp, formatPct, formatTime, windDirection, ageLabel, cacheKey, isCacheFresh, buildForecastURL, normalizeForecast, deriveInsights };
});
