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
import { drawTactileButton, isRectHeld, isRectJustPressed } from '../ui/buttons';
import { sound } from '../audio/sound';

const MAX_LEVEL = 10;

type AnimalKind = 'duck' | 'frog' | 'turtle' | 'waterDino' | 'goldenDuck' | 'shark';

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
  canDive: boolean;
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
  private timeLeft: number;
  private hasTimer: boolean;
  private nextId = 1;
  private spawnTimer = 0.2;

  private animals: WaterAnimal[] = [];
  private balloons: FlyingBalloon[] = [];
  private drops: WaterDrop[] = [];
  private pops: SplashPop[] = [];

  private throwAnim = 0;
  private finished = false;
  private failed = false;
  private finishTimer = 0;
  private retryHeld = false;

  private retryBtn: Rect = {
    x: GAME_WIDTH / 2 - 220,
    y: 454,
    w: 440,
    h: 92,
  };

  constructor(private playerId: CharacterId, private level = 1) {
    this.targetScore = 8 + (level - 1) * 2; // 8..26 pts across 10 levels
    this.hasTimer = level >= 4;
    this.timeLeft = 36 + Math.max(0, 6 - Math.floor(level / 2));
    this.resetRound();
  }

  private resetRound(): void {
    this.score = 0;
    this.failed = false;
    this.timeLeft = 36 + Math.max(0, 6 - Math.floor(this.level / 2));
    this.animals = [];
    this.balloons = [];
    this.drops = [];
    this.pops = [];
    for (let i = 0; i < 4; i++) {
      this.spawnAnimal((i % 2) as 0 | 1, 200 + i * 280);
    }
  }

  private spawnAnimal(forceRow?: 0 | 1, startX?: number): void {
    const row: 0 | 1 = forceRow ?? (Math.random() < 0.5 ? 0 : 1);
    const dir = row === 0 ? 1 : -1;
    const roll = Math.random();

    const sharkChance = this.level >= 3 ? Math.min(0.24, 0.1 + (this.level - 3) * 0.025) : 0;
    let kind: AnimalKind;
    if (roll < sharkChance) {
      kind = 'shark';
    } else if (roll < sharkChance + 0.14) {
      kind = 'goldenDuck';
    } else if (roll < sharkChance + 0.4) {
      kind = 'waterDino';
    } else if (roll < sharkChance + 0.62) {
      kind = 'duck';
    } else if (roll < sharkChance + 0.82) {
      kind = 'frog';
    } else {
      kind = 'turtle';
    }

    const levelBoost = (this.level - 1) * 20;
    const baseSpeed =
      kind === 'goldenDuck'
        ? 230 + levelBoost
        : kind === 'shark'
        ? 175 + levelBoost
        : kind === 'waterDino'
        ? 165 + levelBoost
        : kind === 'turtle'
        ? 125 + levelBoost * 0.8
        : 155 + levelBoost;

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
      canDive: this.level >= 5 && kind !== 'shark' && Math.random() < 0.45,
    });
  }

  public update(dt: number, input: InputSnapshot): VictoryData | null {
    this.time += dt;
    this.throwAnim = Math.max(0, this.throwAnim - dt * 4);

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
          gameTitle: `¡Globos de Agua! (Nivel ${this.level} de ${MAX_LEVEL})`,
          characterId: this.playerId,
          level: this.level,
          maxLevel: MAX_LEVEL,
          headline:
            this.level === MAX_LEVEL
              ? '¡CAMPEÓN DEL AGUA!'
              : '¡SÚPER PUNTERÍA!',
          statLabel: `💦 ¡${this.score} puntos de chapoteo!`,
          medalTitle: 'MEDALLA ACUÁTICA',
          medalColor: 'rainbow',
        };
      }
      return null;
    }

    if (this.failed) {
      this.retryHeld = isRectHeld(input, this.retryBtn);
      if (
        isRectJustPressed(input, this.retryBtn) ||
        input.keysJustPressed.has('Space') ||
        input.keysJustPressed.has('Enter')
      ) {
        sound.playSelect();
        this.resetRound();
      }
      return null;
    }

    if (this.hasTimer) {
      this.timeLeft = Math.max(0, this.timeLeft - dt);
      if (this.timeLeft <= 0) {
        this.failed = true;
        sound.playBonk();
        return null;
      }
    }

    // Tap anywhere to throw a water balloon!
    for (const p of input.pointers) {
      if (!p.justPressed || p.y < 105) continue;
      this.launchBalloon(p.x, p.y);
    }

    if (input.keysJustPressed.has('Space')) {
      const target = this.animals.find(
        (a) => !a.splashed && a.kind !== 'shark' && a.x > 120 && a.x < GAME_WIDTH - 120
      );
      if (target) {
        this.launchBalloon(target.x, target.y - 22);
      }
    }

    // Spawn animals steadily
    this.spawnTimer -= dt;
    const maxAnimals = 5 + Math.min(4, Math.floor(this.level / 2));
    if (this.spawnTimer <= 0 && this.animals.length < maxAnimals) {
      this.spawnAnimal();
      this.spawnTimer = Math.max(0.45, 1.05 - this.level * 0.06);
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

  private isAnimalSubmerged(a: WaterAnimal): boolean {
    if (!a.canDive) return false;
    return Math.sin(this.time * 2.2 + a.phase) < -0.45;
  }

  private burstBalloon(x: number, y: number, balloonColor: string): void {
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

    let hitAny = false;
    const hitRadius = Math.max(66, 86 - this.level * 2);

    for (const a of this.animals) {
      if (a.splashed || this.isAnimalSubmerged(a)) continue;
      const bob = Math.sin(this.time * 4 + a.phase) * 8;
      const dx = a.x - x;
      const dy = a.y - 26 + bob - y;
      if (dx * dx + dy * dy < hitRadius * hitRadius) {
        a.splashed = true;
        a.splashAnim = 0;
        hitAny = true;

        if (a.kind === 'shark') {
          this.score = Math.max(0, this.score - 1);
          sound.playBonk();
          this.pops.push({
            x: a.x,
            y: a.y - 54,
            text: '🦈 ¡UPS! TIBURÓN -1',
            color: '#DC2626',
            life: 0.95,
          });
          continue;
        }

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
          color:
            pts === 3
              ? '#EA580C'
              : a.kind === 'waterDino'
              ? '#16A34A'
              : '#0284C7',
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
    // Sky theme changes by level (Day -> Sunset -> Night!)
    const isNight = this.level >= 8;
    const isSunset = this.level >= 5 && this.level <= 7;
    ctx.fillStyle = isNight ? '#1E1B4B' : isSunset ? '#FB923C' : '#7DD3FC';
    ctx.fillRect(0, 0, GAME_WIDTH, 320);

    if (!isNight) {
      drawSun(ctx, 1180, isSunset ? 160 : 128, this.time, 40);
      drawCloud(ctx, 210 + Math.sin(this.time * 0.4) * 14, 124, 0.85);
      drawCloud(ctx, 840 + Math.cos(this.time * 0.35) * 16, 114, 0.88);
    }

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
    ctx.fillStyle = isNight ? '#0369A1' : '#0284C7';
    ctx.fillRect(0, 290, GAME_WIDTH, 145);

    for (const a of this.animals) {
      if (a.row === 0) this.drawAnimal(ctx, a);
    }

    this.drawWaveStrip(ctx, 368, '#38BDF8', 0);

    // Front pool water
    ctx.fillStyle = isNight ? '#0284C7' : '#0EA5E9';
    ctx.fillRect(0, 425, GAME_WIDTH, 165);

    for (const a of this.animals) {
      if (a.row === 1) this.drawAnimal(ctx, a);
    }

    this.drawWaveStrip(ctx, 520, '#7DD3FC', 2.2);

    // Wooden booth counter
    ctx.fillStyle = '#D97706';
    ctx.fillRect(0, 588, GAME_WIDTH, GAME_HEIGHT - 588);
    ctx.fillStyle = '#B45309';
    ctx.fillRect(0, 588, GAME_WIDTH, 14);

    // Player character behind booth
    drawCharacter(ctx, {
      id: this.playerId,
      x: GAME_WIDTH / 2 - 55,
      y: GAME_HEIGHT - 14,
      scale: 1.38,
      facing: 1,
      anim: this.finished ? 'celebrate' : this.throwAnim > 0.2 ? 'jump' : 'idle',
      time: this.time,
    });

    this.drawBalloonBasket(ctx, GAME_WIDTH / 2 + 78, GAME_HEIGHT - 44);

    // Flying balloons
    for (const b of this.balloons) {
      const t = b.progress;
      const x = b.startX + (b.targetX - b.startX) * t;
      const y =
        b.startY + (b.targetY - b.startY) * t - Math.sin(t * Math.PI) * 140;
      const s = 1.25 - t * 0.55;
      this.drawWaterBalloon(ctx, x, y, b.color, s);
    }

    // Drops
    for (const d of this.drops) {
      ctx.fillStyle = d.color;
      ctx.globalAlpha = Math.max(0, d.life * 1.9);
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Pops
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

    // Hint text
    ctx.fillStyle = '#FEF3C7';
    ctx.font = '900 25px "Fredoka", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(
      this.level >= 3
        ? '💦 ¡Moja patos y dinos! ¡Evita al tiburón!'
        : '💦 ¡Toca a los patitos y dinosaurios!',
      42,
      695
    );

    // Top HUD
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.strokeStyle = '#0369A1';
    ctx.lineWidth = 5;
    fillRoundRect(ctx, GAME_WIDTH / 2 - 410, 18, 820, 62, 28);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#0369A1';
    ctx.font = '900 28px "Fredoka", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const timerStr = this.hasTimer ? `  •  ⏱ ${Math.ceil(this.timeLeft)}s` : '';
    ctx.fillText(
      `NIVEL ${this.level} / ${MAX_LEVEL}  •  💦 ${this.score} / ${this.targetScore}${timerStr}`,
      GAME_WIDTH / 2,
      50
    );
    ctx.restore();

    if (this.failed) {
      ctx.save();
      ctx.fillStyle = 'rgba(15, 23, 42, 0.58)';
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

      ctx.fillStyle = '#991B1B';
      fillRoundRect(ctx, GAME_WIDTH / 2 - 320, 212, 640, 368, 36);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 8;
      fillRoundRect(ctx, GAME_WIDTH / 2 - 320, 200, 640, 368, 36);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#EA580C';
      ctx.font = '900 46px "Fredoka", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('¡SE ACABÓ EL TIEMPO!', GAME_WIDTH / 2, 286);

      ctx.fillStyle = '#334155';
      ctx.font = '800 28px "Fredoka", sans-serif';
      ctx.fillText(
        `Lograste ${this.score} de ${this.targetScore} puntos en Nivel ${this.level}`,
        GAME_WIDTH / 2,
        366
      );
      ctx.restore();

      drawTactileButton(ctx, {
        rect: this.retryBtn,
        label: '↻ ¡INTENTAR OTRA VEZ!',
        bg: '#22C55E',
        border: '#15803D',
        fontSize: 34,
        pressed: this.retryHeld,
        radius: 26,
      });
    }
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

    ctx.beginPath();
    ctx.moveTo(-5, -24);
    ctx.lineTo(5, -24);
    ctx.lineTo(0, -30);
    ctx.closePath();
    ctx.fill();

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
    this.drawWaterBalloon(ctx, -28, -48, '#EF4444', 0.85);
    this.drawWaterBalloon(ctx, 26, -46, '#3B82F6', 0.85);
    this.drawWaterBalloon(ctx, 0, -54, '#FACC15', 0.9);

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
    const submerged = this.isAnimalSubmerged(a);
    const bob = Math.sin(this.time * 4 + a.phase) * 8;
    const facing = a.vx >= 0 ? 1 : -1;
    const scale = a.row === 0 ? 0.92 : 1.12;
    const sinkY = a.splashed ? a.splashAnim * 46 : submerged ? 52 : 0;

    ctx.save();
    ctx.translate(a.x, a.y + bob + sinkY);
    ctx.scale(scale * facing, scale);
    if (a.splashed) {
      ctx.rotate(a.splashAnim * 0.7);
      ctx.globalAlpha = Math.max(0, 1 - a.splashAnim);
    } else if (submerged) {
      ctx.globalAlpha = 0.25;
    }

    if (a.kind === 'shark') {
      // Silly pirate shark — avoid splashing!
      ctx.fillStyle = '#64748B';
      ctx.strokeStyle = '#1E293B';
      ctx.lineWidth = 3.5;
      // Fin
      ctx.beginPath();
      ctx.moveTo(-12, -32);
      ctx.lineTo(-2, -62);
      ctx.lineTo(14, -30);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Body
      ctx.beginPath();
      ctx.ellipse(0, -14, 44, 24, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Red warning X badge
      ctx.fillStyle = '#EF4444';
      ctx.beginPath();
      ctx.arc(0, -14, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-5, -19);
      ctx.lineTo(5, -9);
      ctx.moveTo(5, -19);
      ctx.lineTo(-5, -9);
      ctx.stroke();
      // Eye
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(26, -22, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.arc(28, -22, 3, 0, Math.PI * 2);
      ctx.fill();
    } else if (a.kind === 'duck' || a.kind === 'goldenDuck') {
      const isGold = a.kind === 'goldenDuck';
      ctx.fillStyle = isGold ? '#F59E0B' : '#FACC15';
      ctx.strokeStyle = '#92400E';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.ellipse(0, -14, 38, 24, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-34, -18);
      ctx.lineTo(-48, -32);
      ctx.lineTo(-26, -28);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = isGold ? '#FDE047' : '#FEF08A';
      ctx.beginPath();
      ctx.ellipse(-4, -12, 18, 11, -0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = isGold ? '#F59E0B' : '#FACC15';
      ctx.beginPath();
      ctx.arc(22, -44, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#F97316';
      ctx.beginPath();
      ctx.ellipse(44, -40, 13, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.arc(28, -48, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(30, -50, 1.8, 0, Math.PI * 2);
      ctx.fill();
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
      ctx.fillStyle = '#22C55E';
      ctx.strokeStyle = '#15803D';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(-26, -12);
      ctx.quadraticCurveTo(-48, -24, -52, -38);
      ctx.quadraticCurveTo(-34, -34, -20, -20);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(6, -12);
      ctx.quadraticCurveTo(10, -44, 18, -56);
      ctx.lineTo(34, -52);
      ctx.quadraticCurveTo(26, -34, 24, -12);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      fillRoundRect(ctx, 8, -72, 42, 26, 12);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#F97316';
      ctx.beginPath();
      ctx.arc(10, -56, 4.5, 0, Math.PI * 2);
      ctx.arc(8, -42, 4.5, 0, Math.PI * 2);
      ctx.fill();
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
      ctx.fillStyle = '#16A34A';
      ctx.strokeStyle = '#14532D';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(38, -22, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.arc(43, -25, 3.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#059669';
      ctx.beginPath();
      ctx.arc(0, -8, 36, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
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
