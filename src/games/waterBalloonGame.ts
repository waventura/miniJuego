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

const MAX_LEVEL = 5;

type AnimalKind = 'duck' | 'frog' | 'turtle' | 'waterDino' | 'goldenDuck';

interface WaterAnimal {
  id: number;
  kind: AnimalKind;
  row: 0 | 1; // 0 = back wave, 1 = front wave
  x: number;
  y: number;
  vx: number;
  phase: number;
  splashed: boolean;
  splashAnim: number;
}

interface FlyingBalloon {
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  progress: number;
  color: string;
}

interface WaterDrop {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
}

interface SplashPop {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
}

const BALLOON_COLORS = ['#EF4444', '#3B82F6', '#FACC15', '#EC4899', '#22C55E', '#A855F7'];
const ROW_Y = [345, 495];

export class WaterBalloonGame implements MiniGame {
  private time = 0;
  private score = 0;
  private targetScore: number;
  private nextId = 1;
  private spawnTimer = 0.2;

  private animals: WaterAnimal[] = [];
  private balloons: FlyingBalloon[] = [];
  private drops: WaterDrop[] = [];
  private pops: SplashPop[] = [];

  private throwAnim = 0;
  private finished = false;
  private finishTimer = 0;

  constructor(private playerId: CharacterId, private level = 1) {
    this.targetScore = 8 + (level - 1) * 4; // 8, 12, 16, 20, 24 pts
    // Seed initial cute animals on both water rows
    for (let i = 0; i < 4; i++) {
      this.spawnAnimal((i % 2) as 0 | 1, 200 + i * 280);
    }
  }

  private spawnAnimal(forceRow?: 0 | 1, startX?: number): void {
    const row: 0 | 1 = forceRow ?? (Math.random() < 0.5 ? 0 : 1);
    const dir = row === 0 ? 1 : -1;
    const roll = Math.random();
    const kind: AnimalKind =
      roll < 0.14
        ? 'goldenDuck'
        : roll < 0.42
        ? 'waterDino'
        : roll < 0.64
        ? 'duck'
        : roll < 0.84
        ? 'frog'
        : 'turtle';

    const baseSpeed =
      kind === 'goldenDuck'
        ? 210 + this.level * 26
        : kind === 'waterDino'
        ? 155 + this.level * 22
        : kind === 'turtle'
        ? 110 + this.level * 18
        : 145 + this.level * 22;

    this.animals.push({
      id: this.nextId++,
      kind,
      row,
      x: startX ?? (dir === 1 ? -70 : GAME_WIDTH + 70),
      y: ROW_Y[row],
      vx: dir * baseSpeed,
      phase: Math.random() * Math.PI * 2,
      splashed: false,
      splashAnim: 0,
    });
  }

