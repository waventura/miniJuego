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
  drawPuddle,
  drawStar,
  drawSun,
  fillRoundRect,
} from '../art/props';
import { drawTactileButton, isRectHeld, isRectJustPressed } from '../ui/buttons';
import { sound } from '../audio/sound';

interface Racer {
  id: CharacterId;
  name: string;
  isPlayer: boolean;
  lane: number; // 0..3 (3 is player foreground lane)
  dist: number;
  speed: number;
  yOffset: number; // jump height (negative is up)
  vy: number;
  stumbleTimer: number;
  cpuBaseSpeed: number;
  cpuPhase: number;
}

interface Obstacle {
  dist: number;
  kind: 'cone' | 'puddle';
  hit: boolean;
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

const FINISH_DIST = 4800;
const LANE_Y = [400, 456, 514, 580];

export class RaceGame implements MiniGame {
  private time = 0;
  private racers: Racer[] = [];
  private obstacles: Obstacle[] = [];
  private sparks: Spark[] = [];
  private finished = false;
  private finishTimer = 0;
  private playerRank = 1;
  private boostFlash = 0;

  private finishDist: number;

  private jumpBtn: Rect = { x: 42, y: 632, w: 320, h: 132 };
  private accelBtn: Rect = { x: GAME_WIDTH - 362, y: 632, w: 320, h: 132 };

  constructor(private playerId: CharacterId, private level = 1) {
    this.finishDist = FINISH_DIST + (level - 1) * 900;
    const others = CHARACTERS.filter((c) => c.id !== playerId);
    const cpuPicks = others.slice(0, 3);
    const playerMeta =
      CHARACTERS.find((c) => c.id === playerId) ?? CHARACTERS[0];

    cpuPicks.forEach((c, i) => {
      this.racers.push({
        id: c.id,
        name: c.name,
        isPlayer: false,
        lane: i,
        dist: 0,
        speed: 190,
        yOffset: 0,
        vy: 0,
        stumbleTimer: 0,
        cpuBaseSpeed: 190 + (level - 1) * 18 + i * 16,
        cpuPhase: i * 1.9,
      });
    });

    this.racers.push({
      id: playerMeta.id,
      name: playerMeta.name,
      isPlayer: true,
      lane: 3,
      dist: 0,
      speed: 185,
      yOffset: 0,
      vy: 0,
      stumbleTimer: 0,
      cpuBaseSpeed: 0,
      cpuPhase: 0,
    });

    // Place kid-friendly spaced cones & puddles on player lane
    const spacing = Math.max(460, 580 - (level - 1) * 50);
    for (let d = 700; d < this.finishDist - 450; d += spacing + Math.random() * 200) {
      this.obstacles.push({
        dist: d,
        kind: Math.random() < 0.55 ? 'cone' : 'puddle',
        hit: false,
      });
    }
  }

