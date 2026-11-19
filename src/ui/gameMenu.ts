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
  isNew?: boolean;
}

export class GameMenuScreen {
  private time = 0;
  private cards: GameCardInfo[];
  private changeCharBtn: Rect = {
    x: 44,
    y: GAME_HEIGHT - 96,
    w: 350,
    h: 72,
  };

  constructor() {
    // Symmetric 4x2 grid for all 8 mini-games!
    const cols = 4;
    const cardW = 304;
    const cardH = 242;
    const gapX = 20;
    const gapY = 22;
    const startX = (GAME_WIDTH - (cardW * cols + gapX * (cols - 1))) / 2;
    const startY = 136;

    const defs: Array<Omit<GameCardInfo, 'rect'>> = [
      {
        id: 'race',
        title: '1. CARRERAS',
        subtitle: '3 niveles • ¡Corre!',
        bg: '#EF4444',
        border: '#B91C1C',
      },
      {
        id: 'playground',
        title: '2. RECREO',
        subtitle: '3 niveles • ¡Salta!',
        bg: '#22C55E',
        border: '#15803D',
      },
      {
        id: 'classroom',
        title: '3. SALÓN',
        subtitle: '3 niveles • ¡Atrapa!',
        bg: '#F59E0B',
        border: '#B45309',
      },
      {
        id: 'mountain',
        title: '4. MONTAÑA',
        subtitle: '3 niveles • ¡Sube!',
        bg: '#8B5CF6',
        border: '#5B21B6',
      },
      {
        id: 'soccer',
        title: '5. FÚTBOL',
        subtitle: '3 niveles • ¡GOLAZOS!',
        bg: '#0EA5E9',
        border: '#0369A1',
      },
      {
        id: 'dinos',
        title: '6. DINOS',
        subtitle: '3 niveles • ¡Huevos!',
        bg: '#EC4899',
        border: '#9D174D',
      },
      {
        id: 'cars',
        title: '7. CARRITOS',
        subtitle: '3 niveles • ¡TURBO!',
        bg: '#F97316',
        border: '#C2410C',
      },
      {
        id: 'memory',
        title: '8. MEMORIA',
        subtitle: '3 niveles • ¡Parejas!',
        bg: '#6366F1',
        border: '#3730A3',
        isNew: true,
      },
    ];

    this.cards = defs.map((d, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      return {
        ...d,
        rect: {
          x: startX + col * (cardW + gapX),
          y: startY + row * (cardH + gapY),
          w: cardW,
          h: cardH,
        },
      };
    });
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
    ctx.fillRect(0, GAME_HEIGHT - 110, GAME_WIDTH, 110);

    drawSun(ctx, 104, 78, this.time, 36);
    drawCloud(ctx, 270 + Math.sin(this.time * 0.4) * 14, 66, 0.76);
    drawCloud(ctx, 1010 + Math.cos(this.time * 0.3) * 14, 76, 0.8);

    const charMeta =
      CHARACTERS.find((c) => c.id === characterId) ?? CHARACTERS[0];

    // Header
    ctx.save();
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#1E3A8A';
    ctx.lineWidth = 6;
    fillRoundRect(ctx, GAME_WIDTH / 2 - 430, 20, 860, 84, 28);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#1E3A8A';
    ctx.font = '900 37px "Fredoka", "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      `¡HOLA ${charMeta.name.toUpperCase()}! ELIGE UN JUEGO`,
      GAME_WIDTH / 2,
      62
    );
    ctx.restore();

    // 8 Game Cards (4x2)
    for (const card of this.cards) {
      const pressed = isRectHeld(input, card.rect);
      const offset = pressed ? 6 : 0;
      const r = card.rect;

      ctx.save();
      ctx.fillStyle = card.border;
      fillRoundRect(ctx, r.x, r.y + 9, r.w, r.h, 26);
      ctx.fill();

      ctx.fillStyle = card.bg;
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 5;
      fillRoundRect(ctx, r.x, r.y + offset, r.w, r.h, 26);
      ctx.fill();
      ctx.stroke();

      // Top white icon box
      ctx.fillStyle = 'rgba(255,255,255,0.93)';
      fillRoundRect(ctx, r.x + 18, r.y + offset + 16, r.w - 36, 126, 20);
      ctx.fill();

      this.drawMiniIcon(ctx, card.id, r.x + r.w / 2, r.y + offset + 79, 0.78);

      if (card.isNew) {
        ctx.fillStyle = '#FACC15';
        fillRoundRect(ctx, r.x + r.w - 114, r.y + offset + 8, 102, 28, 14);
        ctx.fill();
        ctx.fillStyle = '#991B1B';
        ctx.font = '900 15px "Fredoka", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('★ ¡NUEVO!', r.x + r.w - 63, r.y + offset + 23);
      }

      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '900 24px "Fredoka", "Trebuchet MS", sans-serif';
      ctx.fillText(card.title, r.x + r.w / 2, r.y + offset + 170);

      ctx.fillStyle = '#FEF9C3';
      ctx.font = '700 18px "Fredoka", "Trebuchet MS", sans-serif';
      ctx.fillText(card.subtitle, r.x + r.w / 2, r.y + offset + 204);

      ctx.restore();
    }

