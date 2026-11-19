import {
  CharacterId,
  GAME_HEIGHT,
  GAME_WIDTH,
  InputSnapshot,
  MiniGame,
  Rect,
  VictoryData,
} from '../types';
import { drawCharacter } from '../art/characters';
import { drawCloud, drawStar, drawSun, fillRoundRect } from '../art/props';
import { drawTactileButton, isRectJustPressed } from '../ui/buttons';
import { sound } from '../audio/sound';

const MAX_LEVEL = 5;

interface ColorDef {
  name: string;
  hex: string;
  border: string;
}

const COLORS: ColorDef[] = [
  { name: 'ROJO', hex: '#EF4444', border: '#991B1B' },
  { name: 'AZUL', hex: '#3B82F6', border: '#1E3A8A' },
  { name: 'AMARILLO', hex: '#FACC15', border: '#B45309' },
  { name: 'VERDE', hex: '#22C55E', border: '#15803D' },
  { name: 'MORADO', hex: '#A855F7', border: '#6B21A8' },
  { name: 'NARANJA', hex: '#F97316', border: '#C2410C' },
];

const VOWELS = ['A', 'E', 'I', 'O', 'U'];
const ABC_FIRST = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M'];
const ABC_SECOND = ['N', 'Ñ', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
const ABC_ALL = [...ABC_FIRST, ...ABC_SECOND];

interface FallingLetter {
  id: number;
  letter: string;
  color: ColorDef;
  x: number;
  y: number;
  vy: number;
  phase: number;
  isTarget: boolean;
  wobble: number;
}

interface PopSpark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
}

export class AlphabetGame implements MiniGame {
  private time = 0;
  private score = 0;
  private targetScore: number;
  private letterPool: string[];
  private colorPool: ColorDef[];

  private targetLetter = 'A';
  private targetColor: ColorDef = COLORS[0];

  private items: FallingLetter[] = [];
  private sparks: PopSpark[] = [];
  private nextId = 1;
  private spawnTimer = 0.2;
  private spawnsSinceTarget = 0;

  private feedbackText = '';
  private feedbackColor = '#16A34A';
  private feedbackTimer = 0;
  private cheerTimer = 0;
  private finished = false;
  private finishTimer = 0;

  private repeatBtn: Rect = { x: GAME_WIDTH - 230, y: 18, w: 120, h: 66 };

  constructor(private playerId: CharacterId, private level = 1) {
    if (level === 1) {
      this.letterPool = VOWELS;
      this.colorPool = COLORS.slice(0, 4);
      this.targetScore = 6;
    } else if (level === 2) {
      this.letterPool = VOWELS;
      this.colorPool = COLORS;
      this.targetScore = 8;
    } else if (level === 3) {
      this.letterPool = ABC_FIRST;
      this.colorPool = COLORS;
      this.targetScore = 8;
    } else if (level === 4) {
      this.letterPool = ABC_SECOND;
      this.colorPool = COLORS;
      this.targetScore = 10;
    } else {
      this.letterPool = ABC_ALL;
      this.colorPool = COLORS;
      this.targetScore = 12;
    }

    this.pickNextTarget(true);
  }

  private pickNextTarget(announce = true): void {
    this.targetLetter =
      this.letterPool[Math.floor(Math.random() * this.letterPool.length)];
    this.targetColor =
      this.colorPool[Math.floor(Math.random() * this.colorPool.length)];
    this.spawnsSinceTarget = 0;

    // Seed 1 guaranteed target bubble soon so kids never wait long!
    this.spawnBubble(true);
    this.spawnBubble(false);

    if (announce) {
      this.announceTarget();
    }
  }

  private announceTarget(): void {
    const isVowel = VOWELS.includes(this.targetLetter);
    const kindWord = isVowel ? 'la vocal' : 'la letra';
    sound.speak(
      `Toca ${kindWord} ${this.targetLetter}, color ${this.targetColor.name.toLowerCase()}`
    );
  }

  private spawnBubble(forceTarget: boolean): void {
    const isTarget = forceTarget || this.spawnsSinceTarget >= 2;
    let letter = this.targetLetter;
    let color = this.targetColor;

    if (!isTarget) {
      // Distractor: either different letter or different color
      letter =
        this.letterPool[Math.floor(Math.random() * this.letterPool.length)];
      color =
        this.colorPool[Math.floor(Math.random() * this.colorPool.length)];
      if (letter === this.targetLetter && color.name === this.targetColor.name) {
        const otherColors = this.colorPool.filter(
          (c) => c.name !== this.targetColor.name
        );
        color = otherColors[Math.floor(Math.random() * otherColors.length)];
      }
      this.spawnsSinceTarget++;
    } else {
      this.spawnsSinceTarget = 0;
    }

    // Spread bubbles cleanly across screen width
    const x = 150 + Math.random() * (GAME_WIDTH - 300);
    const baseFall = 95 + (this.level - 1) * 16;

    this.items.push({
      id: this.nextId++,
      letter,
      color,
      x,
      y: 90 - Math.random() * 60,
      vy: baseFall + Math.random() * 35,
      phase: Math.random() * Math.PI * 2,
      isTarget:
        letter === this.targetLetter && color.name === this.targetColor.name,
      wobble: 0,
    });
  }

