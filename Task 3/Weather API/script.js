/* ================== CONFIG ================== */
const API_KEY = "d6dc2521617deda2a46f5b8c1b38fbf6"; // <-- replace with your OpenWeatherMap API key 
const BASE = "https://api.openweathermap.org/data/2.5";
const ONECALL = "https://api.openweathermap.org/data/2.5/onecall";
const LOCAL_KEY = "weather_default_location_v3";

/* ================== DOM REFS ================== */
const searchBox = document.getElementById('searchBox');
const searchBtn = document.getElementById('searchBtn');
const locBtn = document.getElementById('locBtn');
const setDefaultBtn = document.getElementById('setDefaultBtn');
const locationEl = document.getElementById('location');
const dateTimeEl = document.getElementById('dateTime');
const tempEl = document.getElementById('temp');
const descEl = document.getElementById('desc');
const feelsEl = document.getElementById('feels');
const humEl = document.getElementById('hum');
const windEl = document.getElementById('wind');
const pressureEl = document.getElementById('pressure');
const hourlyRow = document.getElementById('hourlyRow');
const skyIcon = document.getElementById('skyIcon');

const skyCanvas = document.getElementById('sky-canvas');
const skyElements = document.getElementById('sky-elements');
const lottieInner = document.getElementById('lottie-inner');
// Suggestion dropdown container

/* ================== STATE ================== */
let weatherState = {
  main: 'clear', // clear, clouds, rain, thunder, snow, mist
  isDay: true,
  rainIntensity: 0,
  cloudiness: 0.3,
  sunrise: null,
  sunset: null,
  lat: null,
  lon: null
};

let lottieAnim = null;

/* =========== LOTTIE ASSETS (public JSONs) =========== 
   These URLs are public LottieFiles JSON endpoints. Replace if you prefer different visuals.
*/
const LOTTIE_MAP = {
  "clear-day": "https://assets10.lottiefiles.com/packages/lf20_jmBauI.json",
  "clear-night": "https://assets10.lottiefiles.com/packages/lf20_q6w4pG.json",
  "clouds": "https://assets10.lottiefiles.com/packages/lf20_VAmWRg.json",
  "rain": "https://assets10.lottiefiles.com/packages/lf20_rpC1Rd.json",
  "thunder": "https://assets10.lottiefiles.com/packages/lf20_k86wxpgr.json",
  "snow": "https://assets10.lottiefiles.com/packages/lf20_Mp6B8P.json",
  "mist": "https://assets10.lottiefiles.com/packages/lf20_MyN0aS.json"
};

/* =========== UTIL: fetchJSON =========== */
async function fetchJSON(url) {
  const res = await fetch(url);
  const text = await res.text();
  let data = null;
  if (text && text.length > 0) {
    try { data = JSON.parse(text); } catch(e) { console.error('Invalid JSON', text); throw e; }
  }
  if (!res.ok) {
    const msg = data && (data.message || data.msg) ? (data.message || data.msg) : `${res.status} ${res.statusText}`;
    throw new Error(msg);
  }
  return data;
}

/* =========== FETCH / PROCESS =========== */
async function fetchByCity(q) {
  try {
    const url = `${BASE}/weather?q=${encodeURIComponent(q)}&units=metric&appid=${API_KEY}`;
    const data = await fetchJSON(url);
    processCurrent(data);
    setDefaultBtn.onclick = () => saveDefaultLocation({ name: data.name + (data.sys ? (', '+data.sys.country) : ''), lat: data.coord.lat, lon: data.coord.lon });
  } catch(err) {
    console.error(err);
    alert('Error: ' + (err.message || 'Unable to fetch weather'));
  }
}
async function fetchByCoords(lat, lon, label) {
  try {
    const url = `${BASE}/weather?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`;
    const data = await fetchJSON(url);
    processCurrent(data);
    setDefaultBtn.onclick = () => saveDefaultLocation({ name: label || (data.name + (data.sys ? (', '+data.sys.country) : '')), lat, lon });
  } catch(err) {
    console.error(err);
    alert('Error: ' + (err.message || 'Unable to fetch weather by coordinates'));
  }
}
async function fetchOneCall(lat, lon) {
  try {
    const url = `${ONECALL}?lat=${lat}&lon=${lon}&units=metric&exclude=minutely,alerts&appid=${API_KEY}`;
    const one = await fetchJSON(url);
    if (!one) return;
    populateOneCall(one);
  } catch(err) {
    console.error('OneCall error', err);
  }
}

