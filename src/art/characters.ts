import { AnimState, CharacterId } from '../types';

export interface DrawCharacterOptions {
  id: CharacterId;
  x: number; // bottom-center x
  y: number; // bottom-center y (feet on ground)
  scale?: number;
  facing?: 1 | -1;
  anim?: AnimState;
  time?: number;
  stumble?: number; // 0..1 gentle wobble when bumping obstacle
}

function roundRectPath(
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

function drawGradCap(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  scale: number,
  tasselSwing: number
): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);

  // Cap base
  ctx.fillStyle = '#1E293B';
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 2.5;
  roundRectPath(ctx, -20, -6, 40, 14, 5);
  ctx.fill();
  ctx.stroke();

  // Mortarboard diamond top
  ctx.fillStyle = '#0F172A';
  ctx.beginPath();
  ctx.moveTo(0, -20);
  ctx.lineTo(36, -7);
  ctx.lineTo(0, 6);
  ctx.lineTo(-36, -7);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Top gold button
  ctx.fillStyle = '#FACC15';
  ctx.beginPath();
  ctx.arc(0, -7, 3.5, 0, Math.PI * 2);
  ctx.fill();

  // Tassel cord & end
  const tx = 27 + tasselSwing * 6;
  const ty = 12 + Math.abs(tasselSwing) * 2;
  ctx.strokeStyle = '#FACC15';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, -7);
  ctx.quadraticCurveTo(26, -7, tx, ty);
  ctx.stroke();

  ctx.fillStyle = '#F59E0B';
  ctx.beginPath();
  ctx.arc(tx, ty + 3, 4.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawHumanFace(
  ctx: CanvasRenderingContext2D,
  skin: string,
  cheek: string,
  anim: AnimState,
  eyeSize = 4.2,
  isMateo = false,
  time = 0
): void {
  // Ears
  ctx.fillStyle = skin;
  ctx.strokeStyle = '#33241D';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.arc(-25, 2, 6, 0, Math.PI * 2);
  ctx.arc(25, 2, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Head circle
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.ellipse(0, 0, 26, isMateo ? 24 : 25, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Rosy cheeks
  ctx.fillStyle = cheek;
  ctx.globalAlpha = 0.55;
  ctx.beginPath();
  ctx.ellipse(-14, 7, 5.5, 3.5, 0, 0, Math.PI * 2);
  ctx.ellipse(14, 7, 5.5, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Eyebrows
  ctx.strokeStyle = '#1E1B18';
  ctx.lineWidth = 2.6;
  ctx.lineCap = 'round';
  const browLift = anim === 'jump' || anim === 'celebrate' ? -2.2 : 0;
  ctx.beginPath();
  ctx.moveTo(-14, -9 + browLift);
  ctx.quadraticCurveTo(-9, -12 + browLift, -4, -9.5 + browLift);
  ctx.moveTo(4, -9.5 + browLift);
  ctx.quadraticCurveTo(9, -12 + browLift, 14, -9 + browLift);
  ctx.stroke();

  // Eyes (with periodic natural blinking!)
  const blinkPhase = (time * 1.0 + (isMateo ? 1.4 : 0)) % 3.4;
  const isBlinking = blinkPhase > 3.24 && anim !== 'celebrate';

  if (anim === 'celebrate') {
    // Happy curved eyes ^ ^
    ctx.strokeStyle = '#1E1B18';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(-9, -1, 5, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(9, -1, 5, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
  } else if (isBlinking) {
    ctx.strokeStyle = '#1E1B18';
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.moveTo(-13, -1);
    ctx.lineTo(-5, -1);
    ctx.moveTo(5, -1);
    ctx.lineTo(13, -1);
    ctx.stroke();
  } else {
    ctx.fillStyle = '#1E1B18';
    ctx.beginPath();
    ctx.arc(-9, -1, eyeSize, 0, Math.PI * 2);
    ctx.arc(9, -1, eyeSize, 0, Math.PI * 2);
    ctx.fill();

    // Eye highlights
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(-7.5, -2.5, 1.7, 0, Math.PI * 2);
    ctx.arc(10.5, -2.5, 1.7, 0, Math.PI * 2);
    ctx.fill();
  }

  // Cute nose
  ctx.fillStyle = '#D99372';
  ctx.beginPath();
  ctx.arc(1, 4, 2.2, 0, Math.PI * 2);
  ctx.fill();

  // Smile
  ctx.strokeStyle = '#33241D';
  ctx.lineWidth = 2.6;
  ctx.lineCap = 'round';
  if (anim === 'celebrate' || anim === 'jump') {
    ctx.fillStyle = '#EF4444';
    ctx.beginPath();
    ctx.arc(0, 9, 8.5, 0, Math.PI);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(0, 8.5, 7.5, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
  }
}

export function drawCharacter(
  ctx: CanvasRenderingContext2D,
  opts: DrawCharacterOptions
): void {
  const {
    id,
    x,
    y,
    scale = 1,
    facing = 1,
    anim = 'idle',
    time = 0,
    stumble = 0,
  } = opts;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale * facing, scale);

  // Subtle flat ground shadow
  ctx.fillStyle = 'rgba(15, 23, 42, 0.18)';
  ctx.beginPath();
  const shadowScale = anim === 'jump' ? 0.72 : 1;
  ctx.ellipse(0, -2, 26 * shadowScale, 6 * shadowScale, 0, 0, Math.PI * 2);
  ctx.fill();

  // Animation kinematics
  const runCycle = time * 12;
  const idleBob = anim === 'idle' ? Math.sin(time * 3.2) * 2.5 : 0;
  const runBob = anim === 'run' ? Math.abs(Math.sin(runCycle)) * -6 : 0;
  const celebrateJump =
    anim === 'celebrate' ? Math.abs(Math.sin(time * 7)) * -14 : 0;
  const bodyBob = idleBob + runBob + celebrateJump;

  const legSwing =
    anim === 'run'
      ? Math.sin(runCycle) * 0.65
      : anim === 'jump'
      ? 0.45
      : anim === 'celebrate'
      ? Math.sin(time * 7) * 0.2
      : 0;

  const armSwing =
    anim === 'run'
      ? -Math.sin(runCycle) * 0.7
      : anim === 'jump'
      ? -1.1
      : anim === 'celebrate'
      ? -2.5 + Math.sin(time * 12) * 0.25
      : Math.sin(time * 3.2) * 0.08;

  const lean =
    anim === 'run'
      ? 0.08
      : stumble > 0
      ? Math.sin(stumble * Math.PI * 4) * 0.22
      : 0;

  // Cute cartoon dust puffs behind feet while running!
  if (anim === 'run') {
    const puffPhase = (time * 6) % 1;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.beginPath();
    ctx.arc(-20 - puffPhase * 22, -6 - puffPhase * 8, 7 * (1 - puffPhase * 0.6), 0, Math.PI * 2);
    ctx.arc(-30 - puffPhase * 18, -3 - puffPhase * 5, 5 * (1 - puffPhase * 0.6), 0, Math.PI * 2);
    ctx.fill();
  }

  // Cartoon squash & stretch
  let sx = 1;
  let sy = 1;
  if (anim === 'jump') {
    sx = 0.92;
    sy = 1.09;
  } else if (anim === 'celebrate') {
    const bounce = Math.abs(Math.sin(time * 7));
    sx = 1 + (0.5 - bounce) * 0.1;
    sy = 1 + (bounce - 0.5) * 0.12;
  }

  ctx.translate(0, bodyBob);
  ctx.scale(sx, sy);
  ctx.rotate(lean);

  if (id === 'dino') {
    drawDino(ctx, anim, time, legSwing, armSwing);
    ctx.restore();
    return;
  }

  // Cape behind superhero
  if (id === 'hero') {
    const capeWave =
      Math.sin(time * (anim === 'run' ? 14 : 5)) * (anim === 'run' ? 12 : 5);
    ctx.fillStyle = '#EF4444';
    ctx.strokeStyle = '#991B1B';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(-12, -62);
    ctx.quadraticCurveTo(-34, -40, -38 - capeWave * 0.5, -14 + capeWave * 0.3);
    ctx.lineTo(-10, -20);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // Jetpack behind astronaut
  if (id === 'astro') {
    ctx.fillStyle = '#CBD5E1';
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2.5;
    roundRectPath(ctx, -28, -62, 16, 30, 6);
    ctx.fill();
    ctx.stroke();

    if (anim === 'jump' || anim === 'celebrate') {
      ctx.fillStyle = '#F97316';
      ctx.beginPath();
      ctx.moveTo(-25, -32);
      ctx.lineTo(-20, -16 - Math.sin(time * 24) * 4);
      ctx.lineTo(-15, -32);
      ctx.closePath();
      ctx.fill();
    }
  }

  // Backpack behind Mateo
  if (id === 'mateo') {
    ctx.fillStyle = '#F59E0B';
    ctx.strokeStyle = '#92400E';
    ctx.lineWidth = 2.5;
    roundRectPath(ctx, -26, -60, 14, 26, 6);
    ctx.fill();
    ctx.stroke();
  }

  // Outfit palette per character
  const palette = getPalette(id);

  // Back leg
  drawLimb(ctx, -8, -28, 10, 22, -legSwing, palette.pants, palette.shoe);
  // Front leg
  drawLimb(ctx, 8, -28, 10, 22, legSwing, palette.pants, palette.shoe);

  // Back arm
  drawArm(ctx, -16, -58, -armSwing, palette.sleeve, palette.hand);

  // Torso
  ctx.lineWidth = 2.6;
  ctx.strokeStyle = palette.outline;
  ctx.fillStyle = palette.torso;
  if (id === 'carlos') {
    // Graduation gown (trapezoid)
    ctx.beginPath();
    ctx.moveTo(-17, -64);
    ctx.lineTo(17, -64);
    ctx.lineTo(23, -22);
    ctx.lineTo(-23, -22);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Gold graduation stole (V-shape)
    ctx.fillStyle = '#FACC15';
    ctx.beginPath();
    ctx.moveTo(-13, -64);
    ctx.lineTo(-5, -64);
    ctx.lineTo(-2, -32);
    ctx.lineTo(-10, -32);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(13, -64);
    ctx.lineTo(5, -64);
    ctx.lineTo(2, -32);
    ctx.lineTo(10, -32);
    ctx.closePath();
    ctx.fill();

    // Cute pink bowtie nod to Carlos's photo!
    ctx.fillStyle = '#F472B6';
    ctx.beginPath();
    ctx.moveTo(0, -60);
    ctx.lineTo(-7, -64);
    ctx.lineTo(-7, -56);
    ctx.closePath();
    ctx.moveTo(0, -60);
    ctx.lineTo(7, -64);
    ctx.lineTo(7, -56);
    ctx.closePath();
    ctx.fill();
  } else {
    roundRectPath(ctx, -18, -64, 36, 38, 10);
    ctx.fill();
    ctx.stroke();

    if (id === 'mateo') {
      // Colorful adventurer stripes + yellow backpack straps
      ctx.fillStyle = '#F97316';
      ctx.fillRect(-16, -51, 32, 7);
      ctx.fillStyle = '#FACC15';
      ctx.fillRect(-13, -63, 5, 36);
      ctx.fillRect(8, -63, 5, 36);
    } else if (id === 'pilot') {
      // Racing stripes + checkered belt
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(-5, -63, 10, 36);
      ctx.fillStyle = '#1E293B';
      ctx.fillRect(-17, -34, 34, 6);
      ctx.fillStyle = '#FFFFFF';
      for (let i = -14; i < 14; i += 8) {
        ctx.fillRect(i, -34, 4, 3);
        ctx.fillRect(i + 4, -31, 4, 3);
      }
    } else if (id === 'hero') {
      // Gold belt + star chest emblem
      ctx.fillStyle = '#FACC15';
      ctx.fillRect(-17, -35, 34, 6);
      drawMiniStar(ctx, 0, -49, 9, '#FACC15');
    } else if (id === 'astro') {
      // Mission control chest panel
      ctx.fillStyle = '#38BDF8';
      roundRectPath(ctx, -10, -56, 20, 14, 4);
      ctx.fill();
      ctx.fillStyle = '#FACC15';
      ctx.beginPath();
      ctx.arc(-4, -49, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#EF4444';
      ctx.beginPath();
      ctx.arc(4, -49, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Front arm
  drawArm(ctx, 16, -58, armSwing, palette.sleeve, palette.hand);

  // Head
  ctx.save();
  ctx.translate(0, -86);
  const tasselSwing = Math.sin(time * (anim === 'run' ? 12 : 4));

  if (id === 'carlos') {
    drawHumanFace(ctx, '#E8B088', '#F29A8E', anim, 4.1, false, time);
    // Carlos's neat short black hair
    ctx.fillStyle = '#18181B';
    ctx.beginPath();
    ctx.arc(0, -4, 26.5, Math.PI * 1.05, Math.PI * 1.95);
    ctx.quadraticCurveTo(10, -14, -14, -15);
    ctx.quadraticCurveTo(-22, -14, -25, -4);
    ctx.closePath();
    ctx.fill();
    // Graduation cap!
    drawGradCap(ctx, 0, -24, 1.05, tasselSwing);
  } else if (id === 'mateo') {
    drawHumanFace(ctx, '#F3C29F', '#F7A69C', anim, 4.5, true, time);
    // Mateo's cute dark hair with slightly wavy/fluffy top
    ctx.fillStyle = '#1F1B18';
    ctx.beginPath();
    ctx.arc(0, -5, 26, Math.PI * 1.05, Math.PI * 1.95);
    ctx.quadraticCurveTo(16, -15, 6, -14);
    ctx.quadraticCurveTo(-2, -18, -12, -13);
    ctx.quadraticCurveTo(-21, -13, -25, -4);
    ctx.closePath();
    ctx.fill();
    // Cute little tuft
    ctx.beginPath();
    ctx.arc(-5, -24, 6, 0, Math.PI * 2);
    ctx.arc(5, -25, 5.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (id === 'pilot') {
    // Racing helmet
    ctx.fillStyle = '#EF4444';
    ctx.strokeStyle = '#991B1B';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.arc(0, 0, 27, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // White racing stripe
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(-5, -26, 10, 14);
    // Visor
    ctx.fillStyle = '#1E293B';
    roundRectPath(ctx, -18, -10, 38, 17, 8);
    ctx.fill();
    ctx.fillStyle = '#38BDF8';
    roundRectPath(ctx, -12, -7, 26, 6, 3);
    ctx.fill();
  } else if (id === 'hero') {
    drawHumanFace(ctx, '#F3C29F', '#F7A69C', anim, 4.1, false);
    // Spiky hero hair
    ctx.fillStyle = '#1E293B';
    ctx.beginPath();
    ctx.moveTo(-25, -6);
    ctx.lineTo(-18, -28);
    ctx.lineTo(-6, -22);
    ctx.lineTo(4, -31);
    ctx.lineTo(14, -22);
    ctx.lineTo(25, -10);
    ctx.quadraticCurveTo(0, -16, -25, -6);
    ctx.closePath();
    ctx.fill();
    // Red superhero mask
    ctx.fillStyle = '#EF4444';
    roundRectPath(ctx, -23, -8, 46, 12, 6);
    ctx.fill();
    // White eye holes
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.ellipse(-9, -2, 5.5, 4, 0, 0, Math.PI * 2);
    ctx.ellipse(9, -2, 5.5, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.arc(-8, -2, 2.5, 0, Math.PI * 2);
    ctx.arc(10, -2, 2.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (id === 'astro') {
    // Antenna
    ctx.strokeStyle = '#64748B';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -26);
    ctx.lineTo(0, -37);
    ctx.stroke();
    ctx.fillStyle = '#FACC15';
    ctx.beginPath();
    ctx.arc(0, -39, 4.5, 0, Math.PI * 2);
    ctx.fill();
    // Helmet shell
    ctx.fillStyle = '#F8FAFC';
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.arc(0, 0, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Visor
    ctx.fillStyle = '#0EA5E9';
    ctx.beginPath();
    ctx.ellipse(2, 1, 20, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    // Visor shine
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.beginPath();
    ctx.ellipse(-4, -5, 8, 4.5, -0.4, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
  ctx.restore();
}

function drawDino(
  ctx: CanvasRenderingContext2D,
  anim: AnimState,
  time: number,
  legSwing: number,
  armSwing: number
): void {
  const green = '#22C55E';
  const darkGreen = '#15803D';
  const belly = '#FEF08A';

  // Wagging tail
  const tailWag = Math.sin(time * 8) * 5;
  ctx.fillStyle = green;
  ctx.strokeStyle = darkGreen;
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(-14, -32);
  ctx.quadraticCurveTo(-38, -28 + tailWag, -44, -44 + tailWag);
  ctx.quadraticCurveTo(-28, -46, -12, -46);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Back spikes
  ctx.fillStyle = '#F59E0B';
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(-20, -64 + i * 11, 4.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Legs
  drawLimb(ctx, -9, -26, 12, 20, -legSwing, green, darkGreen);
  drawLimb(ctx, 9, -26, 12, 20, legSwing, green, darkGreen);

  // Plump body
  ctx.fillStyle = green;
  ctx.strokeStyle = darkGreen;
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.ellipse(0, -45, 22, 25, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Yellow belly
  ctx.fillStyle = belly;
  ctx.beginPath();
  ctx.ellipse(6, -44, 13, 17, 0, 0, Math.PI * 2);
  ctx.fill();

  // Cute tiny dino arms
  drawArm(ctx, 14, -52, armSwing * 0.7, green, green);

  // Dino head
  ctx.save();
  ctx.translate(4, -82);
  ctx.fillStyle = green;
  ctx.strokeStyle = darkGreen;
  ctx.lineWidth = 2.6;
  roundRectPath(ctx, -22, -20, 48, 34, 15);
  ctx.fill();
  ctx.stroke();

  // Friendly eye
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(4, -6, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0F172A';
  ctx.beginPath();
  ctx.arc(6, -6, 3.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(7.5, -7.5, 1.5, 0, Math.PI * 2);
  ctx.fill();

  // Nostril
  ctx.fillStyle = darkGreen;
  ctx.beginPath();
  ctx.arc(19, -5, 2, 0, Math.PI * 2);
  ctx.fill();

  // Happy dino smile
  ctx.strokeStyle = darkGreen;
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.arc(11, 3, 9, 0.1 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();

  // Graduation cap on Dino!
  const tasselSwing = Math.sin(time * (anim === 'run' ? 12 : 4));
  drawGradCap(ctx, -2, -20, 0.95, tasselSwing);

  ctx.restore();
}

function drawLimb(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  w: number,
  h: number,
  angle: number,
  color: string,
  shoeColor: string
): void {
  ctx.save();
  ctx.translate(ox, oy);
  ctx.rotate(angle);
  ctx.fillStyle = color;
  ctx.strokeStyle = '#1E293B';
  ctx.lineWidth = 2.4;
  roundRectPath(ctx, -w / 2, 0, w, h, 5);
  ctx.fill();
  ctx.stroke();

  // Shoe
  ctx.fillStyle = shoeColor;
  roundRectPath(ctx, -w / 2 - 2, h - 5, w + 8, 9, 4.5);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawArm(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  angle: number,
  sleeveColor: string,
  handColor: string
): void {
  ctx.save();
  ctx.translate(ox, oy);
  ctx.rotate(angle);
  ctx.fillStyle = sleeveColor;
  ctx.strokeStyle = '#1E293B';
  ctx.lineWidth = 2.4;
  roundRectPath(ctx, -5, 0, 10, 22, 5);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = handColor;
  ctx.beginPath();
  ctx.arc(0, 23, 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawMiniStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  color: string
): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.45;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const px = cx + Math.cos(a) * rad;
    const py = cy + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

function getPalette(id: CharacterId) {
  switch (id) {
    case 'carlos':
      return {
        torso: '#1E293B',
        sleeve: '#1E293B',
        pants: '#0F172A',
        shoe: '#111827',
        hand: '#E8B088',
        outline: '#0F172A',
      };
    case 'mateo':
      return {
        torso: '#06B6D4',
        sleeve: '#06B6D4',
        pants: '#D6B588',
        shoe: '#EF4444',
        hand: '#F3C29F',
        outline: '#0E7490',
      };
    case 'pilot':
      return {
        torso: '#EF4444',
        sleeve: '#DC2626',
        pants: '#B91C1C',
        shoe: '#1E293B',
        hand: '#1E293B',
        outline: '#7F1D1D',
      };
    case 'hero':
      return {
        torso: '#2563EB',
        sleeve: '#1D4ED8',
        pants: '#1E40AF',
        shoe: '#EF4444',
        hand: '#F3C29F',
        outline: '#1E3A8A',
      };
    case 'astro':
      return {
        torso: '#F8FAFC',
        sleeve: '#E2E8F0',
        pants: '#CBD5E1',
        shoe: '#7C3AED',
        hand: '#7C3AED',
        outline: '#334155',
      };
    default:
      return {
        torso: '#22C55E',
        sleeve: '#22C55E',
        pants: '#22C55E',
        shoe: '#15803D',
        hand: '#22C55E',
        outline: '#15803D',
      };
  }
}
