const canvas = document.getElementById("scene");
const ctx = canvas.getContext("2d");

const YEAR_MIN = 1814;
const YEAR_MAX = 2020;

const LON_MIN = -122.511;
const LON_MAX = -122.377;
const LAT_MIN = 37.602;
const LAT_MAX = 37.809;

const STAGGER_MS = 2;
const BLOOM_MS = 700;

function resize() {
  canvas.width = 480;
  canvas.height = 620;
}

function lonToX(lon) {
  return ((lon - LON_MIN) / (LON_MAX - LON_MIN)) * canvas.width;
}

function latToY(lat) {
  return ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * canvas.height;
}

function yearToSize(year) {
  if (!year || isNaN(year)) return 3;
  const t = (year - YEAR_MIN) / (YEAR_MAX - YEAR_MIN);
  return 16 - t * 10;
}

const GREEN_SHADES = [
  "#2d6a4f",
  "#40916c",
  "#52b788",
  "#74c69d",
  "#1b4332",
  "#95d5b2",
  "#b7e4c7",
  "#081c15",
];

let bgDots = [];

function generateBgDots() {
  bgDots = [];
  for (let i = 0; i < 120; i++) {
    bgDots.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: 2 + Math.random() * 5,
      color: GREEN_SHADES[Math.floor(Math.random() * GREEN_SHADES.length)],
      alpha: 0.3 + Math.random() * 0.22,
    });
  }
}

function drawBgDots() {
  bgDots.forEach((d) => {
    ctx.save();
    ctx.globalAlpha = d.alpha;
    ctx.fillStyle = d.color;
    ctx.fillRect(d.x - d.size / 2, d.y - d.size / 2, d.size, d.size);
    ctx.restore();
  });
}

function easeOut(t) {
  return 1 - Math.pow(1 - t, 3);
}

function drawFlower(x, y, size, hue, alpha, rotation) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.globalAlpha = alpha;

  const petalCount = 6;
  const orbitR = size * 0.9;
  const petalR = size * 0.55;

  for (let i = 0; i < petalCount; i++) {
    const angle = (i / petalCount) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(
      Math.cos(angle) * orbitR,
      Math.sin(angle) * orbitR,
      petalR,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = `hsla(${hue}, 85%, 65%, 0.7)`;
    ctx.fill();
  }

  ctx.beginPath();
  ctx.arc(0, 0, petalR * 0.7, 0, Math.PI * 2);
  ctx.fillStyle = `hsla(${(hue + 40) % 360}, 90%, 80%, 0.9)`;
  ctx.fill();

  ctx.restore();
}

function animate(features, startTime) {
  const elapsed = performance.now() - startTime;

  ctx.fillStyle = "#0a0a0f";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawBgDots();

  let allDone = true;

  features.forEach((feature, i) => {
    const geom = feature.geometry;
    if (!geom || !geom.coordinates) return;

    const delay = i * STAGGER_MS;
    const raw = Math.max(0, Math.min(1, (elapsed - delay) / BLOOM_MS));
    if (raw < 1) allDone = false;
    if (raw === 0) return;

    const progress = easeOut(raw);
    const [lon, lat] = geom.coordinates;
    const year = parseInt(feature.properties.creation_date);
    const size = yearToSize(isNaN(year) ? null : year);

    drawFlower(
      lonToX(lon),
      latToY(lat),
      size,
      feature._hue,
      progress,
      (1 - progress) * Math.PI,
    );
  });

  if (!allDone) requestAnimationFrame(() => animate(features, startTime));
}

function init() {
  resize();
  generateBgDots();

  fetch("Civic_Art_Collection_20260328.geojson")
    .then((r) => r.json())
    .then((data) => {
      const features = data.features;

      features.forEach((f) => {
        f._hue = Math.floor(Math.random() * 360);
      });

      features.sort((a, b) => {
        const ya = parseInt(a.properties.creation_date) || YEAR_MAX;
        const yb = parseInt(b.properties.creation_date) || YEAR_MAX;
        return ya - yb;
      });

      requestAnimationFrame((t) => animate(features, t));
    })
    .catch((err) => console.error("Failed to load data:", err));
}

document.getElementById("about-btn").addEventListener("click", () => {
  document.getElementById("about-panel").classList.remove("hidden");
});
document.getElementById("close-btn").addEventListener("click", () => {
  document.getElementById("about-panel").classList.add("hidden");
});

init();
