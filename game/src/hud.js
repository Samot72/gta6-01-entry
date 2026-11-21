// SOLMAR HEAT — hud: health bar, cash, wanted stars, objective text,
// mission banner, speedometer, control hints, and the compass arrow to the target.
import { COLORS, MISSIONS } from './config.js';
import { missionTarget, objectiveText } from './missions.js';
import { angleDiff } from './config.js';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function drawHUD(G) {
  const { ctx } = G.renderer;
  const vw = ctx.canvas.width; const vh = ctx.canvas.height;
  const p = G.player;
  ctx.textAlign = 'left';
  // Top-left: health + cash + discs.
  ctx.fillStyle = COLORS.hudBg;
  roundRect(ctx, 12, 12, 250, 74, 8);
  ctx.fill();
  ctx.fillStyle = '#f5f2e8';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText('KESEHATAN', 24, 34);
  ctx.fillStyle = '#333';
  ctx.fillRect(24, 42, 180, 12);
  ctx.fillStyle = p.hp > 50 ? '#37d67a' : p.hp > 25 ? '#ffb400' : '#ff3b30';
  ctx.fillRect(24, 42, 180 * (p.hp / 100), 12);
  ctx.fillStyle = '#37d67a';
  ctx.font = 'bold 17px sans-serif';
  ctx.fillText(`$${p.cash}`, 24, 76);
  ctx.fillStyle = '#ffd94d';
  ctx.font = '14px sans-serif';
  ctx.fillText(`☀ ${G.discs}/10`, 130, 76);
  // Top-right: wanted stars.
  ctx.fillStyle = COLORS.hudBg;
  roundRect(ctx, vw - 212, 12, 200, 46, 8);
  ctx.fill();
  ctx.font = '24px sans-serif';
  for (let i = 0; i < 5; i += 1) {
    ctx.fillStyle = i < G.wanted ? '#ffb400' : 'rgba(255,255,255,0.25)';
    ctx.fillText('★', vw - 196 + i * 36, 44);
  }
  // Mission name, top centre.
  if (!G.mission.allDone) {
    const def = MISSIONS[G.mission.index];
    ctx.textAlign = 'center';
    ctx.fillStyle = COLORS.hudBg;
    roundRect(ctx, vw / 2 - 170, 12, 340, 30, 8);
    ctx.fill();
    ctx.fillStyle = '#ffb400';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText(`${def.title} — ${def.giver}`, vw / 2, 32);
    ctx.textAlign = 'left';
  }
  // Bottom-centre: objective + compass arrow + distance.
  const target = missionTarget(G);
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.hudBg;
  roundRect(ctx, vw / 2 - 320, vh - 64, 640, 44, 8);
  ctx.fill();
  ctx.fillStyle = '#f5f2e8';
  ctx.font = '15px sans-serif';
  let obj = objectiveText(G);
  if (target) {
    const d = Math.hypot(target.x - p.x, target.y - p.y);
    const ang = Math.atan2(target.y - p.y, target.x - p.x);
    const rel = angleDiff(p.angle, ang);
    const arrow = rel > 0.6 ? '↱' : rel < -0.6 ? '↰' : rel > 0.15 ? '→' : rel < -0.15 ? '←' : '↑';
    obj += `   ${arrow} ${Math.round(d)}m`;
  }
  ctx.fillText(obj, vw / 2, vh - 36);
  ctx.textAlign = 'left';
  // Speedometer while driving.
  if (p.inCar) {
    const car = p.inCar;
    const kmh = Math.round(Math.abs(car.speed) * 0.55);
    ctx.fillStyle = COLORS.hudBg;
    roundRect(ctx, vw - 150, vh - 124, 138, 76, 8);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 30px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${kmh}`, vw - 46, vh - 80);
    ctx.font = '13px sans-serif';
    ctx.fillStyle = '#c9c4b4';
    ctx.fillText('km/h', vw - 24, vh - 80);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffb400';
    ctx.font = '13px sans-serif';
    ctx.fillText(car.solaris ? 'SOLARIS GT' : 'MOBIL', vw - 138, vh - 58);
  }
  // Banner (mission events).
  if (G.banner && G.banner.t > 0) {
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(8,12,18,0.78)';
    const w = Math.min(680, ctx.measureText(G.banner.text).width + 48);
    roundRect(ctx, vw / 2 - w / 2, 100, w, 40, 8);
    ctx.fill();
    ctx.fillStyle = G.banner.color || '#fff';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(G.banner.text, vw / 2, 126);
    ctx.textAlign = 'left';
  }
  // Bottom-right hints.
  ctx.fillStyle = 'rgba(8,12,18,0.55)';
  roundRect(ctx, vw - 268, vh - 30, 256, 20, 6);
  ctx.fill();
  ctx.fillStyle = '#c9c4b4';
  ctx.font = '12px sans-serif';
  ctx.fillText(p.inCar ? 'W/S gas-rem • A/D setir • Space rem tangan • E keluar' : 'WASD jalan • Klik tembak • F pukul • E naik mobil', vw - 260, vh - 16);
  // "Near car" prompt.
  if (p.onFoot && G.nearCar) {
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(`Tekan E — naik ${G.nearCar.solaris ? 'Solaris GT' : 'mobil'}`, vw / 2, vh - 84);
    ctx.textAlign = 'left';
  }
}
