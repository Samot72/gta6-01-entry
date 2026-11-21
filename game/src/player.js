// SOLMAR HEAT — player: on-foot movement, driving, entering / stealing cars,
// shooting, punching, and the busted / respawn flow.
import { CAR_TYPES, clamp, dist, angleDiff } from './config.js';
import { moveCircle } from './city.js';
import { fireBullet, punch } from './combat.js';

export function createPlayer(city) {
  return {
    x: city.spawn.x, y: city.spawn.y, angle: -Math.PI / 2,
    hp: 100, cash: 0, speed: 0,
    inCar: null, // car object when driving, else null
    onFoot: true,
    shootCd: 0, punchCd: 0, hurtCd: 0,
    walkPhase: 0,
  };
}

export function nearestCar(G, maxD) {
  let best = null; let bestD = maxD;
  for (const car of G.cars) {
    if (car.dead) continue;
    const d = dist(G.player.x, G.player.y, car.x, car.y);
    if (d < bestD) { bestD = d; best = car; }
  }
  return best;
}

function enterCar(G, car) {
  const p = G.player;
  if (car.driver === 'cop') return false;
  if (car.parked) {
    car.parked = false;
    G.police.addWanted(G, 1);
    G.banner = { text: 'Mobil dicuri! Wanted +1', t: 2.5, color: '#ff3b30' };
    G.audio.cash();
  }
  car.driver = 'player';
  p.inCar = car;
  p.onFoot = false;
  p.x = car.x; p.y = car.y;
  return true;
}

function exitCar(G) {
  const p = G.player;
  const car = p.inCar;
  if (!car) return;
  car.driver = null;
  p.inCar = null;
  p.onFoot = true;
  const a = car.angle + Math.PI / 2;
  p.x = car.x + Math.cos(a) * 34;
  p.y = car.y + Math.sin(a) * 34;
  p.angle = car.angle;
  if (G.city && p.x < 0) p.x = car.x - Math.cos(a) * 34;
}

export function hurtPlayer(G, dmg) {
  const p = G.player;
  if (p.hurtCd > 0 || p.hp <= 0) return;
  p.hp -= dmg;
  p.hurtCd = 0.6;
  G.audio.crash();
  if (p.hp <= 0) {
    p.hp = 0;
    G.screen = 'busted';
    G.audio.busted();
    const lost = Math.floor(p.cash * 0.2);
    p.cash -= lost;
    G.bustedInfo = { lost };
    G.audio.setEngine(0, false);
  }
}

export function respawn(G) {
  const p = G.player;
  if (p.inCar) { p.inCar.driver = null; p.inCar = null; }
  p.onFoot = true;
  p.x = G.city.hospital.x; p.y = G.city.hospital.y + 60;
  p.hp = 100;
  G.wanted = 0;
  G.cops = [];
  G.bullets = [];
  G.screen = 'play';
  G.banner = { text: 'Kamu dibebaskan dari rumah sakit Solmar General', t: 3, color: '#37d67a' };
}

