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

test('React registry snapshot matches the live spell registry order', async () => {
  const snapshot = JSON.parse(
    await readFile(new URL('../src/data/registry-snapshot.json', import.meta.url), 'utf8'),
  );

  const liveNames = registry.SCHOOL_INFO.map((school) => school.name);
  const snapshotNames = snapshot.schools.map((school) => school.name);

  assert.deepEqual(snapshotNames, liveNames);

  for (let index = 0; index < liveNames.length; index++) {
    assert.equal(snapshot.schools[index].totalCount, registry.SCHOOL_INFO[index].count);
    assert.ok(snapshot.schools[index].count > 0, `${liveNames[index]} should expose visible spells in the lobby`);
  }
});
