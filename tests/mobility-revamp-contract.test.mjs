import test from 'node:test';
import assert from 'node:assert/strict';

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
    targetState.mouse = { x: 240, y: 300, down: true };
  }
  const player = {
    x: 100,
    y: 300,
    vx: 0,
    vy: 0,
    w: 14,
    h: 30,
    hp: 100,
    maxHp: 100,
    mana: 100,
    maxMana: 100,
    onGround: false,
    facing: 1,
    inv: false,
    jumpCount: 0,
    maxJumps: 2,
  };
  state.player = player;
  utilityState.player = player;
}

function addEnemy(x = 185, y = 300) {
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
    hitF: 0,
  };
  state.entities.push(enemy);
  utilityState.entities.push(enemy);
  return enemy;
}

function tickVfx(frames) {
  for (let frame = 0; frame < frames; frame++) {
    for (const vfx of [...state.vfxSequences]) {
      vfx.age += 1;
      registry.VFX_UPDATE[vfx.type]?.(vfx);
    }
  }
}

test('dash spells are non-damaging and cover distinct mobility fantasies', () => {
  const expectedDashNames = [
    'Zephyr Dash',
    'Phoenix Step',
    'Tidal Surf',
    'Seraphic Wings',
    'Phase Shift',
    'Demon Step',
    'Permutation Step',
    'Afterglow Dash',
  ];

  const dashSpells = registry.SPELL_DEFS.filter((spell) => spell.category === 'Dash');
  const dashNames = new Set(dashSpells.map((spell) => spell.name));

  for (const name of expectedDashNames) {
    assert.ok(dashNames.has(name), `${name} should be present as a Dash spell`);
  }

  for (const spell of dashSpells) {
    assert.equal(spell.dmg || 0, 0, `${spell.name} should not carry direct damage`);
    assert.doesNotMatch(spell.desc.toLowerCase(), /damag|hurt|strike|slash|burn/);
  }
});

test('dash handlers and dash VFX do not reduce enemy hp', () => {
  const scenarios = [
    ['Zephyr Dash', 'isZephyrDash', 24],
    ['Phoenix Step', 'isPhoenixStep', 24],
    ['Tidal Surf', 'isAquaticSurge', 52],
    ['Seraphic Wings', 'isSeraphicDash', 60, { recast: true }],
    ['Phase Shift', 'isPhaseShift', 34],
    ['Demon Step', 'isEcholithDash', 24],
    ['Permutation Step', 'isTensorveilDash', 24],
    ['Afterglow Dash', 'isAfterglowDash', 34],
  ];

  for (const [name, flag, frames, options = {}] of scenarios) {
    resetState();
    const enemy = addEnemy();
    const spell = registry.SPELL_DEFS.find((candidate) => candidate.name === name);
    assert.ok(spell, `${name} should exist`);
    assert.equal(typeof registry.FIRE_HANDLERS[flag], 'function', `${flag} should be registered`);

    registry.FIRE_HANDLERS[flag](spell, 114, 308, 300, 300, 0);
    if (options.recast) registry.FIRE_HANDLERS[flag](spell, 114, 308, 300, 300, 0);
    tickVfx(frames);

    assert.equal(enemy.hp, 100, `${name} should move/control without damaging enemies`);
    assert.equal(state.damageNumbers.length + utilityState.damageNumbers.length, 0, `${name} should not spawn damage numbers`);
  }
});

test('control-style hold spells do not deal channel or release damage', () => {
  const controlHoldNames = [
    'Slipstream',
    'Tide Harness',
    'Vector Frame',
    'Choir Column',
    'Frame Hold',
    'Freeze Frame',
  ];

  for (const name of controlHoldNames) {
    const spell = registry.SPELL_DEFS.find((candidate) => candidate.name === name);
    assert.ok(spell, `${name} should exist`);
    assert.equal(spell.category, 'Hold');
    assert.equal(spell.dmg || 0, 0, `${name} should not damage while held`);
    assert.equal(spell.releaseDmg || 0, 0, `${name} should not damage on release`);

    resetState();
    const enemy = addEnemy(236, 300);
    registry.FIRE_HANDLERS.isHoldSpell(spell, 114, 308, 240, 300, 0);
    tickVfx(20);
    state.mouse.down = false;
    tickVfx(14);

    assert.equal(enemy.hp, 100, `${name} should remain purely practical/control`);
    assert.equal(state.damageNumbers.length + utilityState.damageNumbers.length, 0, `${name} should not emit damage numbers`);
  }
});

test('Shadow Step teleport is restricted, telegraphed, and non-damaging', () => {
  const spell = registry.SPELL_DEFS.find((candidate) => candidate.name === 'Shadow Step');
  assert.ok(spell, 'Shadow Step should exist');
  assert.equal(spell.dmg || 0, 0);
  assert.ok(spell.teleportRange <= 180, 'teleport range should be restricted');
  assert.ok(spell.teleportWindup >= 20, 'teleport should have a punishable wind-up');

  resetState();
  const enemy = addEnemy(170, 300);
  registry.FIRE_HANDLERS.isTeleport(spell, 114, 308, 650, 300, 0);
  assert.equal(state.player.inv, false, 'caster should remain vulnerable during wind-up');
  tickVfx(spell.teleportWindup - 1);
  assert.equal(enemy.hp, 100);
  assert.ok(state.player.x < 220, 'caster should not instantly cross the arena');
  tickVfx(20);

  const centerX = state.player.x + state.player.w / 2;
  assert.ok(centerX <= 114 + spell.teleportRange + 8, 'teleport should clamp to its max range');
  assert.equal(enemy.hp, 100, 'teleport arrival should not explode for damage');
  assert.equal(state.damageNumbers.length + utilityState.damageNumbers.length, 0);
});
