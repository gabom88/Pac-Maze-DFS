'use strict';

/* ═══════════════════════════════════════════
   UTILS
═══════════════════════════════════════════ */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = (n) => Math.floor(Math.random() * n);
const $ = (id) => document.getElementById(id);

function shade(hex, percent) {
  const n = parseInt(hex.slice(1), 16);
  const amt = Math.round(2.55 * percent);
  const r = clamp((n >> 16) + amt, 0, 255);
  const g = clamp(((n >> 8) & 0xff) + amt, 0, 255);
  const b = clamp((n & 0xff) + amt, 0, 255);
  return `rgb(${r},${g},${b})`;
}

/* ═══════════════════════════════════════════
   TIENDA (catálogo local: todo desbloqueado)
═══════════════════════════════════════════ */
const DEFAULT_PACMAN_COLOR = '#FFD700';
const DEFAULT_GHOST_COLORS = ['#FF4136', '#FF69B4', '#7FDBFF', '#FF851B'];

// Tarjetas sintéticas "gratis" para poder volver siempre al estilo original.
const DEFAULT_ITEMS = [
  {
    sku: '__default_pacman',
    name: 'Clásico',
    description: 'El Pac-Man dorado original.',
    price: null,
    productMetadata: { category: 'pacman_skin', color: 'FFD700', isDefault: 'true' },
  },
  {
    sku: '__default_ghosts',
    name: 'Clásicos',
    description: 'Los colores originales de los 4 fantasmas.',
    price: null,
    productMetadata: {
      category: 'ghost_theme',
      colors: 'FF4136,FF69B4,7FDBFF,FF851B',
      isDefault: 'true',
    },
  },
  {
    sku: '__default_maze',
    name: 'Clásico',
    description: 'Neón con un tono aleatorio distinto en cada nivel.',
    price: null,
    productMetadata: { category: 'maze_theme', isDefault: 'true' },
  },
];

// Tienda oculta por ahora; poner en true para recuperarla. Los powerups no dependen de esto.
const SHOP_ENABLED = false;

const allProducts = [
  {
    sku: 'theme_maze_gameboy',
    name: 'GameBoy',
    description: 'Todo en verde monocromático.',
    productMetadata: {
      category: 'maze_theme',
      wallStyle: 'flat',
      wallLight: '306230',
      wallDark: '306230',
      wallEdge: '0F380F',
      bg: '9BBC0F',
      pelletColor: '0F380F',
    },
  },
  {
    sku: 'powerup_laser',
    name: 'Láser',
    description: 'Dispara un láser (tecla Q).',
    productMetadata: { category: 'powerup' },
  },
  {
    sku: 'powerup_teleport',
    name: 'Teletransporte',
    description: 'Te teletransporta (tecla E).',
    productMetadata: { category: 'powerup' },
  },
  {
    sku: 'powerup_mine',
    name: 'Mina',
    description: 'Coloca una mina (tecla R).',
    productMetadata: { category: 'powerup' },
  },
];
const ownedSkus = new Set(allProducts.map((p) => p.sku));
let selectedPacmanSkin = null;
let selectedGhostTheme = null;
let selectedMazeTheme = null;

function loadLocal(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function saveLocal(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore: private mode or blocked storage
  }
}
function removeLocal(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore: private mode or blocked storage
  }
}

function loadSelections() {
  const pacSku = loadLocal('pacmanSkin');
  const ghostSku = loadLocal('ghostTheme');
  const mazeSku = loadLocal('mazeTheme');
  selectedPacmanSkin = pacSku && ownedSkus.has(pacSku) ? pacSku : null;
  selectedGhostTheme = ghostSku && ownedSkus.has(ghostSku) ? ghostSku : null;
  selectedMazeTheme = mazeSku && ownedSkus.has(mazeSku) ? mazeSku : null;
}

function findProduct(sku) {
  return allProducts.find((p) => p.sku === sku);
}

function pacmanColor() {
  const p = selectedPacmanSkin && findProduct(selectedPacmanSkin);
  const hex = p && p.productMetadata && p.productMetadata.color;
  return hex ? '#' + hex : DEFAULT_PACMAN_COLOR;
}

/** Aplica la paleta elegida a los fantasmas ya existentes, sin regenerar el laberinto. */
function applyGhostColors() {
  const colors = ghostThemeColors();
  ghosts.forEach((g, i) => {
    g.color = colors[i] || g.color;
  });
}

function setSelectedPacmanSkin(sku) {
  selectedPacmanSkin = sku;
  if (sku) saveLocal('pacmanSkin', sku);
  else removeLocal('pacmanSkin');
}

function setSelectedGhostTheme(sku) {
  selectedGhostTheme = sku;
  if (sku) saveLocal('ghostTheme', sku);
  else removeLocal('ghostTheme');
  applyGhostColors();
}

function setSelectedMazeTheme(sku) {
  selectedMazeTheme = sku;
  if (sku) saveLocal('mazeTheme', sku);
  else removeLocal('mazeTheme');
  applyPageTheme();
}

/** El tema GameBoy tiñe TODO (HUD, canvas, palanca, botones) a un verde monocromático,
 *  no solo las paredes del laberinto. Se hace con un filtro CSS para no tener que
 *  recolorear cada elemento individualmente. */
function applyPageTheme() {
  const isGameboy = selectedMazeTheme === 'theme_maze_gameboy';
  ['hud', 'game', 'crt', 'joystick', 'pw-btns'].forEach((id) => {
    const el = $(id);
    if (el) el.classList.toggle('gb-filter', isGameboy);
  });
}

/** Devuelve la paleta de paredes elegida, o null para usar el tono aleatorio por nivel. */
function mazeThemeColors() {
  const p = selectedMazeTheme && findProduct(selectedMazeTheme);
  const m = p && p.productMetadata;
  const light = m && m.wallLight;
  if (!light) return null;
  return {
    light: '#' + light,
    dark: '#' + m.wallDark,
    edge: '#' + m.wallEdge,
    bg: m.bg ? '#' + m.bg : '#000',
    pelletColor: m.pelletColor ? '#' + m.pelletColor : null,
    flat: m.wallStyle === 'flat',
  };
}

function ghostThemeColors() {
  const p = selectedGhostTheme && findProduct(selectedGhostTheme);
  const list = p && p.productMetadata && p.productMetadata.colors;
  return list ? list.split(',').map((h) => '#' + h) : DEFAULT_GHOST_COLORS;
}

/* ═══════════════════════════════════════════
   AUDIO  (iOS-safe: resume en gesto de usuario)
═══════════════════════════════════════════ */
let AC = null,
  masterGain = null;

function initAudio() {
  if (AC) return;
  try {
    AC = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = AC.createGain();
    masterGain.gain.value = 0.15;
    masterGain.connect(AC.destination);
  } catch (e) {
    AC = null;
  }
}

function ensureRunning() {
  if (!AC) return false;
  if (AC.state === 'suspended') AC.resume();
  return AC.state === 'running' || AC.state === 'suspended'; // optimistic
}

function tone({ freq = 440, dur = 0.08, type = 'square', vol = 1, delay = 0 }) {
  if (!ensureRunning()) return;
  try {
    const t = AC.currentTime + delay;
    const o = AC.createOscillator(),
      g = AC.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.005);
    g.gain.linearRampToValueAtTime(vol * 0.6, t + dur * 0.5);
    g.gain.linearRampToValueAtTime(0, t + dur + 0.02);
    o.connect(g);
    g.connect(masterGain);
    o.start(t);
    o.stop(t + dur + 0.05);
  } catch (e) {
    // ignore
  }
}

