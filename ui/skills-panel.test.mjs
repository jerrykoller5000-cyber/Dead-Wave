import test from 'node:test';
import assert from 'node:assert/strict';
import { createSkills } from '../game/skills.js';
import { skillProgress, SKILL_KEYS } from './skills-panel.js';
import { text } from './strings.js';

test('all six skill rows show the next rank and cap cleanly', () => {
  assert.equal(SKILL_KEYS.length, 6);
  const skills = createSkills();
  assert.deepEqual(skillProgress(skills, 'legs'), { rank: 0, xp: 0, from: 0, to: 20, fraction: 0 });
  skills.legs = { xp: 40, rank: 1 };
  assert.deepEqual(skillProgress(skills, 'legs'), { rank: 1, xp: 40, from: 20, to: 60, fraction: 0.5 });
  skills.legs = { xp: 360, rank: 5 };
  assert.deepEqual(skillProgress(skills, 'legs'), { rank: 5, xp: 360, from: 360, to: undefined, fraction: 1 });
});

test('rank and streak words distinguish earned skills from temporary boosts', () => {
  assert.equal(text('skills.rankToast', { name: text('skills.legs.name'), rank: 2 }), 'Fleet foot · rank 2');
  assert.equal(text('streak.fastFeet'), 'light step');
  assert.equal(text('streak.quickHands'), 'steady hands');
  assert.doesNotMatch(text('tips.interaction.kiosk'), /perks/i);
});