    // Bottom character button
    drawTactileButton(ctx, {
      rect: this.changeCharBtn,
      label: 'CAMBIAR PERSONAJE',
      bg: '#2563EB',
      border: '#1E3A8A',
      fontSize: 24,
      pressed: isRectHeld(input, this.changeCharBtn),
      radius: 22,
    });

    // Cheering character preview
    drawCharacter(ctx, {
      id: characterId,
      x: GAME_WIDTH - 118,
      y: GAME_HEIGHT - 14,
      scale: 0.85,
      anim: 'celebrate',
      time: this.time,
    });
  }

  private drawMiniIcon(
    ctx: CanvasRenderingContext2D,
    id: GameId,
    cx: number,
    cy: number,
    scale = 0.78
  ): void {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);

    if (id === 'race') {
      ctx.fillStyle = '#475569';
      fillRoundRect(ctx, -64, 16, 128, 36, 10);
      ctx.fill();
      ctx.fillStyle = '#FACC15';
      ctx.fillRect(-48, 31, 26, 6);
      ctx.fillRect(-4, 31, 26, 6);
      ctx.fillRect(36, 31, 20, 6);
      drawCone(ctx, 28, 32, 0.82);
      drawStar(ctx, -28, -24, 22, this.time);
    } else if (id === 'playground') {
      drawSlide(ctx, -22, 46, 0.85);
      drawBall(ctx, 38, 46, 19, this.time * 2);
      drawGradCapItem(ctx, 20, -34, 0.82, Math.sin(this.time * 3) * 0.2);
    } else if (id === 'classroom') {
      drawBook(ctx, -30, 12, -0.15);
      drawApple(ctx, 32, 16, 0.1);
      drawDiploma(ctx, 0, -38, Math.sin(this.time * 3) * 0.18);
    } else if (id === 'mountain') {
      ctx.fillStyle = '#94A3B8';
      ctx.beginPath();
      ctx.moveTo(-60, 56);
      ctx.lineTo(0, -28);
      ctx.lineTo(60, 56);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.moveTo(-20, -2);
      ctx.lineTo(0, -28);
      ctx.lineTo(20, -2);
      ctx.closePath();
      ctx.fill();
      drawFlag(ctx, -4, -22, '¡META!', this.time);
    } else if (id === 'soccer') {
      ctx.strokeStyle = '#1E3A8A';
      ctx.lineWidth = 7;
      ctx.strokeRect(-54, -46, 108, 66);
      ctx.fillStyle = '#22C55E';
      ctx.fillRect(-62, 18, 124, 34);
      drawBall(ctx, 0, 44, 24, this.time * 3);
    } else if (id === 'dinos') {
      ctx.fillStyle = '#FEF08A';
      ctx.strokeStyle = '#1E293B';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(0, 6, 36, 46, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#22C55E';
      ctx.beginPath();
      ctx.arc(-12, -8, 10, 0, Math.PI * 2);
      ctx.arc(14, 12, 12, 0, Math.PI * 2);
      ctx.arc(-6, 26, 7, 0, Math.PI * 2);
      ctx.fill();
      drawStar(ctx, 36, -34, 14, this.time * 2);
    } else if (id === 'cars') {
      ctx.fillStyle = '#EF4444';
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 4;
      fillRoundRect(ctx, -56, -12, 112, 34, 14);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#BAE6FD';
      fillRoundRect(ctx, -26, -34, 52, 26, 10);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#FACC15';
      ctx.fillRect(-48, 2, 96, 7);
      for (const wx of [-32, 32]) {
        ctx.fillStyle = '#1E293B';
        ctx.beginPath();
        ctx.arc(wx, 22, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#E2E8F0';
        ctx.beginPath();
        ctx.arc(wx, 22, 6, 0, Math.PI * 2);
        ctx.fill();
      }
      drawStar(ctx, 38, -36, 14, this.time * 3);
    } else {
      // Two overlapping memory cards!
      ctx.save();
      ctx.rotate(-0.14);
      ctx.fillStyle = '#6366F1';
      ctx.strokeStyle = '#1E1B4B';
      ctx.lineWidth = 4;
      fillRoundRect(ctx, -54, -44, 62, 82, 12);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '900 38px "Fredoka", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('?', -23, 0);
      ctx.restore();

      ctx.save();
      ctx.rotate(0.14);
      ctx.fillStyle = '#FEF9C3';
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 4;
      fillRoundRect(ctx, -4, -42, 62, 82, 12);
      ctx.fill();
      ctx.stroke();
      drawStar(ctx, 27, -2, 22, this.time * 2);
      ctx.restore();
    }

    ctx.restore();
  }
}
