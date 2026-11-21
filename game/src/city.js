// SOLMAR HEAT — city: deterministic generation of the Solmar map.
// Roads on a grid, building blocks, palms, beach + water, marina basin, docks,
// and the fixed landmarks missions use (marina, Coral Row drop, hideout, hospital,
// Solaris GT parking spot, harbour crates, Sun Disc collectibles).
import { WORLD_W, WORLD_H, createRng, clamp } from './config.js';

export const ROADS_V = [350, 850, 1350, 1850, 2350, 2850];
export const ROADS_H = [350, 750, 1150, 1550, 1950];
export const ROAD_W = 92;

export const MARINA = { x: 2480, y: 2030, w: 700, h: 350 };
export const BEACH_X = 300;
export const WATER_X = 110;

const ROOFS = ['#8a6f5c', '#7a5c48', '#96705a', '#6b7a8a', '#a08a6a', '#5f6e5a', '#b08a5a', '#7d6a7a'];

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
function inMarina(x, y) {
  return x > MARINA.x - 20 && x < MARINA.x + MARINA.w + 20 && y > MARINA.y - 20 && y < MARINA.y + MARINA.h + 20;
}

export function buildCity(seed) {
  const rng = createRng(seed);
  const buildings = [];
  const palms = [];
  const xs = [0, ...ROADS_V, WORLD_W];
  const ys = [0, ...ROADS_H, WORLD_H];
  // Buildings fill each block between roads, kept off roads, beach and marina.
  for (let bi = 0; bi < xs.length - 1; bi += 1) {
    for (let bj = 0; bj < ys.length - 1; bj += 1) {
      const bx0 = xs[bi] + ROAD_W / 2 + 26;
      const by0 = ys[bj] + ROAD_W / 2 + 26;
      const bx1 = xs[bi + 1] - ROAD_W / 2 - 26;
      const by1 = ys[bj + 1] - ROAD_W / 2 - 26;
      if (bx1 - bx0 < 90 || by1 - by0 < 90) continue;
      const cols = 1 + Math.floor(rng() * 2);
      const rows = 1 + Math.floor(rng() * 2);
      const cw = (bx1 - bx0) / cols;
      const ch = (by1 - by0) / rows;
      for (let c = 0; c < cols; c += 1) {
        for (let r = 0; r < rows; r += 1) {
          if (rng() < 0.18) continue; // empty lot / plaza
          const w = cw * (0.62 + rng() * 0.22);
          const h = ch * (0.62 + rng() * 0.22);
          const x = bx0 + c * cw + (cw - w) / 2;
          const y = by0 + r * ch + (ch - h) / 2;
          const b = { x, y, w, h, roof: ROOFS[Math.floor(rng() * ROOFS.length)], tall: rng() < 0.3 };
          if (b.x < BEACH_X + 10) continue;
          if (rectsOverlap(b, MARINA)) continue;
          buildings.push(b);
        }
      }
    }
  }
  // Palms along the beach promenade and scattered on sidewalks.
  for (let y = 120; y < WORLD_H - 60; y += 130) palms.push({ x: 250 + rng() * 30, y: y + rng() * 40 });
  for (let i = 0; i < 70; i += 1) {
    const x = 320 + rng() * (WORLD_W - 420);
    const y = 60 + rng() * (WORLD_H - 120);
    if (inMarina(x, y)) continue;
    if (buildings.some((b) => x > b.x - 14 && x < b.x + b.w + 14 && y > b.y - 14 && y < b.y + b.h + 14)) continue;
    if (ROADS_V.some((rx) => Math.abs(x - rx) < ROAD_W / 2 - 6)) continue;
    if (ROADS_H.some((ry) => Math.abs(y - ry) < ROAD_W / 2 - 6)) continue;
    palms.push({ x, y });
  }
  // Boats moored in the marina basin.
  const boats = [];
  for (let i = 0; i < 7; i += 1) {
    boats.push({
      x: MARINA.x + 60 + i * 88 + rng() * 20,
      y: MARINA.y + 60 + (i % 2) * 190 + rng() * 30,
      angle: (rng() - 0.5) * 0.4,
      color: ['#e8e8e8', '#d94f3d', '#3d7ad9', '#e8c33d'][i % 4],
    });
  }
  // Parked cars (stealable) placed along roads.
  const parked = [];
  const parkSpots = [
    [905, 420, 0], [1405, 820, 1], [1905, 420, 0], [2405, 1220, 1], [905, 1620, 0],
    [1405, 2020, 1], [1905, 820, 0], [2905, 820, 1], [905, 2020, 0], [2405, 420, 1],
    [1405, 1220, 0], [2905, 1620, 1], [1905, 2020, 0], [905, 1220, 1],
  ];
  const parkTypes = ['sedan', 'coupe', 'taxi', 'sedan', 'van', 'coupe', 'sedan', 'taxi', 'van', 'sedan', 'coupe', 'sedan', 'taxi', 'van'];
  parkSpots.forEach(([x, y, dir], i) => {
    parked.push({ x, y, angle: dir === 0 ? 0 : Math.PI / 2, type: parkTypes[i] });
  });

  // Sun Disc collectibles on sidewalks / promenade.
  const discs = [];
  const discSpots = [
    [300, 700], [900, 300], [1400, 700], [1900, 300], [2400, 1100], [2900, 700],
    [900, 1900], [1400, 1500], [1900, 1900], [300, 2000],
  ];
  discSpots.forEach(([x, y], i) => discs.push({ x, y, id: i, taken: false }));

  const city = {
    buildings, palms, boats, parked, discs,
    spawn: { x: 1350, y: 1150 },
    hospital: { x: 850, y: 300 },
    hideout: { x: 1500, y: 2080 },
    marinaPickup: { x: 2560, y: 2080 },
    coralDrop: { x: 900, y: 500 },
    solarisSpot: { x: 2405, y: 820 },
    crates: [
      { x: 2620, y: 2150, taken: false },
      { x: 2900, y: 2300, taken: false },
      { x: 3060, y: 2120, taken: false },
    ],
  };
  return city;
}