/* =========== PROCESS CURRENT =========== */
function processCurrent(data) {
  if (!data) return;
  const { name, main, weather, wind, dt, sys, coord } = data;
  const mainCond = weather[0].main.toLowerCase();
  const isDay = dt*1000 >= sys.sunrise*1000 && dt*1000 <= sys.sunset*1000;

  locationEl.textContent = `${name}${sys.country ? ', ' + sys.country : ''}`;
  dateTimeEl.textContent = new Date(dt*1000).toLocaleString();
  tempEl.innerHTML = Math.round(main.temp) + '<span class="text-2xl">°C</span>';
  descEl.textContent = weather[0].description;
  feelsEl.textContent = `Feels like ${Math.round(main.feels_like)}°C`;
  humEl.textContent = `${main.humidity}%`;
  windEl.textContent = `${Math.round(wind.speed)} m/s`;
  pressureEl.textContent = `${main.pressure} hPa`;

  // set weatherState
  weatherState.main = detectWeatherMain(mainCond, weather[0].id);
  weatherState.isDay = isDay;
  weatherState.sunrise = sys.sunrise;
  weatherState.sunset = sys.sunset;
  weatherState.cloudiness = (data.clouds && data.clouds.all) ? (data.clouds.all / 100) : (weatherState.main === 'clouds' ? 0.8 : 0.2);
  weatherState.rainIntensity = (weatherState.main === 'rain' || weatherState.main === 'thunder') ? (data.rain && (data.rain['1h'] || data.rain['3h']) ? Math.min(1, (data.rain['1h']||data.rain['3h'])/10) : 0.8) : (weatherState.main === 'clouds' ? 0.15 : 0);

  skyIcon.innerHTML = getIconForMain(weather[0].main);

  // sync visuals
  syncVisualsToWeather();

  // fetch onecall hourly/daily
  if (coord && coord.lat && coord.lon) {
    weatherState.lat = coord.lat;
    weatherState.lon = coord.lon;
    fetchOneCall(coord.lat, coord.lon);
  }
}

function detectWeatherMain(mainCond, id) {
  if (id >= 200 && id < 300) return 'thunder';
  if (id >= 300 && id < 600) return 'rain';
  if (id >= 600 && id < 700) return 'snow';
  if (mainCond.includes('cloud')) return 'clouds';
  if (mainCond.includes('clear')) return 'clear';
  if (mainCond.includes('mist') || mainCond.includes('fog') || mainCond.includes('haze')) return 'mist';
  return 'clear';
}
function getIconForMain(main) {
  const m = main.toLowerCase();
  if (m.includes('clear')) return '<i class="fas fa-sun fa-2x" style="color:#ffd36b"></i>';
  if (m.includes('cloud')) return '<i class="fas fa-cloud fa-2x" style="color:#dfe7ff"></i>';
  if (m.includes('rain') || m.includes('drizzle')) return '<i class="fas fa-cloud-showers-heavy fa-2x" style="color:#bfe6ff"></i>';
  if (m.includes('thunder')) return '<i class="fas fa-bolt fa-2x" style="color:#fff6a6"></i>';
  if (m.includes('snow')) return '<i class="fas fa-snowflake fa-2x" style="color:#e6f7ff"></i>';
  return '<i class="fas fa-smog fa-2x" style="color:#cfd6e8"></i>';
}

