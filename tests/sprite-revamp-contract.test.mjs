import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../game.html', import.meta.url), 'utf8');

test('training mode is available from the grimoire and pause menu', () => {
  assert.match(source, /id="btnStartTraining"/, 'grimoire should expose a free training entry');
  assert.match(source, /function startTraining\(si\)/, 'engine should start a selected school in training mode');
  assert.match(source, /function toggleTrainingCombat\(\)/, 'pause should toggle combat while training');
  assert.match(source, /id="btnSpawnDummy"/, 'pause should spawn training dummies');
  assert.match(source, /id="btnSpawnEnemy"/, 'pause should spawn live enemy test targets');
  assert.match(source, /id="btnSpawnBarrel"/, 'pause should spawn prop test targets');
});

test('animation state is exposed for visual validation', () => {
  assert.match(source, /animation:/, 'render_game_to_text should include animation telemetry');
  assert.match(source, /ghosts: player\.ghosts\.length/, 'player ghost count should be observable');
  assert.match(source, /hitstop/, 'hitstop should be observable for impact tuning');
  assert.match(source, /training: shell\.training/, 'text state should expose training mode');
  assert.match(source, /combatEnabled: enemiesAggressive/, 'text state should expose combat toggle');
});

test('stick rigs include IK, expressive eyes, hit flash, and ragdoll juice', () => {
  assert.match(source, /function solveTwoBoneIK\(/, 'player and enemy limbs should use a shared two-bone IK helper');
  assert.match(source, /drawExpressiveEyes\(/, 'rig should draw aim/impact-aware eyes');
  assert.match(source, /drawRiggedEnemy\(/, 'enemies should share the new rigged stick renderer');
  assert.match(source, /spawnRagdoll/, 'kills should keep ragdoll juice');
});

test('jump input is pressure-sensitive and supports deliberate double jump', () => {
  assert.match(source, /jumpBufferMs/, 'jump should use a buffer instead of mutating key state directly');
  assert.match(source, /coyoteMs/, 'ground jump should tolerate a small ledge grace window');
  assert.match(source, /jumpHoldMs/, 'jump height should be controlled by how long the key is held');
  assert.match(source, /releasedJump/, 'releasing jump should cut upward velocity');
  assert.match(source, /performPlayerJump\(p, jumpIndex/, 'first and second jumps should be explicit events');
});

test('player feet and arms have dedicated sprite details', () => {
  assert.match(source, /function drawPlayerFoot\(/, 'feet should be drawn as readable angled sprites');
  assert.match(source, /function drawPlayerHand\(/, 'hands should be drawn separately from arm bones');
  assert.match(source, /footPlant/, 'foot plant should drive walk-cycle pose and audio');
  assert.match(source, /armLag/, 'arms should lag/swing instead of snapping rigidly');
});

test('animation audio follows sounds-on-the-web accessibility rules', async () => {
  const sounds = await readFile(new URL('../js/core/sounds.js', import.meta.url), 'utf8');

  assert.match(sounds, /prefers-reduced-motion: reduce/, 'SoundFX should respect reduced motion as sound sensitivity');
  assert.match(sounds, /setEnabled/, 'SoundFX should expose a sound toggle');
  assert.match(sounds, /setVolume/, 'SoundFX should expose independent volume control');
  assert.match(sounds, /DEFAULT_VOLUME = 0\.28/, 'default animation volume should be subtle');

  assert.match(source, /id="btnSoundToggle"/, 'pause menu should expose sound toggle');
  assert.match(source, /id="btnSoundDown"/, 'pause menu should expose volume down');
  assert.match(source, /id="btnSoundUp"/, 'pause menu should expose volume up');
  assert.match(source, /playMovementSound\(/, 'movement audio should be centralized and rate-limited');
  assert.match(source, /movementAudioCooldown/, 'footstep audio should not fire every frame');
});

test('player animation uses physics impulses and spring recovery', () => {
  assert.match(source, /physicsAnim:/, 'player should own a physics animation state object');
  assert.match(source, /function kickPlayerPhysicsAnim\(/, 'events should kick animation impulses');
  assert.match(source, /function updatePlayerPhysicsAnim\(/, 'physics animation should recover via spring/damping');
  assert.match(source, /kickPlayerPhysicsAnim\('jump'/, 'jump should add a body impulse');
  assert.match(source, /kickPlayerPhysicsAnim\('doubleJump'/, 'double jump should add a stronger impulse');
  assert.match(source, /kickPlayerPhysicsAnim\('land'/, 'landing should add impact compression');
  assert.match(source, /kickPlayerPhysicsAnim\('cast'/, 'casting should recoil arms/staff');
  assert.match(source, /kickPlayerPhysicsAnim\('hit'/, 'damage should kick the body pose');
});

test('physics animation is rendered and exposed for visual validation', () => {
  assert.match(source, /torsoRot: Math\.round\(pa\.torsoRot/, 'telemetry should expose torso spring');
  assert.match(source, /bodyY: Math\.round\(pa\.bodyY/, 'telemetry should expose vertical body spring');
  assert.match(source, /armRecoil: Math\.round\(pa\.armRecoil/, 'telemetry should expose arm recoil');
  assert.match(source, /legTuck: Math\.round\(pa\.legTuck/, 'telemetry should expose air leg tuck');
  assert.match(source, /const physics = p\.physicsAnim/, 'renderer should read physics animation state');
  assert.match(source, /physics\.headLagY/, 'head should lag independently from torso');
});

test('player limbs have independent procedural physics springs', () => {
  assert.match(source, /leadHandX:/, 'lead hand should have its own spring state');
  assert.match(source, /offHandX:/, 'off hand should have its own spring state');
  assert.match(source, /leadFootX:/, 'lead foot should have its own spring state');
  assert.match(source, /offFootX:/, 'off foot should have its own spring state');
  assert.match(source, /spineWhip:/, 'spine should have a whip/spring state');
  assert.match(source, /function updatePlayerLimbSprings\(/, 'limb springs should be updated separately from body squash');
  assert.match(source, /springPlayerAnim\(pa, 'leadHandX'/, 'lead hand should recover through the spring integrator');
  assert.match(source, /springPlayerAnim\(pa, 'leadFootX'/, 'lead foot should recover through the spring integrator');
});

test('procedural limb physics is rendered and measurable', () => {
  assert.match(source, /const limbLeadHandX = physics\.leadHandX/, 'renderer should apply lead hand physics');
  assert.match(source, /const limbLeadFootX = physics\.leadFootX/, 'renderer should apply foot physics');
  assert.match(source, /bezierCurveTo\(physics\.spineWhip/, 'torso should bend with spine whip instead of a rigid line only');
  assert.match(source, /leadHand: Math\.round\(pa\.leadHandX/, 'telemetry should expose lead hand spring');
  assert.match(source, /leadFoot: Math\.round\(pa\.leadFootX/, 'telemetry should expose lead foot spring');
  assert.match(source, /spineWhip: Math\.round\(pa\.spineWhip/, 'telemetry should expose spine whip spring');
});
