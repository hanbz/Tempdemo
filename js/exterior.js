import * as THREE from 'three';
import { PROJECT, COLUMN_TYPES, unitStatus } from './units.js';

export const STATUS_COLOR = { available: '#3fa79b', reserved: '#d9a640', sold: '#9a9fa6' };
export const TOWER = { w: 28, d: 14 };

function rng(seed) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

function windowTexture() {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, 64, 64);
  g.fillStyle = '#9fb0bf';
  g.fillRect(8, 10, 48, 34);
  g.fillStyle = '#c7d3dc';
  g.fillRect(8, 10, 48, 8);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// 周邊環境：地面、道路、廣場、行道樹、城市背景
export function buildWorld() {
  const g = new THREE.Group();
  const std = (o) => new THREE.MeshStandardMaterial(o);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400), std({ color: '#93a383', roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  g.add(ground);

  const road = std({ color: '#55595e', roughness: 0.95 });
  const plaza = std({ color: '#d7d2c8', roughness: 0.9 });
  const lane = std({ color: '#e9e6dc', roughness: 0.9 });
  const flat = (w, d, mat, x, z, y) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, y, z);
    m.receiveShadow = true;
    g.add(m);
    return m;
  };
  flat(1400, 14, road, 0, -34, 0.02);
  flat(14, 1400, road, -44, 0, 0.02);
  for (let x = -600; x < 600; x += 8) flat(4, 0.25, lane, x, -34, 0.03);
  for (let z = -600; z < 600; z += 8) flat(0.25, 4, lane, -44, z, 0.03);
  flat(70, 50, plaza, 0, 0, 0.04);
  const lawn = std({ color: '#7f9a6c', roughness: 1 });
  flat(18, 12, lawn, -22, -16, 0.05);
  flat(18, 12, lawn, 22, -16, 0.05);
  flat(60, 10, lawn, 0, 20, 0.05);

  // 行道樹
  const trunk = std({ color: '#6d5240', roughness: 1 });
  const leaf = std({ color: '#557a45', roughness: 0.9 });
  const leaf2 = std({ color: '#6a8c4f', roughness: 0.9 });
  const tree = (x, z, s) => {
    const t = new THREE.Group();
    const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.18 * s, 0.25 * s, 2.4 * s, 6), trunk);
    tr.position.y = 1.2 * s;
    tr.castShadow = true;
    const c = new THREE.Mesh(new THREE.IcosahedronGeometry(1.7 * s, 0), Math.random() > 0.5 ? leaf : leaf2);
    c.position.y = 3.4 * s;
    c.castShadow = true;
    t.add(tr, c);
    t.position.set(x, 0, z);
    g.add(t);
  };
  const r = rng(3);
  for (let x = -32; x <= 32; x += 6) { tree(x, -25.5, 0.9 + r() * 0.3); tree(x, 24, 0.9 + r() * 0.3); }
  for (let z = -20; z <= 20; z += 6) { tree(-33, z, 0.9 + r() * 0.3); tree(33, z, 0.9 + r() * 0.3); }
  for (let i = 0; i < 6; i++) tree(-27 + r() * 10, -20 + r() * 8, 0.8 + r() * 0.4);
  for (let i = 0; i < 6; i++) tree(17 + r() * 10, -20 + r() * 8, 0.8 + r() * 0.4);

  // 城市背景大樓
  const tex = windowTexture();
  const palette = ['#d9d6cf', '#c9ccd0', '#e3ddd2', '#b9c0c6', '#d2cbc0'];
  for (let i = 0; i < 110; i++) {
    const ang = r() * Math.PI * 2;
    const dist = 80 + r() * 260;
    const x = Math.cos(ang) * dist, z = Math.sin(ang) * dist;
    if (Math.abs(z + 34) < 14 || Math.abs(x + 44) < 14) continue;
    const w = 14 + r() * 22, d = 12 + r() * 18, h = 12 + r() * (dist < 150 ? 55 : 90);
    const t = tex.clone();
    t.repeat.set(Math.round(w / 4), Math.round(h / 3.2));
    const mat = std({ color: palette[i % palette.length], map: t, roughness: 0.85 });
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    b.position.set(x, h / 2, z);
    b.castShadow = dist < 140;
    b.receiveShadow = true;
    g.add(b);
  }
  return g;
}

// 主塔：每一戶是一個可點選的量體
export function buildTower() {
  const g = new THREE.Group();
  const std = (o) => new THREE.MeshStandardMaterial(o);
  const white = std({ color: '#eeebe5', roughness: 0.7 });
  const dark = std({ color: '#2f3a44', roughness: 0.2, metalness: 0.4 });
  const glass = std({ color: '#bcd3df', roughness: 0.08, metalness: 0.2, transparent: true, opacity: 0.35, depthWrite: false });
  const { w, d } = TOWER;
  const { lobbyHeight: LH, floorHeight: FH, floors } = PROJECT;

  const add = (geo, mat, x, y, z, shadow = true) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = shadow;
    m.receiveShadow = true;
    g.add(m);
    return m;
  };

  // 大廳
  add(new THREE.BoxGeometry(w - 1, LH, d - 1), dark, 0, LH / 2, 0);
  add(new THREE.BoxGeometry(10, 0.35, 5), white, 0, LH - 0.6, -d / 2 - 2.5);
  for (const x of [-4.6, 4.6]) add(new THREE.CylinderGeometry(0.18, 0.18, LH - 0.6, 12), white, x, (LH - 0.6) / 2, -d / 2 - 4.6);

  const units = [];
  for (let f = 2; f <= floors; f++) {
    const y0 = LH + (f - 2) * FH;
    add(new THREE.BoxGeometry(w + 0.8, 0.3, d + 2.4), white, 0, y0 + 0.15, -0.6);
    for (let c = 0; c < 4; c++) {
      const status = unitStatus(f, c);
      const mat = std({
        color: STATUS_COLOR[status], roughness: 0.45, metalness: 0.05,
        emissive: STATUS_COLOR[status], emissiveIntensity: 0.3,
      });
      const x = -w / 2 + 3.5 + c * 7;
      const m = add(new THREE.BoxGeometry(6.84, FH - 0.3, d), mat, x, y0 + 0.3 + (FH - 0.3) / 2, 0);
      m.userData = { floor: f, col: c, type: COLUMN_TYPES[c], status, baseColor: new THREE.Color(STATUS_COLOR[status]) };
      units.push(m);
      // 陽台玻璃欄杆
      add(new THREE.BoxGeometry(6.6, 1.05, 0.05), glass, x, y0 + 0.85, -d / 2 - 1.75, false);
    }
    for (let c = 0; c <= 4; c++) {
      add(new THREE.BoxGeometry(0.22, FH, 1.8), white, -w / 2 + c * 7, y0 + FH / 2, -d / 2 - 0.9);
    }
  }
  const topY = LH + (floors - 1) * FH;
  add(new THREE.BoxGeometry(w + 0.8, 0.5, d + 2.4), white, 0, topY + 0.25, -0.6);
  add(new THREE.BoxGeometry(10, 3.5, 7), white, 4, topY + 2.2, 1);
  add(new THREE.BoxGeometry(w + 0.8, 1.1, 0.15), white, 0, topY + 1, -d / 2 - 1.75);

  return { group: g, units };
}

export function floorElevation(floor) {
  return PROJECT.lobbyHeight + (floor - 2) * PROJECT.floorHeight + 0.3;
}
