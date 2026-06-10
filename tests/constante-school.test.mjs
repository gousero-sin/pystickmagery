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

const { state } = await import('../js/core/state.js?v=7');
const constante = await import('../js/spells/constante.js?v=1');
const registry = await import('../js/spell-registry.js');

const HEX = /^#[0-9a-f]{6}$/i;

function resetState() {
  state.player = {
    x: 100,
    y: 260,
    w: 14,
    h: 30,
    facing: 1,
    mana: 140,
    maxMana: 140,
    hp: 100,
    maxHp: 100,
    castAnim: 0,
    castType: '',
    staffGlow: 0,
    vx: 0,
    vy: 0,
    inv: false,
    sq: 1,
    st: 1,
  };
  state.mouse = { x: 260, y: 240, down: false };
  state.entities = [];
  state.projectiles = [];
  state.enemyProjectiles = [];
  state.vfxSequences = [];
  state.particles = [];
  state.dynamicLights = [];
  state.shockwaves = [];
  state.lightningBolts = [];
  state.damageNumbers = [];
  state.frozenEntities = new Map();
  state.platforms = [];
  state.t = 0;
}

const spellByFlag = (flag) => constante.SPELL_DEFS.find((spell) => spell[flag]);

function drawPolyline(vfx, points, stepsPerSegment = 8) {
  const [first, ...rest] = points;
  state.mouse = { x: first.x, y: first.y, down: true };
  registry.VFX_UPDATE.constante_script(vfx);
  let prev = first;
  for (const next of rest) {
    for (let i = 1; i <= stepsPerSegment; i++) {
      const t = i / stepsPerSegment;
      state.mouse = {
        x: prev.x + (next.x - prev.x) * t,
        y: prev.y + (next.y - prev.y) * t,
        down: true,
      };
      registry.VFX_UPDATE.constante_script(vfx);
      if (vfx.done) return;
    }
    prev = next;
  }
}

test('Constante exposes shield, writing, portal summon and seven sigil-dependent spells', () => {
  assert.equal(constante.SPELL_DEFS.length, 10);

  const names = new Set();
  const keys = new Set();
  for (const spell of constante.SPELL_DEFS) {
    assert.equal(typeof spell.name, 'string');
    assert.equal(typeof spell.desc, 'string');
    assert.equal(typeof spell.key, 'string', `${spell.name} must define a key`);
    assert.match(spell.color, HEX, `${spell.name} color must be hex`);
    assert.match(spell.c2, HEX, `${spell.name} c2 must be hex`);
    assert.match(spell.core, HEX, `${spell.name} core must be hex`);
    assert.equal(spell.requiresCircle, true, `${spell.name} should require a magic circle cast`);
    assert.ok(!names.has(spell.name), `${spell.name} is duplicated`);
    assert.ok(!keys.has(spell.key), `${spell.key} is bound twice`);
    names.add(spell.name);
    keys.add(spell.key);
  }

  const shield = spellByFlag('isHellblazerWard');
  assert.ok(shield, 'shield spell must exist');
  assert.equal(shield.category, 'Shield');
  assert.equal(shield.wardDur, 300, 'shield durability should be 5 seconds at 60 fps');

  const writing = spellByFlag('isSigilScript');
  assert.ok(writing, 'writing spell must exist');
  assert.equal(writing.category, 'Writing');
  assert.equal(writing.slowFactor, 0.05, 'writing should slow time by 95%');

  const portal = spellByFlag('isInfernalPortal');
  assert.ok(portal, 'portal summon spell must exist');
  assert.equal(portal.category, 'Summon');
  assert.equal(portal.castFrames, 480, 'portal cast should last 8 seconds at 60 fps');
  assert.equal(portal.cancelOnKnockback, true);

  const dependentSpells = constante.SPELL_DEFS.filter((spell) => spell.requiresSigil === true);
  assert.equal(dependentSpells.length, 7, 'the seven created spells should depend on drawn sigils');
  assert.equal(dependentSpells.filter((spell) => spell.isInfernalPortal).length, 0, 'portal has its own long channel contract');
  assert.ok(dependentSpells.every((spell) => spell.cinematicSigilCast === true), 'drawn rituals should use cinematic post-draw channeling');

  assert.ok(spellByFlag('isBrimstoneChain').dmg >= 70, 'channeled chain should hit harder than a normal quick cast');
  assert.ok(spellByFlag('isAshenExorcism').dmg >= 80, 'channeled exorcism should hit harder than a normal quick cast');
  assert.ok(spellByFlag('isLastRite').dmg >= 150, 'the hidden ultimate should feel like a true ritual payoff');
  assert.ok(spellByFlag('isCrossroadBlink').blinkRange >= 320, 'channeled blink should gain meaningful range');

  const visibleSpells = constante.SPELL_DEFS.filter((spell) => spell.hiddenFromUi !== true);
  assert.deepEqual(
    visibleSpells.map((spell) => spell.name),
    ['Hellblazer Ward', 'Sigil Script', 'Infernal Breach'],
    'only the shield, writing overlay, and portal should appear as regular UI spells',
  );
  assert.ok(dependentSpells.every((spell) => spell.hiddenFromUi === true), 'drawn ritual spells should be hidden from the normal HUD');
});

