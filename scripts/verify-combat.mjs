// Verifies the duel rules: enemies aggressive, school locked (spells limited),
// player is mortal, and death returns to the lobby. Requires dev server at :5173.
import { chromium } from 'playwright';

const BASE = 'http://localhost:5173/';
const results = [];
function check(name, ok, detail = '') { results.push({ ok }); console.log(`${ok ? 'PASS' : 'FAIL'} · ${name}${detail ? ' · ' + detail : ''}`); }

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

try {
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.click('button.vellum-btn--arcane');                 // Menu → Lobby
  await page.waitForSelector('.lobby .class-name');
  await page.click('button.school[title="Fire"]');
  await page.click('button.vellum-btn--arcane');                 // Lobby → Battle
  await page.waitForSelector('iframe.battle-frame');
  await page.waitForTimeout(2500);

  let frame = page.frames().find((f) => f.url().includes('arcane-modular.html'));
  check('Iframe do jogo carregou', !!frame);

  const snap0 = await frame.evaluate(() => JSON.parse(window.render_game_to_text()));
  check('Inimigos agressivos no duelo', snap0.enemiesAggressive === true, `enemiesAggressive=${snap0.enemiesAggressive}`);

  const dom = await frame.evaluate(() => ({
    locked: document.getElementById('schoolSelect')?.disabled === true,
    spellButtons: document.querySelectorAll('#spellRow .spell-btn').length,
  }));
  check('Escola travada (dropdown disabled)', dom.locked);
  check('Spells limitados à escola Fire (12 botões)', dom.spellButtons === 12, `botões=${dom.spellButtons}`);

  const hp0 = snap0.player.hp;
  check('Player tem vida (0 < HP ≤ 100)', hp0 > 0 && hp0 <= 100, `hp0=${hp0}`);

  // Walk the player right into the enemy cluster so it reliably takes hits.
  await frame.evaluate(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'd' })));

  let died = false;
  let lastHp = hp0;
  for (let i = 0; i < 40; i++) { // up to ~24s
    await page.waitForTimeout(600);
    let hp;
    try {
      frame = page.frames().find((f) => f.url().includes('arcane-modular.html'));
      if (!frame) { died = true; break; } // iframe gone → returned to lobby
      const s = await frame.evaluate(() => JSON.parse(window.render_game_to_text()));
      hp = s.player.hp;
    } catch {
      died = true; break; // frame detached → battle ended
    }
    lastHp = hp;
    if (hp <= 0) { died = true; break; }
  }

  check('Player é mortal (HP caiu abaixo de 100)', lastHp < hp0 || died, `hpFinal=${lastHp}`);

  // Confirm the shell returned to the lobby after death.
  await page.waitForTimeout(800);
  const backToLobby = await page.$('.lobby .class-name');
  check('Morte retorna ao lobby', !!backToLobby || died, backToLobby ? 'lobby visível' : `died=${died}`);
} catch (err) {
  console.log('ERRO:', err.message);
  check('Sem exceção', false, err.message);
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok).length;
console.log(`\n── RESUMO: ${results.length - failed}/${results.length} OK ──`);
process.exit(failed ? 1 : 0);
