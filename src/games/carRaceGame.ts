import {
  CHARACTERS,
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
  drawCloud,
  drawCone,
  drawStar,
  drawSun,
  fillRoundRect,
} from '../art/props';
import { drawTactileButton, isRectHeld, isRectJustPressed } from '../ui/buttons';
import { sound } from '../audio/sound';

const LANE_Y = [375, 470, 565];

interface RoadItem {
  dist: number;
  lane: number;
  kind: 'star' | 'boost' | 'cone';
  collected: boolean;
}

interface CpuCar {
  id: CharacterId;
  lane: number;
  dist: number;
  speed: number;
  color: string;
}

interface ExhaustSpark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
}

export class CarRaceGame implements MiniGame {
  private time = 0;
  private finishDist: number;
  private playerDist = 0;
  private playerLane = 1;
  private playerY = LANE_Y[1];
  private speed = 290;
  private turboTimer = 0;
  private hopTimer = 0;
  private stars = 0;
  private finished = false;
  private finishTimer = 0;

  private items: RoadItem[] = [];
  private cpuCars: CpuCar[] = [];
  private sparks: ExhaustSpark[] = [];

  private upHeld = false;
  private downHeld = false;
  private turboHeld = false;
  private countdown = 2.1;
  private lastCountdownStep = 4;

  private upBtn: Rect = { x: 36, y: 632, w: 196, h: 132 };
  private downBtn: Rect = { x: 254, y: 632, w: 196, h: 132 };
  private turboBtn: Rect = { x: GAME_WIDTH - 356, y: 632, w: 320, h: 132 };

  constructor(private playerId: CharacterId, private level = 1) {
    this.finishDist = 4200 + (level - 1) * 1000;

    // 2 friendly CPU cars in other lanes
    const others = CHARACTERS.filter((c) => c.id !== playerId);
    const carColors = ['#3B82F6', '#22C55E', '#A855F7'];
    for (let i = 0; i < 2; i++) {
      this.cpuCars.push({
        id: others[i]?.id ?? 'pilot',
        lane: i === 0 ? 0 : 2,
        dist: 120 + i * 160,
        speed: 255 + level * 15 + i * 14,
        color: carColors[i % carColors.length],
      });
    }

    // Populate road with stars, turbo pads, and very friendly spaced cones
    for (let d = 520; d < this.finishDist - 400; d += 360) {
      const starLane = Math.floor(Math.random() * 3);
      this.items.push({ dist: d, lane: starLane, kind: 'star', collected: false });
      this.items.push({
        dist: d + 120,
        lane: starLane,
        kind: Math.random() < 0.28 ? 'boost' : 'star',
        collected: false,
      });

      if (d % 720 === 520) {
        const coneLane = (starLane + 1) % 3;
        this.items.push({
          dist: d + 60,
          lane: coneLane,
          kind: 'cone',
          collected: false,
        });
      }
    }
  }