/* =========== Populate OneCall (hourly only) =========== */
function formatTime(ts) { return new Date(ts*1000).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}); }
function populateOneCall(one) {
  hourlyRow.innerHTML = '';
  (one.hourly || []).slice(0,12).forEach(h => {
    const card = document.createElement('div');
    card.className = 'glass hour-card p-3 rounded-xl text-center flex flex-col items-center justify-center text-white';
    card.innerHTML = `<div class="text-xs opacity-90">${formatTime(h.dt)}</div>
                      <div class="my-2">${getIconForMain(h.weather[0].main)}</div>
                      <div class="text-sm font-semibold">${Math.round(h.temp)}°</div>`;
    hourlyRow.appendChild(card);
  });

  // WEEKLY FORECAST REMOVED — per your request (no weeklyCards population)
}

/* ================== LOTTIE + VISUAL SYNC ================== */
function chooseLottieKey() {
  let key = weatherState.main || 'clear';
  if (key === 'clear') key = weatherState.isDay ? 'clear-day' : 'clear-night';
  return key;
}
function playLottieKey(key) {
  const url = LOTTIE_MAP[key];
  if (!url) {
    lottieInner.innerHTML = '';
    try { lottieAnim?.destroy(); } catch(e){}
    lottieAnim = null;
    return;
  }
  // quick reuse: if same key do nothing
  if (lottieAnim && lottieAnim.path === url) return;
  try { lottieAnim?.destroy(); } catch(e){}
  lottieInner.innerHTML = '';
  lottieAnim = lottie.loadAnimation({
    container: lottieInner,
    renderer: 'svg',
    loop: true,
    autoplay: true,
    path: url,
    rendererSettings: { preserveAspectRatio: 'xMidYMid slice' }
  });
  // expose path for quick check (nonstandard but handy)
  lottieAnim.path = url;
}
function syncVisualsToWeather() {
  const key = chooseLottieKey();
  playLottieKey(key);
  // dim canvas a bit when Lottie present
  document.getElementById('sky-canvas').style.opacity = lottieAnim ? 0.45 : 1;
  updateBackgroundGradient();
  updateSkyElements();
  updateParticleEngineSettings();
}

/* ================== BACKGROUND GRADIENT (sunrise->day->sunset->night interpolation) ================== */
/* We'll compute an interpolation factor based on the day's progression from sunrise -> noon -> sunset -> night.
   Then we compute two colors for the gradient and apply them to document.body style. */

function lerp(a,b,t){ return a + (b-a)*t; }
function lerpColor(c1,c2,t){
  return [Math.round(lerp(c1[0],c2[0],t)), Math.round(lerp(c1[1],c2[1],t)), Math.round(lerp(c1[2],c2[2],t))];
}
function rgbToCss(c){ return `rgb(${c[0]},${c[1]},${c[2]})`; }

