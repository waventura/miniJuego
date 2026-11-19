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
import { drawTactileButton, isPointInRect, isRectJustPressed } from '../ui/buttons';
import { sound } from '../audio/sound';

const MAX_LEVEL = 3;

type FarmAnimalId =
  | 'cow'
  | 'pig'
  | 'sheep'
  | 'chick'
  | 'horse'
  | 'duck'
  | 'dog'
  | 'cat'
  | 'rooster'
  | 'rabbit'
  | 'goat'
  | 'donkey';

interface FarmAnimalDef {
  id: FarmAnimalId;
  name: string;
  article: string;
  soundText: string;
  bg: string;
}

// 3 completely different sets of 4 animals (12 unique animals in total!)
const LEVEL_ANIMALS: FarmAnimalDef[][] = [
  // Nivel 1: La Granja Clásica
  [
    { id: 'cow', name: 'Vaca', article: 'la', soundText: '¡Muuu!', bg: '#E0F2FE' },
    { id: 'pig', name: 'Cerdito', article: 'el', soundText: '¡Oink, oink!', bg: '#FCE7F3' },
    { id: 'sheep', name: 'Oveja', article: 'la', soundText: '¡Beee!', bg: '#F3E8FF' },
    { id: 'chick', name: 'Pollito', article: 'el', soundText: '¡Pío, pío!', bg: '#FEF9C3' },
  ],
  // Nivel 2: El Establo y la Casa
  [
    { id: 'horse', name: 'Caballo', article: 'el', soundText: '¡Hiii!', bg: '#FFEDD5' },
    { id: 'duck', name: 'Pato', article: 'el', soundText: '¡Cuac, cuac!', bg: '#DCFCE7' },
    { id: 'dog', name: 'Perro', article: 'el', soundText: '¡Guau, guau!', bg: '#FEF3C7' },
    { id: 'cat', name: 'Gato', article: 'el', soundText: '¡Miau!', bg: '#E0E7FF' },
  ],
  // Nivel 3: El Corral y la Pradera
  [
    { id: 'rooster', name: 'Gallo', article: 'el', soundText: '¡Kikirikí!', bg: '#FEE2E2' },
    { id: 'rabbit', name: 'Conejo', article: 'el', soundText: '¡Salta, salta!', bg: '#FCE7F3' },
    { id: 'goat', name: 'Cabra', article: 'la', soundText: '¡Meee!', bg: '#ECFEFF' },
    { id: 'donkey', name: 'Burro', article: 'el', soundText: '¡I-aaa!', bg: '#E2E8F0' },
  ],
];

interface PlacedAnimal {
  def: FarmAnimalDef;
  rect: Rect;
  hopAnim: number;
}

interface FarmSpark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
}

export class FarmGame implements MiniGame {
  private time = 0;
  private animals: PlacedAnimal[] = [];
  private target: FarmAnimalDef = LEVEL_ANIMALS[0][0];
  private score = 0;
  private targetScore: number;

  private feedbackText = '';
  private feedbackColor = '#16A34A';
  private feedbackTimer = 0;
  private cheerTimer = 0;
  private sparks: FarmSpark[] = [];
  private finished = false;
  private finishTimer = 0;

  private repeatBtn: Rect = { x: GAME_WIDTH - 230, y: 18, w: 120, h: 66 };

  constructor(private playerId: CharacterId, private level = 1) {
    const levelIndex = Math.max(0, Math.min(LEVEL_ANIMALS.length - 1, level - 1));
    const chosen = LEVEL_ANIMALS[levelIndex];
    this.targetScore = 6 + (level - 1) * 2; // 6, 8, 10

    const cols = 2;
    const cardW = 370;
    const cardH = 232;
    const gapX = 56;
    const gapY = 26;
    const totalW = cols * cardW + gapX;
    const startX = (GAME_WIDTH - totalW) / 2 + 54;
    const startY = 230;

    this.animals = chosen.map((def, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      return {
        def,
        rect: {
          x: startX + col * (cardW + gapX),
          y: startY + row * (cardH + gapY),
          w: cardW,
          h: cardH,
        },
        hopAnim: 0,
      };
    });

    this.pickNextTarget(true);
  }

  private pickNextTarget(announce = true): void {
    const pool = this.animals.map((a) => a.def);
    let next = pool[Math.floor(Math.random() * pool.length)];
    if (pool.length > 1 && next.id === this.target.id) {
      next = pool[(pool.indexOf(next) + 1) % pool.length];
    }
    this.target = next;
    if (announce) {
      this.announceTarget();
    }
  }

