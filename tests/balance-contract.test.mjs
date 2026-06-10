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

const registry = await import('../js/spell-registry.js');
const { state } = await import('../js/core/state.js');

function resetState() {
  state.particles.length = 0;
  state.projectiles.length = 0;
  state.vfxSequences.length = 0;
  state.entities.length = 0;
  state.platforms.length = 0;
  state.spikes.length = 0;
  state.shockwaves.length = 0;
  state.dynamicLights.length = 0;
  state.lightningBolts.length = 0;
  state.gravityWells.length = 0;
  state.fireWalls.length = 0;
  state.poisonClouds.length = 0;
  state.damageNumbers.length = 0;
  state.timeBombs.length = 0;
  state.frozenEntities.clear();
  state.screenShake = 0;
  state.player = { x: 100, y: 300, vx: 0, vy: 0, w: 14, h: 30, hp: 100, maxHp: 100, mana: 100, maxMana: 100, facing: 1, inv: false };
}

test('custom impact hooks signal when they own the explosion pass', () => {
  const customImpactFlags = [
    'isEcholithRay',
    'isEcholithChargeShot',
    'isTensorveilRay',
    'isTensorveilSingularShot',
  ];

  for (const flag of customImpactFlags) {
    resetState();
    const spell = registry.SPELL_DEFS.find((candidate) => candidate[flag]) || {
      name: flag,
      color: '#ffffff',
      c2: '#99ccff',
      core: '#ffffff',
      dmg: 40,
      exR: 84,
      exF: 12,
    };

    const hook = registry.PROJ_HOOKS[flag];
    assert.equal(typeof hook?.onLand, 'function', `${flag} should expose an impact hook`);

    const handled = hook.onLand(
      { x: 400, y: 240, vx: 8, vy: -2, age: 20, spell, hitList: [], trail: [] },
      spell,
      false,
      null,
    );

    assert.equal(handled, true, `${spell.name} should prevent a second generic explosion`);
  }
});

test('Mana Drain costs at least as much mana as it can restore on hit', () => {
  const manaDrain = registry.SPELL_DEFS.find((spell) => spell.name === 'Mana Drain');
  assert.ok(manaDrain, 'Mana Drain should exist');
  assert.ok(
    manaDrain.mana >= manaDrain.manaRestore,
    `Mana Drain restores ${manaDrain.manaRestore} mana but only costs ${manaDrain.mana}`,
  );
});

test('projectile engine skips generic impact when a hook handled it', async () => {
  const engineSource = await readFile(new URL('../arcane-modular.html', import.meta.url), 'utf8');
  assert.match(engineSource, /const handledImpact = s\._hook\?\.onLand/);
  assert.match(engineSource, /onLand\(p, s, hitPlat, hitEntity\) === true/);
  assert.match(engineSource, /!handledImpact && \(hitPlat \|\| hitS\) && \(s\.exR \|\| 0\) > 0/);
});