  public update(dt: number, input: InputSnapshot): VictoryData | null {
    this.time += dt;
    this.throwAnim = Math.max(0, this.throwAnim - dt * 4);

    // Update water drops & score pops
    for (const d of this.drops) {
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.vy += 420 * dt;
      d.life -= dt;
    }
    this.drops = this.drops.filter((d) => d.life > 0);

    for (const p of this.pops) {
      p.y -= 60 * dt;
      p.life -= dt;
    }
    this.pops = this.pops.filter((p) => p.life > 0);

    if (this.finished) {
      this.finishTimer += dt;
      if (this.finishTimer >= 1.2) {
        return {
          gameId: 'waterballoons',
          gameTitle: `¡Globos de Agua! (Nivel ${this.level})`,
          characterId: this.playerId,
          level: this.level,
          maxLevel: MAX_LEVEL,
          headline: '¡SÚPER PUNTERÍA!',
          statLabel: `💦 ¡${this.score} puntos de chapoteo!`,
          medalTitle: 'MEDALLA ACUÁTICA',
          medalColor: 'rainbow',
        };
      }
      return null;
    }

    // Tap anywhere in the water / animals area to throw a water balloon!
    for (const p of input.pointers) {
      if (!p.justPressed || p.y < 105) continue;
      this.launchBalloon(p.x, p.y);
    }

    // Keyboard fallback for desktop testing
    if (input.keysJustPressed.has('Space')) {
      const target = this.animals.find(
        (a) => !a.splashed && a.x > 120 && a.x < GAME_WIDTH - 120
      );
      if (target) {
        this.launchBalloon(target.x, target.y - 22);
      }
    }

    // Spawn animals steadily
    this.spawnTimer -= dt;
    const maxAnimals = 5 + Math.min(3, this.level);
    if (this.spawnTimer <= 0 && this.animals.length < maxAnimals) {
      this.spawnAnimal();
      this.spawnTimer = Math.max(0.55, 1.15 - this.level * 0.1);
    }

    // Update animals
    for (const a of this.animals) {
      if (a.splashed) {
        a.splashAnim += dt * 3;
      } else {
        a.x += a.vx * dt;
      }
    }
    this.animals = this.animals.filter(
      (a) =>
        (!a.splashed && a.x > -130 && a.x < GAME_WIDTH + 130) ||
        (a.splashed && a.splashAnim < 1)
    );

    // Update flying balloons
    const activeBalloons: FlyingBalloon[] = [];
    for (const b of this.balloons) {
      b.progress += dt * 3.1;
      if (b.progress >= 1) {
        this.burstBalloon(b.targetX, b.targetY, b.color);
      } else {
        activeBalloons.push(b);
      }
    }
    this.balloons = activeBalloons;

    return null;
  }

  private launchBalloon(tx: number, ty: number): void {
    this.throwAnim = 1;
    sound.playJump();
    this.balloons.push({
      startX: GAME_WIDTH / 2 + 55,
      startY: GAME_HEIGHT - 95,
      targetX: tx,
      targetY: ty,
      progress: 0,
      color: BALLOON_COLORS[Math.floor(Math.random() * BALLOON_COLORS.length)],
    });
  }

