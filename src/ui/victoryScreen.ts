import {
  CHARACTERS,
  GAME_HEIGHT,
  GAME_WIDTH,
  InputSnapshot,
  Rect,
  VictoryData,
} from '../types';
import { drawCharacter } from '../art/characters';
import { drawMedal, drawStar, fillRoundRect } from '../art/props';
import { drawTactileButton, isRectHeld, isRectJustPressed } from './buttons';
import { sound } from '../audio/sound';

interface ConfettiPiece {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rot: number;
  vrot: number;
}

const CONFETTI_COLORS = [
  '#EF4444',
  '#F59E0B',
  '#FACC15',
  '#22C55E',
  '#38BDF8',
  '#8B5CF6',
  '#EC4899',
];

export class VictoryScreen {
  private time = 0;
  private confetti: ConfettiPiece[] = [];

  private nextLevelBtn: Rect = {
    x: GAME_WIDTH / 2 - 470,
    y: GAME_HEIGHT - 134,
    w: 360,
    h: 92,
  };
  private replayBtn3: Rect = {
    x: GAME_WIDTH / 2 - 80,
    y: GAME_HEIGHT - 134,
    w: 250,
    h: 92,
  };
  private menuBtn3: Rect = {
    x: GAME_WIDTH / 2 + 200,
    y: GAME_HEIGHT - 134,
    w: 270,
    h: 92,
  };

  private replayBtn2: Rect = {
    x: GAME_WIDTH / 2 - 390,
    y: GAME_HEIGHT - 134,
    w: 360,
    h: 92,
  };
  private menuBtn2: Rect = {
    x: GAME_WIDTH / 2 + 30,
    y: GAME_HEIGHT - 134,
    w: 360,
    h: 92,
  };

  public reset(): void {
    this.time = 0;
    this.confetti = [];
    for (let i = 0; i < 120; i++) {
      this.confetti.push({
        x: Math.random() * GAME_WIDTH,
        y: Math.random() * -GAME_HEIGHT,
        vx: (Math.random() - 0.5) * 90,
        vy: 120 + Math.random() * 190,
        size: 10 + Math.random() * 12,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        rot: Math.random() * Math.PI * 2,
        vrot: (Math.random() - 0.5) * 8,
      });
    }
    sound.playVictory();
  }

  public update(
    dt: number,
    input: InputSnapshot,
    data: VictoryData
  ): 'nextLevel' | 'replay' | 'menu' | null {
    this.time += dt;

    for (const c of this.confetti) {
      c.x += c.vx * dt + Math.sin(this.time * 3 + c.rot) * 28 * dt;
      c.y += c.vy * dt;
      c.rot += c.vrot * dt;
      if (c.y > GAME_HEIGHT + 30) {
        c.y = -20;
        c.x = Math.random() * GAME_WIDTH;
      }
    }

    if (this.time > 0.35) {
      const hasNext = data.level < data.maxLevel;
      if (hasNext) {
        if (isRectJustPressed(input, this.nextLevelBtn)) {
          sound.playBonus();
          return 'nextLevel';
        }
        if (isRectJustPressed(input, this.replayBtn3)) {
          sound.playTap();
          return 'replay';
        }
        if (isRectJustPressed(input, this.menuBtn3)) {
          sound.playTap();
          return 'menu';
        }
      } else {
        if (isRectJustPressed(input, this.replayBtn2)) {
          sound.playBonus();
          return 'replay';
        }
        if (isRectJustPressed(input, this.menuBtn2)) {
          sound.playTap();
          return 'menu';
        }
      }
    }
    return null;
  }

