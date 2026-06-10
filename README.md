# StickMagery Battle

Jogo desktop de duelo arcano em arena 2D: escolha uma das **21 escolas de magia** (~230 magias reais), entre na arena e purgue uma onda de 5–10 magos inimigos — sempre com um de cada arquétipo (duelist, warden, artillery, controller, summoner).

## Como rodar (desktop, no navegador)

```bash
npm run game        # sobe o servidor estático em http://localhost:8000
```

Abra `http://localhost:8000/` — o jogo carrega em tela cheia da janela. Use **F11** (ou o botão "Tela Cheia") para fullscreen real. Não há dependências para rodar: é um servidor Node puro (`scripts/serve.mjs`).

## Como rodar como app desktop (Electron, opcional)

```bash
npm i -D electron   # uma vez
npm run desktop     # abre a janela nativa 1280×760 (F11 alterna fullscreen)
```

O wrapper está em `desktop/main.cjs` e carrega `game.html` direto do disco (todos os caminhos são relativos).

## Controles

| Entrada | Ação |
|---|---|
| **W A S D** / Espaço | Mover · pulo duplo |
| **Mouse** | Mirar · clique conjura (segure para magias contínuas/hold) |
| **1–9, 0, -, =** | Equipar magia da hotbar |
| **Roda do mouse / Tab** | Ciclar magias |
| **R** | Reiniciar a onda |
| **Esc** | Pausa (na batalha) · voltar (nas telas) |
| **Enter** | Confirmar (título, grimório, fim de batalha) |

## Fluxo do jogo

Título → Grimório (seleção de escola, navegável por teclado) → Batalha (onda de 5–10 inimigos, cena sorteada) → Vitória/Derrota → Nova onda · Trocar escola · Menu.

O HUD mostra HP/MP com números, escola equipada, contagem de inimigos, cronômetro, hotbar com cooldown por slot e a magia equipada com custo/estado.

## Resoluções

O mundo lógico é 800×500 (estética pixel intencional) escalado por aspect-fit para qualquer janela desktop — validado em 1280×720, 1366×768, 1440×900, 1920×1080 e ultrawide 2560×1080 (letterbox com vinheta).

## Validação

```bash
npm run game -- 8123                 # terminal 1
node scripts/verify-desktop.mjs     # terminal 2 (GAME_URL=http://localhost:8123/game.html)
npm test                            # contratos do motor/registry (Node test runner)
```

`verify-desktop.mjs` percorre todo o fluxo com Playwright (título → grimório → batalha → pausa → vitória → nova onda → derrota → menu) e captura screenshots em `verify-shots/desktop/`.

## Estrutura

- `game.html` — **o jogo desktop** (shell de telas + HUD + motor canvas).
- `js/` — conteúdo e sistemas: `spell-registry.js`, `js/spells/*` (21 escolas), `js/core/*` (estado, projéteis, inimigos, aprendizado, sons, aliados).
- `arcane-modular.html` — sandbox de desenvolvimento legado (toolbar de spawn/gravidade); continua útil para testar magias e é referenciado pelos testes de contrato.
- `src/` + `vite.config.js` — shell React antigo (menu/lobby via iframe), **aposentado**; mantido apenas como referência histórica.
- `desktop/main.cjs` — wrapper Electron opcional.
- `scripts/serve.mjs` / `scripts/verify-desktop.mjs` — servidor e verificação E2E.

## Como adicionar uma escola

Veja `HOW_TO_DEV.md` — o registro central (`js/spell-registry.js`) continua o mesmo; o grimório, a hotbar e os inimigos derivados de escola aparecem automaticamente.
