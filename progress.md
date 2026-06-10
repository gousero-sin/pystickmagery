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

Additional work:
- Expanded `js/spells/water.js` with a full new water package:
  - `Riptide` now manifests a directional undertow lane that drags bodies and projectiles back toward the caster.
  - `Depth Charge` now sinks, compresses the area, and detonates in a pressure burst.
  - `Hydra Heads` now summons three animated water serpent heads that lunge and bite targets.
  - `Mirror Pool` was added as a new spell and duplicates projectiles that skim its reflective surface.
  - `Tidal Lock` now forms a moving water prison around a target instead of being only a placeholder entry.
- Added `Zephyr Dash` to `js/spells/wind.js` as a high-speed caster dash with damaging gust collisions and afterimage VFX.
- Added two new PureCinema spells in `js/spells/purecinema.js`:
  - `Dolly Zoom`, a vertigo-style framing distortion that locks the center while pushing/pulling the surrounding area.
  - `Final Cut`, a montage slash spell that jumps across multiple marks and finishes in a flash burst.
- Extended `render_game_to_text` in `arcane-modular.html` to expose these new VFX states (`slashes`, `marks`, `lockCount`, `mirrored`, `heads`) for browser-side validation.

Additional validation:
- `node --check` passed for `js/spells/water.js`, `js/spells/wind.js`, and `js/spells/purecinema.js`.
- Re-ran the required Playwright client loop against the already-running local server, this time entering `Sandbox 1` first. Smoke artifacts are in `output/web-game/spell-expansion-smoke-live/`.
- Focused Playwright validation in `output/web-game/spell-expansion-validate/` confirmed:
  - `Riptide` active in state with mana spent and live undertow VFX.
  - `Depth Charge` reaching its detonation phase in state.
  - `Hydra Heads` active with `heads: 3`.
  - `Mirror Pool` duplicating projectiles successfully with `mirrored: 5`.
  - `Tidal Lock` active around a live target.
  - `Zephyr Dash` moving the player from `x: 100` to `x: 522`, with an early capture showing live `zephyr_dash` VFX in `wind-zephyr-dash-early.json`.
  - `Dolly Zoom` active in state and visually present.
  - `Final Cut` active with `marks: 5` and live slash VFX.
- Visual spot-checks on screenshots confirmed the new effects are actually visible on-screen:
  - `water-mirror-pool.png` shows the reflective pool and duplicated ice-lance echoes.
  - `purecinema-dolly-zoom.png` shows the concentric cinematic framing and locked center.
- No runtime errors were reported during the final spell expansion validation runs.

Notes / TODO:
- `render_game_to_text` currently reports `x/y` for some VFX types as `0` when that effect stores different anchor fields; if we want stronger automated assertions later, we should normalize those per-effect coordinates too.

Additional work:
- Added a brand new spell category, `Hold`, built around sustained channeling instead of projectiles or manifests.
- Created shared `Hold` infrastructure in `js/spells/hold.js` with:
  - `createHoldSpell(...)` for concise school definitions
  - generic `HOLD_FIRE_HANDLERS`
  - shared `element_hold` VFX lifecycle, mana drain, release phase, and 2.5D drawing
- Added one new `Hold` spell to every school, all on shared hotkey `A` so the current-school-first selector can expose the new type consistently:
  - Nature: `Bramble Clutch`
  - Wind: `Slipstream`
  - Fire: `Kiln Arc`
  - Water: `Tide Harness`
  - Lightning: `Faraday Snare`
  - Arcane: `Vector Frame`
  - Void: `Abyss Grip`
  - Holy: `Choir Column`
  - Chrono: `Frame Hold`
  - Celestial: `Orbit Halo`
  - PureCinema: `Freeze Frame`
- Integrated the new category into the engine in `arcane-modular.html`:
  - `Hold` spells now use channel cast posture in `fireSpell`
  - generic cast audio is skipped for `Hold` so each spell can drive its own sustain/release sound
  - hold previews were added to `drawAimLine`
  - `Hold` buttons get their own toolbar highlight
  - `render_game_to_text` now exposes active `element_hold` VFX with `profile`, `targets`, and `captured`

