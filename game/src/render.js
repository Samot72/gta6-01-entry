// SOLMAR HEAT — render: camera, world drawing (ground, roads, buildings,
// beach, marina, palms), entities (cars, pedestrians, player, bullets,
// particles), markers, and the title / pause / busted screens.
import { WORLD_W, WORLD_H, COLORS, MISSIONS } from './config.js';
import { ROADS_V, ROADS_H, ROAD_W, MARINA, WATER_X, BEACH_X } from './city.js';
import { missionTarget } from './missions.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_BUSTED = 'busted';

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  function resize() {
    const w = window.innerWidth; const h = window.innerHeight;
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  }
  return { ctx, canvas, resize };
}

function drawCar(ctx, car) {
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(-car.len / 2 + 3, -car.wid / 2 + 4, car.len, car.wid);
  ctx.fillStyle = car.dead ? '#222' : car.color;
  ctx.fillRect(-car.len / 2, -car.wid / 2, car.len, car.wid);
  // Cabin + windshield.
  ctx.fillStyle = 'rgba(20,30,40,0.85)';
  ctx.fillRect(-car.len / 6, -car.wid / 2 + 4, car.len / 3, car.wid - 8);
  ctx.fillStyle = '#cfe8ff';
  ctx.fillRect(car.len / 4, -car.wid / 2 + 5, 6, car.wid - 10);
  // Headlights / taillights.
  ctx.fillStyle = '#ffe9a8';
  ctx.fillRect(car.len / 2 - 2, -car.wid / 2 + 2, 2, 5);
  ctx.fillRect(car.len / 2 - 2, car.wid / 2 - 7, 2, 5);
  ctx.fillStyle = '#ff3b30';
  ctx.fillRect(-car.len / 2, -car.wid / 2 + 2, 2, 5);
  ctx.fillRect(-car.len / 2, car.wid / 2 - 7, 2, 5);
  if (car.driver === 'cop') {
    // Police livery: white doors, light bar.
    ctx.fillStyle = '#e8e8e8';
    ctx.fillRect(-car.len / 6, -car.wid / 2, car.len / 3, car.wid);
    ctx.fillStyle = '#ff3b30';
    ctx.fillRect(-6, -car.wid / 2 - 2, 6, 6);
    ctx.fillStyle = '#2e7fd9';
    ctx.fillRect(0, -car.wid / 2 - 2, 6, 6);
  }
  if (car.solaris) {
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 9px sans-serif';
    ctx.fillText('GT', -6, 3);
  }
  ctx.restore();
}

