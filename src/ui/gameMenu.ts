import {
  CHARACTERS,
  CharacterId,
  GAME_HEIGHT,
  GAME_WIDTH,
  GameId,
  InputSnapshot,
  Rect,
} from '../types';
import { drawCharacter } from '../art/characters';
import {
  drawApple,
  drawBall,
  drawBook,
  drawCloud,
  drawCone,
  drawDiploma,
  drawFlag,
  drawGradCapItem,
  drawSlide,
  drawStar,
  drawSun,
  fillRoundRect,
} from '../art/props';
import { drawTactileButton, isRectHeld, isRectJustPressed } from './buttons';
import { sound } from '../audio/sound';

interface GameCardInfo {
  id: GameId;
  title: string;
  subtitle: string;
  bg: string;
  border: string;
  rect: Rect;
}

export class GameMenuScreen {
  private time = 0;
  private cards: GameCardInfo[];
  private changeCharBtn: Rect = {
    x: 44,
    y: GAME_HEIGHT - 108,
    w: 350,
    h: 76,
  };

  constructor() {
    const cardW = 590;
    const cardH = 248;
    const gapX = 44;
    const gapY = 30;
    const startX = (GAME_WIDTH - (cardW * 2 + gapX)) / 2;
    const startY = 148;

    this.cards = [
      {
        id: 'race',
        title: '1. PISTA DE CARRERAS',
        subtitle: '¡Toca rápido para ganar!',
        bg: '#EF4444',
        border: '#B91C1C',
        rect: { x: startX, y: startY, w: cardW, h: cardH },
      },
      {
        id: 'playground',
        title: '2. PATIO DE RECREO',
        subtitle: '¡Salta y recoge estrellas!',
        bg: '#22C55E',
        border: '#15803D',
        rect: { x: startX + cardW + gapX, y: startY, w: cardW, h: cardH },
      },
      {
        id: 'classroom',
        title: '3. SALÓN DE CLASES',
        subtitle: '¡Atrapa libros y diplomas!',
        bg: '#F59E0B',
        border: '#B45309',
        rect: { x: startX, y: startY + cardH + gapY, w: cardW, h: cardH },
      },
      {
        id: 'mountain',
        title: '4. ESCALADA A LA MONTAÑA',
        subtitle: '¡Sube y planta la bandera!',
        bg: '#8B5CF6',
        border: '#5B21B6',
        rect: {
          x: startX + cardW + gapX,
          y: startY + cardH + gapY,
          w: cardW,
          h: cardH,
        },
      },
    ];
  }

  public update(
    dt: number,
    input: InputSnapshot
  ): { launchGame: GameId | null; backToSelect: boolean } {
    this.time += dt;

    if (isRectJustPressed(input, this.changeCharBtn)) {
      sound.playTap();
      return { launchGame: null, backToSelect: true };
    }

    for (const card of this.cards) {
      if (isRectJustPressed(input, card.rect)) {
        sound.playBonus();
        return { launchGame: card.id, backToSelect: false };
      }
    }

    return { launchGame: null, backToSelect: false };
  }

  public render(
    ctx: CanvasRenderingContext2D,
    characterId: CharacterId,
    input: InputSnapshot
  ): void {
    // Background
    ctx.fillStyle = '#38BDF8';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    ctx.fillStyle = '#4ADE80';
    ctx.fillRect(0, GAME_HEIGHT - 120, GAME_WIDTH, 120);

    drawSun(ctx, 110, 84, this.time, 40);
    drawCloud(ctx, 290 + Math.sin(this.time * 0.4) * 14, 70, 0.8);
    drawCloud(ctx, 1000 + Math.cos(this.time * 0.3) * 14, 82, 0.85);

    const charMeta =
      CHARACTERS.find((c) => c.id === characterId) ?? CHARACTERS[0];

    // Header
    ctx.save();
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#1E3A8A';
    ctx.lineWidth = 6;
    fillRoundRect(ctx, GAME_WIDTH / 2 - 430, 24, 860, 88, 28);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#1E3A8A';
    ctx.font = '900 40px "Fredoka", "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      `¡HOLA ${charMeta.name.toUpperCase()}! ELIGE UN JUEGO`,
      GAME_WIDTH / 2,
      68
    );
    ctx.restore();

