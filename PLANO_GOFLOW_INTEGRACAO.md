# Plano: GoFlowOS (React) + Arcane Vellum + Nova Diretriz de Batalha

> Status vivo. Cada fase é marcada conforme avança. Espelha a todo list da sessão.

## Decisões fechadas
- **Integração**: migrar a UI para **React 19**, usando `goflow-core` 1.3.0 (instalado via `.tgz` local) como fundação técnica.
- **Visual**: manter **Arcane Vellum** (`colors_and_type.css` + `ui_kits/stickmagerybattle/Lobby.html`). Sem glass/blur/cantos arredondados. goflow entra só como encanamento (scaffolding React, loaders re-skinados, telemetria).
- **Spawn**: ao entrar na batalha nascem **5 a 10 inimigos**, garantindo **1 de cada um dos 5 arquétipos únicos** (duelist, warden, artillery, controller, summoner); resto aleatório.
- **Sprites dos bonecos**: intocados. Motor de canvas (`arcane-modular.html`) permanece vanilla.

## Arquitetura de montagem
- Battle roda via **`<iframe>`** apontando para `arcane-modular.html`. Escola vai por query param (`?school=`); resultados voltam por `postMessage`. Isola o motor e protege os sprites.

## Fases (status)

- [x] **Fase 0 — Fundação de tooling**: ✅ `package.json` (type module, scripts dev/build/preview/test), `vite.config.js` com `legacyGamePlugin` (middleware serve `/arcane-modular.html`, `/js/*`, `/assets/*`, `/colors_and_type.css` crus, sem transform). goflow-core vendorizado em `vendor/goflow-core-1.3.0.tgz` e instalado via `file:`. `index.html` React linka o CSS Vellum por `<link>`. Validado: `/` serve React+HMR, `/arcane-modular.html` e `/js/*.js?v=N` servidos crus, goflow-core resolvido pelo Vite. Dev server OK.
- [x] **Fase 1 — Shell React + navegação**: ✅ `App.jsx` máquina de estados (`menu | lobby | battle`) + `schoolIndex`. `Menu.jsx` em Arcane Vellum (logo, título, botão Entrar no Grimório). Stubs `Lobby.jsx`/`Battle.jsx` para navegação. `src/styles/app.css` com superfícies/botões Vellum compartilhados. Telas compilam (HTTP 200), sem erros. Verificação visual via screenshots na Fase 6.
- [x] **Fase 2 — Lobby React**: ✅ Dados reais via snapshot. `scripts/gen-registry-snapshot.mjs` stuba globals de browser, importa o registry vivo e despeja `src/data/registry-snapshot.json` (16 escolas, **180 spells reais** com dmg/mana/cd). `npm run snapshot` regenera. `src/data/schools.js` funde snapshot + metadata Vellum (runa, flavor, família Primal/Arcane/Veil/Spirit). `Lobby.jsx` + `lobby.css` portam o mock: grid 16 escolas por família, sigilo, flavor, vitals, spellbook real (categoria/DMG/MP/CD), botão "Iniciar Duelo · <Escola>" → `onEnterBattle(index)`. Compila (200), CSS vars todas presentes.
- [x] **Fase 3 — Integração da Batalha**: ✅ Ponte `bootFromQuery` no fim do script de `arcane-modular.html` (não toca render/sprites): lê `?school=<idx>` → `setSchool`, e `?autostart=1` → pula o menu in-game, `loadScene`+`resetWorld`+loop, e `postMessage('sm:battle-started')` ao pai. `Battle.jsx` monta `<iframe src="/arcane-modular.html?school=<idx>&autostart=1">`, overlay Vellum "Abrindo o sigilo" até `sm:battle-started` (fallback 4s), topbar com tag da escola + botão "Voltar ao Lobby". Listener também trata `sm:battle-ended` (auto-retorno na morte fica p/ polish da Fase 5). Compila (200); jogo serve cru com a ponte.
- [x] **Fase 4 — Regra de spawn**: ✅ `buildEnemyWave(registry, rng, {min:5,max:10})` em `enemy-schools.js` (5 arquétipos garantidos + preenchimento aleatório, retorna type strings). No HTML: `battleWaveMode` + `spawnEnemyWave()` (distribui N inimigos em x de 240..W-70, y escalonado; gravidade assenta), `spawnInitial` ramifica p/ a wave em batalha; ponte ativa `battleWaveMode` antes do `resetWorld`. Import bump `enemy-schools.js?v=2`. Teste `tests/enemy-wave-contract.test.mjs` (6 casos: tamanho 5–10, cobertura dos 5 arquétipos, min/max, type strings). Contrato `?v=2` atualizado. **Suíte: 40/40 ✓**.
- [x] **Fase 5 — Encanamento goflow**: ✅ `ThemeProvider` do goflow envolve o app (scaffolding). `src/components/DevTelemetry.jsx` usa o hook real `useBrowserPerformanceMetrics` (web-vitals/PerformanceObserver) num painel Vellum (sem glass), off por padrão, toggle **Shift+D**, montado só em `import.meta.env.DEV`. Loader de batalha permanece Vellum (sem trazer o look de vidro, conforme a diretriz). Compila (200).
- [x] **Fase 6 — Verificação**: ✅ `scripts/verify-flow.mjs` (Playwright, `npm run verify`) — **10/10 checks OK**: Menu/Lobby renderizam, 16 escolas, seleção de Fire mostra 12 magias reais, iframe carrega `?school=2&autostart=1`, `render_game_to_text` confirma **5–10 inimigos com 1 de cada arquétipo** (rodadas: 7 e 8 inimigos, sempre os 5). Screenshots 1440/1024/768/320 em `verify-shots/`. Sprites dos bonecos intactos (render do jogo não tocado). Responsividade 320px corrigida (3 colunas, sem overflow). **Unit: 40/40 ✓**.

