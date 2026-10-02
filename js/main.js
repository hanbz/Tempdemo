import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PROJECT, UNITS, COLUMN_TYPES, PING, unitPricing, unitStatus, STATUS_LABEL } from './units.js';
import { createMaterials, applyStyle, STYLES } from './materials.js';
import { buildUnit, WALL_H } from './unitModel.js';
import { buildWorld, buildTower, floorElevation, TOWER, STATUS_COLOR } from './exterior.js';

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const fmt = (n, d = 2) => n.toLocaleString('zh-TW', { minimumFractionDigits: d, maximumFractionDigits: d });

// ───────────────────────── 場景 ─────────────────────────
const stage = $('#stage');
const canvas = $('#scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(48, 1, 0.05, 2000);
camera.position.set(60, 40, -90);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.target.set(0, 24, 0);

const skyUniforms = { top: { value: new THREE.Color() }, bottom: { value: new THREE.Color() } };
const sky = new THREE.Mesh(
  new THREE.SphereGeometry(1200, 32, 16),
  new THREE.ShaderMaterial({
    uniforms: skyUniforms,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 bottom; varying vec3 vP; void main(){ float h = clamp(vP.y * 1.8 + 0.08, 0.0, 1.0); gl_FragColor = vec4(mix(bottom, top, h), 1.0);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}',
  }),
);
sky.renderOrder = -1;
scene.add(sky);
scene.fog = new THREE.Fog('#d6e8f5', 160, 900);

const hemi = new THREE.HemisphereLight('#dfefff', '#8a8270', 0.8);
scene.add(hemi);
const sun = new THREE.DirectionalLight('#fff4e5', 2.4);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.03;
scene.add(sun, sun.target);

const mats = createMaterials();
const world = buildWorld();
const tower = buildTower();
scene.add(world, tower.group);

const models = { A: buildUnit(UNITS.A, mats), B: buildUnit(UNITS.B, mats) };
const interior = new THREE.Group();
scene.add(interior);

const selGeo = new THREE.BoxGeometry(7.1, PROJECT.floorHeight - 0.1, TOWER.d + 0.2);
const selectionBox = new THREE.Group();
const selFill = new THREE.Mesh(selGeo, new THREE.MeshBasicMaterial({ color: '#f2b84b', transparent: true, opacity: 0.45, depthWrite: false }));
const selEdges = new THREE.LineSegments(new THREE.EdgesGeometry(selGeo), new THREE.LineBasicMaterial({ color: '#ffd27a' }));
selectionBox.add(selFill, selEdges);
tower.group.add(selectionBox);
const WARM = new THREE.Color('#ffc979');

const cursor = new THREE.Mesh(new THREE.RingGeometry(0.16, 0.22, 40), mats.cursor);
cursor.rotation.x = -Math.PI / 2;
cursor.visible = false;
scene.add(cursor);
const targetMark = new THREE.Mesh(new THREE.RingGeometry(0.1, 0.28, 40), mats.cursor.clone());
targetMark.rotation.x = -Math.PI / 2;
targetMark.visible = false;
scene.add(targetMark);

// ───────────────────────── 狀態 ─────────────────────────
const state = {
  mode: 'exterior',
  floor: 12,
  col: 0,
  style: 'modern',
  hour: 10,
  furniture: true,
  labels: true,
  wallH: 2.2,
  room: null,
};
let model = null;
let tween = null;
const walk = { pos: new THREE.Vector3(), yaw: 0, pitch: -0.08, target: null, keys: new Set() };
const pointer = new THREE.Vector2(9, 9);
let pointerDirty = false;
let hovered = null;
const raycaster = new THREE.Raycaster();

const currentType = () => COLUMN_TYPES[state.col];
const unitCode = (f = state.floor, c = state.col) => `${f}F-0${c + 1}`;

// ───────────────────────── 日照 ─────────────────────────
const C = (h) => new THREE.Color(h);
const SKY = {
  dayTop: C('#4d8dd6'), dayBottom: C('#d3e6f4'),
  duskTop: C('#3d5687'), duskBottom: C('#f0a874'),
  nightTop: C('#08122a'), nightBottom: C('#1d2a47'),
};
let night = 0;
const sunDir = new THREE.Vector3();

function applyTime(h) {
  state.hour = h;
  const t = (h - 6) / 12;
  const s = Math.sin(Math.PI * t);
  const day = smooth(-0.08, 0.3, s);
  const dusk = day > 0 ? (1 - smooth(0.1, 0.45, s)) * smooth(-0.1, 0.1, s) : 0;
  night = 1 - day;
  const elev = Math.max(0.06, s) * 1.15;
  const tc = clamp(t, 0, 1);
  sunDir.set(-Math.cos(Math.PI * tc) * Math.cos(elev), Math.sin(elev), -(0.35 + 0.45 * Math.sin(Math.PI * tc)) * Math.cos(elev)).normalize();

  sun.intensity = 2.7 * day;
  sun.color.set('#fff3e2').lerp(C('#ff9d5c'), dusk);
  hemi.intensity = 0.12 + 0.78 * day;
  hemi.color.set('#dfefff').lerp(C('#6c7fb0'), night);

  const top = SKY.nightTop.clone().lerp(SKY.dayTop, day).lerp(SKY.duskTop, dusk * 0.6);
  const bottom = SKY.nightBottom.clone().lerp(SKY.dayBottom, day).lerp(SKY.duskBottom, dusk);
  skyUniforms.top.value.copy(top);
  skyUniforms.bottom.value.copy(bottom);
  scene.fog.color.copy(bottom);

  for (const m of Object.values(models)) for (const l of m.lights) l.intensity = 9 * night;
  mats.lampShade.emissiveIntensity = 2.2 * night;
  mats.screen.emissiveIntensity = 0.4 + night;
  tower.units.forEach((u, i) => {
    const r = Math.sin(i * 91.7) * 0.5 + 0.5;
    const lit = r > 0.35 ? night * (0.25 + r * 0.45) : 0;
    u.material.emissive.copy(u.userData.baseColor).lerp(WARM, lit > 0 ? night : 0);
    u.material.emissiveIntensity = 0.32 * (1 - night) + lit;
  });
  renderer.toneMappingExposure = 1.0 + night * 0.25;
  placeSun();

  const hh = Math.floor(h), mm = Math.round((h - hh) * 60);
  const label = h < 12 ? '上午' : h < 18 ? '下午' : '晚上';
  const h12 = hh > 12 ? hh - 12 : hh;
  $('#timeValue').textContent = `${label} ${h12}:${String(mm).padStart(2, '0')}`;
}

function placeSun() {
  if (state.mode === 'exterior') {
    sun.target.position.set(0, 20, 0);
    sun.position.copy(sun.target.position).addScaledVector(sunDir, 150);
    setShadowBox(48, 300);
  } else if (model) {
    sun.target.position.copy(model.center);
    sun.position.copy(model.center).addScaledVector(sunDir, 60);
    setShadowBox(13, 140);
  }
}

function setShadowBox(r, far) {
  const c = sun.shadow.camera;
  c.left = c.bottom = -r;
  c.right = c.top = r;
  c.near = 1;
  c.far = far;
  c.updateProjectionMatrix();
}

// ───────────────────────── 模式切換 ─────────────────────────
const HINTS = {
  exterior: '拖曳旋轉・滾輪縮放・點選樓層查看各戶銷控',
  dollhouse: '拖曳旋轉・右鍵或雙指平移・點選房間聚焦',
  walk: '拖曳轉動視角・點擊地面前往・WASD／方向鍵行走',
  plan: '拖曳平移・滾輪縮放・點選房間查看尺寸',
};

function setMode(mode) {
  const prev = state.mode;
  state.mode = mode;
  $$('.modes button').forEach(b => b.setAttribute('aria-selected', String(b.dataset.mode === mode)));
  document.body.dataset.mode = mode;
  $('#hint').textContent = HINTS[mode];
  cursor.visible = false;
  targetMark.visible = false;
  walk.target = null;
  setHover(null);

  const isExt = mode === 'exterior';
  tower.group.visible = isExt;
  interior.visible = !isExt;
  controls.enabled = mode !== 'walk';
  controls.enableRotate = mode === 'exterior' || mode === 'dollhouse';
  controls.mouseButtons.LEFT = mode === 'plan' ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE;
  controls.touches.ONE = mode === 'plan' ? THREE.TOUCH.PAN : THREE.TOUCH.ROTATE;
  camera.fov = mode === 'walk' ? 70 : 48;
  camera.updateProjectionMatrix();

  if (isExt) {
    world.position.set(0, 0, 0);
    controls.minDistance = 25;
    controls.maxDistance = 260;
    controls.minPolarAngle = 0.15;
    controls.maxPolarAngle = 1.48;
    const sel = selectedTowerUnit();
    const target = new THREE.Vector3(0, Math.max(14, sel.position.y * 0.85), 0);
    if (prev !== 'exterior') camera.position.set(target.x + 70, target.y + 50, target.z - 110);
    flyTo(new THREE.Vector3(48, target.y + 18, -78), target, 1100);
  } else {
    loadInterior();
    const c = model.center;
    const span = Math.max(model.bounds.x1 - model.bounds.x0, model.bounds.z1 - model.bounds.z0);
    if (mode === 'dollhouse') {
      model.setWallHeight(state.wallH);
      controls.minDistance = 5;
      controls.maxDistance = 45;
      controls.minPolarAngle = 0.05;
      controls.maxPolarAngle = 1.4;
      if (prev === 'exterior' || prev === 'walk') camera.position.set(c.x - 25, 40, c.z - 40);
      flyTo(new THREE.Vector3(c.x - 6, span * 1.25, c.z - span * 1.05), c.clone(), 1300);
    } else if (mode === 'plan') {
      model.setWallHeight(1.05);
      controls.minDistance = 6;
      controls.maxDistance = 45;
      controls.minPolarAngle = 0;
      controls.maxPolarAngle = Math.PI;
      if (prev === 'walk') camera.position.set(c.x, 30, c.z - 0.01);
      flyTo(new THREE.Vector3(c.x, span * 1.85, c.z - 0.01), c.clone(), 1000);
    } else if (mode === 'walk') {
      model.setWallHeight(WALL_H);
      tween = null;
      const e = model.unit.entry;
      walk.pos.set(e.x, 0, e.z);
      walk.yaw = e.yaw;
      walk.pitch = -0.08;
      if (state.room) {
        const p = findFree(state.room.cx, state.room.cz);
        if (p) walk.pos.set(p.x, 0, p.z);
      }
    }
  }
  placeSun();
  buildLabels();
  drawMinimap();
}

function loadInterior() {
  const next = models[currentType()];
  if (model !== next) {
    interior.clear();
    model = next;
    interior.add(model.root);
    state.room = null;
    renderRoomList();
  }
  model.furniture.visible = state.furniture;
  // 讓周邊環境退到該樓層下方，窗景隨樓層改變
  const colX = -TOWER.w / 2 + 3.5 + state.col * 7;
  world.position.set(model.center.x - colX, -floorElevation(state.floor), model.center.z);
}

function selectedTowerUnit() {
  return tower.units.find(u => u.userData.floor === state.floor && u.userData.col === state.col);
}

function flyTo(pos, target, dur = 1000) {
  tween = { p0: camera.position.clone(), t0: controls.target.clone(), p1: pos, t1: target, start: performance.now(), dur };
}

// ───────────────────────── 選取戶別 ─────────────────────────
function selectUnit(floor, col) {
  const typeChanged = COLUMN_TYPES[col] !== currentType();
  state.floor = floor;
  state.col = col;
  const u = selectedTowerUnit();
  selectionBox.position.copy(u.position);
  renderPanel();
  if (state.mode !== 'exterior') {
    if (typeChanged) state.room = null;
    setMode(state.mode);
  }
}

function renderPanel() {
  const type = currentType();
  const unit = UNITS[type];
  const status = unitStatus(state.floor, state.col);
  const p = unitPricing(unit, state.floor, state.col);
  $('#unitCode').textContent = unitCode();
  $('#unitCodeHead').textContent = unitCode();
  $('#unitType').textContent = `${unit.name}・${unit.layout}`;
  $('#unitTagline').textContent = unit.tagline;
  const badge = $('#unitStatus');
  badge.textContent = STATUS_LABEL[status];
  badge.dataset.status = status;
  $('#floorSelect').value = String(state.floor);
  $$('#colPicker button').forEach((b) => {
    const c = Number(b.dataset.col);
    b.setAttribute('aria-pressed', String(c === state.col));
    b.dataset.status = unitStatus(state.floor, c);
  });
  $('#pMain').textContent = fmt(p.main);
  $('#pBalcony').textContent = fmt(p.balcony);
  $('#pPublic').textContent = fmt(p.pub);
  $('#pTotal').textContent = fmt(p.total);
  $('#pPerPing').textContent = fmt(p.perPing, 1);
  $('#pPrice').textContent = Math.round(p.price).toLocaleString('zh-TW');
  $('#miniPrice').textContent = `${Math.round(p.price).toLocaleString('zh-TW')} 萬`;
  $('#enterBtn').innerHTML = `進入 <b>${unitCode()}</b>・${unit.name} 3D 看屋`;
  if (!model || model.unit.id !== type) renderRoomList(unit);
}

function renderRoomList(unit = model?.unit) {
  if (!unit) return;
  const list = $('#roomList');
  list.innerHTML = '';
  for (const r of unit.rooms) {
    const w = r.x1 - r.x0, d = r.z1 - r.z0;
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.room = r.id;
    b.innerHTML = `<span class="rname">${r.name}</span><span class="rdim">${fmt(w, 1)} × ${fmt(d, 1)} m</span><span class="rping">${fmt((w * d) / PING, 1)} 坪</span>`;
    b.addEventListener('click', () => goRoom(r.id));
    li.appendChild(b);
    list.appendChild(li);
  }
  markActiveRoom();
}

function markActiveRoom() {
  $$('#roomList button').forEach(b => b.classList.toggle('active', b.dataset.room === state.room?.id));
  $$('.room-label').forEach(b => b.classList.toggle('active', b.dataset.room === state.room?.id));
}

function goRoom(id) {
  if (state.mode === 'exterior') {
    loadInterior();
    state.room = model.rooms.find(r => r.id === id);
    setMode('dollhouse');
    focusRoom(state.room);
    return;
  }
  focusRoom(model.rooms.find(r => r.id === id));
}

function focusRoom(room) {
  if (!room) return;
  state.room = room;
  markActiveRoom();
  const t = new THREE.Vector3(room.cx, 0, room.cz);
  if (state.mode === 'dollhouse') {
    const dir = camera.position.clone().sub(controls.target).normalize();
    if (dir.y < 0.5) dir.y = 0.5;
    dir.normalize();
    flyTo(t.clone().addScaledVector(dir, 8.5), t, 900);
  } else if (state.mode === 'plan') {
    flyTo(new THREE.Vector3(room.cx, 11, room.cz - 0.01), t, 800);
  } else if (state.mode === 'walk') {
    const p = findFree(room.cx, room.cz);
    if (p) { walk.pos.set(p.x, 0, p.z); walk.target = null; }
  }
}

// ───────────────────────── 房間標籤 ─────────────────────────
let labelEls = [];
function buildLabels() {
  const host = $('#labels');
  host.innerHTML = '';
  labelEls = [];
  if (!model || state.mode === 'exterior' || state.mode === 'walk') return;
  for (const r of model.rooms) {
    if (r.minor) continue;
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'room-label';
    el.dataset.room = r.id;
    el.innerHTML = `<b>${r.name}</b><span>${fmt(r.area / PING, 1)} 坪</span>`;
    el.addEventListener('click', () => focusRoom(r));
    host.appendChild(el);
    labelEls.push({ el, v: new THREE.Vector3(r.cx, 0.3, r.cz) });
  }
  markActiveRoom();
}

function updateLabels() {
  const show = state.labels && labelEls.length;
  $('#labels').hidden = !show;
  if (!show) return;
  const w = stage.clientWidth, h = stage.clientHeight;
  const p = new THREE.Vector3();
  for (const { el, v } of labelEls) {
    p.copy(v).project(camera);
    const vis = p.z < 1 && Math.abs(p.x) < 1.1 && Math.abs(p.y) < 1.1;
    el.style.opacity = vis ? '1' : '0';
    el.style.transform = `translate(-50%, -50%) translate(${(p.x * 0.5 + 0.5) * w}px, ${(-p.y * 0.5 + 0.5) * h}px)`;
  }
}

// ───────────────────────── 室內漫遊 ─────────────────────────
const PLAYER_R = 0.24;
function collides(x, z) {
  const { segments, boxes } = model.colliders;
  for (const s of segments) {
    const vx = s.x2 - s.x1, vz = s.z2 - s.z1;
    const len2 = vx * vx + vz * vz;
    const k = len2 ? clamp(((x - s.x1) * vx + (z - s.z1) * vz) / len2, 0, 1) : 0;
    const dx = x - (s.x1 + vx * k), dz = z - (s.z1 + vz * k);
    if (dx * dx + dz * dz < (PLAYER_R + s.t / 2) ** 2) return true;
  }
  if (state.furniture) {
    const m = PLAYER_R * 0.5;
    for (const b of boxes) if (x > b.minX - m && x < b.maxX + m && z > b.minZ - m && z < b.maxZ + m) return true;
  }
  return false;
}

function tryMove(dx, dz) {
  const p = walk.pos;
  if (!collides(p.x + dx, p.z + dz)) { p.x += dx; p.z += dz; return true; }
  let moved = false;
  if (Math.abs(dx) > 1e-4 && !collides(p.x + dx, p.z)) { p.x += dx; moved = true; }
  if (Math.abs(dz) > 1e-4 && !collides(p.x, p.z + dz)) { p.z += dz; moved = true; }
  return moved;
}

function findFree(x, z) {
  if (!collides(x, z)) return { x, z };
  for (let r = 0.2; r < 2; r += 0.2) {
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
      const px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r;
      if (!collides(px, pz)) return { x: px, z: pz };
    }
  }
  return null;
}

