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
  gapY: number; // center Y of wide safe gap
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
  private py = 360;
  private vy = 0;
  private bumpTimer = 0;
  private pipes: PipePair[] = [];
  private sparks: FeatherSpark[] = [];

  private targetPipes: number;
  private passedCount = 0;
  private stars = 0;
  private finished = false;
  private finishTimer = 0;
  private flapHeld = false;

  private flapBtn: Rect = {
    x: GAME_WIDTH - 340,
    y: 636,
    w: 300,
    h: 128,
  };

  constructor(private playerId: CharacterId, private level = 1) {
    this.targetPipes = 6 + (level - 1) * 3; // 6, 9, 12 pipes

    // Wide, kid-friendly pipe gaps
    const gapH = level === 1 ? 265 : level === 2 ? 245 : 230;
    const spacing = 460;
    for (let i = 0; i < this.targetPipes; i++) {
      const gapY = 250 + ((i * 97 + 40) % 210);
      this.pipes.push({
        x: 780 + i * spacing,
        gapY,
        gapH,
        passed: false,
        starCollected: false,
      });
    }
  }

  public update(dt: number, input: InputSnapshot): VictoryData | null {
    this.time += dt;
    this.bumpTimer = Math.max(0, this.bumpTimer - dt);

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

    this.flapHeld = isRectHeld(input, this.flapBtn);
    const tappedSky = input.pointers.some((p) => p.justPressed && p.y > 95);
    const flapPressed =
      isRectJustPressed(input, this.flapBtn) ||
      tappedSky ||
      input.keysJustPressed.has('Space') ||
      input.keysJustPressed.has('ArrowUp');

    if (flapPressed) {
      this.vy = -370;
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

    // Gentle kid-friendly gravity (floats smoothly!)
    this.vy += 840 * dt;
    this.vy = Math.max(-420, Math.min(360, this.vy));
    this.py += this.vy * dt;

    // Soft ceiling & bouncy meadow floor (never dies!)
    if (this.py < 115) {
      this.py = 115;
      this.vy = 60;
    }
    if (this.py > 610) {
      this.py = 610;
      this.vy = -290; // gentle auto-bounce up off grass!
      sound.playTap();
    }

    // Move pipes
    const speed = 195 + (this.level - 1) * 22;
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

      // Gentle bounce if grazing top/bottom pipe (never Game Over!)
      if (this.bumpTimer <= 0 && Math.abs(pipe.x - PLAYER_X) < 52) {
        const topEdge = pipe.gapY - pipe.gapH / 2;
        const botEdge = pipe.gapY + pipe.gapH / 2;
        if (this.py - 68 < topEdge) {
          this.py = topEdge + 72;
          this.vy = 140;
          this.bumpTimer = 0.45;
          sound.playBonk();
        } else if (this.py > botEdge) {
          this.py = botEdge - 4;
          this.vy = -240;
          this.bumpTimer = 0.45;
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
      drawCloud(ctx, ((260 - this.time * 24) % 1500 + 1500) % 1500 - 120, 110, 0.9);
      drawCloud(ctx, ((920 - this.time * 24) % 1500 + 1500) % 1500 - 120, 82, 0.85);
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

    // Bouncy meadow floor
    ctx.fillStyle = '#4ADE80';
    ctx.fillRect(0, 622, GAME_WIDTH, GAME_HEIGHT - 622);
    ctx.fillStyle = '#16A34A';
    ctx.fillRect(0, 622, GAME_WIDTH, 12);

    // Cute rainbow balloon / wings behind player!
    const wingFlap = Math.sin(this.time * 16) * 14;
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
      stumble: this.bumpTimer > 0 ? this.bumpTimer / 0.45 : 0,
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