let wakaT = false;
const SFX = {
  eat: () => {
    wakaT = !wakaT;
    tone({ freq: wakaT ? 520 : 480, dur: 0.045, vol: 0.8 });
  },
  power: () => {
    tone({ freq: 200, dur: 0.22, type: 'sawtooth', vol: 0.7 });
    tone({ freq: 300, dur: 0.18, type: 'sawtooth', delay: 0.12, vol: 0.7 });
  },
  eatGhost: () => {
    tone({ freq: 1200, dur: 0.08 });
    tone({ freq: 900, dur: 0.08, delay: 0.1 });
  },
  bonus: () => {
    [523, 659, 784, 1047].forEach((f, i) =>
      tone({ freq: f, dur: 0.16, type: 'triangle', delay: i * 0.1, vol: 0.9 })
    );
  },
  laser: () => {
    tone({ freq: 1600, dur: 0.05, type: 'sawtooth', vol: 1 });
    tone({ freq: 1000, dur: 0.08, type: 'sawtooth', vol: 1, delay: 0.04 });
    tone({ freq: 180, dur: 0.28, type: 'square', vol: 0.9, delay: 0.09 });
  },
  teleport: () => {
    [900, 700, 500, 1400].forEach((f, i) =>
      tone({ freq: f, dur: 0.09, type: 'sine', delay: i * 0.06, vol: 0.8 })
    );
  },
  mineArm: () => {
    tone({ freq: 320, dur: 0.05, type: 'square', vol: 0.6 });
  },
  explosion: () => {
    tone({ freq: 120, dur: 0.35, type: 'sawtooth', vol: 1 });
    tone({ freq: 80, dur: 0.4, type: 'square', vol: 0.9, delay: 0.03 });
    tone({ freq: 45, dur: 0.5, type: 'triangle', vol: 0.8, delay: 0.06 });
  },
  die: () => {
    [220, 190, 160, 130].forEach((f, i) =>
      tone({ freq: f, dur: 0.18, type: 'triangle', delay: i * 0.12, vol: 0.7 })
    );
  },
  level: () => {
    [600, 760, 880, 990].forEach((f, i) => tone({ freq: f, dur: 0.14, delay: i * 0.12 }));
  },
  start: () => {
    [660, 880, 990].forEach((f, i) => tone({ freq: f, dur: 0.12, delay: i * 0.14 }));
  },
  life: () => {
    [880, 1175, 1568].forEach((f, i) => tone({ freq: f, dur: 0.12, delay: i * 0.13 }));
  },
};

/* ═══════════════════════════════════════════
   CANVAS & RESIZE
═══════════════════════════════════════════ */
const cvs = $('game'),
  ctx = cvs.getContext('2d');
let TILE = 18,
  COLS = 15,
  ROWS = 27;

function vpSize() {
  const vv = window.visualViewport;
  return {
    w: vv ? vv.width : window.innerWidth,
    h: vv ? vv.height : window.innerHeight,
  };
}
const HUD_H = 36;
const crt = $('crt');
function fit() {
  const { w, h } = vpSize();
  const avH = Math.max(120, h - HUD_H - 4);
  TILE = Math.max(10, Math.min(28, Math.floor(avH / ROWS)));
  cvs.width = COLS * TILE;
  cvs.height = ROWS * TILE;
  const scale = Math.min(w / (COLS * TILE), avH / (ROWS * TILE), 1.5);
  cvs.style.width = ((COLS * TILE * scale) | 0) + 'px';
  cvs.style.height = ((ROWS * TILE * scale) | 0) + 'px';
  if (crt) {
    crt.style.width = cvs.style.width;
    crt.style.height = cvs.style.height;
  }
}
fit();
window.addEventListener('resize', fit);
window.addEventListener('orientationchange', fit);
if (window.visualViewport) window.visualViewport.addEventListener('resize', fit);

/* ═══════════════════════════════════════════
   GRID / DFS MAZE
═══════════════════════════════════════════ */
const WALL = 1,
  PATH = 0;
let grid = [],
  pellets = [];

function makeGrid() {
  // 1. Crear grid todo muro
  grid = Array.from({ length: ROWS }, () => Array(COLS).fill(WALL));

  // 2. DFS para generar laberinto perfecto (siempre resoluble, sin zonas aisladas)
  for (let y = 1; y < ROWS; y += 2) for (let x = 1; x < COLS; x += 2) grid[y][x] = PATH;
  const stack = [[1, 1]],
    visited = new Set(['1,1']);
  const DDFS = [
    [2, 0],
    [-2, 0],
    [0, 2],
    [0, -2],
  ];
  while (stack.length) {
    const [cx, cy] = stack[stack.length - 1];
    const nb = [];
    for (const [dx, dy] of DDFS) {
      const nx = cx + dx,
        ny = cy + dy;
      if (
        nx > 0 &&
        nx < COLS - 1 &&
        ny > 0 &&
        ny < ROWS - 1 &&
        grid[ny][nx] === PATH &&
        !visited.has(nx + ',' + ny)
      )
        nb.push([nx, ny, dx, dy]);
    }
    if (nb.length) {
      const [nx, ny, dx, dy] = nb[rnd(nb.length)];
      grid[cy + ((dy / 2) | 0)][cx + ((dx / 2) | 0)] = PATH; // abre pared entre
      visited.add(nx + ',' + ny);
      stack.push([nx, ny]);
    } else stack.pop();
  }

  // 3. Bordes sólidos
  for (let x = 0; x < COLS; x++) {
    grid[0][x] = WALL;
    grid[ROWS - 1][x] = WALL;
  }
  for (let y = 0; y < ROWS; y++) {
    grid[y][0] = WALL;
    grid[y][COLS - 1] = WALL;
  }

  // 4. Añadir loops (ciclos extra) para que sea interesante sin romper accesibilidad
  addLoops(0.2);
}

function addLoops(ratio) {
  const candidates = [];
  for (let y = 1; y < ROWS - 1; y++)
    for (let x = 1; x < COLS - 1; x++) {
      if (grid[y][x] !== WALL) continue;
      const h = grid[y][x - 1] === PATH && grid[y][x + 1] === PATH;
      const v = grid[y - 1][x] === PATH && grid[y + 1][x] === PATH;
      if (h || v) candidates.push([x, y]);
    }
  shuffle(candidates);
  const n = Math.floor(candidates.length * ratio);
  for (let i = 0; i < n; i++) grid[candidates[i][1]][candidates[i][0]] = PATH;
}

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = rnd(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
}

/* ═══════════════════════════════════════════
   PELLETS
═══════════════════════════════════════════ */
function placePellets(pacSpawn, ghostSpawn) {
  pellets = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
  // Puntos en todas las celdas PATH interiores
  for (let y = 1; y < ROWS - 1; y++)
    for (let x = 1; x < COLS - 1; x++) {
      if (grid[y][x] === PATH) pellets[y][x] = 1;
    }
  // Quitar zona inicio pacman
  const r = 2;
  for (let dy = -r; dy <= r; dy++)
    for (let dx = -r; dx <= r; dx++) {
      const nx = pacSpawn.x + dx,
        ny = pacSpawn.y + dy;
      if (ny >= 0 && ny < ROWS && nx >= 0 && nx < COLS) pellets[ny][nx] = 0;
    }
  // Quitar zona fantasmas
  for (let dy = -2; dy <= 2; dy++)
    for (let dx = -2; dx <= 2; dx++) {
      const nx = ghostSpawn.x + dx,
        ny = ghostSpawn.y + dy;
      if (ny >= 0 && ny < ROWS && nx >= 0 && nx < COLS) pellets[ny][nx] = 0;
    }
  // Power pellets: 4 esquinas accesibles
  const corners = [
    [1, 1],
    [COLS - 2, 1],
    [1, ROWS - 2],
    [COLS - 2, ROWS - 2],
  ];
  for (const [cx, cy] of corners) {
    let placed = false;
    for (let r2 = 0; r2 <= 3 && !placed; r2++) {
      for (let dy = -r2; dy <= r2 && !placed; dy++)
        for (let dx = -r2; dx <= r2 && !placed; dx++) {
          if (grid[cy + dy] && grid[cy + dy][cx + dx] === PATH) {
            pellets[cy + dy][cx + dx] = 2;
            placed = true;
          }
        }
    }
  }
}

/* ═══════════════════════════════════════════
   ENTITIES
═══════════════════════════════════════════ */
const DIRS = { U: { x: 0, y: -1 }, D: { x: 0, y: 1 }, L: { x: -1, y: 0 }, R: { x: 1, y: 0 } };
let gameLevel = 1,
  score = 0,
  lives = 3,
  eatenTotal = 0,
  extraLivesGiven = 0,
  scoreLifeGiven = 0;
const SCORE_LIFE_STEP = 2500;

