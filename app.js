"use strict";

const {
  CACHE_TTL_MS,
  weatherForCode,
  formatTemp,
  formatPct,
  formatTime,
  windDirection,
  ageLabel,
  cacheKey,
  isCacheFresh,
  buildForecastURL,
  normalizeForecast,
  deriveInsights,
} = SkyCastCore;

const {
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
} = SkyCastLocations;

const els = Object.fromEntries([
  "city","unitC","unitF","refreshBtn","installBtn","shareBtn","status","connectionPill","connectionLabel","forecastGrid","hourlyGrid","chart","insights","heroArtwork","currentCondition","currentTemp","currentCity","forecastTime","lastUpdated","timezoneLabel","cacheLabel","feelsMetric","humidityMetric","windMetric","windDetail","cloudMetric","rainMetric","sunsetMetric","sunriseDetail","locationSearchForm","locationQuery","locationSearchBtn","locationResults","geoBtn","favoriteBtn","favoritesRow"
].map(id => [id, document.getElementById(id)]));

function readJSON(key,fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

const sharedState = parseShareQuery(window.location.search);
let unit = sharedState?.unit || localStorage.getItem("skycastUnit") || "celsius";
if (!["celsius","fahrenheit"].includes(unit)) unit = "celsius";

const legacySavedCity = Number(localStorage.getItem("skycastCity"));
const savedLocation = sanitizeLocation(readJSON("skycastLocation",null));
let activeLocation = sharedState?.location || savedLocation || DEFAULT_CITIES[Number.isInteger(legacySavedCity) && legacySavedCity >= 0 && legacySavedCity < DEFAULT_CITIES.length ? legacySavedCity : 10];
let favorites = trimFavorites(readJSON("skycastFavorites",[]));
let activeController = null;
let searchController = null;
let loadSequence = 0;
let deferredInstallPrompt = null;

document.getElementById("year").textContent = new Date().getFullYear();

function allSelectableLocations() {
  const locations = DEFAULT_CITIES.slice();
  if (!locations.some(location=>sameLocation(location,activeLocation))) locations.push(activeLocation);
  return locations;
}

function renderLocationOptions() {
  els.city.replaceChildren();
  for (const location of allSelectableLocations()) {
    const option = document.createElement("option");
    option.value = locationKey(location);
    option.textContent = location.name;
    els.city.appendChild(option);
  }
  els.city.value = locationKey(activeLocation);
}

function syncUnitButtons() {
  const c = unit === "celsius";
  els.unitC.classList.toggle("active",c);
  els.unitF.classList.toggle("active",!c);
  els.unitC.setAttribute("aria-pressed",String(c));
  els.unitF.setAttribute("aria-pressed",String(!c));
}

function showStatus(message,error=false,cached=false) {
  els.status.textContent = message;
  els.status.classList.toggle("show",Boolean(message));
  els.status.classList.toggle("error",error);
  els.status.classList.toggle("cached",cached);
}

function setConnectionState(mode) {
  els.connectionPill.classList.toggle("cached",mode === "cached");
  els.connectionPill.classList.toggle("offline",mode === "offline");
  els.connectionLabel.textContent = mode === "cached" ? "Cached forecast" : mode === "offline" ? "Offline" : "Live forecast";
}

function persistActiveLocation() {
  try {
    localStorage.setItem("skycastLocation",JSON.stringify(activeLocation));
    const presetIndex = DEFAULT_CITIES.findIndex(location=>sameLocation(location,activeLocation));
    if (presetIndex >= 0) localStorage.setItem("skycastCity",String(presetIndex));
  } catch (error) {
    console.warn("SkyCast location preference write skipped",error);
  }
}

function updateShareURL() {
  try {
    const next = `${window.location.pathname}${buildShareQuery(activeLocation,unit)}${window.location.hash}`;
    window.history.replaceState(null,"",next);
  } catch (error) {
    console.warn("SkyCast URL state update skipped",error);
  }
}

function renderFavorites() {
  els.favoritesRow.replaceChildren();
  els.favoritesRow.hidden = favorites.length === 0;
  if (!favorites.length) return;

  const label = document.createElement("span");
  label.className = "favorites-label";
  label.textContent = "Favorites";
  els.favoritesRow.appendChild(label);

  for (const location of favorites) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "favorite-chip";
    button.textContent = location.name;
    button.addEventListener("click",()=>setActiveLocation(location));
    els.favoritesRow.appendChild(button);
  }
}

