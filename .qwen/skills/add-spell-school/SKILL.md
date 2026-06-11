---
name: add-spell-school
description: Full procedure to add a new spell school to Arcane Sandbox — covers both game-engine and React-shell surfaces, version bumps, snapshot regeneration, test authoring with ESM caveats, PROJ_DRAW, lightningBolts format, cinematic VFX patterns, and three-phase ultimate design.
source: auto-skill
extracted_at: '2026-06-10T21:30:00.000Z'
---

# Add a Spell School to Arcane Sandbox

Use this when the user asks to create a new school of magic for the `arcane-modular.html` game.

## 1. Study existing schools

Read 2–3 existing school files (e.g. `js/spells/holy.js`, `js/spells/aracnidea.js`) and `HOW_TO_DEV.md` to understand the contract:
- A school exports `SPELL_DEFS`, `FIRE_HANDLERS`, `PROJ_HOOKS`, `TRAIL_EMITTERS`, `VFX_UPDATE`, `VFX_DRAW`.
- Spell categories include `Common`, `Hold`, `Manifest`, `Dash`, `Summon`, `Trap`, `Ward`, `Cast`, `Bind`, `Ultimate` and others.
- Use `createHoldSpell` / `createManifestSpell` helpers for Hold/Manifest categories. Spread `...HOLD_FIRE_HANDLERS`, `...HOLD_VFX_UPDATE`, `...HOLD_VFX_DRAW` (and Manifest equivalents) into the school's exports.

## 2. Write the school file

Create `js/spells/<school-slug>.js`. Follow the patterns from `aracnidea.js`:
- Import `state`, `spawnP`, `hurtEntity`, `isEnemyEntity`, `nearestEnemyEntity`, `createPlayerProjectile`, `createAlly`, `SoundFX`.
- Define a local palette constant (e.g. `const SZ = { flame: '#ff4422', ... }`).
- Use helpers like `rmVfx(v)`, `enemiesInRadius(x,y,r)`, and a safe blast that only hits `isEnemyEntity` (avoid `explode()` near the player — fogo amigo is ON).
- **Dash spells must be non-lethal** (`dmg: 0`, description must not contain `damag|hurt|strike|slash|burn`). Use push/control instead.
- **Ultimates must save and restore `prevInv`** — save `!!p.inv` in the fire handler, set `p.inv = true`, restore `p.inv = v.prevInv` in the VFX_UPDATE finale state.
- Spells using Hold or Manifest helpers need `...HOLD_FIRE_HANDLERS` / `...MANIFEST_FIRE_HANDLERS` spread in the school's exports.

## 3. Register the school (3 files)

### 3a. `js/spell-registry.js`
- Add `import * as SchoolName from './spells/<slug>.js?v=1'` at the top.
- Add `SchoolName` to the `SCHOOLS` array.
- Add `{ name: 'SchoolName', icon: 'X', color: '#xxxxxx' }` to `SCHOOL_META`.

### 3b. `arcane-modular.html`
- **Bump the version** on the registry import: `import * as REGISTRY from './js/spell-registry.js?v=N'` → increment N. Without this, browsers serve a stale cached registry and the new school won't appear.

### 3c. `src/data/schools.js`
- Add an entry in `META` with `rune`, `family` (one of `Primal`, `Arcane`, `Veil`, `Spirit`), and `flavor` (a poetic quote).
- If the `family` is new to the roster, it auto-appears in the lobby grid via `FAMILY_ORDER`.

## 4. Register the visual color

In `colors_and_type.css`, add a CSS variable under the appropriate family section:
```css
--school-<slug>: #xxxxxx;
```
The `slug` is the lowercased school name. This color is used by the React lobby and the in-game UI.

## 5. Regenerate the snapshot

```bash
npm run snapshot
```

This runs `scripts/gen-registry-snapshot.mjs` which imports the live registry and writes `src/data/registry-snapshot.json`. The React lobby reads this snapshot — without regeneration, the school won't appear in the selector.

> ⚠️ The snapshot script imports the full registry. If `spell-registry.js` references a module that doesn't exist yet, it will fail with `ERR_MODULE_NOT_FOUND`. Don't regenerate until all imported files exist.

## 6. Write contract tests

Create `tests/<slug>-school.test.mjs`. Key patterns:

```js
import test from 'node:test';
import assert from 'node:assert/strict';

// Stub AudioContext before any imports
class FakeAudioContext { /* ... */ }
globalThis.window = { AudioContext: FakeAudioContext, webkitAudioContext: FakeAudioContext };

const school = await import('../js/spells/<slug>.js');
const registry = await import('../js/spell-registry.js');
```