function updateWalk(dt) {
  const k = walk.keys;
  const fx = -Math.sin(walk.yaw), fz = -Math.cos(walk.yaw);
  let mx = 0, mz = 0;
  if (k.has('KeyW') || k.has('ArrowUp')) { mx += fx; mz += fz; }
  if (k.has('KeyS') || k.has('ArrowDown')) { mx -= fx; mz -= fz; }
  if (k.has('KeyA')) { mx += fz; mz -= fx; }
  if (k.has('KeyD')) { mx -= fz; mz += fx; }
  if (k.has('ArrowLeft') || k.has('KeyQ')) walk.yaw += 1.7 * dt;
  if (k.has('ArrowRight') || k.has('KeyE')) walk.yaw -= 1.7 * dt;
  const len = Math.hypot(mx, mz);
  if (len > 0) {
    walk.target = null;
    tryMove((mx / len) * 2.2 * dt, (mz / len) * 2.2 * dt);
  } else if (walk.target) {
    const dx = walk.target.x - walk.pos.x, dz = walk.target.z - walk.pos.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.04) walk.target = null;
    else {
      const step = Math.min(d, 2.6 * dt);
      if (!tryMove((dx / d) * step, (dz / d) * step)) walk.target = null;
    }
  }
  targetMark.visible = !!walk.target;
  if (walk.target) {
    targetMark.position.set(walk.target.x, 0.02, walk.target.z);
    targetMark.material.opacity = 0.5 + 0.3 * Math.sin(performance.now() / 150);
  }
  camera.position.set(walk.pos.x, 1.58, walk.pos.z);
  camera.rotation.set(walk.pitch, walk.yaw, 0, 'YXZ');
}

