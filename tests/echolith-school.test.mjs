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

const echolith = await import('../js/spells/echolith.js');
const registry = await import('../js/spell-registry.js');

test('Echolith school is rebuilt around Good, Evil, and the threshold between them', () => {
  assert.equal(echolith.SPELL_DEFS.length, 10);

  const validSides = new Set(['good', 'evil', 'threshold']);
  const sideCounts = { good: 0, evil: 0, threshold: 0 };
  const names = new Set();

  for (const spell of echolith.SPELL_DEFS) {
    assert.equal(typeof spell.name, 'string');
    assert.equal(typeof spell.desc, 'string');
    assert.equal(typeof spell.key, 'string');
    assert.match(spell.color, /^#[0-9a-f]{6}$/i);
    assert.match(spell.c2, /^#[0-9a-f]{6}$/i);
    assert.match(spell.core, /^#[0-9a-f]{6}$/i);
    assert.ok(validSides.has(spell.echolithSide), `${spell.name} should declare a moral side`);
    assert.ok(!names.has(spell.name), `${spell.name} is duplicated`);
    names.add(spell.name);
    sideCounts[spell.echolithSide] += 1;
  }

  assert.ok(sideCounts.good >= 2, `expected at least two divine/good spells; got ${sideCounts.good}`);
  assert.ok(sideCounts.evil >= 2, `expected at least two infernal/evil spells; got ${sideCounts.evil}`);
  assert.ok(sideCounts.threshold >= 2, `expected at least two threshold spells; got ${sideCounts.threshold}`);
});

test('Echolith spell text avoids Tensorveil math and old acoustic-crystal language', () => {
  const disallowedTerms = [
    'tensor',
    'vector',
    'matrix',
    'eigen',
    'jacobian',
    'determinant',
    'singular',
    'supersonic',
    'hertz',
    'prismatic',
    'resonant',
    'resonance',
    'harmonic',
    'pressure',
    'momentum',
    'refractive',
    'basalt',
    'fracture',
  ];

  for (const spell of echolith.SPELL_DEFS) {
    const text = `${spell.name} ${spell.desc}`.toLowerCase();
    for (const term of disallowedTerms) {
      assert.ok(!text.includes(term), `${spell.name} still reads like Tensorveil/Echolith old theme via "${term}"`);
    }
  }
});

test('Echolith spell text carries artistic divine and infernal ritual language', () => {
  const allText = echolith.SPELL_DEFS.map((spell) => `${spell.name} ${spell.desc}`).join(' ').toLowerCase();
  const ritualTerms = [
    'absolution',
    'abyss',
    'altar',
    'angel',
    'choir',
    'damnation',
    'demon',
    'divine',
    'halo',
    'infernal',
    'judgment',
    'mercy',
    'saint',
    'seraph',
    'sin',
    'soul',
    'verdict',
  ];

  const matches = ritualTerms.filter((term) => allText.includes(term));
  assert.ok(matches.length >= 11, `expected a stronger Good/Evil ritual vocabulary; found ${matches.join(', ')}`);
});

test('Echolith school keeps runtime registrations intact', () => {
  const meta = registry.SCHOOL_INFO.find((school) => school.name === 'Echolith');
  assert.ok(meta);
  assert.equal(meta.count, 10);
  assert.equal(meta.color, '#f4d36a');

  for (const flag of [
    'isEcholithHold',
    'isEcholithSummon',
    'isEcholithCharge',
    'isEcholithDash',
    'isEcholithUltimate1',
    'isMercyGuillotine',
    'isSinEaterLantern',
    'isHaloDebt',
    'isAbyssChoirbook',
    'isPenanceChain',
  ]) {
    assert.equal(typeof registry.FIRE_HANDLERS[flag], 'function', `${flag} should be registered`);
  }

  assert.ok(registry.PROJ_HOOKS.isEcholithRay, 'Echolith ray projectile hook should be registered');
  assert.ok(registry.PROJ_HOOKS.isEcholithChargeShot, 'Echolith charge projectile hook should be registered');
  assert.equal(typeof registry.TRAIL_EMITTERS.echolith_ray, 'function');
  assert.equal(typeof registry.TRAIL_EMITTERS.echolith_charge_trail, 'function');

  for (const type of [
    'echolith_ray_fracture',
    'echolith_hold',
    'echolith_summon_obelisk',
    'echolith_cast_fault_bloom',
    'echolith_charge',
    'echolith_charge_recoil',
    'echolith_charge_impact',
    'echolith_dash_slash',
    'echolith_ultimate_cathedral',
    'echolith_mercy_guillotine',
    'echolith_sin_eater_lantern',
    'echolith_halo_debt',
    'echolith_abyss_choirbook',
    'echolith_penance_chain',
  ]) {
    assert.equal(typeof registry.VFX_UPDATE[type], 'function', `${type} update should be registered`);
    assert.equal(typeof registry.VFX_DRAW[type], 'function', `${type} draw should be registered`);
  }
});