function syncFavoriteButton() {
  const saved = favorites.some(location=>sameLocation(location,activeLocation));
  els.favoriteBtn.classList.toggle("favorite-active",saved);
  els.favoriteBtn.setAttribute("aria-pressed",String(saved));
  els.favoriteBtn.textContent = saved ? "★ Saved" : "☆ Save";
}

function setActiveLocation(location,{persist=true,refresh=true}={}) {
  const clean = sanitizeLocation(location);
  if (!clean) return false;
  activeLocation = clean;
  renderLocationOptions();
  syncFavoriteButton();
  if (persist) persistActiveLocation();
  updateShareURL();
  if (refresh) loadForecast();
  return true;
}

function saveCachedForecast(location,data) {
  try {
    localStorage.setItem(cacheKey(location,unit),JSON.stringify({savedAt:Date.now(),data}));
  } catch (error) {
    console.warn("SkyCast cache write skipped",error);
  }
}

function readCachedForecast(location) {
  try {
    const key = cacheKey(location,unit);
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const cached = JSON.parse(raw);
    if (!cached?.data || !isCacheFresh(cached?.savedAt,Date.now(),CACHE_TTL_MS)) {
      localStorage.removeItem(key);
      return null;
    }
    return cached;
  } catch (error) {
    console.warn("SkyCast cache read skipped",error);
    return null;
  }
}

function renderHero(location,data) {
  const [label,,theme] = weatherForCode(data.current.weather_code);
  els.currentCondition.textContent = label;
  els.currentTemp.textContent = formatTemp(data.current.temperature_2m);
  els.currentCity.textContent = location.name;
  const localTime = String(data.current.time || "").slice(11,16);
  els.forecastTime.textContent = `${localTime || "—"}${data.timezoneAbbr ? ` ${data.timezoneAbbr}` : ""}`;
  els.heroArtwork.src = `assets/hero-${theme}.svg`;
  els.heroArtwork.alt = `${label} themed weather illustration`;
}

function renderMetrics(data) {
  const c = data.current;
  const today = data.days[0] || {};
  const windUnit = unit === "fahrenheit" ? "mph" : "km/h";
  els.feelsMetric.textContent = formatTemp(c.apparent_temperature);
  els.humidityMetric.textContent = formatPct(c.relative_humidity_2m);
  els.windMetric.textContent = Number.isFinite(Number(c.wind_speed_10m)) ? `${Math.round(c.wind_speed_10m)} ${windUnit}` : "—";
  const direction = windDirection(c.wind_direction_10m);
  els.windDetail.textContent = direction ? `${direction} • gusts ${Math.round(c.wind_gusts_10m || 0)} ${windUnit}` : "10 m wind speed";
  els.cloudMetric.textContent = formatPct(c.cloud_cover);
  els.rainMetric.textContent = formatPct(today.rainChance);
  els.sunsetMetric.textContent = formatTime(today.sunset);
  els.sunriseDetail.textContent = `Sunrise ${formatTime(today.sunrise)}`;
  els.timezoneLabel.textContent = data.timezone;
}

function renderHourly(hours) {
  const windUnit = unit === "fahrenheit" ? "mph" : "km/h";
  els.hourlyGrid.innerHTML = hours.map((hour,index) => {
    const [label,glyph] = weatherForCode(hour.code);
    const timeLabel = index === 0 ? "Now" : formatTime(hour.time);
    return `<article class="hour-card" aria-label="${timeLabel}: ${label}, ${formatTemp(hour.temp)}, rain ${formatPct(hour.rainChance)}"><div class="hour-time">${timeLabel}</div><div class="hour-glyph" aria-hidden="true">${glyph}</div><div class="hour-temp">${formatTemp(hour.temp)}</div><div class="hour-meta"><span>${label}</span><span>Rain ${formatPct(hour.rainChance)}</span><span>Wind ${Number.isFinite(Number(hour.wind)) ? `${Math.round(hour.wind)} ${windUnit}` : "—"}</span></div></article>`;
  }).join("");
}

function renderForecast(days) {
  const windUnit = unit === "fahrenheit" ? "mph" : "km/h";
  els.forecastGrid.innerHTML = days.map(day => {
    const [label,glyph] = weatherForCode(day.code);
    const dt = new Date(`${day.date}T12:00:00`);
    const weekday = dt.toLocaleDateString(undefined,{weekday:"short"});
    const date = dt.toLocaleDateString(undefined,{month:"short",day:"numeric"});
    return `<article class="forecast-card"><div class="day-name">${weekday}</div><div class="day-date">${date}</div><div class="wx-glyph" aria-hidden="true">${glyph}</div><div class="wx-summary">${label}</div><div class="temp-line"><span class="temp-hi">${formatTemp(day.high)}</span><span class="temp-lo">${formatTemp(day.low)}</span></div><div class="day-meta"><span>Rain ${formatPct(day.rainChance)}</span><span>Wind ${Number.isFinite(Number(day.wind)) ? `${Math.round(day.wind)} ${windUnit}` : "—"}</span></div></article>`;
  }).join("");
}

