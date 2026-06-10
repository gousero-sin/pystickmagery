import test from 'node:test';
import assert from 'node:assert/strict';

// Minimal browser stubs so the spell registry (which pulls in sounds.js) imports.
class FakeNode { connect() { return this; } start() {} stop() {} }
class FakeParam { constructor(v = 0) { this.value = v; } setValueAtTime() {} exponentialRampToValueAtTime() {} linearRampToValueAtTime() {} }
class FakeAudioContext {
  constructor() { this.currentTime = 0; this.destination = new FakeNode(); this.sampleRate = 44100; }
  createOscillator() { const n = new FakeNode(); n.frequency = new FakeParam(440); n.type = 'sine'; return n; }
  createGain() { const n = new FakeNode(); n.gain = new FakeParam(0); return n; }
  createBiquadFilter() { const n = new FakeNode(); n.frequency = new FakeParam(440); n.Q = new FakeParam(1); return n; }
  createBufferSource() { return new FakeNode(); }
  createBuffer() { return { getChannelData: () => new Float32Array(32) }; }
}
globalThis.window = { AudioContext: FakeAudioContext, webkitAudioContext: FakeAudioContext };
globalThis.performance = { now: () => 1000 };

const registry = await import('../js/spell-registry.js');
const { buildEnemyWave, buildUniqueEnemyTypes } = await import('../js/core/enemy-schools.js');

const ARCHETYPE_TYPES = Object.values(buildUniqueEnemyTypes(registry)).map((u) => u.type);

// Deterministic RNG over a fixed sequence (cycles).
function seededRng(values) {
  let i = 0;
  return () => values[i++ % values.length];
}

test('there are exactly 5 unique archetypes to guarantee', () => {
  assert.equal(ARCHETYPE_TYPES.length, 5);
  for (const t of ARCHETYPE_TYPES) assert.match(t, /^uniqueEnemy:/);
});

test('every wave has between 5 and 10 enemies across many random draws', () => {
  for (let s = 0; s < 500; s++) {
    const wave = buildEnemyWave(registry, Math.random, { min: 5, max: 10 });
    assert.ok(wave.length >= 5 && wave.length <= 10, `wave length ${wave.length} out of [5,10]`);
  }
});

test('every wave contains at least one of each unique archetype', () => {
  for (let s = 0; s < 500; s++) {
    const wave = buildEnemyWave(registry, Math.random);
    for (const archetype of ARCHETYPE_TYPES) {
      assert.ok(wave.includes(archetype), `wave missing archetype ${archetype}`);
    }
  }
});

test('minimum draw yields exactly the 5 guaranteed archetypes', () => {
  // rng() = 0 → total = lo (=5); fill loop won't run.
  const wave = buildEnemyWave(registry, () => 0, { min: 5, max: 10 });
  assert.equal(wave.length, 5);
  assert.deepEqual([...wave].sort(), [...ARCHETYPE_TYPES].sort());
});

test('maximum draw yields 10 enemies still covering all archetypes', () => {
  // rng() near 1 → total = hi (=10).
  const wave = buildEnemyWave(registry, seededRng([0.999]), { min: 5, max: 10 });
  assert.equal(wave.length, 10);
  for (const archetype of ARCHETYPE_TYPES) assert.ok(wave.includes(archetype));
});

test('returned wave entries are engine-consumable type strings', () => {
  const wave = buildEnemyWave(registry, Math.random);
  for (const type of wave) {
    assert.equal(typeof type, 'string');
    assert.match(type, /^(schoolMage:|uniqueEnemy:)/);
  }
});
