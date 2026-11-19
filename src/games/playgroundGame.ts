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
  drawBackpack,
  drawBall,
  drawCloud,
  drawGradCapItem,
  drawSlide,
  drawStar,
  drawSun,
  fillRoundRect,
} from '../art/props';
import { drawTactileButton, isRectHeld, isRectJustPressed } from '../ui/buttons';
import { sound } from '../audio/sound';

interface PGObstacle {
  x: number;
  kind: 'slide' | 'ball' | 'backpack';
  hit: boolean;
}

interface PGCollectible {
  x: number;
  y: number;
  kind: 'star' | 'cap';
  collected: boolean;
}

interface PopText {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
}

const GROUND_Y = 585;
const TOTAL_DIST = 6800;

export class PlaygroundGame implements MiniGame {
  private time = 0;
  private dist = 0;
  private speed = 260;
  private yOffset = 0;
  private vy = 0;
  private jumpsUsed = 0;
  private stumbleTimer = 0;

  private stars = 0;
  private caps = 0;
  private obstacles: PGObstacle[] = [];
  private collectibles: PGCollectible[] = [];
  private pops: PopText[] = [];
  private finished = false;
  private finishTimer = 0;
  private jumpHeld = false;

  private totalDist: number;

  private jumpBtn: Rect = {
    x: GAME_WIDTH - 360,
    y: 626,
    w: 316,
    h: 138,
  };

  constructor(private playerId: CharacterId, private level = 1) {
    this.totalDist = TOTAL_DIST + (level - 1) * 1400;
    // Generate kid-friendly course of obstacles + jump-arc collectibles
    const kinds: Array<'slide' | 'ball' | 'backpack'> = [
      'ball',
      'backpack',
      'slide',
    ];
    let x = 760;
    let idx = 0;
    while (x < this.totalDist - 500) {
      const kind = kinds[idx % kinds.length];
      this.obstacles.push({ x, kind, hit: false });

      // Arc of collectibles right over the obstacle to teach jumping!
      this.collectibles.push({
        x: x - 65,
        y: GROUND_Y - 120,
        kind: 'star',
        collected: false,
      });
      this.collectibles.push({
        x: x,
        y: GROUND_Y - 165,
        kind: idx % 2 === 0 ? 'cap' : 'star',
        collected: false,
      });
      this.collectibles.push({
        x: x + 65,
        y: GROUND_Y - 120,
        kind: 'star',
        collected: false,
      });

      // Bonus low collectibles between obstacles
      this.collectibles.push({
        x: x + 260,
        y: GROUND_Y - 58,
        kind: idx % 3 === 0 ? 'cap' : 'star',
        collected: false,
      });

      x += 540 + (idx % 3) * 55;
      idx++;
    }
  }

