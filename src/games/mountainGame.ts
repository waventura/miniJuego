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
import {
  drawCloud,
  drawFlag,
  drawStar,
  drawSun,
  fillRoundRect,
} from '../art/props';
import { drawTactileButton, isRectHeld, isRectJustPressed } from '../ui/buttons';
import { sound } from '../audio/sound';

interface Platform {
  x: number;
  y: number;
  w: number;
  isSummit?: boolean;
}

interface ClimbStar {
  x: number;
  y: number;
  collected: boolean;
}

export class MountainGame implements MiniGame {
  private time = 0;
  private px = GAME_WIDTH / 2;
  private py = 600;
  private vx = 0;
  private vy = 0;
  private facing: 1 | -1 = 1;
  private onGround = true;
  private coyoteTimer = 0;
  private camY = 0;

  private platforms: Platform[] = [];
  private stars: ClimbStar[] = [];
  private starsCollected = 0;
  private summitY = 0;
  private flagPlanted = false;
  private finishTimer = 0;

  private leftBtn: Rect = { x: 38, y: 636, w: 190, h: 128 };
  private rightBtn: Rect = { x: 252, y: 636, w: 190, h: 128 };
  private jumpBtn: Rect = { x: GAME_WIDTH - 338, y: 636, w: 296, h: 128 };

  constructor(private playerId: CharacterId, private level = 1) {
    // Base meadow floor
    this.platforms.push({ x: 80, y: 600, w: GAME_WIDTH - 160 });

    // Build easy-to-reach zigzag platforms climbing upward (9, 12, or 15 levels)
    const levels = 9 + (level - 1) * 3;
    let y = 475;
    for (let i = 0; i < levels; i++) {
      const w = 320;
      const positions = [210, 510, 810];
      const slot = i % 3 === 0 ? 1 : i % 3 === 1 ? 0 : 2;
      const x = positions[slot];
      this.platforms.push({ x, y, w });

      // Star above every platform
      this.stars.push({
        x: x + w / 2,
        y: y - 54,
        collected: false,
      });

      y -= 128;
    }

    // Wide sunny summit platform!
    this.summitY = y - 10;
    this.platforms.push({
      x: GAME_WIDTH / 2 - 260,
      y: this.summitY,
      w: 520,
      isSummit: true,
    });
  }

  public update(dt: number, input: InputSnapshot): VictoryData | null {
    this.time += dt;

    if (this.flagPlanted) {
      this.finishTimer += dt;
      if (this.finishTimer >= 1.45) {
        return {
          gameId: 'mountain',
          gameTitle: `Escalada a la Montaña (Nivel ${this.level})`,
          characterId: this.playerId,
          level: this.level,
          maxLevel: 3,
          headline: '¡LLEGASTE A LA CIMA!',
          statLabel: `¡Bandera plantada y ${this.starsCollected} ★!`,
          medalTitle: 'MEDALLA DE GRADUADO',
          medalColor: 'gold',
        };
      }
      return null;
    }

    const leftHeld =
      isRectHeld(input, this.leftBtn) ||
      input.keysDown.has('ArrowLeft') ||
      input.keysDown.has('KeyA');
    const rightHeld =
      isRectHeld(input, this.rightBtn) ||
      input.keysDown.has('ArrowRight') ||
      input.keysDown.has('KeyD');
    const jumpPressed =
      isRectJustPressed(input, this.jumpBtn) ||
      input.keysJustPressed.has('Space') ||
      input.keysJustPressed.has('ArrowUp') ||
      input.keysJustPressed.has('KeyW');

    const moveSpeed = 380;
    if (leftHeld && !rightHeld) {
      this.vx = -moveSpeed;
      this.facing = -1;
    } else if (rightHeld && !leftHeld) {
      this.vx = moveSpeed;
      this.facing = 1;
    } else {
      this.vx *= Math.max(0, 1 - dt * 12);
    }

    if (this.onGround) {
      this.coyoteTimer = 0.16;
    } else {
      this.coyoteTimer = Math.max(0, this.coyoteTimer - dt);
    }

    if (jumpPressed && this.coyoteTimer > 0) {
      this.vy = -790;
      this.onGround = false;
      this.coyoteTimer = 0;
      sound.playJump();
    }

    const prevY = this.py;
    this.px += this.vx * dt;
    this.px = Math.max(90, Math.min(GAME_WIDTH - 90, this.px));

    this.vy += 1550 * dt;
    this.py += this.vy * dt;

    // One-way platform landing
    this.onGround = false;
    if (this.vy >= 0) {
      for (const plat of this.platforms) {
        const withinX = this.px >= plat.x - 22 && this.px <= plat.x + plat.w + 22;
        if (withinX && prevY <= plat.y + 10 && this.py >= plat.y) {
          this.py = plat.y;
          this.vy = 0;
          this.onGround = true;
          if (plat.isSummit && !this.flagPlanted) {
            this.flagPlanted = true;
            this.finishTimer = 0;
            sound.playFlagPlant();
          }
          break;
        }
      }
    }

    // Safety floor so kids never fall out of world
    if (this.py > 600) {
      this.py = 600;
      this.vy = 0;
      this.onGround = true;
    }

    // Collect stars
    for (const s of this.stars) {
      if (s.collected) continue;
      const dx = s.x - this.px;
      const dy = s.y - (this.py - 56);
      if (dx * dx + dy * dy < 66 * 66) {
        s.collected = true;
        this.starsCollected++;
        sound.playCollect();
      }
    }

    // Smooth camera following player upward
    const targetCamY = Math.min(0, this.py - 460);
    this.camY += (targetCamY - this.camY) * Math.min(1, dt * 6);

    return null;
  }