function renderChart(days) {
  const highs = days.map(d => Number(d.high)).filter(Number.isFinite);
  const lows = days.map(d => Number(d.low)).filter(Number.isFinite);
  if (!highs.length || highs.length !== days.length || lows.length !== days.length) {
    els.chart.innerHTML = "";
    return;
  }
  const all = highs.concat(lows);
  let min = Math.floor(Math.min(...all)-2);
  let max = Math.ceil(Math.max(...all)+2);
  if (min === max) max += 1;
  const W=900,H=280,left=54,right=28,top=32,bottom=48;
  const x=i=>left+i*((W-left-right)/Math.max(days.length-1,1));
  const y=v=>top+(max-v)*((H-top-bottom)/(max-min));
  const points=arr=>arr.map((v,i)=>`${x(i)},${y(v)}`).join(" ");
  const grid=Array.from({length:4},(_,i)=>min+i*((max-min)/3)).map(v=>`<line x1="${left}" x2="${W-right}" y1="${y(v)}" y2="${y(v)}" stroke="rgba(160,190,220,.10)"/><text x="12" y="${y(v)+4}" fill="#7890a8" font-size="11">${Math.round(v)}°</text>`).join("");
  const labels=days.map((d,i)=>`<text x="${x(i)}" y="${H-15}" text-anchor="middle" fill="#7890a8" font-size="11">${new Date(`${d.date}T12:00:00`).toLocaleDateString(undefined,{weekday:"short"})}</text>`).join("");
  const dots=highs.map((v,i)=>`<circle cx="${x(i)}" cy="${y(v)}" r="4" fill="#ffd178"/><text x="${x(i)}" y="${y(v)-10}" text-anchor="middle" fill="#ffdba0" font-size="11" font-weight="700">${Math.round(v)}°</text>`).join("") + lows.map((v,i)=>`<circle cx="${x(i)}" cy="${y(v)}" r="4" fill="#63b6ff"/>`).join("");
  els.chart.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="High and low temperature trend">${grid}<polyline points="${points(highs)}" fill="none" stroke="#ffd178" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><polyline points="${points(lows)}" fill="none" stroke="#63b6ff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>${dots}${labels}</svg>`;
}

function renderInsights(days) {
  const insight = deriveInsights(days);
  if (!insight) {
    els.insights.innerHTML = "";
    return;
  }
  const {warmest,wettest,windiest,clearest} = insight;
  const dayName = d => new Date(`${d.date}T12:00:00`).toLocaleDateString(undefined,{weekday:"long"});
  const windUnit = unit === "fahrenheit" ? "mph" : "km/h";
  const rows = [
    ["↗","Warmest day",`${dayName(warmest)} reaches about ${formatTemp(warmest.high)}.`],
    ["☂","Highest rain risk",`${dayName(wettest)} has up to ${formatPct(wettest.rainChance)} precipitation probability.`],
    ["〰","Windiest day",`${dayName(windiest)} peaks near ${Math.round(Number(windiest.wind)||0)} ${windUnit}.`],
    ["◎","Clearer days",`${clearest} of ${days.length} days are clear, mainly clear, or partly cloudy.`]
  ];
  els.insights.innerHTML = rows.map(([icon,title,copy])=>`<div class="insight"><div class="insight-icon" aria-hidden="true">${icon}</div><div><strong>${title}</strong><span>${copy}</span></div></div>`).join("");
}

function renderData(location,data,{cached=false,savedAt=null}={}) {
  renderHero(location,data);
  renderMetrics(data);
  renderHourly(data.hours || []);
  renderForecast(data.days);
  renderChart(data.days);
  renderInsights(data.days);
  if (cached && savedAt) {
    const age = ageLabel(savedAt);
    els.lastUpdated.textContent = `Cached ${age}`;
    els.cacheLabel.textContent = `Last successful update ${age}`;
    setConnectionState("cached");
  } else {
    els.lastUpdated.textContent = `Updated ${String(data.current.time || "").replace("T"," ")}${data.timezoneAbbr ? ` ${data.timezoneAbbr}` : ""}`;
    els.cacheLabel.textContent = "Live model data";
    setConnectionState("live");
  }
}

