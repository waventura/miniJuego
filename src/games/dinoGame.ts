import {
  CharacterId,
  GAME_HEIGHT,
  GAME_WIDTH,
  InputSnapshot,
  MiniGame,
  VictoryData,
} from '../types';
import { drawCharacter } from '../art/characters';
import { drawCloud, drawStar, drawSun, fillRoundRect } from '../art/props';
import { sound } from '../audio/sound';

const DINOS_TO_RESCUE = 8;

interface DinoEgg {
  x: number;
  y: number;
  vx: number;
  phase: number;
  color: string;
  spotColor: string;
  hatched: boolean;
  hatchTimer: number;
  dinoColor: string;
}

interface PopSpark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
}

const EGG_STYLES = [
  { egg: '#FEF08A', spot: '#22C55E', dino: '#22C55E' },
  { egg: '#BAE6FD', spot: '#3B82F6', dino: '#3B82F6' },
  { egg: '#FBCFE8', spot: '#EC4899', dino: '#EC4899' },
  { egg: '#FED7AA', spot: '#F97316', dino: '#F97316' },
  { egg: '#DDD6FE', spot: '#8B5CF6', dino: '#8B5CF6' },
];

export class DinoGame implements MiniGame {
  private time = 0;
  private rescued = 0;
  private eggs: DinoEgg[] = [];
  private sparks: PopSpark[] = [];
  private playerX = GAME_WIDTH / 2;
  private facing: 1 | -1 = 1;
  private finished = false;
  private finishTimer = 0;

  constructor(private playerId: CharacterId) {
    // Start with 4 wiggly eggs on screen
    for (let i = 0; i < 4; i++) {
      this.spawnEgg(220 + i * 290, 480 + (i % 2) * 110);
    }
  }

  private spawnEgg(x?: number, y?: number): void {
    const style = EGG_STYLES[Math.floor(Math.random() * EGG_STYLES.length)];
    this.eggs.push({
      x: x ?? 180 + Math.random() * (GAME_WIDTH - 360),
      y: y ?? 390 + Math.random() * 260,
      vx: (Math.random() < 0.5 ? -1 : 1) * (45 + Math.random() * 55),
      phase: Math.random() * Math.PI * 2,
      color: style.egg,
      spotColor: style.spot,
      hatched: false,
      hatchTimer: 0,
      dinoColor: style.dino,
    });
  }

  public update(dt: number, input: InputSnapshot): VictoryData | null {
    this.time += dt;

    if (this.finished) {
      this.finishTimer += dt;
      if (this.finishTimer >= 1.25) {
        return {
          gameId: 'dinos',
          gameTitle: 'Parque de Dinosaurios',
          characterId: this.playerId,
          headline: '¡AMIGO DE LOS DINOS!',
          statLabel: `🦕 ¡Rescataste ${this.rescued} dinosaurios bebés!`,
          medalTitle: 'MEDALLA JURÁSICA',
          medalColor: 'rainbow',
        };
      }
      return null;
    }

    // Tap any egg directly to hatch it!
    for (const p of input.pointers) {
      if (!p.justPressed || p.y < 100) continue;

      // Move player cheerfully toward tapped spot
      if (p.x > this.playerX + 10) this.facing = 1;
      if (p.x < this.playerX - 10) this.facing = -1;
      this.playerX += (p.x - this.playerX) * 0.35;

      for (const egg of this.eggs) {
        if (egg.hatched) continue;
        const dx = p.x - egg.x;
        const dy = p.y - (egg.y - 24);
        if (dx * dx + dy * dy < 88 * 88) {
          egg.hatched = true;
          egg.hatchTimer = 1.6;
          this.rescued++;
          sound.playBonus();
          this.spawnSparks(egg.x, egg.y - 24, egg.dinoColor);

          if (this.rescued >= DINOS_TO_RESCUE) {
            this.finished = true;
            this.finishTimer = 0;
            sound.playFlagPlant();
          } else {
            this.spawnEgg();
          }
          break;
        }
      }
    }

    // Keyboard fallback (Space hatches nearest egg for desktop testing)
    if (input.keysJustPressed.has('Space')) {
      const nextEgg = this.eggs.find((e) => !e.hatched);
      if (nextEgg) {
        nextEgg.hatched = true;
        nextEgg.hatchTimer = 1.6;
        this.rescued++;
        sound.playBonus();
        this.spawnSparks(nextEgg.x, nextEgg.y - 24, nextEgg.dinoColor);
        if (this.rescued >= DINOS_TO_RESCUE) {
          this.finished = true;
          this.finishTimer = 0;
          sound.playFlagPlant();
        } else {
          this.spawnEgg();
        }
      }
    }

    // Update eggs
    for (const egg of this.eggs) {
      if (egg.hatched) {
        egg.hatchTimer -= dt;
      } else {
        egg.x += egg.vx * dt;
        if (egg.x < 130) {
          egg.x = 130;
          egg.vx = Math.abs(egg.vx);
        } else if (egg.x > GAME_WIDTH - 130) {
          egg.x = GAME_WIDTH - 130;
          egg.vx = -Math.abs(egg.vx);
        }
      }
    }
    this.eggs = this.eggs.filter((e) => !e.hatched || e.hatchTimer > 0);

    // Sparks
    for (const s of this.sparks) {
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vy += 300 * dt;
      s.life -= dt;
    }
    this.sparks = this.sparks.filter((s) => s.life > 0);

    return null;
  }