function updateBackgroundGradient() {
  const now = Math.floor(Date.now()/1000);
  const sunrise = weatherState.sunrise || (now - 3600*6);
  const sunset = weatherState.sunset || (now + 3600*6);
  // define anchor times:
  const dawnStart = sunrise - 0.5*3600; // 30 min before sunrise
  const dayStart = sunrise + 0.5*3600;
  const dayEnd = sunset - 0.5*3600;
  const nightStart = sunset + 0.5*3600;

  // color palettes (r,g,b)
  const palettes = {
    dawn: [[255,153,102],[255,204,153]],
    day: [[135,206,235],[252,234,187]],
    dusk: [[255,94,77],[153,50,204]],
    night: [[7,18,37],[2,6,17]]
  };

  let leftColor, rightColor;
  // compute t from 0..1 within each phase
  if (now >= dawnStart && now < dayStart) {
    let t = (now - dawnStart) / (dayStart - dawnStart);
    leftColor = lerpColor(palettes.dawn[0], palettes.day[0], t);
    rightColor = lerpColor(palettes.dawn[1], palettes.day[1], t);
  } else if (now >= dayStart && now < dayEnd) {
    let t = (now - dayStart) / (dayEnd - dayStart);
    leftColor = palettes.day[0];
    rightColor = palettes.day[1];
    // slight shift over day towards warmer as afternoon progresses
    leftColor = lerpColor(leftColor, palettes.dusk[0], t*0.25);
    rightColor = lerpColor(rightColor, palettes.dusk[1], t*0.12);
  } else if (now >= dayEnd && now < nightStart) {
    let t = (now - dayEnd) / (nightStart - dayEnd);
    leftColor = lerpColor(palettes.dusk[0], palettes.night[0], t);
    rightColor = lerpColor(palettes.dusk[1], palettes.night[1], t);
  } else {
    // night to dawn wrap
    if (now >= nightStart) {
      let t = Math.min(1, (now - nightStart) / (6*3600)); // ease into deep night over 6h
      leftColor = lerpColor(palettes.night[0], palettes.dawn[0], t*0.05);
      rightColor = lerpColor(palettes.night[1], palettes.dawn[1], t*0.02);
    } else {
      let t = Math.min(1, (now + 24*3600 - nightStart) / (6*3600));
      leftColor = lerpColor(palettes.night[0], palettes.dawn[0], t*0.25);
      rightColor = lerpColor(palettes.night[1], palettes.dawn[1], t*0.25);
    }
  }
  document.body.style.background = `linear-gradient(180deg, ${rgbToCss(leftColor)} 0%, ${rgbToCss(rightColor)} 100%)`;
}

/* ================== SKY ELEMENTS (sun/moon/clouds/stars) ================== */
function clearSkyElements() { skyElements.innerHTML = ''; }
function updateSkyElements() {
  clearSkyElements();
  const now = Math.floor(Date.now()/1000);
  const sunrise = weatherState.sunrise || now - 6*3600;
  const sunset = weatherState.sunset || now + 6*3600;

  // compute sun/moon normalized position along arc [0..1] between sunrise->sunset
  const daySpan = sunset - sunrise;
  const tDay = (now - sunrise) / (daySpan || 1); // may be <0 or >1

  if (tDay >= 0 && tDay <= 1) {
    // daytime - show sun along an arc
    const sun = document.createElement('div'); sun.className = 'sun';
    const progress = tDay;
    const x = 10 + progress * 80;
    const arc = 0.6 - 1.6 * (progress - 0.5) * (progress - 0.5);
    const yPct = Math.max(8, Math.min(60, arc*100));
    sun.style.left = x + '%';
    sun.style.top = yPct + '%';
    skyElements.appendChild(sun);
  } else {
    // night - show moon: map moon movement from sunset->next sunrise
    let nightStart = sunset;
    let nightEnd = sunrise + 24*3600;
    let tNight = (now < sunrise) ? (now + 24*3600 - nightStart) / (nightEnd - nightStart) : (now - nightStart) / (nightEnd - nightStart);
    tNight = Math.max(0, Math.min(1, tNight));
    const moon = document.createElement('div'); moon.className='moon';
    const x = 10 + tNight * 80;
    const arc = 0.7 - 1.4 * (tNight - 0.5) * (tNight - 0.5);
    const yPct = Math.max(12, Math.min(70, arc*100));
    moon.style.left = x + '%';
    moon.style.top = yPct + '%';
    skyElements.appendChild(moon);

    // add stars
    addStars(70);
  }

  // clouds (density based on cloudiness)
  addClouds(Math.round(2 + weatherState.cloudiness * 6));
}
function addStars(n) {
  for (let i=0;i<n;i++){
    const s = document.createElement('div'); s.className='star';
    s.style.left = (Math.random()*100) + '%';
    s.style.top = (Math.random()*60) + '%';
    s.style.opacity = (0.2 + Math.random()*0.9).toString();
    s.style.transform = `scale(${0.5 + Math.random()*1.6})`;
    skyElements.appendChild(s);
  }
}
function addClouds(n) {
  for (let i=0;i<n;i++){
    const c = document.createElement('div'); c.className='cloud';
    const w = 160 + Math.random()*260;
    const h = w * (0.45 + Math.random()*0.2);
    c.style.width = w + 'px'; c.style.height = h + 'px';
    const left = -30 - Math.random()*20;
    const top = (8 + Math.random()*35) + '%';
    c.style.left = (Math.random()*100) + '%';
    c.style.top = top;
    c.style.opacity = 0.35 + 0.4*weatherState.cloudiness;
    // create blob shapes
    const s1 = document.createElement('div'); s1.className='shape'; s1.style.width = (w*0.6)+'px'; s1.style.height=(h*0.8)+'px'; s1.style.left='10%'; s1.style.top='25%';
    const s2 = document.createElement('div'); s2.className='shape'; s2.style.width=(w*0.5)+'px'; s2.style.height=(h*0.65)+'px'; s2.style.left='40%'; s2.style.top='10%';
    const s3 = document.createElement('div'); s3.className='shape'; s3.style.width=(w*0.7)+'px'; s3.style.height=(h*0.9)+'px'; s3.style.left='60%'; s3.style.top='30%';
    c.appendChild(s1); c.appendChild(s2); c.appendChild(s3);
    // animation speed based on cloudiness
    const dur = 40 + 40*(1-weatherState.cloudiness) + Math.random()*40;
    c.style.transition = `transform ${dur}s linear`;
    c.dataset.vx = 10 + Math.random()*20; // px per sec approx
    skyElements.appendChild(c);
  }
}

