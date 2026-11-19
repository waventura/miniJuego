export function fillRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export function drawCloud(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale = 1
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
  ctx.beginPath();
  ctx.arc(0, 0, 26, 0, Math.PI * 2);
  ctx.arc(28, -8, 32, 0, Math.PI * 2);
  ctx.arc(60, -2, 26, 0, Math.PI * 2);
  ctx.arc(28, 12, 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawSun(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  time: number,
  radius = 42
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(time * 0.25);
  ctx.fillStyle = '#FDE047';
  for (let i = 0; i < 12; i++) {
    ctx.rotate((Math.PI * 2) / 12);
    fillRoundRect(ctx, -5, -radius - 16, 10, 14, 5);
    ctx.fill();
  }
  ctx.fillStyle = '#FACC15';
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#FEF08A';
  ctx.beginPath();
  ctx.arc(-8, -8, radius * 0.45, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawCone(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale = 1
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  // Base
  ctx.fillStyle = '#EA580C';
  ctx.strokeStyle = '#9A3412';
  ctx.lineWidth = 3;
  fillRoundRect(ctx, -26, -10, 52, 10, 4);
  ctx.fill();
  ctx.stroke();

  // Cone triangle
  ctx.fillStyle = '#F97316';
  ctx.beginPath();
  ctx.moveTo(-20, -10);
  ctx.lineTo(-5, -56);
  ctx.lineTo(5, -56);
  ctx.lineTo(20, -10);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // White reflective stripe
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.moveTo(-13, -27);
  ctx.lineTo(-9, -40);
  ctx.lineTo(9, -40);
  ctx.lineTo(13, -27);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

export function drawPuddle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale = 1
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  ctx.fillStyle = '#38BDF8';
  ctx.strokeStyle = '#0284C7';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(0, -6, 44, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#BAE6FD';
  ctx.beginPath();
  ctx.ellipse(-12, -8, 16, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

export function drawSlide(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale = 1
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  // Ladder legs
  ctx.strokeStyle = '#1D4ED8';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-26, 0);
  ctx.lineTo(-26, -68);
  ctx.moveTo(-10, 0);
  ctx.lineTo(-10, -68);
  ctx.stroke();

  // Steps
  ctx.strokeStyle = '#FACC15';
  ctx.lineWidth = 4;
  for (let sy = -16; sy >= -56; sy -= 14) {
    ctx.beginPath();
    ctx.moveTo(-26, sy);
    ctx.lineTo(-10, sy);
    ctx.stroke();
  }

  // Slide chute
  ctx.fillStyle = '#EF4444';
  ctx.strokeStyle = '#991B1B';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-14, -66);
  ctx.quadraticCurveTo(10, -56, 36, -6);
  ctx.lineTo(24, 0);
  ctx.quadraticCurveTo(0, -44, -22, -56);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

export function drawBall(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius = 24,
  rot = 0
): void {
  ctx.save();
  ctx.translate(x, y - radius);
  ctx.rotate(rot);

  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#1E293B';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Colorful beach-ball / soccer wedges
  const colors = ['#EF4444', '#FACC15', '#3B82F6'];
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = colors[i];
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(
      0,
      0,
      radius - 1.5,
      (i * Math.PI * 2) / 3,
      (i * Math.PI * 2) / 3 + Math.PI / 3
    );
    ctx.closePath();
    ctx.fill();
  }

  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

export function drawBackpack(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale = 1
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  // Top handle
  ctx.strokeStyle = '#6D28D9';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(0, -54, 9, Math.PI, 0);
  ctx.stroke();

  // Main bag
  ctx.fillStyle = '#8B5CF6';
  ctx.strokeStyle = '#4C1D95';
  ctx.lineWidth = 3;
  fillRoundRect(ctx, -24, -52, 48, 52, 16);
  ctx.fill();
  ctx.stroke();

  // Front pocket
  ctx.fillStyle = '#FACC15';
  fillRoundRect(ctx, -17, -26, 34, 20, 8);
  ctx.fill();
  ctx.stroke();

  // Zipper line
  ctx.strokeStyle = '#4C1D95';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-12, -20);
  ctx.lineTo(12, -20);
  ctx.stroke();

  ctx.restore();
}

export function drawStar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius = 22,
  rot = 0
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);

  ctx.fillStyle = '#FACC15';
  ctx.strokeStyle = '#B45309';
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? radius : radius * 0.48;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const px = Math.cos(a) * r;
    const py = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Cute shine
  ctx.fillStyle = '#FEF9C3';
  ctx.beginPath();
  ctx.arc(-radius * 0.2, -radius * 0.2, radius * 0.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

export function drawGradCapItem(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale = 1,
  rot = 0
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(scale, scale);

  ctx.fillStyle = '#1E3A8A';
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 2.5;
  fillRoundRect(ctx, -16, -2, 32, 13, 5);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#0F172A';
  ctx.beginPath();
  ctx.moveTo(0, -16);
  ctx.lineTo(28, -4);
  ctx.lineTo(0, 8);
  ctx.lineTo(-28, -4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = '#FACC15';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, -4);
  ctx.lineTo(20, 12);
  ctx.stroke();
  ctx.fillStyle = '#FACC15';
  ctx.beginPath();
  ctx.arc(20, 13, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

export function drawPencil(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rot = 0.4
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);

  // Body
  ctx.fillStyle = '#FACC15';
  ctx.strokeStyle = '#92400E';
  ctx.lineWidth = 2.5;
  fillRoundRect(ctx, -8, -22, 16, 36, 3);
  ctx.fill();
  ctx.stroke();

  // Eraser
  ctx.fillStyle = '#F472B6';
  fillRoundRect(ctx, -8, -30, 16, 10, 4);
  ctx.fill();
  ctx.stroke();

  // Tip
  ctx.fillStyle = '#FDE68A';
  ctx.beginPath();
  ctx.moveTo(-8, 14);
  ctx.lineTo(0, 28);
  ctx.lineTo(8, 14);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#1E293B';
  ctx.beginPath();
  ctx.moveTo(-3, 23);
  ctx.lineTo(0, 28);
  ctx.lineTo(3, 23);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

export function drawBook(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rot = 0
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);

  ctx.fillStyle = '#3B82F6';
  ctx.strokeStyle = '#1E3A8A';
  ctx.lineWidth = 2.8;
  fillRoundRect(ctx, -20, -24, 40, 48, 6);
  ctx.fill();
  ctx.stroke();

  // Pages edge
  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(10, -21, 7, 42);

  // Spine
  ctx.fillStyle = '#1D4ED8';
  fillRoundRect(ctx, -20, -24, 10, 48, 4);
  ctx.fill();

  // Cover star
  drawStar(ctx, -1, -2, 9, 0);

  ctx.restore();
}

export function drawApple(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rot = 0
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);

  ctx.fillStyle = '#EF4444';
  ctx.strokeStyle = '#991B1B';
  ctx.lineWidth = 2.8;
  ctx.beginPath();
  ctx.arc(-6, 2, 16, 0, Math.PI * 2);
  ctx.arc(6, 2, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Stem
  ctx.strokeStyle = '#78350F';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(0, -12);
  ctx.lineTo(2, -23);
  ctx.stroke();

  // Leaf
  ctx.fillStyle = '#22C55E';
  ctx.beginPath();
  ctx.ellipse(10, -18, 9, 5, -0.4, 0, Math.PI * 2);
  ctx.fill();

  // Highlight
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.beginPath();
  ctx.ellipse(-9, -3, 4, 7, -0.3, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

export function drawDiploma(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rot = -0.25
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);

  ctx.fillStyle = '#FEF9C3';
  ctx.strokeStyle = '#B45309';
  ctx.lineWidth = 2.8;
  fillRoundRect(ctx, -28, -12, 56, 24, 10);
  ctx.fill();
  ctx.stroke();

  // Red ribbon band
  ctx.fillStyle = '#EF4444';
  ctx.fillRect(-6, -12, 12, 24);
  ctx.beginPath();
  ctx.moveTo(-4, 12);
  ctx.lineTo(-10, 24);
  ctx.lineTo(0, 19);
  ctx.lineTo(10, 24);
  ctx.lineTo(4, 12);
  ctx.closePath();
  ctx.fill();

  // Gold seal
  ctx.fillStyle = '#FACC15';
  ctx.beginPath();
  ctx.arc(0, 0, 7, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

export function drawMedal(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale = 1,
  color: 'gold' | 'rainbow' | 'star' = 'gold'
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  // Ribbons
  ctx.fillStyle = '#EF4444';
  ctx.strokeStyle = '#991B1B';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-26, -68);
  ctx.lineTo(-4, -68);
  ctx.lineTo(6, -18);
  ctx.lineTo(-18, -18);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#2563EB';
  ctx.strokeStyle = '#1E3A8A';
  ctx.beginPath();
  ctx.moveTo(26, -68);
  ctx.lineTo(4, -68);
  ctx.lineTo(-6, -18);
  ctx.lineTo(18, -18);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Outer medal circle
  ctx.fillStyle = color === 'rainbow' ? '#F59E0B' : '#FACC15';
  ctx.strokeStyle = '#B45309';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(0, 10, 44, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Inner circle
  ctx.fillStyle = '#FEF08A';
  ctx.beginPath();
  ctx.arc(0, 10, 33, 0, Math.PI * 2);
  ctx.fill();

  // Center star
  drawStar(ctx, 0, 10, 22, 0);

  ctx.restore();
}

export function drawFlag(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  label: string,
  time: number
): void {
  ctx.save();
  ctx.translate(x, y);

  // Pole
  ctx.strokeStyle = '#F8FAFC';
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -110);
  ctx.stroke();

  // Golden ball top
  ctx.fillStyle = '#FACC15';
  ctx.beginPath();
  ctx.arc(0, -114, 8, 0, Math.PI * 2);
  ctx.fill();

  // Waving pennant
  const wave = Math.sin(time * 5) * 6;
  ctx.fillStyle = '#EF4444';
  ctx.strokeStyle = '#991B1B';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(3, -108);
  ctx.quadraticCurveTo(64, -114 + wave, 128, -94 + wave);
  ctx.lineTo(116, -78 + wave * 0.5);
  ctx.lineTo(128, -62 + wave);
  ctx.quadraticCurveTo(64, -56 + wave, 3, -64);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 18px "Fredoka", "Trebuchet MS", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, 62, -84 + wave * 0.4);

  ctx.restore();
}