  public render(
    ctx: CanvasRenderingContext2D,
    data: VictoryData,
    input: InputSnapshot
  ): void {
    // Festive radial rays background
    ctx.fillStyle = '#1D4ED8';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    ctx.save();
    ctx.translate(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40);
    ctx.rotate(this.time * 0.25);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    for (let i = 0; i < 12; i++) {
      ctx.rotate((Math.PI * 2) / 12);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-75, -900);
      ctx.lineTo(75, -900);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // Central white celebration card
    ctx.save();
    ctx.fillStyle = '#1E3A8A';
    fillRoundRect(ctx, 180, 74, GAME_WIDTH - 360, 540, 40);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#FACC15';
    ctx.lineWidth = 10;
    fillRoundRect(ctx, 180, 62, GAME_WIDTH - 360, 540, 40);
    ctx.fill();
    ctx.stroke();

    const charMeta =
      CHARACTERS.find((c) => c.id === data.characterId) ?? CHARACTERS[0];

    // Headline
    ctx.fillStyle = '#EA580C';
    ctx.font = '900 54px "Fredoka", "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(data.headline, GAME_WIDTH / 2, 132);

    // Game & Character subtitle
    ctx.fillStyle = '#1E3A8A';
    ctx.font = '800 28px "Fredoka", "Trebuchet MS", sans-serif';
    ctx.fillText(
      `¡Bravo ${charMeta.name}! — ${data.gameTitle}`,
      GAME_WIDTH / 2,
      192
    );

    // Character celebrating on left
    drawCharacter(ctx, {
      id: data.characterId,
      x: GAME_WIDTH / 2 - 220,
      y: 470,
      scale: 2.05,
      anim: 'celebrate',
      time: this.time,
    });

    // Big gleaming Medal on right
    const medalBob = Math.sin(this.time * 4) * 8;
    drawMedal(
      ctx,
      GAME_WIDTH / 2 + 195,
      368 + medalBob,
      1.65,
      data.medalColor
    );

    // Floating decorative stars
    drawStar(ctx, GAME_WIDTH / 2 + 80, 290 + medalBob * 0.5, 22, this.time * 2);
    drawStar(
      ctx,
      GAME_WIDTH / 2 + 310,
      310 - medalBob * 0.5,
      18,
      -this.time * 2
    );

    // Medal title & Stat pill
    ctx.fillStyle = '#FEF3C7';
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 4;
    fillRoundRect(ctx, GAME_WIDTH / 2 - 40, 480, 470, 86, 22);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#B45309';
    ctx.font = '900 27px "Fredoka", "Trebuchet MS", sans-serif';
    ctx.fillText(data.medalTitle, GAME_WIDTH / 2 + 195, 508);

    ctx.fillStyle = '#1E293B';
    ctx.font = '800 23px "Fredoka", "Trebuchet MS", sans-serif';
    ctx.fillText(data.statLabel, GAME_WIDTH / 2 + 195, 544);

    ctx.restore();

    // Confetti on top of card
    for (const c of this.confetti) {
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(c.rot);
      ctx.fillStyle = c.color;
      ctx.fillRect(-c.size / 2, -c.size / 3, c.size, (c.size * 2) / 3);
      ctx.restore();
    }

    // Bottom big buttons
    const hasNext = data.level < data.maxLevel;
    if (hasNext) {
      drawTactileButton(ctx, {
        rect: this.nextLevelBtn,
        label: `▶ ¡NIVEL ${data.level + 1}!`,
        bg: '#22C55E',
        border: '#15803D',
        fontSize: 38,
        pressed: isRectHeld(input, this.nextLevelBtn),
        radius: 26,
      });

      drawTactileButton(ctx, {
        rect: this.replayBtn3,
        label: '↻ REPETIR',
        bg: '#2563EB',
        border: '#1E3A8A',
        fontSize: 28,
        pressed: isRectHeld(input, this.replayBtn3),
        radius: 26,
      });

      drawTactileButton(ctx, {
        rect: this.menuBtn3,
        label: '★ JUEGOS',
        bg: '#F59E0B',
        border: '#B45309',
        fontSize: 28,
        pressed: isRectHeld(input, this.menuBtn3),
        radius: 26,
      });
    } else {
      drawTactileButton(ctx, {
        rect: this.replayBtn2,
        label: '↻  ¡OTRA VEZ!',
        bg: '#22C55E',
        border: '#15803D',
        fontSize: 36,
        pressed: isRectHeld(input, this.replayBtn2),
        radius: 26,
      });

      drawTactileButton(ctx, {
        rect: this.menuBtn2,
        label: '★  MÁS JUEGOS',
        bg: '#F59E0B',
        border: '#B45309',
        fontSize: 36,
        pressed: isRectHeld(input, this.menuBtn2),
        radius: 26,
      });
    }
  }
}
