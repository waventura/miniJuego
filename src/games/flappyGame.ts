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

interface PipePair {
  x: number;
  gapY: number; // center Y of safe gap
  gapH: number;
  passed: boolean;
  starCollected: boolean;
}

interface FeatherSpark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
}

const PLAYER_X = 320;

export class FlappyGame implements MiniGame {
  private time = 0;
  private py = 350;
  private vy = 0;
  private started = false;
  private crashed = false;
  private pipes: PipePair[] = [];
  private sparks: FeatherSpark[] = [];

  private targetPipes: number;
  private passedCount = 0;
  private stars = 0;
  private finished = false;
  private finishTimer = 0;
  private flapHeld = false;
  private retryHeld = false;

  private flapBtn: Rect = {
    x: GAME_WIDTH - 340,
    y: 636,
    w: 300,
    h: 128,
  };
  private retryBtn: Rect = {
    x: GAME_WIDTH / 2 - 220,
    y: 448,
    w: 440,
    h: 96,
  };

  constructor(private playerId: CharacterId, private level = 1) {
    this.targetPipes = 6 + (level - 1) * 3; // 6, 9, 12 pipes
    this.resetRound();
  }

  private resetRound(): void {
    this.py = 350;
    this.vy = 0;
    this.started = false;
    this.crashed = false;
    this.passedCount = 0;
    this.stars = 0;
    this.sparks = [];
    this.pipes = [];

    const gapH = this.level === 1 ? 255 : this.level === 2 ? 235 : 220;
    const spacing = 460;
    for (let i = 0; i < this.targetPipes; i++) {
      const gapY = 245 + ((i * 97 + 40) % 210);
      this.pipes.push({
        x: 780 + i * spacing,
        gapY,
        gapH,
        passed: false,
        starCollected: false,
      });
    }
  }

  private triggerCrash(): void {
    if (this.crashed) return;
    this.crashed = true;
    sound.playBonk();
    for (let i = 0; i < 16; i++) {
      const a = (Math.PI * 2 * i) / 16;
      const spd = 90 + Math.random() * 140;
      this.sparks.push({
        x: PLAYER_X,
        y: this.py - 32,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        color: i % 2 === 0 ? '#EF4444' : '#FACC15',
        life: 0.6,
      });
    }
  }