function addScore(n) {
  score += n;
  const milestone = Math.floor(score / SCORE_LIFE_STEP);
  if (milestone > scoreLifeGiven) {
    scoreLifeGiven = milestone;
    lives++;
    SFX.bonus();
  }
}
let ghostBaseSpeed = TILE * 4.8; // se sobreescribe al iniciar
let pac,
  ghosts = [],
  frightMs = 0;
let ghostBase = { x: COLS - 2, y: ROWS - 2 };
let wallHue = 200;
let gameState = 'idle'; // 'idle' | 'playing' | 'dead' | 'levelup'

function tileCenter(x, y) {
  return { cx: x * TILE + TILE / 2, cy: y * TILE + TILE / 2 };
}
function passable(tx, ty) {
  return ty >= 0 && ty < ROWS && tx >= 0 && tx < COLS && grid[ty][tx] === PATH;
}
function nbDirs(tx, ty) {
  const a = [];
  if (passable(tx + 1, ty)) a.push(DIRS.R);
  if (passable(tx - 1, ty)) a.push(DIRS.L);
  if (passable(tx, ty + 1)) a.push(DIRS.D);
  if (passable(tx, ty - 1)) a.push(DIRS.U);
  return a;
}
function findSpawn() {
  for (let y = 2; y < ROWS - 2; y++)
    for (let x = 2; x < COLS - 2; x++) {
      if (!passable(x, y)) continue;
      const opts = nbDirs(x, y);
      if (opts.length >= 3) return { x, y, dir: DIRS.R };
    }
  for (let y = 1; y < ROWS - 1; y++)
    for (let x = 1; x < COLS - 1; x++) {
      if (passable(x, y)) return { x, y, dir: DIRS.R };
    }
  return { x: 1, y: 1, dir: DIRS.R };
}

function resetLevel(isNew = false) {
  makeGrid();
  wallHue = rnd(360);
  mines = [];
  explosions = [];
  const spawn = findSpawn();
  ghostBase = { x: COLS - 2, y: ROWS - 2 };
  // ajustar ghostBase si no es accesible
  if (!passable(ghostBase.x, ghostBase.y)) {
    outer: for (let y = ROWS - 2; y >= 1; y--)
      for (let x = COLS - 2; x >= 1; x--) {
        if (passable(x, y)) {
          ghostBase = { x, y };
          break outer;
        }
      }
  }
  placePellets(spawn, ghostBase);
  const c0 = tileCenter(spawn.x, spawn.y);
  pac = {
    x: c0.cx,
    y: c0.cy,
    cellX: spawn.x,
    cellY: spawn.y,
    targetX: passable(spawn.x + 1, spawn.y) ? spawn.x + 1 : spawn.x,
    targetY: spawn.y,
    dir: DIRS.R,
    next: DIRS.R,
    speed: TILE * 5.5,
    r: Math.max(4, Math.floor(TILE * 0.4)),
  };

  // Buscar 4 celdas libres distintas cerca del ghostBase para que cada fantasma arranque separado
  const ghostSpawns = findGhostSpawns(4);
  const ghostColors = ghostThemeColors();
  const ghostStartDirs = [DIRS.L, DIRS.U, DIRS.R, DIRS.D];
  ghosts = ghostColors.map((color, i) => mkGhost(color, ghostSpawns[i], ghostStartDirs[i]));

  frightMs = 0;
  ghosts.forEach((g) => (g.speed = ghostBaseSpeed));
  if (isNew) SFX.level();
  updateHUD();
}

// Devuelve n celdas PATH distintas cercanas al ghostBase (BFS en espiral)
function findGhostSpawns(n) {
  const found = [];
  const used = new Set();
  const bx = ghostBase.x,
    by = ghostBase.y;
  for (let r = 0; r <= Math.max(COLS, ROWS) && found.length < n; r++) {
    for (let dy = -r; dy <= r && found.length < n; dy++) {
      for (let dx = -r; dx <= r && found.length < n; dx++) {
        if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue; // solo borde del cuadrado
        const x = bx + dx,
          y = by + dy;
        const k = x + ',' + y;
        if (x >= 1 && x < COLS - 1 && y >= 1 && y < ROWS - 1 && passable(x, y) && !used.has(k)) {
          used.add(k);
          found.push({ x, y });
        }
      }
    }
  }
  // Completar con ghostBase si no hay suficientes
  while (found.length < n) found.push({ x: ghostBase.x, y: ghostBase.y });
  return found;
}

function mkGhost(color, spawnCell, startDir) {
  const c = tileCenter(spawnCell.x, spawnCell.y);
  let dir = startDir;
  if (!passable(spawnCell.x + dir.x, spawnCell.y + dir.y)) {
    const opts = nbDirs(spawnCell.x, spawnCell.y);
    if (opts.length) dir = opts[rnd(opts.length)];
  }
  return {
    x: c.cx,
    y: c.cy,
    cellX: spawnCell.x,
    cellY: spawnCell.y,
    targetX: spawnCell.x + dir.x,
    targetY: spawnCell.y + dir.y,
    color,
    dir,
    next: dir,
    speed: ghostBaseSpeed,
    r: Math.max(4, Math.floor(TILE * 0.42)),
    fright: false,
  };
}

/* ═══════════════════════════════════════════
   MOVIMIENTO
═══════════════════════════════════════════ */
function canMove(px, py, dx, dy, r) {
  const nx = px + dx,
    ny = py + dy;
  const x0 = Math.floor((nx - r) / TILE),
    x1 = Math.floor((nx + r) / TILE);
  const y0 = Math.floor((ny - r) / TILE),
    y1 = Math.floor((ny + r) / TILE);
  for (let ty = y0; ty <= y1; ty++)
    for (let tx = x0; tx <= x1; tx++) {
      if (ty < 0 || ty >= ROWS || tx < 0 || tx >= COLS) return false;
      if (grid[ty][tx] === WALL) {
        const cx2 = clamp(nx, tx * TILE, tx * TILE + TILE);
        const cy2 = clamp(ny, ty * TILE, ty * TILE + TILE);
        if ((nx - cx2) ** 2 + (ny - cy2) ** 2 <= r * r) return false;
      }
    }
  return true;
}

/* ═══════════════════════════════════════════
   MOVIMIENTO PAC-MAN (pixel-based)
═══════════════════════════════════════════ */
function stepPac(dt) {
  const sp = pac.speed * (dt / 1000);
  // Mover hacia el centro del tile destino (igual que fantasmas)
  const tc = tileCenter(pac.targetX, pac.targetY);
  const dx = tc.cx - pac.x,
    dy = tc.cy - pac.y;
  const dist = Math.hypot(dx, dy);

  if (dist <= sp) {
    // Llegó al centro del tile destino
    pac.x = tc.cx;
    pac.y = tc.cy;
    pac.cellX = pac.targetX;
    pac.cellY = pac.targetY;
    pacChooseNext();
  } else {
    pac.x += (dx / dist) * sp;
    pac.y += (dy / dist) * sp;
  }
}

function pacChooseNext() {
  const tx = pac.cellX,
    ty = pac.cellY;
  // Intentar la dirección pedida por el jugador primero
  if (pac.next && passable(tx + pac.next.x, ty + pac.next.y)) {
    pac.dir = pac.next;
  } else if (!passable(tx + pac.dir.x, ty + pac.dir.y)) {
    // Bloqueado en dirección actual y no hay dirección nueva válida — quedarse
    pac.targetX = tx;
    pac.targetY = ty;
    return;
  }
  pac.targetX = tx + pac.dir.x;
  pac.targetY = ty + pac.dir.y;
}