// True when a point is solid ground-blocking: building, water, or outside the map.
export function solidAt(city, x, y, radius) {
  if (x < 8 + radius || y < 8 + radius || x > WORLD_W - 8 - radius || y > WORLD_H - 8 - radius) return true;
  if (x < WATER_X) return true; // sea
  if (x > MARINA.x && x < MARINA.x + MARINA.w && y > MARINA.y && y < MARINA.y + MARINA.h) return true;
  for (let i = 0; i < city.buildings.length; i += 1) {
    const b = city.buildings[i];
    if (x > b.x - radius && x < b.x + b.w + radius && y > b.y - radius && y < b.y + b.h + radius) return true;
  }
  return false;
}

// Move a circle, sliding along walls: try full move, then x-only, then y-only.
export function moveCircle(city, ent, dx, dy, radius) {
  const nx = ent.x + dx;
  const ny = ent.y + dy;
  if (!solidAt(city, nx, ny, radius)) { ent.x = nx; ent.y = ny; return; }
  if (!solidAt(city, nx, ent.y, radius)) { ent.x = nx; return; }
  if (!solidAt(city, ent.x, ny, radius)) { ent.y = ny; }
}

export function onRoad(x, y) {
  return ROADS_V.some((rx) => Math.abs(x - rx) < ROAD_W / 2) || ROADS_H.some((ry) => Math.abs(y - ry) < ROAD_W / 2);
}
export function nearestRoadPoint(x, y) {
  let best = null; let bestD = Infinity;
  for (const rx of ROADS_V) {
    const d = Math.abs(x - rx);
    if (d < bestD) { bestD = d; best = { x: rx, y: clamp(y, 60, WORLD_H - 60) }; }
  }
  for (const ry of ROADS_H) {
    const d = Math.abs(y - ry);
    if (d < bestD) { bestD = d; best = { x: clamp(x, 60, WORLD_W - 60), y: ry }; }
  }
  return best;
}