  private announceTarget(): void {
    sound.speak(
      `¿Dónde está ${this.target.article} ${this.target.name}? ¡${this.target.soundText.replace(/[¡!]/g, '')}!`
    );
  }

  public update(dt: number, input: InputSnapshot): VictoryData | null {
    this.time += dt;
    this.feedbackTimer = Math.max(0, this.feedbackTimer - dt);
    this.cheerTimer = Math.max(0, this.cheerTimer - dt);

    for (const a of this.animals) {
      a.hopAnim = Math.max(0, a.hopAnim - dt * 2.4);
    }

    for (const s of this.sparks) {
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vy += 300 * dt;
      s.life -= dt;
    }
    this.sparks = this.sparks.filter((s) => s.life > 0);

    if (this.finished) {
      this.finishTimer += dt;
      if (this.finishTimer >= 1.25) {
        return {
          gameId: 'farm',
          gameTitle: `¡La Granja Feliz! (Nivel ${this.level})`,
          characterId: this.playerId,
          level: this.level,
          maxLevel: MAX_LEVEL,
          headline: '¡SÚPER GRANJERO!',
          statLabel: `🐄 ¡Conociste ${this.score} animales en Nivel ${this.level}!`,
          medalTitle: 'MEDALLA DE LA GRANJA',
          medalColor: 'gold',
        };
      }
      return null;
    }

    if (isRectJustPressed(input, this.repeatBtn)) {
      sound.playTap();
      this.announceTarget();
      return null;
    }

    for (const p of input.pointers) {
      if (!p.justPressed) continue;
      for (const a of this.animals) {
        if (isPointInRect(p.x, p.y, a.rect)) {
          a.hopAnim = 1;
          const cx = a.rect.x + a.rect.w / 2;
          const cy = a.rect.y + a.rect.h / 2;

          if (a.def.id === this.target.id) {
            this.score++;
            this.cheerTimer = 0.9;
            this.feedbackText = `${a.def.soundText} ¡MUY BIEN, ES ${a.def.article.toUpperCase()} ${a.def.name.toUpperCase()}!`;
            this.feedbackColor = '#16A34A';
            this.feedbackTimer = 1.25;
            sound.playBonus();
            this.spawnSparks(cx, cy);

            if (this.score >= this.targetScore) {
              this.finished = true;
              this.finishTimer = 0;
              sound.playFlagPlant();
            } else {
              this.pickNextTarget(true);
            }
          } else {
            this.feedbackText = `${a.def.soundText} Ese es ${a.def.article} ${a.def.name}`;
            this.feedbackColor = '#EA580C';
            this.feedbackTimer = 1.2;
            sound.playTap();
            sound.speak(
              `${a.def.soundText} Ese es ${a.def.article} ${a.def.name}`
            );
          }
          break;
        }
      }
    }

    return null;
  }

