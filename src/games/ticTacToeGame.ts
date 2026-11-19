import {
  CHARACTERS,
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
import { drawTactileButton, isPointInRect, isRectJustPressed } from '../ui/buttons';
import { sound } from '../audio/sound';

type CellValue = 'X' | 'O' | null;

const WIN_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export class TicTacToeGame implements MiniGame {
  private time = 0;
  private board: CellValue[] = Array(9).fill(null);
  private cellRects: Rect[] = [];
  private turn: 'X' | 'O' = 'X';
  private twoPlayer = false;
  private rivalId: CharacterId;

  private playerWins = 0;
  private winsNeeded: number;
  private cpuThinkTimer = 0;
  private roundBanner = '';
  private roundPauseTimer = 0;
  private winningLine: number[] | null = null;
  private finished = false;
  private finishTimer = 0;

  private modeBtn: Rect = { x: 46, y: 660, w: 300, h: 86 };

  constructor(private playerId: CharacterId, private level = 1) {
    this.winsNeeded = level; // Level 1: 1 win, Level 2: 2 wins, Level 3: 3 wins
    const others = CHARACTERS.filter((c) => c.id !== playerId);
    // If Carlos plays, Mateo is rival (and vice-versa)!
    const mateoOrCarlos =
      playerId === 'carlos'
        ? 'mateo'
        : playerId === 'mateo'
        ? 'carlos'
        : others[0]?.id ?? 'dino';
    this.rivalId = mateoOrCarlos;

    const cellSize = 164;
    const gap = 16;
    const boardSize = cellSize * 3 + gap * 2;
    const startX = (GAME_WIDTH - boardSize) / 2;
    const startY = 165;

    for (let i = 0; i < 9; i++) {
      const col = i % 3;
      const row = Math.floor(i / 3);
      this.cellRects.push({
        x: startX + col * (cellSize + gap),
        y: startY + row * (cellSize + gap),
        w: cellSize,
        h: cellSize,
      });
    }
  }

  private resetBoard(): void {
    this.board = Array(9).fill(null);
    this.turn = 'X';
    this.winningLine = null;
    this.roundBanner = '';
    this.cpuThinkTimer = 0;
  }

  public update(dt: number, input: InputSnapshot): VictoryData | null {
    this.time += dt;

    if (this.finished) {
      this.finishTimer += dt;
      if (this.finishTimer >= 1.2) {
        return {
          gameId: 'tictactoe',
          gameTitle: `¡X y O! (Nivel ${this.level})`,
          characterId: this.playerId,
          level: this.level,
          maxLevel: 3,
          headline: '¡CAMPEÓN DE X y O!',
          statLabel: `¡Ganaste ${this.playerWins} ${this.playerWins === 1 ? 'ronda' : 'rondas'}!`,
          medalTitle: 'MEDALLA DE INGENIO',
          medalColor: 'gold',
        };
      }
      return null;
    }

    // Toggle 1P vs CPU / 2P (Carlos vs Mateo on same tablet!)
    if (isRectJustPressed(input, this.modeBtn)) {
      this.twoPlayer = !this.twoPlayer;
      sound.playSelect();
      this.resetBoard();
      return null;
    }

    // Pause briefly after a round ends so kids see the winning 3-in-a-row!
    if (this.roundPauseTimer > 0) {
      this.roundPauseTimer -= dt;
      if (this.roundPauseTimer <= 0) {
        this.resetBoard();
      }
      return null;
    }

    // CPU turn (only in 1P mode)
    if (!this.twoPlayer && this.turn === 'O') {
      this.cpuThinkTimer -= dt;
      if (this.cpuThinkTimer <= 0) {
        const move = this.pickCpuMove();
        if (move !== -1) {
          this.placeMark(move, 'O');
        }
      }
      return null;
    }

    // Human tap on board
    for (const p of input.pointers) {
      if (!p.justPressed) continue;
      for (let i = 0; i < 9; i++) {
        if (this.board[i] === null && isPointInRect(p.x, p.y, this.cellRects[i])) {
          this.placeMark(i, this.turn);
          break;
        }
      }
    }

    return null;
  }

  private placeMark(idx: number, mark: 'X' | 'O'): void {
    this.board[idx] = mark;
    sound.playTap();

    const winLine = this.findWinLine(mark);
    if (winLine) {
      this.winningLine = winLine;
      if (mark === 'X' || this.twoPlayer) {
        this.playerWins++;
        this.roundBanner = mark === 'X' ? '¡GANÓ LA X!' : '¡GANÓ LA O!';
        sound.playBonus();
        if (this.playerWins >= this.winsNeeded) {
          this.finished = true;
          this.finishTimer = 0;
          sound.playFlagPlant();
        } else {
          this.roundPauseTimer = 1.4;
        }
      } else {
        this.roundBanner = '¡CASI! ¡OTRA RONDA!';
        sound.playBonk();
        this.roundPauseTimer = 1.4;
      }
      return;
    }

    if (this.board.every((c) => c !== null)) {
      this.roundBanner = '¡EMPATE! ¡OTRA VEZ!';
      sound.playSelect();
      this.roundPauseTimer = 1.3;
      return;
    }

    this.turn = mark === 'X' ? 'O' : 'X';
    if (!this.twoPlayer && this.turn === 'O') {
      this.cpuThinkTimer = 0.55;
    }
  }

  private findWinLine(mark: 'X' | 'O'): number[] | null {
    for (const line of WIN_LINES) {
      if (line.every((i) => this.board[i] === mark)) return line;
    }
    return null;
  }

  private pickCpuMove(): number {
    const empty = this.board
      .map((v, i) => (v === null ? i : -1))
      .filter((i) => i !== -1);
    if (empty.length === 0) return -1;

    // Level 1: super friendly random; Level 2-3: occasionally blocks X
    if (this.level >= 2 && Math.random() < 0.45) {
      for (const idx of empty) {
        this.board[idx] = 'X';
        const wouldWin = this.findWinLine('X') !== null;
        this.board[idx] = null;
        if (wouldWin) return idx;
      }
    }
    return empty[Math.floor(Math.random() * empty.length)];
  }

  public render(ctx: CanvasRenderingContext2D): void {
    // Sunny sky & meadow
    ctx.fillStyle = '#38BDF8';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    drawSun(ctx, 1185, 86, this.time, 38);
    drawCloud(ctx, 180 + Math.sin(this.time * 0.35) * 14, 78, 0.8);
    drawCloud(ctx, 940 + Math.cos(this.time * 0.3) * 14, 74, 0.82);

    ctx.fillStyle = '#4ADE80';
    ctx.fillRect(0, GAME_HEIGHT - 110, GAME_WIDTH, 110);

    // Top HUD
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.strokeStyle = '#1E3A8A';
    ctx.lineWidth = 5;
    fillRoundRect(ctx, GAME_WIDTH / 2 - 330, 20, 660, 68, 28);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#1E3A8A';
    ctx.font = '900 32px "Fredoka", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const turnLabel = this.turn === 'X' ? 'TURNO DE X' : 'TURNO DE O';
    ctx.fillText(
      `NIVEL ${this.level}  •  ${turnLabel}  •  ★ ${this.playerWins}/${this.winsNeeded}`,
      GAME_WIDTH / 2,
      55
    );
    ctx.restore();

    // Left character (X)
    const p1Meta = CHARACTERS.find((c) => c.id === this.playerId) ?? CHARACTERS[0];
    this.drawPlayerBadge(ctx, 190, 410, this.playerId, p1Meta.name, 'X', '#2563EB', this.turn === 'X');

    // Right character (O)
    const p2Meta = CHARACTERS.find((c) => c.id === this.rivalId) ?? CHARACTERS[1];
    this.drawPlayerBadge(
      ctx,
      GAME_WIDTH - 190,
      410,
      this.rivalId,
      this.twoPlayer ? p2Meta.name : `${p2Meta.name} (CPU)`,
      'O',
      '#EF4444',
      this.turn === 'O'
    );

    // Board backing card
    ctx.save();
    ctx.fillStyle = '#1E3A8A';
    fillRoundRect(ctx, GAME_WIDTH / 2 - 282, 148, 564, 564, 34);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#FACC15';
    ctx.lineWidth = 8;
    fillRoundRect(ctx, GAME_WIDTH / 2 - 282, 138, 564, 564, 34);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // 9 Cells
    for (let i = 0; i < 9; i++) {
      const r = this.cellRects[i];
      const val = this.board[i];
      const isWinCell = this.winningLine?.includes(i) ?? false;

      ctx.save();
      ctx.fillStyle = isWinCell ? '#FEF08A' : '#F1F5F9';
      ctx.strokeStyle = isWinCell ? '#F59E0B' : '#CBD5E1';
      ctx.lineWidth = 5;
      fillRoundRect(ctx, r.x, r.y, r.w, r.h, 24);
      ctx.fill();
      ctx.stroke();

      const cx = r.x + r.w / 2;
      const cy = r.y + r.h / 2;

      if (val === 'X') {
        ctx.strokeStyle = '#2563EB';
        ctx.lineWidth = 18;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(cx - 42, cy - 42);
        ctx.lineTo(cx + 42, cy + 42);
        ctx.moveTo(cx + 42, cy - 42);
        ctx.lineTo(cx - 42, cy + 42);
        ctx.stroke();
      } else if (val === 'O') {
        ctx.strokeStyle = '#EF4444';
        ctx.lineWidth = 18;
        ctx.beginPath();
        ctx.arc(cx, cy, 44, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Round banner
    if (this.roundBanner) {
      ctx.save();
      ctx.fillStyle = '#FACC15';
      ctx.strokeStyle = '#B45309';
      ctx.lineWidth = 6;
      fillRoundRect(ctx, GAME_WIDTH / 2 - 250, 370, 500, 96, 30);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#991B1B';
      ctx.font = '900 44px "Fredoka", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.roundBanner, GAME_WIDTH / 2, 418);
      ctx.restore();
    }

    // 1P / 2P Toggle button
    drawTactileButton(ctx, {
      rect: this.modeBtn,
      label: this.twoPlayer ? '👥 2 JUGADORES' : '🤖 VS CPU',
      sublabel: 'Toca para cambiar',
      bg: this.twoPlayer ? '#22C55E' : '#7C3AED',
      border: this.twoPlayer ? '#15803D' : '#4C1D95',
      fontSize: 25,
      pressed: false,
      radius: 24,
    });
  }

  private drawPlayerBadge(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    charId: CharacterId,
    name: string,
    mark: 'X' | 'O',
    color: string,
    active: boolean
  ): void {
    ctx.save();
    ctx.fillStyle = active ? '#FEF9C3' : 'rgba(255,255,255,0.88)';
    ctx.strokeStyle = active ? '#F59E0B' : '#FFFFFF';
    ctx.lineWidth = active ? 7 : 4;
    fillRoundRect(ctx, cx - 135, cy - 170, 270, 310, 30);
    ctx.fill();
    ctx.stroke();

    drawCharacter(ctx, {
      id: charId,
      x: cx,
      y: cy + 68,
      scale: 1.35,
      anim: active || this.finished ? 'celebrate' : 'idle',
      time: this.time,
    });

    ctx.fillStyle = color;
    ctx.font = '900 32px "Fredoka", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${mark}  ${name}`, cx, cy + 108);

    if (active) {
      drawStar(ctx, cx, cy - 144, 18, this.time * 3);
    }
    ctx.restore();
  }
}