Hold validation:
- `node --check` passed for `js/spells/hold.js` and every modified school spell module.
- The originally assumed existing game server was not actually serving this workspace; for validation only, a temporary local static server was started on port `18080`.
- Ran the required Playwright client smoke loop with the new Nature `Hold` spell; screenshot saved to `output/web-game/hold-smoke-live/shot-0.png`.
- Ran a focused browser validation across all 11 schools and captured active-hold screenshots/state in `output/web-game/hold-validate/`.
- Final summary in `output/web-game/hold-validate/summary.json` confirmed all schools selected the expected `Hold` spell with live `element_hold` VFX and mana drain during channel:
  - Nature `Bramble Clutch` active with `profile: nature_briar`, `targets: 2`
  - Wind `Slipstream` active with `profile: wind_slipstream`, and player state showed strong lift/launch (`vy: -6`)
  - Fire `Kiln Arc` active with `profile: fire_kiln`
  - Water `Tide Harness` active with `profile: water_undertow`
  - Lightning `Faraday Snare` active with `profile: lightning_snare`, `targets: 1`
  - Arcane `Vector Frame` active with `profile: arcane_frame`
  - Void `Abyss Grip` active with `profile: void_grip`, `targets: 1`
  - Holy `Choir Column` active with `profile: holy_column`, `targets: 3`
  - Chrono `Frame Hold` active with `profile: chrono_frame`, `targets: 2`
  - Celestial `Orbit Halo` active with `profile: celestial_orbit`, `targets: 2`
  - PureCinema `Freeze Frame` active with `profile: cinema_freeze`, `targets: 2`
- Visual spot-checks were done on:
  - `output/web-game/hold-validate/nature.png`
  - `output/web-game/hold-validate/wind.png`
  - `output/web-game/hold-validate/lightning.png`
  - `output/web-game/hold-validate/purecinema.png`
- No runtime errors were reported in `output/web-game/hold-validate/summary.json`.

Notes / TODO:
- `Vector Frame` validated as a live hold field, but its projectile-capture sub-feature was not isolated in a dedicated deterministic scenario yet. If we want deeper coverage, the next targeted browser test should fire projectiles through the frame and assert `captured > 0`.

Additional work (2026-04-14):
- Audited all 11 spell schools and implemented 10 new cinematic spells across Lightning, Holy, and PureCinema:

Lightning (+4):
  - `Thunderbolt Cascade` (K): 3-wave fractal chain — 1→3→6 bolts spreading through all nearby enemies
  - `Magnetar Pulse` (L): Magnetic pull phase that slowly drags all enemies toward center, then detonates in 8-directional electric shockwave
  - `Arc Pylon` (R): Two-click structure — places two pylons that crackle a live electric beam between them, damaging anything near the beam
  - `Stormcaller` (T, Ultimate): 7-second cinematic storm — player ascends, 18 lightning strikes rain down targeting enemies, then a 6-bolt finale destroys everything on screen

Holy (+3):
  - `Radiant Cross` (K): Holy light expands in 4 cardinal directions from cast point, with progressive beam extension and hit detection
  - `Consecrate` (L): Hallows a ground circle for 300 frames — enemies inside take periodic holy damage with rising sparkle VFX
  - `Sacred Seal` (R): Places a divine trap rune that auto-triggers when an enemy crosses it, detonating in a massive divine pillar explosion

PureCinema (+3):
  - `Bullet Time` (K): Slows all enemy velocities to ~4% for 150 frames while player moves freely; scanline/vignette HUD with duration bar
  - `Rack Focus` (L): 20-frame focus animation then snaps precision damage to all enemies inside the focus circle (center enemies take full damage)
  - `Director's Cut` (R, Ultimate): 5-act cinematic — clapper snap, B&W dash sequence through all enemies, color finale explosion

Technical:
  - All 10 spells implement full SPELL_DEFS + FIRE_HANDLERS + VFX_UPDATE + VFX_DRAW pipeline
  - `node --check` passes for all 13 spell modules with zero syntax errors
  - All new spells auto-registered through spell-registry.js (no HTML changes required)
  - Arc Pylon uses two-click placement like Sacred Seal
  - Stormcaller and Director's Cut grant player invulnerability during their cinematic sequences

