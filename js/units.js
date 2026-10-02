// 建案與戶型資料（示範用的虛構建案）
// 座標單位為公尺：x 向左為西、z 向北；z = 0 為南側外牆，陽台在 z < 0。

export const PROJECT = {
  name: '晴光苑',
  en: 'SOLARIS RESIDENCE',
  location: '新北市・示範基地',
  floors: 16,          // 1F 為大廳，2F–16F 為住宅
  unitsPerFloor: 4,
  lobbyHeight: 4.5,
  floorHeight: 3.2,
  basePrice: 48,       // 萬／坪（2F 起價）
  floorPremium: 0.5,   // 每升一層加價（萬／坪）
  cornerPremium: 1.5,  // 邊間加價（萬／坪）
  publicRatio: 0.32,   // 公設比
  handover: '2028 年第四季',
};

// 每層 4 戶：01、04 為邊間 A 戶型，02、03 為 B 戶型
export const COLUMN_TYPES = ['A', 'B', 'B', 'A'];

export const UNITS = {
  A: {
    id: 'A',
    name: 'A 戶型',
    layout: '3 房 2 廳 1 衛',
    tagline: '邊間三面採光・L 型餐廚',
    size: { w: 13, d: 10 },
    entry: { x: 6.4, z: 4.3, yaw: 1.1 },
    rooms: [
      { id: 'living', name: '客廳', x0: 0, x1: 7, z0: 0, z1: 5.5, floor: 'wood' },
      { id: 'dining', name: '餐廳・廚房', x0: 7, x1: 13, z0: 0, z1: 5.5, floor: 'tile' },
      { id: 'hall', name: '走道', x0: 4.5, x1: 13, z0: 5.5, z1: 7, floor: 'wood', minor: true },
      { id: 'master', name: '主臥室', x0: 0, x1: 4.5, z0: 5.5, z1: 10, floor: 'wood' },
      { id: 'bath', name: '衛浴', x0: 4.5, x1: 6.5, z0: 7, z1: 10, floor: 'tile' },
      { id: 'bed2', name: '次臥室', x0: 6.5, x1: 9.5, z0: 7, z1: 10, floor: 'wood' },
      { id: 'study', name: '書房', x0: 9.5, x1: 13, z0: 7, z1: 10, floor: 'wood' },
      { id: 'balcony', name: '陽台', x0: 0, x1: 7, z0: -1.6, z1: 0, floor: 'outdoor', outdoor: true },
    ],
    walls: [
      // 外牆
      { a: [0, 0], b: [13, 0], ext: true, openings: [
        { type: 'slide', c: 3.5, w: 4.6 },
        { type: 'window', c: 10, w: 3 },
      ] },
      { a: [13, 0], b: [13, 10], ext: true, openings: [
        { type: 'window', c: 2.75, w: 2.4 },
        { type: 'window', c: 8.5, w: 1.6 },
      ] },
      { a: [0, 10], b: [13, 10], ext: true, openings: [
        { type: 'window', c: 2.25, w: 2.2 },
        { type: 'high', c: 5.5, w: 0.8 },
        { type: 'window', c: 8, w: 1.8 },
        { type: 'window', c: 11.25, w: 1.6 },
      ] },
      { a: [0, 0], b: [0, 10], ext: true, openings: [
        { type: 'window', c: 7.75, w: 1.8 },
      ] },
      // 隔間牆
      { a: [0, 5.5], b: [4.5, 5.5] },
      { a: [4.5, 5.5], b: [4.5, 10], openings: [{ type: 'door', c: 0.75, w: 0.9 }] },
      { a: [4.5, 7], b: [13, 7], openings: [
        { type: 'door', c: 1.0, w: 0.8 },
        { type: 'door', c: 3.2, w: 0.9 },
        { type: 'door', c: 6.3, w: 0.9 },
      ] },
      { a: [6.5, 7], b: [6.5, 10] },
      { a: [9.5, 7], b: [9.5, 10] },
      { a: [7, 5.5], b: [13, 5.5] },
    ],
    balcony: { x0: 0, x1: 7, z0: -1.6 },
    furniture: [
      // 客廳
      { t: 'rug', x: 2.2, z: 2.75, r: 90, w: 2.4, d: 1.8 },
      { t: 'tvUnit', x: 0.25, z: 2.75, r: 90 },
      { t: 'sofa', x: 3.6, z: 2.75, r: -90 },
      { t: 'coffeeTable', x: 2.1, z: 2.75, r: 90 },
      { t: 'floorLamp', x: 3.9, z: 4.7 },
      { t: 'plant', x: 6.5, z: 0.5 },
      { t: 'plant', x: 0.45, z: 5.0, s: 0.8 },
      // 餐廚
      { t: 'kitchen', x: 10.2, z: 5.2, r: 180, w: 3.6 },
      { t: 'fridge', x: 12.55, z: 5.12, r: 180 },
      { t: 'diningSet', x: 9.8, z: 2.5, r: 0 },
      { t: 'pendant', x: 9.8, z: 2.5 },
      { t: 'plant', x: 12.5, z: 0.5 },
      // 主臥
      { t: 'bed', x: 2.2, z: 6.6, r: 0, w: 1.8, d: 2.1 },
      { t: 'nightstand', x: 0.95, z: 5.8 },
      { t: 'nightstand', x: 3.45, z: 5.8 },
      { t: 'wardrobe', x: 4.15, z: 8.5, r: -90, w: 2.2 },
      { t: 'rug', x: 2.2, z: 8.3, r: 0, w: 2.2, d: 1.2 },
      { t: 'plant', x: 0.45, z: 9.55, s: 0.9 },
      // 衛浴
      { t: 'vanity', x: 4.81, z: 8.0, r: 90 },
      { t: 'toilet', x: 4.85, z: 9.4, r: 90 },
      { t: 'shower', x: 6.0, z: 9.3 },
      // 次臥
      { t: 'bed', x: 8.7, z: 8.95, r: 180, w: 1.2, d: 2.0 },
      { t: 'wardrobe', x: 6.85, z: 8.6, r: 90, w: 1.6 },
      // 書房
      { t: 'desk', x: 12.6, z: 8.5, r: -90 },
      { t: 'bookshelf', x: 9.7, z: 8.6, r: 90 },
      { t: 'plant', x: 10.0, z: 9.6, s: 0.8 },
      // 陽台
      { t: 'balconySet', x: 5.5, z: -0.8 },
      { t: 'plant', x: 0.45, z: -1.2 },
    ],
  },

  B: {
    id: 'B',
    name: 'B 戶型',
    layout: '2 房 2 廳 1 衛',
    tagline: '方正格局・前後雙採光',
    size: { w: 10, d: 9 },
    entry: { x: 5.5, z: 4.0, yaw: 1.1 },
    rooms: [
      { id: 'living', name: '客廳', x0: 0, x1: 6, z0: 0, z1: 5, floor: 'wood' },
      { id: 'dining', name: '餐廳・廚房', x0: 6, x1: 10, z0: 0, z1: 5, floor: 'tile' },
      { id: 'hall', name: '走道', x0: 4.5, x1: 10, z0: 5, z1: 6.5, floor: 'wood', minor: true },
      { id: 'master', name: '主臥室', x0: 0, x1: 4.5, z0: 5, z1: 9, floor: 'wood' },
      { id: 'bath', name: '衛浴', x0: 4.5, x1: 6.5, z0: 6.5, z1: 9, floor: 'tile' },
      { id: 'bed2', name: '次臥室', x0: 6.5, x1: 10, z0: 6.5, z1: 9, floor: 'wood' },
      { id: 'balcony', name: '陽台', x0: 0, x1: 6, z0: -1.5, z1: 0, floor: 'outdoor', outdoor: true },
    ],
    walls: [
      { a: [0, 0], b: [10, 0], ext: true, openings: [
        { type: 'slide', c: 3, w: 4 },
        { type: 'window', c: 8, w: 2.4 },
      ] },
      { a: [10, 0], b: [10, 9], ext: true, openings: [
        { type: 'window', c: 2.5, w: 2 },
        { type: 'window', c: 7.75, w: 1.6 },
      ] },
      { a: [0, 9], b: [10, 9], ext: true, openings: [
        { type: 'window', c: 2.25, w: 2 },
        { type: 'high', c: 5.5, w: 0.7 },
        { type: 'window', c: 8.25, w: 1.8 },
      ] },
      { a: [0, 0], b: [0, 9], ext: true, openings: [
        { type: 'window', c: 7, w: 1.6 },
      ] },
      { a: [0, 5], b: [4.5, 5] },
      { a: [4.5, 5], b: [4.5, 9], openings: [{ type: 'door', c: 0.75, w: 0.9 }] },
      { a: [4.5, 6.5], b: [10, 6.5], openings: [
        { type: 'door', c: 1.0, w: 0.8 },
        { type: 'door', c: 3.3, w: 0.9 },
      ] },
      { a: [6.5, 6.5], b: [6.5, 9] },
      { a: [6, 5], b: [10, 5] },
    ],
    balcony: { x0: 0, x1: 6, z0: -1.5 },
    furniture: [
      { t: 'rug', x: 2.0, z: 2.5, r: 90, w: 2.2, d: 1.7 },
      { t: 'tvUnit', x: 0.25, z: 2.5, r: 90 },
      { t: 'sofa', x: 3.4, z: 2.5, r: -90 },
      { t: 'coffeeTable', x: 1.95, z: 2.5, r: 90 },
      { t: 'floorLamp', x: 3.7, z: 4.4 },
      { t: 'plant', x: 5.6, z: 0.45 },
      { t: 'kitchen', x: 7.8, z: 4.7, r: 180, w: 2.6 },
      { t: 'fridge', x: 9.55, z: 4.62, r: 180 },
      { t: 'diningSet', x: 8.0, z: 2.2, r: 0, w: 1.4 },
      { t: 'pendant', x: 8.0, z: 2.2 },
      { t: 'bed', x: 2.2, z: 6.1, r: 0, w: 1.8, d: 2.1 },
      { t: 'nightstand', x: 0.95, z: 5.3 },
      { t: 'nightstand', x: 3.45, z: 5.3 },
      { t: 'wardrobe', x: 4.15, z: 7.8, r: -90, w: 2.0 },
      { t: 'vanity', x: 4.81, z: 7.4, r: 90 },
      { t: 'toilet', x: 4.85, z: 8.45, r: 90 },
      { t: 'shower', x: 6.0, z: 8.35 },
      { t: 'bed', x: 8.95, z: 7.75, r: -90, w: 1.2, d: 2.0 },
      { t: 'desk', x: 7.3, z: 8.65, r: 180, w: 1.0 },
      { t: 'plant', x: 9.65, z: 6.85, s: 0.8 },
      { t: 'balconySet', x: 4.6, z: -0.75 },
      { t: 'plant', x: 0.45, z: -1.1 },
    ],
  },
};

