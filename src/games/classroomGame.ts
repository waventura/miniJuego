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
  drawApple,
  drawBook,
  drawDiploma,
  drawPencil,
  fillRoundRect,
} from '../art/props';
import { drawTactileButton, isRectHeld } from '../ui/buttons';
import { sound } from '../audio/sound';

type ItemKind = 'pencil' | 'book' | 'apple' | 'diploma';

interface FallingItem {
  x: number;
  y: number;
  vy: number;
  rot: number;
  vrot: number;
  kind: ItemKind;
}

interface CatchPop {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
}

const ROUND_SECONDS = 32;
const FLOOR_Y = 630;

export class ClassroomGame implements MiniGame {
  private time = 0;
  private remaining = ROUND_SECONDS;
  private playerX = GAME_WIDTH / 2;
  private facing: 1 | -1 = 1;
  private moving = false;
  private score = 0;
  private diplomas = 0;
  private spawnTimer = 0.4;
  private items: FallingItem[] = [];
  private pops: CatchPop[] = [];
  private finished = false;
  private finishTimer = 0;

  private roundSeconds: number;

  private leftBtn: Rect = { x: 34, y: 650, w: 230, h: 118 };
  private rightBtn: Rect = { x: GAME_WIDTH - 264, y: 650, w: 230, h: 118 };

  constructor(private playerId: CharacterId, private level = 1) {
    this.roundSeconds = ROUND_SECONDS + (level - 1) * 4;
    this.remaining = this.roundSeconds;
  }

  public update(dt: number, input: InputSnapshot): VictoryData | null {
    this.time += dt;

    if (this.finished) {
      this.finishTimer += dt;
      if (this.finishTimer >= 1.0) {
        return {
          gameId: 'classroom',
          gameTitle: `Salón de Clases (Nivel ${this.level})`,
          characterId: this.playerId,
          level: this.level,
          maxLevel: 3,
          headline: '¡SÚPER ESTUDIANTE!',
          statLabel: `¡Atrapaste ${this.score} puntos y ${this.diplomas} diplomas!`,
          medalTitle: 'MEDALLA DE HONOR',
          medalColor: 'rainbow',
        };
      }
      return null;
    }

    this.remaining = Math.max(0, this.remaining - dt);

    // Controls: drag finger anywhere in play area OR hold left/right buttons OR keyboard
    const leftHeld =
      isRectHeld(input, this.leftBtn) ||
      input.keysDown.has('ArrowLeft') ||
      input.keysDown.has('KeyA');
    const rightHeld =
      isRectHeld(input, this.rightBtn) ||
      input.keysDown.has('ArrowRight') ||
      input.keysDown.has('KeyD');

    const dragPointer = input.pointers.find(
      (p) => p.y > 100 && p.y < 645
    );

    const prevX = this.playerX;
    const speed = 560;

    if (dragPointer) {
      const targetX = Math.max(120, Math.min(GAME_WIDTH - 120, dragPointer.x));
      const diff = targetX - this.playerX;
      this.playerX += Math.sign(diff) * Math.min(Math.abs(diff), 780 * dt);
    } else {
      if (leftHeld) this.playerX -= speed * dt;
      if (rightHeld) this.playerX += speed * dt;
    }

    this.playerX = Math.max(120, Math.min(GAME_WIDTH - 120, this.playerX));
    const dx = this.playerX - prevX;
    this.moving = Math.abs(dx) > 0.8;
    if (dx > 0.8) this.facing = 1;
    if (dx < -0.8) this.facing = -1;

    // Spawn falling school items
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = 0.72 + Math.random() * 0.35;
      const roll = Math.random();
      const kind: ItemKind =
        roll < 0.2
          ? 'diploma'
          : roll < 0.48
          ? 'apple'
          : roll < 0.74
          ? 'book'
          : 'pencil';
      this.items.push({
        x: 150 + Math.random() * (GAME_WIDTH - 300),
        y: -30,
        vy: kind === 'diploma' ? 190 : 165 + Math.random() * 65,
        rot: (Math.random() - 0.5) * 0.5,
        vrot: (Math.random() - 0.5) * 1.4,
        kind,
      });
    }

    // Update falling items & generous catch box
    const remainingItems: FallingItem[] = [];
    for (const item of this.items) {
      item.y += item.vy * dt;
      item.rot += item.vrot * dt;

      const caught =
        Math.abs(item.x - this.playerX) < 78 &&
        item.y > FLOOR_Y - 140 &&
        item.y < FLOOR_Y + 10;

      if (caught) {
        if (item.kind === 'diploma') {
          this.score += 3;
          this.diplomas++;
          sound.playBonus();
          this.pops.push({
            x: item.x,
            y: item.y - 20,
            text: '+3 ¡DIPLOMA!',
            color: '#EA580C',
            life: 0.9,
          });
        } else {
          this.score += 1;
          sound.playCollect();
          this.pops.push({
            x: item.x,
            y: item.y - 20,
            text: '+1',
            color: '#16A34A',
            life: 0.7,
          });
        }
        continue;
      }

      if (item.y < FLOOR_Y + 28) {
        remainingItems.push(item);
      }
    }
    this.items = remainingItems;

