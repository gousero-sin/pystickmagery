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
const { state } = await import('../js/core/state.js?v=7');
const { state: utilityState } = await import('../js/core/state.js');
const {
  createEnemyProjectile,
  createPlayerProjectile,
  isGameProjectile,
} = await import('../js/core/projectiles.js?v=1');

function resetState() {
  for (const targetState of [state, utilityState]) {
    targetState.particles.length = 0;
    targetState.projectiles.length = 0;
    targetState.vfxSequences.length = 0;
    targetState.entities.length = 0;
    targetState.platforms.length = 0;
    targetState.spikes.length = 0;
    targetState.shockwaves.length = 0;
    targetState.dynamicLights.length = 0;
    targetState.lightningBolts.length = 0;
    targetState.gravityWells.length = 0;
    targetState.fireWalls.length = 0;
    targetState.poisonClouds.length = 0;
    targetState.damageNumbers.length = 0;
    targetState.timeBombs.length = 0;
    targetState.enemyProjectiles.length = 0;
    targetState.frozenEntities.clear();
    targetState.screenShake = 0;
  }
  const player = { x: 100, y: 300, vx: 0, vy: 0, w: 14, h: 30, hp: 100, maxHp: 100 };
  state.player = player;
  utilityState.player = player;
}

function addEnemy(x = 260, y = 240) {
  const enemy = {
    active: true,
    targetable: 'enemy',
    type: 'dummy',
    x,
    y,
    vx: 0,
    vy: 0,
    w: 16,
    h: 30,
    hp: 100,
    maxHp: 100,
    mass: 1,
  };
  state.entities.push(enemy);
  utilityState.entities.push(enemy);
  return enemy;
}

test('player and enemy projectiles share the same projectile contract', () => {
  const spell = registry.SPELL_DEFS.find((candidate) => candidate.name === 'Fireball');
  const friendly = createPlayerProjectile({
    x: 120,
    y: 240,
    vx: 8,
    vy: -1,
    spell,
    life: 160,
  });
  const hostile = createEnemyProjectile({
    x: 280,
    y: 240,
    vx: -4,
    vy: 0,
    r: 4,
    dmg: 7,
    color: '#ff6a22',
    c2: '#ffd36a',
    kind: 'fire',
    life: 160,
  });

  for (const projectile of [friendly, hostile]) {
    assert.ok(isGameProjectile(projectile), 'projectile should use the common GameProjectile class');
    for (const field of ['x', 'y', 'vx', 'vy', 'r', 'dmg', 'color', 'c2', 'life', 'age', 'trail', 'hitList', 'team', 'hostile', 'spell']) {
      assert.ok(field in projectile, `${field} should be present on all projectile variants`);
    }
  }

  assert.equal(friendly.team, 'player');
  assert.equal(friendly.hostile, false);
  assert.equal(hostile.team, 'enemy');
  assert.equal(hostile.hostile, true);
  assert.ok(hostile.spell._generatedProjectileSpell, 'enemy shots should still have a spell facade when systems capture them');
});

test('O Paradigma captures enemy projectiles and releases them as friendly projectiles', () => {
  resetState();
  const spell = registry.SPELL_DEFS.find((candidate) => candidate.name === 'O Paradigma');
  assert.ok(spell, 'O Paradigma should exist');

  const prism = {
    type: 'paradigma_prism',
    state: 1,
    age: 0,
    cx: 240,
    cy: 250,
    angle: 0,
    spell,
    captured: [],
    floatSeed: 0,
  };
  const hostile = createEnemyProjectile({
    x: 255,
    y: 250,
    vx: -4,
    vy: 0,
    r: 4,
    dmg: 7,
    color: '#ff6a22',
    c2: '#ffd36a',
    kind: 'fire',
    life: 160,
  });

  state.enemyProjectiles.push(hostile);
  registry.VFX_UPDATE.paradigma_prism(prism);

  assert.equal(state.enemyProjectiles.length, 0, 'prism should remove captured enemy projectiles from the hostile pool');
  assert.equal(prism.captured.length, 1, 'prism should store the captured hostile shot');
  assert.ok(isGameProjectile(prism.captured[0]));

  prism.state = 2;
  prism.age = 1;
  registry.VFX_UPDATE.paradigma_prism(prism);

  assert.equal(state.projectiles.length, 1, 'captured hostile shot should be re-emitted through the friendly projectile pool');
  const released = state.projectiles[0];
  assert.ok(isGameProjectile(released));
  assert.equal(released.team, 'player');
  assert.equal(released.hostile, false);
  assert.ok(released.spell.dmg > 0, 'released hostile shots should keep a damage-capable spell facade');
});

test('fire hooks keep Time Bomb and Ignite Chain on active projectile paths', () => {
  resetState();
  const timeBomb = registry.SPELL_DEFS.find((candidate) => candidate.name === 'Time Bomb');
  const timeBombHook = registry.PROJ_HOOKS.isTimeBomb;
  const handled = timeBombHook.onLand(
    createPlayerProjectile({ x: 220, y: 250, vx: 0, vy: 0, spell: timeBomb }),
    timeBomb,
    true,
    null,
  );

  assert.equal(handled, true);
  assert.equal(state.timeBombs.length, 0, 'Time Bomb should not use the dead timeBombs queue');
  assert.equal(state.vfxSequences.filter((v) => v.type === 'timebomb').length, 1);

  resetState();
  const ignite = registry.SPELL_DEFS.find((candidate) => candidate.name === 'Ignite Chain');
  const igniteHook = registry.PROJ_HOOKS.isIgniteChain;
  const firstEnemy = addEnemy(240, 240);
  addEnemy(315, 240);

  igniteHook.onLand(
    createPlayerProjectile({ x: 250, y: 252, vx: 7, vy: 0, spell: ignite, hitList: [] }),
    ignite,
    false,
    firstEnemy,
  );

  assert.equal(state.projectiles.length, 1, 'Ignite Chain should launch the next chain projectile');
  const next = state.projectiles[0];
  assert.ok(isGameProjectile(next));
  assert.equal(next.spell.isIgniteChain, true, 'the next chain projectile should keep the Ignite Chain hook');
  assert.equal(next.spell._hook, igniteHook);
  assert.ok(next.hitList.includes(firstEnemy), 'the chain should not retarget the same enemy');
});

test('Backdraft handles enemies at the exact center without corrupting velocity', () => {
  resetState();
  const spell = registry.SPELL_DEFS.find((candidate) => candidate.name === 'Backdraft');
  const enemy = addEnemy(232, 240);
  registry.VFX_UPDATE.backdraft({
    type: 'backdraft',
    state: 1,
    age: 1,
    tx: 240,
    ty: 255,
    spell,
  });

  assert.ok(Number.isFinite(enemy.vx));
  assert.ok(Number.isFinite(enemy.vy));
});

test('projectile engine passes the actual hit entity into impact hooks', async () => {
  const engineSource = await readFile(new URL('../arcane-modular.html', import.meta.url), 'utf8');
  assert.match(engineSource, /let hitS = false, hitEntity = null/);
  assert.match(engineSource, /hitEntity = e;\s*\n\s*const ka = Math\.atan2/);
  assert.match(engineSource, /onLand\(p, s, hitPlat, hitEntity\) === true/);
});
