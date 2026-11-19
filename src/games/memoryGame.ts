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
import {
  drawApple,
  drawBall,
  drawCloud,
  drawDiploma,
  drawGradCapItem,
  drawStar,
  drawSun,
  fillRoundRect,
} from '../art/props';
import { isPointInRect } from '../ui/buttons';
import { sound } from '../audio/sound';

type CardSymbol =
  | 'carlos'
  | 'mateo'
  | 'ariel'
  | 'dino'
  | 'hero'
  | 'astro'
  | 'pilot'
  | 'star'
  | 'cap'
  | 'diploma'
  | 'ball'
  | 'apple';

interface MemoryCard {
  id: number;
  symbol: CardSymbol;
  label: string;
  bg: string;
  rect: Rect;
  flipped: boolean;
  matched: boolean;
  flipAnim: number; // 0 = face down, 1 = face up
  matchPop: number;
}

interface MatchSpark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
}

const SYMBOL_POOL: Array<{ symbol: CardSymbol; label: string; bg: string }> = [
  { symbol: 'carlos', label: 'Carlos', bg: '#DBEAFE' },
  { symbol: 'mateo', label: 'Mateo', bg: '#FFEDD5' },
  { symbol: 'ariel', label: 'Ariel', bg: '#D1FAE5' },
  { symbol: 'dino', label: 'Dino', bg: '#DCFCE7' },
  { symbol: 'hero', label: 'Súper', bg: '#E0E7FF' },
  { symbol: 'astro', label: 'Astro', bg: '#EDE9FE' },
  { symbol: 'pilot', label: 'Piloto', bg: '#FEE2E2' },
  { symbol: 'star', label: 'Estrella', bg: '#FEF9C3' },
  { symbol: 'cap', label: 'Birrete', bg: '#E0F2FE' },
  { symbol: 'diploma', label: 'Diploma', bg: '#FEF3C7' },
  { symbol: 'ball', label: 'Balón', bg: '#DCFCE7' },
  { symbol: 'apple', label: 'Manzana', bg: '#FFE4E6' },
];

export class MemoryGame implements MiniGame {
  private time = 0;
  private cards: MemoryCard[] = [];
  private openIndices: number[] = [];
  private mismatchTimer = 0;
  private pairsFound = 0;
  private totalPairs: number;
  private sparks: MatchSpark[] = [];
  private finished = false;
  private finishTimer = 0;

  constructor(private playerId: CharacterId, private level = 1) {
    // Level 1: 3 pairs (6 cards), Level 2: 4 pairs (8 cards), Level 3: 6 pairs (12 cards)
    this.totalPairs = level === 1 ? 3 : level === 2 ? 4 : 6;

    // Always include Carlos & Mateo first, then mix characters & fun items!
    const chosen = SYMBOL_POOL.slice(0, this.totalPairs);
    if (level === 2) {
      chosen[2] = SYMBOL_POOL[6]; // Star
      chosen[3] = SYMBOL_POOL[7]; // Grad cap
    } else if (level === 3) {
      chosen[4] = SYMBOL_POOL[8]; // Diploma
      chosen[5] = SYMBOL_POOL[9]; // Ball
    }

    const deck = [...chosen, ...chosen];
    // Fisher-Yates shuffle
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    const cols = level === 1 ? 3 : 4;
    const rows = level === 3 ? 3 : 2;
    const cardW = level === 1 ? 260 : level === 2 ? 235 : 210;
    const cardH = level === 3 ? 192 : 265;
    const gapX = level === 3 ? 28 : 34;
    const gapY = level === 3 ? 22 : 32;

    const totalW = cols * cardW + (cols - 1) * gapX;
    const totalH = rows * cardH + (rows - 1) * gapY;
    const startX = (GAME_WIDTH - totalW) / 2;
    const startY = 122 + (GAME_HEIGHT - 146 - totalH) / 2;

    this.cards = deck.map((item, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      return {
        id: idx,
        symbol: item.symbol,
        label: item.label,
        bg: item.bg,
        rect: {
          x: startX + col * (cardW + gapX),
          y: startY + row * (cardH + gapY),
          w: cardW,
          h: cardH,
        },
        flipped: false,
        matched: false,
        flipAnim: 0,
        matchPop: 0,
      };
    });
  }