/* ================== PARTICLE ENGINE (canvas) ================== */
const canvas = skyCanvas;
const ctx = canvas.getContext('2d');
let DPR = Math.max(1, window.devicePixelRatio || 1);
function resizeCanvas(){ canvas.width = window.innerWidth * DPR; canvas.height = window.innerHeight * DPR; canvas.style.width = window.innerWidth + 'px'; canvas.style.height = window.innerHeight + 'px'; ctx.setTransform(DPR,0,0,DPR,0,0); }
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

let particles = []; // raindrops or snowflakes
let fogLayers = []; // fog rectangles
let lastTime = performance.now();
let lightningTimer = 0;

function spawnRain(count) {
  for (let i=0;i<count;i++){
    particles.push({
      type:'rain',
      x: Math.random()*canvas.width/DPR,
      y: Math.random()*-canvas.height/DPR,
      len: 10 + Math.random()*25,
      speed: 400 + Math.random()*400, // px/sec
      tilt: -0.2 + Math.random()*0.4,
      alpha: 0.15 + Math.random()*0.8
    });
  }
}
function spawnSnow(count) {
  for (let i=0;i<count;i++){
    particles.push({
      type:'snow',
      x: Math.random()*canvas.width/DPR,
      y: Math.random()*-canvas.height/DPR,
      r: 1 + Math.random()*3.5,
      speed: 20 + Math.random()*60,
      sway: Math.random()*40,
      alpha: 0.4 + Math.random()*0.6
    });
  }
}
function createFogLayers() {
  fogLayers = [];
  const cols = Math.ceil(canvas.width / (200*DPR));
  for (let i=0;i<Math.min(4, cols); i++){
    fogLayers.push({
      x: Math.random()*canvas.width/DPR,
      y: Math.random()*(canvas.height/DPR) * 0.6,
      w: (canvas.width/DPR) * (0.6 + Math.random()*0.8),
      h: 120 + Math.random()*220,
      alpha: 0.03 + Math.random()*0.07,
      vx: 5 + Math.random()*12
    });
  }
}

function clearParticles() { particles = []; fogLayers = []; }

