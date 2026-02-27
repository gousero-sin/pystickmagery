# ⚡ Arcane Sandbox — Dev Guide

> Guia de desenvolvimento para adicionar magias, efeitos e escolas ao projeto.

---

## Estrutura de arquivos

```
pystickmagery/
│
├── arcane-22spells.html      ← versão original (monolítica, sempre funciona)
├── arcane-modular.html       ← versão modular com ES6 imports ← use esta para dev
│
├── HOW_TO_DEV.md             ← este arquivo
│
└── js/
    ├── spell-registry.js     ← registro central — apenas edite aqui para adicionar escolas
    │
    ├── core/
    │   ├── state.js          ← estado global compartilhado (particles, entities, etc.)
    │   ├── sounds.js         ← SoundFX (Web Audio API)
    │   └── utils.js          ← spawnP, hurtEntity, explode, normAngle
    │
    └── spells/
        ├── nature.js         ← escola de Natureza (8 magias)  ← modelo para novas escolas
        ├── fire.js           ← (a criar)
        ├── ice.js            ← (a criar)
        ├── lightning.js      ← (a criar)
        ├── arcane.js         ← (a criar)
        ├── void.js           ← (a criar)
        └── holy.js           ← (a criar)
```

---

## Como rodar localmente

O `arcane-modular.html` usa ES6 modules, que **não funcionam com `file://`**.
Você precisa de um servidor local simples:

```bash
# Python (qualquer OS)
python3 -m http.server 8080
# acesse: http://localhost:8080/arcane-modular.html

# Node.js
npx serve .
# acesse: http://localhost:3000/arcane-modular.html

# VS Code
# instale a extensão "Live Server" e clique em "Go Live"
```

> O `arcane-22spells.html` (versão original) ainda abre direto no browser normalmente.

---

## Como criar uma nova escola de magia

Copie `js/spells/nature.js` como template e siga os passos:

### 1. Crie o arquivo da escola

```js
// js/spells/fire.js
import { state }            from '../core/state.js';
import { SoundFX }          from '../core/sounds.js';
import { spawnP, hurtEntity, explode } from '../core/utils.js';

// ── Definições das magias ──────────────────────────────
export const SPELL_DEFS = [
  {
    name: 'Fireball', icon: '🔥', key: '1',
    color: '#ff4400', c2: '#ffaa00', core: '#ffff88',
    speed: 9, dmg: 18, mana: 15, cd: 400, r: 5,
    grav: 0.05, drag: 0.999, bounce: 0,
    exR: 35, exF: 5, trail: 'fire',
    desc: 'Exploding fireball'
  },
  // ... mais magias
];

// ── Handlers de disparo (substituem inline em fireSpell) ──
export const FIRE_HANDLERS = {
  // isFireUltimate(s, ox, oy, tx, ty) { ... return true; }
};

// ── Hooks de projétil ─────────────────────────────────
export const PROJ_HOOKS = {
  // isMySplitSpell: { onUpdate(p, s) { ... return true to remove; } }
};

// ── Emissores de trilha ───────────────────────────────
export const TRAIL_EMITTERS = {
  // fire(p, s) { spawnP(p.x, p.y, '#ff4400', 1, 'trail'); }
};

// ── VFX Update (lógica frame-a-frame) ─────────────────
export const VFX_UPDATE = {
  // 'my-effect'(v) { if (v.state === 0) { ... } }
};

// ── VFX Draw (renderização) ───────────────────────────
export const VFX_DRAW = {
  // 'my-effect'(v, X) { X.save(); ... X.restore(); }
};
```

### 2. Registre no spell-registry.js

```js
// js/spell-registry.js
import * as Nature from './spells/nature.js';
import * as Fire   from './spells/fire.js';   // ← adicione aqui

const SCHOOLS = [
  Nature,
  Fire,   // ← e aqui
];
// O resto é automático — sem mais mudanças necessárias.
```

---

## Anatomia de uma magia

### Definição (SPELL_DEFS)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `name` | string | Nome exibido no tooltip |
| `icon` | string | Emoji do botão |
| `key` | string | Tecla de atalho |
| `color` / `c2` / `core` | hex | Cores primária, secundária, núcleo |
| `speed` | number | Velocidade do projétil (0 = sem projétil) |
| `dmg` | number | Dano base |
| `mana` | number | Custo de mana |
| `cd` | number | Cooldown em ms |
| `r` | number | Raio do projétil |
| `grav` | number | Gravidade (`+` cai, `-` sobe) |
| `drag` | number | Arrasto (`0.99` = lento, `1` = sem) |
| `bounce` | number | Número de ricochetes |
| `exR` / `exF` | number | Raio e força de explosão |
| `trail` | string | Nome do emissor de trilha |
| `desc` | string | Descrição curta |
| `isXxx: true` | flag | Flags que ativam comportamentos especiais |

