import test from 'node:test';
import assert from 'node:assert/strict';

// Configurando mocks do Web Audio API para o ambiente Node.js de teste
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

// Importa os módulos dinamicamente para os testes
const elemental = await import('../js/spells/elemental.js');
const registry = await import('../js/spell-registry.js');

test('A escola Elemental deve expor 10 guias e rituais afro-indígenas brasileiros', () => {
  assert.equal(elemental.SPELL_DEFS.length, 10);

  const expectedSpells = [
    { name: 'Caçador da Jurema', category: 'Summon', key: '1' },
    { name: 'Espada de Ogum', category: 'Summon', key: '2' },
    { name: 'Manto de Pombagira', category: 'Stand', key: '3' },
    { name: 'Tranca-Ruas', category: 'Summon', key: '4' },
    { name: 'Gira de Abertura', category: 'Ultimate', key: '7' },
    { name: 'Ponto Riscado', category: 'Trap', key: '5' },
    { name: 'Porteira de Ferro', category: 'Ward', key: '6' },
    { name: 'Folha de Amaci', category: 'Support', key: '8' },
    { name: 'Maré de Atabaques', category: 'Wave', key: '9' },
    { name: 'Cabaça de Encantaria', category: 'Summon', key: '0' }
  ];

  for (const expected of expectedSpells) {
    const actual = elemental.SPELL_DEFS.find(s => s.name === expected.name);

    assert.ok(actual, `Feitiço ${expected.name} deve existir`);
    assert.equal(actual.category, expected.category, `${expected.name} deve ser da categoria ${expected.category}`);
    assert.equal(actual.key, expected.key, `${expected.name} deve ter atalho de teclado ${expected.key}`);
    assert.equal(typeof actual.desc, 'string', `${expected.name} deve conter uma descrição`);

    // Verificando cores hex válidas
    assert.match(actual.color, /^#[0-9a-f]{6}$/i);
    assert.match(actual.c2, /^#[0-9a-f]{6}$/i);
    assert.match(actual.core, /^#[0-9a-f]{6}$/i);
  }
});

test('A escola Elemental deve estar registrada com metadados e handlers de execução', () => {
  // Metadados no registro
  const meta = registry.SCHOOL_INFO.find(school => school.name === 'Elemental');
  assert.ok(meta, 'A escola Elemental deve estar registrada no central registry');
  assert.equal(meta.count, 10);
  assert.equal(meta.color, '#5db75c');
  assert.equal(meta.icon, '🏹');

  // Fire Handlers
  const fireFlags = [
    'isOxossiHunter',
    'isOgumWarrior',
    'isPombagiraStand',
    'isExuTrickster',
    'isGiraUltimate',
    'isPontoRiscado',
    'isPorteiraFerro',
    'isFolhaAmaci',
    'isMareAtabaques',
    'isCabacaEncantaria'
  ];

  for (const flag of fireFlags) {
    assert.equal(typeof registry.FIRE_HANDLERS[flag], 'function', `O fire handler ${flag} deve estar registrado`);
  }

  // Projectile Hooks e Trail Emitters
  assert.ok(registry.PROJ_HOOKS.juremaArrow, 'O hook do projétil juremaArrow deve estar registrado');
  assert.ok(registry.PROJ_HOOKS.rosebud, 'O hook do projétil rosebud deve estar registrado');
  assert.equal(typeof registry.TRAIL_EMITTERS.jurema, 'function');
  assert.equal(typeof registry.TRAIL_EMITTERS.rose_petal, 'function');
  assert.equal(typeof registry.TRAIL_EMITTERS.ember_red, 'function');
  assert.equal(typeof registry.TRAIL_EMITTERS.child_spark, 'function');

  // VFX Handlers registrados
  const expectedVfxTypes = [
    'elemental_oxossi_hunter',
    'elemental_ogum_warrior',
    'elemental_pombagira_stand',
    'elemental_exu_trickster',
    'elemental_exu_mark',
    'elemental_gira_ultimate',
    'elemental_ponto_riscado',
    'elemental_porteira_ferro',
    'elemental_folha_amaci',
    'elemental_mare_atabaques',
    'elemental_cabaca_encantaria'
  ];

  for (const type of expectedVfxTypes) {
    assert.equal(typeof registry.VFX_UPDATE[type], 'function', `O atualizador do VFX ${type} deve estar registrado`);
    assert.equal(typeof registry.VFX_DRAW[type], 'function', `O desenhador do VFX ${type} deve estar registrado`);
  }
});