test('Constante is registered with school metadata and handlers', () => {
  const meta = registry.SCHOOL_INFO.find((school) => school.name === 'Constante');
  assert.ok(meta, 'Constante should be in the central registry');
  assert.equal(meta.count, 10);
  assert.equal(meta.color, '#d6b56d');
  assert.equal(meta.icon, '🜏');

  for (const flag of [
    'isHellblazerWard',
    'isSigilScript',
    'isInfernalPortal',
    'isBrimstoneChain',
    'isAshenExorcism',
    'isDemonSnare',
    'isCigaretteHex',
    'isDebtCollector',
    'isCrossroadBlink',
    'isLastRite',
  ]) {
    assert.equal(typeof registry.FIRE_HANDLERS[flag], 'function', `${flag} should be registered`);
  }

  for (const type of [
    'constante_magic_circle',
    'constante_spell_name',
    'constante_ward',
    'constante_script',
    'constante_portal',
    'constante_chain',
    'constante_exorcism',
    'constante_snare',
    'constante_cigarette_hex',
    'constante_debt_collector',
    'constante_blink',
    'constante_last_rite',
  ]) {
    assert.equal(typeof registry.VFX_UPDATE[type], 'function', `${type} update should be registered`);
    assert.equal(typeof registry.VFX_DRAW[type], 'function', `${type} draw should be registered`);
  }
});

test('Constante shield grants a five-second casting window and blocks enemy pressure', () => {
  resetState();
  const shield = spellByFlag('isHellblazerWard');

  registry.FIRE_HANDLERS.isHellblazerWard(shield, 110, 268, 220, 250);

  assert.equal(state.player.constanteWard, 300);
  assert.ok(state.vfxSequences.some((v) => v.type === 'constante_ward'));
  assert.ok(state.vfxSequences.some((v) => v.type === 'constante_magic_circle'));

  state.enemyProjectiles.push({ x: 108, y: 270, life: 20, spell: { dmg: 10 } });
  const ward = state.vfxSequences.find((v) => v.type === 'constante_ward');
  registry.VFX_UPDATE.constante_ward(ward);
  assert.equal(state.enemyProjectiles[0].life, 0, 'ward should burn hostile projectiles touching the caster');

  ward.age = 301;
  registry.VFX_UPDATE.constante_ward(ward);
  assert.equal(ward.done, true);
  assert.equal(state.player.constanteWard, 0);
});