function updateParticleEngineSettings() {
  // get desired amounts from weatherState
  const intensity = weatherState.rainIntensity || 0;
  // spawn/clear according to current main type
  if (weatherState.main === 'rain' || weatherState.main === 'thunder') {
    // keep ~ 150 + intensity*450 raindrops
    const target = Math.round(150 + intensity*450);
    const currentRain = particles.filter(p => p.type === 'rain').length;
    if (currentRain < target) spawnRain(target - currentRain);
    // clear snow
    particles = particles.filter(p => p.type !== 'snow');
    createFogLayers(); // maybe light mist too
  } else if (weatherState.main === 'snow') {
    const target = Math.round(70 + (1-weatherState.cloudiness)*40 + 40);
    const currentSnow = particles.filter(p => p.type === 'snow').length;
    if (currentSnow < target) spawnSnow(target - currentSnow);
    particles = particles.filter(p => p.type !== 'rain');
    createFogLayers();
  } else {
    // clear precipitation; maybe small fine mist for fog/mist
    particles = particles.filter(p => false); // clear all p
    if (weatherState.main === 'mist') {
      createFogLayers();
    } else {
      fogLayers = [];
    }
  }

  // lightning timers for thunder
  if (weatherState.main === 'thunder') {
    if (!lightningTimer && Math.random() < 0.004) lightningTimer = 8 + Math.floor(Math.random()*40);
  } else lightningTimer = 0;
}

/* draw loop */
function particleLoop(now) {
  const dt = (now - lastTime) / 1000;
  lastTime = now;
  ctx.clearRect(0,0,canvas.width,canvas.height);

  // draw fog layers first (semi-transparent white rectangles with blur)
  fogLayers.forEach(f => {
    f.x += f.vx * dt * 0.05;
    if (f.x > canvas.width/DPR + f.w) f.x = -f.w;
    ctx.save();
    ctx.globalAlpha = f.alpha * (weatherState.isDay ? 0.7 : 1.0);
    const grad = ctx.createLinearGradient(f.x, f.y, f.x+f.w, f.y + f.h);
    grad.addColorStop(0, 'rgba(255,255,255,0.00)');
    grad.addColorStop(0.35, 'rgba(255,255,255,0.06)');
    grad.addColorStop(0.65, 'rgba(255,255,255,0.04)');
    grad.addColorStop(1, 'rgba(255,255,255,0.00)');
    ctx.fillStyle = grad;
    roundRect(ctx, f.x, f.y, f.w, f.h, 80);
    ctx.fill();
    ctx.restore();
  });

  // draw particles
  for (let i = particles.length-1; i >= 0; i--) {
    const p = particles[i];
    if (p.type === 'rain') {
      p.x += p.tilt * 300 * dt;
      p.y += p.speed * dt;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.strokeStyle = `rgba(200,220,255,${Math.max(0.08, Math.min(0.9, p.alpha))})`;
      ctx.lineWidth = 1.2;
      ctx.lineTo(p.x + p.tilt*15, p.y + p.len);
      ctx.stroke();
      if (p.y > canvas.height/DPR + 20) {
        // recycle
        p.y = -Math.random()*200;
        p.x = Math.random()*canvas.width/DPR;
      }
    } else if (p.type === 'snow') {
      p.y += p.speed * dt;
      p.x += Math.sin((now/1000 + p.x) * 0.5) * (p.sway/100); // sway
      ctx.beginPath();
      ctx.fillStyle = `rgba(255,255,255,${p.alpha})`;
      ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
      ctx.fill();
      if (p.y > canvas.height/DPR + 10) {
        p.y = -Math.random()*200;
        p.x = Math.random()*canvas.width/DPR;
      }
    }
  }

  // lightning flash
  if (lightningTimer > 0) {
    const flashAlpha = 0.06 + 0.18 * Math.sin((performance.now() % 300) / 300 * Math.PI);
    ctx.fillStyle = `rgba(255,255,255,${flashAlpha})`;
    ctx.fillRect(0,0,canvas.width/DPR, canvas.height/DPR);
    lightningTimer--;
  }

  requestAnimationFrame(particleLoop);
}
requestAnimationFrame(particleLoop);

/* small helper to draw rounded rectangle on canvas */
function roundRect(ctx,x,y,w,h,r){
  if (w<2*r) r = w/2;
  if (h<2*r) r = h/2;
  ctx.beginPath();
  ctx.moveTo(x+r,y);
  ctx.arcTo(x+w,y,x+w,y+h,r);
  ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r);
  ctx.arcTo(x,y,x+w,y,r);
  ctx.closePath();
}

