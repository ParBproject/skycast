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

const CITIES = [
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

const els = Object.fromEntries([
  "city","unitC","unitF","refreshBtn","installBtn","status","connectionPill","connectionLabel","forecastGrid","hourlyGrid","chart","insights","heroArtwork","currentCondition","currentTemp","currentCity","forecastTime","lastUpdated","timezoneLabel","cacheLabel","feelsMetric","humidityMetric","windMetric","windDetail","cloudMetric","rainMetric","sunsetMetric","sunriseDetail"
].map(id => [id, document.getElementById(id)]));

let unit = localStorage.getItem("skycastUnit") || "celsius";
if (!['celsius','fahrenheit'].includes(unit)) unit = 'celsius';
let activeController = null;
let loadSequence = 0;
let deferredInstallPrompt = null;
document.getElementById("year").textContent = new Date().getFullYear();

CITIES.forEach((city,index) => {
  const option = document.createElement("option");
  option.value = index;
  option.textContent = city.name;
  els.city.appendChild(option);
});
const savedCity = Number(localStorage.getItem("skycastCity"));
els.city.value = Number.isInteger(savedCity) && savedCity >= 0 && savedCity < CITIES.length ? String(savedCity) : "10";

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

function saveCachedForecast(city,data) {
  try {
    localStorage.setItem(cacheKey(city,unit),JSON.stringify({savedAt:Date.now(),data}));
  } catch (error) {
    console.warn("SkyCast cache write skipped",error);
  }
}

function readCachedForecast(city) {
  try {
    const key = cacheKey(city,unit);
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

function renderHero(city,data) {
  const [label,,theme] = weatherForCode(data.current.weather_code);
  els.currentCondition.textContent = label;
  els.currentTemp.textContent = formatTemp(data.current.temperature_2m);
  els.currentCity.textContent = city.name;
  const localTime = String(data.current.time || "").slice(11,16);
  els.forecastTime.textContent = `${localTime || "—"}${data.timezoneAbbr ? ` ${data.timezoneAbbr}` : ""}`;
  els.heroArtwork.src = `assets/hero-${theme}.svg`;
  els.heroArtwork.alt = `${label} themed European weather illustration`;
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

function renderData(city,data,{cached=false,savedAt=null}={}) {
  renderHero(city,data);
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

function showCachedOrUnavailable(city,message) {
  const cached = readCachedForecast(city);
  if (cached) {
    renderData(city,cached.data,{cached:true,savedAt:cached.savedAt});
    showStatus(`${message} Showing the last successful forecast from ${ageLabel(cached.savedAt)}.`,false,true);
    return true;
  }
  setConnectionState("offline");
  showStatus(`${message} No recent cached forecast is available for this city and unit.`,true);
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
  const city = CITIES[Number(els.city.value)];

  if (!navigator.onLine) {
    els.refreshBtn.disabled = false;
    showCachedOrUnavailable(city,"SkyCast is offline.");
    return;
  }

  showStatus(`Updating live forecast for ${city.name}…`);
  renderLoading();
  els.refreshBtn.disabled = true;
  try {
    const response = await fetch(buildForecastURL(city,unit),{cache:"no-store",signal:activeController.signal});
    if (!response.ok) throw new Error(`Weather service returned ${response.status}`);
    const api = await response.json();
    if (sequence !== loadSequence) return;
    const data = normalizeForecast(api);
    saveCachedForecast(city,data);
    renderData(city,data);
    showStatus("");
  } catch (error) {
    if (error.name === "AbortError") return;
    console.error(error);
    showCachedOrUnavailable(city,"SkyCast could not reach the live weather service.");
  } finally {
    if (sequence === loadSequence) els.refreshBtn.disabled = false;
  }
}

els.city.addEventListener("change",()=>{ localStorage.setItem("skycastCity",els.city.value); loadForecast(); });
els.unitC.addEventListener("click",()=>{ unit="celsius"; localStorage.setItem("skycastUnit",unit); syncUnitButtons(); loadForecast(); });
els.unitF.addEventListener("click",()=>{ unit="fahrenheit"; localStorage.setItem("skycastUnit",unit); syncUnitButtons(); loadForecast(); });
els.refreshBtn.addEventListener("click",loadForecast);

window.addEventListener("online",()=>{ setConnectionState("live"); loadForecast(); });
window.addEventListener("offline",()=>{ const city = CITIES[Number(els.city.value)]; showCachedOrUnavailable(city,"Network connection lost."); });
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

syncUnitButtons();
setConnectionState(navigator.onLine ? "live" : "offline");
loadForecast();
