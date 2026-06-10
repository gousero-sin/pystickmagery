// Shared projectile model used by friendly and hostile shots.

export const PROJECTILE_TEAM = Object.freeze({
  PLAYER: 'player',
  ENEMY: 'enemy',
  NEUTRAL: 'neutral',
});

const PROJECTILE_CLASS = 'GameProjectile';

function numberOr(value, fallback) {
  return Number.isFinite(value) ? value : fallback;
}

function firstString(...values) {
  return values.find((value) => typeof value === 'string' && value.length > 0);
}

function trailNameFrom(source = {}, fallback = {}) {
  return firstString(
    source.trailKind,
    source.trailType,
    source.spell?.trail,
    fallback.trail,
    source.kind,
    'none',
  );
}

export function createProjectileSpell(source = {}, fallback = {}) {
  const speed = Math.hypot(source.vx || 0, source.vy || 0);
  const color = firstString(source.color, source.spell?.color, fallback.color, '#ffffff');
  const c2 = firstString(source.c2, source.spell?.c2, fallback.c2, color);
  const core = firstString(source.core, source.spell?.core, fallback.core, c2);
  const kindName = source.kind ? `${source.kind[0].toUpperCase()}${source.kind.slice(1)} Projectile` : 'Projectile';

  return {
    name: firstString(source.name, source.spell?.name, fallback.name, kindName),
    color,
    c2,
    core,
    speed,
    dmg: numberOr(source.dmg, numberOr(source.spell?.dmg, numberOr(fallback.dmg, 0))),
    mana: 0,
    cd: 0,
    r: numberOr(source.r, numberOr(source.spell?.r, numberOr(fallback.r, 3))),
    grav: numberOr(source.grav, numberOr(source.spell?.grav, numberOr(fallback.grav, 0))),
    drag: numberOr(source.drag, numberOr(source.spell?.drag, numberOr(fallback.drag, 1))),
    bounce: numberOr(source.bounce, numberOr(source.bounces, numberOr(source.spell?.bounce, numberOr(fallback.bounce, 0)))),
    exR: numberOr(source.exR, numberOr(source.spell?.exR, numberOr(fallback.exR, 0))),
    exF: numberOr(source.exF, numberOr(source.spell?.exF, numberOr(fallback.exF, 0))),
    trail: trailNameFrom(source, fallback),
    _generatedProjectileSpell: true,
  };
}

export class GameProjectile {
  constructor(input = {}) {
    Object.assign(this, input);

    const spell = input.spell || createProjectileSpell(input);
    const team = firstString(input.team, input.ownerTeam) || (input.hostile ? PROJECTILE_TEAM.ENEMY : PROJECTILE_TEAM.PLAYER);

    this._projectileClass = PROJECTILE_CLASS;
    this.team = team;
    this.owner = firstString(input.owner, team);
    this.hostile = input.hostile ?? team === PROJECTILE_TEAM.ENEMY;
    this.spell = spell;
    this.kind = firstString(input.kind, team === PROJECTILE_TEAM.ENEMY ? 'enemy' : 'spell');

    this.x = numberOr(input.x, 0);
    this.y = numberOr(input.y, 0);
    this.vx = numberOr(input.vx, 0);
    this.vy = numberOr(input.vy, 0);
    this.r = numberOr(input.r, numberOr(spell.r, 3));
    this.dmg = numberOr(input.dmg, numberOr(spell.dmg, 0));
    this.color = firstString(input.color, spell.color, '#ffffff');
    this.c2 = firstString(input.c2, spell.c2, this.color);
    this.core = firstString(input.core, spell.core, this.c2);
    this.life = numberOr(input.life, 120);
    this.age = numberOr(input.age, 0);
    this.trail = Array.isArray(input.trail) ? input.trail : [];
    this.hitList = Array.isArray(input.hitList) ? input.hitList : [];
    this.bounces = numberOr(input.bounces, numberOr(spell.bounce, 0));
    this.chains = numberOr(input.chains, numberOr(spell.chain, 0));
    this.growR = numberOr(input.growR, numberOr(spell.r, this.r));
    this.growDmg = numberOr(input.growDmg, numberOr(spell.dmg, this.dmg));
  }
}

export function isGameProjectile(projectile) {
  return projectile?._projectileClass === PROJECTILE_CLASS;
}

export function createPlayerProjectile(input = {}) {
  return new GameProjectile({
    team: PROJECTILE_TEAM.PLAYER,
    owner: PROJECTILE_TEAM.PLAYER,
    hostile: false,
    ...input,
  });
}

export function createEnemyProjectile(input = {}) {
  return new GameProjectile({
    team: PROJECTILE_TEAM.ENEMY,
    owner: PROJECTILE_TEAM.ENEMY,
    hostile: true,
    spell: input.spell || createProjectileSpell(input, { name: 'Enemy Projectile' }),
    ...input,
  });
}

export function normalizeProjectile(input = {}, defaults = {}) {
  if (isGameProjectile(input)) return input;
  return new GameProjectile({ ...defaults, ...input });
}

export function normalizePlayerProjectile(input = {}) {
  return normalizeProjectile(input, {
    team: PROJECTILE_TEAM.PLAYER,
    owner: PROJECTILE_TEAM.PLAYER,
    hostile: false,
  });
}

export function normalizeEnemyProjectile(input = {}) {
  return normalizeProjectile(input, {
    team: PROJECTILE_TEAM.ENEMY,
    owner: PROJECTILE_TEAM.ENEMY,
    hostile: true,
    spell: input.spell || createProjectileSpell(input, { name: 'Enemy Projectile' }),
  });
}

export function asPlayerProjectile(input = {}, overrides = {}) {
  return new GameProjectile({
    ...input,
    ...overrides,
    team: PROJECTILE_TEAM.PLAYER,
    owner: PROJECTILE_TEAM.PLAYER,
    hostile: false,
    reflected: false,
  });
}