    for (const p of this.pops) {
      p.y -= 60 * dt;
      p.life -= dt;
    }
    this.pops = this.pops.filter((p) => p.life > 0);

    if (this.remaining <= 0) {
      this.finished = true;
      this.finishTimer = 0;
      sound.playFlagPlant();
    }

    return null;
  }

  public render(ctx: CanvasRenderingContext2D): void {
    // Classroom warm wall
    ctx.fillStyle = '#FEF3C7';
    ctx.fillRect(0, 0, GAME_WIDTH, FLOOR_Y);

    // Big green chalkboard
    ctx.fillStyle = '#92400E';
    fillRoundRect(ctx, 190, 108, GAME_WIDTH - 380, 340, 22);
    ctx.fill();
    ctx.fillStyle = '#14532D';
    fillRoundRect(ctx, 212, 128, GAME_WIDTH - 424, 300, 14);
    ctx.fill();

    // Cute chalk doodles on board
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.font = '900 54px "Fredoka", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('A   B   C', 410, 230);
    ctx.fillText('1 + 1 = 2', 930, 230);
    ctx.font = '700 32px "Fredoka", sans-serif';
    ctx.fillText('¡Desliza tu dedo para atrapar!', GAME_WIDTH / 2, 345);
    ctx.restore();

    // Colorful ceiling bunting flags
    const flagColors = ['#EF4444', '#FACC15', '#3B82F6', '#22C55E', '#EC4899'];
    for (let i = 0; i < 16; i++) {
      const fx = i * 88;
      ctx.fillStyle = flagColors[i % flagColors.length];
      ctx.beginPath();
      ctx.moveTo(fx, 0);
      ctx.lineTo(fx + 88, 0);
      ctx.lineTo(fx + 44, 46);
      ctx.closePath();
      ctx.fill();
    }

    // Wooden floor
    ctx.fillStyle = '#D97706';
    ctx.fillRect(0, FLOOR_Y, GAME_WIDTH, GAME_HEIGHT - FLOOR_Y);
    ctx.fillStyle = '#B45309';
    ctx.fillRect(0, FLOOR_Y, GAME_WIDTH, 10);

    // Falling items
    for (const item of this.items) {
      if (item.kind === 'pencil') drawPencil(ctx, item.x, item.y, item.rot);
      else if (item.kind === 'book') drawBook(ctx, item.x, item.y, item.rot);
      else if (item.kind === 'apple') drawApple(ctx, item.x, item.y, item.rot);
      else drawDiploma(ctx, item.x, item.y, item.rot);
    }

    // Player character
    drawCharacter(ctx, {
      id: this.playerId,
      x: this.playerX,
      y: FLOOR_Y + 6,
      scale: 1.32,
      facing: this.facing,
      anim: this.finished ? 'celebrate' : this.moving ? 'run' : 'idle',
      time: this.time,
    });

    // Catch pops
    for (const p of this.pops) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, p.life * 2);
      ctx.fillStyle = p.color;
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 5;
      ctx.font = '900 32px "Fredoka", sans-serif';
      ctx.textAlign = 'center';
      ctx.strokeText(p.text, p.x, p.y);
      ctx.fillText(p.text, p.x, p.y);
      ctx.restore();
    }

    // Top HUD
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.strokeStyle = '#B45309';
    ctx.lineWidth = 4;
    fillRoundRect(ctx, 240, 22, 340, 56, 24);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#1E293B';
    ctx.font = '900 30px "Fredoka", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`PUNTOS: ${this.score}`, 410, 51);

    // Timer pill
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.strokeStyle = '#1E3A8A';
    fillRoundRect(ctx, 620, 22, 460, 56, 24);
    ctx.fill();
    ctx.stroke();

    const pct = this.remaining / this.roundSeconds;
    ctx.fillStyle = pct > 0.25 ? '#22C55E' : '#EF4444';
    fillRoundRect(ctx, 634, 34, Math.max(24, 340 * pct), 32, 16);
    ctx.fill();

    ctx.fillStyle = '#1E3A8A';
    ctx.font = '900 28px "Fredoka", sans-serif';
    ctx.fillText(`${Math.ceil(this.remaining)}s`, 1030, 51);
    ctx.restore();

    // Left / Right big buttons (in addition to finger drag!)
    drawTactileButton(ctx, {
      rect: this.leftBtn,
      label: '◀ IZQ',
      bg: '#2563EB',
      border: '#1E3A8A',
      fontSize: 36,
      pressed: false,
      radius: 26,
    });

    drawTactileButton(ctx, {
      rect: this.rightBtn,
      label: 'DER ▶',
      bg: '#2563EB',
      border: '#1E3A8A',
      fontSize: 36,
      pressed: false,
      radius: 26,
    });
  }
}