function drawPerson(ctx, x, y, angle, color, walkPhase, isCop) {
  ctx.save();
  ctx.translate(x, y);
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.ellipse(0, 6, 9, 4, 0, 0, Math.PI * 2); ctx.fill();
  const bob = Math.sin(walkPhase || 0) * 1.5;
  ctx.rotate(angle);
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill(); // body
  ctx.fillStyle = '#f2c89b';
  ctx.beginPath(); ctx.arc(10, 0, 5, 0, Math.PI * 2); ctx.fill(); // head
  ctx.fillStyle = '#222';
  ctx.fillRect(4 + bob, -7, 5, 3); // arm hint
  ctx.fillRect(4 - bob, 4, 5, 3);
  if (isCop) {
    ctx.fillStyle = '#1c2733';
    ctx.beginPath(); ctx.arc(10, 0, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2e7fd9';
    ctx.fillRect(6, -5, 8, 3);
  }
  ctx.restore();
}

export function drawWorld(G, ctx) {
  const cam = G.cam;
  const vw = ctx.canvas.width; const vh = ctx.canvas.height;
  // Ground: grass.
  ctx.fillStyle = COLORS.grass;
  ctx.fillRect(0, 0, vw, vh);
  // Mow stripes for texture.
  ctx.fillStyle = COLORS.grassDark;
  const stripe = 160;
  const x0 = -((cam.x % (stripe * 2)) + stripe * 2) % (stripe * 2);
  for (let x = x0; x < vw; x += stripe * 2) ctx.fillRect(x, 0, stripe, vh);
  ctx.save();
  ctx.translate(-cam.x, -cam.y);
  // Sea + sand (west edge).
  ctx.fillStyle = COLORS.waterDeep;
  ctx.fillRect(0, 0, WATER_X, WORLD_H);
  ctx.fillStyle = COLORS.water;
  ctx.fillRect(WATER_X, 0, 40, WORLD_H);
  ctx.fillStyle = COLORS.sand;
  ctx.fillRect(WATER_X + 40, 0, BEACH_X - WATER_X - 40, WORLD_H);
  // Marina basin.
  ctx.fillStyle = COLORS.water;
  ctx.fillRect(MARINA.x, MARINA.y, MARINA.w, MARINA.h);
  ctx.fillStyle = COLORS.waterDeep;
  ctx.fillRect(MARINA.x + 14, MARINA.y + 14, MARINA.w - 28, MARINA.h - 28);
  // Roads.
  ctx.fillStyle = COLORS.road;
  for (const rx of ROADS_V) ctx.fillRect(rx - ROAD_W / 2, 0, ROAD_W, WORLD_H);
  for (const ry of ROADS_H) ctx.fillRect(0, ry - ROAD_W / 2, WORLD_W, ROAD_W);
  // Sidewalks.
  ctx.fillStyle = COLORS.sidewalk;
  for (const rx of ROADS_V) {
    ctx.fillRect(rx - ROAD_W / 2 - 14, 0, 8, WORLD_H);
    ctx.fillRect(rx + ROAD_W / 2 + 6, 0, 8, WORLD_H);
  }
  for (const ry of ROADS_H) {
    ctx.fillRect(0, ry - ROAD_W / 2 - 14, WORLD_W, 8);
    ctx.fillRect(0, ry + ROAD_W / 2 + 6, WORLD_W, 8);
  }
  // Centre dashes.
  ctx.fillStyle = COLORS.roadLine;
  for (const rx of ROADS_V) {
    for (let y = 20; y < WORLD_H; y += 70) ctx.fillRect(rx - 3, y, 6, 34);
  }
  for (const ry of ROADS_H) {
    for (let x = 20; x < WORLD_W; x += 70) ctx.fillRect(x, ry - 3, 34, 6);
  }
  // District labels on the ground.
  ctx.font = 'bold 26px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillText('PALMETTO BEACH', 180, 700);
  ctx.fillText('CORAL ROW', 700, 180);
  ctx.fillText('OLD SOLMAR', 700, 1300);
  ctx.fillText('HARBOR DISTRICT', 1700, 1750);
  ctx.fillText('MARINA DEL SOL', 2560, 1980);
  // Marina docks + boats.
  ctx.fillStyle = '#8a6f4d';
  for (let i = 0; i < 4; i += 1) ctx.fillRect(MARINA.x + 40 + i * 160, MARINA.y + 40, 14, 130);
  for (const b of G.city.boats) {
    ctx.save();
    ctx.translate(b.x, b.y); ctx.rotate(b.angle);
    ctx.fillStyle = b.color;
    ctx.fillRect(-26, -9, 52, 18);
    ctx.fillStyle = '#2e7fa8';
    ctx.fillRect(-8, -14, 6, 10);
    ctx.restore();
  }
  // Buildings with roofs, windows and a drop shadow.
  for (const b of G.city.buildings) {
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.fillRect(b.x + 6, b.y + 8, b.w, b.h);
    ctx.fillStyle = b.roof;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.strokeRect(b.x + 1, b.y + 1, b.w - 2, b.h - 2);
    ctx.fillStyle = 'rgba(255,255,220,0.75)';
    const cols = Math.max(1, Math.floor(b.w / 34));
    const rows = Math.max(1, Math.floor(b.h / 34));
    for (let cx = 0; cx < cols; cx += 1) {
      for (let cy = 0; cy < rows; cy += 1) {
        if ((cx * 7 + cy * 3 + b.w) % 3 === 0) continue;
        ctx.fillRect(b.x + 10 + cx * 34, b.y + 10 + cy * 34, 12, 12);
      }
    }
    if (b.tall) {
      ctx.fillStyle = 'rgba(255,255,255,0.16)';
      ctx.fillRect(b.x + 8, b.y + 8, b.w - 16, 10);
    }
  }
  // Hideout + hospital markers on the ground.
  ctx.fillStyle = '#37d67a';
  ctx.fillRect(G.city.hideout.x - 30, G.city.hideout.y - 30, 60, 60);
  ctx.fillStyle = '#123';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText('HIDEOUT', G.city.hideout.x - 28, G.city.hideout.y + 4);
  ctx.fillStyle = '#fff';
  ctx.fillRect(G.city.hospital.x - 26, G.city.hospital.y - 26, 52, 52);
  ctx.fillStyle = '#ff3b30';
  ctx.fillRect(G.city.hospital.x - 5, G.city.hospital.y - 16, 10, 32);
  ctx.fillRect(G.city.hospital.x - 16, G.city.hospital.y - 5, 32, 10);
  // Palms.
  for (const palm of G.city.palms) {
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.ellipse(palm.x + 3, palm.y + 5, 10, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#7a5a34'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(palm.x, palm.y + 8); ctx.lineTo(palm.x, palm.y - 12); ctx.stroke();
    ctx.fillStyle = '#2e9e4f';
    for (let i = 0; i < 5; i += 1) {
      const a = (i / 5) * Math.PI * 2 + 0.4;
      ctx.beginPath();
      ctx.ellipse(palm.x + Math.cos(a) * 12, palm.y - 14 + Math.sin(a) * 7, 12, 4, a, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Sun Discs.
  for (const d of G.city.discs) {
    if (d.taken) continue;
    const pulse = 1 + Math.sin(G.time * 3 + d.id) * 0.12;
    ctx.save();
    ctx.translate(d.x, d.y); ctx.scale(pulse, pulse);
    ctx.fillStyle = '#ffd94d';
    ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ff8c00';
    ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  // Harbour crates.
  for (const c of G.city.crates) {
    if (c.taken) continue;
    ctx.fillStyle = '#b07a2a';
    ctx.fillRect(c.x - 14, c.y - 14, 28, 28);
    ctx.strokeStyle = '#5e3d10'; ctx.lineWidth = 2;
    ctx.strokeRect(c.x - 14, c.y - 14, 28, 28);
    ctx.beginPath(); ctx.moveTo(c.x - 14, c.y - 14); ctx.lineTo(c.x + 14, c.y + 14); ctx.stroke();
  }
  // Mission marker: pulsing ring + bouncing arrow.
  const target = missionTarget(G);
  if (target) {
    const pulse = 1 + Math.sin(G.time * 4) * 0.15;
    ctx.save();
    ctx.translate(target.x, target.y);
    ctx.strokeStyle = '#ffb400'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(0, 0, 26 * pulse, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#ffb400';
    const bob = Math.sin(G.time * 4) * 6;
    ctx.beginPath();
    ctx.moveTo(0, -52 + bob); ctx.lineTo(-10, -34 + bob); ctx.lineTo(10, -34 + bob);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  // Cars.
  for (const car of G.cars) {
    if (car.dead) continue;
    drawCar(ctx, car);
  }
  // Wrecked cars as dark hulks.
  for (const car of G.cars) {
    if (!car.dead) continue;
    ctx.save();
    ctx.translate(car.x, car.y); ctx.rotate(car.angle);
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(-car.len / 2, -car.wid / 2, car.len, car.wid);
    ctx.restore();
  }
  // Pedestrians.
  for (const ped of G.peds) {
    if (!ped.alive) continue;
    drawPerson(ctx, ped.x, ped.y, ped.angle, ped.color, G.time * 8);
  }
  // Foot cops.
  for (const cop of G.cops) {
    if (!cop.alive || cop.inCar) continue;
    drawPerson(ctx, cop.x, cop.y, cop.angle, '#1c2733', G.time * 10, true);
  }
  // Player (on foot only; in a car the car is the player).
  const p = G.player;
  if (p.onFoot) drawPerson(ctx, p.x, p.y, p.angle, '#ff5a5a', p.walkPhase, false);
  // Aim line on foot.
  if (p.onFoot && G.screen === 'play') {
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.setLineDash([6, 8]);
    ctx.beginPath();
    ctx.moveTo(p.x + Math.cos(p.angle) * 22, p.y + Math.sin(p.angle) * 22);
    ctx.lineTo(p.x + Math.cos(p.angle) * 60, p.y + Math.sin(p.angle) * 60);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  // Bullets.
  for (const b of G.bullets) {
    ctx.strokeStyle = '#ffe9a8'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(b.x - b.vx * 0.012, b.y - b.vy * 0.012); ctx.lineTo(b.x, b.y); ctx.stroke();
  }
  // Particles.
  for (const pt of G.parts) {
    ctx.globalAlpha = Math.max(0, pt.life / pt.max);
    ctx.fillStyle = pt.color;
    ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  // Floating texts.
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'center';
  for (const f of G.floats) {
    ctx.globalAlpha = Math.max(0, f.life / 1.2);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
  ctx.restore();
}

export function drawTitle(G, ctx) {
  const vw = ctx.canvas.width; const vh = ctx.canvas.height;
  ctx.fillStyle = 'rgba(6,10,16,0.55)';
  ctx.fillRect(0, 0, vw, vh);
  const cx = vw / 2;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffb400';
  ctx.font = 'bold 84px sans-serif';
  ctx.fillText('SOLMAR', cx, vh * 0.32);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 84px sans-serif';
  ctx.fillText('HEAT', cx, vh * 0.32 + 86);
  ctx.fillStyle = '#ffd94d';
  ctx.font = '20px sans-serif';
  ctx.fillText('Kota pantai. Uang cepat. Polisi di mana-mana.', cx, vh * 0.32 + 128);
  ctx.fillStyle = '#f5f2e8';
  ctx.font = '17px sans-serif';
  ctx.fillText('Mara Voss butuh orang yang bisa diandalkan. Tiga misi, satu kota, tanpa ampun.', cx, vh * 0.52);
  ctx.fillText('Curi mobil. Kabur dari polisi. Jadi legenda Solmar.', cx, vh * 0.52 + 26);
  ctx.font = '15px sans-serif';
  ctx.fillStyle = '#c9c4b4';
  ctx.fillText('WASD jalan / nyetir  •  Mouse aim, klik tembak  •  F pukul  •  E masuk/keluar mobil', cx, vh * 0.62);
  ctx.fillText('Shift lari  •  Space handbrake  •  Esc jeda  •  M bisu  •  Kumpulkan 10 Sun Disc', cx, vh * 0.62 + 24);
  const blink = Math.sin(G.time * 4) > 0;
  if (blink) {
    ctx.fillStyle = '#ffb400';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText(G.hasSave ? 'KLIK UNTUK LANJUT / ENTER — ada save tersimpan' : 'KLIK UNTUK MULAI / ENTER', cx, vh * 0.74);
  }
  ctx.font = '13px sans-serif';
  ctx.fillStyle = '#8a8f98';
  ctx.fillText('Game orisinal — kota Solmar, semua nama dan cerita dibuat sendiri.', cx, vh - 24);
  ctx.textAlign = 'left';
}

export function drawPaused(G, ctx) {
  const vw = ctx.canvas.width; const vh = ctx.canvas.height;
  ctx.fillStyle = 'rgba(6,10,16,0.66)';
  ctx.fillRect(0, 0, vw, vh);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 52px sans-serif';
  ctx.fillText('JEDA', vw / 2, vh / 2 - 20);
  ctx.font = '18px sans-serif';
  ctx.fillStyle = '#c9c4b4';
  ctx.fillText('Esc / klik untuk lanjut  •  Progres tersimpan otomatis', vw / 2, vh / 2 + 22);
  ctx.textAlign = 'left';
}

export function drawBusted(G, ctx) {
  const vw = ctx.canvas.width; const vh = ctx.canvas.height;
  ctx.fillStyle = 'rgba(20,4,6,0.72)';
  ctx.fillRect(0, 0, vw, vh);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff3b30';
  ctx.font = 'bold 72px sans-serif';
  ctx.fillText('BUSTED!', vw / 2, vh / 2 - 30);
  ctx.fillStyle = '#f5f2e8';
  ctx.font = '20px sans-serif';
  ctx.fillText(`Polisi Solmar menangkapmu. Denda $${G.bustedInfo ? G.bustedInfo.lost : 0} dipotong dari kantongmu.`, vw / 2, vh / 2 + 12);
  ctx.fillStyle = '#ffb400';
  ctx.font = 'bold 22px sans-serif';
  if (Math.sin(G.time * 4) > 0) ctx.fillText('KLIK / ENTER — bangun di rumah sakit', vw / 2, vh / 2 + 56);
  ctx.textAlign = 'left';
}

export function draw(G) {
  const { ctx } = G.renderer;
  G.renderer.resize();
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  drawWorld(G, ctx);
  if (G.screen === 'title') drawTitle(G, ctx);
  else if (G.screen === 'paused') drawPaused(G, ctx);
  else if (G.screen === 'busted') drawBusted(G, ctx);
}
