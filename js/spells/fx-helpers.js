// fx-helpers.js — helpers visuais e de terreno compartilhados pelo revamp
// das escolas elementais (Nature/Wind/Earth/Water/Ice/Fire).
import { state, H } from '../core/state.js?v=7';

/**
 * Y da superfície sob o ponto clicado: topo da plataforma que contém x e
 * está abaixo (ou na altura) de y; senão, o chão da arena.
 */
export function surfaceYAt(x, y) {
  let gy = H - 20;
  for (const p of state.platforms) {
    if (x > p.x && x < p.x + p.w && p.y >= y - 6) gy = Math.min(gy, p.y);
  }
  return gy;
}

export function glowFX(X, x, y, r, c1, c2, alpha = 1) {
  X.save();
  X.globalCompositeOperation = 'lighter';
  const g = X.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, c1); g.addColorStop(0.5, c2); g.addColorStop(1, 'transparent');
  X.fillStyle = g; X.globalAlpha = alpha;
  X.beginPath(); X.arc(x, y, r, 0, Math.PI * 2); X.fill();
  X.restore(); X.globalAlpha = 1;
}

export function beamFX(X, x1, y1, x2, y2, w, c1, c2, alpha = 1) {
  X.save();
  X.globalCompositeOperation = 'lighter';
  const g = X.createLinearGradient(x1, y1, x2, y2);
  g.addColorStop(0, c1); g.addColorStop(.5, c2); g.addColorStop(1, 'transparent');
  X.strokeStyle = g; X.lineWidth = w; X.lineCap = 'round'; X.globalAlpha = alpha;
  X.beginPath(); X.moveTo(x1, y1); X.lineTo(x2, y2); X.stroke();
  X.restore(); X.globalAlpha = 1;
}

/** Losango facetado (cristal/folha/lasca) com gradiente vertical. */
export function shardFX(X, x, y, len, rot, c1, c2, alpha = 1, wRatio = .28) {
  X.save();
  X.translate(x, y); X.rotate(rot); X.globalAlpha = alpha;
  const g = X.createLinearGradient(0, -len, 0, len * .4);
  g.addColorStop(0, '#ffffff'); g.addColorStop(.4, c1); g.addColorStop(1, c2);
  X.fillStyle = g;
  X.beginPath();
  X.moveTo(0, -len); X.lineTo(len * wRatio, 0); X.lineTo(0, len * .4); X.lineTo(-len * wRatio, 0);
  X.closePath(); X.fill();
  X.strokeStyle = 'rgba(255,255,255,.5)'; X.lineWidth = .7;
  X.beginPath(); X.moveTo(0, -len); X.lineTo(0, len * .4); X.stroke();
  X.restore(); X.globalAlpha = 1;
}

export function puffFX(x, y, n, col, spread = 2.2, type = 'smoke') {
  for (let i = 0; i < n; i++) {
    state.particles.push({
      x: x + (Math.random() - .5) * 6, y: y + (Math.random() - .5) * 4,
      vx: (Math.random() - .5) * spread, vy: -Math.random() * 1.6 - .2,
      life: 24 + Math.random() * 18 | 0, ml: 42,
      color: col, size: 1.4 + Math.random() * 2.2,
      grav: -.012, type,
    });
  }
}