  private spawnSparks(x: number, y: number): void {
    const colors = ['#FACC15', '#22C55E', '#EF4444', '#38BDF8', '#EC4899'];
    for (let i = 0; i < 16; i++) {
      const a = (Math.PI * 2 * i) / 16;
      const spd = 85 + Math.random() * 150;
      this.sparks.push({
        x,
        y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd - 70,
        color: colors[i % colors.length],
        life: 0.65,
      });
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    // Sky theme changes gently by level!
    ctx.fillStyle =
      this.level === 1 ? '#38BDF8' : this.level === 2 ? '#7DD3FC' : '#FDBA74';
    ctx.fillRect(0, 0, GAME_WIDTH, 240);

    drawSun(ctx, 1185, 134, this.time, 38);
    drawCloud(ctx, 210 + Math.sin(this.time * 0.35) * 14, 130, 0.85);
    drawCloud(ctx, 840 + Math.cos(this.time * 0.3) * 14, 122, 0.85);

    this.drawBarn(ctx, 115, 228);

    // Green pasture
    ctx.fillStyle = '#4ADE80';
    ctx.fillRect(0, 210, GAME_WIDTH, GAME_HEIGHT - 210);

    // Wooden farm fence
    ctx.fillStyle = '#FEF3C7';
    ctx.fillRect(0, 200, GAME_WIDTH, 10);
    for (let fx = 24; fx < GAME_WIDTH; fx += 78) {
      ctx.fillStyle = '#D97706';
      fillRoundRect(ctx, fx, 184, 12, 36, 4);
      ctx.fill();
    }

    // Player character cheering on left
    drawCharacter(ctx, {
      id: this.playerId,
      x: 112,
      y: GAME_HEIGHT - 36,
      scale: 1.28,
      facing: 1,
      anim: this.finished || this.cheerTimer > 0 ? 'celebrate' : 'idle',
      time: this.time,
    });

    // 4 Big Animal cards for this level
    for (const a of this.animals) {
      const r = a.rect;
      const hop = Math.sin(a.hopAnim * Math.PI) * -18;

      ctx.save();
      ctx.fillStyle = '#15803D';
      fillRoundRect(ctx, r.x, r.y + 9, r.w, r.h, 28);
      ctx.fill();

      ctx.fillStyle = a.def.bg;
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 6;
      fillRoundRect(ctx, r.x, r.y + hop, r.w, r.h, 28);
      ctx.fill();
      ctx.stroke();

      this.drawFarmAnimal(
        ctx,
        a.def.id,
        r.x + r.w / 2,
        r.y + hop + r.h * 0.54,
        1.08
      );

      ctx.fillStyle = '#1E293B';
      ctx.font = '900 28px "Fredoka", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        `${a.def.name}  •  ${a.def.soundText}`,
        r.x + r.w / 2,
        r.y + hop + r.h - 28
      );

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

    // Feedback pill
    if (this.feedbackTimer > 0) {
      ctx.save();
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = this.feedbackColor;
      ctx.lineWidth = 5;
      fillRoundRect(ctx, GAME_WIDTH / 2 - 340, GAME_HEIGHT - 84, 680, 62, 24);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = this.feedbackColor;
      ctx.font = '900 28px "Fredoka", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.feedbackText, GAME_WIDTH / 2, GAME_HEIGHT - 52);
      ctx.restore();
    }

    // Top Question Banner
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.97)';
    ctx.strokeStyle = '#B45309';
    ctx.lineWidth = 6;
    fillRoundRect(ctx, 118, 16, 970, 74, 28);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#B45309';
    ctx.font = '900 24px "Fredoka", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`NIVEL ${this.level} / ${MAX_LEVEL}`, 148, 41);
    ctx.fillStyle = '#F59E0B';
    ctx.fillText(`★ ${this.score} / ${this.targetScore}`, 148, 68);

    ctx.fillStyle = '#1E3A8A';
    ctx.font = '900 34px "Fredoka", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      `TOCA A ${this.target.article.toUpperCase()} ${this.target.name.toUpperCase()}  (${this.target.soundText})`,
      650,
      54
    );
    drawStar(ctx, 1044, 53, 18, this.time * 2);
    ctx.restore();

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

  private drawBarn(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = '#DC2626';
    ctx.strokeStyle = '#7F1D1D';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-66, 0);
    ctx.lineTo(-66, -74);
    ctx.lineTo(0, -118);
    ctx.lineTo(66, -74);
    ctx.lineTo(66, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#991B1B';
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 4;
    ctx.fillRect(-26, -54, 52, 54);
    ctx.strokeRect(-26, -54, 52, 54);
    ctx.beginPath();
    ctx.moveTo(-26, -54);
    ctx.lineTo(26, 0);
    ctx.moveTo(26, -54);
    ctx.lineTo(-26, 0);
    ctx.stroke();
    ctx.restore();
  }

  private drawFarmAnimal(
    ctx: CanvasRenderingContext2D,
    id: FarmAnimalId,
    cx: number,
    cy: number,
    scale = 1
  ): void {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);

