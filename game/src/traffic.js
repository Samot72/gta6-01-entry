// SOLMAR HEAT — traffic: AI cars that drive the road grid (lane, turn at
// intersections) and pedestrians who walk the sidewalks and flee gunfire.
import { CAR_TYPES, dist, createRng } from './config.js';
import { ROADS_V, ROADS_H, ROAD_W, moveCircle } from './city.js';

const PED_COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22', '#ecf0f1'];

export function makeCar(x, y, angle, type, opts) {
  const spec = CAR_TYPES[type];
  return {
    x, y, angle, type, len: spec.len, wid: spec.wid,
    speed: 0, hp: 100, dead: false,
    driver: null, parked: !!(opts && opts.parked),
    color: spec.color,
    ...(opts || {}),
  };
}

export function spawnTraffic(G) {
  const rng = createRng(G.seed + 77);
  const types = ['sedan', 'taxi', 'coupe', 'van', 'sedan', 'taxi', 'truck', 'coupe'];
  for (let i = 0; i < 14; i += 1) {
    const vertical = rng() < 0.5;
    let x; let y; let angle;
    if (vertical) {
      x = ROADS_V[Math.floor(rng() * ROADS_V.length)] + (rng() < 0.5 ? -22 : 22);
      y = 100 + rng() * 2200;
      angle = rng() < 0.5 ? Math.PI / 2 : -Math.PI / 2;
    } else {
      y = ROADS_H[Math.floor(rng() * ROADS_H.length)] + (rng() < 0.5 ? -22 : 22);
      x = 100 + rng() * 3000;
      angle = rng() < 0.5 ? 0 : Math.PI;
    }
    const car = makeCar(x, y, angle, types[i % types.length], { traffic: true });
    car.speed = 120 + rng() * 90;
    car.vertical = vertical;
    car.turnAt = null;
    G.cars.push(car);
  }
  // Parked stealable cars from the city plan.
  for (const pk of G.city.parked) {
    G.cars.push(makeCar(pk.x, pk.y, pk.angle, pk.type, { parked: true }));
  }
  // The Solaris GT for mission 2, parked in Coral Row.
  const gt = makeCar(G.city.solarisSpot.x, G.city.solarisSpot.y, Math.PI / 2, 'sport', { parked: true, solaris: true });
  G.cars.push(gt);
  G.solarisCar = gt;
}

export function spawnPeds(G) {
  const rng = createRng(G.seed + 31);
  for (let i = 0; i < 26; i += 1) {
    const x = 340 + rng() * 2800;
    const y = 80 + rng() * 2200;
    G.peds.push({
      x, y, angle: rng() * Math.PI * 2, hp: 100, alive: true, kind: 'ped',
      speed: 40 + rng() * 35, color: PED_COLORS[i % PED_COLORS.length],
      tx: x, ty: y, wait: rng() * 2, flee: 0,
    });
  }
}

function pickPedTarget(G, ped) {
  const rng = Math.random;
  // Wander to a nearby sidewalk point.
  const nx = ped.x + (rng() - 0.5) * 500;
  const ny = ped.y + (rng() - 0.5) * 500;
  ped.tx = Math.max(320, Math.min(3150, nx));
  ped.ty = Math.max(60, Math.min(2340, ny));
}

export function updateTraffic(G, dt) {
  for (const car of G.cars) {
    if (car.dead || !car.traffic) continue;
    // Slow down if a car is close ahead.
    let slow = false;
    for (const other of G.cars) {
      if (other === car || other.dead) continue;
      const dx = other.x - car.x; const dy = other.y - car.y;
      const ahead = dx * Math.cos(car.angle) + dy * Math.sin(car.angle);
      const side = Math.abs(dx * -Math.sin(car.angle) + dy * Math.cos(car.angle));
      if (ahead > 0 && ahead < 70 && side < 30) { slow = true; break; }
    }
    const target = slow ? 0 : (car.cruise || 150);
    car.speed += Math.sign(target - car.speed) * 120 * dt;
    // At an intersection, sometimes turn onto the cross road.
    const nearV = ROADS_V.find((rx) => Math.abs(car.x - rx) < 12);
    const nearH = ROADS_H.find((ry) => Math.abs(car.y - ry) < 12);
    if (car.vertical && nearH && car.turnAt !== nearH) {
      car.turnAt = nearH;
      if (Math.random() < 0.35) {
        car.vertical = false;
        car.angle = Math.random() < 0.5 ? 0 : Math.PI;
        car.y = nearH + (Math.random() < 0.5 ? -22 : 22);
      }
    } else if (!car.vertical && nearV && car.turnAt !== nearV) {
      car.turnAt = nearV;
      if (Math.random() < 0.35) {
        car.vertical = true;
        car.angle = Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2;
        car.x = nearV + (Math.random() < 0.5 ? -22 : 22);
      }
    }
    car.x += Math.cos(car.angle) * car.speed * dt;
    car.y += Math.sin(car.angle) * car.speed * dt;
    // Wrap around the map edges so traffic never runs out.
    if (car.x < 40) { car.x = 3160; }
    if (car.x > 3160) { car.x = 40; }
    if (car.y < 40) { car.y = 2360; }
    if (car.y > 2360) { car.y = 40; }
    // Keep traffic cars on roads: if pushed off, steer back to nearest road.
    if (Math.abs(car.speed) > 1) {
      const onV = ROADS_V.some((rx) => Math.abs(car.x - rx) < ROAD_W / 2 + 10);
      const onH = ROADS_H.some((ry) => Math.abs(car.y - ry) < ROAD_W / 2 + 10);
      if (!onV && !onH) {
        // Drift back toward the road centre line of its axis.
        if (car.vertical) {
          const rx = ROADS_V.reduce((a, b) => (Math.abs(b - car.x) < Math.abs(a - car.x) ? b : a));
          car.x += Math.sign(rx - car.x) * 40 * dt;
        } else {
          const ry = ROADS_H.reduce((a, b) => (Math.abs(b - car.y) < Math.abs(a - car.y) ? b : a));
          car.y += Math.sign(ry - car.y) * 40 * dt;
        }
      }
    }
  }
  // Parked / player / cop cars do not move here.
}

export function updatePeds(G, dt) {
  const px = G.player.x; const py = G.player.y;
  const gunfire = G.bullets.length > 0;
  for (const ped of G.peds) {
    if (!ped.alive) continue;
    const d = dist(ped.x, ped.y, px, py);
    if (gunfire && d < 420) ped.flee = 2.5;
    if (ped.flee > 0) {
      ped.flee -= dt;
      const a = Math.atan2(ped.y - py, ped.x - px);
      moveCircle(G.city, ped, Math.cos(a) * 150 * dt, Math.sin(a) * 150 * dt, 10);
      ped.angle = a;
      continue;
    }
    if (ped.wait > 0) { ped.wait -= dt; continue; }
    const dx = ped.tx - ped.x; const dy = ped.ty - ped.y;
    const dd = Math.hypot(dx, dy);
    if (dd < 12) { ped.wait = 1 + Math.random() * 3; pickPedTarget(G, ped); continue; }
    ped.angle = Math.atan2(dy, dx);
    moveCircle(G.city, ped, (dx / dd) * ped.speed * dt, (dy / dd) * ped.speed * dt, 10);
  }
}