export const PING = 3.30579; // 1 坪 = 3.30579 m²

export function roomArea(r) {
  return (r.x1 - r.x0) * (r.z1 - r.z0);
}

// 依樓層與戶別計算坪數與價格
export function unitPricing(unit, floor, col) {
  const main = unit.rooms.filter(r => !r.outdoor).reduce((s, r) => s + roomArea(r), 0) / PING;
  const balcony = unit.rooms.filter(r => r.outdoor).reduce((s, r) => s + roomArea(r), 0) / PING;
  const total = (main + balcony) / (1 - PROJECT.publicRatio);
  const pub = total - main - balcony;
  const corner = col === 0 || col === 3;
  const perPing = PROJECT.basePrice + (floor - 2) * PROJECT.floorPremium + (corner ? PROJECT.cornerPremium : 0);
  return { main, balcony, pub, total, perPing, price: total * perPing };
}

// 以固定亂數產生銷控狀態，讓每次開啟都一致
export function unitStatus(floor, col) {
  if (floor === 12 && col === 0) return 'available';
  const s = Math.sin(floor * 12.9898 + col * 78.233) * 43758.5453;
  const v = s - Math.floor(s);
  const soldBias = floor < 8 ? 0.15 : 0;
  if (v < 0.38 + soldBias) return 'sold';
  if (v < 0.55 + soldBias) return 'reserved';
  return 'available';
}

export const STATUS_LABEL = { available: '可銷售', reserved: '已預約', sold: '已售出' };
