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
  drawSoccerBall,
  drawStar,
  drawSun,
  fillRoundRect,
} from '../art/props';
import { drawTactileButton, isRectHeld, isRectJustPressed } from '../ui/buttons';
import { sound } from '../audio/sound';

const MAX_SOCCER_LEVEL = 10;
const GOAL_LEFT = 320;
const GOAL_RIGHT = GAME_WIDTH - 320;
const GOAL_TOP = 158;
const GOAL_BOTTOM = 408;

interface GoalSpark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
}

export class SoccerGame implements MiniGame {
  private time = 0;
  private goals = 0;
  private goalsToWin: number;
  private shotsLeft: number;
  private streak = 0;

  private keeperId: CharacterId;
  private keeperX = GAME_WIDTH / 2;
  private keeperDir = 1;
  private keeperDiveOffset = 0;

  // Moving defender barrier (from Level 3+)
  private hasBarrier: boolean;
  private barrierX = GAME_WIDTH / 2;
  private barrierDir = -1;
  private barrierWidth: number;

  // Golden Bonus Ring inside goal corner (worth +2 goals!)
  private bonusX = GOAL_LEFT + 115;
  private bonusY = GOAL_TOP + 76;
  private bonusActive = false;

  // Aiming reticle
  private aimX = GAME_WIDTH / 2;
  private aimY = 270;
  private aimDir = 1;

  // Ball state
  private ballX = GAME_WIDTH / 2;
  private ballY = 635;
  private ballScale = 1;
  private ballRot = 0;
  private kicking = false;
  private targetX = GAME_WIDTH / 2;
  private targetY = 270;
  private kickProgress = 0;

  private bannerText = '';
  private bannerSub = '';
  private bannerTimer = 0;
  private sparks: GoalSpark[] = [];
  private finished = false;
  private failed = false;
  private finishTimer = 0;
  private kickHeld = false;
  private retryHeld = false;

  private kickBtn: Rect = {
    x: GAME_WIDTH - 340,
    y: 636,
    w: 300,
    h: 126,
  };
  private retryBtn: Rect = {
    x: GAME_WIDTH / 2 - 220,
    y: 454,
    w: 440,
    h: 92,
  };

  constructor(private playerId: CharacterId, private level = 1) {
    // Progressive goals needed & shot budget across 10 levels
    this.goalsToWin = Math.min(8, 3 + Math.ceil(level / 2)); // 4..8 goals
    this.shotsLeft = this.goalsToWin + Math.max(3, 7 - Math.floor(level / 2));

    this.hasBarrier = level >= 3;
    this.barrierWidth = level >= 7 ? 150 : 96;

    const others = CHARACTERS.filter((c) => c.id !== playerId);
    this.keeperId = others[(level - 1) % others.length]?.id ?? 'dino';
    this.placeBonusRing();
  }

  private placeBonusRing(): void {
    this.bonusActive = this.level >= 2;
    const onLeft = Math.random() < 0.5;
    this.bonusX = onLeft ? GOAL_LEFT + 95 : GOAL_RIGHT - 95;
    this.bonusY = GOAL_TOP + 68 + Math.random() * 64;
  }

  private resetLevel(): void {
    this.goals = 0;
    this.streak = 0;
    this.shotsLeft = this.goalsToWin + Math.max(3, 7 - Math.floor(this.level / 2));
    this.failed = false;
    this.kicking = false;
    this.ballX = GAME_WIDTH / 2;
    this.ballY = 635;
    this.ballScale = 1;
    this.bannerTimer = 0;
    this.placeBonusRing();
  }