test('Sigil writing opens a slowed drawable overlay and casts the traced hidden spell', () => {
  resetState();
  const writing = spellByFlag('isSigilScript');

  registry.FIRE_HANDLERS.isSigilScript(writing, 110, 268, 220, 250);

  const script = state.vfxSequences.find((v) => v.type === 'constante_script');
  assert.ok(script, 'script cast should create a writing VFX');
  assert.equal(script.slowFactor, 0.05);
  assert.equal(state.player.constanteSlowFactor, 0.05);
  assert.equal(script.options.length, 7, 'script overlay should show the seven drawable spells');
  assert.ok(script.options.every((option) => option.sigilKey !== 'infernalPortal'), 'portal should not be one of the seven drawable overlay spells');
  assert.ok(script.sigils.length >= 7, 'script should draw varied internal sigils');
  assert.deepEqual(
    script.options.map((option) => option.shape),
    ['triangle', 'cross', 'loop', 'zigzag', 'square', 'x', 'star'],
    'overlay options should be actual drawable sigil shapes',
  );
  assert.ok(script.options.every((option) => Array.isArray(option.template) && option.template.length >= 4));

  script.age = writing.writeFrames + 900;
  state.mouse = { x: 220, y: 180, down: false };
  registry.VFX_UPDATE.constante_script(script);
  assert.equal(script.done, undefined, 'script overlay should not timeout while the player is still choosing/drawing');
  assert.equal(state.player.constanteSlowFactor, 0.05, 'slow overlay should stay active until a sigil is completed');

  const target = script.options.find((option) => option.sigilKey === 'brimstoneChain');
  assert.ok(target, 'brimstone chain option should be drawable');
  assert.equal(target.shape, 'triangle');

  drawPolyline(script, [
    { x: target.x, y: target.y - 34 },
    { x: target.x + 38, y: target.y + 30 },
    { x: target.x - 38, y: target.y + 30 },
    { x: target.x, y: target.y - 34 },
  ]);

  assert.notEqual(script.done, true, 'script should wait until the player releases the mouse before recognizing the sigil');
  assert.ok(!state.vfxSequences.some((v) => v.type === 'constante_chain'), 'hidden spell should not start while the stroke is still held');

  state.mouse = { x: target.x, y: target.y - 34, down: false };
  registry.VFX_UPDATE.constante_script(script);

  assert.equal(script.done, true);
  assert.equal(state.player.constanteSlowFactor, 1);
  assert.ok(state.player.constanteSigils instanceof Set);
  assert.equal(state.player.constanteSigils.has('brimstoneChain'), false, 'the drawn sigil should be consumed to start its hidden spell');
  assert.equal(state.player.constanteSigils.has('ashenExorcism'), false, 'untraced overlay options should stay locked');

  const channel = state.vfxSequences.find((v) => v.type === 'constante_chain');
  assert.ok(channel, 'drawing the triangle sigil should immediately start Brimstone Chain');
  assert.equal(channel.holdRequired, false, 'drawn sigil spells should channel without requiring the mouse to remain held');
  assert.equal(channel.sigilKey, 'brimstoneChain');
  assert.equal(channel.cinematicChannel, true);
  assert.equal(channel.writerLabel, 'CORRENTE');
  assert.equal(channel.writerSigil?.shape, 'triangle');

  const nameFlash = state.vfxSequences.find((v) => v.type === 'constante_spell_name');
  assert.ok(nameFlash, 'completing a sigil should show the resulting spell name on screen');
  assert.equal(nameFlash.text, 'Brimstone Chain');
});

test('Releasing a recognized sigil conjures at the center of the drawing, not the last stroke point', () => {
  resetState();
  const writing = spellByFlag('isSigilScript');
  registry.FIRE_HANDLERS.isSigilScript(writing, 110, 268, 220, 250);
  const script = state.vfxSequences.find((v) => v.type === 'constante_script');

  const target = script.options.find((option) => option.sigilKey === 'brimstoneChain');
  // Triangle: apex high, base wide and low. Bounding box center is offset from every vertex.
  drawPolyline(script, [
    { x: target.x, y: target.y - 34 },
    { x: target.x + 38, y: target.y + 30 },
    { x: target.x - 38, y: target.y + 30 },
    { x: target.x, y: target.y - 34 },
  ]);
  state.mouse = { x: target.x, y: target.y - 34, down: false };
  registry.VFX_UPDATE.constante_script(script);

  const channel = state.vfxSequences.find((v) => v.type === 'constante_chain');
  assert.ok(channel, 'recognized sigil should start its hidden spell');

  const expectedCx = target.x; // (minX + maxX) / 2 = ((x-38)+(x+38))/2
  const expectedCy = target.y - 2; // ((y-34)+(y+30))/2
  assert.ok(Math.abs(channel.tx - expectedCx) < 1e-6, 'conjure X should be the stroke bounding-box center');
  assert.ok(Math.abs(channel.ty - expectedCy) < 1e-6, 'conjure Y should be the stroke bounding-box center');
  assert.notEqual(channel.ty, target.y - 34, 'conjure point must not collapse to the last/apex stroke point');
});

