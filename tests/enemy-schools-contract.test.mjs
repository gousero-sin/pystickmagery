import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

class FakeAudioNode {
  connect() { return this; }
  start() {}
  stop() {}
}

class FakeAudioParam {
  constructor(value = 0) {
    this.value = value;
  }

  setValueAtTime(value) {
    this.value = value;
  }

  exponentialRampToValueAtTime(value) {
    this.value = value;
  }
}

class FakeGain extends FakeAudioNode {
  constructor() {
    super();
    this.gain = new FakeAudioParam(0);
  }
}

class FakeOscillator extends FakeAudioNode {
  constructor() {
    super();
    this.frequency = new FakeAudioParam(440);
    this.type = 'sine';
  }
}

class FakeFilter extends FakeAudioNode {
  constructor() {
    super();
    this.frequency = new FakeAudioParam(440);
    this.Q = new FakeAudioParam(1);
    this.type = 'lowpass';
  }
}

class FakeAudioContext {
  constructor() {
    this.currentTime = 0;
    this.destination = new FakeAudioNode();
    this.sampleRate = 44100;
  }

  createOscillator() { return new FakeOscillator(); }
  createGain() { return new FakeGain(); }
  createBiquadFilter() { return new FakeFilter(); }
  createBufferSource() { return new FakeAudioNode(); }
  createBuffer() {
    return { getChannelData: () => new Float32Array(32) };
  }
}

globalThis.window = {
  AudioContext: FakeAudioContext,
  webkitAudioContext: FakeAudioContext,
};

globalThis.performance = {
  now: () => 1000,
};

const registry = await import('../js/spell-registry.js');
const {
  buildEnemySchoolTypes,
  buildEnemySpellbook,
  buildUniqueEnemyTypes,
  chooseEnemySpell,
  chooseRandomEnemyType,
  isEnemyUltimateSpell,
} = await import('../js/core/enemy-schools.js');
const {
  getDodgeBias,
  initEnemyLearning,
  recordDodgeOutcome,
  recordThreatSample,
} = await import('../js/core/enemy-learning.js');
const { isEnemyEntity, isPropEntity } = await import('../js/core/utils.js');

test('every registered school can produce a school enemy with a non-ultimate spellbook', () => {
  const enemyTypes = buildEnemySchoolTypes(registry);
  assert.equal(Object.keys(enemyTypes).length, registry.SCHOOL_INFO.length);

  for (const school of registry.SCHOOL_INFO) {
    const enemy = enemyTypes[school.name];
    assert.equal(enemy.schoolName, school.name);
    assert.match(enemy.type, /^schoolMage:/);
    assert.equal(enemy.targetable, 'enemy');
    assert.ok(enemy.spellbook.length > 0, `${school.name} should expose enemy-castable spells`);
    assert.ok(
      enemy.spellbook.every((spell) => !isEnemyUltimateSpell(spell)),
      `${school.name} enemy spellbook should not include ultimates`,
    );
  }
});

test('Fire enemies use Fire spells randomly while excluding Cataclysm and ultimate text', () => {
  const fireSpellbook = buildEnemySpellbook('Fire', registry);
  const names = new Set(fireSpellbook.map((spell) => spell.name));

  assert.ok(names.has('Fireball'));
  assert.ok(names.has('Ember Serpent'));
  assert.ok(names.has('Solar Lash'));
  assert.ok(!names.has('Cataclysm'));

  for (const spell of fireSpellbook) {
    assert.equal(spell.enemySchool, 'Fire');
    assert.notEqual(spell.category, 'Ultimate');
    assert.doesNotMatch(spell.desc || '', /\(Ultimate\)/i);
  }

  const fireEnemy = { spellbook: fireSpellbook, ai: {} };
  const seen = new Set([
    chooseEnemySpell(fireEnemy, null, () => 0)?.name,
    chooseEnemySpell(fireEnemy, null, () => 0.44)?.name,
    chooseEnemySpell(fireEnemy, null, () => 0.58)?.name,
    chooseEnemySpell(fireEnemy, null, () => 0.9)?.name,
  ]);
  assert.ok(seen.has('Fireball'));
  assert.ok(seen.has('Ember Serpent'));
  assert.ok(seen.has('Solar Lash'));
  assert.ok(!seen.has('Cataclysm'));
});

test('Summon spells remain legal in enemy spellbooks', () => {
  const elementalSpellbook = buildEnemySpellbook('Elemental', registry);
  const summonSpells = elementalSpellbook.filter((spell) => spell.category === 'Summon');

  assert.ok(summonSpells.length >= 3, 'Elemental should keep summon spells available to enemies');
  assert.ok(summonSpells.every((spell) => spell.enemyCastMode === 'summon'));
});

