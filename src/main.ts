import './style.css';
import {
  CharacterId,
  GAME_HEIGHT,
  GAME_WIDTH,
  GameId,
  InputSnapshot,
  MiniGame,
  PointerInfo,
  Rect,
  ScreenId,
  VictoryData,
} from './types';
import { sound } from './audio/sound';
import {
  drawHomeButton,
  drawMuteButton,
  isRectJustPressed,
} from './ui/buttons';
import { CharacterSelectScreen } from './ui/characterSelect';
import { GameMenuScreen } from './ui/gameMenu';
import { VictoryScreen } from './ui/victoryScreen';
import { RaceGame } from './games/raceGame';
import { PlaygroundGame } from './games/playgroundGame';
import { ClassroomGame } from './games/classroomGame';
import { MountainGame } from './games/mountainGame';
import { SoccerGame } from './games/soccerGame';
import { DinoGame } from './games/dinoGame';
import { CarRaceGame } from './games/carRaceGame';
import { MemoryGame } from './games/memoryGame';
import { FlappyGame } from './games/flappyGame';
import { TicTacToeGame } from './games/ticTacToeGame';
import { WaterBalloonGame } from './games/waterBalloonGame';
import { AlphabetGame } from './games/alphabetGame';
import { drawTactileButton } from './ui/buttons';
import { CURRENT_VERSION, updater } from './updater';

updater.checkInBackground();

interface TouchSparkle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
}

const SPARKLE_COLORS = ['#FACC15', '#38BDF8', '#EC4899', '#4ADE80', '#FB923C'];
let touchSparkles: TouchSparkle[] = [];

function spawnTouchSparkles(x: number, y: number): void {
  for (let i = 0; i < 7; i++) {
    const a = (Math.PI * 2 * i) / 7 + Math.random() * 0.4;
    const spd = 65 + Math.random() * 95;
    touchSparkles.push({
      x,
      y,
      vx: Math.cos(a) * spd,
      vy: Math.sin(a) * spd - 30,
      size: 6 + Math.random() * 5,
      color: SPARKLE_COLORS[i % SPARKLE_COLORS.length],
      life: 0.45,
    });
  }
}

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

// Prevent browser zoom, scroll, double-tap, and context menu gestures
document.addEventListener('gesturestart', (e) => e.preventDefault(), {
  passive: false,
});
document.addEventListener('gesturechange', (e) => e.preventDefault(), {
  passive: false,
});
document.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener(
  'touchmove',
  (e) => {
    e.preventDefault();
  },
  { passive: false }
);

// Multi-touch pointer + keyboard input manager
const activePointers = new Map<number, PointerInfo>();
const keysDown = new Set<string>();
const keysJustPressed = new Set<string>();

function toCanvasCoords(clientX: number, clientY: number): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((clientX - rect.left) / rect.width) * GAME_WIDTH,
    y: ((clientY - rect.top) / rect.height) * GAME_HEIGHT,
  };
}

canvas.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  sound.unlock();
  canvas.setPointerCapture(e.pointerId);
  const pos = toCanvasCoords(e.clientX, e.clientY);
  spawnTouchSparkles(pos.x, pos.y);
  activePointers.set(e.pointerId, {
    id: e.pointerId,
    x: pos.x,
    y: pos.y,
    downX: pos.x,
    downY: pos.y,
    justPressed: true,
  });
});

canvas.addEventListener('pointermove', (e) => {
  const existing = activePointers.get(e.pointerId);
  if (!existing) return;
  const pos = toCanvasCoords(e.clientX, e.clientY);
  existing.x = pos.x;
  existing.y = pos.y;
});

function releasePointer(e: PointerEvent): void {
  activePointers.delete(e.pointerId);
}
canvas.addEventListener('pointerup', releasePointer);
canvas.addEventListener('pointercancel', releasePointer);

window.addEventListener('keydown', (e) => {
  sound.unlock();
  if (!keysDown.has(e.code)) {
    keysJustPressed.add(e.code);
  }
  keysDown.add(e.code);
});

window.addEventListener('keyup', (e) => {
  keysDown.delete(e.code);
});

// App state
let screen: ScreenId = 'select';
let selectedCharacter: CharacterId = 'carlos';
let currentGameId: GameId = 'race';
let currentLevel = 1;
let activeGame: MiniGame | null = null;
let victoryData: VictoryData | null = null;

const selectScreen = new CharacterSelectScreen();
const menuScreen = new GameMenuScreen();
const victoryScreen = new VictoryScreen();

const backBtn: Rect = { x: 24, y: 20, w: 68, h: 64 };
const muteBtn: Rect = { x: GAME_WIDTH - 92, y: 20, w: 68, h: 64 };

function launchGame(gameId: GameId, level = 1): void {
  currentGameId = gameId;
  currentLevel = level;
  switch (gameId) {
    case 'race':
      activeGame = new RaceGame(selectedCharacter, level);
      if (level === 1) sound.playVoice('intro_carrera');
      break;
    case 'playground':
      activeGame = new PlaygroundGame(selectedCharacter, level);
      if (level === 1) sound.playVoice('intro_patio');
      break;
    case 'classroom':
      activeGame = new ClassroomGame(selectedCharacter, level);
      break;
    case 'mountain':
      activeGame = new MountainGame(selectedCharacter, level);
      break;
    case 'soccer':
      activeGame = new SoccerGame(selectedCharacter, level);
      break;
    case 'dinos':
      activeGame = new DinoGame(selectedCharacter, level);
      break;
    case 'cars':
      activeGame = new CarRaceGame(selectedCharacter, level);
      break;
    case 'memory':
      activeGame = new MemoryGame(selectedCharacter, level);
      break;
    case 'flappy':
      activeGame = new FlappyGame(selectedCharacter, level);
      break;
    case 'tictactoe':
      activeGame = new TicTacToeGame(selectedCharacter, level);
      break;
    case 'waterballoons':
      activeGame = new WaterBalloonGame(selectedCharacter, level);
      break;
    case 'alphabet':
      activeGame = new AlphabetGame(selectedCharacter, level);
      break;
  }
  screen = 'playing';
}