  public update(dt: number, input: InputSnapshot): VictoryData | null {
    this.time += dt;
    this.feedbackTimer = Math.max(0, this.feedbackTimer - dt);
    this.cheerTimer = Math.max(0, this.cheerTimer - dt);

    // Sparks
    for (const s of this.sparks) {
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vy += 320 * dt;
      s.life -= dt;
    }
    this.sparks = this.sparks.filter((s) => s.life > 0);

    if (this.finished) {
      this.finishTimer += dt;
      if (this.finishTimer >= 1.25) {
        return {
          gameId: 'alphabet',
          gameTitle: `¡Letras y Colores! (Nivel ${this.level})`,
          characterId: this.playerId,
          level: this.level,
          maxLevel: MAX_LEVEL,
          headline: '¡GENIO DE LAS LETRAS!',
          statLabel: `★ ¡Acertaste ${this.score} letras y colores!`,
          medalTitle: 'MEDALLA DEL ABECEDARIO',
          medalColor: 'star',
        };
      }
      return null;
    }

    // Repeat voice prompt button
    if (isRectJustPressed(input, this.repeatBtn)) {
      sound.playTap();
      this.announceTarget();
      return null;
    }

    // Tap falling letter bubbles!
    for (const p of input.pointers) {
      if (!p.justPressed || p.y < 100) continue;
      for (let i = this.items.length - 1; i >= 0; i--) {
        const b = this.items[i];
        const bx = b.x + Math.sin(this.time * 2.2 + b.phase) * 20;
        const dx = p.x - bx;
        const dy = p.y - b.y;
        if (dx * dx + dy * dy < 66 * 66) {
          const matches =
            b.letter === this.targetLetter &&
            b.color.name === this.targetColor.name;

          if (matches) {
            this.score++;
            this.cheerTimer = 0.9;
            this.feedbackText = `¡MUY BIEN! ${b.letter} ${b.color.name}`;
            this.feedbackColor = '#16A34A';
            this.feedbackTimer = 1.0;
            sound.playBonus();
            this.spawnSparks(bx, b.y, b.color.hex);
            // Clear current bubbles and move to next letter!
            this.items = [];

            if (this.score >= this.targetScore) {
              this.finished = true;
              this.finishTimer = 0;
              sound.playFlagPlant();
            } else {
              this.pickNextTarget(true);
            }
          } else {
            b.wobble = 1;
            this.feedbackText = `Esa es ${b.letter} ${b.color.name} — ¡Busca ${this.targetLetter} ${this.targetColor.name}!`;
            this.feedbackColor = '#EA580C';
            this.feedbackTimer = 1.25;
            sound.playBonk();
          }
          break;
        }
      }
    }

    // Keyboard fallback for testing
    if (input.keysJustPressed.has('Space')) {
      const target = this.items.find(
        (b) =>
          b.letter === this.targetLetter &&
          b.color.name === this.targetColor.name
      );
      if (target) {
        this.score++;
        sound.playBonus();
        this.items = [];
        if (this.score >= this.targetScore) {
          this.finished = true;
          this.finishTimer = 0;
          sound.playFlagPlant();
        } else {
          this.pickNextTarget(true);
        }
      }
    }

    // Spawn new bubbles steadily
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0 && this.items.length < 7) {
      this.spawnBubble(false);
      this.spawnTimer = Math.max(0.75, 1.35 - this.level * 0.1);
    }

    // Update falling bubbles
    for (const b of this.items) {
      b.y += b.vy * dt;
      b.wobble = Math.max(0, b.wobble - dt * 3);
    }
    this.items = this.items.filter((b) => b.y < GAME_HEIGHT + 70);

