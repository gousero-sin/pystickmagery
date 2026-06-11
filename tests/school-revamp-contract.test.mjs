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

globalThis.window = {
  AudioContext: FakeAudioContext,
  webkitAudioContext: FakeAudioContext,
};

globalThis.performance = {
  now: () => 1000,
};

const registry = await import('../js/spell-registry.js');

const TARGET_SCHOOLS = {
  Shenzhou: {
    added: ['Ink Dragon Seal', 'Vermilion Kite', 'Terracotta Phalanx', 'Paper Crane Chorus', 'Lotus Reversal'],
    removed: ['Eight Trigrams', 'Moonlit Mirror', 'Thunder Talisman', 'Celestial River', 'White Snake Coil'],
  },
  Echolith: {
    added: ['Mercy Guillotine', 'Sin-Eater Lantern', 'Halo Debt', 'Abyss Choirbook', 'Penance Chain'],
    removed: ['Absolution Thorn', 'Stigmata Bloom', 'Altar of Scales', 'Black Mass: Abyss Bell'],
  },
  Lightning: {
    added: ['Forked Rail', 'Static Loom', 'Ion Bloom', 'Bolt Tether', 'Stormglass Prism'],
    removed: ['Lightning', 'Ball Lightning', 'Tesla Coil', 'Thunder Mark', 'Volt Conduit', 'Thunderbolt Cascade', 'Chain Lightning', 'Voltaic Aegis'],
  },
  Holy: {
    added: ['Reliquary Lantern', 'Mercy Thread', 'Crown of Dawn', 'Aegis Procession', 'Star Psalm'],
    removed: ['Sanctuary Steps', 'Smite', 'Radiant Cross', 'Consecrate', 'Sacred Seal'],
  },
  Elemental: {
    added: ['Ponto Riscado', 'Porteira de Ferro', 'Folha de Amaci', 'Maré de Atabaques', 'Cabaça de Encantaria'],
    removed: ['Defumação', 'Falange das Crianças'],
  },
};

function schoolSpells(name) {
  const index = registry.SCHOOL_INFO.findIndex((school) => school.name === name);
  assert.notEqual(index, -1, `${name} should be registered`);
  const offset = registry.SCHOOL_INFO.slice(0, index).reduce((total, school) => total + school.count, 0);
  return registry.SPELL_DEFS.slice(offset, offset + registry.SCHOOL_INFO[index].count);
}

test('revamped schools cap active spellbooks at 10 and remove Manifest spells', () => {
  for (const schoolName of Object.keys(TARGET_SCHOOLS)) {
    const spells = schoolSpells(schoolName);
    assert.ok(spells.length <= 10, `${schoolName} should have at most 10 spells`);
    assert.equal(spells.some((spell) => spell.category === 'Manifest'), false, `${schoolName} should not expose Manifest spells`);
  }
});

test('revamped schools expose five new flexible spells and hide the removed set', () => {
  for (const [schoolName, contract] of Object.entries(TARGET_SCHOOLS)) {
    const names = new Set(schoolSpells(schoolName).map((spell) => spell.name));
    for (const name of contract.added) {
      assert.ok(names.has(name), `${schoolName} should include new spell ${name}`);
    }
    for (const name of contract.removed) {
      assert.equal(names.has(name), false, `${schoolName} should remove ${name}`);
    }
  }
});

test('revamped schools keep unique names, visible descriptions, and balanced costs', () => {
  for (const schoolName of Object.keys(TARGET_SCHOOLS)) {
    const spells = schoolSpells(schoolName);
    const names = new Set();
    for (const spell of spells) {
      assert.ok(!names.has(spell.name), `${schoolName} duplicates ${spell.name}`);
      names.add(spell.name);
      assert.equal(typeof spell.desc, 'string', `${spell.name} should have a description`);
      assert.ok(spell.desc.length >= 40, `${spell.name} description should explain the fantasy`);
      assert.ok(spell.mana >= 16 && spell.mana <= 110, `${spell.name} mana should stay in normal bounds`);
      assert.ok(spell.cd >= 220 && spell.cd <= 15000, `${spell.name} cooldown should stay in normal bounds`);
    }
  }
});