/* ═══════════════════════════════════════════
   MOVIMIENTO FANTASMAS — tile-by-tile robusto
   Cada fantasma mantiene: cellX,cellY (celda actual)
   y targetX,targetY (celda destino).
   Se mueve pixel a pixel hacia el centro del destino.
   Al llegar, elige el próximo destino con BFS o random.
═══════════════════════════════════════════ */
function ghostChooseNext(g) {
  const tx = g.cellX,
    ty = g.cellY;
  if (g.fright) {
    // Huida: aleatorio, sin U-turn
    const opts = nbDirs(tx, ty).filter((d) => !(d.x === -g.dir.x && d.y === -g.dir.y));
    const choices = opts.length ? opts : nbDirs(tx, ty);
    const d = choices[rnd(choices.length)];
    g.dir = d;
    g.targetX = tx + d.x;
    g.targetY = ty + d.y;
  } else {
    // Persecución: BFS hacia pac
    const ptx = Math.floor(pac.x / TILE),
      pty = Math.floor(pac.y / TILE);
    const d = bfs(tx, ty, ptx, pty);
    if (d && passable(tx + d.x, ty + d.y)) {
      g.dir = d;
      g.targetX = tx + d.x;
      g.targetY = ty + d.y;
    } else {
      // Sin ruta (mismo tile) — seguir o girar
      const opts = nbDirs(tx, ty);
      if (opts.length) {
        const d2 = opts[rnd(opts.length)];
        g.dir = d2;
        g.targetX = tx + d2.x;
        g.targetY = ty + d2.y;
      }
    }
  }
}

function stepGhost(g, dt) {
  const sp = g.speed * (dt / 1000);
  const tc = tileCenter(g.targetX, g.targetY);
  const dx = tc.cx - g.x,
    dy = tc.cy - g.y;
  const dist = Math.hypot(dx, dy);
  if (dist <= sp) {
    // Llegó al centro del destino
    g.x = tc.cx;
    g.y = tc.cy;
    g.cellX = g.targetX;
    g.cellY = g.targetY;
    ghostChooseNext(g);
  } else {
    g.x += (dx / dist) * sp;
    g.y += (dy / dist) * sp;
  }
}

/* BFS — devuelve dirección del primer paso hacia (tx,ty) desde (sx,sy) */
function bfs(sx, sy, tx, ty) {
  if (sx === tx && sy === ty) return null;
  const q = [[sx, sy]],
    seen = new Set([sx + ',' + sy]),
    prev = new Map();
  while (q.length) {
    const [x, y] = q.shift();
    for (const d of nbDirs(x, y)) {
      const nx = x + d.x,
        ny = y + d.y,
        k = nx + ',' + ny;
      if (!seen.has(k)) {
        seen.add(k);
        prev.set(k, [x, y]);
        if (nx === tx && ny === ty) {
          let cx = nx,
            cy = ny,
            pk = k;
          while (true) {
            const p = prev.get(pk);
            if (!p) break;
            if (p[0] === sx && p[1] === sy)
              return { x: Math.sign(cx - sx) || 0, y: Math.sign(cy - sy) || 0 };
            pk = p[0] + ',' + p[1];
            cx = p[0];
            cy = p[1];
          }
          return null;
        }
        q.push([nx, ny]);
      }
    }
  }
  return null;
}

/* ═══════════════════════════════════════════
   LÓGICA
═══════════════════════════════════════════ */
function eatDot() {
  const tx = Math.floor(pac.x / TILE),
    ty = Math.floor(pac.y / TILE);
  if (ty <= 0 || ty >= ROWS - 1 || tx <= 0 || tx >= COLS - 1) return;
  if (pellets[ty][tx] === 1) {
    pellets[ty][tx] = 0;
    addScore(10);
    eatenTotal++;
    SFX.eat();
    if (Math.floor(eatenTotal / 150) > extraLivesGiven) {
      lives++;
      extraLivesGiven++;
      SFX.life();
    }
  } else if (pellets[ty][tx] === 2) {
    pellets[ty][tx] = 0;
    addScore(50);
    frightMs = 6000;
    ghosts.forEach((g) => {
      g.fright = true;
    });
    addPopup(tx * TILE + TILE / 2, ty * TILE + TILE / 2, '+50');
    SFX.power();
  }
  updateHUD();
}

/** Envía a un fantasma de vuelta a la base (comido, ya sea por miedo o por un powerup). */
function zapGhost(g) {
  addScore(200);
  addPopup(g.x, g.y, '+200');
  SFX.eatGhost();
  const gsp = { x: ghostBase.x, y: ghostBase.y };
  const gc = tileCenter(gsp.x, gsp.y);
  g.x = gc.cx;
  g.y = gc.cy;
  g.cellX = gsp.x;
  g.cellY = gsp.y;
  const gopts = nbDirs(gsp.x, gsp.y);
  const gd = gopts.length ? gopts[rnd(gopts.length)] : DIRS.R;
  g.dir = gd;
  g.targetX = gsp.x + gd.x;
  g.targetY = gsp.y + gd.y;
  g.fright = false;
  updateHUD();
}

function checkCollide() {
  for (const g of ghosts) {
    if (Math.hypot(g.x - pac.x, g.y - pac.y) < g.r + pac.r - 2) {
      if (g.fright) {
        zapGhost(g);
      } else {
        die();
        return;
      }
    }
  }
}

function die() {
  lives--;
  SFX.die();
  updateHUD();
  gameState = 'dead';
  setTimeout(() => {
    if (lives <= 0) {
      showGameOver(score);
      score = 0;
      lives = 3;
      gameLevel = 1;
      eatenTotal = 0;
      extraLivesGiven = 0;
      scoreLifeGiven = 0;
      resetLevel(false);
      updateHUD();
      gameState = 'idle';
      return;
    } else {
      const sr = findSpawn();
      const s = tileCenter(sr.x, sr.y);
      pac.x = s.cx;
      pac.y = s.cy;
      pac.cellX = sr.x;
      pac.cellY = sr.y;
      pac.targetX = passable(sr.x + 1, sr.y) ? sr.x + 1 : sr.x;
      pac.targetY = sr.y;
      pac.dir = DIRS.R;
      pac.next = DIRS.R;
      // Desarmar las minas para no morir otra vez si hay una en la celda de reaparición
      mines.forEach((m) => (m.armed = false));
      // Re-spawn ghosts en celdas separadas
      const rs = findGhostSpawns(4);
      ghosts.forEach((g, i) => {
        const sp = rs[i] || { x: ghostBase.x, y: ghostBase.y };
        const c = tileCenter(sp.x, sp.y);
        g.x = c.cx;
        g.y = c.cy;
        g.cellX = sp.x;
        g.cellY = sp.y;
        const opts = nbDirs(sp.x, sp.y);
        const d = opts.length ? opts[rnd(opts.length)] : DIRS.R;
        g.dir = d;
        g.targetX = sp.x + d.x;
        g.targetY = sp.y + d.y;
        g.fright = false;
      });
    }
    gameState = 'playing';
  }, 900);
}

function allCleared() {
  for (let y = 1; y < ROWS - 1; y++)
    for (let x = 1; x < COLS - 1; x++) if (pellets[y][x]) return false;
  return true;
}

/* ═══════════════════════════════════════════
   POWERUPS (desbloqueables en la tienda)
═══════════════════════════════════════════ */
const POWERUP_COOLDOWN_MS = 20000;
let laserBeam = null; // { cells, life, age }
let teleportFx = null; // { x, y, life, age }
let mines = []; // { x, y } celdas del grid con una mina activa
let explosions = []; // { x, y, life, age } efectos visuales de explosión

/** Estado + configuración de cada powerup, para poder manejarlos de forma genérica
 *  (cooldown, visibilidad, ícono del botón, anillo de recarga). */
const powerupState = {
  laser: { sku: 'powerup_laser', btnId: 'laserBtn', icon: '🔫', until: 0 },
  teleport: { sku: 'powerup_teleport', btnId: 'teleportBtn', icon: '🌀', until: 0 },
  mine: { sku: 'powerup_mine', btnId: 'mineBtn', icon: '💣', until: 0 },
};

/** Dispara una línea recta en la dirección actual de Pac-Man hasta chocar con una pared,
 *  destruyendo a todos los fantasmas que estén sobre esa línea. */
function fireLaser() {
  const cells = [];
  let x = pac.cellX,
    y = pac.cellY;
  const d = pac.dir;
  while (true) {
    x += d.x;
    y += d.y;
    if (!passable(x, y)) break;
    cells.push({ x, y });
  }
  const onLine = new Set(cells.map((c) => c.x + ',' + c.y));
  for (const g of ghosts) {
    // Se compara tanto la celda "oficial" del fantasma como la celda real bajo su
    // posición en píxeles, para no perder fantasmas justo en mitad de un tramo.
    const gtx = Math.floor(g.x / TILE),
      gty = Math.floor(g.y / TILE);
    if (onLine.has(g.cellX + ',' + g.cellY) || onLine.has(gtx + ',' + gty)) zapGhost(g);
  }
  laserBeam = { cells, age: 0, life: 260 };
  SFX.laser();
}

