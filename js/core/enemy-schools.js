// enemy-schools.js — enemy school spellbooks derived from the central registry

const LEGACY_ALIASES = Object.freeze({
  fireMage: 'Fire',
  iceMage: 'Water',
});

const DEFAULT_ENEMY_HP = 86;

const UNIQUE_ENEMY_BLUEPRINTS = Object.freeze([
  {
    uniqueName: 'Ember Duelist',
    archetype: 'duelist',
    schoolName: 'Fire',
    icon: '🗡️',
    color: '#ff5a22',
    hp: 118,
    preferredRange: 92,
    aggression: 1.42,
    spells: [
      {
        name: 'Duelist Ember Thrust',
        basedOn: 'Fireball',
        color: '#ff4a1d',
        c2: '#ffb84f',
        core: '#fff3c2',
        speed: 7.2,
        dmg: 17,
        r: 4,
        grav: 0.04,
        drag: 0.998,
        life: 118,
        enemySpread: 0.04,
        desc: 'Signature close-range ember lance',
      },
      {
        name: 'Ash Feint',
        basedOn: 'Fireball',
        color: '#d74318',
        c2: '#ff9150',
        core: '#ffe1aa',
        speed: 5.4,
        dmg: 10,
        r: 5,
        grav: 0,
        drag: 0.995,
        life: 130,
        desc: 'A deceptive cinder shot that pressures dodges',
      },
    ],
  },
  {
    uniqueName: 'Rime Warden',
    archetype: 'warden',
    schoolName: 'Water',
    icon: '🛡️',
    color: '#7fd8ff',
    hp: 132,
    preferredRange: 178,
    aggression: 0.92,
    spells: [
      {
        name: 'Rime Lock',
        basedOn: 'Chain Frost',
        color: '#88eeff',
        c2: '#dffcff',
        core: '#ffffff',
        speed: 4.8,
        dmg: 12,
        r: 5,
        grav: 0.02,
        drag: 0.997,
        life: 170,
        desc: 'Warden frost bolt tuned to pin movement',
      },
      {
        name: 'Shard Rebuke',
        basedOn: 'Ice Lance',
        color: '#b8f4ff',
        c2: '#ffffff',
        core: '#ffffff',
        speed: 6.1,
        dmg: 14,
        r: 4,
        grav: 0,
        drag: 0.999,
        life: 145,
        desc: 'Fast retaliatory ice shard',
      },
    ],
  },
  {
    uniqueName: 'Storm Pylonist',
    archetype: 'artillery',
    schoolName: 'Lightning',
    icon: '📡',
    color: '#ffcc00',
    hp: 104,
    preferredRange: 224,
    aggression: 1.06,
    spells: [
      {
        name: 'Forked Pylon Bolt',
        basedOn: 'Spark Bolt',
        color: '#ffd84a',
        c2: '#ffffff',
        core: '#ffffff',
        speed: 6.4,
        dmg: 9,
        r: 3,
        grav: 0,
        drag: 1,
        life: 132,
        enemyProjectileCount: 3,
        enemySpread: 0.16,
        desc: 'Three-pronged pylon discharge',
      },
    ],
  },
  {
    uniqueName: 'Null Anchorite',
    archetype: 'controller',
    schoolName: 'Void',
    icon: '⚓',
    color: '#8f4dff',
    hp: 112,
    preferredRange: 164,
    aggression: 1.02,
    spells: [
      {
        name: 'Null Pin',
        basedOn: 'Gravity Well',
        color: '#5522aa',
        c2: '#9e66ff',
        core: '#eee1ff',
        speed: 4.35,
        dmg: 15,
        r: 6,
        grav: -0.01,
        drag: 0.996,
        life: 170,
        desc: 'Dense void pin that tugs the fight inward',
      },
      {
        name: 'Event-Horizon Needle',
        basedOn: 'Void Bolt',
        color: '#260047',
        c2: '#7722cc',
        core: '#f3ddff',
        speed: 7,
        dmg: 11,
        r: 3,
        grav: 0,
        drag: 1,
        life: 118,
        desc: 'Thin dark line fired from the anchor',
      },
    ],
  },
  {
    uniqueName: 'Briar Caller',
    archetype: 'summoner',
    schoolName: 'Nature',
    icon: '🌱',
    color: '#5bcf62',
    hp: 96,
    preferredRange: 190,
    aggression: 0.86,
    spells: [
      {
        name: 'Briar Sprite',
        basedOn: 'Forest Guardian',
        category: 'Summon',
        color: '#45aa42',
        c2: '#9be47a',
        core: '#edffd1',
        speed: 0,
        dmg: 8,
        mana: 24,
        r: 0,
        grav: 0,
        drag: 1,
        summonDur: 300,
        desc: 'Calls a short-lived thorn helper',
      },
      {
        name: 'Seed Needle',
        basedOn: 'Seed Shot',
        color: '#70c94f',
        c2: '#d4f7a3',
        core: '#ffffff',
        speed: 5.8,
        dmg: 10,
        r: 4,
        grav: 0.05,
        drag: 0.998,
        life: 145,
        enemyProjectileCount: 2,
        enemySpread: 0.09,
        desc: 'Paired seed darts from the caller staff',
      },
    ],
  },
]);

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function slugifySchoolName(name = '') {
  return String(name)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function getEnemySpellCategory(spell = {}) {
  if (spell.category) return spell.category;
  return /\(ultimate\)|\bultimate\b/i.test(spell.desc || '') ? 'Ultimate' : 'Common';
}

export function isEnemyUltimateSpell(spell = {}) {
  const category = getEnemySpellCategory(spell);
  return /ultimate/i.test(category) || /\(ultimate\)|\bultimate\b/i.test(spell.desc || '');
}

export function getEnemyCastMode(spell = {}) {
  const category = getEnemySpellCategory(spell);
  if (spell.enemyCastUnsupported) return 'unsupported';
  if (category === 'Summon') return 'summon';
  if (spell.speed > 0) return 'projectile';
  if ((spell.dmg || spell.exR || spell.exF) && !/dash|teleport|toggle|riposte/i.test(category)) {
    return 'projectile';
  }
  return 'unsupported';
}

function getSchoolOffset(schoolName, registry) {
  let offset = 0;
  for (const school of registry.SCHOOL_INFO || []) {
    if (school.name === schoolName) return { school, offset };
    offset += school.count;
  }
  return null;
}

export function buildEnemySpellbook(schoolName, registry) {
  const found = getSchoolOffset(schoolName, registry);
  if (!found) return [];
  const spells = (registry.SPELL_DEFS || []).slice(found.offset, found.offset + found.school.count);
  return spells
    .filter((spell) => !isEnemyUltimateSpell(spell))
    .map((spell, idx) => ({
      ...spell,
      enemySchool: found.school.name,
      enemySchoolIndex: idx,
      enemyCastMode: getEnemyCastMode(spell),
    }));
}

function findBaseSpell(schoolName, spellName, registry) {
  if (!spellName) return null;
  return buildEnemySpellbook(schoolName, registry).find((spell) => spell.name === spellName) || null;
}

function createUniqueSpell(spell, enemy, registry) {
  const baseSpell = findBaseSpell(enemy.schoolName, spell.basedOn, registry) || {};
  const category = spell.category || getEnemySpellCategory(baseSpell);
  const merged = {
    ...baseSpell,
    ...spell,
    category,
    enemySchool: enemy.schoolName,
    enemyUnique: enemy.uniqueName,
    enemyArchetype: enemy.archetype,
  };
  return {
    ...merged,
    enemyCastMode: getEnemyCastMode(merged),
  };
}

function enemyVisualForSchool(school) {
  const slug = slugifySchoolName(school.name);
  return {
    type: `schoolMage:${slug}`,
    enemyKind: slug,
    schoolName: school.name,
    schoolIcon: school.icon,
    color: school.color,
    robe: school.color,
    robeHi: school.color,
    glow: school.color,
    targetable: 'enemy',
  };
}

export function buildEnemySchoolTypes(registry) {
  const result = {};
  for (const school of registry.SCHOOL_INFO || []) {
    const spellbook = buildEnemySpellbook(school.name, registry);
    const visual = enemyVisualForSchool(school);
    const hp = DEFAULT_ENEMY_HP + clamp(spellbook.length, 0, 14);
    result[school.name] = {
      ...visual,
      hp,
      maxHp: hp,
      spellbook,
      preferredRange: spellbook.some((spell) => spell.speed > 0) ? 170 : 130,
      aggression: school.name === 'Fire' ? 1.22 : school.name === 'Void' ? 1.08 : 0.98,
    };
  }
  return result;
}

export function buildUniqueEnemyTypes(registry) {
  const result = {};
  for (const blueprint of UNIQUE_ENEMY_BLUEPRINTS) {
    const slug = slugifySchoolName(blueprint.uniqueName);
    const spellbook = blueprint.spells
      .map((spell) => createUniqueSpell(spell, blueprint, registry))
      .filter((spell) => !isEnemyUltimateSpell(spell));
    result[blueprint.uniqueName] = {
      type: `uniqueEnemy:${slug}`,
      enemyKind: slug,
      targetable: 'enemy',
      schoolName: blueprint.schoolName,
      uniqueName: blueprint.uniqueName,
      archetype: blueprint.archetype,
      schoolIcon: blueprint.icon,
      color: blueprint.color,
      robe: blueprint.color,
      robeHi: blueprint.color,
      glow: blueprint.color,
      hp: blueprint.hp,
      maxHp: blueprint.hp,
      preferredRange: blueprint.preferredRange,
      aggression: blueprint.aggression,
      spellbook,
      signatureSpells: spellbook.map((spell) => spell.name),
    };
  }
  return result;
}

export function schoolNameFromEnemyType(type = '', registry = null) {
  if (LEGACY_ALIASES[type]) return LEGACY_ALIASES[type];
  const raw = String(type);
  const slug = raw.includes(':') ? raw.split(':').at(-1) : raw;
  if (!registry?.SCHOOL_INFO) return null;
  return registry.SCHOOL_INFO.find((school) => slugifySchoolName(school.name) === slug)?.name || null;
}

export function uniqueNameFromEnemyType(type = '', registry = null) {
  const raw = String(type);
  const slug = raw.includes(':') ? raw.split(':').at(-1) : raw;
  return Object.keys(buildUniqueEnemyTypes(registry || { SCHOOL_INFO: [], SPELL_DEFS: [] }))
    .find((uniqueName) => slugifySchoolName(uniqueName) === slug) || null;
}

export function getEnemySchoolType(typeOrSchool, registry) {
  const uniqueName = uniqueNameFromEnemyType(typeOrSchool, registry);
  if (uniqueName) return buildUniqueEnemyTypes(registry)[uniqueName] || null;
  const schoolName = registry?.SCHOOL_INFO?.some((school) => school.name === typeOrSchool)
    ? typeOrSchool
    : schoolNameFromEnemyType(typeOrSchool, registry);
  if (!schoolName) return null;
  return buildEnemySchoolTypes(registry)[schoolName] || null;
}

export function chooseRandomEnemyType(registry, rng = Math.random, options = {}) {
  const { includeUniques = false, uniqueChance = 0.28 } = options;
  if (includeUniques && rng() < uniqueChance) {
    const uniques = Object.values(buildUniqueEnemyTypes(registry));
    if (uniques.length > 0) {
      const uniqueIdx = clamp(Math.floor(rng() * uniques.length), 0, uniques.length - 1);
      return uniques[uniqueIdx];
    }
  }
  const schools = registry.SCHOOL_INFO || [];
  if (schools.length === 0) return null;
  const idx = clamp(Math.floor(rng() * schools.length), 0, schools.length - 1);
  return buildEnemySchoolTypes(registry)[schools[idx].name] || null;
}

// Builds a battle wave: between `min` and `max` enemies, guaranteeing at least
// one of each unique archetype (duelist/warden/artillery/controller/summoner).
// Remaining slots are filled with random school/unique enemies.
// Returns an array of enemy TYPE strings (consumable by the engine's createBody).
export function buildEnemyWave(registry, rng = Math.random, options = {}) {
  const { min = 5, max = 10 } = options;
  const uniqueTypes = Object.values(buildUniqueEnemyTypes(registry))
    .map((u) => u.type)
    .filter(Boolean);
  const guaranteed = uniqueTypes.length;
  const lo = Math.max(min, guaranteed);
  const hi = Math.max(lo, max);
  const total = clamp(lo + Math.floor(rng() * (hi - lo + 1)), lo, hi);

  const wave = [...uniqueTypes];
  let guard = 0;
  while (wave.length < total && guard++ < 200) {
    const pick = chooseRandomEnemyType(registry, rng, { includeUniques: true, uniqueChance: 0.3 });
    if (pick?.type) wave.push(pick.type);
    else break;
  }
  return wave;
}

export function chooseEnemySpell(enemy, target = null, rng = Math.random) {
  const spellbook = Array.isArray(enemy?.spellbook) ? enemy.spellbook : [];
  const supported = spellbook.filter((spell) => {
    if (spell.enemyCastMode === 'unsupported') return false;
    if (enemy?.isEnemySummon && spell.enemyCastMode === 'summon') return false;
    if (target?.summon && spell.enemyCastMode === 'summon') return false;
    return true;
  });
  if (supported.length === 0) return null;
  const idx = clamp(Math.floor(rng() * supported.length), 0, supported.length - 1);
  return supported[idx];
}

export function createEnemySpellFacade(spell = {}, enemy = {}) {
  const speed = Number.isFinite(spell.speed) && spell.speed > 0 ? spell.speed : 4.2;
  return {
    ...spell,
    name: spell.name || `${enemy.schoolName || 'Enemy'} Spell`,
    mana: 0,
    cd: 0,
    speed,
    dmg: Math.max(1, Math.floor((spell.dmg || 6) * 0.42)),
    r: Math.max(3, spell.r || 4),
    grav: Number.isFinite(spell.grav) ? spell.grav : 0,
    drag: Number.isFinite(spell.drag) ? spell.drag : 1,
    exR: Math.min(spell.exR || 0, 58),
    exF: Math.min(spell.exF || 0, 9),
    enemySchool: spell.enemySchool || enemy.schoolName || null,
    enemyCastMode: spell.enemyCastMode || getEnemyCastMode(spell),
  };
}