  public update(dt: number, input: InputSnapshot): VictoryData | null {
    this.time += dt;

    if (this.finished) {
      this.finishTimer += dt;
      if (this.finishTimer >= 1.1) {
        return {
          gameId: 'playground',
          gameTitle: `Patio de Recreo (Nivel ${this.level})`,
          characterId: this.playerId,
          level: this.level,
          maxLevel: 3,
          headline: '¡SÚPER SALTARÍN!',
          statLabel: `★ ${this.stars} estrellas y ${this.caps} birretes`,
          medalTitle: 'MEDALLA DEL RECREO',
          medalColor: 'star',
        };
      }
      return null;
    }

    // Jump on giant button OR tap anywhere on playfield (excluding top HUD)
    this.jumpHeld = isRectHeld(input, this.jumpBtn);
    const tappedPlayfield = input.pointers.some(
      (p) => p.justPressed && p.y > 105
    );
    const jumpPressed =
      isRectJustPressed(input, this.jumpBtn) ||
      tappedPlayfield ||
      input.keysJustPressed.has('Space') ||
      input.keysJustPressed.has('ArrowUp');

    if (jumpPressed && this.jumpsUsed < 2) {
      this.vy = this.jumpsUsed === 0 ? -790 : -680;
      this.jumpsUsed++;
      sound.playJump();
    }

    // Advance runner
    const targetSpeed = this.stumbleTimer > 0 ? 175 : 275;
    this.speed += (targetSpeed - this.speed) * Math.min(1, dt * 6);
    this.dist += this.speed * dt;

    if (this.stumbleTimer > 0) {
      this.stumbleTimer = Math.max(0, this.stumbleTimer - dt);
    }

    // Vertical physics
    this.vy += 1850 * dt;
    this.yOffset += this.vy * dt;
    if (this.yOffset >= 0) {
      this.yOffset = 0;
      this.vy = 0;
      this.jumpsUsed = 0;
    }

    const playerWorldX = this.dist + 260;
    const playerY = GROUND_Y + this.yOffset;

    // Collect stars & graduation caps
    for (const item of this.collectibles) {
      if (item.collected) continue;
      const dx = item.x - playerWorldX;
      const dy = item.y - (playerY - 56);
      if (dx * dx + dy * dy < 68 * 68) {
        item.collected = true;
        if (item.kind === 'cap') {
          this.caps++;
          sound.playBonus();
          this.pops.push({
            x: item.x - this.dist,
            y: item.y,
            text: '+2 ¡BIRRETE!',
            color: '#1E3A8A',
            life: 0.8,
          });
        } else {
          this.stars++;
          sound.playCollect();
          this.pops.push({
            x: item.x - this.dist,
            y: item.y,
            text: '★ +1',
            color: '#F59E0B',
            life: 0.7,
          });
        }
      }
    }

    // Gentle obstacle bumps (never kills!)
    for (const obs of this.obstacles) {
      if (obs.hit) continue;
      const hitHeight = obs.kind === 'slide' ? 54 : 44;
      if (Math.abs(obs.x - playerWorldX) < 38 && this.yOffset > -hitHeight) {
        obs.hit = true;
        this.stumbleTimer = 0.5;
        this.vy = -340; // cute bounce!
        sound.playBonk();
      }
    }

    // Update popups
    for (const p of this.pops) {
      p.y -= 55 * dt;
      p.life -= dt;
    }
    this.pops = this.pops.filter((p) => p.life > 0);

    if (this.dist >= this.totalDist - 260) {
      this.finished = true;
      this.finishTimer = 0;
      sound.playFlagPlant();
    }

    return null;
  }

