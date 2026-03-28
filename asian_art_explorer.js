// ══ WebGL Shader ══════════════════════════════════════════

const VERT_SRC = `
  attribute vec2 a_position;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

const FRAG_SRC = `
  #ifdef GL_ES
  precision mediump float;
  #endif

  uniform vec2 u_resolution;
  uniform vec2 u_mouse;
  uniform float u_time;

  void main() {
    vec2 st = gl_FragCoord.xy / u_resolution.xy;
    st.x *= u_resolution.x / u_resolution.y;

    vec3 color = vec3(0.0);
    color = vec3(st.x, st.y, abs(sin(u_time)));

    gl_FragColor = vec4(color, 1.0);
  }
`;

const canvas = document.getElementById('shader-canvas');
const gl = canvas.getContext('webgl');
let uTime, uResolution, uMouse;
let rafId = null;
const mouse = { x: 0, y: 0 };

function initGL() {
  if (!gl) return;

  function makeShader(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  }

  const prog = gl.createProgram();
  gl.attachShader(prog, makeShader(gl.VERTEX_SHADER,   VERT_SRC));
  gl.attachShader(prog, makeShader(gl.FRAGMENT_SHADER, FRAG_SRC));
  gl.linkProgram(prog);
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER,
    new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]),
    gl.STATIC_DRAW);

  const loc = gl.getAttribLocation(prog, 'a_position');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  uTime       = gl.getUniformLocation(prog, 'u_time');
  uResolution = gl.getUniformLocation(prog, 'u_resolution');
  uMouse      = gl.getUniformLocation(prog, 'u_mouse');
}

function syncCanvasSize() {
  const wrap = document.getElementById('artwork-wrap');
  const w = wrap.offsetWidth  * devicePixelRatio;
  const h = wrap.offsetHeight * devicePixelRatio;
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width  = w;
    canvas.height = h;
    if (gl) gl.viewport(0, 0, w, h);
  }
}

function startShader() {
  canvas.style.display = 'block';
  syncCanvasSize();
  if (rafId) return;
  const t0 = performance.now();
  function loop() {
    syncCanvasSize();
    const t = (performance.now() - t0) / 1000;
    gl.uniform1f(uTime, t);
    gl.uniform2f(uResolution, canvas.width, canvas.height);
    gl.uniform2f(uMouse, mouse.x, mouse.y);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    rafId = requestAnimationFrame(loop);
  }
  loop();
}

function stopShader() {
  if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
  canvas.style.display = 'none';
}

// JS Event: mousemove → u_mouse
canvas.addEventListener('mousemove', e => {
  const r = canvas.getBoundingClientRect();
  mouse.x = (e.clientX - r.left) * devicePixelRatio;
  mouse.y = (r.height - (e.clientY - r.top)) * devicePixelRatio;
});

initGL();

// ══ 彩色方形點點 ══════════════════════════════════════════

const DOT_COLORS = [
  '#e8a87c', '#d06488', '#c0453a', '#4a9fd4',
  '#d4921a', '#2ea854', '#8a6fbf', '#2a8faa',
  '#f0d080', '#e07090', '#70c0e0', '#a0d870',
];

function spawnDots() {
  const layer = document.getElementById('dots-layer');
  const count = 55;
  for (let i = 0; i < count; i++) {
    const dot = document.createElement('div');
    dot.className = 'dot';

    const size   = 3 + Math.random() * 7;           // 3–10px
    const x      = Math.random() * 100;              // % across
    const y      = Math.random() * 100;              // % down
    const color  = DOT_COLORS[Math.floor(Math.random() * DOT_COLORS.length)];
    const dur    = 6 + Math.random() * 14;           // 6–20s
    const delay  = -(Math.random() * dur);           // stagger start
    const travel = -30 - Math.random() * 60;         // drift upward
    const rotate = -45 + Math.random() * 90;
    const opac   = 0.15 + Math.random() * 0.35;

    dot.style.cssText = `
      width: ${size}px;
      height: ${size}px;
      left: ${x}%;
      top: ${y}%;
      background: ${color};
      animation-duration: ${dur}s;
      animation-delay: ${delay}s;
      --dot-opacity: ${opac};
      --dot-travel: ${travel}px;
      --dot-rotate: ${rotate}deg;
    `;
    layer.appendChild(dot);
  }
}

spawnDots();

// ══ 資料與互動 ════════════════════════════════════════════

let artworks = [];
let current  = 0;
let infoOpen = false;

// Mondrian-style span patterns [cols, rows]
const SPANS = [
  [1,1],[2,1],[1,2],[1,1],[1,1],[2,2],
  [1,1],[1,2],[2,1],[1,1],[1,1],[1,1],
  [2,1],[1,1],[1,2],[1,1],[2,2],[1,1],
  [1,1],[2,1],[1,1],[1,2],[1,1],[1,1],
];

function buildBgGrid() {
  const grid = document.getElementById('bg-grid');
  grid.innerHTML = '';
  let bgIdx = 0;
  artworks.forEach((art, i) => {
    if (i === current) return;
    const [cs, rs] = SPANS[bgIdx % SPANS.length];
    bgIdx++;
    const cell = document.createElement('div');
    cell.className = 'bg-cell';
    cell.style.gridColumn = `span ${cs}`;
    cell.style.gridRow    = `span ${rs}`;
    const img = document.createElement('img');
    img.src = art.image;
    img.alt = art.title;
    img.loading = 'lazy';
    cell.appendChild(img);
    cell.addEventListener('click', () => show(i));
    grid.appendChild(cell);
  });
}

fetch('asian_art.json')
  .then(r => r.json())
  .then(data => { artworks = data; show(0); })
  .catch(() => startShader());

function show(n) {
  current  = (n + artworks.length) % artworks.length;
  infoOpen = false;
  const art = artworks[current];

  document.body.dataset.region = art.affiliation;

  const img = document.getElementById('artwork-img');
  img.classList.remove('loaded');
  stopShader();
  document.getElementById('info-overlay').classList.remove('visible');

  img.onload = () => {
    stopShader();
    img.style.display = 'block';
    img.classList.add('loaded');
  };
  img.onerror = () => {
    img.style.display = 'none';
    startShader();
  };
  img.style.display = 'block';
  img.src = art.image;
  img.alt = art.title;

  document.getElementById('info-badge').textContent    = art.affiliation;
  document.getElementById('info-title').textContent    = art.title;
  document.getElementById('info-title-en').textContent = art.titleEn;
  document.getElementById('info-meta').innerHTML =
    `${art.artist}<br>${art.date} &nbsp;·&nbsp; ${art.period}<br>${art.medium}`;
  document.getElementById('info-desc').textContent = art.description;
  document.getElementById('counter').textContent =
    `${current + 1} / ${artworks.length}`;

  buildBgGrid();
}

// JS Events
document.getElementById('artwork-wrap').addEventListener('click', () => {
  infoOpen = !infoOpen;
  document.getElementById('info-overlay').classList.toggle('visible', infoOpen);
});

document.addEventListener('keydown', e => {
  if (e.key === 'ArrowLeft')  show(current - 1);
  if (e.key === 'ArrowRight') show(current + 1);
  if (e.key === 'Escape') {
    infoOpen = false;
    document.getElementById('info-overlay').classList.remove('visible');
  }
});