function driveCar(G, dt, axis) {
  const p = G.player;
  const car = p.inCar;
  const spec = CAR_TYPES[car.type];
  const handbrake = G.input.down('Space');
  const steer = axis.x;
  const gas = axis.y < 0 ? 1 : 0;
  const brake = axis.y > 0 ? 1 : 0;
  if (gas) car.speed += spec.accel * dt;
  if (brake) car.speed -= spec.accel * 1.4 * dt;
  if (!gas && !brake) car.speed -= Math.sign(car.speed) * 60 * dt;
  if (handbrake) car.speed -= Math.sign(car.speed) * 320 * dt;
  car.speed = clamp(car.speed, -spec.top * 0.45, spec.top);
  if (Math.abs(car.speed) < 4 && !gas) car.speed = 0;
  const grip = handbrake ? spec.grip * 0.45 : spec.grip;
  car.angle += steer * grip * dt * clamp(Math.abs(car.speed) / 120, 0, 1) * Math.sign(car.speed || 1);
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  // Building / water collision: stop and bounce a little.
  const before = { x: car.x, y: car.y };
  car.x = nx; car.y = ny;
  const hit = checkCarSolid(G, car);
  if (hit) {
    car.x = before.x; car.y = before.y;
    if (Math.abs(car.speed) > 180) {
      G.audio.crash();
      hurtPlayer(G, 6);
      G.parts.push({ x: car.x, y: car.y, vx: 0, vy: 0, life: 0.3, max: 0.3, color: '#ffd94d', size: 4 });
    }
    car.speed *= -0.25;
  }
  // Ram pedestrians.
  for (const ped of G.peds) {
    if (!ped.alive) continue;
    if (dist(car.x, car.y, ped.x, ped.y) < 26 && Math.abs(car.speed) > 60) {
      ped.alive = false;
      G.police.addWanted(G, 1);
      G.audio.crash();
      G.banner = { text: 'Kamu menabrak pejalan kaki! Wanted +1', t: 2, color: '#ff3b30' };
    }
  }
  // Bump other cars.
  for (const other of G.cars) {
    if (other === car || other.dead) continue;
    if (dist(car.x, car.y, other.x, other.y) < 40) {
      other.speed = (other.speed || 0) + car.speed * 0.2;
      car.speed *= 0.7;
      if (Math.abs(car.speed) > 150) G.audio.crash();
    }
  }
  p.x = car.x; p.y = car.y; p.angle = car.angle;
  G.audio.setEngine(Math.abs(car.speed) / spec.top, true);
}

function checkCarSolid(G, car) {
  // Sample the car's corners against buildings / water.
  const half = car.len / 2;
  const hw = car.wid / 2;
  for (const [lx, ly] of [[half, hw], [half, -hw], [-half, hw], [-half, -hw], [0, 0]]) {
    const wx = car.x + Math.cos(car.angle) * lx - Math.sin(car.angle) * ly;
    const wy = car.y + Math.sin(car.angle) * lx + Math.cos(car.angle) * ly;
    const { solidAt } = G.cityHelpers;
    if (solidAt(G.city, wx, wy, 4)) return true;
  }
  return false;
}

export function updatePlayer(G, dt, actions) {
  const p = G.player;
  const axis = G.input.moveAxis();
  p.shootCd -= dt; p.punchCd -= dt; p.hurtCd -= dt;
  if (p.inCar) {
    if (actions & 4) exitCar(G); // E
    else driveCar(G, dt, axis);
    return;
  }
  // On foot: aim at the mouse, move with WASD.
  const cam = G.cam;
  const wx = cam.x + G.input.mouse.x;
  const wy = cam.y + G.input.mouse.y;
  p.angle = Math.atan2(wy - p.y, wx - p.x);
  const speed = axis.run ? 260 : 150;
  const len = Math.hypot(axis.x, axis.y) || 1;
  const dx = (axis.x / len) * speed * dt * (axis.x || axis.y ? 1 : 0);
  const dy = (axis.y / len) * speed * dt * (axis.x || axis.y ? 1 : 0);
  moveCircle(G.city, p, dx, dy, 12);
  if (axis.x || axis.y) p.walkPhase += dt * (axis.run ? 14 : 9);
  p.speed = (axis.x || axis.y) ? speed : 0;
  G.audio.setEngine(0, false);
  if (actions & 4) { // E: enter nearest car
    const car = nearestCar(G, 70);
    if (car) enterCar(G, car);
  }
  if (actions & 8 && p.punchCd <= 0) { // F: punch
    p.punchCd = 0.45;
    punch(G);
  }
  if (G.input.mouse.down && p.shootCd <= 0) {
    p.shootCd = 0.22;
    fireBullet(G, p.x + Math.cos(p.angle) * 20, p.y + Math.sin(p.angle) * 20, p.angle, true);
    G.police.addWanted(G, 0); // shooting in public draws attention only when it hits
  }
  // Pickup Sun Discs.
  for (const d of G.city.discs) {
    if (d.taken) continue;
    if (dist(p.x, p.y, d.x, d.y) < 26) {
      d.taken = true;
      p.cash += 100;
      G.discs += 1;
      G.audio.pickup();
      G.banner = { text: `Sun Disc ${G.discs}/10 — +$100`, t: 2, color: '#ffd94d' };
    }
  }
  // Mission pickup radius is handled in missions.js.
}
