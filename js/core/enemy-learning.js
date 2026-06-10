// enemy-learning.js — tiny per-enemy dodge memory

const MAX_SAMPLES = 12;
const DEFAULT_BIAS = Object.freeze({
  direction: 0,
  confidence: 0,
  threatRangeBonus: 0,
  jumpBias: 0,
});

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function centerOf(entity) {
  return {
    x: (entity?.x || 0) + (entity?.w || 0) / 2,
    y: (entity?.y || 0) + (entity?.h || 0) / 2,
  };
}

function threatLane(enemy, threat) {
  const ec = centerOf(enemy);
  const dx = (threat?.x || 0) - ec.x;
  const dy = (threat?.y || 0) - ec.y;
  const speed = Math.hypot(threat?.vx || 0, threat?.vy || 0);
  const horizontal = Math.abs(dx) >= Math.abs(dy);
  return {
    dx,
    dy,
    side: dx >= 0 ? 1 : -1,
    vertical: dy >= 0 ? 1 : -1,
    horizontal,
    speed,
  };
}

export function initEnemyLearning(existing = null) {
  if (existing?.samples && existing?.dodges) return existing;
  return {
    samples: [],
    dodges: {
      left: { tries: 0, success: 0 },
      right: { tries: 0, success: 0 },
      jump: { tries: 0, success: 0 },
    },
    lastBias: { ...DEFAULT_BIAS },
  };
}

export function recordThreatSample(enemy, threat, distance = Infinity) {
  if (!enemy || !threat) return initEnemyLearning(enemy?.ai?.learning);
  const learning = initEnemyLearning(enemy.ai?.learning);
  if (enemy.ai) enemy.ai.learning = learning;
  const lane = threatLane(enemy, threat);
  learning.samples.push({
    side: lane.side,
    vertical: lane.vertical,
    horizontal: lane.horizontal,
    speed: lane.speed,
    dmg: threat.dmg || threat.spell?.dmg || 0,
    distance,
    age: 0,
  });
  if (learning.samples.length > MAX_SAMPLES) learning.samples.shift();
  return learning;
}

export function recordDodgeOutcome(enemy, direction = 0, avoided = false) {
  if (!enemy) return null;
  const learning = initEnemyLearning(enemy.ai?.learning);
  if (enemy.ai) enemy.ai.learning = learning;
  const key = direction === 0 ? 'jump' : direction < 0 ? 'left' : 'right';
  learning.dodges[key].tries += 1;
  if (avoided) learning.dodges[key].success += 1;
  return learning;
}

function successRate(bucket) {
  if (!bucket || bucket.tries <= 0) return 0;
  return bucket.success / bucket.tries;
}

export function getDodgeBias(enemy, threat = null) {
  const learning = initEnemyLearning(enemy?.ai?.learning);
  if (!enemy?.ai) return { ...DEFAULT_BIAS };
  enemy.ai.learning = learning;
  if (learning.samples.length === 0) {
    learning.lastBias = { ...DEFAULT_BIAS };
    return learning.lastBias;
  }

  const latest = threat ? threatLane(enemy, threat) : null;
  const incomingSide = latest?.side || learning.samples.at(-1)?.side || 1;
  const awayFromThreat = incomingSide > 0 ? -1 : 1;
  const awayKey = awayFromThreat < 0 ? 'left' : 'right';
  const otherKey = awayFromThreat < 0 ? 'right' : 'left';
  const awayRate = successRate(learning.dodges[awayKey]);
  const otherRate = successRate(learning.dodges[otherKey]);
  const recentPressure = learning.samples.reduce((total, sample, idx) => {
    const recency = (idx + 1) / learning.samples.length;
    const rangeWeight = clamp(1 - (sample.distance || 0) / 140, 0.1, 1);
    const speedWeight = clamp(sample.speed / 10, 0.15, 1.2);
    return total + recency * rangeWeight * speedWeight;
  }, 0);

  const confidence = clamp(recentPressure / 4 + Math.abs(awayRate - otherRate) * 0.4, 0, 1);
  const learnedDir = awayRate >= otherRate ? awayFromThreat : -awayFromThreat;
  const jumpRate = successRate(learning.dodges.jump);
  const jumpBias = clamp(jumpRate + confidence * 0.35, 0, 1);

  learning.lastBias = {
    direction: learnedDir,
    confidence,
    threatRangeBonus: Math.round(confidence * 45),
    jumpBias,
  };
  return learning.lastBias;
}

export function ageEnemyLearning(enemy) {
  const learning = initEnemyLearning(enemy?.ai?.learning);
  if (enemy?.ai) enemy.ai.learning = learning;
  for (const sample of learning.samples) sample.age += 1;
  while (learning.samples.length > 0 && learning.samples[0].age > 900) {
    learning.samples.shift();
  }
  return learning;
}
