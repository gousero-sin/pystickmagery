import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const { isEnemyEntity, isPropEntity, nearestEnemyEntity } = await import('../js/core/utils.js');

test('enemy targeting helpers reject props and accept combatants', () => {
  assert.equal(isEnemyEntity({ active: true, type: 'crate' }), false);
  assert.equal(isEnemyEntity({ active: true, type: 'barrel', explosive: true }), false);
  assert.equal(isEnemyEntity({ active: true, type: 'boulder' }), false);
  assert.equal(isEnemyEntity({ active: true, type: 'dummy' }), true);
  assert.equal(isEnemyEntity({ active: true, type: 'fireMage' }), true);
  assert.equal(isEnemyEntity({ active: true, type: 'iceMage' }), true);
  assert.equal(isPropEntity({ active: true, type: 'crate' }), true);
  assert.equal(isPropEntity({ active: true, type: 'dummy' }), false);
});

test('nearest enemy ignores closer props while tracking', () => {
  const entities = [
    { active: true, type: 'crate', x: 4, y: 0, w: 20, h: 20 },
    { active: true, type: 'barrel', x: 10, y: 0, w: 16, h: 22 },
    { active: true, type: 'boulder', x: 15, y: 0, w: 24, h: 22 },
    { active: true, type: 'iceMage', x: 80, y: 0, w: 14, h: 30 },
  ];

  const target = nearestEnemyEntity(0, 0, 200, entities);
  assert.equal(target?.type, 'iceMage');
});

test('object durability and combat UI contracts are present in the game shell', async () => {
  const source = await readFile(new URL('../arcane-modular.html', import.meta.url), 'utf8');

  assert.match(source, /case 'crate': return \{[\s\S]*hp: 40/);
  assert.match(source, /case 'barrel': return \{[\s\S]*explosive: true/);
  assert.match(source, /case 'boulder': return \{[\s\S]*hp: 220/);
  assert.match(source, /detonateBarrel/);
  assert.match(source, /btnAggro/);
  assert.match(source, /enemyProjectiles/);
});
