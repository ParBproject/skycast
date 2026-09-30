"use strict";

const assert = require("node:assert/strict");
const core = require("../src/forecast-core.js");

function fixture() {
  const hourlyTimes = Array.from({length:20},(_,i)=>`2026-09-10T${String(i+6).padStart(2,"0")}:00`);
  return {
    timezone:"Europe/London",
    timezone_abbreviation:"BST",
    current:{time:"2026-09-10T13:35",temperature_2m:18,weather_code:2},
    hourly:{
      time:hourlyTimes,
      temperature_2m:hourlyTimes.map((_,i)=>10+i),
      apparent_temperature:hourlyTimes.map((_,i)=>9+i),
      precipitation_probability:hourlyTimes.map((_,i)=>i),
      weather_code:hourlyTimes.map(()=>2),
      wind_speed_10m:hourlyTimes.map((_,i)=>5+i),
      is_day:hourlyTimes.map(()=>1),
    },
    daily:{
      time:Array.from({length:8},(_,i)=>`2026-09-${String(10+i).padStart(2,"0")}`),
      weather_code:[2,0,61,3,1,80,71,0],
      temperature_2m_max:[18,21,16,17,20,15,8,22],
      temperature_2m_min:[11,12,10,9,12,8,1,13],
      apparent_temperature_max:[17,20,15,16,19,14,7,21],
      apparent_temperature_min:[10,11,9,8,11,7,0,12],
      precipitation_probability_max:[10,0,80,25,5,90,60,0],
      precipitation_sum:[0,0,7,1,0,12,3,0],
      wind_speed_10m_max:[18,12,22,30,15,35,20,10],
      wind_gusts_10m_max:[25,20,30,42,22,48,28,18],
      sunrise:Array.from({length:8},(_,i)=>`2026-09-${String(10+i).padStart(2,"0")}T06:30`),
      sunset:Array.from({length:8},(_,i)=>`2026-09-${String(10+i).padStart(2,"0")}T19:20`),
    },
  };
}

{
  const data = core.normalizeForecast(fixture());
  assert.equal(data.days.length,7,"daily normalization must stay capped at seven days");
  assert.equal(data.hours.length,12,"hourly normalization must return twelve entries");
  assert.equal(data.hours[0].time,"2026-09-10T13:00","hourly window should start at the current model hour");
  assert.equal(data.timezone,"Europe/London");
}

{
  const api = fixture();
  api.current.time = "2026-09-10T22:15";
  api.hourly.time = Array.from({length:20},(_,i)=>`2026-09-10T${String(i).padStart(2,"0")}:00`);
  const data = core.normalizeForecast(api);
  assert.equal(data.hours[0].time,"2026-09-10T08:00","a current time past the series must keep the latest hours");
  assert.equal(data.hours[11].time,"2026-09-10T19:00");
}

{
  const bad = fixture();
  delete bad.hourly.time;
  assert.throws(()=>core.normalizeForecast(bad),/incomplete/);
}

{
  const url = new URL(core.buildForecastURL({lat:51.5,lon:-0.12},"fahrenheit"));
  assert.equal(url.hostname,"api.open-meteo.com");
  assert.equal(url.searchParams.get("temperature_unit"),"fahrenheit");
  assert.equal(url.searchParams.get("wind_speed_unit"),"mph");
  assert.match(url.searchParams.get("hourly"),/precipitation_probability/);
  assert.throws(()=>core.buildForecastURL({lat:"x",lon:1},"celsius"),/coordinates/);
}

