// ═══════════════════════════════════════════════════════════════════════════
// allies.js — Sistema GLOBAL de aliados invocados
//
// Qualquer escola pode transformar uma invocação numa entidade-aliada que:
//   • os inimigos enxergam como ameaça e podem agredir/matar;
//   • NÃO sofre fogo amigo (projéteis/explosões do jogador a ignoram);
//   • tem HP proporcional ao custo de mana do feitiço (vida = mana * hpScale).
//
// Funções são PURAS (não tocam em state) para serem seguras de importar em
// qualquer módulo. Quem cria empurra o objeto no seu próprio state.entities
// (instância viva) e dirige a posição pela VFX dona da invocação.
// ═══════════════════════════════════════════════════════════════════════════

export const ALLY_HP_SCALE = 2; // vida = round(mana * ALLY_HP_SCALE)

export function isAllyEntity(entity) {
  return !!entity && entity.active === true && entity.targetable === 'ally';
}

// Cria o corpo/hitbox de uma invocação aliada. Retorna o objeto-entidade;
// o chamador é responsável por empurrá-lo em state.entities e sincronizar x/y.
export function createAlly({
  x = 0,
  y = 0,
  w = 16,
  h = 34,
  mana = 30,
  threat = 40,
  type = 'allySummon',
  hpScale = ALLY_HP_SCALE,
  color = '#ffffff',
  c2 = '#ffffff',
} = {}) {
  const hp = Math.max(1, Math.round(mana * hpScale));
  return {
    x, y, w, h,
    vx: 0, vy: 0,
    active: true,
    age: 0,
    targetable: 'ally',
    team: 'player',
    summon: true,
    type,
    hp,
    maxHp: hp,
    mass: 1,
    hitF: 0,
    threat,
    color,
    c2,
  };
}