---

## 2026-05-25 — Remake completo da escola Elemental (guias afro-indígenas)

Reescrita total de `js/spells/elemental.js`: de 4 spells para um **pantheon de 7 invocações** espirituais, ancorado nas linhas de mata/caça (Oxóssi, Ogum) e encruzilhada/mistério (Exu, Pombagira, Preto-Velho, Erês). Identidade: invocação espiritual (guias que lutam ao lado do jogador).

Roster:
- `Caçador da Jurema` (1, Summon — Oxóssi): arqueiro espiritual que dispara flechas de luz com homing leve.
- `Espada de Ogum` (2, Summon): guerreiro de ferro que avança e cliva corpo a corpo com knockback.
- `Manto de Pombagira` (3, Stand): orbita o jogador, seduz (stun) inimigos, absorve projéteis e cura; reconjurar = Gargalhada (giro de espinhos + cura + sedução em área).
- `Tranca-Ruas` (4, Summon — Exu): trickster que teleporta entre inimigos, golpeia e deixa marcas de encruzilhada (lentidão + dano por tick).
- `Defumação` (5, Summon — Preto-Velho): guia sentado cuja fumaça do cachimbo cura o jogador e adoece inimigos (lentidão + dano).
- `Falange das Crianças` (6, Summon — Erês): enxame de 5 espíritos rápidos que esbarram nos inimigos.
- `Gira de Abertura` (7, Ultimate): tambores + mandala do terreiro, os 6 guias manifestam em roda, puxam inimigos e desferem golpe conjunto (explosões + flechas) com cura final.

Bugs corrigidos durante a validação browser (Playwright + browsers em cache):
- **Mira/dano dos summons (todos)**: `utils.js` importa `state.js` sem `?v=`, criando uma instância separada e vazia no browser; `nearestEnemyEntity`/`hurtEntity`/`explode`/`spawnP` da utils operavam sobre esse state morto. A engine tem cópias próprias (por isso as outras escolas sobrevivem via projéteis tratados pela engine). Fix isolado: a elemental passou a usar helpers locais sobre o `state` vivo que ela já importa (`?v=7`), sem mexer na infra compartilhada. **Bug latente global permanece em `utils.js` para os helpers state-dependentes — candidato a fix global futuro (alto blast radius: ~25 arquivos).**
- **Crash "trava tudo" (rosa recast e Gira)**: spells de projétil inline não definiam `grav`/`drag` → engine fazia `p.vy += undefined` → posição `NaN` → `createRadialGradient` em `drawLighting` quebrava o loop de render. Fix: `grav: 0, drag: 1` em todos os projéteis inline.
- **Oxóssi acertava 0**: flechas retas erravam alvos móveis; adicionado homing leve.

Outras mudanças:
- `arcane-modular.html`: `render_game_to_text()` agora inclui VFX `elemental_*` para validação automatizada; bump do import do registry para `?v=16`.
- `js/spell-registry.js`: import da elemental para `?v=3`.
- `tests/elemental-school.test.mjs`: reescrito para os 7 spells, handlers e VFX novos.
- Validação: 24/24 testes de contrato passam; smoke browser confirma dano > 0 nos 7 e zero erros (inclusive recast da Pombagira e Gira). Evidência em `output/web-game/elemental-remake-validate/`.

---

## 2026-05-25 (cont.) — Sistema global de aliados + nerf + fogo amigo

A pedido: summons viram aliados mortáveis, com HP por mana, IA inimiga por ameaça, nerf de dano e fogo amigo (inclusive auto-dano do player).

Infra global nova: `js/core/allies.js` (`isAllyEntity`, `createAlly` com HP = mana×2). Edições no engine `arcane-modular.html`:
- `chooseEnemyTarget(e)`: IA inimiga mira por AMEAÇA (player threat 130 + aliados pela própria `threat`), ponderada por proximidade; `spawnEnemyProjectile` mira `e.aiTarget`.
- Projéteis inimigos causam dano a entidades `targetable:'ally'`.
- `physBody` e `collideEntities` ignoram aliados (posição controlada pela VFX dona); `drawEntities` pula o sprite padrão (a escola desenha).
- **Fogo amigo + auto-dano**: `explode` e paredes de fogo agora ferem o próprio player (respeitando `player.inv`); aliados não têm imunidade, então levam dano de spells do player também.
- Import de `isAllyEntity` e bump do registry para `?v=17`.