{
  assert.deepEqual(core.weatherForCode(71),["Light snow","🌨","snow"]);
  assert.deepEqual(core.weatherForCode(999),["Variable conditions","☁","cloud"]);
  assert.equal(core.windDirection(359),"N");
  assert.equal(core.windDirection(90),"E");
  assert.equal(core.windDirection(360),"N");
  assert.equal(core.windDirection(-45),"NW","negative directions must wrap instead of indexing undefined");
  assert.equal(core.formatTime("2026-09-10T00:05"),"12:05 AM");
  assert.equal(core.formatTime("2026-09-10T13:45"),"1:45 PM");
  assert.equal(core.formatTime("2026-09-10T13:45:00"),"1:45 PM");
  assert.equal(core.formatTime("2026-09-10T13"),"—","a timestamp without minutes must not render the word undefined");
  assert.equal(core.formatWindReading(undefined,"celsius"),"—","missing gusts must not become zero");
  assert.equal(core.formatWindReading(null,"celsius"),"—","JSON null wind must not become zero");
  assert.equal(core.formatWindReading(0,"celsius"),"0 km/h");
  assert.equal(core.formatWindReading(12.6,"fahrenheit"),"13 mph");
  assert.equal(core.formatTemp(null),"—");
  assert.equal(core.formatTemp(0),"0°");
  assert.equal(core.formatTemp(""),"—");
  assert.equal(core.formatPct(null),"—");
  assert.equal(core.formatPct(0),"0%");
  assert.deepEqual(core.weatherForCode(0),["Clear sky","☀","clear"]);
  assert.deepEqual(core.weatherForCode(null),["Variable conditions","☁","cloud"],"a missing weather code is not clear sky");
  assert.equal(core.windDirection(null),"");
  assert.equal(core.windDirection(0),"N");
  assert.equal(core.isCurrentModelHour("2026-09-10T13:00","2026-09-10T13:35"),true);
  assert.equal(core.isCurrentModelHour("2026-09-10T06:00","2026-09-10T05:10"),false,"an earlier hour is not Now");
  assert.equal(core.isCurrentModelHour("","2026-09-10T13:35"),false);
}

{
  const now = 2_000_000_000_000;
  assert.equal(core.isCacheFresh(now-core.CACHE_TTL_MS,now),true,"TTL boundary should remain valid");
  assert.equal(core.isCacheFresh(now-core.CACHE_TTL_MS-1,now),false,"entries older than TTL must expire");
  assert.equal(core.isCacheFresh(now+60_000,now),false,"a future timestamp must not count as a fresh forecast");
  assert.equal(core.ageLabel(now-60*60*1000,now),"1 hr ago");
  assert.match(core.cacheKey({lat:1,lon:2},"celsius"),/^skycastForecast:v4:/);
  assert.equal(
    core.cacheKey({lat:51.507401,lon:-0.127801},"celsius"),
    core.cacheKey({lat:51.507399,lon:-0.127799},"celsius"),
    "cache identity must follow the same 4-decimal location key as favorites"
  );
  assert.notEqual(core.cacheKey({lat:51.5,lon:-0.12},"celsius"),core.cacheKey({lat:51.5,lon:-0.12},"fahrenheit"));
  assert.equal(core.cacheKey({lat:null,lon:0},"celsius"),"skycastForecast:v4:na:0.0000:celsius");
  assert.notEqual(core.cacheKey({lat:null,lon:0},"celsius"),core.cacheKey({lat:0,lon:0},"celsius"));
}

{
  const data = core.normalizeForecast(fixture());
  const insight = core.deriveInsights(data.days);
  assert.equal(insight.warmest.date,"2026-09-11");
  assert.equal(insight.wettest.date,"2026-09-15");
  assert.equal(insight.windiest.date,"2026-09-15");
  assert.equal(insight.clearest,3);
  assert.equal(core.deriveInsights([]),null);
  const winter = core.deriveInsights([
    {date:"2026-01-01",high:null,rainChance:null,wind:null,code:null},
    {date:"2026-01-02",high:-8,rainChance:10,wind:5,code:3},
    {date:"2026-01-03",high:-2,rainChance:0,wind:12,code:0},
  ]);
  assert.equal(winter.warmest.date,"2026-01-03","a missing high must not beat a negative temperature");
  assert.equal(winter.wettest.date,"2026-01-02");
  assert.equal(winter.windiest.date,"2026-01-03");
  assert.equal(winter.clearest,1,"a null weather code must not count as clear");
  const missing = core.deriveInsights([{date:"2026-01-01",high:null,rainChance:null,wind:null,code:null}]);
  assert.equal(missing.warmest,null);
  assert.equal(missing.wettest,null);
  assert.equal(missing.windiest,null);
  assert.equal(missing.clearest,0);
}

console.log("forecast-core: all unit tests passed");