    return null;
  }

  private spawnSparks(x: number, y: number, color: string): void {
    for (let i = 0; i < 18; i++) {
      const a = (Math.PI * 2 * i) / 18;
      const spd = 90 + Math.random() * 170;
      this.sparks.push({
        x,
        y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd - 70,
        color: i % 3 === 0 ? '#FACC15' : color,
        life: 0.65,
      });
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    // Bright cheerful classroom/sky background
    ctx.fillStyle = '#E0F2FE';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    drawSun(ctx, 1185, 138, this.time, 38);
    drawCloud(ctx, 190 + Math.sin(this.time * 0.35) * 14, 135, 0.85);
    drawCloud(ctx, 900 + Math.cos(this.time * 0.3) * 14, 128, 0.85);

    // Meadow floor
    ctx.fillStyle = '#4ADE80';
    ctx.fillRect(0, GAME_HEIGHT - 110, GAME_WIDTH, 110);

    // Player character cheering at bottom left
    drawCharacter(ctx, {
      id: this.playerId,
      x: 130,
      y: GAME_HEIGHT - 18,
      scale: 1.25,
      facing: 1,
      anim: this.finished || this.cheerTimer > 0 ? 'celebrate' : 'idle',
      time: this.time,
    });

    // Falling letter bubbles!
    for (const b of this.items) {
      const bx = b.x + Math.sin(this.time * 2.2 + b.phase) * 20;
      const shake = b.wobble > 0 ? Math.sin(b.wobble * 24) * 8 : 0;

      ctx.save();
      ctx.translate(bx + shake, b.y);

      // Balloon string
      ctx.strokeStyle = '#64748B';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, 52);
      ctx.quadraticCurveTo(8, 70, -4, 86);
      ctx.stroke();

      // Colorful bubble/balloon
      ctx.fillStyle = b.color.hex;
      ctx.strokeStyle = b.color.border;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(0, 0, 52, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Glossy shine
      ctx.fillStyle = 'rgba(255,255,255,0.32)';
      ctx.beginPath();
      ctx.ellipse(-18, -20, 12, 18, -0.45, 0, Math.PI * 2);
      ctx.fill();

      // Big crisp letter!
      ctx.fillStyle = b.color.name === 'AMARILLO' ? '#1E293B' : '#FFFFFF';
      ctx.font = '900 54px "Fredoka", "Trebuchet MS", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(b.letter, 0, 3);

      ctx.restore();
    }

    // Sparks
    for (const s of this.sparks) {
      ctx.fillStyle = s.color;
      ctx.globalAlpha = Math.max(0, s.life * 1.6);
      ctx.beginPath();
      ctx.arc(s.x, s.y, 9, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Feedback pill at bottom center
    if (this.feedbackTimer > 0) {
      ctx.save();
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = this.feedbackColor;
      ctx.lineWidth = 5;
      fillRoundRect(ctx, GAME_WIDTH / 2 - 330, GAME_HEIGHT - 90, 660, 64, 24);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = this.feedbackColor;
      ctx.font = '900 28px "Fredoka", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.feedbackText, GAME_WIDTH / 2, GAME_HEIGHT - 57);
      ctx.restore();
    }

    // Top Target Banner (BIG visual letter + color swatch + progress!)
    this.drawTopBanner(ctx);

    // Repeat Voice button
    drawTactileButton(ctx, {
      rect: this.repeatBtn,
      label: '🔊 OÍR',
      bg: '#8B5CF6',
      border: '#5B21B6',
      fontSize: 24,
      pressed: false,
      radius: 20,
    });
  }

  private drawTopBanner(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    // Main white prompt card
    ctx.fillStyle = 'rgba(255,255,255,0.97)';
    ctx.strokeStyle = this.targetColor.border;
    ctx.lineWidth = 6;
    fillRoundRect(ctx, 118, 16, 970, 74, 28);
    ctx.fill();
    ctx.stroke();

    // Level & score on left
    ctx.fillStyle = '#1E3A8A';
    ctx.font = '900 24px "Fredoka", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const modeLabel = this.level <= 2 ? 'VOCALES' : 'ABC';
    ctx.fillText(
      `NIVEL ${this.level} (${modeLabel})`,
      146,
      41
    );
    ctx.fillStyle = '#F59E0B';
    ctx.fillText(`★ ${this.score} / ${this.targetScore}`, 146, 68);

    // Big colored target badge in center!
    ctx.fillStyle = '#334155';
    ctx.font = '900 32px "Fredoka", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('TOCA:', 555, 54);

    // Target colored circle with target letter inside
    ctx.fillStyle = this.targetColor.hex;
    ctx.strokeStyle = this.targetColor.border;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(606, 53, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle =
      this.targetColor.name === 'AMARILLO' ? '#1E293B' : '#FFFFFF';
    ctx.font = '900 38px "Fredoka", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(this.targetLetter, 606, 55);

    // Color name text in that color!
    ctx.fillStyle =
      this.targetColor.name === 'AMARILLO' ? '#B45309' : this.targetColor.hex;
    ctx.font = '900 36px "Fredoka", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`COLOR ${this.targetColor.name}`, 654, 54);

    drawStar(ctx, 1044, 53, 18, this.time * 2);

    ctx.restore();
  }
}