## UI in-game → Arcane Vellum (decisão posterior do usuário)
- [x] **Restyle do overlay HTML/CSS do jogo** para Arcane Vellum (igual ao lobby), **sem tocar canvas/sprites/física**. `arcane-modular.html` agora linka `/colors_and_type.css` e o bloco `<style>` foi reescrito: `#toolbar` (pergaminho + borda dourada, sem blur/arredondado), `.tb-btn`/`.spell-btn` (vellum, ativo em roxo arcano), `#schoolSelect` (vellum; `:disabled` em roxo arcano indicando escola travada), `#hud` barras HP/MP com tokens `--hp`/`--mana` e borda dourada, `#spellInfo`/`#info` em fontes mono/pixel, e o `#mainMenu` interno em superfícies Vellum. Bug corrigido: `schoolSelect.value` agora sincroniza com a escola travada (mostrava "Nature" em vez de "Fire"). Verificado por screenshots (`verify-shots/toolbar-vellum.png`, `hud-vellum.png`) e 40/40 + 7/7.

## Regras de duelo (ajuste pós-verificação)
- [x] **Player mortal + morte → lobby**: o jogo era "imortal" porque `enemiesAggressive` era `false` (inimigos não atiravam) e não havia tratamento ao HP≤0. Na batalha (`autostart`) agora: `enemiesAggressive = true` (+ `syncAggroButton`), e ao `player.hp <= 0` o jogo emite `postMessage('sm:battle-ended')` → React volta ao lobby. Flag `playerDead` (resetado em `resetWorld`) evita disparo repetido. **Sem tocar render/física/sprites.**
- [x] **Spells limitados à escola escolhida**: o `#schoolSelect` é desabilitado em batalha (`disabled=true`), travando a escola vinda do lobby; a toolbar já só expõe as magias daquela escola (12 p/ Fire). Hotkeys numéricos não estão ligados, então não há rota de fuga.
- Verificado por `scripts/verify-combat.mjs` (`npm run verify:combat`): **7/7** — agressivos, escola travada, 12 spells Fire, HP cai, morte retorna ao lobby.

## Pontos de integração no código (mapeados)
- `js/spell-registry.js`: `SCHOOL_INFO` (16 escolas, count por escola), `SPELL_DEFS` (achatado em ordem).
- `js/core/enemy-schools.js`: `UNIQUE_ENEMY_BLUEPRINTS` (5 arquétipos), `buildUniqueEnemyTypes`, `chooseRandomEnemyType` → adicionar `buildEnemyWave`.
- `arcane-modular.html`:
  - `spawnInitial()` (~L3852) percorre `SCENES[currentScene].spawns` `[type,x,y]`.
  - `setSchool(si)` (~L3880) reconstrói a barra de spells; dropdown `#schoolSelect`.
  - boot via `<script type="module">` (~L417).

## Riscos
- ALTO — migrar monólito vanilla p/ React: iframe isola o motor (mitigação).
- ALTO/MÉD — manter Vellum descarta o visual glass do goflow; React usado só pelo encanamento.
- MÉD — estado cruzando a fronteira do iframe via `postMessage`.
- MÉD — gerar posições de spawn p/ 5–10 inimigos sem sobrepor geometria.
- BAIXO — peso de deps (framer-motion, web-vitals).