Elemental migrada como referência (`?v=4`): Oxóssi, Ogum, Pombagira, Exu, Preto-Velho e Erês (enxame com vida compartilhada via centroide) viram aliados com HP=2×mana; helpers `makeAlly`/`syncAlly`/`endAlly`/`drawAllyHp` (barra de vida quando ferido). Gira (ultimate) segue sem corpo. Dano nerfado ~40% (Oxóssi 12→7, Ogum 16→10, Pombagira 12→7, Exu 13→8, Preto 3→2, Erês 6→4, Gira 60→38) e cadências alongadas (~25%).

Validação browser (Playwright): A) os 6 criam aliado com HP=2×mana (60/72/56/64/60/68 ✓); B) fireMage agressivo mira e mata o aliado (hp→0 ✓); C) explosão de Fire do próprio player tira vida dele (100→94 ✓). 24/24 contratos passam, 0 erros.

PENDENTE: migrar os summons das outras 15 escolas para o sistema (cada um tem VFX própria — fazer escola por escola). Tuning aberto: auto-dano em AoE auto-centrada pode ficar punitivo; ajustar fator se necessário.

---

## 2026-05-25 (cont.) — Inimigos por escola + spellbooks + learner leve

Implementada a base global para inimigos de todas as escolas:
- Novo `js/core/enemy-schools.js`: deriva `schoolMage:<escola>` de `REGISTRY.SCHOOL_INFO` + `SPELL_DEFS`, gera spellbooks sem Ultimates, mantém `Summon` permitido e marca modo de cast inimigo.
- Novo `js/core/enemy-learning.js`: memória pequena por inimigo para registrar ameaças recentes, resultado de esquivas e devolver um viés leve de `dodgeDir`/alcance/chance de pulo.
- `arcane-modular.html`: spawns iniciais de inimigos agora podem trocar dummies/fire/ice por escola aleatória sem novos botões na UI; inimigos carregam `schoolName`, `spellbook`, `lastEnemySpell`, `learnedDodgeBias`; Fire usa spells Fire não-Ultimate e nunca `Cataclysm`.
- Cast hostil agora escolhe spells reais do spellbook: projéteis usam `createEnemyProjectile`; spells `Summon` criam minions hostis temporários sem summon recursivo.
- `render_game_to_text()` expõe escola, estado da IA, spellbook, último cast, bias aprendido e dados de projéteis inimigos para validação sem Playwright.
- Fix global aplicado: `js/core/utils.js` agora importa `./state.js?v=7`, eliminando a instância fantasma de state. Validar balanceamento de escolas que usam helpers diretos.

Validação planejada/necessária: `node --check` nos módulos novos e `node --test tests/*.test.mjs`.

---

## 2026-05-25 (cont.) — Inimigos únicos com spells próprias

Expansão do contrato de inimigos:
- `js/core/enemy-schools.js` agora também gera `uniqueEnemy:<slug>` com `buildUniqueEnemyTypes(REGISTRY)`.
- Foram adicionados 5 inimigos distintos em pelo menos 3 arquétipos: Ember Duelist (duelist/Fire), Rime Warden (warden/Water), Storm Pylonist (artillery/Lightning), Null Anchorite (controller/Void) e Briar Caller (summoner/Nature).
- Cada único tem spells de assinatura exclusivas, baseadas em spells reais quando possível, sem Ultimate. Exemplos: `Duelist Ember Thrust`, `Rime Lock`, `Forked Pylon Bolt`, `Null Pin`, `Briar Sprite`.
- Spawns iniciais podem sortear únicos junto de inimigos por escola, sem botões novos na UI.
- Cast hostil suporta `enemyProjectileCount`/`enemySpread`, permitindo padrões próprios como tiros em leque e pares de projéteis.
- `render_game_to_text()` expõe `uniqueName`, `archetype` e `signatureSpells` para validação determinística.