/** Teletransporta a Pac-Man a una celda aleatoria transitable, lejos de los fantasmas. */
function teleportPacman() {
  const far = [];
  const any = [];
  for (let ty = 1; ty < ROWS - 1; ty++)
    for (let tx = 1; tx < COLS - 1; tx++) {
      if (!passable(tx, ty)) continue;
      any.push({ x: tx, y: ty });
      const nearGhost = ghosts.some((g) => Math.abs(g.cellX - tx) + Math.abs(g.cellY - ty) < 4);
      if (!nearGhost) far.push({ x: tx, y: ty });
    }
  const pool = far.length ? far : any;
  if (!pool.length) return;
  const dest = pool[rnd(pool.length)];
  const c = tileCenter(dest.x, dest.y);
  pac.x = c.cx;
  pac.y = c.cy;
  pac.cellX = dest.x;
  pac.cellY = dest.y;
  pac.targetX = dest.x;
  pac.targetY = dest.y;
  teleportFx = { x: c.cx, y: c.cy, age: 0, life: 320 };
  SFX.teleport();
}

/** Coloca una mina en la celda de Pac-Man. No puede dañarlo hasta que se aleje de ella. */
function placeMine() {
  mines.push({ x: pac.cellX, y: pac.cellY, armed: false });
  SFX.mineArm();
}

function explode(x, y) {
  explosions.push({ x, y, age: 0, life: 380 });
  SFX.explosion();
}

/** Revisa si Pac-Man o algún fantasma están sobre una mina y la detona. */
function checkMines() {
  if (gameState !== 'playing') return; // por si una mina y un fantasma coinciden en el mismo frame
  for (let i = mines.length - 1; i >= 0; i--) {
    const m = mines[i];
    const c = tileCenter(m.x, m.y);
    const pacOnMine = Math.hypot(pac.x - c.cx, pac.y - c.cy) < TILE * 0.4;
    if (!pacOnMine) m.armed = true;
    const pacHit = pacOnMine && m.armed;
    const hitGhosts = ghosts.filter((g) => Math.hypot(g.x - c.cx, g.y - c.cy) < TILE * 0.4);
    if (!pacHit && !hitGhosts.length) continue;
    explode(c.cx, c.cy);
    mines.splice(i, 1);
    hitGhosts.forEach((g) => zapGhost(g));
    if (pacHit) {
      die();
      return; // Pac-Man ya murió, no seguir revisando minas este frame
    }
  }
}

/** Activa un powerup si está desbloqueado y no está en cooldown. */
function tryUsePowerup(key, effectFn) {
  const st = powerupState[key];
  if (gameState !== 'playing' || !ownedSkus.has(st.sku)) return;
  const now = performance.now();
  if (now < st.until) return;
  st.until = now + POWERUP_COOLDOWN_MS;
  effectFn();
}

function tryFireLaser() {
  tryUsePowerup('laser', fireLaser);
}
function tryTeleport() {
  tryUsePowerup('teleport', teleportPacman);
}
function tryPlaceMine() {
  tryUsePowerup('mine', placeMine);
}

function refreshPowerupVisibility() {
  Object.values(powerupState).forEach((st) => {
    const btn = $(st.btnId);
    if (btn) btn.classList.toggle('hidden', !ownedSkus.has(st.sku));
  });
}

/** Actualiza el ícono, el deshabilitado, y el anillo de recarga (sentido horario) de cada botón. */
function updatePowerupButtons() {
  const now = performance.now();
  Object.values(powerupState).forEach((st) => {
    const btn = $(st.btnId);
    if (!btn || btn.classList.contains('hidden')) return;
    const remain = Math.max(0, st.until - now);
    const active = remain > 0;
    btn.disabled = active;
    btn.classList.toggle('cooling', active);
    const frac = active ? 1 - remain / POWERUP_COOLDOWN_MS : 1;
    btn.style.setProperty('--cd', frac.toFixed(3));
    const icon = btn.querySelector('.pw-icon');
    if (icon) icon.textContent = active ? String(Math.ceil(remain / 1000)) : st.icon;
  });
}

/* ═══════════════════════════════════════════
   HUD
═══════════════════════════════════════════ */
function updateHUD() {
  $('score').textContent = score;
  $('level').textContent = gameLevel;
  const wrap = $('lives-wrap');
  wrap.innerHTML = '';
  for (let i = 0; i < Math.min(lives, 6); i++) {
    const d = document.createElement('div');
    d.className = 'life-icon';
    wrap.appendChild(d);
  }
}

