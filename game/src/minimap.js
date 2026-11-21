// SOLMAR HEAT — minimap: the city shrunk to the corner — roads, water,
// the player, police, traffic and the mission blip.
import { WORLD_W, WORLD_H } from './config.js';
import { ROADS_V, ROADS_H, ROAD_W, MARINA } from './city.js';
import { missionTarget } from './missions.js';

export function drawMinimap(G) {
  const { ctx } = G.renderer;
  const vw = ctx.canvas.width; const vh = ctx.canvas.height;
  const size = 190;
  const x0 = 12; const y0 = vh - size - 12;
  const sx = size / WORLD_W; const sy = size / WORLD_H;
  ctx.save();
  ctx.fillStyle = 'rgba(8,12,18,0.72)';
  ctx.fillRect(x0 - 4, y0 - 4, size + 8, size + 8);
  ctx.strokeStyle = 'rgba(255,180,0,0.6)';
  ctx.strokeRect(x0 - 4.5, y0 - 4.5, size + 9, size + 9);
  ctx.beginPath();
  ctx.rect(x0, y0, size, size);
  ctx.clip();
  // Land, sea, marina.
  ctx.fillStyle = '#5d8a44';
  ctx.fillRect(x0, y0, size, size);
  ctx.fillStyle = '#2e7fa8';
  ctx.fillRect(x0, y0, 110 * sx, size);
  ctx.fillRect(x0 + MARINA.x * sx, y0 + MARINA.y * sy, MARINA.w * sx, MARINA.h * sy);
  // Roads.
  ctx.fillStyle = '#c9c4b4';
  for (const rx of ROADS_V) ctx.fillRect(x0 + rx * sx - 1, y0, 2, size);
  for (const ry of ROADS_H) ctx.fillRect(x0, y0 + ry * sy - 1, size, 2);
  // Mission blip (pulsing yellow diamond).
  const target = missionTarget(G);
  if (target) {
    const pulse = 3 + Math.sin(G.time * 5) * 1.5;
    ctx.fillStyle = '#ffb400';
    ctx.beginPath();
    ctx.moveTo(x0 + target.x * sx, y0 + target.y * sy - pulse - 3);
    ctx.lineTo(x0 + target.x * sx + pulse + 3, y0 + target.y * sy);
    ctx.lineTo(x0 + target.x * sx, y0 + target.y * sy + pulse + 3);
    ctx.lineTo(x0 + target.x * sx - pulse - 3, y0 + target.y * sy);
    ctx.closePath(); ctx.fill();
  }
  // Hideout blip.
  ctx.fillStyle = '#37d67a';
  ctx.fillRect(x0 + G.city.hideout.x * sx - 2, y0 + G.city.hideout.y * sy - 2, 4, 4);
  // Police blips (blue).
  ctx.fillStyle = '#4da3ff';
  for (const car of G.cars) {
    if (car.driver !== 'cop' || car.dead) continue;
    ctx.fillRect(x0 + car.x * sx - 2, y0 + car.y * sy - 2, 4, 4);
  }
  for (const cop of G.cops) {
    if (!cop.alive || cop.inCar) continue;
    ctx.fillRect(x0 + cop.x * sx - 2, y0 + cop.y * sy - 2, 3, 3);
  }
  // Traffic dots (grey).
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  for (const car of G.cars) {
    if (car.driver === 'cop' || car.dead || car.parked) continue;
    ctx.fillRect(x0 + car.x * sx - 1, y0 + car.y * sy - 1, 2, 2);
  }
  // Player arrow (white triangle, rotated to heading).
  const px = x0 + G.player.x * sx; const py = y0 + G.player.y * sy;
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(G.player.angle);
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.moveTo(7, 0); ctx.lineTo(-5, -5); ctx.lineTo(-5, 5);
  ctx.closePath(); ctx.fill();
  ctx.restore();
  // North label.
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText('N', x0 + size - 12, y0 + 14);
  ctx.restore();
}