test('Portal summon is a cinematic hold channel, cancels on release or knockback, then releases melee and ranged demons', () => {
  resetState();
  const portal = spellByFlag('isInfernalPortal');

  state.mouse = { x: 260, y: 250, down: true };
  registry.FIRE_HANDLERS.isInfernalPortal(portal, 110, 268, 260, 250);
  const channel = state.vfxSequences.find((v) => v.type === 'constante_portal');
  assert.ok(channel, 'portal channel should start without requiring the shield');
  assert.equal(channel.castFrames, 480);
  assert.equal(channel.holdRequired, true);

  state.player.vx = 4.5;
  registry.VFX_UPDATE.constante_portal(channel);
  assert.equal(channel.done, true, 'knockback during the channel should cancel the portal');
  assert.equal(channel.cancelled, true);

  state.vfxSequences = state.vfxSequences.filter((v) => v !== channel);
  state.player.vx = 0;
  state.mouse = { x: 260, y: 250, down: true };
  registry.FIRE_HANDLERS.isInfernalPortal(portal, 110, 268, 260, 250);
  const released = state.vfxSequences.find((v) => v.type === 'constante_portal');
  released.age = 120;
  state.mouse = { x: 260, y: 250, down: false };
  registry.VFX_UPDATE.constante_portal(released);
  assert.equal(released.done, true, 'releasing the mouse should cancel the cinematic channel');
  assert.equal(released.cancelled, true);

  state.vfxSequences = state.vfxSequences.filter((v) => v !== released);
  state.mouse = { x: 260, y: 250, down: true };
  registry.FIRE_HANDLERS.isInfernalPortal(portal, 110, 268, 260, 250);
  const complete = state.vfxSequences.find((v) => v.type === 'constante_portal');
  complete.age = 481;
  registry.VFX_UPDATE.constante_portal(complete);

  assert.equal(complete.state, 1);
  assert.ok(complete.demons.some((d) => d.role === 'melee'), 'portal should release melee demons');
  assert.ok(complete.demons.some((d) => d.role === 'ranged'), 'portal should release ranged demons');
});

test('Sigil-dependent spells refuse to fire without written sigil, then channel without mouse holding', () => {
  resetState();
  const chain = spellByFlag('isBrimstoneChain');

  registry.FIRE_HANDLERS.isBrimstoneChain(chain, 110, 268, 260, 250);
  assert.ok(
    state.vfxSequences.some((v) => v.type === 'constante_magic_circle' && v.fizzle),
    'missing sigil should fizzle instead of casting',
  );
  assert.ok(!state.vfxSequences.some((v) => v.type === 'constante_chain'));

  state.player.constanteSigils = new Set(['brimstoneChain']);
  state.mouse = { x: 260, y: 250, down: true };
  registry.FIRE_HANDLERS.isBrimstoneChain(chain, 110, 268, 260, 250);

  const channel = state.vfxSequences.find((v) => v.type === 'constante_chain');
  assert.ok(channel);
  assert.equal(channel.holdRequired, false);
  assert.equal(state.player.constanteSigils.has('brimstoneChain'), false, 'casting should consume the drawn sigil');

  channel.age = 120;
  state.mouse = { x: 260, y: 250, down: false };
  registry.VFX_UPDATE.constante_chain(channel);
  assert.notEqual(channel.done, true, 'releasing the mouse should not cancel a drawn sigil channel');
  assert.notEqual(channel.cancelled, true);
  assert.equal(state.player.constanteSigils.has('brimstoneChain'), false, 'autonomous channels should keep the consumed sigil');

  channel.age = chain.castFrames + 1;
  registry.VFX_UPDATE.constante_chain(channel);
  assert.equal(channel.state, 1, 'the autonomous channel should complete after its cast frames');
});
