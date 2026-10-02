import * as THREE from 'three';

// 每件家具在本地座標中「正面朝 +z」，放置時再依 r（角度）旋轉。
let M = null;

function box(w, h, d, mat, x = 0, y = 0, z = 0, shadow = true) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = shadow;
  mesh.receiveShadow = true;
  return mesh;
}

function cyl(rt, rb, h, mat, x = 0, y = 0, z = 0, seg = 20) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function legs(g, w, d, h, mat, inset = 0.05, r = 0.022) {
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    g.add(cyl(r, r, h, mat, sx * (w / 2 - inset), h / 2, sz * (d / 2 - inset), 8));
  }
}

const builders = {
  sofa() {
    const g = new THREE.Group();
    g.add(box(2.2, 0.42, 0.92, M.fabric, 0, 0.23, 0));
    g.add(box(2.2, 0.48, 0.2, M.fabric, 0, 0.62, -0.36));
    for (const s of [-1, 1]) g.add(box(0.18, 0.6, 0.92, M.fabric, s * 1.01, 0.32, 0));
    for (const s of [-1, 1]) g.add(box(0.9, 0.12, 0.66, M.fabric, s * 0.46, 0.5, 0.08));
    g.add(box(0.42, 0.36, 0.12, M.accent, -0.62, 0.72, -0.2));
    g.add(box(0.42, 0.36, 0.12, M.bedding, 0.6, 0.72, -0.2));
    return g;
  },
  coffeeTable() {
    const g = new THREE.Group();
    g.add(box(1.1, 0.05, 0.6, M.furnitureWood, 0, 0.4, 0));
    legs(g, 1.1, 0.6, 0.38, M.metal, 0.08, 0.015);
    g.add(box(0.28, 0.04, 0.2, M.accent, 0.2, 0.445, 0.05));
    return g;
  },
  tvUnit() {
    const g = new THREE.Group();
    g.add(box(2.0, 0.42, 0.42, M.furnitureWood, 0, 0.26, 0));
    g.add(box(1.5, 0.86, 0.05, M.screen, 0, 1.25, -0.12));
    g.add(box(0.5, 0.25, 0.25, M.dark, 0.65, 0.6, 0.02));
    return g;
  },
  rug(o) {
    const g = new THREE.Group();
    const m = box(o.w || 2.4, 0.012, o.d || 1.7, M.accent, 0, 0.012, 0, false);
    g.add(m);
    g.userData.noCollide = true;
    return g;
  },
  diningSet(o) {
    const g = new THREE.Group();
    const w = o.w || 1.6;
    g.add(box(w, 0.05, 0.9, M.furnitureWood, 0, 0.75, 0));
    legs(g, w, 0.9, 0.73, M.furnitureWood, 0.08, 0.03);
    const xs = w > 1.5 ? [-0.4, 0.4] : [-0.32, 0.32];
    for (const x of xs) for (const s of [-1, 1]) {
      const c = chair();
      c.position.set(x, 0, s * 0.68);
      c.rotation.y = s > 0 ? Math.PI : 0;
      g.add(c);
    }
    return g;
  },
  pendant() {
    const g = new THREE.Group();
    g.add(cyl(0.004, 0.004, 0.75, M.dark, 0, 2.42, 0, 4));
    const shade = cyl(0.08, 0.26, 0.2, M.lampShade, 0, 1.95, 0, 24);
    shade.castShadow = false;
    g.add(shade);
    g.userData.noCollide = true;
    return g;
  },
  kitchen(o) {
    const g = new THREE.Group();
    const w = o.w || 3;
    g.add(box(w, 0.86, 0.6, M.cabinet, 0, 0.43, 0));
    g.add(box(w + 0.02, 0.04, 0.63, M.counter, 0, 0.88, 0.01));
    g.add(box(w, 0.7, 0.36, M.cabinet, 0, 1.95, -0.12));
    g.add(box(0.55, 0.02, 0.4, M.metal, -w * 0.18, 0.905, 0.03));
    g.add(box(0.6, 0.02, 0.45, M.dark, w * 0.25, 0.905, 0.02));
    g.add(box(0.7, 0.3, 0.4, M.metal, w * 0.25, 1.48, -0.1));
    for (let i = 0; i < Math.round(w / 0.6); i++) {
      g.add(box(0.012, 0.8, 0.01, M.dark, -w / 2 + (i + 1) * (w / Math.round(w / 0.6)), 0.43, 0.301, false));
    }
    return g;
  },
  fridge() {
    const g = new THREE.Group();
    g.add(box(0.72, 1.85, 0.68, M.metal, 0, 0.925, 0));
    g.add(box(0.02, 0.5, 0.03, M.dark, 0.28, 1.2, 0.35, false));
    return g;
  },
  bed(o) {
    const g = new THREE.Group();
    const w = o.w || 1.8, d = o.d || 2.1;
    g.add(box(w, 0.3, d, M.furnitureWood, 0, 0.15, 0));
    g.add(box(w - 0.06, 0.22, d - 0.1, M.white, 0, 0.41, 0.03));
    g.add(box(w - 0.02, 0.06, d * 0.62, M.bedding, 0, 0.54, d * 0.17));
    g.add(box(w - 0.0, 0.03, 0.35, M.accent, 0, 0.58, d * 0.38));
    const pillows = w > 1.5 ? [-w / 4, w / 4] : [0];
    for (const x of pillows) g.add(box(Math.min(0.62, w - 0.2), 0.13, 0.38, M.bedding, x, 0.59, -d / 2 + 0.3));
    g.add(box(w + 0.1, 1.05, 0.08, M.fabric, 0, 0.53, -d / 2 + 0.04));
    return g;
  },
  nightstand() {
    const g = new THREE.Group();
    g.add(box(0.45, 0.45, 0.4, M.furnitureWood, 0, 0.225, 0));
    g.add(cyl(0.05, 0.06, 0.2, M.dark, 0, 0.55, 0, 12));
    const shade = cyl(0.08, 0.13, 0.17, M.lampShade, 0, 0.72, 0, 16);
    shade.castShadow = false;
    g.add(shade);
    return g;
  },
  wardrobe(o) {
    const g = new THREE.Group();
    const w = o.w || 2;
    g.add(box(w, 2.3, 0.6, M.cabinet, 0, 1.15, 0));
    const n = Math.max(2, Math.round(w / 0.55));
    for (let i = 1; i < n; i++) g.add(box(0.01, 2.2, 0.01, M.dark, -w / 2 + (i * w) / n, 1.15, 0.301, false));
    for (let i = 0; i < n; i++) g.add(box(0.015, 0.3, 0.025, M.metal, -w / 2 + ((i + 0.5) * w) / n + (i % 2 ? -0.12 : 0.12), 1.15, 0.31, false));
    return g;
  },
  desk(o) {
    const g = new THREE.Group();
    const w = o.w || 1.2;
    g.add(box(w, 0.04, 0.6, M.furnitureWood, 0, 0.74, 0));
    legs(g, w, 0.6, 0.72, M.dark, 0.05, 0.018);
    g.add(box(0.6, 0.36, 0.03, M.screen, 0, 1.05, -0.18));
    g.add(box(0.05, 0.14, 0.05, M.dark, 0, 0.82, -0.18));
    const c = chair(M.dark);
    c.position.set(0, 0, 0.6);
    c.rotation.y = Math.PI;
    g.add(c);
    return g;
  },
  bookshelf() {
    const g = new THREE.Group();
    g.add(box(0.9, 1.8, 0.04, M.furnitureWood, 0, 0.9, -0.13));
    for (const s of [-1, 1]) g.add(box(0.03, 1.8, 0.3, M.furnitureWood, s * 0.435, 0.9, 0));
    for (let i = 0; i < 5; i++) g.add(box(0.87, 0.03, 0.3, M.furnitureWood, 0, 0.02 + i * 0.44, 0));
    const books = [M.accent, M.fabric, M.dark, M.white, M.accent];
    for (let i = 0; i < 4; i++) {
      let x = -0.38;
      let k = i;
      while (x < 0.3) {
        const bw = 0.04 + ((k * 37) % 5) * 0.012;
        const bh = 0.24 + ((k * 13) % 4) * 0.03;
        g.add(box(bw, bh, 0.22, books[k % books.length], x + bw / 2, 0.035 + i * 0.44 + bh / 2, 0.01, false));
        x += bw + 0.008;
        k++;
      }
    }
    return g;
  },
  toilet() {
    const g = new THREE.Group();
    g.add(cyl(0.18, 0.15, 0.4, M.ceramic, 0, 0.2, 0.08));
    g.add(box(0.4, 0.38, 0.18, M.ceramic, 0, 0.55, -0.18));
    g.add(cyl(0.2, 0.2, 0.03, M.ceramic, 0, 0.415, 0.08));
    return g;
  },
  vanity() {
    const g = new THREE.Group();
    g.add(box(0.9, 0.55, 0.48, M.furnitureWood, 0, 0.55, 0));
    g.add(box(0.92, 0.04, 0.5, M.ceramic, 0, 0.845, 0));
    g.add(cyl(0.17, 0.13, 0.1, M.ceramic, 0, 0.9, 0.03));
    g.add(box(0.75, 0.85, 0.02, M.mirror, 0, 1.55, -0.23, false));
    return g;
  },
  shower() {
    const g = new THREE.Group();
    g.add(box(0.9, 0.05, 0.9, M.ceramic, 0, 0.025, 0));
    g.add(box(0.012, 2.0, 0.9, M.glass, -0.45, 1.05, 0, false));
    g.add(box(0.02, 0.02, 0.02, M.metal, 0, 0.0, 0, false));
    g.add(cyl(0.012, 0.012, 1.1, M.metal, 0.38, 1.45, 0.38, 8));
    g.add(cyl(0.1, 0.1, 0.02, M.metal, 0.3, 2.0, 0.3, 16));
    return g;
  },
  plant(o) {
    const g = new THREE.Group();
    const s = o.s || 1;
    g.add(cyl(0.16 * s, 0.12 * s, 0.34 * s, M.pot, 0, 0.17 * s, 0, 16));
    const leaves = [[0, 0.65, 0, 0.28], [0.12, 0.85, 0.05, 0.22], [-0.1, 0.9, -0.06, 0.2], [0.02, 1.08, 0, 0.17]];
    leaves.forEach(([x, y, z, r], i) => {
      const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(r * s, 0), i % 2 ? M.plantDark : M.plant);
      leaf.position.set(x * s, y * s, z * s);
      leaf.castShadow = true;
      g.add(leaf);
    });
    g.add(cyl(0.015, 0.015, 0.5 * s, M.furnitureWood, 0, 0.5 * s, 0, 6));
    return g;
  },
  floorLamp() {
    const g = new THREE.Group();
    g.add(cyl(0.16, 0.16, 0.03, M.dark, 0, 0.015, 0));
    g.add(cyl(0.012, 0.012, 1.5, M.dark, 0, 0.77, 0, 6));
    const shade = cyl(0.14, 0.2, 0.28, M.lampShade, 0, 1.55, 0, 20);
    shade.castShadow = false;
    g.add(shade);
    return g;
  },
  balconySet() {
    const g = new THREE.Group();
    g.add(cyl(0.3, 0.3, 0.03, M.furnitureWood, 0, 0.62, 0));
    g.add(cyl(0.02, 0.02, 0.6, M.dark, 0, 0.3, 0, 8));
    for (const s of [-1, 1]) {
      const c = chair(M.furnitureWood);
      c.position.set(s * 0.65, 0, 0);
      c.rotation.y = -s * Math.PI / 2;
      g.add(c);
    }
    return g;
  },
};

function chair(mat) {
  const g = new THREE.Group();
  const m = mat || M.furnitureWood;
  g.add(box(0.44, 0.04, 0.44, m, 0, 0.45, 0));
  g.add(box(0.44, 0.42, 0.03, m, 0, 0.7, -0.21));
  legs(g, 0.44, 0.44, 0.44, m, 0.03, 0.015);
  return g;
}

export function buildFurniture(item, mats) {
  M = mats;
  const fn = builders[item.t];
  if (!fn) return null;
  const g = fn(item);
  g.position.set(item.x, 0, item.z);
  g.rotation.y = THREE.MathUtils.degToRad(item.r || 0);
  g.userData.type = item.t;
  return g;
}