    // 4 Game Cards
    for (const card of this.cards) {
      const pressed = isRectHeld(input, card.rect);
      const offset = pressed ? 6 : 0;
      const r = card.rect;

      ctx.save();
      ctx.fillStyle = card.border;
      fillRoundRect(ctx, r.x, r.y + 10, r.w, r.h, 30);
      ctx.fill();

      ctx.fillStyle = card.bg;
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 6;
      fillRoundRect(ctx, r.x, r.y + offset, r.w, r.h, 30);
      ctx.fill();
      ctx.stroke();

      // White icon showcase circle on left
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      fillRoundRect(ctx, r.x + 22, r.y + offset + 24, 178, r.h - 48, 24);
      ctx.fill();

      this.drawMiniIcon(ctx, card.id, r.x + 111, r.y + offset + r.h / 2);

      // Text on right
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.font = '900 30px "Fredoka", "Trebuchet MS", sans-serif';
      ctx.fillText(card.title, r.x + 222, r.y + offset + 90);

      ctx.fillStyle = '#FEF9C3';
      ctx.font = '700 24px "Fredoka", "Trebuchet MS", sans-serif';
      ctx.fillText(card.subtitle, r.x + 222, r.y + offset + 138);

      // Play pill
      ctx.fillStyle = 'rgba(255,255,255,0.24)';
      fillRoundRect(ctx, r.x + 222, r.y + offset + 168, 176, 46, 20);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '900 24px "Fredoka", "Trebuchet MS", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('▶ JUGAR', r.x + 310, r.y + offset + 192);

      ctx.restore();
    }

    // Bottom character badge + change character button
    drawTactileButton(ctx, {
      rect: this.changeCharBtn,
      label: 'CAMBIAR PERSONAJE',
      bg: '#2563EB',
      border: '#1E3A8A',
      fontSize: 26,
      pressed: isRectHeld(input, this.changeCharBtn),
      radius: 22,
    });

    // Little cheering character on bottom right
    drawCharacter(ctx, {
      id: characterId,
      x: GAME_WIDTH - 120,
      y: GAME_HEIGHT - 18,
      scale: 0.9,
      anim: 'celebrate',
      time: this.time,
    });
  }

  private drawMiniIcon(
    ctx: CanvasRenderingContext2D,
    id: GameId,
    cx: number,
    cy: number
  ): void {
    ctx.save();
    if (id === 'race') {
      ctx.fillStyle = '#475569';
      fillRoundRect(ctx, cx - 72, cy + 16, 144, 40, 10);
      ctx.fill();
      ctx.fillStyle = '#FACC15';
      ctx.fillRect(cx - 56, cy + 33, 30, 6);
      ctx.fillRect(cx - 8, cy + 33, 30, 6);
      ctx.fillRect(cx + 40, cy + 33, 24, 6);
      drawCone(ctx, cx + 32, cy + 32, 0.85);
      drawStar(ctx, cx - 32, cy - 26, 22, this.time);
    } else if (id === 'playground') {
      drawSlide(ctx, cx - 26, cy + 48, 0.9);
      drawBall(ctx, cx + 42, cy + 48, 20, this.time * 2);
      drawGradCapItem(ctx, cx + 26, cy - 34, 0.85, Math.sin(this.time * 3) * 0.2);
    } else if (id === 'classroom') {
      drawBook(ctx, cx - 34, cy + 10, -0.15);
      drawApple(ctx, cx + 36, cy + 16, 0.1);
      drawDiploma(ctx, cx, cy - 38, Math.sin(this.time * 3) * 0.18);
    } else {
      ctx.fillStyle = '#94A3B8';
      ctx.beginPath();
      ctx.moveTo(cx - 68, cy + 56);
      ctx.lineTo(cx, cy - 32);
      ctx.lineTo(cx + 68, cy + 56);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.moveTo(cx - 22, cy - 4);
      ctx.lineTo(cx, cy - 32);
      ctx.lineTo(cx + 22, cy - 4);
      ctx.closePath();
      ctx.fill();
      drawFlag(ctx, cx, cy - 26, '¡META!', this.time);
    }
    ctx.restore();
  }
}