/* ================== Helpers: save/load default ================== */
function saveDefaultLocation(obj) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(obj));
  alert('Saved default location ✅');
}
function getSavedLocation() { try { return JSON.parse(localStorage.getItem(LOCAL_KEY)); } catch(e){ return null; } }

/* ================== UI EVENTS ================== */
searchBtn.addEventListener('click', () => { const q = searchBox.value.trim(); if(q) fetchByCity(q); });
searchBox.addEventListener('keyup', (e) => { if (e.key === 'Enter') searchBtn.click(); });
locBtn.title = "Requires browser location access and HTTPS. May fail on some devices.";
locBtn.addEventListener('click', async () => {
  if (!navigator.geolocation) return alert('Geolocation not supported');
  navigator.geolocation.getCurrentPosition(
    async pos => {
      await fetchByCoords(pos.coords.latitude, pos.coords.longitude, 'My Location');
      alert('Showing current location weather 🌍');
    },
    err => alert('Location denied or unavailable')
  );
});

/* ================== Auto refresh & movement watch ================== */
let refreshTimer = null;
const REFRESH_INTERVAL_MS = 10*60*1000;
function scheduleRefresh() {
  if (refreshTimer) clearInterval(refreshTimer);
  refreshTimer = setInterval(() => {
    if (weatherState.lat && weatherState.lon) fetchByCoords(weatherState.lat, weatherState.lon, 'My Location');
  }, REFRESH_INTERVAL_MS);
}

let geoWatchId = null;
function startWatchPosition() {
  if (!navigator.geolocation) return;
  if (geoWatchId !== null) navigator.geolocation.clearWatch(geoWatchId);
  geoWatchId = navigator.geolocation.watchPosition(pos => {
    const lat = pos.coords.latitude, lon = pos.coords.longitude;
    const prevLat = weatherState.lat, prevLon = weatherState.lon;
    const moved = (!prevLat || haversine(prevLat, prevLon, lat, lon) > 0.5);
    if (moved) fetchByCoords(lat, lon, 'My Location');
  }, err => console.warn('watchPosition err', err), { enableHighAccuracy:true, maximumAge:60000, timeout:8000 });
}
function haversine(lat1,lon1,lat2,lon2){
  if (!lat1||!lon1||!lat2||!lon2) return 9999;
  const R=6371, toRad = x=>x*Math.PI/180;
  const dLat=toRad(lat2-lat1), dLon=toRad(lon2-lon1);
  const a=Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
  return 2*R*Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

/* ================== INIT ================== */
(async function init(){
  // attempt saved default, else geolocation else fallback city
  const saved = getSavedLocation();
  if (saved && saved.lat && saved.lon) {
    await fetchByCoords(saved.lat, saved.lon, saved.name);
    } else if (navigator.geolocation) {
    try {
      await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(async pos => {
          await fetchByCoords(pos.coords.latitude, pos.coords.longitude, 'My Location');
          resolve();
        }, err => {
          console.warn('Geolocation failed, falling back to default city', err);
          fetchByCity('Brahmapur, IN'); // fallback city
          resolve();
        });
      });
    } catch(e) {
      console.error(e);
      fetchByCity('Brahmapur, IN');
    }
  } else {
    fetchByCity('Brahmapur, IN'); // fallback
  }

  startWatchPosition();
  scheduleRefresh();
})();

/* ================== Particle spawn initial updater ================== */
setInterval(() => { updateParticleEngineSettings(); }, 1200); // adjust particles every ~1.2s

/* ================== Gradient update schedule (smooth) ================== */
setInterval(() => { updateBackgroundGradient(); updateSkyElements(); }, 60_000); // every minute

/* run immediately */
updateBackgroundGradient();
updateSkyElements();
updateParticleEngineSettings();

const searchInput = document.getElementById('searchInput');
const suggestionBox = document.getElementById('suggestionBox');