  public render(ctx: CanvasRenderingContext2D): void {
    // Sky transitions gently brighter/bluer as we climb!
    const heightPct = Math.max(
      0,
      Math.min(1, (600 - this.py) / (600 - this.summitY))
    );
    ctx.fillStyle = heightPct > 0.7 ? '#0EA5E9' : '#38BDF8';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    drawSun(ctx, 1180, 105, this.time, 46);

    // Parallax clouds
    for (let i = 0; i < 6; i++) {
      const cy = 500 - i * 320 - this.camY * 0.45;
      const cx = (i % 2 === 0 ? 180 : 980) + Math.sin(this.time * 0.4 + i) * 24;
      if (cy > -120 && cy < GAME_HEIGHT + 120) {
        drawCloud(ctx, cx, cy, 0.95);
      }
    }

    // World space rendering
    ctx.save();
    ctx.translate(0, -this.camY);

    // Big decorative flat mountain silhouette in background
    ctx.fillStyle = '#94A3B8';
    ctx.beginPath();
    ctx.moveTo(40, 720);
    ctx.lineTo(GAME_WIDTH / 2, this.summitY - 40);
    ctx.lineTo(GAME_WIDTH - 40, 720);
    ctx.closePath();
    ctx.fill();

    // Snow cap on mountain peak
    ctx.fillStyle = '#F8FAFC';
    ctx.beginPath();
    ctx.moveTo(GAME_WIDTH / 2 - 190, this.summitY + 190);
    ctx.lineTo(GAME_WIDTH / 2, this.summitY - 40);
    ctx.lineTo(GAME_WIDTH / 2 + 190, this.summitY + 190);
    ctx.closePath();
    ctx.fill();

    // Platforms
    for (const plat of this.platforms) {
      // Rock body
      ctx.fillStyle = plat.isSummit ? '#F59E0B' : '#78350F';
      fillRoundRect(ctx, plat.x, plat.y + 8, plat.w, 28, 12);
      ctx.fill();

      // Grass / snow top
      ctx.fillStyle = plat.isSummit ? '#FACC15' : '#22C55E';
      ctx.strokeStyle = plat.isSummit ? '#B45309' : '#15803D';
      ctx.lineWidth = 4;
      fillRoundRect(ctx, plat.x, plat.y, plat.w, 22, 11);
      ctx.fill();
      ctx.stroke();

      if (plat.isSummit) {
        // Flagpole & waving ¡Graduado! flag
        drawFlag(
          ctx,
          plat.x + plat.w / 2 + 95,
          plat.y + 2,
          '¡Graduado!',
          this.time
        );
      }
    }

    // Collectible stars
    for (const s of this.stars) {
      if (s.collected) continue;
      const bob = Math.sin(this.time * 4 + s.x) * 6;
      drawStar(ctx, s.x, s.y + bob, 22, Math.sin(this.time * 2) * 0.25);
    }

    // Player character
    const anim = this.flagPlanted
      ? 'celebrate'
      : !this.onGround
      ? 'jump'
      : Math.abs(this.vx) > 20
      ? 'run'
      : 'idle';

    drawCharacter(ctx, {
      id: this.playerId,
      x: this.px,
      y: this.py,
      scale: 1.18,
      facing: this.facing,
      anim,
      time: this.time,
    });

    ctx.restore();

    // Vertical climb progress meter on left side
    this.drawAltitudeMeter(ctx, heightPct);

    // Big Touch Controls
    drawTactileButton(ctx, {
      rect: this.leftBtn,
      label: '◀',
      bg: '#2563EB',
      border: '#1E3A8A',
      fontSize: 48,
      pressed: false,
      radius: 28,
    });

    drawTactileButton(ctx, {
      rect: this.rightBtn,
      label: '▶',
      bg: '#2563EB',
      border: '#1E3A8A',
      fontSize: 48,
      pressed: false,
      radius: 28,
    });

    drawTactileButton(ctx, {
      rect: this.jumpBtn,
      label: '▲ ¡SALTAR!',
      bg: '#22C55E',
      border: '#15803D',
      fontSize: 38,
      pressed: false,
      radius: 28,
    });
  }

  private drawAltitudeMeter(
    ctx: CanvasRenderingContext2D,
    pct: number
  ): void {
    const mx = 44;
    const my = 150;
    const mh = 420;

    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.strokeStyle = '#1E3A8A';
    ctx.lineWidth = 4;
    fillRoundRect(ctx, mx, my, 36, mh, 18);
    ctx.fill();
    ctx.stroke();

    const fillH = Math.max(24, (mh - 16) * pct);
    ctx.fillStyle = '#8B5CF6';
    fillRoundRect(ctx, mx + 7, my + mh - 8 - fillH, 22, fillH, 11);
    ctx.fill();

    drawStar(ctx, mx + 18, my + 16, 15, this.time * 2);
    ctx.restore();
  }
}
