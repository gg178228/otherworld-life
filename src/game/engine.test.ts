import { describe, expect, it } from 'vitest';
import { advanceMonth, advanceToEvent, createLife, resolveChoice } from './engine';

describe('life simulation loop', () => {
  it('creates a reproducible birth with a family and valid abilities', () => {
    const first = createLife(412);
    const second = createLife(412);
    expect(first.character).toEqual(second.character);
    expect(first.character.relatives).toHaveLength(3);
    expect(new Set(first.character.relatives.map((person) => person.id)).size).toBe(3);
    expect(['농노', '평민', '상인 가문', '몰락 귀족']).toContain(first.character.className);
    expect(['변경 수비대', '수도원 필경사', '강나루 밀수꾼']).toContain(first.character.jobOpportunity);
    expect(Object.values(first.character.abilities).every((score) => score >= 7 && score <= 14)).toBe(true);
  });

  it('pauses monthly progression at an event and resolves a valid choice', () => {
    let state = createLife(90);
    state = advanceToEvent(state);
    expect(state.activeEvent).not.toBeNull();
    const choice = state.activeEvent!.choices[0];
    const resolved = resolveChoice(state, choice.id);
    expect(resolved.activeEvent).toBeNull();
    expect(resolved.chronicle.some((item) => item.category === 'choice')).toBe(true);
    expect(resolved.chronicle.some((item) => item.category === 'check')).toBe(choice.check !== undefined);
  });

  it('records a natural 1 as a normal roll and never applies out-of-range effects', () => {
    const state = createLife(1);
    state.activeEvent = {
      id: 'test', title: '시험', description: '시험',
      choices: [{
        id: 'risky', text: '위험한 선택', check: { ability: 'STR', dc: 30 },
        onSuccess: [{ type: 'WEALTH_CHANGE', amount: 10000 }],
        onFailure: [{ type: 'HEALTH_CHANGE', amount: -10000 }],
        successText: '성공', failureText: '실패',
      }],
    };
    const result = resolveChoice(state, 'risky');
    expect(result.character.health).toBeGreaterThanOrEqual(0);
    expect(result.character.health).toBeGreaterThanOrEqual(52);
    expect(result.chronicle[1].detail).toMatch(/D20 \d+ [+-]\d+ 능력 보정 \+ 0 숙련 = \d+ \/ DC 30/);
  });

  it('can progress deterministically through event choices and eventually die', () => {
    let state = createLife(777);
    for (let step = 0; step < 2400 && !state.dead; step += 1) {
      if (state.activeEvent) {
        state = resolveChoice(state, state.activeEvent.choices[0].id);
      } else {
        state = advanceMonth(state);
      }
    }
    expect(state.dead).toBe(true);
    expect(state.deathCause).toBeTruthy();
    expect(state.chronicle.some((item) => item.category === 'death')).toBe(true);
  });

  it('completes 100 seeded lifetimes without runtime errors and records varied jobs', () => {
    const jobCounts = new Map<string, number>();
    for (let seed = 1; seed <= 100; seed += 1) {
      let state = createLife(seed);
      for (let month = 0; month < 1400 && !state.dead; month += 1) {
        if (state.activeEvent) {
          const choiceIndex = (seed + state.eventCount) % state.activeEvent.choices.length;
          state = resolveChoice(state, state.activeEvent.choices[choiceIndex].id);
        } else {
          state = advanceMonth(state);
        }
      }
      expect(state.dead, `seed ${seed} did not reach death`).toBe(true);
      expect(state.chronicle.some((item) => item.category === 'death')).toBe(true);
      jobCounts.set(state.character.occupation, (jobCounts.get(state.character.occupation) ?? 0) + 1);
    }
    expect(jobCounts.size).toBeGreaterThan(1);
  });
});
