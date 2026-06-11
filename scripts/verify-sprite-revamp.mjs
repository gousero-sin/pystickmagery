import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL || 'http://127.0.0.1:5173/game.html';
const OUT = 'output/web-game/sprite-revamp';

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} · ${name}${detail ? ' · ' + detail : ''}`);
}

async function readState(page) {
  return page.evaluate(() => JSON.parse(window.render_game_to_text()));
}

async function waitGround(page) {
  for (let i = 0; i < 90; i++) {
    const snap = await readState(page);
    if (snap.player.onGround) return snap;
    await page.waitForTimeout(34);
  }
  return readState(page);
}

async function measureJump(page, holdMs) {
  await waitGround(page);
  const start = await readState(page);
  let minY = start.player.y;
  await page.keyboard.down('w');
  await page.waitForTimeout(holdMs);
  await page.keyboard.up('w');
  for (let i = 0; i < 26; i++) {
    await page.waitForTimeout(34);
    const snap = await readState(page);
    minY = Math.min(minY, snap.player.y);
  }
  const end = await readState(page);
  return { startY: start.player.y, minY, height: start.player.y - minY, end };
}

await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (err) => errors.push(err.message));
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(msg.text());
});

try {
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.click('#btnPlay');
  await page.waitForSelector('#screenSelect:not(.hidden)');
  await page.click('#btnStartTraining');
  await page.waitForSelector('#hud:not(.hidden)');
  await page.waitForTimeout(250);

  let snap = await page.evaluate(() => JSON.parse(window.render_game_to_text()));
  check('Treino inicia pelo grimório', snap.training === true);
  check('Combate inicia desligado no treino', snap.combatEnabled === false);

  await page.keyboard.press('Escape');
  await page.waitForSelector('#screenPause:not(.hidden)');
  await page.click('#btnSpawnDummy');
  await page.click('#btnSpawnEnemy');
  await page.click('#btnSpawnBarrel');
  await page.click('#btnToggleCombat');
  await page.click('#btnResume');
  await page.waitForTimeout(250);

  snap = await page.evaluate(() => JSON.parse(window.render_game_to_text()));
  check('Spawns de teste criam alvos', snap.entities.length >= 3, `entities=${snap.entities.length}`);
  check('Toggle de combate liga agressividade', snap.combatEnabled === true);
  check('Telemetria de animação expõe squash/ghosts', typeof snap.animation?.player?.squash === 'number' && typeof snap.animation?.player?.ghosts === 'number');

  await page.keyboard.down('d');
  await page.waitForTimeout(650);
  await page.keyboard.up('d');
  await page.keyboard.press('w');
  await page.waitForTimeout(300);
  snap = await page.evaluate(() => JSON.parse(window.render_game_to_text()));
  check('Movimento gera frame animado observável', snap.animation.player.ghosts > 0 || Math.abs(snap.player.vx) > 0.5 || snap.animation.player.flip > 0, JSON.stringify(snap.animation.player));
  check(
    'Molas de membros reagem ao movimento',
    Math.abs(snap.animation.player.physics?.leadFoot || 0) > 0.05 ||
      Math.abs(snap.animation.player.physics?.offFoot || 0) > 0.05 ||
      Math.abs(snap.animation.player.physics?.spineWhip || 0) > 0.05,
    JSON.stringify(snap.animation.player.physics || {})
  );

  await page.evaluate(() => window.__smb.restartWave());
  const shortHop = await measureJump(page, 42);
  await page.evaluate(() => window.__smb.restartWave());
  const heldJump = await measureJump(page, 220);
  check('Pulo responde ao tempo pressionado', heldJump.height > shortHop.height + 14, `short=${shortHop.height}, held=${heldJump.height}`);

  await page.evaluate(() => window.__smb.restartWave());
  await waitGround(page);
  await page.keyboard.press('w');
  await page.waitForTimeout(155);
  await page.keyboard.press('w');
  await page.waitForTimeout(120);
  snap = await readState(page);
  check('Double jump exige nova pressão e aciona flip', snap.animation.player.flip > 0 || snap.player.jumpCount >= 2, `jumpCount=${snap.player.jumpCount}, flip=${snap.animation.player.flip}`);
  check(
    'Molas físicas reagem ao double jump',
    Math.abs(snap.animation.player.physics?.bodyY || 0) > 0.1 ||
      Math.abs(snap.animation.player.physics?.torsoRot || 0) > 0.03 ||
      Math.abs(snap.animation.player.physics?.armRecoil || 0) > 0.05 ||
      (snap.animation.player.physics?.legTuck || 0) > 0.05,
    JSON.stringify(snap.animation.player.physics || {})
  );

  await page.mouse.click(940, 430);
  await page.waitForTimeout(120);
  snap = await readState(page);
  check(
    'Cast aciona mão/staff e coluna procedurais',
    Math.abs(snap.animation.player.physics?.leadHand || 0) > 0.08 ||
      Math.abs(snap.animation.player.physics?.offHand || 0) > 0.08 ||
      Math.abs(snap.animation.player.physics?.spineWhip || 0) > 0.08,
    JSON.stringify(snap.animation.player.physics || {})
  );

  await page.screenshot({ path: `${OUT}/training-rig.png`, fullPage: true });
  await writeFile(`${OUT}/state.json`, JSON.stringify(snap, null, 2));
  check('Sem erros de console/runtime', errors.length === 0, errors.slice(0, 3).join(' | '));
} catch (err) {
  errors.push(err.message);
  check('Execução Playwright sem exceção', false, err.message);
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok).length;
console.log(`\n-- RESUMO: ${results.length - failed}/${results.length} OK --`);
process.exit(failed ? 1 : 0);
