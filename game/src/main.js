// SOLMAR HEAT — boot and the one loop: input is read every frame, the world
// advances in fixed 1/60 s steps, and the renderer paints what is there.
// Screens: title, play, paused, busted. Progress auto-saves to localStorage.
//
// ?seed=N fixes the city. ?shot=cover|onfoot|mission|start (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { STEP, SAVE_KEY, WORLD_W, WORLD_H, clamp } from './config.js';
import { buildCity, solidAt, moveCircle } from './city.js';
import { createInput, ACTION_CONFIRM, ACTION_PAUSE, ACTION_MUTE } from './input.js';
import { createAudio } from './audio.js';
import { createPlayer, updatePlayer, respawn, nearestCar } from './player.js';
import { spawnTraffic, spawnPeds, updateTraffic, updatePeds } from './traffic.js';
import { updateWanted, updatePolice, addWanted } from './police.js';
import { createMissionState, updateMissions } from './missions.js';
import { updateBullets } from './combat.js';
import { createRenderer, draw, SCREEN_TITLE, SCREEN_PLAY, SCREEN_PAUSED, SCREEN_BUSTED } from './render.js';
import { drawHUD } from './hud.js';
import { drawMinimap } from './minimap.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 20261121;

const canvas = document.getElementById('game');
const status = document.getElementById('status');

export function createGame(seedValue) {
  const city = buildCity(seedValue);
  const G = {
    seed: seedValue,
    city,
    cityHelpers: { solidAt, moveCircle },
    police: { addWanted },
    player: createPlayer(city),
    cars: [],
    peds: [],
    cops: [],
    bullets: [],
    parts: [],
    floats: [],
    mission: createMissionState(),
    wanted: 0,
    crimeTimer: 0,
    coolTimer: 0,
    spawnCd: 0,
    discs: 0,
    time: 0,
    cam: { x: 0, y: 0 },
    screen: SCREEN_TITLE,
    banner: null,
    bustedInfo: null,
    hasSave: false,
    nearCar: null,
    solarisCar: null,
    audio: createAudio(),
    input: null,
    renderer: null,
    saveGame: null,
  };
  spawnTraffic(G);
  spawnPeds(G);
  return G;
}

const G = createGame(seed);
G.input = createInput(canvas);
G.renderer = createRenderer(canvas);

function readSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function applySave(save) {
  if (!save) return;
  const p = G.player;
  p.cash = save.cash || 0;
  p.hp = save.hp || 100;
  G.mission.index = save.missionIndex || 0;
  G.mission.stage = save.missionStage || 0;
  G.mission.allDone = !!save.allDone;
  G.discs = 0;
  for (const d of G.city.discs) {
    d.taken = (save.discsTaken || []).includes(d.id);
    if (d.taken) G.discs += 1;
  }
  for (let i = 0; i < G.city.crates.length; i += 1) {
    G.city.crates[i].taken = !!(save.cratesTaken || [])[i];
  }
  if (save.x !== undefined) { p.x = save.x; p.y = save.y; }
}

G.saveGame = function saveGame() {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify({
      cash: G.player.cash,
      hp: G.player.hp,
      missionIndex: G.mission.index,
      missionStage: G.mission.stage,
      allDone: G.mission.allDone,
      discsTaken: G.city.discs.filter((d) => d.taken).map((d) => d.id),
      cratesTaken: G.city.crates.map((c) => c.taken),
      x: G.player.x,
      y: G.player.y,
    }));
  } catch {
    // Storage can be off: progress then lasts this visit only.
  }
};

G.hasSave = !!readSave();

function updateCamera() {
  const vw = G.renderer.canvas.width; const vh = G.renderer.canvas.height;
  G.cam.x = clamp(G.player.x - vw / 2, 0, Math.max(0, WORLD_W - vw));
  G.cam.y = clamp(G.player.y - vh / 2, 0, Math.max(0, WORLD_H - vh));
}

function stepWorld(dt, actions) {
  G.time += dt;
  updatePlayer(G, dt, actions);
  updateTraffic(G, dt);
  updatePeds(G, dt);
  updateWanted(G, dt);
  updatePolice(G, dt);
  updateBullets(G, dt);
  updateMissions(G, dt);
  if (G.banner) {
    G.banner.t -= dt;
    if (G.banner.t <= 0) G.banner = null;
  }
  G.nearCar = G.player.onFoot ? nearestCar(G, 70) : null;
  updateCamera();
}

function runShot(name) {
  G.renderer.resize(); // canvas must be viewport-sized BEFORE staging, or the camera is wrong
  stageShot(name, G);
  let painted = 0;
  function paint() {
    draw(G);
    if (G.screen === SCREEN_PLAY) {
      drawMinimap(G);
      drawHUD(G);
    }
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  let accumulator = 0;
  let last = performance.now();
  let saveTimer = 0;

  function announce(message) {
    status.textContent = message;
  }

  function startGame(fresh) {
    G.audio.ensure();
    if (fresh) {
      const save = readSave();
      if (save) applySave(save);
    }
    G.screen = SCREEN_PLAY;
    G.banner = { text: fresh && readSave() ? 'Selamat datang kembali di Solmar!' : 'Mara Voss: ambil paket di Marina del Sol.', t: 4, color: '#ffb400' };
    announce('Playing Solmar Heat.');
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    const actions0 = G.input.takeActions();
    let actions = actions0;
    if (actions & ACTION_MUTE) {
      const muted = G.audio.toggleMute();
      G.banner = { text: muted ? 'Suara mati (M)' : 'Suara hidup (M)', t: 1.5, color: '#c9c4b4' };
    }
    if (G.screen === SCREEN_TITLE) {
      if (actions & ACTION_CONFIRM) startGame(true);
      // Ambient city life behind the title.
      while (accumulator >= STEP) {
        G.time += STEP;
        updateTraffic(G, STEP);
        updatePeds(G, STEP);
        updateCamera();
        accumulator -= STEP;
      }
    } else if (G.screen === SCREEN_PLAY) {
      if (actions & ACTION_PAUSE) {
        G.screen = SCREEN_PAUSED;
        announce('Paused.');
      } else {
        while (accumulator >= STEP) {
          stepWorld(STEP, actions);
          actions = 0; // one-shot actions apply to the first step only
          accumulator -= STEP;
        }
        saveTimer += 1;
        if (saveTimer > 600) { saveTimer = 0; G.saveGame(); }
      }
    } else if (G.screen === SCREEN_PAUSED) {
      if (actions & (ACTION_PAUSE | ACTION_CONFIRM)) {
        G.screen = SCREEN_PLAY;
        announce('Playing.');
      }
      accumulator = 0;
    } else if (G.screen === SCREEN_BUSTED) {
      if (actions & ACTION_CONFIRM) {
        respawn(G);
        announce('Back on the streets.');
      }
      accumulator = 0;
    }
    draw(G);
    if (G.screen === SCREEN_PLAY || G.screen === SCREEN_PAUSED) {
      drawMinimap(G);
      drawHUD(G);
    }
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && G.screen === SCREEN_PLAY) {
      G.screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Solmar Heat. Press Enter or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
