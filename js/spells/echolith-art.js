// echolith-art.js — shared ritual drawing helpers for Echolith

export function drawEcholithHalo(X, x, y, rx, ry = rx * 0.38, phase = 0, color = '#fff4b8', alpha = 0.75) {
  X.save();
  X.translate(x, y);
  X.globalAlpha = alpha;
  X.strokeStyle = color;
  X.lineWidth = 1.5;
  X.beginPath();
  X.ellipse(0, 0, rx, ry, phase * 0.12, 0, Math.PI * 2);
  X.stroke();

  X.globalAlpha = alpha * 0.45;
  X.setLineDash([5, 6]);
  X.lineDashOffset = -phase * 10;
  X.beginPath();
  X.ellipse(0, 0, rx * 1.22, ry * 1.18, -phase * 0.18, 0, Math.PI * 2);
  X.stroke();
  X.setLineDash([]);
  X.restore();
}

export function drawEcholithHorns(X, x, y, r, phase = 0, color = '#ff3328', alpha = 0.72) {
  X.save();
  X.translate(x, y);
  X.globalAlpha = alpha;
  X.strokeStyle = color;
  X.lineWidth = 1.8;
  X.lineCap = 'round';

  const curl = Math.sin(phase) * r * 0.08;
  X.beginPath();
  X.moveTo(-r * 0.18, -r * 0.12);
  X.bezierCurveTo(-r * 0.92, -r * 0.24, -r * 0.82, -r * 0.92 + curl, -r * 0.22, -r * 0.72);
  X.stroke();

  X.beginPath();
  X.moveTo(r * 0.18, -r * 0.12);
  X.bezierCurveTo(r * 0.92, -r * 0.24, r * 0.82, -r * 0.92 - curl, r * 0.22, -r * 0.72);
  X.stroke();

  X.globalAlpha = alpha * 0.58;
  X.fillStyle = color;
  X.beginPath();
  X.moveTo(0, r * 0.66);
  X.lineTo(-r * 0.18, r * 0.18);
  X.lineTo(r * 0.18, r * 0.18);
  X.closePath();
  X.fill();
  X.restore();
}

export function drawEcholithScale(X, x, y, r, phase = 0, good = '#fff2a6', evil = '#8f0713', alpha = 0.8) {
  X.save();
  X.translate(x, y);
  X.globalAlpha = alpha;
  X.lineCap = 'round';

  X.strokeStyle = good;
  X.lineWidth = 1.5;
  X.beginPath();
  X.moveTo(0, -r * 0.7);
  X.lineTo(0, r * 0.55);
  X.stroke();

  const tilt = Math.sin(phase * 0.8) * r * 0.08;
  X.beginPath();
  X.moveTo(-r * 0.7, -r * 0.26 + tilt);
  X.lineTo(r * 0.7, -r * 0.26 - tilt);
  X.stroke();

  X.strokeStyle = evil;
  X.lineWidth = 1.3;
  for (const side of [-1, 1]) {
    const px = side * r * 0.5;
    const py = -r * 0.18 - side * tilt * 0.65;
    X.beginPath();
    X.moveTo(px, py);
    X.lineTo(px - side * r * 0.15, py + r * 0.28);
    X.moveTo(px, py);
    X.lineTo(px + side * r * 0.15, py + r * 0.28);
    X.stroke();

    X.beginPath();
    X.ellipse(px, py + r * 0.33, r * 0.23, r * 0.09, 0, 0, Math.PI * 2);
    X.stroke();
  }

  X.restore();
}

export function drawEcholithStar(X, x, y, r, phase = 0, color = '#ff3328', alpha = 0.7) {
  X.save();
  X.translate(x, y);
  X.rotate(phase * 0.08 + Math.PI);
  X.globalAlpha = alpha;
  X.strokeStyle = color;
  X.lineWidth = 1.3;
  X.beginPath();
  for (let i = 0; i <= 5; i++) {
    const a = -Math.PI / 2 + (i * Math.PI * 4) / 5;
    const px = Math.cos(a) * r;
    const py = Math.sin(a) * r;
    if (i === 0) X.moveTo(px, py); else X.lineTo(px, py);
  }
  X.stroke();
  X.restore();
}

export function drawEcholithWingPair(X, x, y, r, phase = 0, color = '#fff6d6', alpha = 0.6) {
  X.save();
  X.translate(x, y);
  X.globalAlpha = alpha;
  X.strokeStyle = color;
  X.lineWidth = 1.2;
  X.lineCap = 'round';

  for (const side of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const spread = r * (0.4 + i * 0.18);
      const lift = r * (0.12 + i * 0.1) + Math.sin(phase + i) * 1.6;
      X.beginPath();
      X.moveTo(side * r * 0.16, 0);
      X.quadraticCurveTo(side * spread, -lift, side * r * (0.32 + i * 0.2), r * (0.2 + i * 0.04));
      X.stroke();
    }
  }

  X.restore();
}

export function drawEcholithSigil(X, side, x, y, r, phase, colors = {}) {
  const good = colors.good || '#fff2a6';
  const evil = colors.evil || '#8f0713';
  const core = colors.core || '#ffffff';

  if (side === 'good') {
    drawEcholithHalo(X, x, y, r, r * 0.34, phase, good, 0.72);
    drawEcholithWingPair(X, x, y + r * 0.1, r * 0.82, phase, core, 0.45);
    return;
  }

  if (side === 'evil') {
    drawEcholithHorns(X, x, y, r, phase, evil, 0.72);
    drawEcholithStar(X, x, y + r * 0.12, r * 0.48, phase, evil, 0.42);
    return;
  }

  drawEcholithScale(X, x, y, r, phase, good, evil, 0.78);
}