function renderLoading() {
  els.hourlyGrid.innerHTML = Array.from({length:8},()=>`<div class="hour-card"><div class="skeleton" style="height:13px;width:48px"></div><div class="skeleton" style="height:28px;width:34px;margin:14px 0 10px"></div><div class="skeleton" style="height:22px;width:52px"></div><div class="skeleton" style="height:30px;margin-top:9px"></div></div>`).join("");
  els.forecastGrid.innerHTML = Array.from({length:7},()=>`<div class="forecast-card"><div class="skeleton" style="height:14px;width:46px"></div><div class="skeleton" style="height:11px;width:60px;margin-top:8px"></div><div class="skeleton" style="height:48px;width:48px;margin:18px 0 14px"></div><div class="skeleton" style="height:30px"></div><div class="skeleton" style="height:22px;width:72px;margin-top:12px"></div></div>`).join("");
  els.chart.innerHTML = `<div class="skeleton" style="position:absolute;inset:18px"></div>`;
}

function showCachedOrUnavailable(location,message) {
  const cached = readCachedForecast(location);
  if (cached) {
    renderData(location,cached.data,{cached:true,savedAt:cached.savedAt});
    showStatus(`${message} Showing the last successful forecast from ${ageLabel(cached.savedAt)}.`,false,true);
    return true;
  }
  setConnectionState("offline");
  showStatus(`${message} No recent cached forecast is available for this location and unit.`,true);
  els.hourlyGrid.innerHTML = `<div style="color:#8fa4bb;padding:18px 0">Hourly data is unavailable offline.</div>`;
  els.forecastGrid.innerHTML = `<div style="grid-column:1/-1;color:#8fa4bb;padding:22px 0">Live forecast cards are temporarily unavailable.</div>`;
  els.chart.innerHTML = "";
  els.insights.innerHTML = "";
  return false;
}

async function loadForecast() {
  const sequence = ++loadSequence;
  if (activeController) activeController.abort();
  activeController = new AbortController();
  const location = activeLocation;

  if (!navigator.onLine) {
    els.refreshBtn.disabled = false;
    showCachedOrUnavailable(location,"SkyCast is offline.");
    return;
  }

  showStatus(`Updating live forecast for ${location.name}…`);
  renderLoading();
  els.refreshBtn.disabled = true;
  try {
    const response = await fetch(buildForecastURL(location,unit),{cache:"no-store",signal:activeController.signal});
    if (!response.ok) throw new Error(`Weather service returned ${response.status}`);
    const api = await response.json();
    if (sequence !== loadSequence) return;
    const data = normalizeForecast(api);
    saveCachedForecast(location,data);
    renderData(location,data);
    showStatus("");
  } catch (error) {
    if (error.name === "AbortError") return;
    console.error(error);
    showCachedOrUnavailable(location,"SkyCast could not reach the live weather service.");
  } finally {
    if (sequence === loadSequence) els.refreshBtn.disabled = false;
  }
}

function hideLocationResults() {
  els.locationResults.hidden = true;
  els.locationResults.replaceChildren();
}

function renderLocationResults(results) {
  els.locationResults.replaceChildren();
  if (!results.length) {
    const empty = document.createElement("div");
    empty.className = "location-empty";
    empty.textContent = "No matching locations found. Try a city plus country or a postal code.";
    els.locationResults.appendChild(empty);
  } else {
    for (const result of results) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "location-result";
      button.setAttribute("role","option");
      const title = document.createElement("strong");
      title.textContent = result.name;
      const meta = document.createElement("span");
      meta.textContent = [result.timezone,result.countryCode].filter(Boolean).join(" • ");
      button.append(title,meta);
      button.addEventListener("click",()=>{
        hideLocationResults();
        els.locationQuery.value = "";
        setActiveLocation(result);
      });
      els.locationResults.appendChild(button);
    }
  }
  els.locationResults.hidden = false;
}

async function searchLocations(event) {
  event.preventDefault();
  const query = els.locationQuery.value.trim();
  if (query.length < 2) {
    showStatus("Enter at least two characters to search for a location.",true);
    els.locationQuery.focus();
    return;
  }
  if (!navigator.onLine) {
    showStatus("Location search requires a network connection.",true);
    return;
  }
  if (searchController) searchController.abort();
  searchController = new AbortController();
  els.locationSearchBtn.disabled = true;
  els.locationSearchBtn.textContent = "Searching…";
  try {
    const response = await fetch(buildGeocodingURL(query,8),{cache:"no-store",signal:searchController.signal});
    if (!response.ok) throw new Error(`Location service returned ${response.status}`);
    const results = normalizeGeocodingResults(await response.json());
    renderLocationResults(results);
    showStatus("");
  } catch (error) {
    if (error.name === "AbortError") return;
    console.error(error);
    hideLocationResults();
    showStatus("SkyCast could not search locations right now.",true);
  } finally {
    els.locationSearchBtn.disabled = false;
    els.locationSearchBtn.textContent = "Search";
  }
}

