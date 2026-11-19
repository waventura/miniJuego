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
import { drawBall, drawCloud, drawStar, drawSun, fillRoundRect } from '../art/props';
import { drawTactileButton, isRectHeld, isRectJustPressed } from '../ui/buttons';
import { sound } from '../audio/sound';

const GOALS_TO_WIN = 5;
const GOAL_LEFT = 330;
const GOAL_RIGHT = GAME_WIDTH - 330;
const GOAL_TOP = 160;
const GOAL_BOTTOM = 410;

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
  private keeperId: CharacterId;
  private keeperX = GAME_WIDTH / 2;
  private keeperDir = 1;

  // Ball state
  private ballX = GAME_WIDTH / 2;
  private ballY = 635;
  private ballScale = 1;
  private ballRot = 0;
  private kicking = false;
  private targetX = GAME_WIDTH / 2;
  private targetY = 290;
  private kickProgress = 0;

  private bannerText = '';
  private bannerTimer = 0;
  private sparks: GoalSpark[] = [];
  private finished = false;
  private finishTimer = 0;
  private kickHeld = false;

  private kickBtn: Rect = {
    x: GAME_WIDTH - 340,
    y: 636,
    w: 300,
    h: 126,
  };

  constructor(private playerId: CharacterId) {
    const others = CHARACTERS.filter((c) => c.id !== playerId);
    this.keeperId = others[0]?.id ?? 'dino';
  }

  public update(dt: number, input: InputSnapshot): VictoryData | null {
    this.time += dt;
    this.bannerTimer = Math.max(0, this.bannerTimer - dt);

    if (this.finished) {
      this.finishTimer += dt;
      if (this.finishTimer >= 1.2) {
        return {
          gameId: 'soccer',
          gameTitle: '¡Goles de Fútbol!',
          characterId: this.playerId,
          headline: '¡SÚPER GOLEADOR!',
          statLabel: `⚽ ¡Anotaste ${this.goals} GOLAZOS!`,
          medalTitle: 'MEDALLA DE FÚTBOL',
          medalColor: 'gold',
        };
      }
      return null;
    }

    // Friendly goalkeeper patrolling slowly back and forth
    const keeperSpeed = 180 + this.goals * 18;
    this.keeperX += this.keeperDir * keeperSpeed * dt;
    if (this.keeperX > GOAL_RIGHT - 90) {
      this.keeperX = GOAL_RIGHT - 90;
      this.keeperDir = -1;
    } else if (this.keeperX < GOAL_LEFT + 90) {
      this.keeperX = GOAL_LEFT + 90;
      this.keeperDir = 1;
    }

    // Input: tap anywhere in the goal area to aim & kick, OR press giant ¡PATEAR! button
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
      if (tapGoal) {
        this.targetX = Math.max(
          GOAL_LEFT + 48,
          Math.min(GOAL_RIGHT - 48, tapGoal.x)
        );
        this.targetY = Math.max(
          GOAL_TOP + 48,
          Math.min(GOAL_BOTTOM - 35, tapGoal.y)
        );
      } else {
        // Smart kid-friendly aim toward the open side of the goal!
        this.targetX =
          this.keeperX > GAME_WIDTH / 2 ? GOAL_LEFT + 135 : GOAL_RIGHT - 135;
        this.targetY = 285;
      }
      sound.playJump();
    }

    if (this.kicking) {
      this.kickProgress += dt * 2.2;
      const t = Math.min(1, this.kickProgress);
      const startX = GAME_WIDTH / 2;
      const startY = 635;
      const arc = Math.sin(t * Math.PI) * 90;
      this.ballX = startX + (this.targetX - startX) * t;
      this.ballY = startY + (this.targetY - startY) * t - arc;
      this.ballScale = 1 - t * 0.35;
      this.ballRot += dt * 14;

      if (t >= 1) {
        // Check if goalkeeper blocked it (small forgiving hitbox so scoring feels great!)
        const saved = Math.abs(this.targetX - this.keeperX) < 58;
        if (saved) {
          this.bannerText = '¡CASI! ¡INTENTA OTRA VEZ!';
          this.bannerTimer = 0.9;
          sound.playBonk();
        } else {
          this.goals++;
          this.bannerText = '¡GOOOOOL!';
          this.bannerTimer = 1.1;
          sound.playBonus();
          this.spawnGoalSparks(this.targetX, this.targetY);
          if (this.goals >= GOALS_TO_WIN) {
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
      }
    }

    // Update sparks
    for (const s of this.sparks) {
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vy += 320 * dt;
      s.life -= dt;
    }
    this.sparks = this.sparks.filter((s) => s.life > 0);

    return null;
  }

  private spawnGoalSparks(x: number, y: number): void {
    const colors = ['#FACC15', '#EF4444', '#22C55E', '#38BDF8', '#FFFFFF'];
    for (let i = 0; i < 24; i++) {
      const a = (Math.PI * 2 * i) / 24;
      const spd = 120 + Math.random() * 200;
      this.sparks.push({
        x,
        y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd - 90,
        color: colors[i % colors.length],
        life: 0.75,
      });
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    // Stadium sky
    ctx.fillStyle = '#38BDF8';
    ctx.fillRect(0, 0, GAME_WIDTH, 320);

    drawSun(ctx, 1170, 86, this.time, 40);
    drawCloud(ctx, 210 + Math.sin(this.time * 0.4) * 14, 82, 0.85);
    drawCloud(ctx, 880 + Math.cos(this.time * 0.35) * 16, 76, 0.9);

    // Cheerful stadium stands band
    ctx.fillStyle = '#1E3A8A';
    ctx.fillRect(0, 260, GAME_WIDTH, 110);
    const crowdColors = ['#EF4444', '#FACC15', '#22C55E', '#F97316', '#FFFFFF'];
    for (let cx = 24; cx < GAME_WIDTH; cx += 42) {
      const bounce = Math.sin(this.time * 6 + cx) * (this.bannerTimer > 0 ? 6 : 2);
      ctx.fillStyle = crowdColors[(cx / 42) % crowdColors.length | 0];
      ctx.beginPath();
      ctx.arc(cx, 305 + bounce, 14, 0, Math.PI * 2);
      ctx.fill();
    }

    // Green soccer pitch with striped grass
    ctx.fillStyle = '#22C55E';
    ctx.fillRect(0, 360, GAME_WIDTH, GAME_HEIGHT - 360);
    ctx.fillStyle = '#16A34A';
    for (let y = 390; y < GAME_HEIGHT; y += 84) {
      ctx.fillRect(0, y, GAME_WIDTH, 42);
    }

    // Penalty box lines
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 6;
    ctx.strokeRect(230, 410, GAME_WIDTH - 460, 240);

    // Goal net
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.fillRect(GOAL_LEFT, GOAL_TOP, GOAL_RIGHT - GOAL_LEFT, GOAL_BOTTOM - GOAL_TOP);
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
      x: this.keeperX,
      y: GOAL_BOTTOM + 6,
      scale: 1.05,
      facing: this.keeperDir === 1 ? 1 : -1,
      anim: 'run',
      time: this.time,
    });

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

    // Soccer ball
    drawBall(ctx, this.ballX, this.ballY, 34 * this.ballScale, this.ballRot);

    // Hint text
    if (!this.kicking && this.bannerTimer <= 0 && !this.finished) {
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#15803D';
      ctx.lineWidth = 5;
      ctx.font = '900 28px "Fredoka", sans-serif';
      ctx.textAlign = 'center';
      ctx.strokeText('¡Toca la portería para meter GOL!', GAME_WIDTH / 2, 130);
      ctx.fillText('¡Toca la portería para meter GOL!', GAME_WIDTH / 2, 130);
    }

    // Sparks
    for (const s of this.sparks) {
      ctx.fillStyle = s.color;
      ctx.globalAlpha = Math.max(0, s.life * 1.4);
      ctx.beginPath();
      ctx.arc(s.x, s.y, 9, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Big GOAL / ALMOST banner
    if (this.bannerTimer > 0) {
      ctx.save();
      ctx.fillStyle = '#FACC15';
      ctx.strokeStyle = '#B45309';
      ctx.lineWidth = 6;
      fillRoundRect(ctx, GAME_WIDTH / 2 - 260, 220, 520, 96, 30);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#991B1B';
      ctx.font = '900 50px "Fredoka", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.bannerText, GAME_WIDTH / 2, 268);
      ctx.restore();
    }

    // Top Score HUD (5 star/goal slots)
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.strokeStyle = '#15803D';
    ctx.lineWidth = 4;
    fillRoundRect(ctx, GAME_WIDTH / 2 - 210, 22, 420, 60, 28);
    ctx.fill();
    ctx.stroke();

    for (let i = 0; i < GOALS_TO_WIN; i++) {
      const sx = GAME_WIDTH / 2 - 140 + i * 70;
      if (i < this.goals) {
        drawStar(ctx, sx, 52, 22, 0);
      } else {
        ctx.fillStyle = '#CBD5E1';
        ctx.beginPath();
        ctx.arc(sx, 52, 16, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();

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
