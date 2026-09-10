(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.SkyCastLocations = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const GEOCODING_ENDPOINT = "https://geocoding-api.open-meteo.com/v1/search";
  const FAVORITES_LIMIT = 8;
  const DEFAULT_CITIES = [
    {name:"Amsterdam, Netherlands",lat:52.3676,lon:4.9041},{name:"Athens, Greece",lat:37.9838,lon:23.7275},
    {name:"Barcelona, Spain",lat:41.3874,lon:2.1686},{name:"Berlin, Germany",lat:52.52,lon:13.405},
    {name:"Budapest, Hungary",lat:47.4979,lon:19.0402},{name:"Copenhagen, Denmark",lat:55.6761,lon:12.5683},
    {name:"Dublin, Ireland",lat:53.3498,lon:-6.2603},{name:"Edinburgh, UK",lat:55.9533,lon:-3.1883},
    {name:"Helsinki, Finland",lat:60.1699,lon:24.9384},{name:"Lisbon, Portugal",lat:38.7223,lon:-9.1393},
    {name:"London, UK",lat:51.5074,lon:-0.1278},{name:"Madrid, Spain",lat:40.4168,lon:-3.7038},
    {name:"Oslo, Norway",lat:59.9139,lon:10.7522},{name:"Paris, France",lat:48.8566,lon:2.3522},
    {name:"Prague, Czechia",lat:50.0755,lon:14.4378},{name:"Reykjavík, Iceland",lat:64.1466,lon:-21.9426},
    {name:"Rome, Italy",lat:41.9028,lon:12.4964},{name:"Stockholm, Sweden",lat:59.3293,lon:18.0686},
    {name:"Tallinn, Estonia",lat:59.437,lon:24.7536},{name:"Vienna, Austria",lat:48.2082,lon:16.3738},
    {name:"Warsaw, Poland",lat:52.2297,lon:21.0122},{name:"Zurich, Switzerland",lat:47.3769,lon:8.5417}
  ];

  function validCoordinate(value, min, max) {
    const number = Number(value);
    return Number.isFinite(number) && number >= min && number <= max;
  }

  function sanitizeLocation(location) {
    if (!location || !validCoordinate(location.lat,-90,90) || !validCoordinate(location.lon,-180,180)) return null;
    const name = String(location.name || "Selected location").trim().slice(0,120) || "Selected location";
    return {name,lat:Number(location.lat),lon:Number(location.lon),timezone:String(location.timezone || "").slice(0,80)};
  }

  function locationKey(location) {
    const clean = sanitizeLocation(location);
    if (!clean) return "";
    return `${clean.lat.toFixed(4)}:${clean.lon.toFixed(4)}`;
  }

  function sameLocation(a,b) {
    return Boolean(a && b && locationKey(a) && locationKey(a) === locationKey(b));
  }

  function buildGeocodingURL(query,count=6) {
    const name = String(query || "").trim();
    if (name.length < 2) throw new Error("Search requires at least two characters");
    const safeCount = Math.min(10,Math.max(1,Math.trunc(Number(count) || 6)));
    const params = new URLSearchParams({name,count:String(safeCount),language:"en",format:"json"});
    return `${GEOCODING_ENDPOINT}?${params}`;
  }

  function normalizeGeocodingResults(payload) {
    const results = Array.isArray(payload?.results) ? payload.results : [];
    const seen = new Set();
    const normalized = [];
    for (const result of results) {
      const clean = sanitizeLocation({
        name:[result?.name,result?.admin1,result?.country].filter(Boolean).filter((part,index,array)=>array.indexOf(part)===index).join(", "),
        lat:result?.latitude,
        lon:result?.longitude,
        timezone:result?.timezone
      });
      if (!clean) continue;
      const key = locationKey(clean);
      if (seen.has(key)) continue;
      seen.add(key);
      normalized.push({...clean,countryCode:String(result?.country_code || ""),featureCode:String(result?.feature_code || "")});
    }
    return normalized;
  }

  function trimFavorites(favorites,limit=FAVORITES_LIMIT) {
    const output = [];
    const seen = new Set();
    for (const item of Array.isArray(favorites) ? favorites : []) {
      const clean = sanitizeLocation(item);
      if (!clean) continue;
      const key = locationKey(clean);
      if (seen.has(key)) continue;
      seen.add(key);
      output.push(clean);
      if (output.length >= limit) break;
    }
    return output;
  }

  function toggleFavorite(favorites,location,limit=FAVORITES_LIMIT) {
    const clean = sanitizeLocation(location);
    const current = trimFavorites(favorites,limit);
    if (!clean) return current;
    const exists = current.some(item=>sameLocation(item,clean));
    if (exists) return current.filter(item=>!sameLocation(item,clean));
    return trimFavorites([clean,...current],limit);
  }

  function buildShareQuery(location,unit) {
    const clean = sanitizeLocation(location);
    if (!clean) throw new Error("Location is invalid");
    const params = new URLSearchParams({lat:String(clean.lat),lon:String(clean.lon),name:clean.name});
    if (unit === "fahrenheit") params.set("unit","f");
    return `?${params}`;
  }

  function parseShareQuery(search) {
    const params = new URLSearchParams(String(search || "").replace(/^\?/,""));
    if (!params.has("lat") || !params.has("lon")) return null;
    const location = sanitizeLocation({name:params.get("name") || "Shared location",lat:params.get("lat"),lon:params.get("lon")});
    if (!location) return null;
    return {location,unit:params.get("unit") === "f" ? "fahrenheit" : "celsius"};
  }

  return {
    GEOCODING_ENDPOINT,
    FAVORITES_LIMIT,
    DEFAULT_CITIES,
    sanitizeLocation,
    locationKey,
    sameLocation,
    buildGeocodingURL,
    normalizeGeocodingResults,
    trimFavorites,
    toggleFavorite,
    buildShareQuery,
    parseShareQuery,
  };
});