  public update(dt: number, input: InputSnapshot): VictoryData | null {
    this.time += dt;

    // Update sparks even when crashed
    for (const s of this.sparks) {
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.life -= dt;
    }
    this.sparks = this.sparks.filter((s) => s.life > 0);

    if (this.finished) {
      this.finishTimer += dt;
      if (this.finishTimer >= 1.15) {
        return {
          gameId: 'flappy',
          gameTitle: `¡Vuelo Feliz! (Nivel ${this.level})`,
          characterId: this.playerId,
          level: this.level,
          maxLevel: 3,
          headline: '¡SÚPER VOLADOR!',
          statLabel: `★ ${this.stars} estrellas y ${this.passedCount} arcos`,
          medalTitle: 'MEDALLA DE VUELO',
          medalColor: 'rainbow',
        };
      }
      return null;
    }

    if (this.crashed) {
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

    this.flapHeld = isRectHeld(input, this.flapBtn);
    const tappedSky = input.pointers.some((p) => p.justPressed && p.y > 95);
    const flapPressed =
      isRectJustPressed(input, this.flapBtn) ||
      tappedSky ||
      input.keysJustPressed.has('Space') ||
      input.keysJustPressed.has('ArrowUp');

    if (flapPressed) {
      this.started = true;
      this.vy = -375;
      sound.playJump();
      for (let i = 0; i < 5; i++) {
        this.sparks.push({
          x: PLAYER_X - 24,
          y: this.py + 10,
          vx: -90 - Math.random() * 80,
          vy: 40 + (Math.random() - 0.5) * 90,
          color: i % 2 === 0 ? '#FEF08A' : '#FFFFFF',
          life: 0.45,
        });
      }
    }

    // Float gently until first tap so kids are ready!
    if (!this.started) {
      this.py = 350 + Math.sin(this.time * 4) * 14;
      return null;
    }

    // Gravity
    this.vy += 860 * dt;
    this.vy = Math.max(-420, Math.min(420, this.vy));
    this.py += this.vy * dt;

    // Soft ceiling
    if (this.py < 105) {
      this.py = 105;
      this.vy = 40;
    }

    // Hitting the ground loses the round!
    if (this.py >= 622) {
      this.py = 622;
      this.triggerCrash();
      return null;
    }

    // Move pipes & check collisions
    const speed = 200 + (this.level - 1) * 22;
    for (const pipe of this.pipes) {
      pipe.x -= speed * dt;

      // Collect center star
      if (!pipe.starCollected) {
        const dx = pipe.x - PLAYER_X;
        const dy = pipe.gapY - (this.py - 32);
        if (dx * dx + dy * dy < 72 * 72) {
          pipe.starCollected = true;
          this.stars++;
          sound.playCollect();
        }
      }

      // Check pass
      if (!pipe.passed && pipe.x < PLAYER_X - 40) {
        pipe.passed = true;
        this.passedCount++;
        sound.playTap();
        if (this.passedCount >= this.targetPipes) {
          this.finished = true;
          this.finishTimer = 0;
          sound.playFlagPlant();
        }
      }

      // Pipe crash collision (forgiving hitbox, loses round on hit!)
      if (Math.abs(pipe.x - PLAYER_X) < 46) {
        const topEdge = pipe.gapY - pipe.gapH / 2;
        const botEdge = pipe.gapY + pipe.gapH / 2;
        if (this.py - 64 < topEdge || this.py - 6 > botEdge) {
          this.triggerCrash();
          return null;
        }
      }
    }

    return null;
  }

  public render(ctx: CanvasRenderingContext2D): void {
    // Sky theme per level (1=Day, 2=Sunset, 3=Starry Night)
    if (this.level === 1) ctx.fillStyle = '#38BDF8';
    else if (this.level === 2) ctx.fillStyle = '#FB923C';
    else ctx.fillStyle = '#1E1B4B';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    if (this.level === 3) {
      ctx.fillStyle = '#FEF08A';
      for (let i = 0; i < 28; i++) {
        const sx = (i * 157 + 40) % GAME_WIDTH;
        const sy = 34 + ((i * 89) % 440);
        ctx.beginPath();
        ctx.arc(sx, sy, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      drawSun(ctx, 1170, 96, this.time, 42);
      drawCloud(
        ctx,
        (((260 - this.time * 24) % 1500) + 1500) % 1500 - 120,
        110,
        0.9
      );
      drawCloud(
        ctx,
        (((920 - this.time * 24) % 1500) + 1500) % 1500 - 120,
        82,
        0.85
      );
    }

    // Pipes
    for (const pipe of this.pipes) {
      if (pipe.x < -100 || pipe.x > GAME_WIDTH + 100) continue;
      const topH = Math.max(0, pipe.gapY - pipe.gapH / 2);
      const botY = pipe.gapY + pipe.gapH / 2;
      const pipeColor = this.level === 3 ? '#8B5CF6' : '#22C55E';
      const borderColor = this.level === 3 ? '#4C1D95' : '#15803D';

      // Top pipe
      ctx.fillStyle = pipeColor;
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 4;
      ctx.fillRect(pipe.x - 40, 0, 80, topH);
      ctx.strokeRect(pipe.x - 40, -4, 80, topH + 4);
      fillRoundRect(ctx, pipe.x - 48, topH - 28, 96, 28, 8);
      ctx.fill();
      ctx.stroke();

      // Bottom pipe
      ctx.fillStyle = pipeColor;
      ctx.fillRect(pipe.x - 40, botY, 80, GAME_HEIGHT - botY);
      ctx.strokeRect(pipe.x - 40, botY, 80, GAME_HEIGHT - botY);
      fillRoundRect(ctx, pipe.x - 48, botY, 96, 28, 8);
      ctx.fill();
      ctx.stroke();

      // Guide star in center of gap
      if (!pipe.starCollected) {
        const bob = Math.sin(this.time * 5 + pipe.x * 0.02) * 6;
        drawStar(ctx, pipe.x, pipe.gapY + bob, 24, this.time * 2);
      }
    }

    // Meadow floor
    ctx.fillStyle = '#4ADE80';
    ctx.fillRect(0, 622, GAME_WIDTH, GAME_HEIGHT - 622);
    ctx.fillStyle = '#16A34A';
    ctx.fillRect(0, 622, GAME_WIDTH, 12);

    // Cute wing behind player
    const wingFlap = this.crashed ? 0 : Math.sin(this.time * 16) * 14;
    ctx.save();
    ctx.translate(PLAYER_X, this.py - 46);
    ctx.fillStyle = '#FEF08A';
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(-28, -4 + wingFlap * 0.4, 24, 13, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Player character flying!
    drawCharacter(ctx, {
      id: this.playerId,
      x: PLAYER_X,
      y: this.py,
      scale: 0.96,
      anim: this.finished ? 'celebrate' : 'jump',
      time: this.time,
      stumble: this.crashed ? 0.6 : 0,
    });

    // Sparks
    for (const s of this.sparks) {
      ctx.fillStyle = s.color;
      ctx.globalAlpha = Math.max(0, s.life * 2);
      ctx.beginPath();
      ctx.arc(s.x, s.y, 7, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Ready hint before first tap
    if (!this.started && !this.crashed) {
      ctx.save();
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#0369A1';
      ctx.lineWidth = 6;
      ctx.font = '900 40px "Fredoka", sans-serif';
      ctx.textAlign = 'center';
      ctx.strokeText('¡TOCA LA PANTALLA PARA VOLAR!', GAME_WIDTH / 2, 230);
      ctx.fillText('¡TOCA LA PANTALLA PARA VOLAR!', GAME_WIDTH / 2, 230);
      ctx.restore();
    }

    // Top HUD
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.strokeStyle = '#0369A1';
    ctx.lineWidth = 4;
    fillRoundRect(ctx, GAME_WIDTH / 2 - 270, 22, 540, 58, 26);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#0F172A';
    ctx.font = '900 28px "Fredoka", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      `NIVEL ${this.level}  •  ARCOS: ${this.passedCount} / ${this.targetPipes}  •  ★ ${this.stars}`,
      GAME_WIDTH / 2,
      52
    );
    ctx.restore();

    if (this.crashed) {
      // Friendly "Oops, you crashed!" retry modal
      ctx.save();
      ctx.fillStyle = 'rgba(15, 23, 42, 0.55)';
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

      ctx.fillStyle = '#991B1B';
      fillRoundRect(ctx, GAME_WIDTH / 2 - 310, 212, 620, 368, 36);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#EF4444';
      ctx.lineWidth = 8;
      fillRoundRect(ctx, GAME_WIDTH / 2 - 310, 200, 620, 368, 36);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#DC2626';
      ctx.font = '900 54px "Fredoka", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('¡UPS! ¡CHOCASTE!', GAME_WIDTH / 2, 286);

      ctx.fillStyle = '#334155';
      ctx.font = '800 30px "Fredoka", sans-serif';
      ctx.fillText(
        `Pasaste ${this.passedCount} arcos y ★ ${this.stars} estrellas`,
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
      // Giant Fly button
      drawTactileButton(ctx, {
        rect: this.flapBtn,
        label: '▲ ¡VOLAR!',
        sublabel: 'Toca para subir',
        bg: '#F59E0B',
        border: '#B45309',
        fontSize: 38,
        pressed: this.flapHeld,
        radius: 28,
      });
    }
  }
}