  private burstBalloon(x: number, y: number, balloonColor: string): void {
    // Big water splash droplets!
    for (let i = 0; i < 18; i++) {
      const a = (Math.PI * 2 * i) / 18;
      const spd = 90 + Math.random() * 190;
      this.drops.push({
        x,
        y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd - 90,
        size: 6 + Math.random() * 6,
        color: i % 4 === 0 ? balloonColor : '#38BDF8',
        life: 0.55,
      });
    }

    // Check if balloon splashed an animal (generous kid-friendly splash radius!)
    let hitAny = false;
    for (const a of this.animals) {
      if (a.splashed) continue;
      const bob = Math.sin(this.time * 4 + a.phase) * 8;
      const dx = a.x - x;
      const dy = a.y - 26 + bob - y;
      if (dx * dx + dy * dy < 88 * 88) {
        a.splashed = true;
        a.splashAnim = 0;
        hitAny = true;

        const pts =
          a.kind === 'goldenDuck'
            ? 3
            : a.kind === 'waterDino' || a.kind === 'turtle'
            ? 2
            : 1;
        this.score += pts;
        this.pops.push({
          x: a.x,
          y: a.y - 54,
          text:
            pts === 3
              ? '💦 ¡+3 DORADO!'
              : a.kind === 'waterDino'
              ? '🦕 ¡SPLASH DINO! +2'
              : `💦 ¡SPLASH! +${pts}`,
          color: pts === 3 ? '#EA580C' : a.kind === 'waterDino' ? '#16A34A' : '#0284C7',
          life: 0.9,
        });

        if (pts >= 2) sound.playBonus();
        else sound.playSplash();

        if (this.score >= this.targetScore && !this.finished) {
          this.finished = true;
          this.finishTimer = 0;
          sound.playFlagPlant();
        }
      }
    }

    if (!hitAny) {
      sound.playSplash();
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    // Bright summer sky
    ctx.fillStyle = '#7DD3FC';
    ctx.fillRect(0, 0, GAME_WIDTH, 320);

    drawSun(ctx, 1180, 128, this.time, 40);
    drawCloud(ctx, 210 + Math.sin(this.time * 0.4) * 14, 124, 0.85);
    drawCloud(ctx, 840 + Math.cos(this.time * 0.35) * 16, 114, 0.88);

    // Colorful fairground awning stripes at very top
    const stripeW = 84;
    for (let x = 0; x < GAME_WIDTH; x += stripeW) {
      ctx.fillStyle = (x / stripeW) % 2 === 0 ? '#EF4444' : '#FFFFFF';
      ctx.fillRect(x, 0, stripeW, 56);
      ctx.beginPath();
      ctx.arc(x + stripeW / 2, 56, stripeW / 2, 0, Math.PI);
      ctx.fill();
    }

    // Back pool water
    ctx.fillStyle = '#0284C7';
    ctx.fillRect(0, 290, GAME_WIDTH, 145);

    // Back row animals (row 0)
    for (const a of this.animals) {
      if (a.row === 0) this.drawAnimal(ctx, a);
    }

    // Middle animated wave strip
    this.drawWaveStrip(ctx, 368, '#38BDF8', 0);

    // Front pool water
    ctx.fillStyle = '#0EA5E9';
    ctx.fillRect(0, 425, GAME_WIDTH, 165);

    // Front row animals (row 1)
    for (const a of this.animals) {
      if (a.row === 1) this.drawAnimal(ctx, a);
    }

    // Front animated wave strip
    this.drawWaveStrip(ctx, 520, '#7DD3FC', 2.2);

    // Wooden fairground booth counter at bottom
    ctx.fillStyle = '#D97706';
    ctx.fillRect(0, 588, GAME_WIDTH, GAME_HEIGHT - 588);
    ctx.fillStyle = '#B45309';
    ctx.fillRect(0, 588, GAME_WIDTH, 14);

    // Player character behind the booth with balloon basket!
    drawCharacter(ctx, {
      id: this.playerId,
      x: GAME_WIDTH / 2 - 55,
      y: GAME_HEIGHT - 14,
      scale: 1.38,
      facing: 1,
      anim: this.finished ? 'celebrate' : this.throwAnim > 0.2 ? 'jump' : 'idle',
      time: this.time,
    });

    // Basket full of colorful water balloons
    this.drawBalloonBasket(ctx, GAME_WIDTH / 2 + 78, GAME_HEIGHT - 44);

    // Flying water balloons!
    for (const b of this.balloons) {
      const t = b.progress;
      const x = b.startX + (b.targetX - b.startX) * t;
      const y =
        b.startY + (b.targetY - b.startY) * t - Math.sin(t * Math.PI) * 140;
      const s = 1.25 - t * 0.55;
      this.drawWaterBalloon(ctx, x, y, b.color, s);
    }

    // Water splash drops
    for (const d of this.drops) {
      ctx.fillStyle = d.color;
      ctx.globalAlpha = Math.max(0, d.life * 1.9);
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Floating splash score pops
    for (const p of this.pops) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, p.life * 1.8);
      ctx.fillStyle = p.color;
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 6;
      ctx.font = '900 32px "Fredoka", sans-serif';
      ctx.textAlign = 'center';
      ctx.strokeText(p.text, p.x, p.y);
      ctx.fillText(p.text, p.x, p.y);
      ctx.restore();
    }

    // Hint text on wooden counter
    ctx.fillStyle = '#FEF3C7';
    ctx.font = '900 28px "Fredoka", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('💦 ¡Toca a los patitos y animales!', 48, 695);

    // Top HUD
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.strokeStyle = '#0369A1';
    ctx.lineWidth = 5;
    fillRoundRect(ctx, GAME_WIDTH / 2 - 330, 18, 660, 62, 28);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#0369A1';
    ctx.font = '900 30px "Fredoka", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      `NIVEL ${this.level} / ${MAX_LEVEL}  •  💦 PUNTOS: ${this.score} / ${this.targetScore}`,
      GAME_WIDTH / 2,
      50
    );
    ctx.restore();
  }

  private drawWaveStrip(
    ctx: CanvasRenderingContext2D,
    y: number,
    color: string,
    phase: number
  ): void {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, y + 65);
    for (let x = 0; x <= GAME_WIDTH + 40; x += 40) {
      const wy = y + Math.sin(x * 0.025 + this.time * 3.5 + phase) * 10;
      ctx.lineTo(x, wy);
    }
    ctx.lineTo(GAME_WIDTH, y + 65);
    ctx.closePath();
    ctx.fill();
  }

  private drawWaterBalloon(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    color: string,
    scale = 1
  ): void {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    ctx.fillStyle = color;
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(0, 0, 20, 24, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Knot on top
    ctx.beginPath();
    ctx.moveTo(-5, -24);
    ctx.lineTo(5, -24);
    ctx.lineTo(0, -30);
    ctx.closePath();
    ctx.fill();

    // Watery gloss shine
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath();
    ctx.ellipse(-7, -6, 5, 9, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawBalloonBasket(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number
  ): void {
    ctx.save();
    ctx.translate(x, y);
    // Peek colorful balloons out of basket
    this.drawWaterBalloon(ctx, -28, -48, '#EF4444', 0.85);
    this.drawWaterBalloon(ctx, 26, -46, '#3B82F6', 0.85);
    this.drawWaterBalloon(ctx, 0, -54, '#FACC15', 0.9);

    // Basket body
    ctx.fillStyle = '#92400E';
    ctx.strokeStyle = '#451A03';
    ctx.lineWidth = 4;
    fillRoundRect(ctx, -56, -42, 112, 64, 16);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#F59E0B';
    ctx.fillRect(-52, -24, 104, 10);
    ctx.restore();
  }

  private drawAnimal(ctx: CanvasRenderingContext2D, a: WaterAnimal): void {
    const bob = Math.sin(this.time * 4 + a.phase) * 8;
    const facing = a.vx >= 0 ? 1 : -1;
    const scale = a.row === 0 ? 0.92 : 1.12;
    const sinkY = a.splashed ? a.splashAnim * 46 : 0;

    ctx.save();
    ctx.translate(a.x, a.y + bob + sinkY);
    ctx.scale(scale * facing, scale);
    if (a.splashed) {
      ctx.rotate(a.splashAnim * 0.7);
      ctx.globalAlpha = Math.max(0, 1 - a.splashAnim);
    }

    if (a.kind === 'duck' || a.kind === 'goldenDuck') {
      const isGold = a.kind === 'goldenDuck';
      // Duck body
      ctx.fillStyle = isGold ? '#F59E0B' : '#FACC15';
      ctx.strokeStyle = '#92400E';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.ellipse(0, -14, 38, 24, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Tail
      ctx.beginPath();
      ctx.moveTo(-34, -18);
      ctx.lineTo(-48, -32);
      ctx.lineTo(-26, -28);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Wing
      ctx.fillStyle = isGold ? '#FDE047' : '#FEF08A';
      ctx.beginPath();
      ctx.ellipse(-4, -12, 18, 11, -0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Head
      ctx.fillStyle = isGold ? '#F59E0B' : '#FACC15';
      ctx.beginPath();
      ctx.arc(22, -44, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Orange beak
      ctx.fillStyle = '#F97316';
      ctx.beginPath();
      ctx.ellipse(44, -40, 13, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Eye
      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.arc(28, -48, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(30, -50, 1.8, 0, Math.PI * 2);
      ctx.fill();

      // Golden crown on Golden Duck!
      if (isGold) {
        ctx.fillStyle = '#FEF08A';
        ctx.strokeStyle = '#B45309';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(8, -62);
        ctx.lineTo(12, -78);
        ctx.lineTo(20, -68);
        ctx.lineTo(26, -80);
        ctx.lineTo(32, -68);
        ctx.lineTo(38, -76);
        ctx.lineTo(36, -62);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        drawStar(ctx, 22, -88, 10, this.time * 3);
      }
    } else if (a.kind === 'frog') {
      // Cute green frog on lily pad!
      ctx.fillStyle = '#15803D';
      ctx.beginPath();
      ctx.ellipse(0, 2, 46, 12, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#22C55E';
      ctx.strokeStyle = '#14532D';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.ellipse(0, -18, 34, 24, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Big frog eyes on top
      for (const ex of [-14, 14]) {
        ctx.fillStyle = '#22C55E';
        ctx.beginPath();
        ctx.arc(ex, -40, 13, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(ex, -40, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0F172A';
        ctx.beginPath();
        ctx.arc(ex + 2, -40, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      // Rosy cheeks & wide smile
      ctx.fillStyle = '#F472B6';
      ctx.beginPath();
      ctx.arc(-20, -16, 5, 0, Math.PI * 2);
      ctx.arc(20, -16, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#14532D';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, -18, 14, 0.1 * Math.PI, 0.9 * Math.PI);
      ctx.stroke();
    } else if (a.kind === 'waterDino') {
      // Cute friendly dinosaur swimming in a colorful pool floatie!
      // Dino body & long friendly neck
      ctx.fillStyle = '#22C55E';
      ctx.strokeStyle = '#15803D';
      ctx.lineWidth = 3.5;

      // Tail behind floatie
      ctx.beginPath();
      ctx.moveTo(-26, -12);
      ctx.quadraticCurveTo(-48, -24, -52, -38);
      ctx.quadraticCurveTo(-34, -34, -20, -20);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Long dino neck + cute head
      ctx.beginPath();
      ctx.moveTo(6, -12);
      ctx.quadraticCurveTo(10, -44, 18, -56);
      ctx.lineTo(34, -52);
      ctx.quadraticCurveTo(26, -34, 24, -12);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Dino snout/head
      fillRoundRect(ctx, 8, -72, 42, 26, 12);
      ctx.fill();
      ctx.stroke();

      // Orange back spikes on neck
      ctx.fillStyle = '#F97316';
      ctx.beginPath();
      ctx.arc(10, -56, 4.5, 0, Math.PI * 2);
      ctx.arc(8, -42, 4.5, 0, Math.PI * 2);
      ctx.fill();

      // Happy dino eye & smile
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(28, -61, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.arc(30, -61, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#15803D';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.arc(36, -54, 7, 0.1 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();

      // Bright pink/yellow striped swim floatie ring!
      ctx.fillStyle = '#EC4899';
      ctx.strokeStyle = '#9D174D';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.ellipse(0, -4, 40, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#FACC15';
      ctx.beginPath();
      ctx.ellipse(-18, -4, 9, 12, 0, 0, Math.PI * 2);
      ctx.ellipse(18, -4, 9, 12, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Friendly swimming turtle!
      ctx.fillStyle = '#16A34A';
      ctx.strokeStyle = '#14532D';
      ctx.lineWidth = 3.5;
      // Head
      ctx.beginPath();
      ctx.arc(38, -22, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.arc(43, -25, 3.8, 0, Math.PI * 2);
      ctx.fill();

      // Shell
      ctx.fillStyle = '#059669';
      ctx.beginPath();
      ctx.arc(0, -8, 36, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Yellow shell spots
      ctx.fillStyle = '#FACC15';
      ctx.beginPath();
      ctx.arc(-14, -22, 7, 0, Math.PI * 2);
      ctx.arc(6, -28, 8, 0, Math.PI * 2);
      ctx.arc(18, -16, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}