  public update(dt: number, input: InputSnapshot): VictoryData | null {
    this.time += dt;
    this.boostFlash = Math.max(0, this.boostFlash - dt * 4);

    const player = this.racers[3];

    if (this.finished) {
      this.finishTimer += dt;
      if (this.finishTimer >= 1.1) {
        const placeText =
          this.playerRank === 1
            ? `¡1° LUGAR! Nivel ${this.level}`
            : this.playerRank === 2
            ? `¡2° LUGAR! Nivel ${this.level}`
            : `¡META! Nivel ${this.level}`;
        return {
          gameId: 'race',
          gameTitle: `Pista de Carreras (Nivel ${this.level})`,
          characterId: this.playerId,
          level: this.level,
          maxLevel: 3,
          headline: this.playerRank === 1 ? '¡CAMPEÓN DE LA PISTA!' : '¡LO LOGRASTE!',
          statLabel: placeText,
          medalTitle: 'MEDALLA DE VELOCIDAD',
          medalColor: 'gold',
        };
      }
      return null;
    }

    // Player controls
    const accelPressed =
      isRectJustPressed(input, this.accelBtn) ||
      input.keysJustPressed.has('ArrowRight') ||
      input.keysJustPressed.has('KeyD');
    const jumpPressed =
      isRectJustPressed(input, this.jumpBtn) ||
      input.keysJustPressed.has('Space') ||
      input.keysJustPressed.has('ArrowUp') ||
      input.keysJustPressed.has('KeyW');

    if (accelPressed) {
      player.speed = Math.min(430, player.speed + 72);
      this.boostFlash = 1;
      sound.playBoost();
      for (let i = 0; i < 6; i++) {
        this.sparks.push({
          x: 240 - Math.random() * 30,
          y: LANE_Y[3] - 25 - Math.random() * 40 + player.yOffset,
          vx: -140 - Math.random() * 120,
          vy: (Math.random() - 0.5) * 80,
          life: 0.45,
          color: i % 2 === 0 ? '#FACC15' : '#FB923C',
        });
      }
    }

    if (jumpPressed && player.yOffset >= -2) {
      player.vy = -760;
      sound.playJump();
    }

    // Player physics (gentle minimum speed so young kids never stall)
    const minSpeed = 165;
    if (player.speed > minSpeed) {
      player.speed = Math.max(minSpeed, player.speed - 95 * dt);
    }
    if (player.stumbleTimer > 0) {
      player.stumbleTimer = Math.max(0, player.stumbleTimer - dt);
    }

    player.dist += player.speed * dt;
    player.vy += 1850 * dt;
    player.yOffset += player.vy * dt;
    if (player.yOffset > 0) {
      player.yOffset = 0;
      player.vy = 0;
    }

    // Obstacle collisions on player lane
    for (const obs of this.obstacles) {
      if (obs.hit) continue;
      if (Math.abs(obs.dist - player.dist) < 42 && player.yOffset > -42) {
        obs.hit = true;
        player.speed = 145;
        player.stumbleTimer = 0.55;
        if (obs.kind === 'puddle') {
          sound.playSplash();
        } else {
          sound.playBonk();
        }
        for (let i = 0; i < 10; i++) {
          this.sparks.push({
            x: 270,
            y: LANE_Y[3] - 18,
            vx: (Math.random() - 0.5) * 220,
            vy: -120 - Math.random() * 140,
            life: 0.5,
            color: obs.kind === 'puddle' ? '#38BDF8' : '#F97316',
          });
        }
      }
    }

    // CPU racers with kid-friendly pacing (fun, close race, very winnable!)
    for (const r of this.racers) {
      if (r.isPlayer) continue;
      const wave = Math.sin(this.time * 1.8 + r.cpuPhase) * 28;
      // Gentle rubber banding so CPUs stay visible & exciting
      const gap = player.dist - r.dist;
      const assist = Math.max(-35, Math.min(35, gap * 0.08));
      r.speed = Math.max(150, Math.min(280, r.cpuBaseSpeed + wave + assist));
      r.dist += r.speed * dt;
    }

    // Update sparks
    for (const s of this.sparks) {
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.life -= dt;
    }
    this.sparks = this.sparks.filter((s) => s.life > 0);

    // Check finish
    if (player.dist >= this.finishDist) {
      this.finished = true;
      this.finishTimer = 0;
      this.playerRank =
        1 + this.racers.filter((r) => !r.isPlayer && r.dist > player.dist).length;
      sound.playFlagPlant();
    }

    return null;
  }

  public render(ctx: CanvasRenderingContext2D): void {
    const player = this.racers[3];
    const camX = player.dist - 270;

    // Sky
    ctx.fillStyle = '#38BDF8';
    ctx.fillRect(0, 0, GAME_WIDTH, 320);

    drawSun(ctx, 1180, 86, this.time, 40);
    drawCloud(ctx, ((220 - camX * 0.12) % 1500 + 1500) % 1500 - 120, 92, 0.85);
    drawCloud(ctx, ((780 - camX * 0.12) % 1500 + 1500) % 1500 - 120, 74, 0.95);
    drawCloud(ctx, ((1240 - camX * 0.12) % 1500 + 1500) % 1500 - 120, 108, 0.75);

    // Schoolyard background wall & grass
    ctx.fillStyle = '#4ADE80';
    ctx.fillRect(0, 260, GAME_WIDTH, 110);

    // Cheerful school fence posts scrolling
    ctx.fillStyle = '#FEF3C7';
    ctx.fillRect(0, 278, GAME_WIDTH, 14);
    const fenceOffset = -(camX * 0.65) % 90;
    for (let x = fenceOffset - 90; x < GAME_WIDTH + 90; x += 90) {
      ctx.fillStyle = '#F59E0B';
      fillRoundRect(ctx, x, 264, 14, 72, 5);
      ctx.fill();
    }

    // Track lanes (4-lane terracotta/red athletics track)
    ctx.fillStyle = '#F97316';
    ctx.fillRect(0, 352, GAME_WIDTH, 258);

    // Lane stripes
    ctx.fillStyle = 'rgba(255, 255, 255, 0.78)';
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(0, 352 + i * 64, GAME_WIDTH, 5);
    }
    ctx.fillRect(0, 608, GAME_WIDTH, 8);

