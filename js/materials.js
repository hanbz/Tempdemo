import * as THREE from 'three';

// 裝潢風格：只改變材質顏色，不重建模型
export const STYLES = {
  modern: {
    name: '現代簡約',
    wall: '#f1efea', wood: '#dcbf95', tile: '#ecebe6', outdoor: '#b9b4ab',
    furnitureWood: '#c9a57a', fabric: '#9ea6ae', accent: '#5d7b94',
    cabinet: '#f6f5f2', counter: '#3b3c3e', bedding: '#f4f2ee',
  },
  warm: {
    name: '北歐暖木',
    wall: '#efe5d5', wood: '#b88454', tile: '#e6dacb', outdoor: '#a89c8d',
    furnitureWood: '#8f5f3b', fabric: '#cdb89d', accent: '#b4633d',
    cabinet: '#eadfcd', counter: '#f1ede6', bedding: '#efe6d8',
  },
  industrial: {
    name: '工業風',
    wall: '#bdbcb8', wood: '#76604f', tile: '#94938f', outdoor: '#8b8a86',
    furnitureWood: '#4c3d31', fabric: '#41474c', accent: '#c4893c',
    cabinet: '#3c4043', counter: '#a3a29e', bedding: '#d7d4ce',
  },
};

function canvas(size) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return [c, c.getContext('2d')];
}

function seeded(seed) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

// 木地板：一張貼圖代表 1.6m × 1.6m，每片地板 20cm 寬
function woodTexture() {
  const [c, g] = canvas(512);
  const rnd = seeded(7);
  const rowH = 64;
  for (let y = 0; y < 512; y += rowH) {
    let x = -rnd() * 300;
    while (x < 512) {
      const len = 180 + rnd() * 240;
      const l = 205 + rnd() * 40;
      g.fillStyle = `rgb(${l},${l},${l})`;
      g.fillRect(x, y, len, rowH);
      g.globalAlpha = 0.18;
      for (let k = 0; k < 7; k++) {
        const gy = y + 4 + rnd() * (rowH - 8);
        g.strokeStyle = rnd() > 0.5 ? '#8a8a8a' : '#ffffff';
        g.lineWidth = 0.6 + rnd() * 1.4;
        g.beginPath();
        g.moveTo(x, gy);
        g.bezierCurveTo(x + len * 0.3, gy + rnd() * 6 - 3, x + len * 0.6, gy + rnd() * 6 - 3, x + len, gy);
        g.stroke();
      }
      g.globalAlpha = 1;
      g.fillStyle = 'rgba(70,70,70,0.55)';
      g.fillRect(x, y, 2, rowH);
      x += len;
    }
    g.fillStyle = 'rgba(70,70,70,0.5)';
    g.fillRect(0, y, 512, 2);
  }
  return finish(c, 1.6);
}

// 磁磚：60cm 方磚，一張貼圖 1.2m
function tileTexture(grout = '#a9a9a9') {
  const [c, g] = canvas(512);
  const rnd = seeded(13);
  for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
    const l = 236 + rnd() * 14;
    g.fillStyle = `rgb(${l},${l},${l})`;
    g.fillRect(i * 256, j * 256, 256, 256);
    for (let k = 0; k < 260; k++) {
      const v = 215 + rnd() * 40;
      g.fillStyle = `rgba(${v},${v},${v},0.35)`;
      g.fillRect(i * 256 + rnd() * 256, j * 256 + rnd() * 256, 2 + rnd() * 5, 2 + rnd() * 5);
    }
  }
  g.fillStyle = grout;
  for (let k = 0; k <= 2; k++) {
    g.fillRect(k * 256 - 2, 0, 4, 512);
    g.fillRect(0, k * 256 - 2, 512, 4);
  }
  return finish(c, 1.2);
}

function finish(c, meters) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.userData.meters = meters;
  return t;
}

export function createMaterials() {
  const std = (o) => new THREE.MeshStandardMaterial(o);
  const m = {
    wall: std({ color: '#fff', roughness: 0.92 }),
    wallCut: std({ color: '#454a52', roughness: 0.8 }),
    ceiling: std({ color: '#fbfaf7', roughness: 0.95, emissive: '#fffaf2', emissiveIntensity: 0.22 }),
    floorWood: std({ map: woodTexture(), roughness: 0.55 }),
    floorTile: std({ map: tileTexture(), roughness: 0.35 }),
    floorOutdoor: std({ map: tileTexture('#7d7d7d'), roughness: 0.8 }),
    slab: std({ color: '#cfccc6', roughness: 0.95 }),
    furnitureWood: std({ color: '#fff', roughness: 0.6 }),
    fabric: std({ color: '#fff', roughness: 0.95 }),
    accent: std({ color: '#fff', roughness: 0.9 }),
    cabinet: std({ color: '#fff', roughness: 0.5 }),
    counter: std({ color: '#fff', roughness: 0.3 }),
    bedding: std({ color: '#fff', roughness: 0.95 }),
    white: std({ color: '#f4f4f2', roughness: 0.5 }),
    ceramic: std({ color: '#fbfbfb', roughness: 0.15 }),
    metal: std({ color: '#8d9196', roughness: 0.35, metalness: 0.8 }),
    dark: std({ color: '#26282b', roughness: 0.5 }),
    screen: std({ color: '#0d0f12', roughness: 0.15, emissive: '#1a2a3a', emissiveIntensity: 0.4 }),
    frame: std({ color: '#3b3f45', roughness: 0.4, metalness: 0.5 }),
    glass: std({ color: '#cfe6f2', roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.22, depthWrite: false }),
    mirror: std({ color: '#dfe7ec', roughness: 0.04, metalness: 1 }),
    plant: std({ color: '#4f7a43', roughness: 0.85 }),
    plantDark: std({ color: '#3a5f34', roughness: 0.85 }),
    pot: std({ color: '#d9d2c6', roughness: 0.8 }),
    lampShade: std({ color: '#f6eedf', roughness: 0.8, emissive: '#ffcf8a', emissiveIntensity: 0 }),
    cursor: new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.85, depthWrite: false }),
  };
  return m;
}

export function applyStyle(m, key) {
  const s = STYLES[key];
  m.wall.color.set(s.wall);
  m.floorWood.color.set(s.wood);
  m.floorTile.color.set(s.tile);
  m.floorOutdoor.color.set(s.outdoor);
  m.furnitureWood.color.set(s.furnitureWood);
  m.fabric.color.set(s.fabric);
  m.accent.color.set(s.accent);
  m.cabinet.color.set(s.cabinet);
  m.counter.color.set(s.counter);
  m.bedding.color.set(s.bedding);
}