  public update(dt: number, input: InputSnapshot): VictoryData | null {
    this.time += dt;

    if (this.countdown > 0) {
      this.countdown = Math.max(0, this.countdown - dt);
      const step = Math.ceil(this.countdown / 0.65);
      if (step < this.lastCountdownStep) {
        this.lastCountdownStep = step;
        if (step > 0) sound.playTap();
        else sound.playBonus();
      }
      if (this.countdown > 0.2) return null;
    }

    if (this.finished) {
      this.finishTimer += dt;
      if (this.finishTimer >= 1.15) {
        const rank =
          1 + this.cpuCars.filter((c) => c.dist > this.playerDist).length;
        return {
          gameId: 'cars',
          gameTitle: `¡Súper Carritos! (Nivel ${this.level})`,
          characterId: this.playerId,
          level: this.level,
          maxLevel: 3,
          headline:
            rank === 1 ? '¡CAMPEÓN DE CARRERAS!' : '¡SÚPER PILOTO!',
          statLabel: `★ ${this.stars} estrellas — Nivel ${this.level} completado`,
          medalTitle: 'MEDALLA DE PILOTO',
          medalColor: 'gold',
        };
      }
      return null;
    }

    this.upHeld = isRectHeld(input, this.upBtn);
    this.downHeld = isRectHeld(input, this.downBtn);
    this.turboHeld = isRectHeld(input, this.turboBtn);

    const upPressed =
      isRectJustPressed(input, this.upBtn) ||
      input.keysJustPressed.has('ArrowUp') ||
      input.keysJustPressed.has('KeyW');
    const downPressed =
      isRectJustPressed(input, this.downBtn) ||
      input.keysJustPressed.has('ArrowDown') ||
      input.keysJustPressed.has('KeyS');
    const turboPressed =
      isRectJustPressed(input, this.turboBtn) ||
      input.keysJustPressed.has('Space') ||
      input.keysJustPressed.has('ArrowRight');

    if (upPressed && this.playerLane > 0) {
      this.playerLane--;
      sound.playTap();
    }
    if (downPressed && this.playerLane < 2) {
      this.playerLane++;
      sound.playTap();
    }

    // Super easy direct lane tap! Touching any road lane moves the car right there!
    for (const p of input.pointers) {
      if (!p.justPressed) continue;
      if (p.y >= 315 && p.y <= 615) {
        const nextLane = p.y < 420 ? 0 : p.y < 518 ? 1 : 2;
        if (nextLane !== this.playerLane) {
          this.playerLane = nextLane;
          sound.playTap();
        }
      }
    }

    if (turboPressed) {
      this.turboTimer = 0.75;
      sound.playBoost();
    }

    // Smooth lane transition
    const targetY = LANE_Y[this.playerLane];
    this.playerY += (targetY - this.playerY) * Math.min(1, dt * 14);

    // Speed & turbo
    this.turboTimer = Math.max(0, this.turboTimer - dt);
    this.hopTimer = Math.max(0, this.hopTimer - dt);
    const baseSpeed = 290 + (this.level - 1) * 32;
    const targetSpeed = this.turboTimer > 0 ? baseSpeed + 190 : baseSpeed;
    this.speed += (targetSpeed - this.speed) * Math.min(1, dt * 8);
    this.playerDist += this.speed * dt;

    // Exhaust turbo flames
    if (this.turboTimer > 0 && Math.random() < 0.7) {
      this.sparks.push({
        x: 225,
        y: this.playerY - 12 + (Math.random() - 0.5) * 16,
        vx: -180 - Math.random() * 140,
        vy: (Math.random() - 0.5) * 60,
        color: Math.random() < 0.5 ? '#FACC15' : '#F97316',
        life: 0.35,
      });
    }

    // CPU cars with kid-friendly pacing
    for (const cpu of this.cpuCars) {
      const gap = this.playerDist - cpu.dist;
      const rubber = Math.max(-45, Math.min(40, gap * 0.09));
      cpu.dist += (cpu.speed + rubber) * dt;
    }

    // Collect items & gentle cone hops
    for (const item of this.items) {
      if (item.collected) continue;
      if (
        item.lane === this.playerLane &&
        Math.abs(item.dist - this.playerDist) < 62
      ) {
        item.collected = true;
        if (item.kind === 'star') {
          this.stars++;
          sound.playCollect();
        } else if (item.kind === 'boost') {
          this.stars += 2;
          this.turboTimer = 1.0;
          sound.playBonus();
        } else {
          // Gentle silly hop over cone (never stalls!)
          this.hopTimer = 0.45;
          sound.playBonk();
        }
      }
    }

    // Sparks
    for (const s of this.sparks) {
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.life -= dt;
    }
    this.sparks = this.sparks.filter((s) => s.life > 0);

    if (this.playerDist >= this.finishDist) {
      this.finished = true;
      this.finishTimer = 0;
      sound.playFlagPlant();
    }

    return null;
  }