test('random enemy selection is derived from the registered schools', () => {
  const first = chooseRandomEnemyType(registry, () => 0);
  const last = chooseRandomEnemyType(registry, () => 0.9999);

  assert.equal(first.schoolName, registry.SCHOOL_INFO[0].name);
  assert.equal(last.schoolName, registry.SCHOOL_INFO.at(-1).name);
  assert.match(first.type, /^schoolMage:/);
  assert.match(last.type, /^schoolMage:/);
});

test('unique enemy catalog exposes at least five enemies across three archetypes with unique spells', () => {
  const uniques = buildUniqueEnemyTypes(registry);
  const entries = Object.values(uniques);
  const archetypes = new Set(entries.map((enemy) => enemy.archetype));
  const spellNames = new Set();

  assert.ok(entries.length >= 5);
  assert.ok(archetypes.size >= 3);

  for (const enemy of entries) {
    assert.match(enemy.type, /^uniqueEnemy:/);
    assert.equal(enemy.targetable, 'enemy');
    assert.ok(enemy.uniqueName);
    assert.ok(enemy.spellbook.length >= 1);
    for (const spell of enemy.spellbook) {
      assert.equal(spell.enemyUnique, enemy.uniqueName);
      assert.ok(!spellNames.has(spell.name), `${spell.name} should belong to only one unique enemy`);
      assert.ok(!isEnemyUltimateSpell(spell));
      spellNames.add(spell.name);
    }
  }
});

test('random enemy selection can include unique enemies without replacing school-only mode', () => {
  const schoolOnly = chooseRandomEnemyType(registry, () => 0.9999);
  const uniqueFirst = chooseRandomEnemyType(registry, () => 0, { includeUniques: true, uniqueChance: 1 });

  assert.equal(schoolOnly.schoolName, registry.SCHOOL_INFO.at(-1).name);
  assert.match(schoolOnly.type, /^schoolMage:/);
  assert.match(uniqueFirst.type, /^uniqueEnemy:/);
  assert.ok(uniqueFirst.uniqueName);
});

test('unique enemies choose only their signature spells', () => {
  const unique = buildUniqueEnemyTypes(registry)['Ember Duelist'];
  const chosen = chooseEnemySpell(unique, null, () => 0);

  assert.ok(chosen);
  assert.equal(chosen.enemyUnique, 'Ember Duelist');
  assert.ok(unique.signatureSpells.includes(chosen.name));
});

test('enemy learning records threat direction and returns a small dodge bias', () => {
  const learning = initEnemyLearning();
  const enemy = { x: 100, y: 100, w: 16, h: 30, ai: { learning } };

  recordThreatSample(enemy, {
    x: 160,
    y: 112,
    vx: -6,
    vy: 0,
    dmg: 22,
  }, 52);
  recordDodgeOutcome(enemy, 1, true);

  const bias = getDodgeBias(enemy, {
    x: 150,
    y: 112,
    vx: -5,
    vy: 0,
  });

  assert.ok(Math.abs(bias.direction) === 1);
  assert.ok(bias.confidence > 0);
  assert.ok(bias.threatRangeBonus > 0);
});

test('props remain outside enemy targeting contracts', () => {
  assert.equal(isEnemyEntity({ active: true, targetable: 'prop', type: 'barrel' }), false);
  assert.equal(isPropEntity({ active: true, targetable: 'prop', type: 'barrel' }), true);
  assert.equal(isEnemyEntity({ active: true, targetable: 'enemy', type: 'schoolMage:fire' }), true);
});

test('game shell wires school spellbooks without adding spawn buttons', async () => {
  const source = await readFile(new URL('../arcane-modular.html', import.meta.url), 'utf8');

  assert.match(source, /enemy-schools\.js\?v=2/);
  assert.match(source, /enemy-learning\.js\?v=1/);
  assert.match(source, /const ENEMY_SCHOOL_TYPES = buildEnemySchoolTypes\(REGISTRY\)/);
  assert.match(source, /chooseRandomEnemyType\(REGISTRY, Math\.random, \{ includeUniques: true/);
  assert.match(source, /buildUniqueEnemyTypes\(REGISTRY\)/);
  assert.match(source, /uniqueEnemy:/);
  assert.match(source, /function castEnemySpell\(e, targetRef = player\)/);
  assert.match(source, /castEnemySpell\(e, tgt\)/);
  assert.match(source, /lastEnemySpell/);
  assert.match(source, /learnedDodgeBias/);
  assert.doesNotMatch(source, /data-spawn="schoolMage:/);
});
