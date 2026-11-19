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
    y: GAME_HEIGHT - 110,
    w: 440,
    h: 82,
  };

  constructor() {
    // Row 1: 3 big cards (Carlos, Mateo, Ariel)
    const w1 = 368;
    const h1 = 240;
    const gap1 = 32;
    const startX1 = (GAME_WIDTH - (w1 * 3 + gap1 * 2)) / 2;
    const y1 = 144;
    for (let i = 0; i < 3; i++) {
      this.cardRects.push({
        x: startX1 + i * (w1 + gap1),
        y: y1,
        w: w1,
        h: h1,
      });
    }

    // Row 2: 4 cards (Piloto, Súper, Astro, Dino)
    const w2 = 286;
    const h2 = 240;
    const gap2 = 22;
    const startX2 = (GAME_WIDTH - (w2 * 4 + gap2 * 3)) / 2;
    const y2 = y1 + h1 + 24;
    for (let i = 0; i < 4; i++) {
      this.cardRects.push({
        x: startX2 + i * (w2 + gap2),
        y: y2,
        w: w2,
        h: h2,
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
        } else if (nextSelected === 'ariel') {
          sound.playVoice('char_ariel');
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

    drawSun(ctx, 115, 90, this.time, 42);
    drawCloud(ctx, 240 + Math.sin(this.time * 0.4) * 16, 74, 0.85);
    drawCloud(ctx, 1020 + Math.cos(this.time * 0.35) * 18, 84, 0.9);

    // Header banner
    ctx.save();
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#1E3A8A';
    ctx.lineWidth = 6;
    fillRoundRect(ctx, GAME_WIDTH / 2 - 420, 24, 840, 86, 28);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#1E3A8A';
    ctx.font = '900 44px "Fredoka", "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('¡ELIGE TU PERSONAJE!', GAME_WIDTH / 2, 69);
    ctx.restore();

    // 7 Character cards
    for (let i = 0; i < CHARACTERS.length; i++) {
      const char = CHARACTERS[i];
      const r = this.cardRects[i];
      const isSelected = char.id === selected;
      const isWide = i < 3;

      ctx.save();
      // Card drop base
      ctx.fillStyle = isSelected ? '#F59E0B' : '#0284C7';
      fillRoundRect(ctx, r.x, r.y + 8, r.w, r.h, 26);
      ctx.fill();

      // Card body
      ctx.fillStyle = isSelected ? '#FEF9C3' : char.cardBg;
      ctx.strokeStyle = isSelected ? '#F59E0B' : '#FFFFFF';
      ctx.lineWidth = isSelected ? 7 : 5;
      fillRoundRect(ctx, r.x, r.y, r.w, r.h, 26);
      ctx.fill();
      ctx.stroke();

      // Selected badge
      if (isSelected) {
        ctx.fillStyle = '#F59E0B';
        fillRoundRect(ctx, r.x + r.w - 122, r.y + 12, 110, 32, 14);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '900 17px "Fredoka", "Trebuchet MS", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('★ LISTO ★', r.x + r.w - 67, r.y + 29);
      }

      if (isWide) {
        // Side-by-side layout for Carlos, Mateo, Ariel
        drawCharacter(ctx, {
          id: char.id,
          x: r.x + 106,
          y: r.y + 204,
          scale: 1.38,
          anim: isSelected ? 'celebrate' : 'idle',
          time: this.time + i * 0.6,
        });

        ctx.fillStyle = char.accentColor;
        ctx.font = '900 36px "Fredoka", "Trebuchet MS", sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(char.name, r.x + 178, r.y + 114);

        ctx.fillStyle = '#334155';
        ctx.font = '800 22px "Fredoka", "Trebuchet MS", sans-serif';
        ctx.fillText(char.subtitle, r.x + 178, r.y + 154);
      } else {
        // Centered layout for the 4 bottom cards
        drawCharacter(ctx, {
          id: char.id,
          x: r.x + 86,
          y: r.y + 204,
          scale: 1.24,
          anim: isSelected ? 'celebrate' : 'idle',
          time: this.time + i * 0.6,
        });

        ctx.fillStyle = char.accentColor;
        ctx.font = '900 30px "Fredoka", "Trebuchet MS", sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(char.name, r.x + 144, r.y + 114);

        ctx.fillStyle = '#334155';
        ctx.font = '800 18px "Fredoka", "Trebuchet MS", sans-serif';
        ctx.fillText(char.subtitle, r.x + 144, r.y + 150);
      }

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
