// Verificação E2E do jogo desktop (game.html).
// Requer o servidor rodando: node scripts/serve.mjs 8123
// Percorre: título → grimório → batalha → pausa → vitória → nova onda → derrota.
// Captura screenshots em resoluções desktop comuns em verify-shots/desktop/.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const BASE = process.env.GAME_URL || 'http://localhost:8123/game.html';
const OUT = fileURLToPath(new URL('../verify-shots/desktop/', import.meta.url));
mkdirSync(OUT, { recursive: true });

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'} · ${name}${detail ? ' · ' + detail : ''}`);
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => console.log('PAGE ERROR:', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE ERROR:', m.text()); });

const shellState = () => page.evaluate(() => window.__smb?.shell.state);

try {
  // ── Título ──
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForSelector('#screenTitle:not(.hidden)', { timeout: 8000 });
  check('Título renderiza', true);
  check('Estado inicial = title', (await shellState()) === 'title');
  await page.screenshot({ path: OUT + '01-title-1280x720.png' });

  // ── Grimório via ENTER ──
  await page.keyboard.press('Enter');
  await page.waitForSelector('#screenSelect:not(.hidden)', { timeout: 4000 });
  check('ENTER abre o grimório', (await shellState()) === 'select');
  const cells = await page.$$eval('.school-cell', (els) => els.length);
  check('21 escolas no grimório', cells === 21, `achou ${cells}`);
  await page.screenshot({ path: OUT + '02-select-1280x720.png' });

  // Navegação por teclado + seleção do Fire por clique
  await page.keyboard.press('ArrowRight');
  await page.click('.school-cell[title="Fire"]');
  const detName = (await page.textContent('#detailName'))?.trim();
  check('Detalhe atualiza para Fire', detName === 'Fire', `detail=${detName}`);
  const spellRows = await page.$$eval('#detailSpells .spell-row-item', (els) => els.length);
  check('Spellbook do Fire com 12 magias', spellRows === 12, `achou ${spellRows}`);

  // ── Batalha ──
  await page.click('#btnStartBattle');
  await page.waitForSelector('#hud:not(.hidden)', { timeout: 4000 });
  check('Batalha inicia com HUD visível', (await shellState()) === 'battle');
  await page.waitForTimeout(1200);

  const snap = await page.evaluate(() => JSON.parse(window.render_game_to_text()));
  const enemies = snap.entities.filter((e) => e.targetable === 'enemy');
  check('Onda com 5–10 inimigos', enemies.length >= 5 && enemies.length <= 10, `total=${enemies.length}`);
  check('Inimigos agressivos', snap.enemiesAggressive === true);
  const archSet = new Set(enemies.map((e) => e.archetype).filter(Boolean));
  check('Arquétipos únicos presentes', archSet.size === 5, `[${[...archSet].join(', ')}]`);

  const hudEnemies = await page.textContent('#hudEnemies');
  check('HUD mostra contagem de inimigos', Number(hudEnemies) === enemies.length, `hud=${hudEnemies}`);
  const slots = await page.$$eval('#hotbar .slot', (els) => els.length);
  check('Hotbar com as 12 magias do Fire', slots === 12, `slots=${slots}`);

  // Conjura uma magia clicando no canvas e confere o cooldown
  await page.click('canvas#c', { position: { x: 640, y: 200 } });
  await page.waitForTimeout(150);
  const cdActive = await page.$$eval('#hotbar .slot-cd', (els) => els.some((el) => parseFloat(el.style.height) > 0));
  check('Cooldown aparece na hotbar após conjurar', cdActive);

  // Hotkey troca de magia
  await page.keyboard.press('5');
  const activeIdx = await page.$eval('#hotbar .slot.active', (el) => Number(el.dataset.spellIndex));
  const fifthIdx = await page.$$eval('#hotbar .slot', (els) => Number(els[4].dataset.spellIndex));
  check('Hotkey 5 equipa a 5ª magia', activeIdx === fifthIdx, `ativo=${activeIdx}`);
  await page.screenshot({ path: OUT + '03-battle-1280x720.png' });

  // ── Pausa ──
  await page.keyboard.press('Escape');
  await page.waitForSelector('#screenPause:not(.hidden)', { timeout: 2000 });
  check('ESC pausa', await page.evaluate(() => window.__smb.shell.paused));
  await page.screenshot({ path: OUT + '04-pause-1280x720.png' });
  await page.click('#btnResume');
  check('Continuar retoma', await page.evaluate(() => !window.__smb.shell.paused));

  // ── Vitória (forçada via hook de debug) ──
  await page.evaluate(() => window.__smb.winNow());
  await page.waitForSelector('#screenEnd:not(.hidden)', { timeout: 4000 });
  const endTitle = (await page.textContent('#endTitle'))?.trim();
  check('Vitória detectada', endTitle === 'Vitória', `título=${endTitle}`);
  await page.screenshot({ path: OUT + '05-victory-1280x720.png' });

  // ── Nova onda a partir da vitória ──
  await page.click('#btnEndRetry');
  await page.waitForTimeout(800);
  check('Nova onda reinicia a batalha', (await shellState()) === 'battle');
  const snap2 = await page.evaluate(() => JSON.parse(window.render_game_to_text()));
  const enemies2 = snap2.entities.filter((e) => e.targetable === 'enemy').length;
  check('Nova onda tem inimigos', enemies2 >= 5, `total=${enemies2}`);

  // ── Derrota (forçada) ──
  await page.evaluate(() => window.__smb.loseNow());
  await page.waitForSelector('#screenEnd:not(.hidden)', { timeout: 4000 });
  const endTitle2 = (await page.textContent('#endTitle'))?.trim();
  check('Derrota detectada', endTitle2 === 'Derrota', `título=${endTitle2}`);
  await page.screenshot({ path: OUT + '06-defeat-1280x720.png' });

  // ── Voltar ao menu ──
  await page.click('#btnEndMenu');
  check('Menu principal de volta', (await shellState()) === 'title');

  // ── Resoluções desktop ──
  for (const [w, h, tag] of [[1366, 768, '1366x768'], [1440, 900, '1440x900'], [1920, 1080, '1920x1080'], [2560, 1080, 'ultrawide']]) {
    await page.setViewportSize({ width: w, height: h });
    await page.waitForTimeout(200);
    await page.evaluate(() => window.__smb.startBattle(2)); // Fire
    await page.waitForTimeout(700);
    const canvasBox = await page.$eval('canvas#c', (el) => el.getBoundingClientRect());
    const cover = Math.max(canvasBox.width / w, canvasBox.height / h);
    check(`Canvas preenche bem ${tag}`, cover > 0.95, `cobertura=${(cover * 100).toFixed(0)}%`);
    await page.screenshot({ path: `${OUT}07-battle-${tag}.png` });
    await page.evaluate(() => window.__smb.goTitle());
  }
} catch (err) {
  console.log('ERRO NA VERIFICAÇÃO:', err.message);
  check('Fluxo completo sem exceção', false, err.message);
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n── RESUMO: ${results.length - failed.length}/${results.length} OK ──`);
process.exit(failed.length ? 1 : 0);
