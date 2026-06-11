import test from 'node:test';
import assert from 'node:assert/strict';

class FakeAudioNode {
  connect() { return this; }
  start() {}
  stop() {}
}

class FakeAudioParam {
  constructor(value = 0) { this.value = value; }
  setValueAtTime(value) { this.value = value; }
  exponentialRampToValueAtTime(value) { this.value = value; }
}

class FakeGain extends FakeAudioNode {
  constructor() { super(); this.gain = new FakeAudioParam(0); }
}

class FakeOscillator extends FakeAudioNode {
  constructor() { super(); this.frequency = new FakeAudioParam(440); this.type = 'sine'; }
}

class FakeFilter extends FakeAudioNode {
  constructor() { super(); this.frequency = new FakeAudioParam(440); this.Q = new FakeAudioParam(1); this.type = 'lowpass'; }
}

class FakeAudioContext {
  constructor() { this.currentTime = 0; this.destination = new FakeAudioNode(); this.sampleRate = 44100; }
  createOscillator() { return new FakeOscillator(); }
  createGain() { return new FakeGain(); }
  createBiquadFilter() { return new FakeFilter(); }
  createBufferSource() { return new FakeAudioNode(); }
  createBuffer() { return { getChannelData: () => new Float32Array(32) }; }
}

globalThis.window = { AudioContext: FakeAudioContext, webkitAudioContext: FakeAudioContext };

const shenzhou = await import('../js/spells/shenzhou.js');
const registry = await import('../js/spell-registry.js');

test('Shenzhou school exposes ten Chinese-mythology spells', () => {
  assert.equal(shenzhou.SPELL_DEFS.length, 10);
  const names = new Set();
  const categories = new Set();
  for (const spell of shenzhou.SPELL_DEFS) {
    assert.equal(typeof spell.name, 'string');
    assert.equal(typeof spell.desc, 'string');
    assert.equal(typeof spell.key, 'string');
    assert.match(spell.color, /^#[0-9a-f]{6}$/i);
    assert.match(spell.c2, /^#[0-9a-f]{6}$/i);
    assert.match(spell.core, /^#[0-9a-f]{6}$/i);
    assert.ok(!names.has(spell.name), `${spell.name} is duplicated`);
    names.add(spell.name);
    if (spell.category) categories.add(spell.category);
  }
  assert.ok(categories.size >= 7, `expected >= 7 distinct categories, got ${categories.size}: ${[...categories].join(', ')}`);
});

test('Shenzhou Dash spells are non-lethal', () => {
  for (const spell of shenzhou.SPELL_DEFS) {
    if (spell.category === 'Dash') {
      assert.equal(spell.dmg, 0, `${spell.name} Dash must have dmg: 0`);
      const text = `${spell.name} ${spell.desc}`.toLowerCase();
      for (const term of ['damag', 'hurt', 'strike', 'slash', 'burn']) {
        assert.ok(!text.includes(term), `${spell.name} Dash description should not mention "${term}"`);
      }
    }
  }
});

test('Shenzhou Ultimate saves and restores player inv correctly', () => {
  const ultimate = shenzhou.SPELL_DEFS.find((s) => s.category === 'Ultimate');
  assert.ok(ultimate, 'Shenzhou should have an Ultimate');
  const handler = registry.FIRE_HANDLERS.isHeavenlyDecree;
  assert.equal(typeof handler, 'function');
  const update = registry.VFX_UPDATE.shenzhou_heavenly_decree;
  assert.equal(typeof update, 'function');
  const src = update.toString();
  assert.ok(src.includes('prevInv'), 'Heavenly Decree update should reference prevInv');
  assert.ok(src.includes('p.inv=v.prevInv') || src.includes('p.inv = v.prevInv'), 'Heavenly Decree should restore player.inv to prevInv');
  const fireSrc = handler.toString();
  assert.ok(fireSrc.includes('prevInv'), 'Fire handler should save prevInv');
  assert.ok(fireSrc.includes('p.inv = true'), 'Fire handler should set inv during ultimate');
});

test('Shenzhou is registered with metadata and runtime handlers', () => {
  const meta = registry.SCHOOL_INFO.find((school) => school.name === 'Shenzhou');
  assert.ok(meta);
  assert.equal(meta.count, 10);
  assert.equal(meta.color, '#dd4422');

  const handlerFlags = [
    'isDragonBreath', 'isJadeSentinel', 'isPhoenixDash',
    'isHeavenlyDecree', 'isInkDragonSeal', 'isVermilionKite',
    'isTerracottaPhalanx', 'isPaperCraneChorus', 'isLotusReversal',
  ];
  for (const flag of handlerFlags) {
    assert.equal(typeof registry.FIRE_HANDLERS[flag], 'function', `${flag} should be registered`);
  }

  for (const trail of ['shenzhou_flame', 'shenzhou_light', 'shenzhou_snake']) {
    assert.equal(typeof registry.TRAIL_EMITTERS[trail], 'function', `${trail} trail emitter should be registered`);
  }

  assert.ok(registry.PROJ_HOOKS.isWhiteSnake, 'isWhiteSnake projectile hook should be registered');

  const vfxTypes = [
    'shenzhou_dragon_breath', 'shenzhou_jade_sentinel', 'shenzhou_phoenix_dash',
    'shenzhou_heavenly_decree', 'shenzhou_ink_dragon_seal', 'shenzhou_vermilion_kite',
    'shenzhou_terracotta_phalanx', 'shenzhou_paper_crane_chorus', 'shenzhou_lotus_reversal',
  ];
  for (const type of vfxTypes) {
    assert.equal(typeof registry.VFX_UPDATE[type], 'function', `${type} update should be registered`);
    assert.equal(typeof registry.VFX_DRAW[type], 'function', `${type} draw should be registered`);
  }
});

test('Shenzhou keeps a control Hold and removes Manifest from the active list', () => {
  const holdSpell = shenzhou.SPELL_DEFS.find((s) => s.name === 'Monkey Staff');
  assert.ok(holdSpell, 'Monkey Staff should exist');
  assert.equal(holdSpell.category, 'Hold');
  assert.ok(holdSpell.isHoldSpell);

  assert.equal(shenzhou.SPELL_DEFS.some((s) => s.category === 'Manifest'), false);
});

test('Dragon Breath uses cinematic VFX (not projectile-based)', () => {
  const dragon = shenzhou.SPELL_DEFS.find((s) => s.name === 'Dragon Breath');
  assert.ok(dragon);
  assert.equal(dragon.speed, 0, 'Dragon Breath should be VFX-based (speed:0)');
  assert.equal(typeof registry.FIRE_HANDLERS.isDragonBreath, 'function');
  assert.equal(typeof registry.VFX_DRAW.shenzhou_dragon_breath, 'function');
});
