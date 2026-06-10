// End-to-end verification of the React shell → game flow.
// Requires the dev server running at http://localhost:5173.
import { chromium } from 'playwright';
import { mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const BASE = 'http://localhost:5173/';
const OUT = fileURLToPath(new URL('../verify-shots/', import.meta.url));
mkdirSync(OUT, { recursive: true });

// Expected roster size derived from the live registry snapshot so this check
// never goes stale when a new school is registered.
const snapshotPath = fileURLToPath(new URL('../src/data/registry-snapshot.json', import.meta.url));
const EXPECTED_SCHOOLS = JSON.parse(readFileSync(snapshotPath, 'utf8')).schools.length;

const ARCHETYPES = ['duelist', 'warden', 'artillery', 'controller', 'summoner'];
const results = [];
function check(name, ok, detail = '') { results.push({ name, ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} · ${name}${detail ? ' · ' + detail : ''}`); }

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('pageerror', (e) => console.log('PAGE ERROR:', e.message));

try {
  // ── Menu ──
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForSelector('.menu-title', { timeout: 8000 });
  check('Menu renderiza', !!(await page.$('.menu-title')));
  await page.screenshot({ path: OUT + '01-menu-1440.png' });

  // ── Lobby ──
  await page.click('button.vellum-btn--arcane');
  await page.waitForSelector('.lobby .class-name', { timeout: 8000 });
  check('Lobby renderiza', !!(await page.$('.lobby')));
  const schoolCount = await page.$$eval('.school', (els) => els.length);
  check(`${EXPECTED_SCHOOLS} escolas no roster`, schoolCount === EXPECTED_SCHOOLS, `achou ${schoolCount}`);
  await page.screenshot({ path: OUT + '02-lobby-1440.png' });

  // Select Fire and verify detail updates
  await page.click('button.school[title="Fire"]');
  const className = await page.textContent('.lobby .class-name');
  check('Selecionar Fire atualiza detalhe', (className || '').trim() === 'Fire', `class-name=${className}`);
  const spellCount = await page.$$eval('.spellbook .spell', (els) => els.length);
  check('Spellbook Fire tem magias reais', spellCount === 12, `achou ${spellCount}`);
  await page.screenshot({ path: OUT + '03-lobby-fire-1440.png' });

  // Select Dream and verify its spellbook surfaces
  await page.click('button.school[title="Dream"]');
  const dreamName = await page.textContent('.lobby .class-name');
  check('Selecionar Dream atualiza detalhe', (dreamName || '').trim() === 'Dream', `class-name=${dreamName}`);
  const dreamSpells = await page.$$eval('.spellbook .spell', (els) => els.length);
  check('Spellbook Dream tem 10 magias', dreamSpells === 10, `achou ${dreamSpells}`);
  await page.screenshot({ path: OUT + '03b-lobby-dream-1440.png' });

  // ── Battle ──
  await page.click('button.vellum-btn--arcane');
  await page.waitForSelector('iframe.battle-frame', { timeout: 8000 });
  // wait for the game frame + a settle for spawn
  await page.waitForTimeout(2500);

  const frame = page.frames().find((f) => f.url().includes('arcane-modular.html'));
  check('Iframe do jogo carregou', !!frame, frame ? frame.url() : 'sem frame');

  let snapshot = null;
  if (frame) {
    snapshot = await frame.evaluate(() => (window.render_game_to_text ? JSON.parse(window.render_game_to_text()) : null));
  }
  check('render_game_to_text disponível', !!snapshot);

  if (snapshot) {
    const enemies = (snapshot.entities || []).filter((e) => e.targetable === 'enemy');
    const archSet = new Set(enemies.map((e) => e.archetype).filter(Boolean));
    check('Inimigos entre 5 e 10', enemies.length >= 5 && enemies.length <= 10, `total=${enemies.length}`);
    const allArch = ARCHETYPES.every((a) => archSet.has(a));
    check('1 de cada arquétipo presente', allArch, `arquétipos=[${[...archSet].join(', ')}]`);
    const schools = new Set(enemies.map((e) => e.school).filter(Boolean));
    console.log(`   escolas dos inimigos: [${[...schools].join(', ')}]`);
  }
  await page.screenshot({ path: OUT + '04-battle-1440.png' });

  // ── Responsive lobby ──
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.click('button.vellum-btn--arcane');
  await page.waitForSelector('.lobby .class-name');
  for (const w of [1024, 768, 320]) {
    await page.setViewportSize({ width: w, height: 800 });
    await page.waitForTimeout(250);
    await page.screenshot({ path: `${OUT}lobby-${w}.png` });
  }
  check('Screenshots responsivos capturados', true);
} catch (err) {
  console.log('ERRO NA VERIFICAÇÃO:', err.message);
  check('Fluxo completo sem exceção', false, err.message);
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n── RESUMO: ${results.length - failed.length}/${results.length} OK ──`);
process.exit(failed.length ? 1 : 0);
