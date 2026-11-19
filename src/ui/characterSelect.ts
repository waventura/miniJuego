import {
  CHARACTERS,
  CharacterId,
  GAME_HEIGHT,
  GAME_WIDTH,
  InputSnapshot,
  Rect,
} from '../types';
import { drawCharacter } from '../art/characters';
import { drawCloud, drawSun, fillRoundRect } from '../art/props';
import { drawTactileButton, isRectHeld, isRectJustPressed } from './buttons';
import { sound } from '../audio/sound';

export class CharacterSelectScreen {
  private time = 0;
  private cardRects: Rect[] = [];
  private playBtn: Rect = {
    x: GAME_WIDTH / 2 - 220,
    y: GAME_HEIGHT - 112,
    w: 440,
    h: 84,
  };

  constructor() {
    const cols = 3;
    const cardW = 360;
    const cardH = 240;
    const gapX = 36;
    const gapY = 26;
    const totalW = cols * cardW + (cols - 1) * gapX;
    const startX = (GAME_WIDTH - totalW) / 2;
    const startY = 148;

    for (let i = 0; i < CHARACTERS.length; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      this.cardRects.push({
        x: startX + col * (cardW + gapX),
        y: startY + row * (cardH + gapY),
        w: cardW,
        h: cardH,
      });
    }
  }

  public update(
    dt: number,
    input: InputSnapshot,
    selected: CharacterId
  ): { selected: CharacterId; start: boolean } {
    this.time += dt;
    let nextSelected = selected;
    let start = false;

    for (let i = 0; i < this.cardRects.length; i++) {
      if (isRectJustPressed(input, this.cardRects[i])) {
        nextSelected = CHARACTERS[i].id;
        sound.playSelect();
        if (nextSelected === 'carlos') {
          sound.playVoice('char_carlos');
        } else if (nextSelected === 'mateo') {
          sound.playVoice('char_mateo');
        }
      }
    }

    if (
      isRectJustPressed(input, this.playBtn) ||
      input.keysJustPressed.has('Enter') ||
      input.keysJustPressed.has(' ')
    ) {
      sound.playBonus();
      start = true;
    }

    return { selected: nextSelected, start };
  }

  public render(
    ctx: CanvasRenderingContext2D,
    selected: CharacterId,
    input: InputSnapshot
  ): void {
    // Cheerful sky background
    ctx.fillStyle = '#38BDF8';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Soft flat hills at bottom
    ctx.fillStyle = '#4ADE80';
    ctx.beginPath();
    ctx.ellipse(280, GAME_HEIGHT + 40, 480, 180, 0, 0, Math.PI * 2);
    ctx.ellipse(1060, GAME_HEIGHT + 50, 520, 190, 0, 0, Math.PI * 2);
    ctx.fill();

    drawSun(ctx, 115, 92, this.time, 44);
    drawCloud(ctx, 240 + Math.sin(this.time * 0.4) * 16, 76, 0.85);
    drawCloud(ctx, 1020 + Math.cos(this.time * 0.35) * 18, 86, 0.9);

    // Header banner
    ctx.save();
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#1E3A8A';
    ctx.lineWidth = 6;
    fillRoundRect(ctx, GAME_WIDTH / 2 - 420, 26, 840, 88, 28);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#1E3A8A';
    ctx.font = '900 44px "Fredoka", "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('¡ELIGE TU PERSONAJE!', GAME_WIDTH / 2, 72);
    ctx.restore();

    // 6 Character cards
    for (let i = 0; i < CHARACTERS.length; i++) {
      const char = CHARACTERS[i];
      const r = this.cardRects[i];
      const isSelected = char.id === selected;

      ctx.save();
      // Card drop base
      ctx.fillStyle = isSelected ? '#F59E0B' : '#0284C7';
      fillRoundRect(ctx, r.x, r.y + 8, r.w, r.h, 28);
      ctx.fill();

      // Card body
      ctx.fillStyle = isSelected ? '#FEF9C3' : char.cardBg;
      ctx.strokeStyle = isSelected ? '#F59E0B' : '#FFFFFF';
      ctx.lineWidth = isSelected ? 7 : 5;
      fillRoundRect(ctx, r.x, r.y, r.w, r.h, 28);
      ctx.fill();
      ctx.stroke();

      // Selected badge
      if (isSelected) {
        ctx.fillStyle = '#F59E0B';
        fillRoundRect(ctx, r.x + r.w - 134, r.y + 14, 120, 34, 14);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '900 18px "Fredoka", "Trebuchet MS", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('★ LISTO ★', r.x + r.w - 74, r.y + 32);
      }

      // Character sprite preview
      drawCharacter(ctx, {
        id: char.id,
        x: r.x + 106,
        y: r.y + 204,
        scale: 1.38,
        anim: isSelected ? 'celebrate' : 'idle',
        time: this.time + i * 0.6,
      });

      // Name & subtitle
      ctx.fillStyle = char.accentColor;
      ctx.font = '900 36px "Fredoka", "Trebuchet MS", sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(char.name, r.x + 178, r.y + 114);

      ctx.fillStyle = '#334155';
      ctx.font = '800 22px "Fredoka", "Trebuchet MS", sans-serif';
      ctx.fillText(char.subtitle, r.x + 178, r.y + 154);

      ctx.restore();
    }

    // Play CTA
    drawTactileButton(ctx, {
      rect: this.playBtn,
      label: '¡A JUGAR!  ▶',
      bg: '#22C55E',
      border: '#15803D',
      fontSize: 40,
      pressed: isRectHeld(input, this.playBtn),
      radius: 28,
    });
  }
}
