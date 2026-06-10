# Arcane Sandbox — How To Dev

> Guia de desenvolvimento para adicionar escolas, magias, VFX, projéteis e validações ao projeto.

---

## Visão geral atual

O projeto tem **duas superfícies**:

1. **`arcane-modular.html`** — o jogo em si (engine, UI in-game, loop, sandbox de validação). Importa `js/spell-registry.js` e tem seu próprio `<select>` de escola.
2. **Shell React em `src/`** (Vite) — o lobby/menu de seleção de escola que embute o jogo num iframe. **Não lê o registry vivo**; lê um snapshot estático (`src/data/registry-snapshot.json`). Ver a seção [Shell React e seletor de escola](#shell-react-e-seletor-de-escola).

> ⚠️ **Adicionar uma escola exige tocar nas DUAS superfícies.** Só editar `js/spells/` + `spell-registry.js` faz a escola aparecer no `arcane-modular.html`, mas **não** no lobby React (o seletor que o jogador usa). Sem regenerar o snapshot, a escola "não aparece no seletor".

Use os arquivos em `js/` como fonte da verdade do gameplay. A versão antiga monolítica saiu do fluxo principal.

O registro central tem 19 escolas (+ escolas em desenvolvimento que podem aparecer no `spell-registry.js` antes de o arquivo existir):

| Escola | Arquivo | Magias |
|--------|---------|--------|
| Nature | `js/spells/nature.js` | 13 |
| Wind | `js/spells/wind.js` | 11 |
| Fire | `js/spells/fire.js` | 12 |
| Water | `js/spells/water.js` | 20 |
| Lightning | `js/spells/lightning.js` | 13 |
| Arcane | `js/spells/arcane.js` | 10 |
| Void | `js/spells/void.js` | 10 |
| Holy | `js/spells/holy.js` | 10 |
| Chrono | `js/spells/chrono.js` | 15 |
| Celestial | `js/spells/celestial.js` | 10 |
| PureCinema | `js/spells/purecinema.js` | 14 |
| Aetherforge | `js/spells/aetherforge.js` | 7 |
| Echolith | `js/spells/echolith.js` | 9 |
| Tensorveil | `js/spells/tensorveil.js` | 9 |
| Lust | `js/spells/lust.js` | 10 |
| Elemental | `js/spells/elemental.js` | 7 |
| Dream | `js/spells/dream.js` | 10 |
| Constante | `js/spells/constante.js` | 10 |
| Aracnidea | `js/spells/aracnidea.js` | 10 |

> **Nota sobre `js/core/utils.js`:** o import de `state` foi alinhado para `./state.js?v=7`, a mesma instância viva usada pelo engine e pelas escolas. Isso corrige o antigo desvio em que `spawnP`/`hurtEntity`/`explode`/`nearestEnemyEntity` podiam operar sobre um state fantasma no browser. Como isso reativa helpers diretos em várias escolas, mudanças de balanceamento devem ser validadas com contratos e smoke manual.

---

## Estrutura de arquivos

```text
pystickmagery/
├── arcane-modular.html          # engine, UI, loop principal e hooks de validação
├── HOW_TO_DEV.md                # este guia
├── progress.md                  # histórico de trabalho recente
├── tests/                       # testes de contrato com node:test
│   ├── balance-contract.test.mjs
│   ├── combat-contract.test.mjs
│   ├── echolith-school.test.mjs
│   ├── lust-school.test.mjs
│   ├── mobility-revamp-contract.test.mjs
│   └── projectile-unification-contract.test.mjs
└── js/
    ├── spell-registry.js        # importa escolas e agrega handlers
    ├── core/
    │   ├── state.js             # estado global compartilhado
    │   ├── sounds.js            # SoundFX via Web Audio API
    │   ├── utils.js             # partículas, dano, explosões, targeting
    │   ├── allies.js            # contratos de aliados invocados
    │   ├── enemy-learning.js    # memória leve de esquiva por inimigo
    │   ├── enemy-schools.js     # spellbooks e metadados de inimigos por escola
    │   └── projectiles.js       # modelo único de projéteis player/enemy
    └── spells/
        ├── hold.js              # helper compartilhado para categoria Hold
        ├── manifest.js          # helper compartilhado para categoria Manifest
        ├── aetherforge.js       # exemplo de escola agregadora por slices
        ├── echolith.js          # exemplo de escola agregadora por magia
        └── <school>.js          # escolas diretas
```

`output/web-game/` guarda artefatos de validação visual. Use para evidência de smoke/focused browser tests, mas não trate como código-fonte.

---

## Como rodar localmente

`arcane-modular.html` usa ES modules, então não rode via `file://`. Suba um servidor estático na raiz do projeto:

```bash
python3 -m http.server 8080
```

Acesse:

```text
http://localhost:8080/arcane-modular.html
```

Alternativas:

```bash
npx serve .
# geralmente abre em http://localhost:3000/arcane-modular.html
```

Se a porta estiver ocupada, escolha outra:

```bash
python3 -m http.server 18080
```

---

## Fluxo recomendado

1. Escolha a escola em `js/spells/<school>.js` ou crie uma escola nova.
2. Defina a magia em `SPELL_DEFS`.
3. Para comportamento especial, adicione uma flag booleana no spell, por exemplo `isMySpell: true`.
4. Registre a flag em `FIRE_HANDLERS`, `PROJ_HOOKS`, `TRAIL_EMITTERS`, `VFX_UPDATE` e/ou `VFX_DRAW`.
5. Se usar `Hold` ou `Manifest`, prefira os helpers compartilhados antes de criar fluxo próprio.
6. Rode checagem de sintaxe e testes de contrato.
7. Faça uma validação visual no browser quando a mudança tiver VFX, física, input ou UI.

---

## Contrato de uma escola

Cada módulo de escola pode exportar estes objetos:

```js
export const SPELL_DEFS = [];
export const FIRE_HANDLERS = {};
export const PROJ_HOOKS = {};
export const TRAIL_EMITTERS = {};
export const VFX_UPDATE = {};
export const VFX_DRAW = {};
```

`js/spell-registry.js` agrega tudo com `Object.assign` e expõe:

```js
SPELL_DEFS
FIRE_HANDLERS
PROJ_HOOKS
TRAIL_EMITTERS
VFX_UPDATE
VFX_DRAW
SCHOOL_INFO
attachHooksToSpells(spells)
```

Ao adicionar uma escola nova:

```js
// js/spell-registry.js
import * as MySchool from './spells/my-school.js?v=1';

const SCHOOLS = [
  // ...
  MySchool,
];

const SCHOOL_META = [
  // ...
  { name: 'MySchool', icon: '*', color: '#88ccff' },
];
```

Use o sufixo `?v=N` nos imports do browser para evitar cache antigo durante desenvolvimento. Bump quando o navegador insistir em servir módulo stale.

> ⚠️ **Cache do registry.** `arcane-modular.html` importa `import * as REGISTRY from './js/spell-registry.js?vN'`. Se você editar o **conteúdo** de `spell-registry.js` (ex.: registrar uma escola nova) sem mudar o `?vN`, o navegador serve a versão antiga em cache e a escola não aparece. **Sempre faça bump desse `?vN`** (ex.: `?v=19` → `?v=20`) ao adicionar/remover escolas. Testes headless em contexto limpo não pegam esse problema; um navegador real, sim.

---

## Shell React e seletor de escola

O menu/lobby que o jogador usa é um app React em `src/` servido por Vite. Ele **não importa o registry vivo** (os módulos de spell tocam globais de browser no top-level e quebrariam no bundle). Em vez disso lê um **snapshot estático**:

```text
src/data/registry-snapshot.json   ← gerado de SCHOOL_INFO + SPELL_DEFS
src/data/schools.js               ← funde o snapshot com metadados de apresentação (rune, family, flavor)
src/screens/Lobby.jsx             ← renderiza a grade de escolas por família
colors_and_type.css               ← define --school-<slug> (cor de cada escola)
```

### Passos obrigatórios ao adicionar uma escola (além de `spell-registry.js`)

1. **Metadados de apresentação** em `src/data/schools.js`, no objeto `META`:
   ```js
   Aracnidea: { rune: 'ᛉ', family: 'Veil', flavor: '"..."' },
   ```
   `family` deve ser uma de `FAMILY_ORDER` (`Primal`, `Arcane`, `Veil`, `Spirit`) — escolas sem entrada caem num fallback genérico (`◆`, família `Arcane`).
2. **Cor da escola** em `colors_and_type.css`: adicione `--school-<slug>` (o slug vem de `slugify(name)`, ex.: `--school-aracnidea: #8f3dff;`).
3. **Regenere o snapshot**:
   ```bash
   npm run snapshot   # = node scripts/gen-registry-snapshot.mjs
   ```
   O script stuba os globais de browser, importa `spell-registry.js` e grava as 19+ escolas com nome, contagem e stats reais.

> ⚠️ O gerador de snapshot importa o registry **inteiro**. Se o `spell-registry.js` referenciar um módulo que ainda não existe (ex.: uma escola em desenvolvimento por outro agente), `npm run snapshot` falha com `ERR_MODULE_NOT_FOUND`. Não regenere o snapshot até todos os arquivos importados existirem; o snapshot anterior continua válido para o lobby.

### Como rodar e validar o shell React

```bash
npm run dev        # Vite em http://localhost:5173/
```

O lobby tem um portão de entrada ("ENTRAR NO GRIMÓRIO") antes da grade de escolas — clique nele antes de procurar a escola. Cada escola vira um `<button class="school">` com `.school-name`. O contrato `tests/registry-snapshot-contract.test.mjs` garante que o snapshot bate com a ordem/contagem do registry vivo, então rode os testes após regenerar.

### Boot direto no jogo (sem React), útil para validação headless

`arcane-modular.html` aceita query params:

```text
arcane-modular.html?school=<idx>                 # seleciona a escola (índice do registry)
arcane-modular.html?school=<idx>&autostart=1&scene=0   # pula o menu e cai na arena (modo duelo: inimigos agressivos)
```

`?autostart=1` liga `enemiesAggressive` (o player pode morrer). Para exercitar VFX sem o player morrer, inicie pelo menu in-game (`.menu-card`) em vez de `autostart`.

---

## Anatomia de uma magia

Campos comuns em `SPELL_DEFS`:

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `name` | string | Nome exibido na UI |
| `icon` | string | Ícone do botão |
| `key` | string | Atalho de teclado |
| `category` | string | Categoria exibida na UI; padrão é `Common` |
| `color`, `c2`, `core` | hex | Paleta principal |
| `speed` | number | Velocidade do projétil; `0` para casts sem projétil |
| `dmg` | number | Dano base |
| `mana` | number | Custo de mana |
| `cd` | number | Cooldown em ms |
| `r` | number | Raio do projétil |
| `grav` | number | Gravidade do projétil |
| `drag` | number | Arrasto por frame |
| `bounce` | number | Ricochetes |
| `exR`, `exF` | number | Raio e força de explosão |
| `trail` | string | Chave do emissor de trilha |
| `desc` | string | Descrição curta |
| `isXxx` | boolean | Flag que liga handlers e hooks |

Categorias já usadas incluem `Common`, `Hold`, `Manifest`, `Dash`, `Summon`, `Charge`, `Trap`, `Structure`, `Ultimate`, `Aura`, `Ray`, `Cast`, `Tether`, `Toggle`, `Buff`, `Riposte`, `Teleport`, `Totem`, `Ward`, `Veil`, `Rhythm`, `Illusion`, `Pulse`, `Bind` e `Tempt`.

---

## Ciclo de vida de cast

```text
mousedown
  -> fireSpell(idx, ox, oy, tx, ty)
    -> checa cooldown e mana
    -> desconta mana
    -> escolhe pose/animação/audio
    -> procura REGISTRY.FIRE_HANDLERS por flag isXxx
      -> handler retorna true: cast totalmente tratado
      -> sem handler: cria VFX pre_cast
    -> pre_cast cria createPlayerProjectile(...)

frame loop
  -> updateProjectiles(dt)
    -> normalizePlayerProjectile(...)
    -> física, homing e zonas
    -> s._hook.onUpdate(p, s)
    -> TRAIL_EMITTERS[s.trail](p, s)
    -> colisão plataforma/entidade
    -> s._hook.onLand(p, s, hitPlat, hitEntity)
    -> explosão genérica se hook não tratou

frame loop
  -> updateVFX(dt)
    -> REGISTRY.VFX_UPDATE[v.type](v)
    -> REGISTRY.VFX_DRAW[v.type](v, X)
```

Regra importante: `onLand` pode retornar `true` quando o hook já fez todo o impacto. Isso evita explosão ou burst genérico duplicado.

> **O dano base é aplicado ANTES de `onLand`.** Na colisão projétil↔entidade, o engine já chama `hurtEntity(e, p.growDmg || s.dmg)` e aplica knockback **antes** de invocar `s._hook.onLand(p, s, hitPlat, hitEntity)`. Portanto, em `onLand`, **não reaplique o dano base** — use o hook só para efeitos extras (veneno, mini-teia, snare, status). Retorne `true` para suprimir a explosão/burst genérico. `hitEntity` é a entidade realmente atingida (pode ser `null` se bateu só em plataforma).

`onPreCast` aparece em código legado, mas o caminho atual do engine não despacha esse hook genericamente. Para casts especiais, use `FIRE_HANDLERS`.

### Contratos de balanceamento e fogo amigo

Antes de criar magias, conheça os contratos em `tests/` que travam comportamento:

- **`Dash` deve ser não-letal** (`mobility-revamp-contract`): magias de categoria `Dash` precisam de `dmg: 0` e `desc` sem palavras de dano (`damag|hurt|strike|slash|burn`). Para dar impacto a um dash, use **empurrão/controle** (mexer em `e.vx/e.vy`), não `hurtEntity`.
- **Fogo amigo está LIGADO.** `explode()` (utils) e zonas como paredes de fogo ferem o **próprio player** (respeitando `inv`) e aliados. Para explosões centradas no player (wards, ultimates), prefira iterar inimigos com `isEnemyEntity` e aplicar dano manualmente, em vez de `explode()`, para não se autoferir. Um helper local tipo `venomBlast(x,y,r,dmg)` que só atinge `isEnemyEntity` é o padrão seguro.
- **Ultimates não podem deixar `inv`/flags presos.** Salve `prevInv` ao começar e restaure no fim de cada estado terminal; o engine só reseta `player.inv = false` em morte/reset, então um VFX que não restaura trava o player invulnerável.

---

## Projéteis unificados

Use `js/core/projectiles.js` para criar projéteis. Não monte objetos soltos quando a magia precisa interagir com reflexão, captura, parry, inimigos ou testes.

```js
import { createPlayerProjectile, createEnemyProjectile } from '../core/projectiles.js?v=1';

state.projectiles.push(createPlayerProjectile({
  x,
  y,
  vx,
  vy,
  spell,
  life: 180,
}));

state.enemyProjectiles.push(createEnemyProjectile({
  x,
  y,
  vx,
  vy,
  kind: 'fire',
  dmg: 7,
  color: '#ff6a22',
  c2: '#ffd36a',
  life: 160,
}));
```

O contrato comum inclui `team`, `hostile`, `owner`, `spell`, `x`, `y`, `vx`, `vy`, `r`, `dmg`, `color`, `c2`, `life`, `age`, `trail`, `hitList`, `bounces`, `chains`, `growR` e `growDmg`.

---

## Inimigos por escola

`js/core/enemy-schools.js` deriva inimigos e spellbooks diretamente de `REGISTRY.SCHOOL_INFO` + `REGISTRY.SPELL_DEFS`; não mantenha listas manuais de magias por escola.

```js
import { buildEnemySchoolTypes, buildUniqueEnemyTypes, chooseEnemySpell, chooseRandomEnemyType } from './js/core/enemy-schools.js?v=1';
```

Regras:

- todo inimigo de escola usa `targetable: 'enemy'`, `schoolName`, `enemyKind` e `spellbook`;
- inimigos únicos usam `type: 'uniqueEnemy:<slug>'`, `uniqueName`, `archetype`, `signatureSpells` e também entram por `getEnemySchoolType(type, REGISTRY)`;
- `Ultimate`, categorias contendo `Ultimate` e descrições com `(Ultimate)` ficam fora do spellbook inimigo;
- `Summon` é permitido, mas summons inimigos não devem recursivamente conjurar novos summons;
- projéteis hostis continuam usando `createEnemyProjectile`;
- `js/core/enemy-learning.js` só influencia esquiva (`dodgeDir`, alcance de ameaça e chance de pulo), sem redesenhar a state machine de `updateEnemyAI`.

`chooseRandomEnemyType(REGISTRY, Math.random, { includeUniques: true })` pode misturar inimigos por escola e únicos sem criar botões de spawn extras. `render_game_to_text()` expõe `school`, `uniqueName`, `archetype`, `signatureSpells`, `aiState`, `learnedDodgeBias`, `spellbook`, `lastEnemySpell` e `enemyProjectiles[].spell/school` para validação determinística sem Playwright.

---

## State compartilhado

Todos os módulos importam o mesmo objeto:

```js
import { state } from '../core/state.js?v=7';
```

Arrays importantes:

| Campo | Uso |
|-------|-----|
| `particles` | Partículas livres |
| `projectiles` | Projéteis do jogador |
| `enemyProjectiles` | Projéteis hostis |
| `vfxSequences` | Efeitos com update/draw por frame |
| `entities` | Inimigos e props |
| `platforms` | Plataformas, incluindo segmentos manifestados sólidos |
| `manifestConstructs` | Constructs ativos de Manifest |
| `manifestDraft` | Primeiro ponto de spells de dois cliques |
| `dynamicLights`, `shockwaves`, `lightningBolts` | Camadas visuais |
| `frozenEntities`, `damageNumbers`, `gravityWells`, `fireWalls`, `poisonClouds`, `timeBombs` | Sistemas auxiliares |

Use `state.shake(n)` para screen shake, não atribuição direta em módulo de spell.

Embora as instruções gerais do projeto favoreçam imutabilidade, este engine usa `state` mutável de propósito para compartilhar referência entre módulos ES6.

---

## Utils principais

```js
import {
  spawnP,
  hurtEntity,
  explode,
  normAngle,
  isEnemyEntity,
  isPropEntity,
  nearestEnemyEntity,
} from '../core/utils.js?v=8';
```

`isEnemyEntity` e `nearestEnemyEntity` são preferíveis a loops que acertam qualquer entidade ativa, porque props como crate/barrel/boulder não devem ser alvos automáticos de spells de tracking.

Partículas:

```js
spawnP(x, y, '#ff4400', 4, 'burst');
```

Tipos úteis: `burst`, `explode`, `trail`, `sparkle`, `void`, `smoke`, `dust`, `cloud`, `ember`.

---

## Categoria Hold

Use `js/spells/hold.js` para magias sustentadas por mouse pressionado.

```js
import {
  createHoldSpell,
  HOLD_FIRE_HANDLERS,
  HOLD_VFX_UPDATE,
  HOLD_VFX_DRAW,
} from './hold.js?v=7';

export const SPELL_DEFS = [
  createHoldSpell({
    name: 'Slipstream',
    icon: '>',
    key: 'A',
    color: '#b8ecf6',
    c2: '#e8ffff',
    core: '#ffffff',
    mana: 16,
    cd: 820,
    dmg: 0,
    holdStyle: 'wind',
    holdProfile: 'wind_slipstream',
    holdWidth: 28,
    holdR: 96,
    holdDrain: 0.18,
    releaseR: 70,
    releaseDmg: 0,
    desc: 'Hold to sustain a pressure current',
  }),
];

export const FIRE_HANDLERS = {
  ...HOLD_FIRE_HANDLERS,
};

export const VFX_UPDATE = {
  ...HOLD_VFX_UPDATE,
};

export const VFX_DRAW = {
  ...HOLD_VFX_DRAW,
};
```

O helper cria:

- `category: 'Hold'`
- `isHoldSpell: true`
- VFX `element_hold`
- drain de mana durante canalização
- fase de release quando o mouse solta ou a mana acaba
- preview em `drawAimLine`
- texto de validação com `profile`, `targets` e `captured`

Perfis compartilhados existentes: `nature_briar`, `wind_slipstream`, `fire_kiln`, `water_undertow`, `lightning_snare`, `arcane_frame`, `void_grip`, `holy_column`, `chrono_frame`, `celestial_orbit`, `cinema_freeze`, `aetherforge_crucible`.

Se o comportamento não cabe nesses perfis, adicione um perfil no próprio `hold.js` em vez de duplicar toda a infraestrutura na escola.

---

## Categoria Manifest

Use `js/spells/manifest.js` para magias de dois cliques que constroem uma manifestação física ou energética.

```js
import {
  createManifestSpell,
  MANIFEST_FIRE_HANDLERS,
  MANIFEST_VFX_UPDATE,
  MANIFEST_VFX_DRAW,
} from './manifest.js?v=8';

export const SPELL_DEFS = [
  createManifestSpell({
    name: 'Air Pressure',
    icon: '~',
    color: '#9fe8ef',
    c2: '#d7ffff',
    core: '#ffffff',
    manifestStyle: 'wind',
    manifestEffect: 'wind_lift',
    manifestProfile: 'current',
    manifestGlyph: '~',
    manifestSolid: false,
    manifestDuration: 520,
    manifestArc: 30,
    manifestThickness: 24,
    manifestBuildRate: 0.06,
    desc: 'Manifest a pressure current',
  }),
];

export const FIRE_HANDLERS = {
  ...MANIFEST_FIRE_HANDLERS,
};

export const VFX_UPDATE = {
  ...MANIFEST_VFX_UPDATE,
};

export const VFX_DRAW = {
  ...MANIFEST_VFX_DRAW,
};
```

Fluxo:

1. Primeiro clique cria `state.manifestDraft` e um VFX `manifest_anchor`.
2. O mana é reembolsado com `state.refundSpellCast?.(idx, s.mana)` enquanto só existe P1.
3. Segundo clique cria `manifest_construct`.
4. Segmentos sólidos entram em `state.platforms`.
5. Segmentos não sólidos ficam visíveis e aplicam efeitos, mas não colidem.
6. `manifestDuration > 0` faz a construção expirar.

Campos úteis:

| Campo | Descrição |
|-------|-----------|
| `manifestStyle` | Paleta/motivo visual |
| `manifestEffect` | Efeito físico aplicado por frame |
| `manifestProfile` | Forma de desenho: `beam`, `current`, `conduit`, `track` |
| `manifestSolid` | `false` para não virar plataforma |
| `manifestDuration` | Vida em frames; `0` é persistente |
| `manifestMax` | Comprimento máximo |
| `manifestThickness` | Espessura visual/física |
| `manifestSegmentHp` | Vida de cada segmento |
| `manifestBuildRate` | Velocidade de crescimento |

Nature ainda tem `Wooden Construct` com implementação própria. Para novos manifests, prefira o helper genérico.

---

## Escolas agregadoras

Para escolas grandes, você pode quebrar por slices ou por magia.

`Aetherforge` agrega slices:

```js
import {
  ALPHA_SPELL_DEFS,
  ALPHA_FIRE_HANDLERS,
  ALPHA_PROJ_HOOKS,
  ALPHA_TRAIL_EMITTERS,
  ALPHA_VFX_UPDATE,
  ALPHA_VFX_DRAW,
} from './aetherforge-slice-alpha.js?v=8';
```

`Echolith` agrega um arquivo por magia:

```js
import {
  SPELL as RAY_SPELL,
  FIRE_HANDLERS as RAY_FIRE_HANDLERS,
  PROJ_HOOKS as RAY_PROJ_HOOKS,
  TRAIL_EMITTERS as RAY_TRAIL_EMITTERS,
  VFX_UPDATE as RAY_VFX_UPDATE,
  VFX_DRAW as RAY_VFX_DRAW,
} from './echolith-ray.js?v=4';
```

Use esse padrão quando o arquivo de escola passaria de centenas de linhas e ficaria difícil revisar.

---

## Sistema de Aliados (summons mortáveis)

`js/core/allies.js` fornece a base global para invocações que os inimigos podem
agredir e matar. É agnóstico de escola.

```js
import { createAlly } from '../core/allies.js?v=1';

// No FIRE_HANDLER: crie o corpo-aliado e guarde na VFX dona da invocação
const v = { type: 'minha_vfx', state: 0, age: 0, cx: tx, cy: ty, spell: s };
state.vfxSequences.push(v);
const ally = createAlly({
  x: tx - 8, y: ty - 17, w: 16, h: 34,
  mana: s.mana,        // HP = round(mana * 2)
  threat: 40,          // ~dps; a IA inimiga mira por ameaça/proximidade
  type: 'ally-minhaescola',
  color: s.color, c2: s.c2,
});
state.entities.push(ally);
v.ally = ally;
```

Na `VFX_UPDATE`, a cada frame: sincronize a posição (`ally.x = v.cx - ally.w/2`)
e detecte morte (`!ally.active || ally.hp <= 0`) para encerrar a invocação. Ao
expirar normalmente, marque `ally.active = false`. Veja os helpers `makeAlly`,
`syncAlly`, `endAlly` e `drawAllyHp` em `js/spells/elemental.js` como referência.

O engine trata aliados (`targetable: 'ally'`) assim:

- `physBody` e `collideEntities` os ignoram — a VFX dona controla a posição.
- `drawEntities` pula o sprite padrão — a escola desenha o guia.
- A IA inimiga escolhe alvo por **ameaça** (`chooseEnemyTarget`): player + aliados,
  ponderado por proximidade; o cast hostil (`castEnemySpell`) mira esse alvo.
- Projéteis inimigos causam dano a aliados.
- **Fogo amigo está LIGADO**: projéteis e explosões do player atingem aliados, e
  o `explode`/paredes de fogo também ferem o próprio player (respeitando `inv`).

> Migração: outras escolas com summons (categorias `Summon`/`Stand`) podem adotar
> o sistema repetindo o padrão acima. Cada uma tem VFX própria, então migre uma a
> uma e valide no browser.

## Sprite do player por escola

O player é desenhado por `drawStickman(p, color, accent, sCol)` em `arcane-modular.html`. Para dar a uma escola um visual próprio (skin/transmorfo), **não reescreva o renderer** — siga o padrão de `Constante`/`Aracnidea`:

1. Detecte a escola ativa no topo da função:
   ```js
   const isAracnidea = REGISTRY.SCHOOL_INFO[currentSchool]?.name === 'Aracnidea';
   if (isAracnidea) { color = '#3a1f5e'; accent = '#9cff57'; sCol = '#d8b4ff'; }
   ```
2. Interleave blocos `if (isAracnidea) { ... }` nos pontos certos do desenho (todos dentro do `X.save()`/transform local da função, origem nos pés, `+y` para baixo, flip por `facing`):
   - logo após `X.translate(cx, cy); X.scale(f,1)...` para camadas **atrás** do corpo (aura, membros extras);
   - no bloco da face/cabeça para olhos/feições;
   - troque o `else` do chapéu por `else if (isAracnidea) { ... }` para o capacete/carapaça.
3. Anime com `performance.now()` + `Math.sin`. Use formas simples (`fillRect`, segmentos, arcos) coerentes com a pixel art.
4. Para intensificar durante uma ultimate, guarde uma flag no player (ex.: `p.aracnideaUlt = true/false`) setada/limpa pelo VFX, e leia no `drawStickman`. Limpe a flag no estado terminal do VFX.

Trocar de escola volta o sprite ao normal automaticamente (a checagem usa `currentSchool`). Não introduza globais soltas para isso.

---

## VFX

VFX vive em `state.vfxSequences` e é identificado por `type`.

```js
state.vfxSequences.push({
  type: 'my_school_effect',
  state: 0,
  age: 0,
  cx: tx,
  cy: ty,
  spell: s,
});
```

Depois registre:

```js
export const VFX_UPDATE = {
  my_school_effect(v) {
    if (v.state === 0) {
      if (v.age === 1) state.shake(6);
      spawnP(v.cx, v.cy, v.spell.color, 2, 'sparkle');
      if (v.age > 30) {
        v.state = 1;
        v.age = 0;
      }
      return;
    }

    if (v.age > 20) {
      const idx = state.vfxSequences.indexOf(v);
      if (idx !== -1) state.vfxSequences.splice(idx, 1);
    }
  },
};

export const VFX_DRAW = {
  my_school_effect(v, X) {
    X.save();
    X.globalCompositeOperation = 'lighter';
    X.fillStyle = v.spell.core;
    X.beginPath();
    X.arc(v.cx, v.cy, 24, 0, Math.PI * 2);
    X.fill();
    X.restore();
  },
};
```

Para ultimates cinematográficas, use estados claros, duração previsível e restaure qualquer alteração temporária no player, especialmente `state.player.inv`.

---

## Testes e validação

Checagem rápida de sintaxe:

```bash
node --check js/spells/my-school.js
node --check js/spells/hold.js
node --check js/spells/manifest.js
```

Testes de contrato:

```bash
node --test tests/*.mjs        # roda tudo em tests/
npm test                       # = node --test tests/*.test.mjs (subconjunto *.test.mjs)
```

O projeto usa `node:test` e mocks simples de AudioContext nos testes. Ao mudar contratos de escola, projéteis, targeting, balanceamento, mobilidade ou texto temático, adicione ou atualize um teste em `tests/`.

Ao adicionar/remover escolas, **regenere o snapshot** (`npm run snapshot`) e rode `tests/registry-snapshot-contract.test.mjs` — ele compara o snapshot do lobby React com o registry vivo (ordem + contagem). Um teste de escola que importa um módulo ainda inexistente (escola em desenvolvimento por outro agente) falha com `ERR_MODULE_NOT_FOUND`; isso é esperado até o arquivo da escola existir e não bloqueia seu trabalho.

Para validação browser:

1. Suba o servidor local.
2. Abra `arcane-modular.html`.
3. Use o sandbox apropriado.
4. Verifique console sem erros.
5. Capture screenshots/state em `output/web-game/<nome-da-validacao>/`.

Hooks disponíveis no browser:

```js
window.advanceTime(ms)
window.render_game_to_text()
```

`render_game_to_text()` expõe player, entidades, projéteis, projéteis inimigos, VFX relevantes e manifests. Use para asserts determinísticos depois de interações Playwright.

---

## Boas práticas

- Prefira `FIRE_HANDLERS` para casts especiais e deixe o `pre_cast` padrão só para projéteis simples.
- Use `createPlayerProjectile` e `createEnemyProjectile` para qualquer projétil que possa ser capturado, refletido ou testado.
- Use `isEnemyEntity` em magias de targeting para não mirar props sem querer.
- Não duplique infraestrutura de `Hold` e `Manifest` em cada escola.
- Mantenha `type` de VFX único e prefixado pela escola ou sistema.
- Retorne `true` em `onLand` quando o hook já fez o impacto completo.
- Para spells de dois cliques, reembolse mana enquanto só existir o primeiro ponto.
- Para manifests não sólidos, garanta `manifestSolid: false` e valide que `platformSegments` fica `0`.
- Para ultimates que travam câmera/personagem, salve e restaure invulnerabilidade, velocidade e flags temporárias.
- Atualize `render_game_to_text()` quando criar um VFX que precisa de validação automatizada.
- Ao mudar comportamento crítico, rode testes de contrato e uma validação visual focada.

---

## Histórico recente

| Data | Mudança |
|------|---------|
| 2026-02 | Arquitetura modular criada com `state.js`, `utils.js`, `sounds.js` e `spell-registry.js`. |
| 2026-02 | Nature extraída como primeira escola ES6 e `arcane-modular.html` virou fluxo principal. |
| 2026-04 | Sistema `Manifest` generalizado em `js/spells/manifest.js` com perfis sólidos/não sólidos, duração, draft P1/P2 e validação via `render_game_to_text`. |
| 2026-04 | Categoria `Hold` criada em `js/spells/hold.js`, com canalização, mana drain, release e preview. |
| 2026-04 | Water, Wind e PureCinema receberam pacote de spells cinematográficas como `Riptide`, `Mirror Pool`, `Zephyr Dash`, `Dolly Zoom` e `Final Cut`. |
| 2026-04 | Lightning, Holy e PureCinema receberam spells cinematográficas novas, incluindo `Stormcaller`, `Radiant Cross`, `Consecrate`, `Bullet Time`, `Rack Focus` e `Director's Cut`. |
| 2026-05 | Registro expandido para 15 escolas com Aetherforge, Echolith, Tensorveil e Lust. |
| 2026-05 | Projéteis foram unificados em `js/core/projectiles.js` para player/enemy/reflection/capture. |
| 2026-05 | Testes de contrato adicionados em `tests/*.mjs` para balance, combate, escolas, mobilidade e unificação de projéteis. |
| 2026-05 | Escola Elemental refeita como pantheon de 7 invocações afro-indígenas (Oxóssi, Ogum, Pombagira, Exu, Preto-Velho, Erês, Gira). Documentado o bug latente de instância de `state` em `utils.js`. |
| 2026-05 | Sistema GLOBAL de aliados (`js/core/allies.js`): invocações viram entidades `targetable:'ally'` com HP = mana×2; IA inimiga mira por ameaça (player+aliados); fogo amigo e auto-dano do player ligados via `explode`/zonas. Elemental migrada como referência. |
| 2026-06 | Shell React em `src/` (lobby/seletor) documentado: lê `src/data/registry-snapshot.json` (gerado por `npm run snapshot`); adicionar escola exige META em `schools.js` + `--school-<slug>` no CSS + regenerar snapshot. |
| 2026-06 | Escola **Aracnidea** (10 magias): teias, veneno, casulos, emboscada. Inclui sprite transmorfo humano-aranha em `drawStickman` (aura, pernas espectrais, olhos, carapaça) e amplificação de Silk Fang dentro de Looming Web. |