  public render(ctx: CanvasRenderingContext2D): void {
    // Sunny sky
    ctx.fillStyle = '#38BDF8';
    ctx.fillRect(0, 0, GAME_WIDTH, 420);

    drawSun(ctx, 1170, 92, this.time, 42);
    drawCloud(ctx, ((200 - this.dist * 0.1) % 1500 + 1500) % 1500 - 120, 95, 0.9);
    drawCloud(ctx, ((850 - this.dist * 0.1) % 1500 + 1500) % 1500 - 120, 74, 0.85);

    // Distant playful hills
    ctx.fillStyle = '#86EFAC';
    ctx.beginPath();
    ctx.ellipse(340, 440, 460, 140, 0, 0, Math.PI * 2);
    ctx.ellipse(1040, 450, 520, 150, 0, 0, Math.PI * 2);
    ctx.fill();

    // Background trees scrolling
    const treeOffset = -(this.dist * 0.35) % 280;
    for (let tx = treeOffset - 140; tx < GAME_WIDTH + 180; tx += 280) {
      ctx.fillStyle = '#92400E';
      ctx.fillRect(tx - 10, 360, 20, 90);
      ctx.fillStyle = '#16A34A';
      ctx.beginPath();
      ctx.arc(tx, 344, 46, 0, Math.PI * 2);
      ctx.arc(tx - 26, 362, 32, 0, Math.PI * 2);
      ctx.arc(tx + 26, 362, 32, 0, Math.PI * 2);
      ctx.fill();
    }

    // Playground path
    ctx.fillStyle = '#FDE68A';
    ctx.fillRect(0, 450, GAME_WIDTH, 150);
    ctx.fillStyle = '#F59E0B';
    ctx.fillRect(0, 450, GAME_WIDTH, 10);

    // Lower grass bar
    ctx.fillStyle = '#22C55E';
    ctx.fillRect(0, 600, GAME_WIDTH, GAME_HEIGHT - 600);

    // Finish line arch
    const finishX = this.totalDist - this.dist;
    if (finishX > -80 && finishX < GAME_WIDTH + 120) {
      ctx.fillStyle = '#EF4444';
      ctx.fillRect(finishX - 10, 340, 20, 250);
      ctx.fillStyle = '#FACC15';
      fillRoundRect(ctx, finishX - 75, 300, 150, 52, 16);
      ctx.fill();
      ctx.fillStyle = '#92400E';
      ctx.font = '900 28px "Fredoka", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('¡META!', finishX, 326);
    }

    // Obstacles
    for (const obs of this.obstacles) {
      const sx = obs.x - this.dist;
      if (sx < -90 || sx > GAME_WIDTH + 90) continue;
      if (obs.kind === 'slide') {
        drawSlide(ctx, sx, GROUND_Y, 1.05);
      } else if (obs.kind === 'ball') {
        drawBall(ctx, sx, GROUND_Y, 26, -this.time * 4);
      } else {
        drawBackpack(ctx, sx, GROUND_Y, 1.05);
      }
    }

    // Collectibles
    for (const item of this.collectibles) {
      if (item.collected) continue;
      const sx = item.x - this.dist;
      if (sx < -60 || sx > GAME_WIDTH + 60) continue;
      const bob = Math.sin(this.time * 5 + item.x * 0.02) * 7;
      if (item.kind === 'star') {
        drawStar(ctx, sx, item.y + bob, 24, Math.sin(this.time * 3) * 0.25);
      } else {
        drawGradCapItem(
          ctx,
          sx,
          item.y + bob,
          1.05,
          Math.sin(this.time * 4) * 0.15
        );
      }
    }

    // Player
    const anim = this.finished
      ? 'celebrate'
      : this.yOffset < -4
      ? 'jump'
      : 'run';
    drawCharacter(ctx, {
      id: this.playerId,
      x: 260,
      y: GROUND_Y + this.yOffset,
      scale: 1.25,
      anim,
      time: this.time * 1.1,
      stumble: this.stumbleTimer > 0 ? this.stumbleTimer / 0.5 : 0,
    });

    // Floating score pops
    for (const p of this.pops) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, p.life * 2);
      ctx.fillStyle = p.color;
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 5;
      ctx.font = '900 30px "Fredoka", sans-serif';
      ctx.textAlign = 'center';
      ctx.strokeText(p.text, p.x, p.y);
      ctx.fillText(p.text, p.x, p.y);
      ctx.restore();
    }

    // Top HUD: Score pill + Progress bar
    this.drawHud(ctx);

    // Giant Jump button
    drawTactileButton(ctx, {
      rect: this.jumpBtn,
      label: '▲ ¡SALTAR!',
      sublabel: 'Toca 2 veces para salto doble',
      bg: '#F59E0B',
      border: '#B45309',
      fontSize: 38,
      pressed: this.jumpHeld,
      radius: 28,
    });
  }

  private drawHud(ctx: CanvasRenderingContext2D): void {
    // Score pill
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.94)';
    ctx.strokeStyle = '#15803D';
    ctx.lineWidth = 4;
    fillRoundRect(ctx, 210, 24, 340, 56, 24);
    ctx.fill();
    ctx.stroke();

    drawStar(ctx, 250, 52, 16, 0);
    ctx.fillStyle = '#1E293B';
    ctx.font = '900 30px "Fredoka", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${this.stars}`, 276, 54);

    drawGradCapItem(ctx, 396, 54, 0.72, 0);
    ctx.fillText(`${this.caps}`, 430, 54);

    // Distance bar
    const bx = 580;
    const bw = 540;
    ctx.fillStyle = 'rgba(255,255,255,0.94)';
    ctx.strokeStyle = '#1E3A8A';
    fillRoundRect(ctx, bx, 30, bw, 44, 22);
    ctx.fill();
    ctx.stroke();

    const pct = Math.min(1, this.dist / (this.totalDist - 260));
    ctx.fillStyle = '#22C55E';
    fillRoundRect(ctx, bx + 8, 38, Math.max(28, (bw - 16) * pct), 28, 14);
    ctx.fill();

    ctx.restore();
  }
}