// ───────────────────────── 滑鼠與觸控 ─────────────────────────
let drag = null;
canvas.addEventListener('pointerdown', (e) => {
  drag = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now(), moved: false };
  if (state.mode === 'walk') canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  const r = canvas.getBoundingClientRect();
  pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  pointerDirty = true;
  moveTooltip(e.clientX - r.left, e.clientY - r.top);
  if (!drag) return;
  if (Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 6) drag.moved = true;
  if (state.mode === 'walk') {
    walk.yaw += (e.clientX - drag.x) * 0.0042;
    walk.pitch = clamp(walk.pitch + (e.clientY - drag.y) * 0.0042, -1.2, 1.2);
  }
  drag.x = e.clientX;
  drag.y = e.clientY;
});
canvas.addEventListener('pointerup', (e) => {
  if (drag && !drag.moved && performance.now() - drag.t < 450) handleClick();
  drag = null;
});
canvas.addEventListener('pointerleave', () => { pointer.set(9, 9); pointerDirty = true; });

window.addEventListener('keydown', (e) => {
  if (e.target.closest('input, select, textarea, dialog')) return;
  if (state.mode !== 'walk') return;
  if (/^(Key[WASDQE]|Arrow)/.test(e.code)) { walk.keys.add(e.code); e.preventDefault(); }
});
window.addEventListener('keyup', (e) => walk.keys.delete(e.code));
window.addEventListener('blur', () => walk.keys.clear());

