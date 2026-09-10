(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.SkyCastAirQuality = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const AIR_CACHE_TTL_MS = 3 * 60 * 60 * 1000;
  const POLLEN_FIELDS = ["alder_pollen","birch_pollen","grass_pollen","mugwort_pollen","olive_pollen","ragweed_pollen"];
  const POLLUTANT_INDEX_FIELDS = {
    european_aqi_pm2_5:"PM2.5",
    european_aqi_pm10:"PM10",
    european_aqi_nitrogen_dioxide:"NO₂",
    european_aqi_ozone:"O₃",
    european_aqi_sulphur_dioxide:"SO₂"
  };

  function finite(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function buildAirQualityURL(location) {
    const lat = finite(location?.lat);
    const lon = finite(location?.lon);
    if (lat === null || lon === null || lat < -90 || lat > 90 || lon < -180 || lon > 180) throw new Error("Location coordinates are invalid");
    const current = [
      "european_aqi","european_aqi_pm2_5","european_aqi_pm10","european_aqi_nitrogen_dioxide","european_aqi_ozone","european_aqi_sulphur_dioxide",
      "pm2_5","pm10","nitrogen_dioxide","ozone","sulphur_dioxide","uv_index",
      ...POLLEN_FIELDS
    ].join(",");
    const params = new URLSearchParams({latitude:String(lat),longitude:String(lon),timezone:"auto",current});
    return `https://air-quality-api.open-meteo.com/v1/air-quality?${params}`;
  }

  function aqiBand(value) {
    const aqi = finite(value);
    if (aqi === null) return {label:"Unavailable",tone:"unknown",advice:"Air-quality index is not available for this location."};
    if (aqi <= 20) return {label:"Good",tone:"good",advice:"Air quality is generally favorable for outdoor activity."};
    if (aqi <= 40) return {label:"Fair",tone:"fair",advice:"Air quality is acceptable for most people."};
    if (aqi <= 60) return {label:"Moderate",tone:"moderate",advice:"Sensitive people may want to reduce prolonged outdoor exertion."};
    if (aqi <= 80) return {label:"Poor",tone:"poor",advice:"Consider reducing prolonged outdoor exertion, especially if sensitive."};
    if (aqi <= 100) return {label:"Very poor",tone:"very-poor",advice:"Limit prolonged outdoor exertion and monitor local health guidance."};
    return {label:"Extremely poor",tone:"extreme",advice:"Avoid strenuous outdoor activity and follow local health guidance."};
  }

  function uvBand(value) {
    const uv = finite(value);
    if (uv === null) return {label:"Unavailable",tone:"unknown"};
    if (uv < 3) return {label:"Low",tone:"good"};
    if (uv < 6) return {label:"Moderate",tone:"fair"};
    if (uv < 8) return {label:"High",tone:"moderate"};
    if (uv < 11) return {label:"Very high",tone:"poor"};
    return {label:"Extreme",tone:"extreme"};
  }

  function dominantPollutant(current) {
    let winner = null;
    for (const [field,label] of Object.entries(POLLUTANT_INDEX_FIELDS)) {
      const value = finite(current?.[field]);
      if (value === null) continue;
      if (!winner || value > winner.index) winner = {label,index:value};
    }
    return winner;
  }

  function pollenSummary(current) {
    let winner = null;
    for (const field of POLLEN_FIELDS) {
      const value = finite(current?.[field]);
      if (value === null) continue;
      const label = field.replace("_pollen","").replace(/^./,letter=>letter.toUpperCase());
      if (!winner || value > winner.value) winner = {label,value};
    }
    return winner;
  }

  function normalizeAirQuality(api) {
    const current = api?.current;
    if (!current || typeof current !== "object") throw new Error("Air-quality payload is incomplete");
    const aqi = finite(current.european_aqi);
    const uv = finite(current.uv_index);
    return {
      time: current.time || "",
      timezone: api.timezone || "Local time",
      timezoneAbbr: api.timezone_abbreviation || "",
      aqi,
      aqiBand: aqiBand(aqi),
      pm25: finite(current.pm2_5),
      pm10: finite(current.pm10),
      no2: finite(current.nitrogen_dioxide),
      ozone: finite(current.ozone),
      so2: finite(current.sulphur_dioxide),
      uv,
      uvBand: uvBand(uv),
      dominant: dominantPollutant(current),
      pollen: pollenSummary(current)
    };
  }

  function airQualityCacheKey(location) {
    const lat = finite(location?.lat);
    const lon = finite(location?.lon);
    if (lat === null || lon === null) throw new Error("Location coordinates are invalid");
    return `skycastAir:v1:${lat.toFixed(4)}:${lon.toFixed(4)}`;
  }

  function isAirCacheFresh(savedAt, now = Date.now(), ttl = AIR_CACHE_TTL_MS) {
    const saved = finite(savedAt);
    return saved !== null && now >= saved && now - saved <= ttl;
  }

  return {AIR_CACHE_TTL_MS,POLLEN_FIELDS,POLLUTANT_INDEX_FIELDS,buildAirQualityURL,aqiBand,uvBand,dominantPollutant,pollenSummary,normalizeAirQuality,airQualityCacheKey,isAirCacheFresh};
});