  public update(dt: number, input: InputSnapshot): VictoryData | null {
    this.time += dt;

    if (this.finished) {
      this.finishTimer += dt;
      if (this.finishTimer >= 1.2) {
        return {
          gameId: 'memory',
          gameTitle: `¡Memoria de Parejas! (Nivel ${this.level})`,
          characterId: this.playerId,
          level: this.level,
          maxLevel: 3,
          headline: '¡SÚPER MEMORIA!',
          statLabel: `¡Encontraste las ${this.totalPairs} parejas!`,
          medalTitle: 'MEDALLA DE MEMORIA',
          medalColor: 'star',
        };
      }
      return null;
    }

    // Handle mismatch flip-back timer
    if (this.mismatchTimer > 0) {
      this.mismatchTimer -= dt;
      if (this.mismatchTimer <= 0) {
        for (const idx of this.openIndices) {
          this.cards[idx].flipped = false;
        }
        this.openIndices = [];
      }
    }

    // Tap to flip cards
    if (this.mismatchTimer <= 0 && this.openIndices.length < 2) {
      for (const p of input.pointers) {
        if (!p.justPressed) continue;
        for (let i = 0; i < this.cards.length; i++) {
          const c = this.cards[i];
          if (c.flipped || c.matched) continue;
          if (isPointInRect(p.x, p.y, c.rect)) {
            c.flipped = true;
            this.openIndices.push(i);
            sound.playTap();

            if (this.openIndices.length === 2) {
              const a = this.cards[this.openIndices[0]];
              const b = this.cards[this.openIndices[1]];
              if (a.symbol === b.symbol) {
                a.matched = true;
                b.matched = true;
                a.matchPop = 1;
                b.matchPop = 1;
                this.pairsFound++;
                this.openIndices = [];
                sound.playBonus();
                this.spawnMatchSparks(
                  a.rect.x + a.rect.w / 2,
                  a.rect.y + a.rect.h / 2
                );
                this.spawnMatchSparks(
                  b.rect.x + b.rect.w / 2,
                  b.rect.y + b.rect.h / 2
                );

                if (this.pairsFound >= this.totalPairs) {
                  this.finished = true;
                  this.finishTimer = 0;
                  sound.playFlagPlant();
                }
              } else {
                this.mismatchTimer = 0.85;
              }
            }
            break;
          }
        }
      }
    }

    // Smooth flip animations
    for (const c of this.cards) {
      const target = c.flipped || c.matched ? 1 : 0;
      c.flipAnim += (target - c.flipAnim) * Math.min(1, dt * 14);
      c.matchPop = Math.max(0, c.matchPop - dt * 2.5);
    }

    // Sparks
    for (const s of this.sparks) {
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vy += 260 * dt;
      s.life -= dt;
    }
    this.sparks = this.sparks.filter((s) => s.life > 0);

    return null;
  }

