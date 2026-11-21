// SOLMAR HEAT — missions: the 3-mission Mara Voss story chain, objective
// markers, crate pickups, rewards, and mission completion.
import { MISSIONS, dist } from './config.js';

export function createMissionState() {
  return { index: 0, stage: 0, done: false, allDone: false, carrying: false };
}

// World position of the current objective target.
export function missionTarget(G) {
  const m = G.mission;
  if (m.allDone) return null;
  const def = MISSIONS[m.index];
  if (!def) return null;
  const key = def.stages[m.stage].target;
  const c = G.city;
  switch (key) {
    case 'marina': return { x: c.marinaPickup.x, y: c.marinaPickup.y, label: 'Marina del Sol' };
    case 'coral': return { x: c.coralDrop.x, y: c.coralDrop.y, label: 'Coral Row' };
    case 'solaris': return { x: c.solarisSpot.x, y: c.solarisSpot.y, label: 'Solaris GT' };
    case 'hideout': return { x: c.hideout.x, y: c.hideout.y, label: 'Hideout' };
    case 'crate1': return { x: c.crates[0].x, y: c.crates[0].y, label: 'Peti 1' };
    case 'crate2': return { x: c.crates[1].x, y: c.crates[1].y, label: 'Peti 2' };
    case 'crate3': return { x: c.crates[2].x, y: c.crates[2].y, label: 'Peti 3' };
    default: return null;
  }
}

export function objectiveText(G) {
  const m = G.mission;
  if (m.allDone) return 'Semua misi selesai — Solmar milikmu. Jelajahi kota, kumpulkan Sun Disc!';
  const def = MISSIONS[m.index];
  return `${def.title}: ${def.stages[m.stage].text}`;
}

function advanceStage(G) {
  const m = G.mission;
  const def = MISSIONS[m.index];
  m.stage += 1;
  G.audio.mission();
  if (m.stage >= def.stages.length) {
    // Mission complete: pay out, start the next one.
    G.player.cash += def.reward;
    G.banner = { text: `${def.title} SELESAI — +$${def.reward}`, t: 3.5, color: '#37d67a' };
    G.audio.cash();
    m.index += 1;
    m.stage = 0;
    m.carrying = false;
    if (m.index >= MISSIONS.length) {
      m.allDone = true;
      G.banner = { text: 'SEMUA MISI SELESAI! Mara Voss bangga padamu.', t: 5, color: '#ffd94d' };
    } else {
      const next = MISSIONS[m.index];
      G.banner = { text: `Misi baru: ${next.title} — ${next.brief}`, t: 5, color: '#ffb400' };
    }
    G.saveGame();
  } else {
    G.saveGame();
  }
}

export function updateMissions(G, dt) {
  const m = G.mission;
  if (m.allDone) return;
  const def = MISSIONS[m.index];
  const key = def.stages[m.stage].target;
  const t = missionTarget(G);
  if (!t) return;
  const p = G.player;
  const d = dist(p.x, p.y, t.x, t.y);
  // Mission 2 stage 2: reaching the hideout only counts while wanted is 3+.
  if (key === 'hideout' && m.index === 1 && G.wanted < 3) {
    // Still allow arrival but the getaway only completes at wanted 3.
    if (d < 90) {
      G.banner = { text: 'Kabur dulu sampai wanted 3, baru ke hideout!', t: 2, color: '#ffb400' };
    }
    return;
  }
  if (d > 90) return;
  if (key === 'marina') {
    m.carrying = true;
    G.audio.pickup();
    G.banner = { text: 'Paket didapat! Antar ke Coral Row.', t: 2.5, color: '#37d67a' };
    advanceStage(G);
    return;
  }
  if (key === 'solaris') {
    // Must be inside the Solaris GT itself.
    if (p.inCar && p.inCar.solaris) {
      G.police.addWanted(G, 3);
      G.banner = { text: 'Solaris GT dicuri! Wanted 3 — kabur ke hideout!', t: 3, color: '#ff3b30' };
      advanceStage(G);
    } else {
      G.banner = { text: 'Naik ke Solaris GT (tekan E di dekatnya)!', t: 2, color: '#ffb400' };
    }
    return;
  }
  if (key === 'crate1' || key === 'crate2' || key === 'crate3') {
    const ci = Number(key.slice(-1)) - 1;
    const crate = G.city.crates[ci];
    if (!crate.taken) {
      crate.taken = true;
      m.carrying = true;
      G.audio.pickup();
      G.police.addWanted(G, 1);
      G.banner = { text: `Peti ${ci + 1}/3 didapat! Polisi datang!`, t: 2.5, color: '#ff3b30' };
      advanceStage(G);
    }
    return;
  }
  // Plain arrivals: coral drop, hideout.
  advanceStage(G);
}