### Flags de comportamento

Qualquer chave `isXxx: true` na definição pode ter um handler correspondente em:
- `FIRE_HANDLERS.isXxx` — disparo especial (substitui projétil padrão)
- `PROJ_HOOKS.isXxx.onUpdate` — atualização por frame
- `PROJ_HOOKS.isXxx.onPreCast` — substitui o disparo padrão no pre_cast
- `PROJ_HOOKS.isXxx.onLand` — ao colidir com plataforma ou entidade

---

## O ciclo de vida de uma magia

```
Clique do mouse
    │
    ▼
fireSpell(idx, ox, oy, tx, ty)
    │
    ├─ REGISTRY.FIRE_HANDLERS (ex: isWorldTree → spawna VFX e retorna)
    │
    ├─ Verificações inline (isSpike, isMeteor, etc. ainda no engine)
    │
    └─ pre_cast VFX → depois spawn projétil
              │
              ▼
         updateProjectiles() por frame
              │
              ├─ s._hook.onUpdate(p, s)      ← PROJ_HOOKS (nature, etc.)
              ├─ física (grav, drag, bounce)
              ├─ TRAIL_EMITTERS[s.trail](p, s)
              ├─ colisão com plataformas/entidades
              │       └─ s._hook.onLand(p, s, hitPlat, hitS)
              └─ remoção
```

---

## Como funciona o state.js

Todos os módulos compartilham **um único objeto mutável**:

```js
import { state } from '../core/state.js';

// Ler
const allParticles = state.particles;

// Escrever (muda para todos os módulos)
state.particles.push({ x: 100, y: 200, ... });
state.shake(10);   // helper para screenShake
```

Primitivos como `screenShake` ficam dentro de `state` e são acessados via `state.shake(n)` para garantir que a mutação funcione entre módulos ES6.

---

## Partículas — referência rápida

```js
import { spawnP } from '../core/utils.js';

spawnP(x, y, '#ff4400', count, type);
```

| `type` | Comportamento |
|--------|---------------|
| `'burst'` | Explosão rápida |
| `'explode'` | Debris com gravidade |
| `'sparkle'` | Brilho suave |
| `'trail'` | Trilha leve |
| `'smoke'` | Sobe devagar |
| `'dust'` | Poeira rasteira |
| `'void'` | Sobe, sem gravidade |
| `'cloud'` | Grande e difuso |
| `'ember'` | Brasa com gravidade |

---

## VFX — padrão de máquina de estados

Todo efeito especial usa `vfxSequences` com um padrão de estados:

```js
export const VFX_UPDATE = {
  'meu-efeito'(v) {
    const s = v.spell;   // definição da magia

    if (v.state === 0) {
      // ── Setup inicial (roda 1 vez) ──
      if (v.age === 1) {
        SoundFX.playSweep(200, 800, 'sine', 0.5, 0.3);
        state.shake(10);
      }
      // ── Partículas por frame ──
      spawnP(v.cx, v.cy, s.color, 2, 'burst');
      // ── Transição de estado ──
      if (v.age > 30) { v.state = 1; v.age = 0; }

    } else if (v.state === 1) {
      // ... próxima fase
      if (v.age > 20) {
        // Remover ao final
        const idx = state.vfxSequences.indexOf(v);
        if (idx !== -1) state.vfxSequences.splice(idx, 1);
      }
    }
  },
};
```

Para efeitos cinematográficos (como a World Tree), use 5-7 estados com duração de ~10-60 frames cada, totalizando ~300 frames (5 segundos a 60fps).

---

## Boas práticas

- **Nunca** importe `state` de outro módulo que não seja `js/core/state.js`
- **Sempre** use `state.shake(n)` em vez de `screenShake = n` (funciona entre módulos)
- **Um arquivo por escola** — não coloque Fire e Ice no mesmo arquivo
- **Deixe os IDs de VFX únicos** — use prefixo da escola: `'fire-volcano'`, `'nature-worldtree'`
- **Documente os flags** — cada `isXxx: true` deve ter um comentário explicando o que dispara
- **Para efeitos grandes** (ultimates): sempre `state.player.inv = true` no início e `false` ao liberar o jogador

---

## Histórico de mudanças relevantes

| Data | Mudança |
|------|---------|
| 2026-02 | Arquitetura modular criada (state.js, utils.js, sounds.js) |
| 2026-02 | `nature.js` extraído como primeira escola ES6 |
| 2026-02 | World Tree ultimate corrigido (bug no dispatch) + 6-estados cinematográficos |
| 2026-02 | Razor Leaf → leque de 3 folhas, Vine Grapple → ponte visual, Spore Burst → pop cinematográfico |
| 2026-02 | `spell-registry.js` + `arcane-modular.html` — versão modular jogável |
