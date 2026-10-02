import * as THREE from 'three';
import { buildFurniture } from './furniture.js';
import { roomArea } from './units.js';

export const WALL_H = 2.8;

const OPENING = {
  door: { sill: 0, h: 2.1 },
  slide: { sill: 0, h: 2.35 },
  window: { sill: 0.9, h: 1.45 },
  high: { sill: 1.55, h: 0.6 },
};

function addBox(parent, w, h, d, mat, x, y, z, shadow = true) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = shadow;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

// 建立一戶的 3D 模型：地板、牆面（可指定剖面高度）、家具、室內燈光與碰撞資料
export function buildUnit(unit, mats) {
  const root = new THREE.Group();
  root.name = `unit-${unit.id}`;

  const xs = unit.rooms.flatMap(r => [r.x0, r.x1]);
  const zs = unit.rooms.flatMap(r => [r.z0, r.z1]);
  const bounds = { x0: Math.min(...xs), x1: Math.max(...xs), z0: Math.min(...zs), z1: Math.max(...zs) };
  const center = new THREE.Vector3((bounds.x0 + bounds.x1) / 2, 0, (bounds.z0 + bounds.z1) / 2);

  // 樓板
  addBox(root, bounds.x1 - bounds.x0 + 0.6, 0.32, bounds.z1 - bounds.z0 + 0.6, mats.slab,
    center.x, -0.16, center.z, false);

  // 地板與天花板
  const floors = [];
  const lights = [];
  for (const r of unit.rooms) {
    const w = r.x1 - r.x0, d = r.z1 - r.z0;
    const mat = r.floor === 'tile' ? mats.floorTile : r.floor === 'outdoor' ? mats.floorOutdoor : mats.floorWood;
    const geo = new THREE.PlaneGeometry(w, d);
    const meters = mat.map.userData.meters;
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / meters, uv.getY(i) * d / meters);
    const f = new THREE.Mesh(geo, mat);
    f.rotation.x = -Math.PI / 2;
    f.position.set((r.x0 + r.x1) / 2, r.outdoor ? -0.04 : 0.005, (r.z0 + r.z1) / 2);
    f.receiveShadow = true;
    f.userData.room = r;
    root.add(f);
    floors.push(f);

    if (!r.outdoor) {
      const c = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mats.ceiling);
      c.rotation.x = Math.PI / 2; // 法線朝下，從上方鳥瞰時會被背面剔除
      c.position.set((r.x0 + r.x1) / 2, WALL_H, (r.z0 + r.z1) / 2);
      c.userData.ceiling = true;
      root.add(c);
    }
    if (!r.minor && !r.outdoor) {
      const l = new THREE.PointLight('#ffd6a3', 0, Math.max(w, d) * 1.8, 1.2);
      l.position.set((r.x0 + r.x1) / 2, WALL_H - 0.35, (r.z0 + r.z1) / 2);
      root.add(l);
      lights.push(l);
    }
  }

  // 陽台欄杆
  const segments = [];
  if (unit.balcony) {
    const { x0, x1, z0 } = unit.balcony;
    const rail = new THREE.Group();
    const runs = [[x0, z0, x1, z0], [x0, z0, x0, 0], [x1, z0, x1, 0]];
    for (const [ax, az, bx, bz] of runs) {
      const len = Math.hypot(bx - ax, bz - az);
      const g = new THREE.Group();
      g.position.set(ax, 0, az);
      g.rotation.y = -Math.atan2(bz - az, bx - ax);
      addBox(g, len, 1.0, 0.02, mats.glass, len / 2, 0.55, 0, false);
      addBox(g, len, 0.05, 0.07, mats.frame, len / 2, 1.08, 0);
      addBox(g, len, 0.05, 0.05, mats.frame, len / 2, 0.03, 0);
      rail.add(g);
      segments.push({ x1: ax, z1: az, x2: bx, z2: bz, t: 0.06 });
    }
    root.add(rail);
  }

  // 牆（可重建）
  const wallGroup = new THREE.Group();
  root.add(wallGroup);
  for (const w of unit.walls) segments.push(...wallColliders(w));

  // 家具
  const furniture = new THREE.Group();
  root.add(furniture);
  const boxes = [];
  const shades = [];
  root.updateMatrixWorld(true);
  for (const item of unit.furniture) {
    const g = buildFurniture(item, mats);
    if (!g) continue;
    furniture.add(g);
    g.updateMatrixWorld(true);
    if (!g.userData.noCollide) {
      const b = new THREE.Box3().setFromObject(g);
      if (b.max.y > 0.3) boxes.push({ minX: b.min.x, maxX: b.max.x, minZ: b.min.z, maxZ: b.max.z });
    }
  }

  const model = {
    unit, root, floors, lights, furniture, bounds, center,
    colliders: { segments, boxes },
    cut: WALL_H,
    setWallHeight(h) {
      this.cut = h;
      for (const c of [...wallGroup.children]) {
        c.traverse(o => o.geometry && o.geometry.dispose());
        wallGroup.remove(c);
      }
      for (const w of unit.walls) wallGroup.add(buildWall(w, mats, h));
      root.traverse(o => { if (o.userData.ceiling) o.visible = h >= WALL_H; });
    },
    rooms: unit.rooms.map(r => ({
      ...r,
      cx: (r.x0 + r.x1) / 2,
      cz: (r.z0 + r.z1) / 2,
      area: roomArea(r),
    })),
  };
  model.setWallHeight(WALL_H);
  return model;
}

