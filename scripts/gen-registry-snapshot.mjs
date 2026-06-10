// Generates a static snapshot of the spell registry (schools + spells) for the
// React Lobby. The spell modules reference browser globals at module scope, so
// we stub a permissive environment before importing. Run: node scripts/gen-registry-snapshot.mjs
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '..');

// Permissive no-op stub for any browser global the modules may touch at import.
function makeStub() {
  function fn() { return stub; }
  const stub = new Proxy(fn, {
    get: (_t, prop) => {
      if (prop === Symbol.toPrimitive) return () => 0;
      if (prop === 'length') return 0;
      return stub;
    },
    apply: () => stub,
    construct: () => stub,
  });
  return stub;
}

const stub = makeStub();
const g = globalThis;
for (const key of ['window', 'document', 'navigator', 'AudioContext', 'webkitAudioContext', 'Image', 'HTMLCanvasElement', 'OffscreenCanvas']) {
  if (g[key] === undefined) g[key] = stub;
}
g.requestAnimationFrame = () => 0;
g.cancelAnimationFrame = () => {};
g.devicePixelRatio = 1;

const registry = await import(join(ROOT, 'js', 'spell-registry.js'));

let offset = 0;
const schools = registry.SCHOOL_INFO.map((school) => {
  const allSpells = registry.SPELL_DEFS.slice(offset, offset + school.count);
  const spells = allSpells.filter((s) => s.hiddenFromUi !== true).map((s) => ({
    name: s.name,
    icon: s.icon ?? null,
    dmg: s.dmg ?? null,
    mana: s.mana ?? null,
    cd: s.cd ?? null,
    category: s.category ?? null,
    desc: s.desc ?? null,
  }));
  offset += school.count;
  return {
    name: school.name,
    icon: school.icon,
    color: school.color,
    count: spells.length,
    totalCount: school.count,
    spells,
  };
});

const snapshot = { generatedAt: new Date().toISOString(), schools };
const out = join(ROOT, 'src', 'data', 'registry-snapshot.json');
writeFileSync(out, JSON.stringify(snapshot, null, 2));
console.log(`Wrote ${out}: ${schools.length} schools, ${registry.SPELL_DEFS.length} spells.`);
