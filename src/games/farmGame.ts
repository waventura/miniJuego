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

type FarmAnimalId = 'cow' | 'pig' | 'sheep' | 'chick' | 'horse' | 'duck';

interface FarmAnimalDef {
  id: FarmAnimalId;
  name: string;
  article: string; // 'la' | 'el'
  soundText: string;
  bg: string;
}

const ALL_ANIMALS: FarmAnimalDef[] = [
  { id: 'cow', name: 'Vaca', article: 'la', soundText: '¡Muuu!', bg: '#E0F2FE' },
  { id: 'pig', name: 'Cerdito', article: 'el', soundText: '¡Oink, oink!', bg: '#FCE7F3' },
  { id: 'sheep', name: 'Oveja', article: 'la', soundText: '¡Beee!', bg: '#F3E8FF' },
  { id: 'chick', name: 'Pollito', article: 'el', soundText: '¡Pío, pío!', bg: '#FEF9C3' },
  { id: 'horse', name: 'Caballo', article: 'el', soundText: '¡Hiii!', bg: '#FFEDD5' },
  { id: 'duck', name: 'Pato', article: 'el', soundText: '¡Cuac, cuac!', bg: '#DCFCE7' },
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
  private target: FarmAnimalDef = ALL_ANIMALS[0];
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
    const count = level === 1 ? 4 : 6;
    this.targetScore = level === 1 ? 6 : level === 2 ? 8 : 10;

    const chosen = ALL_ANIMALS.slice(0, count);
    const cols = count === 4 ? 2 : 3;
    const rows = 2;
    const cardW = count === 4 ? 360 : 300;
    const cardH = 228;
    const gapX = count === 4 ? 56 : 36;
    const gapY = 28;
    const totalW = cols * cardW + (cols - 1) * gapX;
    const startX = (GAME_WIDTH - totalW) / 2 + 50;
    const startY = 232;

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
    if (this.level === 3) {
      sound.speak(`¿Qué animal hace ${this.target.soundText}?`);
    } else {
      sound.speak(
        `¿Dónde está ${this.target.article} ${this.target.name}? ${this.target.soundText}`
      );
    }
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
          statLabel: `🐄 ¡Conociste ${this.score} animales de la granja!`,
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
            sound.speak(`${a.def.soundText} Ese es ${a.def.article} ${a.def.name}`);
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
    // Sunny farm sky
    ctx.fillStyle = '#38BDF8';
    ctx.fillRect(0, 0, GAME_WIDTH, 240);

    drawSun(ctx, 1185, 134, this.time, 38);
    drawCloud(ctx, 210 + Math.sin(this.time * 0.35) * 14, 130, 0.85);
    drawCloud(ctx, 840 + Math.cos(this.time * 0.3) * 14, 122, 0.85);

    // Classic Red Barn on top-left background
    this.drawBarn(ctx, 115, 228);

    // Rolling green pasture
    ctx.fillStyle = '#4ADE80';
    ctx.fillRect(0, 210, GAME_WIDTH, GAME_HEIGHT - 210);

    // Wooden farm fence along pasture top
    ctx.fillStyle = '#FEF3C7';
    ctx.fillRect(0, 200, GAME_WIDTH, 10);
    for (let fx = 24; fx < GAME_WIDTH; fx += 78) {
      ctx.fillStyle = '#D97706';
      fillRoundRect(ctx, fx, 184, 12, 36, 4);
      ctx.fill();
    }

    // Player character cheering on the left
    drawCharacter(ctx, {
      id: this.playerId,
      x: 112,
      y: GAME_HEIGHT - 36,
      scale: 1.28,
      facing: 1,
      anim: this.finished || this.cheerTimer > 0 ? 'celebrate' : 'idle',
      time: this.time,
    });

    // Animal cards on the pasture
    for (const a of this.animals) {
      const r = a.rect;
      const hop = Math.sin(a.hopAnim * Math.PI) * -18;

      ctx.save();
      // Card shadow
      ctx.fillStyle = '#15803D';
      fillRoundRect(ctx, r.x, r.y + 9, r.w, r.h, 28);
      ctx.fill();

      // Card surface
      ctx.fillStyle = a.def.bg;
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 6;
      fillRoundRect(ctx, r.x, r.y + hop, r.w, r.h, 28);
      ctx.fill();
      ctx.stroke();

      // Draw adorable animal
      this.drawFarmAnimal(
        ctx,
        a.def.id,
        r.x + r.w / 2,
        r.y + hop + r.h * 0.56,
        1.05
      );

      // Animal name + sound pill at bottom of card
      ctx.fillStyle = '#1E293B';
      ctx.font = '900 28px "Fredoka", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(a.def.name, r.x + r.w / 2, r.y + hop + r.h - 28);

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

    // Feedback banner at bottom
    if (this.feedbackTimer > 0) {
      ctx.save();
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = this.feedbackColor;
      ctx.lineWidth = 5;
      fillRoundRect(ctx, GAME_WIDTH / 2 - 330, GAME_HEIGHT - 84, 660, 62, 24);
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
    ctx.fillText(`NIVEL ${this.level}`, 148, 41);
    ctx.fillStyle = '#F59E0B';
    ctx.fillText(`★ ${this.score} / ${this.targetScore}`, 148, 68);

    ctx.fillStyle = '#1E3A8A';
    ctx.font = '900 34px "Fredoka", sans-serif';
    ctx.textAlign = 'center';
    const prompt =
      this.level === 3
        ? `¿QUIÉN HACE "${this.target.soundText}"?`
        : `TOCA A ${this.target.article.toUpperCase()} ${this.target.name.toUpperCase()}  (${this.target.soundText})`;
    ctx.fillText(prompt, 650, 54);
    drawStar(ctx, 1044, 53, 18, this.time * 2);
    ctx.restore();

    // Repeat voice button
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

    // Barn doors with white X
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
      // Cute white cow with black spots & pink snout
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#1E293B';
      ctx.lineWidth = 3.5;
      // Ears
      ctx.beginPath();
      ctx.ellipse(-44, -22, 16, 9, -0.3, 0, Math.PI * 2);
      ctx.ellipse(44, -22, 16, 9, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Horns
      ctx.fillStyle = '#FACC15';
      ctx.beginPath();
      ctx.arc(-26, -46, 9, 0, Math.PI * 2);
      ctx.arc(26, -46, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Head
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.ellipse(0, -12, 42, 38, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Black cow spot
      ctx.fillStyle = '#1E293B';
      ctx.beginPath();
      ctx.arc(-18, -26, 13, 0, Math.PI * 2);
      ctx.fill();
      // Big pink snout
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
      // Eyes
      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.arc(-15, -14, 5, 0, Math.PI * 2);
      ctx.arc(15, -14, 5, 0, Math.PI * 2);
      ctx.fill();
    } else if (id === 'pig') {
      // Cute pink piggy!
      ctx.fillStyle = '#F9A8D4';
      ctx.strokeStyle = '#9D174D';
      ctx.lineWidth = 3.5;
      // Ears
      ctx.beginPath();
      ctx.ellipse(-34, -36, 14, 18, -0.4, 0, Math.PI * 2);
      ctx.ellipse(34, -36, 14, 18, 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Round face
      ctx.beginPath();
      ctx.arc(0, -8, 42, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Snout
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
      // Eyes
      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.arc(-16, -18, 5, 0, Math.PI * 2);
      ctx.arc(16, -18, 5, 0, Math.PI * 2);
      ctx.fill();
    } else if (id === 'sheep') {
      // Fluffy white wool cloud!
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
      // Cute warm-brown face
      ctx.fillStyle = '#D6B588';
      ctx.strokeStyle = '#78350F';
      ctx.beginPath();
      ctx.ellipse(0, -4, 26, 24, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Top wool tuft
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(-8, -26, 10, 0, Math.PI * 2);
      ctx.arc(6, -28, 10, 0, Math.PI * 2);
      ctx.fill();
      // Eyes & smile
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
      // Bright yellow chick with red comb!
      ctx.fillStyle = '#EF4444';
      ctx.beginPath();
      ctx.arc(-8, -50, 9, 0, Math.PI * 2);
      ctx.arc(2, -54, 10, 0, Math.PI * 2);
      ctx.arc(12, -48, 8, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#FACC15';
      ctx.strokeStyle = '#B45309';
      ctx.lineWidth = 3.5;
      // Wings
      ctx.beginPath();
      ctx.ellipse(-42, -4, 14, 20, 0.4, 0, Math.PI * 2);
      ctx.ellipse(42, -4, 14, 20, -0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Round body/head
      ctx.beginPath();
      ctx.arc(0, -10, 40, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Beak
      ctx.fillStyle = '#F97316';
      ctx.beginPath();
      ctx.moveTo(-10, -2);
      ctx.lineTo(10, -2);
      ctx.lineTo(0, 14);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Eyes
      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.arc(-14, -18, 5, 0, Math.PI * 2);
      ctx.arc(14, -18, 5, 0, Math.PI * 2);
      ctx.fill();
    } else if (id === 'horse') {
      // Friendly brown horse!
      ctx.fillStyle = '#92400E';
      ctx.strokeStyle = '#451A03';
      ctx.lineWidth = 3.5;
      // Ears
      ctx.beginPath();
      ctx.ellipse(-28, -44, 10, 18, -0.25, 0, Math.PI * 2);
      ctx.ellipse(28, -44, 10, 18, 0.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Dark mane tuft
      ctx.fillStyle = '#451A03';
      ctx.beginPath();
      ctx.arc(0, -48, 16, 0, Math.PI * 2);
      ctx.fill();
      // Face
      ctx.fillStyle = '#B45309';
      ctx.beginPath();
      ctx.ellipse(0, -10, 36, 42, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // White blaze stripe on forehead
      ctx.fillStyle = '#FEF3C7';
      fillRoundRect(ctx, -8, -40, 16, 28, 7);
      ctx.fill();
      // Muzzle
      ctx.fillStyle = '#FDE68A';
      ctx.beginPath();
      ctx.ellipse(0, 14, 24, 16, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Eyes
      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.arc(-15, -16, 5, 0, Math.PI * 2);
      ctx.arc(15, -16, 5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Friendly Farm Duck!
      ctx.fillStyle = '#FACC15';
      ctx.strokeStyle = '#92400E';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(0, -14, 38, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Orange bill
      ctx.fillStyle = '#F97316';
      ctx.beginPath();
      ctx.ellipse(0, 6, 22, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Eyes
      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.arc(-14, -22, 5, 0, Math.PI * 2);
      ctx.arc(14, -22, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}
