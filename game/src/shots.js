// SOLMAR HEAT — shots: the four ?shot= scenes. Each one stages a real game
// state (player, cars, cops, mission) and plays the real systems forward
// (traffic, pedestrians, police chase) for a fixed number of steps from a
// fixed seed, so the frame is what a short game really looks like.
import { STEP, WORLD_W, WORLD_H, clamp } from './config.js';
import { updateTraffic, updatePeds } from './traffic.js';
import { updatePolice } from './police.js';
import { updateBullets } from './combat.js';
import { makeCar } from './traffic.js';
import { SCREEN_TITLE, SCREEN_PLAY } from './render.js';

const SAMPLE = STEP;

function updateCamera(G) {
  G.renderer.resize();
  const vw = G.renderer.canvas.width; const vh = G.renderer.canvas.height;
  G.cam.x = clamp(G.player.x - vw / 2, 0, WORLD_W - vw);
  G.cam.y = clamp(G.player.y - vh / 2, 0, WORLD_H - vh);
}

function stepAmbient(G, dt) {
  G.time += dt;
  updateTraffic(G, dt);
  updatePeds(G, dt);
  updatePolice(G, dt);
  updateBullets(G, dt);
  if (G.banner) G.banner.t -= dt;
  updateCamera(G);
}

// Put the player in a car at (x, y) heading `angle`, moving at `speed`.
function putPlayerInCar(G, x, y, angle, speed, type) {
  const car = makeCar(x, y, angle, type, { driver: 'player' });
  car.speed = speed;
  G.cars.push(car);
  G.player.inCar = car;
  G.player.onFoot = false;
  G.player.x = x; G.player.y = y; G.player.angle = angle;
  return car;
}

// Two cop cruisers behind the player car, already in pursuit.
function addChasers(G, car) {
  const bx = Math.cos(car.angle); const by = Math.sin(car.angle);
  for (const back of [130, 230]) {
    const cop = makeCar(car.x - bx * back, car.y - by * back + (back === 230 ? 26 : -26), car.angle, 'cop', { driver: 'cop' });
    cop.speed = 330;
    cop.siren = true;
    G.cars.push(cop);
  }
}

// Drive the player's car straight along its road for dt seconds.
function driveStraight(G, dt, speed) {
  const car = G.player.inCar;
  if (!car) return;
  car.speed = speed;
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  car.x = clamp(car.x, 80, WORLD_W - 80);
  car.y = clamp(car.y, 80, WORLD_H - 80);
  G.player.x = car.x; G.player.y = car.y;
}

export function stageShot(name, G) {
  // Fresh world, fixed seed, mission 1 live so the HUD shows an objective.
  G.mission.index = 0; G.mission.stage = 0; G.mission.allDone = false;
  G.wanted = 0; G.crimeTimer = 0; G.coolTimer = 0;
  G.player.cash = 1250;
  G.player.hp = 100;
  G.screen = SCREEN_PLAY;

  if (name === 'start') {
    // Title screen over the living city: traffic and pedestrians move.
    G.player.x = 1350; G.player.y = 1150;
    G.player.onFoot = true; G.player.inCar = null;
    for (let i = 0; i < 5 / SAMPLE; i += 1) stepAmbient(G, SAMPLE);
    G.screen = SCREEN_TITLE;
    updateCamera(G);
    return { screen: SCREEN_TITLE };
  }

  if (name === 'onfoot') {
    // On foot downtown: player walking, pedestrians and traffic around.
    G.player.x = 1350; G.player.y = 1150;
    G.player.onFoot = true; G.player.inCar = null;
    G.player.angle = -Math.PI / 2;
    G.wanted = 0;
    for (let i = 0; i < 3 / SAMPLE; i += 1) {
      G.player.y -= 150 * SAMPLE;
      G.player.walkPhase += SAMPLE * 9;
      stepAmbient(G, SAMPLE);
    }
    updateCamera(G);
    return { screen: SCREEN_PLAY };
  }

  if (name === 'mission') {
    // Mission 2 getaway: Solaris GT stolen, wanted 3, hideout marker ahead.
    G.mission.index = 1; G.mission.stage = 1;
    G.wanted = 3;
    const car = putPlayerInCar(G, 900, 1150, 0, 340, 'sport');
    car.solaris = true;
    addChasers(G, car);
    for (let i = 0; i < 3 / SAMPLE; i += 1) {
      driveStraight(G, SAMPLE, 340);
      stepAmbient(G, SAMPLE);
    }
    updateCamera(G);
    return { screen: SCREEN_PLAY };
  }

  // Cover (default): high-speed chase, wanted 3, two cruisers behind,
  // HUD + minimap + objective all live.
  G.wanted = 3;
  const car = putPlayerInCar(G, 500, 1150, 0, 360, 'coupe');
  addChasers(G, car);
  for (let i = 0; i < 3 / SAMPLE; i += 1) {
    driveStraight(G, SAMPLE, 360);
    stepAmbient(G, SAMPLE);
  }
  updateCamera(G);
  return { screen: SCREEN_PLAY };
}