  private spawnMatchSparks(x: number, y: number): void {
    const colors = ['#FACC15', '#22C55E', '#38BDF8', '#EC4899', '#F97316'];
    for (let i = 0; i < 14; i++) {
      const a = (Math.PI * 2 * i) / 14;
      const spd = 80 + Math.random() * 140;
      this.sparks.push({
        x,
        y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd - 60,
        color: colors[i % colors.length],
        life: 0.65,
      });
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    // Cheerful sky & soft pastel playmat background
    ctx.fillStyle = '#38BDF8';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    drawSun(ctx, 1185, 86, this.time, 38);
    drawCloud(ctx, 180 + Math.sin(this.time * 0.35) * 14, 78, 0.8);
    drawCloud(ctx, 940 + Math.cos(this.time * 0.3) * 14, 72, 0.82);

    ctx.fillStyle = '#4ADE80';
    ctx.fillRect(0, GAME_HEIGHT - 84, GAME_WIDTH, 84);

    // Top HUD
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.strokeStyle = '#7C3AED';
    ctx.lineWidth = 5;
    fillRoundRect(ctx, GAME_WIDTH / 2 - 330, 20, 660, 68, 28);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#5B21B6';
    ctx.font = '900 32px "Fredoka", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      `NIVEL ${this.level}  •  PAREJAS: ${this.pairsFound} / ${this.totalPairs}`,
      GAME_WIDTH / 2,
      55
    );
    ctx.restore();

    // Draw cards with smooth horizontal 3D flip illusion!
    for (const c of this.cards) {
      const cx = c.rect.x + c.rect.w / 2;
      const cy = c.rect.y + c.rect.h / 2;
      const showFace = c.flipAnim > 0.5;
      const scaleX = Math.max(0.06, Math.abs(c.flipAnim * 2 - 1));
      const popScale = 1 + Math.sin(c.matchPop * Math.PI) * 0.12;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(scaleX * popScale, popScale);

      const hw = c.rect.w / 2;
      const hh = c.rect.h / 2;

      // Drop base
      ctx.fillStyle = c.matched ? '#15803D' : '#1E3A8A';
      fillRoundRect(ctx, -hw, -hh + 8, c.rect.w, c.rect.h, 24);
      ctx.fill();

      if (!showFace) {
        // Card back (vibrant purple/blue with golden star & ?)
        ctx.fillStyle = '#6366F1';
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 6;
        fillRoundRect(ctx, -hw, -hh, c.rect.w, c.rect.h, 24);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = 'rgba(255,255,255,0.16)';
        fillRoundRect(ctx, -hw + 14, -hh + 14, c.rect.w - 28, c.rect.h - 28, 16);
        ctx.fill();

        drawStar(ctx, 0, -14, Math.min(36, hh * 0.36), Math.sin(this.time * 2 + c.id) * 0.15);

        ctx.fillStyle = '#FFFFFF';
        ctx.font = '900 34px "Fredoka", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('?', 0, hh * 0.48);
      } else {
        // Card face
        ctx.fillStyle = c.matched ? '#DCFCE7' : c.bg;
        ctx.strokeStyle = c.matched ? '#22C55E' : '#F59E0B';
        ctx.lineWidth = 6;
        fillRoundRect(ctx, -hw, -hh, c.rect.w, c.rect.h, 24);
        ctx.fill();
        ctx.stroke();

        this.drawSymbol(ctx, c.symbol, hh);

        ctx.fillStyle = '#1E293B';
        ctx.font = `900 ${this.level === 3 ? 21 : 25}px "Fredoka", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(c.label, 0, hh - 24);
      }

      ctx.restore();
    }

    // Match sparks
    for (const s of this.sparks) {
      ctx.fillStyle = s.color;
      ctx.globalAlpha = Math.max(0, s.life * 1.6);
      ctx.beginPath();
      ctx.arc(s.x, s.y, 9, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private drawSymbol(
    ctx: CanvasRenderingContext2D,
    symbol: CardSymbol,
    hh: number
  ): void {
    const isChar =
      symbol === 'carlos' ||
      symbol === 'mateo' ||
      symbol === 'ariel' ||
      symbol === 'dino' ||
      symbol === 'hero' ||
      symbol === 'astro' ||
      symbol === 'pilot';

    if (isChar) {
      drawCharacter(ctx, {
        id: symbol,
        x: 0,
        y: hh - 46,
        scale: this.level === 3 ? 0.92 : 1.24,
        anim: 'celebrate',
        time: this.time,
      });
    } else if (symbol === 'star') {
      drawStar(ctx, 0, -14, this.level === 3 ? 42 : 52, Math.sin(this.time * 2) * 0.2);
    } else if (symbol === 'cap') {
      drawGradCapItem(ctx, 0, -12, this.level === 3 ? 1.8 : 2.1, Math.sin(this.time * 2) * 0.12);
    } else if (symbol === 'diploma') {
      drawDiploma(ctx, 0, -12, Math.sin(this.time * 2) * 0.15);
    } else if (symbol === 'ball') {
      drawBall(ctx, 0, 28, this.level === 3 ? 38 : 46, this.time * 2);
    } else if (symbol === 'apple') {
      drawApple(ctx, 0, -10, Math.sin(this.time * 2) * 0.1);
    }
  }
}
