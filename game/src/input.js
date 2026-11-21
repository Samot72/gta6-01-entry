// SOLMAR HEAT — input: keyboard state with edge detection, mouse aim + buttons.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_INTERACT = 4;
export const ACTION_PUNCH = 8;
export const ACTION_MUTE = 16;

export function createInput(canvas) {
  const keys = new Set();
  const pressed = new Set();
  const mouse = { x: 0, y: 0, down: false, clicked: false, rightDown: false };

  function key(e) { return e.code; }
  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab'].includes(e.code)) e.preventDefault();
    if (!keys.has(key(e))) pressed.add(key(e));
    keys.add(key(e));
  });
  window.addEventListener('keyup', (e) => keys.delete(key(e)));
  window.addEventListener('blur', () => keys.clear());

  canvas.addEventListener('mousemove', (e) => {
    const r = canvas.getBoundingClientRect();
    mouse.x = (e.clientX - r.left) * (canvas.width / r.width);
    mouse.y = (e.clientY - r.top) * (canvas.height / r.height);
  });
  canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0) { mouse.down = true; mouse.clicked = true; }
    if (e.button === 2) mouse.rightDown = true;
  });
  window.addEventListener('mouseup', (e) => {
    if (e.button === 0) mouse.down = false;
    if (e.button === 2) mouse.rightDown = false;
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  function was(code) { return pressed.has(code); }
  function takeActions() {
    let a = 0;
    if (was('Enter') || was('Space') || mouse.clicked) a |= ACTION_CONFIRM;
    if (was('Escape') || was('KeyP')) a |= ACTION_PAUSE;
    if (was('KeyE')) a |= ACTION_INTERACT;
    if (was('KeyF')) a |= ACTION_PUNCH;
    if (was('KeyM')) a |= ACTION_MUTE;
    pressed.clear();
    mouse.clicked = false;
    return a;
  }

  // Driving / walking axes from held keys. Returns {x, y, run}.
  function moveAxis() {
    let x = 0; let y = 0;
    if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
    if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
    if (keys.has('KeyW') || keys.has('ArrowUp')) y -= 1;
    if (keys.has('KeyS') || keys.has('ArrowDown')) y += 1;
    return { x, y, run: keys.has('ShiftLeft') || keys.has('ShiftRight') };
  }

  return {
    keys, mouse, takeActions, moveAxis,
    down: (code) => keys.has(code),
  };
}
