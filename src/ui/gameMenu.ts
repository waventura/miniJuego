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
  drawSoccerBall,
  drawStar,
  drawSun,
  fillRoundRect,
} from '../art/props';
import { drawTactileButton, isRectHeld, isRectJustPressed } from './buttons';
import { sound } from '../audio/sound';

interface GameCardDef {
  id: GameId;
  title: string;
  subtitle: string;
  bg: string;
  border: string;
  isNew?: boolean;
}

const ALL_GAMES: GameCardDef[] = [
  {
    id: 'race',
    title: '1. CARRERAS',
    subtitle: '5 niveles • ¡Vallas!',
    bg: '#EF4444',
    border: '#B91C1C',
  },
  {
    id: 'playground',
    title: '2. RECREO',
    subtitle: '5 niveles • ¡Salta!',
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
    subtitle: '5 niveles • ¡Móvil!',
    bg: '#8B5CF6',
    border: '#5B21B6',
  },
  {
    id: 'soccer',
    title: '5. FÚTBOL',
    subtitle: '10 niveles • ¡COPA!',
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
    subtitle: '5 niveles • ¡TURBO!',
    bg: '#F97316',
    border: '#C2410C',
  },
  {
    id: 'memory',
    title: '8. MEMORIA',
    subtitle: '3 niveles • ¡Parejas!',
    bg: '#6366F1',
    border: '#3730A3',
  },
  {
    id: 'flappy',
    title: '9. VOLAR',
    subtitle: '5 niveles • ¡Flappy!',
    bg: '#14B8A6',
    border: '#0F766E',
  },
  {
    id: 'tictactoe',
    title: '10. X y O',
    subtitle: '1P o 2P • ¡3 en raya!',
    bg: '#2563EB',
    border: '#1E3A8A',
  },
  {
    id: 'waterballoons',
    title: '11. GLOBOS',
    subtitle: '10 niveles • ¡SPLASH!',
    bg: '#06B6D4',
    border: '#0E7490',
  },
  {
    id: 'alphabet',
    title: '12. ABC',
    subtitle: '5 niveles • Vocales!',
    bg: '#D946EF',
    border: '#86198F',
  },
  {
    id: 'farm',
    title: '13. GRANJA',
    subtitle: '3 niveles • ¡Animales!',
    bg: '#84CC16',
    border: '#4D7C0F',
    isNew: true,
  },
];

const PER_PAGE = 8;

export class GameMenuScreen {
  private time = 0;
  private page = 0;
  private totalPages = Math.ceil(ALL_GAMES.length / PER_PAGE);

  private changeCharBtn: Rect = {
    x: 44,
    y: GAME_HEIGHT - 96,
    w: 320,
    h: 72,
  };
  private pageBtn: Rect = {
    x: GAME_WIDTH / 2 - 190,
    y: GAME_HEIGHT - 96,
    w: 380,
    h: 72,
  };

