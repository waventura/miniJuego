import { InputSnapshot, Rect } from '../types';
import { fillRoundRect } from '../art/props';

export function isPointInRect(px: number, py: number, r: Rect): boolean {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

export function isRectHeld(input: InputSnapshot, r: Rect): boolean {
  return input.pointers.some((p) => isPointInRect(p.x, p.y, r));
}

export function isRectJustPressed(input: InputSnapshot, r: Rect): boolean {
  return input.pointers.some(
    (p) => p.justPressed && isPointInRect(p.x, p.y, r)
  );
}

export interface TactileButtonOptions {
  rect: Rect;
  label: string;
  sublabel?: string;
  bg: string;
  border: string;
  textColor?: string;
  fontSize?: number;
  pressed?: boolean;
  radius?: number;
}

export function drawTactileButton(
  ctx: CanvasRenderingContext2D,
  opts: TactileButtonOptions
): void {
  const {
    rect,
    label,
    sublabel,
    bg,
    border,
    textColor = '#FFFFFF',
    fontSize = 32,
    pressed = false,
    radius = 24,
  } = opts;

  const offset = pressed ? 6 : 0;

  ctx.save();

  // Flat 3D bottom lip (clean flat-vector style)
  ctx.fillStyle = border;
  fillRoundRect(ctx, rect.x, rect.y + 8, rect.w, rect.h, radius);
  ctx.fill();

  // Main button surface
  ctx.fillStyle = bg;
  ctx.strokeStyle = border;
  ctx.lineWidth = 4;
  fillRoundRect(ctx, rect.x, rect.y + offset, rect.w, rect.h, radius);
  ctx.fill();
  ctx.stroke();

  // Top glossy strip
  ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
  fillRoundRect(
    ctx,
    rect.x + 12,
    rect.y + offset + 8,
    rect.w - 24,
    Math.max(12, rect.h * 0.22),
    radius * 0.5
  );
  ctx.fill();

  // Label
  ctx.fillStyle = textColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `900 ${fontSize}px "Fredoka", "Trebuchet MS", sans-serif`;

  if (sublabel) {
    ctx.fillText(label, rect.x + rect.w / 2, rect.y + offset + rect.h * 0.42);
    ctx.font = `700 ${Math.round(fontSize * 0.55)}px "Fredoka", "Trebuchet MS", sans-serif`;
    ctx.fillText(
      sublabel,
      rect.x + rect.w / 2,
      rect.y + offset + rect.h * 0.74
    );
  } else {
    ctx.fillText(label, rect.x + rect.w / 2, rect.y + offset + rect.h / 2 + 1);
  }

  ctx.restore();
}

export function drawMuteButton(
  ctx: CanvasRenderingContext2D,
  rect: Rect,
  muted: boolean
): void {
  ctx.save();
  ctx.fillStyle = muted ? '#94A3B8' : '#FACC15';
  ctx.strokeStyle = muted ? '#475569' : '#B45309';
  ctx.lineWidth = 4;
  fillRoundRect(ctx, rect.x, rect.y, rect.w, rect.h, 18);
  ctx.fill();
  ctx.stroke();

  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;

  // Speaker body
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.moveTo(cx - 16, cy - 8);
  ctx.lineTo(cx - 6, cy - 8);
  ctx.lineTo(cx + 6, cy - 17);
  ctx.lineTo(cx + 6, cy + 17);
  ctx.lineTo(cx - 6, cy + 8);
  ctx.lineTo(cx - 16, cy + 8);
  ctx.closePath();
  ctx.fill();

  if (muted) {
    ctx.strokeStyle = '#EF4444';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx + 12, cy - 10);
    ctx.lineTo(cx + 24, cy + 10);
    ctx.moveTo(cx + 24, cy - 10);
    ctx.lineTo(cx + 12, cy + 10);
    ctx.stroke();
  } else {
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(cx + 8, cy, 9, -Math.PI / 3, Math.PI / 3);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx + 8, cy, 16, -Math.PI / 3, Math.PI / 3);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawHomeButton(
  ctx: CanvasRenderingContext2D,
  rect: Rect
): void {
  ctx.save();
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#1E3A8A';
  ctx.lineWidth = 4;
  fillRoundRect(ctx, rect.x, rect.y, rect.w, rect.h, 18);
  ctx.fill();
  ctx.stroke();

  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;

  // Back arrow
  ctx.strokeStyle = '#1E3A8A';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(cx + 12, cy);
  ctx.lineTo(cx - 12, cy);
  ctx.moveTo(cx - 2, cy - 12);
  ctx.lineTo(cx - 14, cy);
  ctx.lineTo(cx - 2, cy + 12);
  ctx.stroke();
  ctx.restore();
}
