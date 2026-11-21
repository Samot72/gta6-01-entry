// SOLMAR HEAT — combat: bullets, muzzle particles, hit detection vs pedestrians,
// foot cops and cars, and the particle / floating-text effects the renderer draws.
import { dist } from './config.js';

export function addParticles(G, x, y, color, n, speed) {
  for (let i = 0; i < n; i += 1) {
    const a = Math.random() * Math.PI * 2;
    const s = (speed || 120) * (0.4 + Math.random() * 0.8);
    G.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.4 + Math.random() * 0.3, max: 0.7, color, size: 2 + Math.random() * 3 });
  }
}

export function addText(G, x, y, text, color) {
  G.floats.push({ x, y, text, color: color || '#fff', life: 1.2 });
}

export function fireBullet(G, x, y, angle, fromPlayer) {
  G.bullets.push({ x, y, vx: Math.cos(angle) * 950, vy: Math.sin(angle) * 950, life: 0.6, fromPlayer });
  addParticles(G, x + Math.cos(angle) * 18, y + Math.sin(angle) * 18, '#ffd94d', 3, 90);
  G.audio.shoot();
}

function hitCar(G, car, dmg, hx, hy) {
  car.hp -= dmg;
  addParticles(G, hx, hy, '#ffb400', 6, 140);
  if (car.hp <= 0 && !car.dead) {
    car.dead = true;
    addParticles(G, car.x, car.y, '#ff6b35', 26, 260);
    addParticles(G, car.x, car.y, '#333', 14, 120);
    addText(G, car.x, car.y - 30, 'BOOM!', '#ff6b35');
    G.audio.crash();
    if (car.driver === 'player') G.player.inCar = null;
  }
}

export function updateBullets(G, dt) {
  for (let i = G.bullets.length - 1; i >= 0; i -= 1) {
    const b = G.bullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    let dead = b.life <= 0;
    if (!dead) {
      // Hit a pedestrian / foot cop.
      for (const p of G.peds) {
        if (!p.alive) continue;
        if (dist(b.x, b.y, p.x, p.y) < 14) {
          p.hp -= 34;
          addParticles(G, b.x, b.y, '#ff3b30', 6, 120);
          if (p.hp <= 0) {
            p.alive = false;
            addParticles(G, p.x, p.y, '#ff3b30', 12, 160);
            if (b.fromPlayer && p.kind !== 'cop') G.police.addWanted(G, 1);
          }
          dead = true;
          break;
        }
      }
    }
    if (!dead) {
      for (const c of G.cops) {
        if (!c.alive || c.inCar) continue;
        if (dist(b.x, b.y, c.x, c.y) < 14) {
          c.hp -= 34;
          addParticles(G, b.x, b.y, '#ff3b30', 6, 120);
          if (c.hp <= 0) {
            c.alive = false;
            addParticles(G, c.x, c.y, '#ff3b30', 12, 160);
            if (b.fromPlayer) G.police.addWanted(G, 1);
          }
          dead = true;
          break;
        }
      }
    }
    if (!dead) {
      for (const car of G.cars) {
        if (car.dead) continue;
        const dx = b.x - car.x; const dy = b.y - car.y;
        const ca = Math.cos(-car.angle); const sa = Math.sin(-car.angle);
        const lx = dx * ca - dy * sa; const ly = dx * sa + dy * ca;
        if (Math.abs(lx) < car.len / 2 + 4 && Math.abs(ly) < car.wid / 2 + 4) {
          hitCar(G, car, 20, b.x, b.y);
          dead = true;
          break;
        }
      }
    }
    if (dead) G.bullets.splice(i, 1);
  }
  // Particles and floating texts age out.
  for (let i = G.parts.length - 1; i >= 0; i -= 1) {
    const p = G.parts[i];
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.vx *= 0.96; p.vy *= 0.96;
    p.life -= dt;
    if (p.life <= 0) G.parts.splice(i, 1);
  }
  for (let i = G.floats.length - 1; i >= 0; i -= 1) {
    const f = G.floats[i];
    f.y -= 30 * dt;
    f.life -= dt;
    if (f.life <= 0) G.floats.splice(i, 1);
  }
}

// Melee punch: hits the nearest pedestrian / cop in front of the player.
export function punch(G) {
  const p = G.player;
  G.audio.punch();
  addParticles(G, p.x + Math.cos(p.angle) * 26, p.y + Math.sin(p.angle) * 26, '#fff', 4, 100);
  let best = null; let bestD = 46;
  for (const ped of G.peds) {
    if (!ped.alive) continue;
    const d = dist(p.x, p.y, ped.x, ped.y);
    if (d < bestD) { bestD = d; best = ped; }
  }
  for (const c of G.cops) {
    if (!c.alive || c.inCar) continue;
    const d = dist(p.x, p.y, c.x, c.y);
    if (d < bestD) { bestD = d; best = c; }
  }
  if (best) {
    best.hp -= 25;
    best.x += Math.cos(p.angle) * 14;
    best.y += Math.sin(p.angle) * 14;
    if (best.hp <= 0) {
      best.alive = false;
      addParticles(G, best.x, best.y, '#ff3b30', 10, 150);
      if (best.kind !== 'cop') G.police.addWanted(G, 1);
      else G.police.addWanted(G, 1);
    }
  }
}