function playVictoryVoice(charId: CharacterId): void {
  if (charId === 'carlos') {
    sound.playVoice('victoria_carlos');
  } else if (charId === 'mateo') {
    sound.playVoice('victoria_mateo');
  } else if (charId === 'ariel') {
    sound.playVoice('victoria_ariel');
  } else {
    sound.playVoice('victoria_general');
  }
}

let playedInitialGreeting = false;

function buildInputSnapshot(): InputSnapshot {
  const pointers: PointerInfo[] = [];
  activePointers.forEach((p) => {
    pointers.push({ ...p });
  });
  return {
    pointers,
    keysDown: new Set(keysDown),
    keysJustPressed: new Set(keysJustPressed),
  };
}

function clearFrameInputs(): void {
  activePointers.forEach((p) => {
    p.justPressed = false;
  });
  keysJustPressed.clear();
}

let lastTime = performance.now();

function loop(now: number): void {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;

  const input = buildInputSnapshot();

  // Global Mute button
  if (isRectJustPressed(input, muteBtn)) {
    sound.toggleMute();
    // Consume pointer so it doesn't also trigger game action
    input.pointers = input.pointers.filter(
      (p) =>
        !(
          p.x >= muteBtn.x &&
          p.x <= muteBtn.x + muteBtn.w &&
          p.y >= muteBtn.y &&
          p.y <= muteBtn.y + muteBtn.h
        )
    );
  }

  // Global Back button while playing
  if (screen === 'playing' && isRectJustPressed(input, backBtn)) {
    sound.playTap();
    sound.playVoice('elige_juego');
    activeGame = null;
    screen = 'menu';
    clearFrameInputs();
    requestAnimationFrame(loop);
    return;
  }

  // Update active screen
  if (screen === 'select') {
    const prevChar = selectedCharacter;
    const res = selectScreen.update(dt, input, selectedCharacter);
    selectedCharacter = res.selected;
    if (
      !playedInitialGreeting &&
      input.pointers.some((p) => p.justPressed) &&
      !res.start &&
      res.selected === prevChar
    ) {
      playedInitialGreeting = true;
      sound.playVoice('elige_personaje');
    } else if (res.selected !== prevChar) {
      playedInitialGreeting = true;
    }
    if (res.start) {
      playedInitialGreeting = true;
      screen = 'menu';
      sound.playVoice('elige_juego');
    }
  } else if (screen === 'menu') {
    const res = menuScreen.update(dt, input);
    if (res.backToSelect) {
      screen = 'select';
      sound.playVoice('elige_personaje');
    } else if (res.launchGame) {
      launchGame(res.launchGame, 1);
    }
  } else if (screen === 'playing' && activeGame) {
    const win = activeGame.update(dt, input);
    if (win) {
      victoryData = win;
      victoryScreen.reset();
      playVictoryVoice(win.characterId);
      screen = 'victory';
    }
  } else if (screen === 'victory' && victoryData) {
    const action = victoryScreen.update(dt, input, victoryData);
    if (action === 'nextLevel') {
      launchGame(currentGameId, Math.min(victoryData.maxLevel, currentLevel + 1));
    } else if (action === 'replay') {
      launchGame(currentGameId, currentLevel);
    } else if (action === 'menu') {
      screen = 'menu';
      sound.playVoice('elige_juego');
    }
  }

  const updateBtn: Rect = { x: 32, y: GAME_HEIGHT - 102, w: 360, h: 72 };
  if (
    screen === 'select' &&
    updater.availableUpdate &&
    isRectJustPressed(input, updateBtn)
  ) {
    sound.playBonus();
    updater.openUpdateDownload();
  }

  // Render active screen
  ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  if (screen === 'select') {
    selectScreen.render(ctx, selectedCharacter, input);
    if (updater.availableUpdate) {
      drawTactileButton(ctx, {
        rect: updateBtn,
        label: `⬇ ACTUALIZAR v${updater.availableUpdate.version}`,
        bg: '#0EA5E9',
        border: '#0369A1',
        fontSize: 22,
        pressed: false,
        radius: 22,
      });
    }
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = '800 18px "Fredoka", sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`v${CURRENT_VERSION}`, GAME_WIDTH - 24, GAME_HEIGHT - 16);
    ctx.restore();
  } else if (screen === 'menu') {
    menuScreen.render(ctx, selectedCharacter, input);
  } else if (screen === 'playing' && activeGame) {
    activeGame.render(ctx);
    drawHomeButton(ctx, backBtn);
  } else if (screen === 'victory' && victoryData) {
    victoryScreen.render(ctx, victoryData, input);
  }

  // Always show sound toggle in top-right
  drawMuteButton(ctx, muteBtn, sound.muted);

  // Global touch sparkles!
  for (const s of touchSparkles) {
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.vy += 180 * dt;
    s.life -= dt;
    if (s.life > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, s.life * 2.4);
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size * (s.life / 0.45), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
  touchSparkles = touchSparkles.filter((s) => s.life > 0);

  clearFrameInputs();
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
