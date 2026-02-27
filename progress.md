Original prompt: leia o how to dev,  para saber como desenvolver novos spells.

vamos desenvolver o terceiro spell da escola purecinema.

Spell 3: O paradigma, um feitiço com visual 2.5D que inclui o prisma.

um feitiço do tipo summon onde invoca um prisma que dura 20 segundos e aponta a pornta do triangulo para a direção que o mouse clica, ele absover durante esses 20 segundos todos os feitiços em uma area e devolve todos na direção da ponta, juntos ao final.

Como um prisma faz com a luz, em um raio rapido e eficaz sem erros ou defeitos.

Notes:
- Read HOW_TO_DEV.md and confirmed new spells belong in js/spells/<school>.js via SPELL_DEFS, FIRE_HANDLERS, VFX_UPDATE, and VFX_DRAW.
- Using the develop-web-game workflow for a local test loop after implementation.
- Implementing Spell 3 for PureCinema as a persistent summon VFX that captures projectiles from state.projectiles and re-emits them when the summon expires.

Progress:
- Added `O Paradigma` in `js/spells/purecinema.js` as a 20-second prism summon with directional release on expiry.
- Implemented prism capture logic against `state.projectiles`, storing absorbed projectiles and re-emitting them from the prism tip.
- Added 2.5D prism rendering with front/back faces, internal spectrum lines, capture field ring, and release beam.
- Fixed initial spell cooldown behavior in `arcane-modular.html` so long-cooldown spells are available immediately on fresh load/reset instead of starting on cooldown.

Validation:
- `node --check js/spells/purecinema.js` passed.
- Ran browser validation with Playwright after installing local `playwright` + Chromium in the `develop-web-game` skill directory.
- Verified no runtime errors during the focused Paradigma flow.
- Verified capture in state inspection: prism stored 3 fireballs during a deterministic test.
- Visual artifacts captured in `output/web-game/paradigma-verified/`.

Additional work:
- Added `Practical Effects` to `js/spells/purecinema.js` as a new PureCinema spell focused on physical rigging, spotlight staging, and stunt-drop impact.
- The spell selects nearby active bodies, hoists them with spring-like cable forces, suspends them under a hanging fixture, then drops the rig into an impact explosion.
- Added a lightweight `window.render_game_to_text` in `arcane-modular.html` so Playwright-based validation can read spell/VFX state.

Additional validation:
- `Practical Effects` validated in browser against the existing local server on port 8080.
- No runtime errors during the focused spell test.
- Text-state validation confirmed the spell had 3 active rig targets during the hoist phase.
- Visual artifacts captured in `output/web-game/practical-effects/`.

Additional work:
- Added `Wooden Construct` to `js/spells/nature.js` as a new `Manifest` spell in the Nature school.
- Implemented a two-step cast flow: first click places `P1`, second click places `P2`, then wood and vines grow gradually along the path until the construct fully manifests.
- Wooden constructs persist indefinitely as real platform segments in the physics world and can be destroyed by projectile/explosion damage.
- Added shared manifest state to `js/core/state.js` and engine-side support in `arcane-modular.html` for construct cleanup, structural damage, drawing, HUD category display, and text-state inspection.
- Exposed `Manifest` in the toolbar tooltip and spell info UI so the new category exists explicitly alongside `Common` and `Ultimate`.

Manifest validation:
- `node --check js/spells/nature.js` passed.
- Verified in browser against the existing local server on port 8080.
- Build test confirmed a persistent manifested bridge with `builtSegments: 6` in text state and correct visual growth in `output/web-game/wooden-construct-build/shot-0.png`.
- Destruction test confirmed the construct can be removed by repeated spell damage; final text state showed `manifests: []` in `output/web-game/wooden-construct-destroy/state-0.json`.
- No runtime errors were reported in either Wooden Construct validation run.

Notes / TODO:
- `Wooden Construct` currently uses segmented AABB collision to fit the existing platform physics, while rendering keeps the bridge organic and curved.
- If we want player-side editing later, the next natural extension is a dedicated destroy/edit interaction for Manifest constructs instead of combat-only destruction.