function pick(objects, recursive = false) {
  raycaster.setFromCamera(pointer, camera);
  return raycaster.intersectObjects(objects, recursive)[0] || null;
}

function handleClick() {
  if (state.mode === 'exterior') {
    const hit = pick(tower.units);
    if (hit) selectUnit(hit.object.userData.floor, hit.object.userData.col);
    return;
  }
  const hit = pick([model.root], true);
  const room = hit?.object.userData.room;
  if (!room) return;
  if (state.mode === 'walk') {
    const p = hit.point;
    if (!collides(p.x, p.z)) walk.target = { x: p.x, z: p.z };
  } else {
    focusRoom(model.rooms.find(r => r.id === room.id));
  }
}

function updateHover() {
  if (!pointerDirty) return;
  pointerDirty = false;
  if (state.mode === 'exterior') {
    const hit = drag?.moved ? null : pick(tower.units);
    setHover(hit?.object || null);
  } else if (state.mode === 'walk') {
    const hit = drag?.moved ? null : pick([model.root], true);
    const ok = hit?.object.userData.room && !collides(hit.point.x, hit.point.z);
    cursor.visible = !!ok;
    if (ok) cursor.position.set(hit.point.x, hit.point.y + 0.015, hit.point.z);
  }
}

function setHover(obj) {
  if (hovered === obj) return;
  if (hovered) hovered.material.color.copy(hovered.userData.baseColor);
  hovered = obj;
  const tip = $('#tooltip');
  canvas.style.cursor = obj ? 'pointer' : '';
  if (!obj) { tip.hidden = true; return; }
  obj.material.color.copy(obj.userData.baseColor).offsetHSL(0, 0.05, 0.16);
  const { floor, col, type, status } = obj.userData;
  const unit = UNITS[type];
  const p = unitPricing(unit, floor, col);
  tip.innerHTML = `<div class="tip-head"><b>${unitCode(floor, col)}</b><span class="status" data-status="${status}">${STATUS_LABEL[status]}</span></div>
    <div>${unit.name}・${unit.layout}</div>
    <div class="tip-num">權狀 ${fmt(p.total, 1)} 坪・約 ${Math.round(p.price).toLocaleString('zh-TW')} 萬</div>`;
  tip.hidden = false;
}

