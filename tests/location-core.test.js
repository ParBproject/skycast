"use strict";

const assert = require("node:assert/strict");
const {
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
} = require("../src/location-core.js");

function test(name,fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    throw error;
  }
}

test("keeps 22 unique curated European presets",()=>{
  assert.equal(DEFAULT_CITIES.length,22);
  assert.equal(new Set(DEFAULT_CITIES.map(locationKey)).size,22);
});

test("validates and sanitizes locations",()=>{
  assert.deepEqual(sanitizeLocation({name:"  Toronto  ",lat:"43.65",lon:"-79.38"}),{name:"Toronto",lat:43.65,lon:-79.38,timezone:""});
  assert.equal(sanitizeLocation({name:"Bad",lat:91,lon:0}),null);
  assert.equal(sanitizeLocation({name:"Bad",lat:0,lon:-181}),null);
});

test("uses coordinate precision for location identity",()=>{
  const a = {name:"A",lat:51.507401,lon:-0.127801};
  const b = {name:"B",lat:51.507399,lon:-0.127799};
  assert.equal(locationKey(a),"51.5074:-0.1278");
  assert.equal(sameLocation(a,b),true);
});

test("builds a bounded Open-Meteo geocoding request",()=>{
  const url = new URL(buildGeocodingURL("Paris, France",100));
  assert.equal(`${url.origin}${url.pathname}`,GEOCODING_ENDPOINT);
  assert.equal(url.searchParams.get("name"),"Paris, France");
  assert.equal(url.searchParams.get("count"),"10");
  assert.equal(url.searchParams.get("language"),"en");
  assert.throws(()=>buildGeocodingURL("x"),/two characters/);
});

test("normalizes geocoding results and removes duplicate coordinates",()=>{
  const results = normalizeGeocodingResults({results:[
    {name:"Paris",admin1:"Île-de-France",country:"France",latitude:48.8566,longitude:2.3522,timezone:"Europe/Paris",country_code:"FR",feature_code:"PPLC"},
    {name:"Paris duplicate",country:"France",latitude:48.85661,longitude:2.35219,timezone:"Europe/Paris",country_code:"FR"},
    {name:"Invalid",country:"Nowhere",latitude:181,longitude:0},
  ]});
  assert.equal(results.length,1);
  assert.equal(results[0].name,"Paris, Île-de-France, France");
  assert.equal(results[0].countryCode,"FR");
  assert.equal(results[0].timezone,"Europe/Paris");
});

test("trims invalid and duplicate favorites",()=>{
  const favorites = trimFavorites([
    {name:"London",lat:51.5074,lon:-0.1278},
    {name:"London again",lat:51.5074,lon:-0.1278},
    {name:"Invalid",lat:200,lon:0},
  ]);
  assert.equal(favorites.length,1);
  assert.equal(favorites[0].name,"London");
});

test("toggles favorites and enforces the maximum",()=>{
  let favorites = [];
  for (let i=0;i<FAVORITES_LIMIT+3;i+=1) {
    favorites = toggleFavorite(favorites,{name:`Place ${i}`,lat:i,lon:i});
  }
  assert.equal(favorites.length,FAVORITES_LIMIT);
  assert.equal(favorites[0].name,`Place ${FAVORITES_LIMIT+2}`);

  const selected = favorites[0];
  favorites = toggleFavorite(favorites,selected);
  assert.equal(favorites.some(item=>sameLocation(item,selected)),false);
});

test("round-trips a Celsius share link",()=>{
  const query = buildShareQuery({name:"Berlin, Germany",lat:52.52,lon:13.405},"celsius");
  const parsed = parseShareQuery(query);
  assert.equal(parsed.unit,"celsius");
  assert.equal(parsed.location.name,"Berlin, Germany");
  assert.equal(parsed.location.lat,52.52);
  assert.equal(parsed.location.lon,13.405);
});

test("round-trips Fahrenheit and safely rejects invalid shared coordinates",()=>{
  const query = buildShareQuery({name:"New York",lat:40.7128,lon:-74.006},"fahrenheit");
  assert.equal(parseShareQuery(query).unit,"fahrenheit");
  assert.equal(parseShareQuery("?lat=999&lon=0&name=Bad"),null);
  assert.equal(parseShareQuery("?name=MissingCoordinates"),null);
});

console.log("Location core tests passed.");