function openingsOf(w) {
  return (w.openings || [])
    .map(o => ({ ...OPENING[o.type], ...o, s: o.c - o.w / 2, e: o.c + o.w / 2 }))
    .sort((a, b) => a.s - b.s);
}

function wallFrame(w) {
  const [ax, az] = w.a, [bx, bz] = w.b;
  const L = Math.hypot(bx - ax, bz - az);
  return { ax, az, dx: (bx - ax) / L, dz: (bz - az) / L, L, t: w.ext ? 0.2 : 0.12, ang: Math.atan2(bz - az, bx - ax) };
}

// 可通行的開口（門、落地窗開啟的一半）以外都算牆
function wallColliders(w) {
  const f = wallFrame(w);
  const ext = w.ext ? f.t / 2 : 0;
  const gaps = openingsOf(w)
    .filter(o => o.type === 'door' || o.type === 'slide')
    .map(o => (o.type === 'slide' ? [o.s + o.w / 2, o.e] : [o.s, o.e]));
  const out = [];
  let cur = -ext;
  const push = (s, e) => {
    if (e - s < 0.01) return;
    out.push({ x1: f.ax + f.dx * s, z1: f.az + f.dz * s, x2: f.ax + f.dx * e, z2: f.az + f.dz * e, t: f.t });
  };
  for (const [s, e] of gaps) { push(cur, s); cur = e; }
  push(cur, f.L + ext);
  return out;
}

function buildWall(w, mats, cutH) {
  const f = wallFrame(w);
  const g = new THREE.Group();
  g.position.set(f.ax, 0, f.az);
  g.rotation.y = -f.ang;
  const ext = w.ext ? f.t / 2 : 0;
  const cutMats = [mats.wall, mats.wall, mats.wallCut, mats.wall, mats.wall, mats.wall];

  const seg = (s, e, y0, y1) => {
    y1 = Math.min(y1, cutH);
    if (e - s < 0.005 || y1 - y0 < 0.005) return;
    const isCut = y1 < WALL_H - 0.001;
    const m = new THREE.Mesh(new THREE.BoxGeometry(e - s, y1 - y0, f.t), isCut ? cutMats : mats.wall);
    m.position.set((s + e) / 2, (y0 + y1) / 2, 0);
    m.castShadow = m.receiveShadow = true;
    g.add(m);
  };
  const trim = (wd, h, x, y, z = 0, d = f.t * 0.7) => {
    if (y - h / 2 >= cutH) return;
    const top = Math.min(y + h / 2, cutH);
    const bot = y - h / 2;
    addBox(g, wd, top - bot, d, mats.frame, x, (top + bot) / 2, z, false);
  };
  const glass = (s, e, y0, y1, z = 0) => {
    y1 = Math.min(y1, cutH);
    if (y1 - y0 < 0.01) return;
    addBox(g, e - s, y1 - y0, 0.02, mats.glass, (s + e) / 2, (y0 + y1) / 2, z, false);
  };

  let cur = -ext;
  for (const o of openingsOf(w)) {
    seg(cur, o.s, 0, WALL_H);
    if (o.sill > 0) seg(o.s, o.e, 0, o.sill);
    seg(o.s, o.e, o.sill + o.h, WALL_H);
    const top = o.sill + o.h;
    if (o.type === 'window' || o.type === 'high') {
      glass(o.s, o.e, o.sill, top);
      trim(o.w, 0.05, o.c, o.sill + 0.025);
      trim(o.w, 0.05, o.c, top - 0.025);
      trim(0.05, o.h, o.s + 0.025, o.sill + o.h / 2);
      trim(0.05, o.h, o.e - 0.025, o.sill + o.h / 2);
      if (o.w > 1.3) trim(0.04, o.h, o.c, o.sill + o.h / 2);
    } else if (o.type === 'slide') {
      // 兩片落地玻璃門疊在左半邊（開啟狀態）
      const half = o.s + o.w / 2 + 0.05;
      for (const z of [-0.035, 0.035]) {
        glass(o.s, half, 0.02, top - 0.02, z);
        trim(0.05, o.h, half - 0.025, o.h / 2, z, 0.04);
      }
      trim(o.w, 0.05, o.c, top - 0.025);
      trim(o.w, 0.03, o.c, 0.015);
    } else if (o.type === 'door') {
      trim(0.05, o.h, o.s + 0.025, o.h / 2, 0, f.t + 0.02);
      trim(0.05, o.h, o.e - 0.025, o.h / 2, 0, f.t + 0.02);
      trim(o.w, 0.05, o.c, top - 0.025, 0, f.t + 0.02);
    }
    cur = o.e;
  }
  seg(cur, f.L + ext, 0, WALL_H);
  return g;
}