Additional work:
- Generalized the `Manifest` system into `js/spells/manifest.js` so other schools can define construct spells with shared two-click placement, persistent physics segments, common build/destroy flow, and style-specific elemental behavior.
- Added one new `Manifest` spell for each remaining school:
  - Wind: `Aerial Span`
  - Fire: `Cinder Rampart`
  - Water: `Glacier Path`
  - Lightning: `Volt Conduit`
  - Arcane: `Sigil Lattice`
  - Void: `Null Causeway`
  - Holy: `Sanctuary Steps`
  - Chrono: `Delay Track`
  - Celestial: `Starway`
  - PureCinema: `Set Extension`
- Integrated the shared manifest helper into all non-Nature school spell modules by merging generic `FIRE_HANDLERS`, `VFX_UPDATE`, and `VFX_DRAW`.
- Extended the existing construct renderer in `arcane-modular.html` so each manifest style has a distinct 2.5D material treatment and motif instead of reusing the exact Wooden Construct look.
- Kept `/` as the shared Manifest hotkey and relied on the engine's current-school-first key resolution so the active school's manifest is selected correctly.
- Adjusted manifest build growth to scale with frame delta in `arcane-modular.html` + `js/spells/manifest.js`, preventing slow or inconsistent completion in low-FPS/headless runs.

Additional validation:
- `node --check` passed for `js/spells/manifest.js` and all modified school spell modules.
- Browser validation against the existing server on port 8080 confirmed all 10 non-Nature Manifest spells:
  - select correctly in the UI as category `Manifest`
  - place with the two-click flow
  - create persistent manifested platforms in `render_game_to_text`
  - render with distinct visual identities in screenshots under `output/web-game/manifest-all-schools/`
- Final completion pass confirmed full build for every new manifest with `builtSegments === totalSegments === 6` in `output/web-game/manifest-all-schools/build-complete.json`.
- Hotkey validation confirmed `/` selects the current school's manifest correctly for at least Wind, Arcane, and PureCinema in `output/web-game/manifest-hotkey-check.json`.
- No runtime errors were reported during the final manifest validation runs.

Notes / TODO:
- The generic Manifest helper now supports style/effect variants, but Nature still uses its original dedicated `Wooden Construct` implementation. It can be migrated later if we want all manifests on one code path.
- If we expand Manifest further, the next solid step is a proper player editing workflow: select, cut, heal, or reshape existing constructs instead of only placing/damaging them.

Additional work:
- Refactored `Manifest` away from a single "bridge with skins" model into multiple physical manifestation profiles in `js/spells/manifest.js`.
- Added support for:
  - temporary manifests with finite lifetime (`manifestDuration`)
  - non-solid manifests that affect the world physically without becoming collision platforms (`manifestSolid: false`)
  - per-spell manifestation profiles (`manifestProfile`) so different schools can feel structurally different
- Introduced concrete profile differences across schools:
  - Wind `Air Pressure`: a semi-invisible pressure current, non-solid and temporary
  - Lightning `Volt Conduit`: non-solid charged conduit
  - Chrono `Delay Track`: non-solid temporal rail
  - Fire `Cinder Rampart`: solid temporary barricade
  - Water/Holy/Celestial/Arcane/Void/PureCinema now have profile-specific temporary or shaped manifestations instead of all behaving as permanent generic bridges
- Updated the engine in `arcane-modular.html` so non-solid manifests do not participate in player/projectile/platform collision while still existing as visible physical manifestations.
- Added a real deterministic `window.advanceTime(ms)` hook to the main game loop so browser validation can test duration-based gameplay reliably.
- Extended `render_game_to_text` to expose manifest `spell`, `profile`, `solid`, `life`, and `platformSegments` for better validation.

Additional validation:
- Deterministic browser validation confirmed the new behavior split:
  - `Air Pressure` reaches active state as `solid: false`, `profile: "current"`, `platformSegments: 0`
  - `Cinder Rampart` reaches active state as `solid: true`, `profile: "rampart"`, `platformSegments: 6`
  - `Delay Track` reaches active state as `solid: false`, `profile: "track"`, `platformSegments: 0`
  - `Air Pressure` expires fully after time advancement with final `manifests.length === 0`
- Validation artifacts saved in `output/web-game/manifest-variation/`.

Notes / TODO:
- The visual differentiation is now structurally better, but several solid profiles still share the same base segmented geometry underneath. If we want more dramatic identity, the next step is custom segment layout per profile (true steps, panel gaps, floating shards, etc.) instead of only custom surface treatment.