    if (id === 'cow') {
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#1E293B';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.ellipse(-44, -22, 16, 9, -0.3, 0, Math.PI * 2);
      ctx.ellipse(44, -22, 16, 9, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#FACC15';
      ctx.beginPath();
      ctx.arc(-26, -46, 9, 0, Math.PI * 2);
      ctx.arc(26, -46, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.ellipse(0, -12, 42, 38, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#1E293B';
      ctx.beginPath();
      ctx.arc(-18, -26, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#F9A8D4';
      ctx.beginPath();
      ctx.ellipse(0, 12, 30, 18, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#9D174D';
      ctx.beginPath();
      ctx.arc(-10, 10, 4, 0, Math.PI * 2);
      ctx.arc(10, 10, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.arc(-15, -14, 5, 0, Math.PI * 2);
      ctx.arc(15, -14, 5, 0, Math.PI * 2);
      ctx.fill();
    } else if (id === 'pig') {
      ctx.fillStyle = '#F9A8D4';
      ctx.strokeStyle = '#9D174D';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.ellipse(-34, -36, 14, 18, -0.4, 0, Math.PI * 2);
      ctx.ellipse(34, -36, 14, 18, 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, -8, 42, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#F472B6';
      ctx.beginPath();
      ctx.ellipse(0, 4, 20, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#831843';
      ctx.beginPath();
      ctx.ellipse(-7, 4, 3.5, 5.5, 0, 0, Math.PI * 2);
      ctx.ellipse(7, 4, 3.5, 5.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.arc(-16, -18, 5, 0, Math.PI * 2);
      ctx.arc(16, -18, 5, 0, Math.PI * 2);
      ctx.fill();
    } else if (id === 'sheep') {
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#64748B';
      ctx.lineWidth = 3.5;
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI * 2) / 8;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * 32, -10 + Math.sin(a) * 26, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(0, -10, 32, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#D6B588';
      ctx.strokeStyle = '#78350F';
      ctx.beginPath();
      ctx.ellipse(0, -4, 26, 24, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(-8, -26, 10, 0, Math.PI * 2);
      ctx.arc(6, -28, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.arc(-10, -8, 4.5, 0, Math.PI * 2);
      ctx.arc(10, -8, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#78350F';
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.arc(0, 2, 7, 0.1 * Math.PI, 0.9 * Math.PI);
      ctx.stroke();
    } else if (id === 'chick') {
      ctx.fillStyle = '#EF4444';
      ctx.beginPath();
      ctx.arc(-8, -50, 9, 0, Math.PI * 2);
      ctx.arc(2, -54, 10, 0, Math.PI * 2);
      ctx.arc(12, -48, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FACC15';
      ctx.strokeStyle = '#B45309';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.ellipse(-42, -4, 14, 20, 0.4, 0, Math.PI * 2);
      ctx.ellipse(42, -4, 14, 20, -0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, -10, 40, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#F97316';
      ctx.beginPath();
      ctx.moveTo(-10, -2);
      ctx.lineTo(10, -2);
      ctx.lineTo(0, 14);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.arc(-14, -18, 5, 0, Math.PI * 2);
      ctx.arc(14, -18, 5, 0, Math.PI * 2);
      ctx.fill();
    } else if (id === 'horse') {
      ctx.fillStyle = '#92400E';
      ctx.strokeStyle = '#451A03';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.ellipse(-28, -44, 10, 18, -0.25, 0, Math.PI * 2);
      ctx.ellipse(28, -44, 10, 18, 0.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#451A03';
      ctx.beginPath();
      ctx.arc(0, -48, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#B45309';
      ctx.beginPath();
      ctx.ellipse(0, -10, 36, 42, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#FEF3C7';
      fillRoundRect(ctx, -8, -40, 16, 28, 7);
      ctx.fill();
      ctx.fillStyle = '#FDE68A';
      ctx.beginPath();
      ctx.ellipse(0, 14, 24, 16, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.arc(-15, -16, 5, 0, Math.PI * 2);
      ctx.arc(15, -16, 5, 0, Math.PI * 2);
      ctx.fill();
    } else if (id === 'duck') {
      ctx.fillStyle = '#FACC15';
      ctx.strokeStyle = '#92400E';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(0, -14, 38, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#F97316';
      ctx.beginPath();
      ctx.ellipse(0, 6, 22, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.arc(-14, -22, 5, 0, Math.PI * 2);
      ctx.arc(14, -22, 5, 0, Math.PI * 2);
      ctx.fill();
    } else if (id === 'dog') {
      // Friendly golden puppy with floppy ears & red tongue!
      ctx.fillStyle = '#92400E';
      ctx.strokeStyle = '#451A03';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.ellipse(-42, -6, 15, 30, 0.2, 0, Math.PI * 2);
      ctx.ellipse(42, -6, 15, 30, -0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#F59E0B';
      ctx.beginPath();
      ctx.arc(0, -12, 40, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Muzzle & tongue
      ctx.fillStyle = '#FEF3C7';
      ctx.beginPath();
      ctx.ellipse(0, 8, 22, 16, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#EF4444';
      ctx.beginPath();
      ctx.ellipse(0, 22, 8, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.ellipse(0, 2, 10, 7, 0, 0, Math.PI * 2);
      ctx.arc(-15, -18, 5, 0, Math.PI * 2);
      ctx.arc(15, -18, 5, 0, Math.PI * 2);
      ctx.fill();
    } else if (id === 'cat') {
      // Cute orange tabby kitten with pointy ears & whiskers!
      ctx.fillStyle = '#FB923C';
      ctx.strokeStyle = '#9A3412';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(-36, -24);
      ctx.lineTo(-26, -56);
      ctx.lineTo(-4, -36);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(36, -24);
      ctx.lineTo(26, -56);
      ctx.lineTo(4, -36);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, -10, 38, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Pink nose & whiskers
      ctx.fillStyle = '#F472B6';
      ctx.beginPath();
      ctx.moveTo(-7, -2);
      ctx.lineTo(7, -2);
      ctx.lineTo(0, 6);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#7C2D12';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-22, 2);
      ctx.lineTo(-48, -2);
      ctx.moveTo(-22, 8);
      ctx.lineTo(-48, 12);
      ctx.moveTo(22, 2);
      ctx.lineTo(48, -2);
      ctx.moveTo(22, 8);
      ctx.lineTo(48, 12);
      ctx.stroke();
      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.arc(-15, -16, 5, 0, Math.PI * 2);
      ctx.arc(15, -16, 5, 0, Math.PI * 2);
      ctx.fill();
    } else if (id === 'rooster') {
      // Proud white rooster with tall red comb & wattle!
      ctx.fillStyle = '#EF4444';
      ctx.strokeStyle = '#991B1B';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(-14, -48, 11, 0, Math.PI * 2);
      ctx.arc(0, -56, 13, 0, Math.PI * 2);
      ctx.arc(14, -48, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#334155';
      ctx.beginPath();
      ctx.arc(0, -10, 38, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#EF4444';
      ctx.beginPath();
      ctx.ellipse(0, 20, 10, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#F59E0B';
      ctx.beginPath();
      ctx.moveTo(-12, -2);
      ctx.lineTo(12, -2);
      ctx.lineTo(0, 14);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.arc(-14, -18, 5, 0, Math.PI * 2);
      ctx.arc(14, -18, 5, 0, Math.PI * 2);
      ctx.fill();
    } else if (id === 'rabbit') {
      // Fluffy white bunny with long pink-lined ears!
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#64748B';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.ellipse(-18, -50, 12, 32, -0.1, 0, Math.PI * 2);
      ctx.ellipse(18, -50, 12, 32, 0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#F9A8D4';
      ctx.beginPath();
      ctx.ellipse(-18, -50, 6, 22, -0.1, 0, Math.PI * 2);
      ctx.ellipse(18, -50, 6, 22, 0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(0, -6, 38, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#F472B6';
      ctx.beginPath();
      ctx.arc(0, 2, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.arc(-14, -14, 5, 0, Math.PI * 2);
      ctx.arc(14, -14, 5, 0, Math.PI * 2);
      ctx.fill();
    } else if (id === 'goat') {
      // Friendly light-gray goat with cute horns & goatee!
      ctx.fillStyle = '#94A3B8';
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.ellipse(-20, -48, 7, 18, -0.25, 0, Math.PI * 2);
      ctx.ellipse(20, -48, 7, 18, 0.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#F1F5F9';
      ctx.beginPath();
      ctx.ellipse(0, -10, 34, 38, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Little beard
      ctx.beginPath();
      ctx.moveTo(-10, 24);
      ctx.lineTo(0, 42);
      ctx.lineTo(10, 24);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.arc(-14, -16, 5, 0, Math.PI * 2);
      ctx.arc(14, -16, 5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Friendly gray donkey with big ears!
      ctx.fillStyle = '#64748B';
      ctx.strokeStyle = '#1E293B';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.ellipse(-28, -46, 11, 28, -0.3, 0, Math.PI * 2);
      ctx.ellipse(28, -46, 11, 28, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#94A3B8';
      ctx.beginPath();
      ctx.ellipse(0, -10, 36, 40, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#E2E8F0';
      ctx.beginPath();
      ctx.ellipse(0, 14, 24, 16, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.arc(-14, -16, 5, 0, Math.PI * 2);
      ctx.arc(14, -16, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}
