// SOLMAR HEAT — police: wanted level, cop-car pursuit, foot cops, and the
// heat that cools down when the player hides.
import { dist, angleDiff, clamp } from './config.js';
import { makeCar } from './traffic.js';
import { nearestRoadPoint } from './city.js';
import { hurtPlayer } from './player.js';

export function addWanted(G, n) {
  if (n <= 0) return;
  G.wanted = clamp(G.wanted + n, 0, 5);
  G.crimeTimer = 0;
  G.coolTimer = 0;
}

export function updateWanted(G, dt) {
  if (G.wanted === 0) return;
  G.crimeTimer += dt;
  // Cool down only after 10 s without a crime and no cop close by.
  const copNear = G.cops.some((c) => c.alive && dist(c.x, c.y, G.player.x, G.player.y) < 420);
  if (G.crimeTimer > 10 && !copNear) {
    G.coolTimer += dt;
    if (G.coolTimer > 9) {
      G.wanted -= 1;
      G.coolTimer = 0;
      G.banner = { text: `Wanted turun ke ${G.wanted} bintang`, t: 2, color: '#37d67a' };
    }
  } else {
    G.coolTimer = 0;
  }
  // Spawn / despawn cop cars to match the wanted level.
  const wantCars = Math.min(G.wanted, 4);
  const haveCars = G.cars.filter((c) => c.driver === 'cop' && !c.dead).length;
  if (haveCars < wantCars && G.spawnCd <= 0) {
    spawnCopCar(G);
    G.spawnCd = 2.5;
  }
  G.spawnCd -= dt;
  // Foot cops from wanted 2 up.
  const wantFoot = G.wanted >= 2 ? Math.min(G.wanted - 1, 3) : 0;
  const haveFoot = G.cops.filter((c) => c.alive && !c.inCar).length;
  if (haveFoot < wantFoot && G.spawnCd <= 0) {
    spawnFootCop(G);
    G.spawnCd = 2.5;
  }
}

function spawnCopCar(G) {
  const p = G.player;
  const spot = nearestRoadPoint(p.x + (Math.random() - 0.5) * 900, p.y + (Math.random() - 0.5) * 900);
  const car = makeCar(spot.x, spot.y, Math.atan2(p.y - spot.y, p.x - spot.x), 'cop', { driver: 'cop' });
  car.speed = 200;
  car.siren = true;
  G.cars.push(car);
  return car;
}

function spawnFootCop(G) {
  const p = G.player;
  const a = Math.random() * Math.PI * 2;
  const cop = {
    x: p.x + Math.cos(a) * 320, y: p.y + Math.sin(a) * 320,
    angle: 0, hp: 100, alive: true, kind: 'cop', inCar: false,
    speed: 150, shootCd: 1 + Math.random(),
  };
  G.cops.push(cop);
  return cop;
}

export function updatePolice(G, dt) {
  const p = G.player;
  // Cop cars chase the player and ram.
  for (const car of G.cars) {
    if (car.driver !== 'cop' || car.dead) continue;
    const target = Math.atan2(p.y - car.y, p.x - car.x);
    const diff = angleDiff(car.angle, target);
    car.angle += clamp(diff, -2.4 * dt, 2.4 * dt);
    const want = 380 + G.wanted * 20;
    car.speed += Math.sign(want - car.speed) * 260 * dt;
    const nx = car.x + Math.cos(car.angle) * car.speed * dt;
    const ny = car.y + Math.sin(car.angle) * car.speed * dt;
    const { solidAt } = G.cityHelpers;
    if (!solidAt(G.city, nx, ny, 12)) { car.x = nx; car.y = ny; }
    else { car.angle += 0.9 * dt * 10; car.speed *= 0.9; }
    if (dist(car.x, car.y, p.x, p.y) < 46) {
      // Ram: damage the player, shove their car.
      if (p.inCar) {
        p.inCar.speed *= 0.6;
        if (Math.abs(p.inCar.speed) > 60 || true) hurtPlayer(G, 4);
      } else {
        hurtPlayer(G, 8);
      }
      car.speed *= 0.4;
      car.x -= Math.cos(car.angle) * 20;
      car.y -= Math.sin(car.angle) * 20;
    }
  }
  // Foot cops chase on foot and shoot when close.
  for (const cop of G.cops) {
    if (!cop.alive || cop.inCar) continue;
    const d = dist(cop.x, cop.y, p.x, p.y);
    const a = Math.atan2(p.y - cop.y, p.x - cop.x);
    cop.angle = a;
    if (d > 34) {
      const { moveCircle } = G.cityHelpers;
      moveCircle(G.city, cop, Math.cos(a) * cop.speed * dt, Math.sin(a) * cop.speed * dt, 10);
    } else if (!p.inCar) {
      // Caught on foot: busted pressure.
      hurtPlayer(G, 10 * dt * 2);
    }
    cop.shootCd -= dt;
    if (d < 380 && d > 60 && cop.shootCd <= 0) {
      cop.shootCd = 1.4;
      // Cop fires at the player (inaccurate).
      const spread = (Math.random() - 0.5) * 0.35;
      G.bullets.push({
        x: cop.x + Math.cos(a) * 20, y: cop.y + Math.sin(a) * 20,
        vx: Math.cos(a + spread) * 700, vy: Math.sin(a + spread) * 700,
        life: 0.7, fromPlayer: false, copBullet: true,
      });
      G.audio.shoot();
    }
  }
  // Cop bullets that reach the player hurt them.
  for (let i = G.bullets.length - 1; i >= 0; i -= 1) {
    const b = G.bullets[i];
    if (!b.copBullet) continue;
    if (dist(b.x, b.y, p.x, p.y) < 16) {
      hurtPlayer(G, 7);
      G.bullets.splice(i, 1);
    }
  }
  // Siren sound while any cop car lives.
  const siren = G.cars.some((c) => c.driver === 'cop' && !c.dead);
  G.audio.setSiren(siren && G.wanted > 0, dt);
}
