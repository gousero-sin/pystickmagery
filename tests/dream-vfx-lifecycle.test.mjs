import test from 'node:test';
import assert from 'node:assert/strict';

// Regression guard for the "infinite VFX" class of bugs: Reverie Ray, the
// Dreamscape ultimate and the Fairy Swarm used to run forever because the
// engine ignored `v.done` for registry-driven VFX. The engine now splices any
// sequence whose update sets `v.done`; these tests lock in that the Dream
// updates DO terminate (and the swarm is crash-safe with positioned motes).

class FakeAudioNode { connect() { return this; } start() {} stop() {} }
class FakeAudioParam { constructor(v = 0) { this.value = v; } setValueAtTime(v) { this.value = v; } exponentialRampToValueAtTime(v) { this.value = v; } }
class FakeGain extends FakeAudioNode { constructor() { super(); this.gain = new FakeAudioParam(0); } }
class FakeOscillator extends FakeAudioNode { constructor() { super(); this.frequency = new FakeAudioParam(440); this.type = 'sine'; } }
class FakeFilter extends FakeAudioNode { constructor() { super(); this.frequency = new FakeAudioParam(440); this.Q = new FakeAudioParam(1); this.type = 'lowpass'; } }
class FakeAudioContext {
  constructor() { this.currentTime = 0; this.destination = new FakeAudioNode(); this.sampleRate = 44100; }
  createOscillator() { return new FakeOscillator(); }
  createGain() { return new FakeGain(); }
  createBiquadFilter() { return new FakeFilter(); }
  createBufferSource() { return new FakeAudioNode(); }
  createBuffer() { return { getChannelData: () => new Float32Array(32) }; }
}
globalThis.window = { AudioContext: FakeAudioContext, webkitAudioContext: FakeAudioContext };

// Match the query string the spell modules use so we share ONE state singleton
// (Node's ESM loader keys modules by full URL, query included).
const { state } = await import('../js/core/state.js?v=7');
const dream = await import('../js/spells/dream.js?v=3');
const registry = await import('../js/spell-registry.js');

function resetState() {
  state.player = { x: 100, y: 120, w: 14, h: 30, facing: 1, mana: 100, castAnim: 0, castType: '', sq: 1, st: 1, inv: false, vx: 0, vy: 0 };
  state.mouse = { x: 240, y: 120, down: false };
  state.entities = [];
  state.platforms = [];
  state.vfxSequences = [];
  state.dynamicLights = [];
  state.shockwaves = [];
  state.particles = [];
  state.lightningBolts = [];
  state.frozenEntities = new Map();
}

const spellByFlag = (flag) => dream.SPELL_DEFS.find((s) => s[flag]);

test('Reverie Ray ends the frame the player releases the mouse', () => {
  resetState();
  const v = { type: 'dream_ray', age: 1, spell: spellByFlag('isReverieRay') };
  state.mouse.down = false;
  registry.VFX_UPDATE.dream_ray(v);
  assert.equal(v.done, true);
});

test('Reverie Ray keeps channeling while held with mana', () => {
  resetState();
  const v = { type: 'dream_ray', age: 2, spell: spellByFlag('isReverieRay') };
  state.mouse.down = true;
  state.player.mana = 100;
  registry.VFX_UPDATE.dream_ray(v);
  assert.notEqual(v.done, true);
});

test('Dreamscape ultimate terminates after its duration', () => {
  resetState();
  const v = { type: 'dream_scape', age: 91, dealt: true, spell: spellByFlag('isDreamscape') };
  registry.VFX_UPDATE.dream_scape(v);
  assert.equal(v.done, true);
});

test('Fairy Swarm motes carry positions and the swarm terminates', () => {
  resetState();
  const s = spellByFlag('isFairySwarm');
  // Cast it the real way and assert every mote has a finite position
  // (undefined positions are what crashed the canvas gradient).
  registry.FIRE_HANDLERS.isFairySwarm(s);
  const swarm = state.vfxSequences.find((v) => v.type === 'dream_swarm');
  assert.ok(swarm, 'cast should push a dream_swarm sequence');
  for (const m of swarm.motes) {
    assert.ok(Number.isFinite(m.x) && Number.isFinite(m.y), 'mote position must be finite at spawn');
  }
  swarm.age = s.swarmDur + 1;
  registry.VFX_UPDATE.dream_swarm(swarm);
  assert.equal(swarm.done, true);
});

test('Fairy Swarm zap pushes an engine-drawable lightning bolt', () => {
  resetState();
  const s = spellByFlag('isFairySwarm');
  const target = { active: true, targetable: 'enemy', x: 110, y: 120, w: 14, h: 30, hp: 100, maxHp: 100 };
  state.entities = [target];
  // A mote sitting on the target, ready to zap this frame.
  const swarm = { type: 'dream_swarm', age: 1, motes: [{ a: 0, r: 6, zapCd: 0, x: 117, y: 135 }], spell: s };
  registry.VFX_UPDATE.dream_swarm(swarm);

  assert.equal(state.lightningBolts.length, 1, 'a zap must produce exactly one bolt');
  const bolt = state.lightningBolts[0];
  // drawLightning() iterates bolt.segments.forEach and reads life/color/width.
  assert.ok(Array.isArray(bolt.segments) && bolt.segments.length >= 2, 'bolt needs a segments path');
  for (const pt of bolt.segments) {
    assert.ok(Number.isFinite(pt.x) && Number.isFinite(pt.y), 'segment points must be finite');
  }
  assert.equal(typeof bolt.life, 'number');
  assert.equal(typeof bolt.width, 'number');
  assert.match(bolt.color, /^#[0-9a-f]{3,8}$/i);
});

test('dream_status counts down sleepers and self-removes when none sleep', () => {
  resetState();
  const sleeper = { active: true, targetable: 'enemy', x: 100, y: 100, w: 14, h: 30, _dreamSleep: 30 };
  state.entities = [sleeper];

  const v = { type: 'dream_status', age: 10, spell: {} };
  registry.VFX_UPDATE.dream_status(v);
  assert.equal(sleeper._dreamSleep, 29, 'drowsy timer should tick down');
  assert.notEqual(v.done, true, 'ticker must persist while an enemy sleeps');

  sleeper._dreamSleep = 0;
  const v2 = { type: 'dream_status', age: 10, spell: {} };
  registry.VFX_UPDATE.dream_status(v2);
  assert.equal(v2.done, true, 'ticker must retire once nobody is asleep');
});
