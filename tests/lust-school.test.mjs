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

const lust = await import('../js/spells/lust.js');
const registry = await import('../js/spell-registry.js');

test('Lust school exposes ten non-explicit cinematic temptation spells', () => {
  assert.equal(lust.SPELL_DEFS.length, 10);

  const names = new Set();
  const forbiddenTerms = [
    'nude',
    'nudity',
    'sex',
    'sexual',
    'genital',
    'porn',
    'explicit',
    'breast',
    'boob',
    'phallic',
    'penis',
    'nipple',
  ];
  const loveSchoolTerms = ['love', 'romance'];

  for (const spell of lust.SPELL_DEFS) {
    assert.equal(typeof spell.name, 'string');
    assert.equal(typeof spell.desc, 'string');
    assert.equal(typeof spell.key, 'string');
    assert.match(spell.color, /^#[0-9a-f]{6}$/i);
    assert.match(spell.c2, /^#[0-9a-f]{6}$/i);
    assert.match(spell.core, /^#[0-9a-f]{6}$/i);
    assert.equal(spell.trail, 'lust');
    assert.ok(spell.lustStyle, `${spell.name} should define a Lust visual style`);
    assert.ok(!names.has(spell.name), `${spell.name} is duplicated`);
    names.add(spell.name);

    const text = `${spell.name} ${spell.desc}`.toLowerCase();
    for (const term of forbiddenTerms) {
      assert.ok(!text.includes(term), `${spell.name} includes explicit term "${term}"`);
    }
    for (const term of loveSchoolTerms) {
      assert.ok(!text.includes(term), `${spell.name} reads like Love school via "${term}"`);
    }
  }
});

test('Lust school leans cinematic and adult-suggestive instead of cute', () => {
  const allText = lust.SPELL_DEFS.map((spell) => `${spell.name} ${spell.desc}`).join(' ').toLowerCase();
  const cinematicTerms = ['cinematic', 'cabaret', 'curtain', 'stage', 'redlight', 'blackout', 'censor', 'silhouette', 'neon', 'velvet'];
  const matches = cinematicTerms.filter((term) => allText.includes(term));
  assert.ok(matches.length >= 7, `expected stronger cinematic adult tone; found ${matches.join(', ')}`);
  assert.ok(!lust.SPELL_DEFS.some((spell) => spell.name.toLowerCase().includes('heart')), 'heart naming reads too cute');
});

test('Lust school is registered with metadata and runtime handlers', () => {
  const meta = registry.SCHOOL_INFO.find((school) => school.name === 'Lust');
  assert.ok(meta);
  assert.equal(meta.count, 10);
  assert.equal(meta.color, '#ff5caa');

  const handlerFlags = [
    'isScentSpiral',
    'isBlushBloom',
    'isSilkenLasso',
    'isAfterglowDash',
    'isPulseRhythm',
    'isMirrorCrush',
    'isMosaicVeil',
    'isVelvetWard',
    'isEuphoriaBloom',
  ];

  for (const flag of handlerFlags) {
    assert.equal(typeof registry.FIRE_HANDLERS[flag], 'function', `${flag} should be registered`);
  }

  assert.ok(registry.PROJ_HOOKS.isVelvetBite, 'Velvet Bite projectile hook should be registered');
  assert.equal(typeof registry.TRAIL_EMITTERS.lust, 'function');

  for (const type of [
    'lust_scent_spiral',
    'lust_blush_bloom',
    'lust_silken_lasso',
    'lust_afterglow_dash',
    'lust_pulse_rhythm',
    'lust_mirror_crush',
    'lust_mosaic_veil',
    'lust_velvet_ward',
    'lust_euphoria_bloom',
    'lust_bite_hit',
    'lust_status',
  ]) {
    assert.equal(typeof registry.VFX_UPDATE[type], 'function', `${type} update should be registered`);
    assert.equal(typeof registry.VFX_DRAW[type], 'function', `${type} draw should be registered`);
  }
});