Tests to include:
1. **Spell count and field validity** — `school.SPELL_DEFS.length`, names unique, colors hex, category variety.
2. **Dash contract** — any spell with `category === 'Dash'` must have `dmg: 0` and no damage terms in description.
3. **Ultimate inv contract** — sniff the VFX_UPDATE source via `.toString()` to confirm `prevInv` is saved and restored (don't try to simulate live state — see caveat below).
4. **Registry registration** — verify `SCHOOL_INFO` entry, `FIRE_HANDLERS`, `TRAIL_EMITTERS`, `PROJ_HOOKS`, `VFX_UPDATE`, `VFX_DRAW` all have the expected keys.
5. **Hold/Manifest helpers** — if used, verify `isHoldSpell` / `category === 'Manifest'`.

### ⚠️ ESM cache caveat with `?v=N`

School files import state as `import { state } from '../core/state.js?v=7'` (with query string). In Node.js ESM, `state.js?v=7` is a **different module key** than `state.js`. If your test imports `{ state }` from `../js/core/state.js` (without `?v=7`), it gets a **different instance** than the school modules. Setting `state.player` in the test won't affect what the school's handlers see.

**Therefore:** do NOT try to call fire handlers and inspect `state` in unit tests. Instead, verify structural properties:
- The handler exists and has the right signature.
- Sniff the handler/VFX source with `.toString()` to confirm it saves/restores `prevInv`, sets `inv`, etc.
- For deeper integration testing, use the browser (`arcane-modular.html`) with visual validation.

## 7. Validate

```bash
node --check js/spells/<slug>.js       # syntax
npm test                                # all contract tests
npx vite build                          # React shell
```

For visual/manual validation, serve the game and test in browser:
```bash
python3 -m http.server 8080
# Open http://localhost:8080/arcane-modular.html?school=<idx>&autostart=1
```

## 8. PROJ_DRAW — Custom projectile drawing

The engine supports overriding the default circle drawing for projectiles. Export `PROJ_DRAW` keyed by trail name:

```js
export const PROJ_DRAW = {
  my_trail(p, s, X) {
    // p = projectile object, s = spell def, X = canvas 2D context
    // Draw anything — the engine skips the default circle when this exists
  },
};
```

The engine check is: `if (REGISTRY.PROJ_DRAW[s.trail]) { REGISTRY.PROJ_DRAW[s.trail](p, s, X); continue; }`

Use this for projectiles that need custom shapes (dragons, cards, symbols). The trail name in `PROJ_DRAW` must match the spell's `trail` field.

**Important:** Even when using `PROJ_DRAW`, the engine still calls `TRAIL_EMITTERS[s.trail]` for particle emission. You MUST have a `TRAIL_EMITTERS` entry for the same trail name (it can be a no-op). Without it, the engine may error or skip particle effects.

## 9. lightningBolts — Correct format

The engine's `state.lightningBolts` array expects this exact format:

```js
state.lightningBolts.push({
  segments: [{ x: x1, y: y1 }, { x: x2, y: y2 }, { x: x3, y: y3 }],  // array of {x,y} points
  life: 10,        // frames until removal
  color: '#fff',   // hex color
  width: 2,        // line width
});
```

The engine draws by iterating `lb.segments` as an array of points. **Do NOT** use `{ x1, y1, x2, y2, segments: 4 }` — `segments` must be an array of `{x, y}` objects, not a number. This is a crash-causing mistake.

For branching lightning, generate intermediate points with small random offsets:
```js
const segCount = 5;
const segs = [{ x: startX, y: startY }];
for (let s = 1; s < segCount - 1; s++) {
  const frac = s / (segCount - 1);
  segs.push({
    x: startX + (endX - startX) * frac + (Math.random() - 0.5) * 30,
    y: startY + (endY - startY) * frac + (Math.random() - 0.5) * 25,
  });
}
segs.push({ x: endX, y: endY });
state.lightningBolts.push({ segments: segs, life: 10, color: '#fff', width: 2 });
```

## 10. Cinematic VFX techniques

To make spells visually impressive (not "too simple"), use these techniques liberally:

| Technique | Usage |
|-----------|-------|
| `X.globalCompositeOperation = 'lighter'` | Additive blending for glow, fire, energy |
| `X.createRadialGradient(...)` | Depth and aura effects |
| `X.createLinearGradient(...)` | Directional shading (armor, beams) |
| `X.shadowBlur` + `X.shadowColor` | Glow on shapes without composite hack |
| `state.dynamicLights.push({...})` | Scene-wide lighting per frame |
| `state.shockwaves.push({...})` | Expanding ring VFX on impact |
| `state.lightningBolts.push({...})` | Engine-drawn lightning (see §9) |
| Multi-state VFX (`v.state === 0/1/2`) | Phased animations with clear transitions |
| `state.shake(n)` | Screen shake scaled to impact |
| `SoundFX.playSweep(...)` + `playNoise(...)` | Sound design for weight and impact |
| `spawnP(x, y, color, count, 'ember'|'sparkle'|'explode'|'burst'|'void'|'dust'|'trail')` | Particle variety |

For projectiles, prefer `PROJ_HOOKS[key].onUpdate(p, s)` over `TRAIL_EMITTERS` when you need frame-by-frame control (dynamic lights, complex particle patterns). `TRAIL_EMITTERS` is called per-frame but is stateless; `onUpdate` has access to the full projectile state.

## 11. Three-phase ultimate design

Ultimates that feel "cinematic" follow a three-phase pattern:

**Phase 0 — Wind-up (40–60 frames):** Player is invulnerable. Screen darkens or particles converge toward the player. Heavy low-frequency sound. Dynamic lights grow. Player velocity is dampened (`p.vx *= 0.4`).

**Phase 1 — Main action (100–140 frames):** The actual ultimate effect plays out. For dragon/serpent themes, build a body from segments in an array (`v.dragonBody = []`), update positions each frame, damage enemies near segments. For impact-based ultimates, spawn periodic blasts at random enemy positions.

**Phase 2 — Finale (30–50 frames):** Restore `p.inv = v.prevInv` on frame 1. Massive explosion with multiple shockwaves, heavy screen shake, large dynamic light. Spawn 30–50 particles rising upward (the energy "ascending"). Clean up VFX after ~40 frames.

Always save `prevInv` in the fire handler and restore it in the finale. Never leave `player.inv` stuck — the engine only resets it on death/reset.

