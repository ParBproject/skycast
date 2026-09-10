"use strict";

const assert = require("node:assert/strict");
const {
  AIR_CACHE_TTL_MS,
  buildAirQualityURL,
  aqiBand,
  uvBand,
  dominantPollutant,
  pollenSummary,
  normalizeAirQuality,
  airQualityCacheKey,
  isAirCacheFresh,
} = require("../src/air-quality-core.js");

function test(name,fn) {
  try { fn(); console.log(`✓ ${name}`); }
  catch (error) { console.error(`✗ ${name}`); throw error; }
}

test("buildAirQualityURL includes coordinates, timezone and atmospheric variables",()=>{
  const url = new URL(buildAirQualityURL({lat:43.6532,lon:-79.3832}));
  assert.equal(url.hostname,"air-quality-api.open-meteo.com");
  assert.equal(url.searchParams.get("latitude"),"43.6532");
  assert.equal(url.searchParams.get("longitude"),"-79.3832");
  assert.equal(url.searchParams.get("timezone"),"auto");
  const current = url.searchParams.get("current");
  for (const field of ["european_aqi","pm2_5","pm10","uv_index","grass_pollen","european_aqi_ozone"]) assert.ok(current.includes(field),field);
});

test("buildAirQualityURL rejects invalid coordinates",()=>{
  assert.throws(()=>buildAirQualityURL({lat:95,lon:0}),/invalid/);
  assert.throws(()=>buildAirQualityURL({lat:0,lon:-181}),/invalid/);
});

test("European AQI bands follow provider thresholds",()=>{
  assert.equal(aqiBand(20).label,"Good");
  assert.equal(aqiBand(21).label,"Fair");
  assert.equal(aqiBand(40).label,"Fair");
  assert.equal(aqiBand(41).label,"Moderate");
  assert.equal(aqiBand(61).label,"Poor");
  assert.equal(aqiBand(81).label,"Very poor");
  assert.equal(aqiBand(101).label,"Extremely poor");
});

test("UV bands cover low through extreme exposure",()=>{
  assert.equal(uvBand(2.9).label,"Low");
  assert.equal(uvBand(3).label,"Moderate");
  assert.equal(uvBand(6).label,"High");
  assert.equal(uvBand(8).label,"Very high");
  assert.equal(uvBand(11).label,"Extreme");
});

test("dominantPollutant selects the highest component AQI",()=>{
  const result = dominantPollutant({european_aqi_pm2_5:32,european_aqi_pm10:28,european_aqi_nitrogen_dioxide:41,european_aqi_ozone:56,european_aqi_sulphur_dioxide:12});
  assert.deepEqual(result,{label:"O₃",index:56});
});

test("pollenSummary ignores missing values and selects the highest available pollen",()=>{
  const result = pollenSummary({alder_pollen:null,birch_pollen:4,grass_pollen:18,ragweed_pollen:2});
  assert.deepEqual(result,{label:"Grass",value:18});
});

test("normalizeAirQuality produces a compact atmospheric model",()=>{
  const data = normalizeAirQuality({
    timezone:"Europe/Paris",timezone_abbreviation:"CEST",
    current:{time:"2026-09-10T14:00",european_aqi:35,european_aqi_pm2_5:35,european_aqi_pm10:20,european_aqi_nitrogen_dioxide:10,european_aqi_ozone:25,european_aqi_sulphur_dioxide:8,pm2_5:9.4,pm10:18.2,nitrogen_dioxide:12,ozone:72,sulphur_dioxide:3,uv_index:4.6,grass_pollen:6,birch_pollen:1}
  });
  assert.equal(data.aqi,35);
  assert.equal(data.aqiBand.label,"Fair");
  assert.equal(data.pm25,9.4);
  assert.equal(data.uvBand.label,"Moderate");
  assert.equal(data.dominant.label,"PM2.5");
  assert.equal(data.pollen.label,"Grass");
  assert.equal(data.timezoneAbbr,"CEST");
});

test("normalizeAirQuality rejects incomplete payloads",()=>{
  assert.throws(()=>normalizeAirQuality({}),/incomplete/);
});

test("air-quality cache keys are coordinate-specific and TTL boundaries are enforced",()=>{
  assert.equal(airQualityCacheKey({lat:43.65321,lon:-79.38318}),"skycastAir:v1:43.6532:-79.3832");
  const now = 10_000_000;
  assert.equal(isAirCacheFresh(now-AIR_CACHE_TTL_MS,now),true);
  assert.equal(isAirCacheFresh(now-AIR_CACHE_TTL_MS-1,now),false);
  assert.equal(isAirCacheFresh(now+1,now),false);
});

console.log("Air-quality core tests passed.");