function useCurrentLocation() {
  if (!navigator.geolocation) {
    showStatus("This browser does not provide location access.",true);
    return;
  }
  els.geoBtn.disabled = true;
  els.geoBtn.textContent = "Locating…";
  showStatus("Requesting your current location…");
  navigator.geolocation.getCurrentPosition(
    position=>{
      els.geoBtn.disabled = false;
      els.geoBtn.textContent = "⌖ Use my location";
      setActiveLocation({name:"My location",lat:position.coords.latitude,lon:position.coords.longitude});
      showStatus("");
    },
    error=>{
      els.geoBtn.disabled = false;
      els.geoBtn.textContent = "⌖ Use my location";
      const message = error.code === 1 ? "Location permission was not granted." : "SkyCast could not determine your current location.";
      showStatus(message,true);
    },
    {enableHighAccuracy:false,timeout:10000,maximumAge:10*60*1000}
  );
}

async function shareCurrentForecast() {
  updateShareURL();
  const shareData = {title:`SkyCast — ${activeLocation.name}`,text:`Weather forecast for ${activeLocation.name}`,url:window.location.href};
  try {
    if (navigator.share) {
      await navigator.share(shareData);
      return;
    }
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(shareData.url);
      showStatus("Share link copied to your clipboard.");
      return;
    }
    showStatus("The forecast URL is ready to copy from your browser address bar.");
  } catch (error) {
    if (error.name !== "AbortError") showStatus("SkyCast could not share this forecast.",true);
  }
}

els.city.addEventListener("change",()=>{
  const selected = allSelectableLocations().find(location=>locationKey(location) === els.city.value);
  if (selected) setActiveLocation(selected);
});
els.unitC.addEventListener("click",()=>{ unit="celsius"; localStorage.setItem("skycastUnit",unit); syncUnitButtons(); updateShareURL(); loadForecast(); });
els.unitF.addEventListener("click",()=>{ unit="fahrenheit"; localStorage.setItem("skycastUnit",unit); syncUnitButtons(); updateShareURL(); loadForecast(); });
els.refreshBtn.addEventListener("click",loadForecast);
els.locationSearchForm.addEventListener("submit",searchLocations);
els.geoBtn.addEventListener("click",useCurrentLocation);
els.favoriteBtn.addEventListener("click",()=>{
  favorites = toggleFavorite(favorites,activeLocation);
  try { localStorage.setItem("skycastFavorites",JSON.stringify(favorites)); } catch (error) { console.warn("SkyCast favorites write skipped",error); }
  renderFavorites();
  syncFavoriteButton();
});
els.shareBtn.addEventListener("click",shareCurrentForecast);
els.locationQuery.addEventListener("keydown",event=>{ if (event.key === "Escape") hideLocationResults(); });
document.addEventListener("pointerdown",event=>{ if (!els.locationSearchForm.contains(event.target)) hideLocationResults(); });

window.addEventListener("online",()=>{ setConnectionState("live"); loadForecast(); });
window.addEventListener("offline",()=>showCachedOrUnavailable(activeLocation,"Network connection lost."));
window.addEventListener("popstate",()=>{
  const state = parseShareQuery(window.location.search);
  if (!state) return;
  unit = state.unit;
  localStorage.setItem("skycastUnit",unit);
  syncUnitButtons();
  setActiveLocation(state.location,{persist:true,refresh:true});
});
window.addEventListener("beforeinstallprompt",event => { event.preventDefault(); deferredInstallPrompt = event; els.installBtn.hidden = false; });
els.installBtn.addEventListener("click",async() => {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  els.installBtn.hidden = true;
});
window.addEventListener("appinstalled",()=>{ deferredInstallPrompt = null; els.installBtn.hidden = true; });

if ("serviceWorker" in navigator) {
  window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(error=>console.warn("Service worker registration failed",error)));
}

renderLocationOptions();
renderFavorites();
syncFavoriteButton();
syncUnitButtons();
persistActiveLocation();
updateShareURL();
setConnectionState(navigator.onLine ? "live" : "offline");
loadForecast();
