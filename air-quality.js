"use strict";

const {
  AIR_CACHE_TTL_MS,
  buildAirQualityURL,
  normalizeAirQuality,
  airQualityCacheKey,
  isAirCacheFresh,
} = SkyCastAirQuality;

const airEls = Object.fromEntries([
  "airPanel","airStatus","aqiScore","aqiLevel","aqiAdvice","aqiDriver","pm25Metric","pm10Metric","uvMetric","uvDetail","ozoneMetric","pollenMetric","pollenDetail","airUpdated"
].map(id => [id, document.getElementById(id)]));

let airController = null;
let airSequence = 0;
let currentAirLocation = null;

function formatConcentration(value) {
  return Number.isFinite(Number(value)) ? `${Math.round(Number(value))} µg/m³` : "—";
}

function saveAirCache(location,data) {
  try {
    localStorage.setItem(airQualityCacheKey(location),JSON.stringify({savedAt:Date.now(),data}));
  } catch (error) {
    console.warn("SkyCast air-quality cache write skipped",error);
  }
}

function readAirCache(location) {
  try {
    const key = airQualityCacheKey(location);
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const cached = JSON.parse(raw);
    if (!cached?.data || !isAirCacheFresh(cached.savedAt,Date.now(),AIR_CACHE_TTL_MS)) {
      localStorage.removeItem(key);
      return null;
    }
    return cached;
  } catch (error) {
    console.warn("SkyCast air-quality cache read skipped",error);
    return null;
  }
}

function setAirStatus(message,error=false) {
  airEls.airStatus.textContent = message;
  airEls.airStatus.classList.toggle("air-error",error);
}

function renderAirLoading() {
  airEls.aqiScore.textContent = "—";
  airEls.aqiLevel.textContent = "Updating";
  airEls.aqiAdvice.textContent = "Loading atmospheric conditions…";
  airEls.aqiDriver.textContent = "Assessing dominant pollutant";
  for (const id of ["pm25Metric","pm10Metric","uvMetric","ozoneMetric","pollenMetric"]) airEls[id].textContent = "—";
  airEls.uvDetail.textContent = "UV exposure";
  airEls.pollenDetail.textContent = "Seasonal data where available";
  setAirStatus("");
}

function renderAirQuality(data,{cached=false,savedAt=null}={}) {
  const score = Number.isFinite(Number(data.aqi)) ? Math.round(Number(data.aqi)) : "—";
  airEls.aqiScore.textContent = score;
  airEls.aqiLevel.textContent = data.aqiBand.label;
  airEls.aqiLevel.dataset.tone = data.aqiBand.tone;
  airEls.aqiAdvice.textContent = data.aqiBand.advice;
  airEls.aqiDriver.textContent = data.dominant ? `Main AQI driver: ${data.dominant.label}` : "Dominant pollutant unavailable";
  airEls.pm25Metric.textContent = formatConcentration(data.pm25);
  airEls.pm10Metric.textContent = formatConcentration(data.pm10);
  airEls.uvMetric.textContent = Number.isFinite(Number(data.uv)) ? Number(data.uv).toFixed(1) : "—";
  airEls.uvDetail.textContent = `${data.uvBand.label} UV exposure`;
  airEls.ozoneMetric.textContent = formatConcentration(data.ozone);
  airEls.pollenMetric.textContent = data.pollen ? `${Math.round(data.pollen.value)} grains/m³` : "—";
  airEls.pollenDetail.textContent = data.pollen ? `${data.pollen.label} is highest` : "Seasonal European pollen data may be unavailable";
  airEls.airUpdated.textContent = cached && savedAt ? "Cached atmospheric data" : `Updated ${String(data.time || "").replace("T"," ")}${data.timezoneAbbr ? ` ${data.timezoneAbbr}` : ""}`;
  setAirStatus(cached ? "Live air-quality data is unavailable; showing a recent cached reading." : "");
}

function showAirFallback(location,message) {
  const cached = readAirCache(location);
  if (cached) {
    renderAirQuality(cached.data,{cached:true,savedAt:cached.savedAt});
    return;
  }
  setAirStatus(message,true);
  airEls.aqiScore.textContent = "—";
  airEls.aqiLevel.textContent = "Unavailable";
  airEls.aqiAdvice.textContent = "Atmospheric data could not be loaded for this location.";
  airEls.aqiDriver.textContent = "Weather forecast remains available separately.";
  airEls.airUpdated.textContent = "No recent air-quality data";
}

async function loadAirQuality(location) {
  if (!location) return;
  currentAirLocation = location;
  const sequence = ++airSequence;
  if (airController) airController.abort();
  airController = new AbortController();

  if (!navigator.onLine) {
    showAirFallback(location,"Air-quality data requires a network connection and no recent cache is available.");
    return;
  }

  renderAirLoading();
  try {
    const response = await fetch(buildAirQualityURL(location),{cache:"no-store",signal:airController.signal});
    if (!response.ok) throw new Error(`Air-quality service returned ${response.status}`);
    const data = normalizeAirQuality(await response.json());
    if (sequence !== airSequence) return;
    saveAirCache(location,data);
    renderAirQuality(data);
  } catch (error) {
    if (error.name === "AbortError") return;
    console.error(error);
    if (sequence === airSequence) showAirFallback(location,"SkyCast could not reach the atmospheric data service.");
  }
}

window.addEventListener("skycast:locationchange",event=>loadAirQuality(event.detail?.location));
window.addEventListener("online",()=>{ if (currentAirLocation) loadAirQuality(currentAirLocation); });
window.addEventListener("offline",()=>{ if (currentAirLocation) showAirFallback(currentAirLocation,"Network connection lost."); });