  public render(ctx: CanvasRenderingContext2D): void {
    const camX = this.playerDist - 290;

    // Sky theme changes by level! (1=Day, 2=Sunset, 3=Starry Night)
    if (this.level === 1) {
      ctx.fillStyle = '#38BDF8';
    } else if (this.level === 2) {
      ctx.fillStyle = '#FB923C';
    } else {
      ctx.fillStyle = '#1E1B4B';
    }
    ctx.fillRect(0, 0, GAME_WIDTH, 320);

    if (this.level === 3) {
      // Twinkling night stars
      ctx.fillStyle = '#FEF08A';
      for (let i = 0; i < 24; i++) {
        const sx = (i * 173 + 60) % GAME_WIDTH;
        const sy = 36 + ((i * 71) % 210);
        const r = 2 + Math.sin(this.time * 4 + i) * 1.2;
        ctx.beginPath();
        ctx.arc(sx, sy, Math.max(1, r), 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      drawSun(
        ctx,
        1170,
        this.level === 2 ? 155 : 88,
        this.time,
        this.level === 2 ? 48 : 40
      );
      drawCloud(ctx, ((220 - camX * 0.1) % 1500 + 1500) % 1500 - 120, 88, 0.85);
      drawCloud(ctx, ((880 - camX * 0.1) % 1500 + 1500) % 1500 - 120, 72, 0.9);
    }

    // Hills & roadside grass
    ctx.fillStyle = this.level === 3 ? '#166534' : '#4ADE80';
    ctx.fillRect(0, 260, GAME_WIDTH, 70);

    // Asphalt 3-lane highway
    ctx.fillStyle = '#334155';
    ctx.fillRect(0, 322, GAME_WIDTH, 294);

    // Red/white racing curbs top & bottom
    const curbOffset = -(camX % 80);
    for (let x = curbOffset - 80; x < GAME_WIDTH + 80; x += 80) {
      ctx.fillStyle = '#EF4444';
      ctx.fillRect(x, 314, 40, 12);
      ctx.fillRect(x, 610, 40, 12);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(x + 40, 314, 40, 12);
      ctx.fillRect(x + 40, 610, 40, 12);
    }

    // Dashed lane dividers
    ctx.fillStyle = '#FACC15';
    const dashOffset = -(camX % 110);
    for (let x = dashOffset - 110; x < GAME_WIDTH + 110; x += 110) {
      ctx.fillRect(x, 420, 56, 7);
      ctx.fillRect(x, 516, 56, 7);
    }

    // Bottom grass bar for buttons
    ctx.fillStyle = this.level === 3 ? '#14532D' : '#22C55E';
    ctx.fillRect(0, 622, GAME_WIDTH, GAME_HEIGHT - 622);

    // Checkered finish line
    const finishX = this.finishDist - camX;
    if (finishX > -120 && finishX < GAME_WIDTH + 160) {
      const sq = 24;
      for (let row = 0; row < 12; row++) {
        for (let col = 0; col < 2; col++) {
          ctx.fillStyle = (row + col) % 2 === 0 ? '#FFFFFF' : '#0F172A';
          ctx.fillRect(finishX + col * sq, 326 + row * sq, sq, sq);
        }
      }
    }

    // Road items
    for (const item of this.items) {
      if (item.collected) continue;
      const sx = item.dist - camX;
      if (sx < -60 || sx > GAME_WIDTH + 60) continue;
      const sy = LANE_Y[item.lane];
      if (item.kind === 'star') {
        drawStar(ctx, sx, sy - 10, 24, this.time * 2);
      } else if (item.kind === 'boost') {
        // Bright turbo chevron pad!
        ctx.fillStyle = '#F97316';
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 3;
        fillRoundRect(ctx, sx - 28, sy - 20, 56, 36, 10);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#FEF08A';
        ctx.font = '900 22px "Fredoka", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⚡⚡', sx, sy - 1);
      } else {
        drawCone(ctx, sx, sy + 18, 0.9);
      }
    }

    // Draw cars sorted by lane Y
    const allCars: Array<{
      x: number;
      y: number;
      id: CharacterId;
      color: string;
      isPlayer: boolean;
    }> = this.cpuCars.map((c) => ({
      x: c.dist - camX,
      y: LANE_Y[c.lane],
      id: c.id,
      color: c.color,
      isPlayer: false,
    }));

    const hopOffset =
      this.hopTimer > 0 ? Math.sin((this.hopTimer / 0.45) * Math.PI) * -32 : 0;
    allCars.push({
      x: 290,
      y: this.playerY + hopOffset,
      id: this.playerId,
      color: '#EF4444',
      isPlayer: true,
    });
    allCars.sort((a, b) => a.y - b.y);

    for (const car of allCars) {
      if (car.x < -140 || car.x > GAME_WIDTH + 140) continue;
      this.drawRaceCar(ctx, car.x, car.y, car.id, car.color, car.isPlayer);
    }

    // Sparks
    for (const s of this.sparks) {
      ctx.fillStyle = s.color;
      ctx.globalAlpha = Math.max(0, s.life * 2.5);
      ctx.beginPath();
      ctx.arc(s.x, s.y, 9, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Top HUD: Level badge + Progress bar
    this.drawHud(ctx);

    // Big kid-friendly controls
    drawTactileButton(ctx, {
      rect: this.upBtn,
      label: '▲ SUBIR',
      bg: '#2563EB',
      border: '#1E3A8A',
      fontSize: 32,
      pressed: this.upHeld,
      radius: 26,
    });

    drawTactileButton(ctx, {
      rect: this.downBtn,
      label: '▼ BAJAR',
      bg: '#2563EB',
      border: '#1E3A8A',
      fontSize: 32,
      pressed: this.downHeld,
      radius: 26,
    });

    drawTactileButton(ctx, {
      rect: this.turboBtn,
      label: '🚀 ¡TURBO!',
      sublabel: '¡Súper velocidad!',
      bg: this.turboTimer > 0 ? '#F59E0B' : '#EF4444',
      border: '#991B1B',
      fontSize: 36,
      pressed: this.turboHeld || this.turboTimer > 0,
      radius: 28,
    });

    // Big 3, 2, 1, ¡YA! countdown banner
    if (this.countdown > 0) {
      const label =
        this.countdown > 1.4
          ? '3'
          : this.countdown > 0.75
          ? '2'
          : this.countdown > 0.2
          ? '1'
          : '¡YA!';
      ctx.save();
      ctx.fillStyle = label === '¡YA!' ? '#22C55E' : '#FACC15';
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(GAME_WIDTH / 2, 265, 92, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = label === '¡YA!' ? '#FFFFFF' : '#991B1B';
      ctx.font = '900 76px "Fredoka", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, GAME_WIDTH / 2, 270);
      ctx.restore();
    }
  }

  private drawRaceCar(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    driverId: CharacterId,
    color: string,
    isPlayer: boolean
  ): void {
    ctx.save();
    ctx.translate(x, y);

    // Night headlights
    if (this.level === 3) {
      ctx.fillStyle = 'rgba(254, 240, 138, 0.25)';
      ctx.beginPath();
      ctx.moveTo(64, -14);
      ctx.lineTo(220, -48);
      ctx.lineTo(220, 18);
      ctx.closePath();
      ctx.fill();
    }

    // Shadow
    ctx.fillStyle = 'rgba(15, 23, 42, 0.28)';
    ctx.beginPath();
    ctx.ellipse(0, 22, 68, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Driver peeking out of open cockpit!
    ctx.save();
    ctx.beginPath();
    ctx.rect(-50, -110, 100, 96);
    ctx.clip();
    drawCharacter(ctx, {
      id: driverId,
      x: -4,
      y: 36,
      scale: 0.78,
      anim: this.finished ? 'celebrate' : 'idle',
      time: this.time * 2,
    });
    ctx.restore();

    // Car body
    ctx.fillStyle = color;
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 4;
    fillRoundRect(ctx, -64, -22, 128, 36, 16);
    ctx.fill();
    ctx.stroke();

    // Racing stripe
    ctx.fillStyle = '#FACC15';
    ctx.fillRect(-52, -8, 104, 8);

    // Cute spoiler on back
    ctx.fillStyle = color;
    fillRoundRect(ctx, -74, -36, 18, 20, 5);
    ctx.fill();
    ctx.stroke();

    // Windshield
    ctx.fillStyle = '#BAE6FD';
    ctx.beginPath();
    ctx.moveTo(22, -22);
    ctx.lineTo(10, -40);
    ctx.lineTo(36, -22);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Wheels
    for (const wx of [-36, 36]) {
      ctx.fillStyle = '#1E293B';
      ctx.beginPath();
      ctx.arc(wx, 14, 17, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#E2E8F0';
      ctx.beginPath();
      ctx.arc(wx, 14, 7, 0, Math.PI * 2);
      ctx.fill();
    }

    if (isPlayer) {
      // Gold star number on side
      drawStar(ctx, 2, -4, 11, 0);
    }

    ctx.restore();
  }

  private drawHud(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    // Level pill
    ctx.fillStyle = '#FACC15';
    ctx.strokeStyle = '#B45309';
    ctx.lineWidth = 4;
    fillRoundRect(ctx, 112, 22, 166, 54, 22);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#78350F';
    ctx.font = '900 26px "Fredoka", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`NIVEL ${this.level}`, 195, 50);

    // Progress bar
    const bx = 300;
    const bw = 740;
    ctx.fillStyle = 'rgba(255,255,255,0.94)';
    ctx.strokeStyle = '#1E3A8A';
    fillRoundRect(ctx, bx, 26, bw, 46, 23);
    ctx.fill();
    ctx.stroke();

    const pct = Math.min(1, this.playerDist / this.finishDist);
    ctx.fillStyle = '#EF4444';
    fillRoundRect(ctx, bx + 8, 34, Math.max(30, (bw - 16) * pct), 30, 15);
    ctx.fill();

    // Stars count pill
    ctx.fillStyle = 'rgba(255,255,255,0.94)';
    ctx.strokeStyle = '#B45309';
    fillRoundRect(ctx, 1064, 22, 152, 54, 22);
    ctx.fill();
    ctx.stroke();
    drawStar(ctx, 1100, 49, 15, 0);
    ctx.fillStyle = '#1E293B';
    ctx.textAlign = 'left';
    ctx.fillText(`${this.stars}`, 1126, 51);
    ctx.restore();
  }
}
