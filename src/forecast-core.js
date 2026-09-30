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

  function finiteNumber(value) {
    if (typeof value === "number") return Number.isFinite(value) ? value : null;
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) return null;
      const number = Number(trimmed);
      return Number.isFinite(number) ? number : null;
    }
    return null;
  }
  function weatherForCode(code) {
    const value = finiteNumber(code);
    if (value === null) return ["Variable conditions","☁","cloud"];
    return WMO[value] || ["Variable conditions","☁","cloud"];
  }
  function formatTemp(value) {
    const number = finiteNumber(value);
    return number === null ? "—" : `${Math.round(number)}°`;
  }
  function formatPct(value) {
    const number = finiteNumber(value);
    return number === null ? "—" : `${Math.round(number)}%`;
  }
  function formatTime(localIso) {
    const clock = String(localIso || "").split("T")[1] || "";
    const [h, m] = clock.split(":");
    const hour = Number(h);
    const minuteText = String(m ?? "");
    const minute = Number(minuteText.slice(0, 2));
    if (!Number.isFinite(hour) || minuteText.length < 2 || !Number.isFinite(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) return "—";
    const suffix = hour >= 12 ? "PM" : "AM";
    return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${suffix}`;
  }
  function formatWindReading(speed, unit) {
    const value = finiteNumber(speed);
    if (value === null) return "—";
    return `${Math.round(value)} ${unit === "fahrenheit" ? "mph" : "km/h"}`;
  }
  function isCurrentModelHour(hourTime, currentTime) {
    const hour = String(hourTime || "");
    const current = String(currentTime || "");
    return hour.length >= 13 && current.length >= 13 && hour.slice(0, 13) === current.slice(0, 13);
  }
  function windDirection(degrees) {
    const value = finiteNumber(degrees);
    if (value === null) return "";
    const dirs = ["N","NE","E","SE","S","SW","W","NW"];
    const normalized = ((value % 360) + 360) % 360;
    return dirs[Math.round(normalized / 45) % 8];
  }
  function ageLabel(savedAt, now = Date.now()) {
    const minutes = Math.max(1, Math.round((now - savedAt) / 60000));
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.round(minutes / 60);
    return `${hours} hr${hours === 1 ? "" : "s"} ago`;
  }
  function cacheKey(city, unit) {
    const lat = finiteNumber(city && city.lat);
    const lon = finiteNumber(city && city.lon);
    const latKey = lat === null ? "na" : lat.toFixed(4);
    const lonKey = lon === null ? "na" : lon.toFixed(4);
    return `skycastForecast:v4:${latKey}:${lonKey}:${unit}`;
  }
  function isCacheFresh(savedAt, now = Date.now(), ttl = CACHE_TTL_MS) {
    const saved = finiteNumber(savedAt);
    return saved !== null && now >= saved && now - saved <= ttl;
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
    if (start < 0) start = Math.max(0, h.time.length - 12);
    const hours = h.time.slice(start,start+12).map((time,offset) => {
      const index = start + offset;
      return {time, temp:h.temperature_2m?.[index], feels:h.apparent_temperature?.[index], rainChance:h.precipitation_probability?.[index], code:h.weather_code?.[index], wind:h.wind_speed_10m?.[index], isDay:h.is_day?.[index]};
    });
    return {current:api.current, days, hours, timezone:api.timezone || "Local time", timezoneAbbr:api.timezone_abbreviation || ""};
  }

  function deriveInsights(days) {
    if (!Array.isArray(days) || days.length === 0) return null;
    const pickMax = (field) => days.reduce((winner, day) => {
      const value = finiteNumber(day?.[field]);
      if (value === null) return winner;
      if (!winner || value > winner.value) return {day, value};
      return winner;
    }, null);
    const warmest = pickMax("high");
    const wettest = pickMax("rainChance");
    const windiest = pickMax("wind");
    const clearest = days.filter(day => [0,1,2].includes(finiteNumber(day?.code))).length;
    return {
      warmest: warmest ? warmest.day : null,
      wettest: wettest ? wettest.day : null,
      windiest: windiest ? windiest.day : null,
      clearest
    };
  }

  return { CACHE_TTL_MS, WMO, finiteNumber, weatherForCode, formatTemp, formatPct, formatTime, formatWindReading, isCurrentModelHour, windDirection, ageLabel, cacheKey, isCacheFresh, buildForecastURL, normalizeForecast, deriveInsights };
});