function moveTooltip(x, y) {
  const tip = $('#tooltip');
  const w = stage.clientWidth;
  const left = x + 16 + 230 > w ? x - 16 - 230 : x + 16;
  tip.style.transform = `translate(${left}px, ${y + 14}px)`;
}

// ───────────────────────── 小地圖 ─────────────────────────
const mini = $('#minimap');
const mctx = mini.getContext('2d');
let miniXf = null;

function drawMinimap() {
  if (!model || state.mode === 'exterior') return;
  const dpr = Math.min(window.devicePixelRatio, 2);
  const cw = mini.clientWidth, ch = mini.clientHeight;
  if (mini.width !== cw * dpr) { mini.width = cw * dpr; mini.height = ch * dpr; }
  const b = model.bounds;
  const pad = 12;
  const s = Math.min((cw - pad * 2) / (b.x1 - b.x0), (ch - pad * 2) / (b.z1 - b.z0));
  const ox = (cw - (b.x1 - b.x0) * s) / 2, oy = (ch - (b.z1 - b.z0) * s) / 2;
  // 與 3D 俯視方向一致：+x 在左、+z 在上
  const X = (x) => ox + (b.x1 - x) * s;
  const Y = (z) => oy + (b.z1 - z) * s;
  miniXf = { X, Y, s, inv: (px, py) => ({ x: b.x1 - (px - ox) / s, z: b.z1 - (py - oy) / s }) };
  const css = getComputedStyle(document.documentElement);
  const g = mctx;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, cw, ch);
  for (const r of model.rooms) {
    const active = state.room?.id === r.id;
    g.fillStyle = active ? css.getPropertyValue('--map-active') : r.outdoor ? css.getPropertyValue('--map-outdoor') : css.getPropertyValue('--map-room');
    g.fillRect(X(r.x1), Y(r.z1), (r.x1 - r.x0) * s, (r.z1 - r.z0) * s);
  }
  g.strokeStyle = css.getPropertyValue('--map-wall');
  g.lineCap = 'square';
  for (const seg of model.colliders.segments) {
    g.lineWidth = Math.max(1.2, seg.t * s);
    g.beginPath();
    g.moveTo(X(seg.x1), Y(seg.z1));
    g.lineTo(X(seg.x2), Y(seg.z2));
    g.stroke();
  }
  g.fillStyle = css.getPropertyValue('--map-text');
  g.font = '600 10px "Noto Sans TC", system-ui, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  for (const r of model.rooms) if (!r.minor && (r.x1 - r.x0) * s > 30) g.fillText(r.name.split('・')[0], X(r.cx), Y(r.cz));

  let px, pz, yaw = null;
  if (state.mode === 'walk') { px = walk.pos.x; pz = walk.pos.z; yaw = walk.yaw; }
  else { px = controls.target.x; pz = controls.target.z; }
  const cx = X(px), cy = Y(pz);
  const accent = css.getPropertyValue('--accent');
  if (yaw !== null) {
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
    const a = Math.atan2(-fz, -fx);
    const grad = g.createRadialGradient(cx, cy, 2, cx, cy, 34);
    grad.addColorStop(0, accent);
    grad.addColorStop(1, 'transparent');
    g.fillStyle = grad;
    g.globalAlpha = 0.55;
    g.beginPath();
    g.moveTo(cx, cy);
    g.arc(cx, cy, 34, a - 0.6, a + 0.6);
    g.closePath();
    g.fill();
    g.globalAlpha = 1;
  }
  g.fillStyle = accent;
  g.strokeStyle = '#fff';
  g.lineWidth = 2;
  g.beginPath();
  g.arc(cx, cy, 5, 0, Math.PI * 2);
  g.fill();
  g.stroke();
}