/* ═══════════════════════════════════════════
   DIBUJO
═══════════════════════════════════════════ */
// Wall style: neon-edged rounded tiles with a diagonal sheen
function drawMaze() {
  const theme = mazeThemeColors();

  ctx.fillStyle = theme ? theme.bg : '#000';
  ctx.fillRect(0, 0, cvs.width, cvs.height);

  const flat = !!(theme && theme.flat);
  const rad = flat ? 0 : Math.max(2, TILE * 0.22);

  // Paredes: gradiente con brillo (estilo neón) o relleno plano (estilo retro/claro)
  if (flat) {
    ctx.fillStyle = theme.dark;
  } else {
    const wallGrad = ctx.createLinearGradient(0, 0, cvs.width, cvs.height);
    wallGrad.addColorStop(0, theme ? theme.light : `hsl(${wallHue},72%,58%)`);
    wallGrad.addColorStop(1, theme ? theme.dark : `hsl(${wallHue},72%,32%)`);
    ctx.fillStyle = wallGrad;
  }
  for (let y = 0; y < ROWS; y++)
    for (let x = 0; x < COLS; x++) {
      if (grid[y][x] === WALL) {
        const px = x * TILE,
          py = y * TILE;
        ctx.beginPath();
        ctx.roundRect(px + 1, py + 1, TILE - 2, TILE - 2, rad);
        ctx.fill();
      }
    }

  // Borde de las paredes que dan a un pasillo: glow neón, o línea plana fina
  ctx.strokeStyle = theme ? (flat ? theme.light : theme.edge) : `hsla(${wallHue},95%,75%,.55)`;
  ctx.lineWidth = Math.max(1, TILE * (flat ? 0.05 : 0.06));
  for (let y = 0; y < ROWS; y++)
    for (let x = 0; x < COLS; x++) {
      if (
        grid[y][x] === WALL &&
        (passable(x, y - 1) || passable(x, y + 1) || passable(x - 1, y) || passable(x + 1, y))
      ) {
        const px = x * TILE,
          py = y * TILE;
        ctx.beginPath();
        ctx.roundRect(px + 1.5, py + 1.5, TILE - 3, TILE - 3, rad);
        ctx.stroke();
      }
    }

  // Pellets
  const pelletColor = theme && theme.pelletColor ? theme.pelletColor : '#FFE066';
  const pelletOutline = theme && theme.pelletColor ? shade(theme.pelletColor, -30) : '#B8860B';
  const powerColor = theme ? (flat ? theme.dark : theme.edge) : '#fff';
  const powerGlow = theme ? (flat ? theme.dark : theme.edge) : '#FFD700';
  for (let y = 1; y < ROWS - 1; y++)
    for (let x = 1; x < COLS - 1; x++) {
      const p = pellets[y][x];
      if (!p) continue;
      const cx = x * TILE + TILE / 2,
        cy = y * TILE + TILE / 2;
      if (p === 1) {
        const r2 = Math.max(1.4, TILE * 0.1);
        ctx.fillStyle = pelletColor;
        ctx.beginPath();
        ctx.arc(cx, cy, r2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = pelletOutline;
        ctx.lineWidth = Math.max(0.5, r2 * 0.25);
        ctx.stroke();
      } else if (p === 2) {
        // Power pellet con pulso
        const pulse = 0.75 + 0.25 * Math.sin(performance.now() / 220);
        const r3 = Math.max(2, TILE * 0.24) * pulse;
        ctx.fillStyle = powerColor;
        ctx.shadowColor = powerGlow;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(cx, cy, r3, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }
}

function drawPac() {
  const r = pac.r;
  const t = performance.now();
  const open = ((Math.sin(t / 120) + 1) / 2) * 0.42 * Math.PI;
  const d = pac.dir;
  let base = 0;
  if (d === DIRS.R) base = 0;
  else if (d === DIRS.L) base = Math.PI;
  else if (d === DIRS.U) base = 1.5 * Math.PI;
  else base = 0.5 * Math.PI;

  const pacBase = pacmanColor();
  const pacGrad = ctx.createRadialGradient(
    pac.x - r * 0.3,
    pac.y - r * 0.3,
    r * 0.1,
    pac.x,
    pac.y,
    r
  );
  pacGrad.addColorStop(0, shade(pacBase, 45));
  pacGrad.addColorStop(0.55, pacBase);
  pacGrad.addColorStop(1, shade(pacBase, -22));
  ctx.fillStyle = pacGrad;
  ctx.shadowColor = pacBase + 'aa';
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.moveTo(pac.x, pac.y);
  ctx.arc(pac.x, pac.y, r, base + open, base + 2 * Math.PI - open);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
}

function drawGhost(g) {
  const T = TILE,
    hT = T / 2;
  const x = g.x - hT,
    y = g.y - hT;
  const fright = g.fright;
  const flash = fright && frightMs < 2000 && Math.sin(performance.now() / 100) > 0;
  const bodyColor = flash ? '#fff' : fright ? '#1A6FFF' : g.color;

  if (fright) {
    ctx.fillStyle = bodyColor;
  } else {
    const bodyGrad = ctx.createLinearGradient(x, y, x, y + T);
    bodyGrad.addColorStop(0, shade(bodyColor, 30));
    bodyGrad.addColorStop(1, shade(bodyColor, -18));
    ctx.fillStyle = bodyGrad;
  }
  ctx.shadowColor = bodyColor + '88';
  ctx.shadowBlur = 6;
  ctx.beginPath();
  // Cuerpo superior redondeado
  ctx.arc(x + hT, y + T * 0.38, T * 0.38, Math.PI, 0, false);
  // Lado derecho
  ctx.lineTo(x + T * 0.95, y + T * 0.92);
  // Zigzag inferior
  const waves = 3;
  for (let i = waves; i >= 0; i--) {
    const px = x + T * (i / waves);
    ctx.lineTo(px, y + T * (i % 2 === 0 ? 0.92 : 0.72));
  }
  ctx.lineTo(x + T * 0.05, y + T * 0.92);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;

  // Ojos (si no está asustado)
  if (!fright) {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(x + T * 0.33, y + T * 0.36, T * 0.12, T * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + T * 0.65, y + T * 0.36, T * 0.12, T * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();
    const dx = g.dir.x * 0.04 * T,
      dy = g.dir.y * 0.04 * T;
    ctx.fillStyle = '#002288';
    ctx.beginPath();
    ctx.ellipse(x + T * 0.33 + dx, y + T * 0.36 + dy, T * 0.07, T * 0.09, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + T * 0.65 + dx, y + T * 0.36 + dy, T * 0.07, T * 0.09, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Cara asustada
    ctx.fillStyle = flash ? '#f00' : '#fff';
    ctx.beginPath();
    ctx.arc(x + T * 0.32, y + T * 0.4, T * 0.09, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + T * 0.65, y + T * 0.4, T * 0.09, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = flash ? '#f00' : '#fff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x + T * 0.22, y + T * 0.62);
    for (let i = 0; i < 4; i++) ctx.lineTo(x + T * (0.22 + i * 0.18), y + T * (i % 2 === 0 ? 0.56 : 0.68));
    ctx.lineTo(x + T * 0.78, y + T * 0.62);
    ctx.stroke();
  }
}

/* Score flash */
const popups = [];
function addPopup(x, y, text) {
  popups.push({ x, y, text, age: 0, life: 700 });
}
function drawPopups(dt) {
  for (let i = popups.length - 1; i >= 0; i--) {
    const p = popups[i];
    p.age += dt;
    if (p.age > p.life) {
      popups.splice(i, 1);
      continue;
    }
    const a = 1 - p.age / p.life;
    ctx.globalAlpha = a;
    ctx.fillStyle = '#FFE066';
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 6;
    ctx.font = `bold ${Math.max(9, TILE * 0.7)}px 'Courier New'`;
    ctx.textAlign = 'center';
    ctx.fillText(p.text, p.x, p.y - p.age * 0.04);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }
}

function drawLaser(dt) {
  if (!laserBeam) return;
  laserBeam.age += dt;
  if (laserBeam.age > laserBeam.life) {
    laserBeam = null;
    return;
  }
  const cells = laserBeam.cells;
  if (!cells.length) return;
  const a = 1 - laserBeam.age / laserBeam.life;
  const start = tileCenter(pac.cellX, pac.cellY);
  const last = cells[cells.length - 1];
  const end = tileCenter(last.x, last.y);
  ctx.globalAlpha = a;
  // Halo exterior
  ctx.strokeStyle = '#FF1A3C';
  ctx.shadowColor = '#FF1A3C';
  ctx.shadowBlur = 18;
  ctx.lineWidth = Math.max(3, TILE * 0.26);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(start.cx, start.cy);
  ctx.lineTo(end.cx, end.cy);
  ctx.stroke();
  // Núcleo brillante
  ctx.strokeStyle = '#FFE1E1';
  ctx.shadowBlur = 6;
  ctx.lineWidth = Math.max(1, TILE * 0.09);
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
}

function drawTeleportFx(dt) {
  if (!teleportFx) return;
  teleportFx.age += dt;
  if (teleportFx.age > teleportFx.life) {
    teleportFx = null;
    return;
  }
  const t = teleportFx.age / teleportFx.life;
  const r = TILE * (0.3 + t * 1.4);
  ctx.globalAlpha = 1 - t;
  ctx.strokeStyle = '#7FDBFF';
  ctx.shadowColor = '#7FDBFF';
  ctx.shadowBlur = 10;
  ctx.lineWidth = Math.max(1, TILE * 0.1);
  ctx.beginPath();
  ctx.arc(teleportFx.x, teleportFx.y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
}

function drawMines() {
  if (!mines.length) return;
  const pulse = 0.85 + 0.15 * Math.sin(performance.now() / 150);
  ctx.font = `${Math.max(10, TILE * 0.8 * pulse)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const m of mines) {
    const c = tileCenter(m.x, m.y);
    ctx.fillText('💣', c.cx, c.cy);
  }
}

function drawExplosions(dt) {
  for (let i = explosions.length - 1; i >= 0; i--) {
    const e = explosions[i];
    e.age += dt;
    if (e.age > e.life) {
      explosions.splice(i, 1);
      continue;
    }
    const t = e.age / e.life;
    const r = TILE * (0.2 + t * 1.7);
    ctx.globalAlpha = Math.max(0, 1 - t);
    const grad = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, r);
    grad.addColorStop(0, '#FFF3B0');
    grad.addColorStop(0.4, '#FF8A00');
    grad.addColorStop(1, 'rgba(255,40,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(e.x, e.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

/* ═══════════════════════════════════════════
   INPUT
═══════════════════════════════════════════ */
let controlMode = 'swipe';
let touchOrigin = null;
document.addEventListener(
  'touchstart',
  (e) => {
    initAudio();
    if (controlMode !== 'swipe') return;
    if (e.touches[0]) touchOrigin = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  },
  { passive: false }
);
document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
document.addEventListener(
  'touchend',
  (e) => {
    if (controlMode !== 'swipe' || !touchOrigin) return;
    const dx = e.changedTouches[0].clientX - touchOrigin.x;
    const dy = e.changedTouches[0].clientY - touchOrigin.y;
    if (Math.abs(dx) > Math.abs(dy)) {
      pac.next = dx > 0 ? DIRS.R : DIRS.L;
    } else {
      pac.next = dy > 0 ? DIRS.D : DIRS.U;
    }
    touchOrigin = null;
  },
  { passive: false }
);

/* Palanca arcade flotante: aparece donde el usuario toca el área de juego,
   se sigue mientras arrastra, y desaparece al soltar. */
const joystick = $('joystick');
const joyKnob = $('joystick-knob');
const stage = $('stage');
const JOY_MAX = 34;
let joyActive = false;
let joyCenter = { x: 0, y: 0 };

function joyReset() {
  joyKnob.style.transform = 'translate(-50%, -50%)';
}

function updateJoy(px, py) {
  const dx = px - joyCenter.x,
    dy = py - joyCenter.y;
  const dist = Math.hypot(dx, dy);
  const clamped = Math.min(dist, JOY_MAX);
  const angle = Math.atan2(dy, dx);
  const kx = Math.cos(angle) * clamped,
    ky = Math.sin(angle) * clamped;
  joyKnob.style.transform = `translate(calc(-50% + ${kx}px), calc(-50% + ${ky}px))`;
  if (dist < 10) return; // dead zone
  if (Math.abs(dx) > Math.abs(dy)) {
    pac.next = dx > 0 ? DIRS.R : DIRS.L;
  } else {
    pac.next = dy > 0 ? DIRS.D : DIRS.U;
  }
}

if (joystick && joyKnob && stage) {
  stage.addEventListener('pointerdown', (e) => {
    if (controlMode !== 'joystick') return;
    // No interceptar menú, tienda ni powerups: capturar el puntero les robaría el clic.
    if (e.target.closest('#overlay, #shop, .pw-btn')) return;
    initAudio();
    joyActive = true;
    try {
      stage.setPointerCapture(e.pointerId);
    } catch {
      // ignore: capture is a best-effort enhancement, not required to steer
    }
    joyCenter = { x: e.clientX, y: e.clientY };
    const rect = stage.getBoundingClientRect();
    joystick.style.left = e.clientX - rect.left + 'px';
    joystick.style.top = e.clientY - rect.top + 'px';
    joyReset();
    joystick.classList.remove('hidden');
    joystick.classList.add('pressed');
  });
  stage.addEventListener('pointermove', (e) => {
    if (!joyActive) return;
    updateJoy(e.clientX, e.clientY);
  });
  const endJoy = () => {
    if (!joyActive) return;
    joyActive = false;
    joyReset();
    joystick.classList.add('hidden');
    joystick.classList.remove('pressed');
  };
  stage.addEventListener('pointerup', endJoy);
  stage.addEventListener('pointercancel', endJoy);
}
document.addEventListener('keydown', (e) => {
  initAudio();
  const m = {
    ArrowUp: DIRS.U,
    ArrowDown: DIRS.D,
    ArrowLeft: DIRS.L,
    ArrowRight: DIRS.R,
    w: DIRS.U,
    s: DIRS.D,
    a: DIRS.L,
    d: DIRS.R,
    W: DIRS.U,
    S: DIRS.D,
    A: DIRS.L,
    D: DIRS.R,
  };
  if (m[e.key]) pac.next = m[e.key];
  if (e.key === 'q' || e.key === 'Q') tryFireLaser();
  if (e.key === 'e' || e.key === 'E') tryTeleport();
  if (e.key === 'r' || e.key === 'R') tryPlaceMine();
});

/* ═══════════════════════════════════════════
   INICIO / OVERLAY
═══════════════════════════════════════════ */
const overlay = $('overlay');
const overlayTitle = $('overlay-title');
const overlayScore = $('overlay-score');
const overlayHint = $('overlay-hint');
const DIFF_SPEEDS = { easy: TILE * 2.8, normal: TILE * 4.8, hard: TILE * 5.5 };
const CTRL_HINTS = {
  swipe: 'Desliza para moverte',
  joystick: 'Usa la palanca para moverte',
};
let selectedDiff = 'normal';

function showGameOver(finalScore) {
  if (overlayTitle) overlayTitle.textContent = 'GAME OVER';
  if (overlayScore) {
    overlayScore.textContent = `Puntuación: ${finalScore}`;
    overlayScore.style.display = 'block';
  }
  if (joystick) joystick.classList.add('hidden');
  overlay.style.display = 'flex';
}

document.querySelectorAll('.diff-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    initAudio();
    document.querySelectorAll('.diff-btn').forEach((b) => b.classList.remove('selected'));
    btn.classList.add('selected');
    selectedDiff = btn.dataset.diff;
  });
});

document.querySelectorAll('.ctrl-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    initAudio();
    document.querySelectorAll('.ctrl-btn').forEach((b) => b.classList.remove('selected'));
    btn.classList.add('selected');
    controlMode = btn.dataset.ctrl;
    if (overlayHint) overlayHint.textContent = CTRL_HINTS[controlMode] || '';
  });
});

const coffeeBtn = $('coffeeBtn');
if (coffeeBtn) {
  coffeeBtn.addEventListener('click', () => {
    window.open('https://www.buymeacoffee.com/bardock', '_blank', 'noopener');
  });
}

const laserBtnEl = $('laserBtn');
if (laserBtnEl) laserBtnEl.addEventListener('click', tryFireLaser);
const teleportBtnEl = $('teleportBtn');
if (teleportBtnEl) teleportBtnEl.addEventListener('click', tryTeleport);
const mineBtnEl = $('mineBtn');
if (mineBtnEl) mineBtnEl.addEventListener('click', tryPlaceMine);

/* ═══════════════════════════════════════════
   TIENDA — UI
═══════════════════════════════════════════ */
/** Dibuja un mini ícono de Pac-Man (boca abierta hacia la derecha) en el color dado. */
function drawPacPreview(canvas, hex) {
  const c2 = canvas.getContext('2d');
  const w = canvas.width,
    h = canvas.height;
  c2.clearRect(0, 0, w, h);
  const cx = w / 2,
    cy = h / 2,
    r = Math.min(w, h) * 0.36;
  const grad = c2.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.1, cx, cy, r);
  grad.addColorStop(0, shade(hex, 45));
  grad.addColorStop(0.55, hex);
  grad.addColorStop(1, shade(hex, -22));
  c2.fillStyle = grad;
  c2.shadowColor = hex + 'aa';
  c2.shadowBlur = 8;
  c2.beginPath();
  c2.moveTo(cx, cy);
  c2.arc(cx, cy, r, 0.26 * Math.PI, 1.74 * Math.PI);
  c2.closePath();
  c2.fill();
  c2.shadowBlur = 0;
}

/** Dibuja una fila de mini fantasmas, uno por color, para previsualizar un tema. */
function drawGhostThemePreview(canvas, colors) {
  const c2 = canvas.getContext('2d');
  const w = canvas.width,
    h = canvas.height;
  c2.clearRect(0, 0, w, h);
  const n = colors.length;
  const cellW = w / n;
  const T = Math.min(cellW, h) * 0.78;
  colors.forEach((color, i) => {
    const x = cellW * i + (cellW - T) / 2;
    const y = (h - T) / 2;
    c2.fillStyle = color;
    c2.shadowColor = color + '99';
    c2.shadowBlur = 5;
    c2.beginPath();
    c2.arc(x + T / 2, y + T * 0.38, T * 0.38, Math.PI, 0, false);
    c2.lineTo(x + T * 0.95, y + T * 0.92);
    const waves = 3;
    for (let k = waves; k >= 0; k--) {
      const px = x + T * (k / waves);
      c2.lineTo(px, y + T * (k % 2 === 0 ? 0.92 : 0.72));
    }
    c2.lineTo(x + T * 0.05, y + T * 0.92);
    c2.closePath();
    c2.fill();
  });
  c2.shadowBlur = 0;
}

/** Ilustración en CSS de una GameBoy DMG, para dejar clara la referencia de color. */
function makeGameboyDevice(screenColor) {
  const device = document.createElement('div');
  device.className = 'gb-device';
  const bezel = document.createElement('div');
  bezel.className = 'gb-device-bezel';
  const screen = document.createElement('div');
  screen.className = 'gb-device-screen';
  screen.style.background = screenColor;
  bezel.appendChild(screen);
  device.appendChild(bezel);
  const led = document.createElement('div');
  led.className = 'gb-device-led';
  device.appendChild(led);
  const dpad = document.createElement('div');
  dpad.className = 'gb-device-dpad';
  device.appendChild(dpad);
  const buttons = document.createElement('div');
  buttons.className = 'gb-device-buttons';
  buttons.appendChild(document.createElement('span'));
  buttons.appendChild(document.createElement('span'));
  device.appendChild(buttons);
  return device;
}

function makePreviewNode(p) {
  const cat = p.productMetadata && p.productMetadata.category;
  if (cat === 'pacman_skin') {
    const c = document.createElement('canvas');
    c.width = 64;
    c.height = 64;
    c.className = 'shop-preview-canvas';
    drawPacPreview(c, '#' + p.productMetadata.color);
    return c;
  }
  if (cat === 'ghost_theme') {
    const c = document.createElement('canvas');
    c.width = 110;
    c.height = 50;
    c.className = 'shop-preview-canvas';
    drawGhostThemePreview(
      c,
      p.productMetadata.colors.split(',').map((h) => '#' + h)
    );
    return c;
  }
  if (cat === 'maze_theme') {
    const m = p.productMetadata;
    if (p.sku === 'theme_maze_gameboy') return makeGameboyDevice(m.bg ? '#' + m.bg : '#9BBC0F');
    if (m.isDefault) {
      const sw = document.createElement('div');
      sw.className = 'shop-maze-swatch shop-maze-swatch-random';
      const dice = document.createElement('span');
      dice.className = 'shop-card-icon';
      dice.textContent = '🎲';
      sw.appendChild(dice);
      return sw;
    }
    const sw = document.createElement('div');
    sw.className = 'shop-maze-swatch';
    sw.style.background = m.bg ? '#' + m.bg : '#000';
    sw.style.borderColor = '#' + m.wallEdge;
    const block = document.createElement('div');
    block.className = 'shop-maze-swatch-block';
    block.style.background =
      m.wallStyle === 'flat'
        ? '#' + m.wallDark
        : `linear-gradient(135deg, #${m.wallLight}, #${m.wallDark})`;
    sw.appendChild(block);
    const dot = document.createElement('div');
    dot.className = 'shop-maze-swatch-dot';
    dot.style.background = m.pelletColor ? '#' + m.pelletColor : '#FFE066';
    sw.appendChild(dot);
    return sw;
  }
  const icon = document.createElement('span');
  icon.className = 'shop-card-icon';
  icon.textContent =
    p.sku === 'powerup_laser' ? '🔫' : p.sku === 'powerup_teleport' ? '🌀' : '💣';
  return icon;
}

function makeAction(p) {
  const isDefault = !!(p.productMetadata && p.productMetadata.isDefault);
  const cat = p.productMetadata && p.productMetadata.category;
  if (cat === 'pacman_skin' || cat === 'ghost_theme' || cat === 'maze_theme') {
    const current =
      cat === 'pacman_skin'
        ? selectedPacmanSkin
        : cat === 'ghost_theme'
          ? selectedGhostTheme
          : selectedMazeTheme;
    const isActive = isDefault ? current === null : current === p.sku;
    const btn = document.createElement('button');
    btn.className = 'shop-item-action shop-select-btn' + (isActive ? ' active' : '');
    btn.textContent = isActive ? '✓ Activo' : 'Usar';
    btn.addEventListener('click', () => {
      const value = isDefault ? null : p.sku;
      if (cat === 'pacman_skin') setSelectedPacmanSkin(value);
      else if (cat === 'ghost_theme') setSelectedGhostTheme(value);
      else setSelectedMazeTheme(value);
      renderShop();
    });
    return btn;
  }
  const tag = document.createElement('span');
  tag.className = 'shop-item-action shop-owned-tag';
  tag.textContent = '✓ Adquirido';
  return tag;
}

function makeCard(p) {
  const card = document.createElement('div');
  card.className = 'shop-card';
  const preview = document.createElement('div');
  preview.className = 'shop-card-preview';
  preview.appendChild(makePreviewNode(p));
  card.appendChild(preview);
  const nameEl = document.createElement('div');
  nameEl.className = 'shop-card-name';
  nameEl.textContent = p.name;
  card.appendChild(nameEl);
  const descEl = document.createElement('div');
  descEl.className = 'shop-card-desc';
  descEl.textContent = p.description;
  card.appendChild(descEl);
  const footer = document.createElement('div');
  footer.className = 'shop-card-footer';
  footer.appendChild(makeAction(p));
  card.appendChild(footer);
  return card;
}

function renderSection(title, products) {
  const frag = document.createDocumentFragment();
  if (!products.length) return frag;
  const h = document.createElement('div');
  h.className = 'shop-section-title';
  h.textContent = title;
  frag.appendChild(h);
  const grid = document.createElement('div');
  grid.className = 'shop-grid';
  for (const p of products) grid.appendChild(makeCard(p));
  frag.appendChild(grid);
  return frag;
}

function renderShop() {
  const body = $('shopBody');
  if (!body) return;
  body.innerHTML = '';
  const byCat = { pacman_skin: [], ghost_theme: [], maze_theme: [], powerup: [] };
  for (const p of DEFAULT_ITEMS) {
    const cat = p.productMetadata && p.productMetadata.category;
    if (byCat[cat]) byCat[cat].push(p);
  }
  for (const p of allProducts) {
    const cat = p.productMetadata && p.productMetadata.category;
    if (byCat[cat]) byCat[cat].push(p);
  }
  body.appendChild(renderSection('PAC-MAN', byCat.pacman_skin));
  body.appendChild(renderSection('FANTASMAS', byCat.ghost_theme));
  body.appendChild(renderSection('LABERINTO', byCat.maze_theme));
  body.appendChild(renderSection('POTENCIADORES', byCat.powerup));
}

function initShop() {
  // Sin tienda no habría forma de cambiar un tema guardado, así que se ignora sin borrarlo.
  if (SHOP_ENABLED) loadSelections();
  renderShop();
  refreshPowerupVisibility();
  applyGhostColors();
  applyPageTheme();
}

const shopBtn = $('shopBtn');
const shopPanel = $('shop');
if (shopBtn) shopBtn.hidden = !SHOP_ENABLED;
if (shopBtn && shopPanel) {
  shopBtn.addEventListener('click', () => {
    initAudio();
    renderShop();
    shopPanel.classList.remove('hidden');
  });
}
const shopCloseBtn = $('shopClose');
if (shopCloseBtn && shopPanel) {
  shopCloseBtn.addEventListener('click', () => shopPanel.classList.add('hidden'));
}

$('startBtn').addEventListener('click', () => {
  initAudio();
  if (AC) AC.resume();
  // Aplicar velocidad según dificultad
  const spd = DIFF_SPEEDS[selectedDiff] || DIFF_SPEEDS.normal;
  ghosts.forEach((g) => (g.speed = spd));
  ghostBaseSpeed = spd;
  overlay.style.display = 'none';
  gameState = 'playing';
  SFX.start();
});

/* ═══════════════════════════════════════════
   GAME LOOP
═══════════════════════════════════════════ */
let lastT = performance.now();

function gameLoop(now) {
  const dt = Math.min(now - lastT, 50); // cap a 50ms para evitar saltos
  lastT = now;

  if (gameState === 'playing') {
    // Fright timer
    if (frightMs > 0) {
      frightMs -= dt;
      if (frightMs <= 0) {
        frightMs = 0;
        ghosts.forEach((g) => (g.fright = false));
      }
    }

    stepPac(dt);
    eatDot();

    for (const g of ghosts) {
      stepGhost(g, dt);
    }

    checkCollide();
    checkMines();

    if (allCleared()) {
      gameLevel++;
      // Aumentar velocidad levemente
      resetLevel(true);
    }
  }

  // Dibujar siempre
  drawMaze();
  if (gameState !== 'idle') drawPac();
  for (const g of ghosts) drawGhost(g);
  drawPopups(dt);
  drawLaser(dt);
  drawTeleportFx(dt);
  drawMines();
  drawExplosions(dt);
  updatePowerupButtons();

  requestAnimationFrame(gameLoop);
}

/* ═══════════════════════════════════════════
   ARRANQUE
═══════════════════════════════════════════ */
resetLevel(false);
updateHUD();
initShop();
requestAnimationFrame((t) => {
  lastT = t;
  requestAnimationFrame(gameLoop);
});
