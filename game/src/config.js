// SOLMAR HEAT — config: constants, tuning, districts, car and mission definitions.
// Original city Solmar; no names, characters or places from any commercial game.
export const STEP = 1 / 60;
export const WORLD_W = 3200;
export const WORLD_H = 2400;
export const SAVE_KEY = 'solmar-heat-save-v1';
export const VIEW_W = 1280;
export const VIEW_H = 800;

export const COLORS = {
  grass: '#7fae5a',
  grassDark: '#6f9c4c',
  road: '#3a3f46',
  roadLine: '#e8d44d',
  sidewalk: '#b9b3a4',
  sand: '#e8d29a',
  water: '#2e7fa8',
  waterDeep: '#1f5f86',
  buildingRoof: '#8a6f5c',
  hudBg: 'rgba(10,14,20,0.62)',
  hudText: '#f5f2e8',
  accent: '#ffb400',
  danger: '#ff3b30',
  ok: '#37d67a',
};

export const DISTRICTS = [
  { name: 'Palmetto Beach', x: 0, y: 0, w: 420, h: 2400 },
  { name: 'Coral Row', x: 420, y: 0, w: 1000, h: 800 },
  { name: 'Marina del Sol', x: 2300, y: 1500, w: 900, h: 900 },
  { name: 'Old Solmar', x: 420, y: 800, w: 1000, h: 800 },
  { name: 'Harbor District', x: 1420, y: 1500, w: 880, h: 900 },
];

// Car models: name, top speed (px/s), acceleration, handling, colour, length.
export const CAR_TYPES = {
  sedan: { name: 'Comet Sedan', top: 330, accel: 210, grip: 2.6, color: '#c0392b', len: 52, wid: 26 },
  taxi: { name: 'Solmar Cab', top: 320, accel: 200, grip: 2.6, color: '#f1c40f', len: 52, wid: 26 },
  van: { name: 'Harbor Van', top: 260, accel: 150, grip: 2.2, color: '#7f8c8d', len: 62, wid: 28 },
  truck: { name: 'Dock Truck', top: 240, accel: 130, grip: 2.0, color: '#5d6d7e', len: 72, wid: 30 },
  sport: { name: 'Solaris GT', top: 470, accel: 320, grip: 3.4, color: '#f39c12', len: 54, wid: 26 },
  coupe: { name: 'Vela Coupe', top: 390, accel: 260, grip: 3.0, color: '#2980b9', len: 52, wid: 26 },
  cop: { name: 'Solmar PD Cruiser', top: 420, accel: 300, grip: 3.2, color: '#1c2733', len: 54, wid: 26 },
};

export const MISSIONS = [
  {
    id: 1,
    title: 'Misi 1 — Paket Marina',
    giver: 'Mara Voss',
    brief: 'Ambil paket di Marina del Sol, antar ke Coral Row. Jangan bikin ribut.',
    stages: [
      { text: 'Pergi ke Marina del Sol — ambil paketnya', target: 'marina' },
      { text: 'Antar paket ke Coral Row', target: 'coral' },
    ],
    reward: 500,
  },
  {
    id: 2,
    title: 'Misi 2 — Solaris GT',
    giver: 'Mara Voss',
    brief: 'Curi Solaris GT emas di Coral Row, lalu kabur ke hideout dengan wanted 3.',
    stages: [
      { text: 'Curi Solaris GT di Coral Row', target: 'solaris' },
      { text: 'Kabur ke hideout — polisi mengejarmu!', target: 'hideout' },
    ],
    reward: 1200,
  },
  {
    id: 3,
    title: 'Misi 3 — Heist Dermaga',
    giver: 'Mara Voss',
    brief: 'Ambil 3 peti di dermaga Harbor District selagi polisi datang, bawa ke hideout.',
    stages: [
      { text: 'Ambil peti 1 dari 3 di dermaga', target: 'crate1' },
      { text: 'Ambil peti 2 dari 3 di dermaga', target: 'crate2' },
      { text: 'Ambil peti 3 dari 3 di dermaga', target: 'crate3' },
      { text: 'Bawa peti ke hideout', target: 'hideout' },
    ],
    reward: 3000,
  },
];

export const DISC_REWARD = 100;
export const DISC_COUNT = 10;

// Deterministic RNG (mulberry32) so ?shot= scenes reproduce exactly.
export function createRng(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
export function dist(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); }
export function angleDiff(a, b) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}
export function lerp(a, b, t) { return a + (b - a) * t; }