mini.addEventListener('click', (e) => {
  if (!miniXf || !model) return;
  const r = mini.getBoundingClientRect();
  const p = miniXf.inv(e.clientX - r.left, e.clientY - r.top);
  const room = model.rooms.find(rm => p.x >= rm.x0 && p.x <= rm.x1 && p.z >= rm.z0 && p.z <= rm.z1);
  if (state.mode === 'walk') {
    const f = findFree(p.x, p.z);
    if (f && room) { walk.pos.set(f.x, 0, f.z); walk.target = null; }
  } else if (room) {
    focusRoom(room);
  }
});

// ───────────────────────── 面板控制 ─────────────────────────
function initUI() {
  $('#projectName').textContent = PROJECT.name;
  const sel = $('#floorSelect');
  for (let f = PROJECT.floors; f >= 2; f--) {
    const o = document.createElement('option');
    o.value = String(f);
    o.textContent = `${f} 樓`;
    sel.appendChild(o);
  }
  sel.addEventListener('change', () => selectUnit(Number(sel.value), state.col));
  $$('#colPicker button').forEach(b => b.addEventListener('click', () => selectUnit(state.floor, Number(b.dataset.col))));
  $$('.modes button').forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
  $('#enterBtn').addEventListener('click', () => setMode('dollhouse'));

  const sw = $('#styleSwatches');
  for (const [key, s] of Object.entries(STYLES)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.style = key;
    b.innerHTML = `<span class="chips"><i style="background:${s.wall}"></i><i style="background:${s.wood}"></i><i style="background:${s.accent}"></i></span>${s.name}`;
    b.addEventListener('click', () => setStyle(key));
    sw.appendChild(b);
  }

  $('#toggleFurniture').addEventListener('change', (e) => {
    state.furniture = e.target.checked;
    if (model) model.furniture.visible = state.furniture;
  });
  $('#toggleLabels').addEventListener('change', (e) => { state.labels = e.target.checked; });
  $('#wallRange').addEventListener('input', (e) => {
    state.wallH = Number(e.target.value);
    $('#wallValue').textContent = state.wallH >= WALL_H ? '完整' : `${fmt(state.wallH, 1)} m`;
    if (state.mode === 'dollhouse') model.setWallHeight(state.wallH);
  });
  $('#timeRange').addEventListener('input', (e) => applyTime(Number(e.target.value)));

  $('#panelToggle').addEventListener('click', () => {
    const open = document.body.classList.toggle('panel-open');
    $('#panelToggle').setAttribute('aria-expanded', String(open));
  });

  const dlg = $('#bookDialog');
  $('#bookBtn').addEventListener('click', () => {
    $('#bookUnit').textContent = `${unitCode()}・${UNITS[currentType()].name}`;
    dlg.showModal();
  });
  $('#bookCancel').addEventListener('click', () => dlg.close());
  $('#bookForm').addEventListener('submit', (e) => {
    e.preventDefault();
    dlg.close();
    toast(`已登記 ${unitCode()} 的賞屋時段（展示用，資料不會送出）`);
    e.target.reset();
  });
}