  public update(dt: number, input: InputSnapshot): VictoryData | null {
    this.time += dt;
    this.bannerTimer = Math.max(0, this.bannerTimer - dt);
    this.keeperDiveOffset *= Math.max(0, 1 - dt * 6);

    // Update sparks
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
          gameId: 'soccer',
          gameTitle: `¡Fútbol! (Nivel ${this.level} de ${MAX_SOCCER_LEVEL})`,
          characterId: this.playerId,
          level: this.level,
          maxLevel: MAX_SOCCER_LEVEL,
          headline:
            this.level === MAX_SOCCER_LEVEL
              ? '¡CAMPEÓN MUNDIAL!'
              : '¡SÚPER GOLEADOR!',
          statLabel: `⚽ ¡Nivel ${this.level} superado (${this.goals} goles)!`,
          medalTitle:
            this.level === MAX_SOCCER_LEVEL
              ? 'COPA MUNDIAL DE ORO'
              : 'MEDALLA DE FÚTBOL',
          medalColor: this.level >= 7 ? 'rainbow' : 'gold',
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
        this.resetLevel();
      }
      return null;
    }

    // Keeper gets progressively faster & smarter from Level 1 to Level 10!
    const keeperSpeed = 280 + (this.level - 1) * 42;
    this.keeperX += this.keeperDir * keeperSpeed * dt;
    if (this.keeperX > GOAL_RIGHT - 82) {
      this.keeperX = GOAL_RIGHT - 82;
      this.keeperDir = -1;
    } else if (this.keeperX < GOAL_LEFT + 82) {
      this.keeperX = GOAL_LEFT + 82;
      this.keeperDir = 1;
    }

    // Moving defender barrier (Level 3+)
    if (this.hasBarrier) {
      const barrierSpeed = 110 + (this.level - 3) * 28;
      this.barrierX += this.barrierDir * barrierSpeed * dt;
      if (this.barrierX > GOAL_RIGHT - 120) {
        this.barrierX = GOAL_RIGHT - 120;
        this.barrierDir = -1;
      } else if (this.barrierX < GOAL_LEFT + 120) {
        this.barrierX = GOAL_LEFT + 120;
        this.barrierDir = 1;
      }
    }

    // Aiming reticle sweeps faster on higher levels
    if (!this.kicking) {
      const aimSpeed = 330 + (this.level - 1) * 36;
      this.aimX += this.aimDir * aimSpeed * dt;
      if (this.aimX > GOAL_RIGHT - 62) {
        this.aimX = GOAL_RIGHT - 62;
        this.aimDir = -1;
      } else if (this.aimX < GOAL_LEFT + 62) {
        this.aimX = GOAL_LEFT + 62;
        this.aimDir = 1;
      }
      this.aimY = 266 + Math.sin(this.time * (2.4 + this.level * 0.2)) * 52;
    }

    // Controls
    this.kickHeld = isRectHeld(input, this.kickBtn);
    const kickBtnPressed =
      isRectJustPressed(input, this.kickBtn) ||
      input.keysJustPressed.has('Space') ||
      input.keysJustPressed.has('ArrowUp');

    const tapGoal = input.pointers.find(
      (p) => p.justPressed && p.y > 110 && p.y < 610
    );

    if (!this.kicking && (tapGoal || kickBtnPressed)) {
      this.kicking = true;
      this.kickProgress = 0;
      this.shotsLeft = Math.max(0, this.shotsLeft - 1);
      if (tapGoal) {
        this.targetX = Math.max(
          GOAL_LEFT + 48,
          Math.min(GOAL_RIGHT - 48, tapGoal.x)
        );
        this.targetY = Math.max(
          GOAL_TOP + 46,
          Math.min(GOAL_BOTTOM - 34, tapGoal.y)
        );
        this.aimX = this.targetX;
        this.aimY = this.targetY;
      } else {
        this.targetX = this.aimX;
        this.targetY = this.aimY;
      }
      sound.playJump();
    }

    if (this.kicking) {
      this.kickProgress += dt * 2.25;
      const t = Math.min(1, this.kickProgress);
      const startX = GAME_WIDTH / 2;
      const startY = 635;
      const arc = Math.sin(t * Math.PI) * 90;
      this.ballX = startX + (this.targetX - startX) * t;
      this.ballY = startY + (this.targetY - startY) * t - arc;
      this.ballScale = 1 - t * 0.34;
      this.ballRot += dt * 15;

      // Keeper dives slightly toward the ball on Level 5+!
      if (this.level >= 5 && t > 0.35 && t < 0.95) {
        const dirToBall = Math.sign(this.targetX - this.keeperX);
        this.keeperX += dirToBall * (45 + this.level * 8) * dt;
        this.keeperDiveOffset = dirToBall * 16;
      }

      if (t >= 1) {
        const hitBarrier =
          this.hasBarrier &&
          this.targetY > 275 &&
          Math.abs(this.targetX - this.barrierX) < this.barrierWidth * 0.48;
        const saveReach = 66 + Math.min(26, this.level * 2.5);
        const saved = Math.abs(this.targetX - this.keeperX) < saveReach;

        if (hitBarrier) {
          this.streak = 0;
          this.bannerText = '¡PEGÓ EN LA BARRERA!';
          this.bannerSub = '¡Apunta arriba o a los lados!';
          this.bannerTimer = 1.0;
          sound.playBonk();
        } else if (saved) {
          this.streak = 0;
          this.bannerText = '¡ATAJÓ EL PORTERO!';
          this.bannerSub = '¡Intenta en otra esquina!';
          this.bannerTimer = 1.0;
          sound.playBonk();
        } else {
          // GOAL! Check if it hit the Golden Bonus Ring (+2 goals!)
          const hitBonus =
            this.bonusActive &&
            Math.hypot(this.targetX - this.bonusX, this.targetY - this.bonusY) < 58;
          const added = hitBonus ? 2 : 1;
          this.goals = Math.min(this.goalsToWin, this.goals + added);
          this.streak++;

          this.bannerText = hitBonus ? '¡GOLAZO DORADO ×2!' : '¡GOOOOOL!';
          this.bannerSub =
            this.streak >= 2 ? `🔥 ¡RACHA DE ${this.streak}!` : '';
          this.bannerTimer = 1.1;
          sound.playBonus();
          this.spawnGoalSparks(this.targetX, this.targetY, hitBonus);
          this.placeBonusRing();

          if (this.goals >= this.goalsToWin) {
            this.finished = true;
            this.finishTimer = 0;
            sound.playFlagPlant();
          }
        }

        // Reset ball
        this.kicking = false;
        this.ballX = GAME_WIDTH / 2;
        this.ballY = 635;
        this.ballScale = 1;

        // Check out of balls (only fail if not already won)
        if (!this.finished && this.shotsLeft <= 0) {
          this.failed = true;
          sound.playBonk();
        }
      }
    }

    return null;
  }

  private spawnGoalSparks(x: number, y: number, golden = false): void {
    const colors = golden
      ? ['#FACC15', '#FEF08A', '#F97316', '#FFFFFF']
      : ['#FACC15', '#EF4444', '#22C55E', '#38BDF8', '#FFFFFF'];
    for (let i = 0; i < (golden ? 34 : 24); i++) {
      const a = (Math.PI * 2 * i) / (golden ? 34 : 24);
      const spd = 120 + Math.random() * 220;
      this.sparks.push({
        x,
        y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd - 90,
        color: colors[i % colors.length],
        life: 0.8,
      });
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    // Stadium sky changes as you climb the 10-level tournament!
    const isNight = this.level >= 7;
    const isSunset = this.level >= 4 && this.level <= 6;

    ctx.fillStyle = isNight ? '#0F172A' : isSunset ? '#FB923C' : '#38BDF8';
    ctx.fillRect(0, 0, GAME_WIDTH, 320);

    if (isNight) {
      // Twinkling stadium stars + bright stadium floodlights!
      ctx.fillStyle = '#FEF08A';
      for (let i = 0; i < 24; i++) {
        ctx.beginPath();
        ctx.arc((i * 157 + 50) % GAME_WIDTH, 30 + ((i * 53) % 160), 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
      // Left & right stadium spotlight beams
      ctx.fillStyle = 'rgba(254, 249, 195, 0.14)';
      ctx.beginPath();
      ctx.moveTo(110, 40);
      ctx.lineTo(540, 390);
      ctx.lineTo(240, 390);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(GAME_WIDTH - 110, 40);
      ctx.lineTo(GAME_WIDTH - 240, 390);
      ctx.lineTo(GAME_WIDTH - 540, 390);
      ctx.closePath();
      ctx.fill();
    } else {
      drawSun(ctx, 1170, isSunset ? 150 : 86, this.time, 42);
      drawCloud(ctx, 210 + Math.sin(this.time * 0.4) * 14, 82, 0.85);
      drawCloud(ctx, 880 + Math.cos(this.time * 0.35) * 16, 76, 0.9);
    }

    // Stadium stands
    ctx.fillStyle = isNight ? '#1E293B' : '#1E3A8A';
    ctx.fillRect(0, 260, GAME_WIDTH, 110);
    const crowdColors = ['#EF4444', '#FACC15', '#22C55E', '#F97316', '#FFFFFF'];
    for (let cx = 24; cx < GAME_WIDTH; cx += 42) {
      const bounce =
        Math.sin(this.time * 6 + cx) * (this.bannerTimer > 0 ? 7 : 2);
      ctx.fillStyle = crowdColors[(cx / 42) % crowdColors.length | 0];
      ctx.beginPath();
      ctx.arc(cx, 305 + bounce, 14, 0, Math.PI * 2);
      ctx.fill();
    }

    // Green soccer pitch
    ctx.fillStyle = isNight ? '#15803D' : '#22C55E';
    ctx.fillRect(0, 360, GAME_WIDTH, GAME_HEIGHT - 360);
    ctx.fillStyle = isNight ? '#166534' : '#16A34A';
    for (let y = 390; y < GAME_HEIGHT; y += 84) {
      ctx.fillRect(0, y, GAME_WIDTH, 42);
    }

    // Penalty box lines
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 6;
    ctx.strokeRect(230, 410, GAME_WIDTH - 460, 240);

    // Goal net
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.fillRect(
      GOAL_LEFT,
      GOAL_TOP,
      GOAL_RIGHT - GOAL_LEFT,
      GOAL_BOTTOM - GOAL_TOP
    );
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 3;
    for (let gx = GOAL_LEFT; gx <= GOAL_RIGHT; gx += 34) {
      ctx.beginPath();
      ctx.moveTo(gx, GOAL_TOP);
      ctx.lineTo(gx, GOAL_BOTTOM);
      ctx.stroke();
    }
    for (let gy = GOAL_TOP; gy <= GOAL_BOTTOM; gy += 32) {
      ctx.beginPath();
      ctx.moveTo(GOAL_LEFT, gy);
      ctx.lineTo(GOAL_RIGHT, gy);
      ctx.stroke();
    }

    // Golden Bonus ×2 Ring inside the goal!
    if (this.bonusActive && !this.finished && !this.failed) {
      const ringPulse = 1 + Math.sin(this.time * 6) * 0.08;
      ctx.save();
      ctx.translate(this.bonusX, this.bonusY);
      ctx.scale(ringPulse, ringPulse);
      ctx.fillStyle = 'rgba(250, 204, 21, 0.25)';
      ctx.beginPath();
      ctx.arc(0, 0, 40, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#FACC15';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(0, 0, 38, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#FEF08A';
      ctx.font = '900 26px "Fredoka", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('★ ×2', 0, 2);
      ctx.restore();
    }

    // Goal posts
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 14;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(GOAL_LEFT, GOAL_BOTTOM);
    ctx.lineTo(GOAL_LEFT, GOAL_TOP);
    ctx.lineTo(GOAL_RIGHT, GOAL_TOP);
    ctx.lineTo(GOAL_RIGHT, GOAL_BOTTOM);
    ctx.stroke();

    // Goalkeeper
    drawCharacter(ctx, {
      id: this.keeperId,
      x: this.keeperX + this.keeperDiveOffset,
      y: GOAL_BOTTOM + 6,
      scale: 1.06,
      facing: this.keeperDir === 1 ? 1 : -1,
      anim: Math.abs(this.keeperDiveOffset) > 4 ? 'jump' : 'run',
      time: this.time * 1.4,
    });

    // Moving defender barrier (cones / training wall in front of goal from Level 3+)
    if (this.hasBarrier) {
      const count = this.level >= 7 ? 3 : 2;
      const step = this.barrierWidth / count;
      for (let i = 0; i < count; i++) {
        const bx = this.barrierX - this.barrierWidth / 2 + step * (i + 0.5);
        drawCone(ctx, bx, 468, 1.12);
      }
    }

    // Aiming trajectory & target reticle
    if (!this.finished && !this.failed) {
      this.drawAimGuide(ctx);
    }

    // Player ready beside the ball
    drawCharacter(ctx, {
      id: this.playerId,
      x: GAME_WIDTH / 2 - 125,
      y: 705,
      scale: 1.45,
      facing: 1,
      anim: this.finished ? 'celebrate' : this.kicking ? 'jump' : 'idle',
      time: this.time,
    });

    // Classic Black & White Soccer Ball
    drawSoccerBall(
      ctx,
      this.ballX,
      this.ballY,
      34 * this.ballScale,
      this.ballRot
    );

    // Sparks
    for (const s of this.sparks) {
      ctx.fillStyle = s.color;
      ctx.globalAlpha = Math.max(0, s.life * 1.4);
      ctx.beginPath();
      ctx.arc(s.x, s.y, 9, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Big GOAL / SAVED banner
    if (this.bannerTimer > 0 && !this.failed) {
      ctx.save();
      ctx.fillStyle = '#FACC15';
      ctx.strokeStyle = '#B45309';
      ctx.lineWidth = 6;
      fillRoundRect(ctx, GAME_WIDTH / 2 - 280, 206, 560, 110, 30);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#991B1B';
      ctx.font = '900 44px "Fredoka", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        this.bannerText,
        GAME_WIDTH / 2,
        this.bannerSub ? 246 : 262
      );

      if (this.bannerSub) {
        ctx.fillStyle = '#78350F';
        ctx.font = '800 24px "Fredoka", sans-serif';
        ctx.fillText(this.bannerSub, GAME_WIDTH / 2, 288);
      }
      ctx.restore();
    }

    // Top HUD: Level pill + Goals progress + Remaining balls
    this.drawHud(ctx);

    if (this.failed) {
      // Friendly out-of-balls retry modal
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
      ctx.font = '900 48px "Fredoka", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('¡CASI LO LOGRAS!', GAME_WIDTH / 2, 286);

      ctx.fillStyle = '#334155';
      ctx.font = '800 28px "Fredoka", sans-serif';
      ctx.fillText(
        `Anotaste ${this.goals} de ${this.goalsToWin} goles en Nivel ${this.level}`,
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
    } else {
      // Giant Kick button
      drawTactileButton(ctx, {
        rect: this.kickBtn,
        label: '⚽ ¡PATEAR!',
        sublabel: 'O toca la portería',
        bg: '#EF4444',
        border: '#991B1B',
        fontSize: 36,
        pressed: this.kickHeld,
        radius: 28,
      });
    }
  }

  private drawHud(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    // Level badge on left
    ctx.fillStyle = '#FACC15';
    ctx.strokeStyle = '#B45309';
    ctx.lineWidth = 4;
    fillRoundRect(ctx, 114, 22, 218, 56, 24);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#78350F';
    ctx.font = '900 26px "Fredoka", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`NIVEL ${this.level} / ${MAX_SOCCER_LEVEL}`, 223, 51);

    // Center Goals progress
    const hudW = 460;
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.strokeStyle = '#15803D';
    fillRoundRect(ctx, GAME_WIDTH / 2 - hudW / 2, 22, hudW, 56, 26);
    ctx.fill();
    ctx.stroke();

    const spacing = (hudW - 86) / Math.max(1, this.goalsToWin - 1);
    const startX = GAME_WIDTH / 2 - (hudW - 86) / 2;
    for (let i = 0; i < this.goalsToWin; i++) {
      const sx = startX + i * spacing;
      if (i < this.goals) {
        drawStar(ctx, sx, 50, 18, 0);
      } else {
        ctx.fillStyle = '#CBD5E1';
        ctx.beginPath();
        ctx.arc(sx, 50, 13, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Remaining balls badge on right
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.strokeStyle = '#1E3A8A';
    fillRoundRect(ctx, 940, 22, 264, 56, 24);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = this.shotsLeft <= 2 ? '#DC2626' : '#1E3A8A';
    ctx.font = '900 25px "Fredoka", sans-serif';
    ctx.fillText(`⚽ BALONES: ${this.shotsLeft}`, 1072, 51);
    ctx.restore();
  }

  private drawAimGuide(ctx: CanvasRenderingContext2D): void {
    const tx = this.kicking ? this.targetX : this.aimX;
    const ty = this.kicking ? this.targetY : this.aimY;
    const pulse = 1 + Math.sin(this.time * 8) * 0.1;

    ctx.save();
    if (!this.kicking) {
      ctx.strokeStyle = '#FEF08A';
      ctx.lineWidth = 7;
      ctx.setLineDash([16, 14]);
      ctx.lineDashOffset = -this.time * 60;
      ctx.beginPath();
      ctx.moveTo(GAME_WIDTH / 2, 600);
      ctx.lineTo(tx, ty);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.translate(tx, ty);
    ctx.scale(pulse, pulse);

    ctx.fillStyle = 'rgba(250, 204, 21, 0.25)';
    ctx.beginPath();
    ctx.arc(0, 0, 34, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#EF4444';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(0, 0, 30, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, 17, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#EF4444';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-40, 0);
    ctx.lineTo(-22, 0);
    ctx.moveTo(22, 0);
    ctx.lineTo(40, 0);
    ctx.moveTo(0, -40);
    ctx.lineTo(0, -22);
    ctx.moveTo(0, 22);
    ctx.lineTo(0, 40);
    ctx.stroke();

    ctx.fillStyle = '#FACC15';
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