    // Lower grass area for buttons
    ctx.fillStyle = '#22C55E';
    ctx.fillRect(0, 616, GAME_WIDTH, GAME_HEIGHT - 616);

    // Distance markers every 800 px
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    for (let d = 800; d < this.finishDist; d += 800) {
      const sx = d - camX;
      if (sx > -40 && sx < GAME_WIDTH + 40) {
        ctx.fillRect(sx, 352, 8, 258);
      }
    }

    // Checkered finish line!
    const finishX = this.finishDist - camX;
    if (finishX > -120 && finishX < GAME_WIDTH + 160) {
      const sq = 22;
      for (let row = 0; row < 12; row++) {
        for (let col = 0; col < 2; col++) {
          ctx.fillStyle = (row + col) % 2 === 0 ? '#FFFFFF' : '#0F172A';
          ctx.fillRect(finishX + col * sq, 352 + row * sq, sq, sq);
        }
      }
      // Finish banner arch
      ctx.fillStyle = '#EF4444';
      fillRoundRect(ctx, finishX - 24, 232, 92, 42, 12);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '900 22px "Fredoka", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('META', finishX + 22, 253);
    }

    // Draw obstacles on player's lane
    for (const obs of this.obstacles) {
      const sx = obs.dist - camX;
      if (sx < -80 || sx > GAME_WIDTH + 80) continue;
      if (obs.kind === 'cone') {
        drawCone(ctx, sx, LANE_Y[3], 1.0);
      } else {
        drawPuddle(ctx, sx, LANE_Y[3], 1.05);
      }
    }

    // Draw all 4 racers back-to-front
    for (const r of this.racers) {
      const sx = r.dist - camX;
      const sy = LANE_Y[r.lane] + r.yOffset;
      const anim = this.finished
        ? 'celebrate'
        : r.yOffset < -5
        ? 'jump'
        : 'run';
      drawCharacter(ctx, {
        id: r.id,
        x: sx,
        y: sy,
        scale: r.isPlayer ? 1.15 : 0.94 + r.lane * 0.05,
        anim,
        time: this.time * (r.speed / 210),
        stumble: r.stumbleTimer > 0 ? r.stumbleTimer / 0.55 : 0,
      });

      // Player indicator arrow
      if (r.isPlayer && !this.finished) {
        const bob = Math.sin(this.time * 7) * 5;
        ctx.fillStyle = '#FACC15';
        ctx.strokeStyle = '#92400E';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(sx, sy - 142 + bob);
        ctx.lineTo(sx - 14, sy - 162 + bob);
        ctx.lineTo(sx + 14, sy - 162 + bob);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }

    // Sparks
    for (const s of this.sparks) {
      ctx.fillStyle = s.color;
      ctx.globalAlpha = Math.max(0, s.life * 2);
      ctx.beginPath();
      ctx.arc(s.x, s.y, 7, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Top Progress Bar
    this.drawProgressBar(ctx);

    // Giant Touch Controls
    drawTactileButton(ctx, {
      rect: this.jumpBtn,
      label: '▲ ¡SALTAR!',
      sublabel: 'Esquiva conos y charcos',
      bg: '#2563EB',
      border: '#1E3A8A',
      fontSize: 36,
      pressed: false,
      radius: 28,
    });

    drawTactileButton(ctx, {
      rect: this.accelBtn,
      label: '⚡ ¡ACELERAR!',
      sublabel: '¡Toca muchas veces!',
      bg: this.boostFlash > 0.2 ? '#F59E0B' : '#EF4444',
      border: '#991B1B',
      fontSize: 36,
      pressed: this.boostFlash > 0.3,
      radius: 28,
    });
  }

  private drawProgressBar(ctx: CanvasRenderingContext2D): void {
    const bx = 260;
    const by = 28;
    const bw = 820;
    const bh = 46;

    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.strokeStyle = '#1E3A8A';
    ctx.lineWidth = 4;
    fillRoundRect(ctx, bx, by, bw, bh, 23);
    ctx.fill();
    ctx.stroke();

    // Track line
    ctx.fillStyle = '#CBD5E1';
    fillRoundRect(ctx, bx + 26, by + 18, bw - 72, 10, 5);
    ctx.fill();

    // Finish star
    drawStar(ctx, bx + bw - 26, by + 23, 14, this.time * 2);

    // Racer dots
    for (const r of this.racers) {
      const pct = Math.min(1, r.dist / this.finishDist);
      const px = bx + 26 + pct * (bw - 72);
      ctx.fillStyle = r.isPlayer ? '#EF4444' : '#64748B';
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(px, by + 23, r.isPlayer ? 13 : 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }
}