function setStyle(key) {
  state.style = key;
  applyStyle(mats, key);
  $$('#styleSwatches button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.style === key)));
}

let toastTimer = 0;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 3200);
}

// ───────────────────────── 主迴圈 ─────────────────────────
function resize() {
  const w = stage.clientWidth, h = stage.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  drawMinimap();
}
window.addEventListener('resize', resize);

const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
let last = performance.now();
let frame = 0;
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (state.mode === 'walk') {
    updateWalk(dt);
  } else {
    if (tween) {
      const k = clamp((now - tween.start) / tween.dur, 0, 1);
      const e = ease(k);
      camera.position.lerpVectors(tween.p0, tween.p1, e);
      controls.target.lerpVectors(tween.t0, tween.t1, e);
      if (k >= 1) tween = null;
    }
    controls.update();
  }
  if (state.mode === 'exterior') {
    selFill.material.opacity = 0.35 + 0.2 * Math.sin(now / 260);
  }
  updateHover();
  sky.position.copy(camera.position);
  renderer.render(scene, camera);
  updateLabels();
  if (state.mode !== 'exterior' && (frame++ % 3 === 0)) drawMinimap();
  requestAnimationFrame(loop);
}

initUI();
setStyle(state.style);
applyTime(state.hour);
selectUnit(state.floor, state.col);
resize();
setMode(location.hash === '#walk' ? 'walk' : location.hash === '#plan' ? 'plan' : location.hash === '#dollhouse' ? 'dollhouse' : 'exterior');
requestAnimationFrame((t) => {
  last = t;
  loop(t);
  $('#loading').hidden = true;
});