  private spawnSparks(x: number, y: number, color: string): void {
    for (let i = 0; i < 16; i++) {
      const a = (Math.PI * 2 * i) / 16;
      const spd = 90 + Math.random() * 160;
      this.sparks.push({
        x,
        y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd - 80,
        color: i % 2 === 0 ? color : '#FACC15',
        life: 0.65,
      });
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    // Prehistoric sunny sky
    ctx.fillStyle = '#7DD3FC';
    ctx.fillRect(0, 0, GAME_WIDTH, 380);

    drawSun(ctx, 1180, 92, this.time, 44);
    drawCloud(ctx, 210 + Math.sin(this.time * 0.35) * 16, 86, 0.9);
    drawCloud(ctx, 760 + Math.cos(this.time * 0.3) * 18, 72, 0.85);

    // Friendly cartoon volcano in distance
    ctx.fillStyle = '#78716C';
    ctx.beginPath();
    ctx.moveTo(780, 390);
    ctx.lineTo(940, 175);
    ctx.lineTo(1030, 175);
    ctx.lineTo(1180, 390);
    ctx.closePath();
    ctx.fill();

    // Cute volcano puff
    const puffY = Math.sin(this.time * 2) * 8;
    ctx.fillStyle = 'rgba(255,255,255,0.78)';
    ctx.beginPath();
    ctx.arc(985, 145 + puffY, 26, 0, Math.PI * 2);
    ctx.arc(1015, 128 + puffY, 22, 0, Math.PI * 2);
    ctx.fill();

    // Lush jungle hills
    ctx.fillStyle = '#4ADE80';
    ctx.beginPath();
    ctx.ellipse(280, 420, 480, 140, 0, 0, Math.PI * 2);
    ctx.ellipse(1040, 430, 520, 145, 0, 0, Math.PI * 2);
    ctx.fill();

    // Jungle meadow ground
    ctx.fillStyle = '#22C55E';
    ctx.fillRect(0, 375, GAME_WIDTH, GAME_HEIGHT - 375);

    // Cute palm trees on sides
    this.drawPalm(ctx, 90, 420);
    this.drawPalm(ctx, GAME_WIDTH - 90, 430);

    // Player cheering at bottom-left/center
    drawCharacter(ctx, {
      id: this.playerId,
      x: Math.max(150, Math.min(GAME_WIDTH - 150, this.playerX)),
      y: GAME_HEIGHT - 26,
      scale: 1.2,
      facing: this.facing,
      anim: this.finished ? 'celebrate' : 'idle',
      time: this.time,
    });

    // Sort eggs by y so foreground ones draw on top
    const sortedEggs = [...this.eggs].sort((a, b) => a.y - b.y);
    for (const egg of sortedEggs) {
      if (egg.hatched) {
        this.drawBabyDino(ctx, egg.x, egg.y, egg.dinoColor);
      } else {
        this.drawEgg(ctx, egg);
      }
    }

    // Sparks
    for (const s of this.sparks) {
      ctx.fillStyle = s.color;
      ctx.globalAlpha = Math.max(0, s.life * 1.5);
      ctx.beginPath();
      ctx.arc(s.x, s.y, 9, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Top HUD
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.strokeStyle = '#15803D';
    ctx.lineWidth = 4;
    fillRoundRect(ctx, GAME_WIDTH / 2 - 260, 22, 520, 62, 28);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#15803D';
    ctx.font = '900 30px "Fredoka", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      `¡TOCA LOS HUEVOS!  ${this.rescued} / ${DINOS_TO_RESCUE}`,
      GAME_WIDTH / 2,
      54
    );
    ctx.restore();
  }

  private drawPalm(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = '#92400E';
    ctx.lineWidth = 18;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(10, -80, 0, -150);
    ctx.stroke();

    ctx.fillStyle = '#16A34A';
    for (let i = 0; i < 5; i++) {
      ctx.save();
      ctx.translate(0, -150);
      ctx.rotate(-1.3 + i * 0.65);
      ctx.beginPath();
      ctx.ellipse(38, 0, 42, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  private drawEgg(ctx: CanvasRenderingContext2D, egg: DinoEgg): void {
    const wobble = Math.sin(this.time * 7 + egg.phase) * 0.14;
    const hop = Math.abs(Math.sin(this.time * 3.5 + egg.phase)) * -10;
    ctx.save();
    ctx.translate(egg.x, egg.y + hop);
    ctx.rotate(wobble);

    // Shadow
    ctx.fillStyle = 'rgba(15,23,42,0.16)';
    ctx.beginPath();
    ctx.ellipse(0, 4 - hop, 38, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // Egg shell
    ctx.fillStyle = egg.color;
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(0, -34, 38, 48, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Spots
    ctx.fillStyle = egg.spotColor;
    ctx.beginPath();
    ctx.arc(-14, -44, 10, 0, Math.PI * 2);
    ctx.arc(15, -26, 12, 0, Math.PI * 2);
    ctx.arc(-6, -14, 7, 0, Math.PI * 2);
    ctx.fill();

    // Cute crack hint
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-14, -36);
    ctx.lineTo(-4, -28);
    ctx.lineTo(6, -38);
    ctx.lineTo(14, -30);
    ctx.stroke();

    ctx.restore();
  }

  private drawBabyDino(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    color: string
  ): void {
    const bounce = Math.abs(Math.sin(this.time * 9)) * -16;
    ctx.save();
    ctx.translate(x, y + bounce);

    // Cute baby dino body
    ctx.fillStyle = color;
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(0, -28, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Head
    ctx.beginPath();
    ctx.arc(10, -56, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Happy eye
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(16, -60, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.arc(18, -60, 3.8, 0, Math.PI * 2);
    ctx.fill();

    // Smile
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(16, -50, 8, 0.1 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();

    // Broken bottom shell
    ctx.fillStyle = '#FEF9C3';
    ctx.beginPath();
    ctx.moveTo(-30, -14);
    ctx.lineTo(-18, -24);
    ctx.lineTo(-6, -12);
    ctx.lineTo(8, -24);
    ctx.lineTo(22, -12);
    ctx.lineTo(30, -18);
    ctx.arc(0, -14, 30, 0, Math.PI);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    drawStar(ctx, 0, -94, 14, this.time * 3);

    ctx.restore();
  }
}