  private getCurrentPageCards(): Array<GameCardDef & { rect: Rect }> {
    const slice = ALL_GAMES.slice(
      this.page * PER_PAGE,
      (this.page + 1) * PER_PAGE
    );
    const cols = 4;
    const cardW = 304;
    const cardH = 242;
    const gapX = 20;
    const gapY = 22;
    const startX = (GAME_WIDTH - (cardW * cols + gapX * (cols - 1))) / 2;
    const startY = 134;

    return slice.map((d, i) => {
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

    if (isRectJustPressed(input, this.pageBtn)) {
      this.page = (this.page + 1) % this.totalPages;
      sound.playSelect();
      return { launchGame: null, backToSelect: false };
    }

    const cards = this.getCurrentPageCards();
    for (const card of cards) {
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
    ctx.font = '900 36px "Fredoka", "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      `¡HOLA ${charMeta.name.toUpperCase()}!  JUEGOS (${this.page + 1}/${this.totalPages})`,
      GAME_WIDTH / 2,
      62
    );
    ctx.restore();

    // Big 4x2 cards on current page
    const cards = this.getCurrentPageCards();
    for (const card of cards) {
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
      fillRoundRect(ctx, r.x + 18, r.y + offset + 14, r.w - 36, 128, 20);
      ctx.fill();

      this.drawMiniIcon(ctx, card.id, r.x + r.w / 2, r.y + offset + 78, 0.78);

      if (card.isNew) {
        ctx.fillStyle = '#FACC15';
        fillRoundRect(ctx, r.x + r.w - 108, r.y + offset + 8, 98, 28, 12);
        ctx.fill();
        ctx.fillStyle = '#991B1B';
        ctx.font = '900 14px "Fredoka", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('★ ¡NUEVO!', r.x + r.w - 59, r.y + offset + 23);
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

    // Bottom buttons: Change Character + Next/Prev Page of Games!
    drawTactileButton(ctx, {
      rect: this.changeCharBtn,
      label: 'CAMBIAR PERSONAJE',
      bg: '#2563EB',
      border: '#1E3A8A',
      fontSize: 22,
      pressed: isRectHeld(input, this.changeCharBtn),
      radius: 22,
    });

    drawTactileButton(ctx, {
      rect: this.pageBtn,
      label:
        this.page === 0 ? '★ MÁS JUEGOS (9–13) ▶' : '◀ VER JUEGOS (1–8)',
      bg: '#F59E0B',
      border: '#B45309',
      fontSize: 26,
      pressed: isRectHeld(input, this.pageBtn),
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
      drawSoccerBall(ctx, 0, 44, 24, this.time * 3);
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
    } else if (id === 'memory') {
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
    } else if (id === 'flappy') {
      ctx.fillStyle = '#22C55E';
      ctx.strokeStyle = '#15803D';
      ctx.lineWidth = 4;
      ctx.fillRect(24, -64, 30, 44);
      ctx.strokeRect(24, -64, 30, 44);
      ctx.fillRect(24, 24, 30, 40);
      ctx.strokeRect(24, 24, 30, 40);

      const flap = Math.sin(this.time * 12) * 8;
      ctx.fillStyle = '#FACC15';
      ctx.strokeStyle = '#B45309';
      ctx.beginPath();
      ctx.arc(-20, flap * 0.4, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#FEF9C3';
      ctx.beginPath();
      ctx.ellipse(-34, 4 + flap * 0.5, 16, 9, -0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.arc(-10, -6 + flap * 0.4, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#F97316';
      ctx.beginPath();
      ctx.moveTo(4, -2 + flap * 0.4);
      ctx.lineTo(18, 3 + flap * 0.4);
      ctx.lineTo(4, 10 + flap * 0.4);
      ctx.closePath();
      ctx.fill();
    } else if (id === 'tictactoe') {
      ctx.strokeStyle = '#94A3B8';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-18, -50);
      ctx.lineTo(-18, 50);
      ctx.moveTo(18, -50);
      ctx.lineTo(18, 50);
      ctx.moveTo(-50, -18);
      ctx.lineTo(50, -18);
      ctx.moveTo(-50, 18);
      ctx.lineTo(50, 18);
      ctx.stroke();

      ctx.strokeStyle = '#2563EB';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(-46, -46);
      ctx.lineTo(-26, -26);
      ctx.moveTo(-26, -46);
      ctx.lineTo(-46, -26);
      ctx.stroke();

      ctx.strokeStyle = '#EF4444';
      ctx.beginPath();
      ctx.arc(0, 0, 11, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = '#2563EB';
      ctx.beginPath();
      ctx.moveTo(26, 26);
      ctx.lineTo(46, 46);
      ctx.moveTo(46, 26);
      ctx.lineTo(26, 46);
      ctx.stroke();
    } else if (id === 'waterballoons') {
      ctx.fillStyle = '#38BDF8';
      fillRoundRect(ctx, -64, 24, 128, 32, 10);
      ctx.fill();

      ctx.fillStyle = '#FACC15';
      ctx.strokeStyle = '#92400E';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(12, 12, 32, 20, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(30, -14, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#F97316';
      ctx.beginPath();
      ctx.ellipse(48, -12, 10, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.arc(35, -18, 3.8, 0, Math.PI * 2);
      ctx.fill();

      const bob = Math.sin(this.time * 6) * 5;
      ctx.fillStyle = '#EF4444';
      ctx.strokeStyle = '#991B1B';
      ctx.beginPath();
      ctx.ellipse(-34, -22 + bob, 18, 22, 0.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else if (id === 'alphabet') {
      const bubbles = [
        { x: -32, y: -12, letter: 'A', bg: '#EF4444', border: '#991B1B' },
        { x: 30, y: -22, letter: 'E', bg: '#3B82F6', border: '#1E3A8A' },
        { x: 4, y: 28, letter: 'O', bg: '#22C55E', border: '#15803D' },
      ];
      for (const b of bubbles) {
        const bob = Math.sin(this.time * 4 + b.x) * 4;
        ctx.fillStyle = b.bg;
        ctx.strokeStyle = b.border;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(b.x, b.y + bob, 26, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#FFFFFF';
        ctx.font = '900 28px "Fredoka", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(b.letter, b.x, b.y + bob + 2);
      }
    } else {
      // Red Barn + cute little cow face!
      ctx.fillStyle = '#DC2626';
      ctx.strokeStyle = '#7F1D1D';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-54, 48);
      ctx.lineTo(-54, -12);
      ctx.lineTo(0, -52);
      ctx.lineTo(54, -12);
      ctx.lineTo(54, 48);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Cute white cow peeking out
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#1E293B';
      ctx.beginPath();
      ctx.arc(0, 12, 24, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#F9A8D4';
      ctx.beginPath();
      ctx.ellipse(0, 24, 18, 11, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.arc(-9, 6, 3.5, 0, Math.PI * 2);
      ctx.arc(9, 6, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}
