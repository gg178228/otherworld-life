import type {
  Ability,
  Character,
  ChronicleEntry,
  EventProposal,
  GameEffect,
  GameState,
  Relative,
} from './types';

const NATIONS = ['벨카른 변경령', '모르카이 군도', '아르덴 회색왕국'];
const NAMES = ['리안', '세린', '카엘', '미레', '도란', '이셀', '하린', '베른'];
const FAMILY_NAMES = ['까마귀문', '회색밀밭', '늪의 종', '검은 솔기', '녹슨 종'];
const LOCATIONS = ['갈대무덤 마을', '회색나루', '장송의 숲', '검은 종루'];
const ABILITIES: Ability[] = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];

function random(state: GameState): number {
  state.rngState = (Math.imul(state.rngState, 1664525) + 1013904223) >>> 0;
  return state.rngState / 4294967296;
}

function pick<T>(state: GameState, values: readonly T[]): T {
  return values[Math.floor(random(state) * values.length)];
}

function entry(state: GameState, category: ChronicleEntry['category'], title: string, detail: string): void {
  state.chronicle.unshift({
    id: `${state.eventCount}-${state.character.ageMonths}-${state.chronicle.length}`,
    ageMonths: state.character.ageMonths,
    category,
    title,
    detail,
  });
  state.chronicle = state.chronicle.slice(0, 80);
}

function relative(state: GameState, relation: string, names: readonly string[]): Relative {
  return {
    id: `npc-${state.eventCount}-${state.character.relatives.length}`,
    name: pick(state, names),
    relation,
    status: 'alive',
    affinity: 20 + Math.floor(random(state) * 51),
  };
}

export function createLife(seed = Date.now()): GameState {
  const safeSeed = (seed >>> 0) || 1;
  const state: GameState = {
    version: 1 as const,
    seed: safeSeed,
    rngState: safeSeed,
    character: {
      name: '',
      race: '인간' as Character['race'],
      nation: '',
      gender: '여성' as Character['gender'],
      family: '',
      className: '평민',
      jobOpportunity: '',
      status: '이름 없는 아이',
      ageMonths: 0,
      health: 82,
      wealth: 12,
      location: '',
      occupation: '아직 없음',
      abilities: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 },
      relatives: [],
      flags: [],
    },
    world: { unrest: 27, hunger: 22, danger: 31, year: 1 },
    activeEvent: null,
    chronicle: [],
    dead: false,
    deathCause: null,
    eventCount: 0,
  };

  state.character.name = pick(state, NAMES);
  state.character.race = pick(state, ['인간', '엘프', '수인']);
  state.character.nation = pick(state, NATIONS);
  state.character.gender = pick(state, ['여성', '남성', '논바이너리']);
  state.character.family = `${pick(state, FAMILY_NAMES)} 가문`;
  state.character.className = pick(state, ['농노', '평민', '상인 가문', '몰락 귀족']);
  state.character.location = pick(state, LOCATIONS);
  for (const ability of ABILITIES) {
    state.character.abilities[ability] = 7 + Math.floor(random(state) * 8);
  }
  const strongestAbility = ABILITIES.reduce((strongest, ability) =>
    state.character.abilities[ability] > state.character.abilities[strongest] ? ability : strongest,
  );
  state.character.jobOpportunity = strongestAbility === 'STR' || strongestAbility === 'CON'
    ? '변경 수비대'
    : strongestAbility === 'INT' || strongestAbility === 'WIS'
      ? '수도원 필경사'
      : '강나루 밀수꾼';
  state.character.wealth = state.character.className === '농노'
    ? 3
    : state.character.className === '상인 가문'
      ? 28
      : state.character.className === '몰락 귀족'
        ? 18
        : 12;
  state.character.relatives = [];
  state.character.relatives.push(relative(state, '어머니', NAMES));
  state.character.relatives.push(relative(state, '아버지', NAMES));
  state.character.relatives.push(relative(state, '형제', NAMES));
  entry(state, 'birth', '태어나다', `${state.character.nation}의 ${state.character.location}, ${state.character.family}에서 ${state.character.name}이(가) 태어났다.`);
  return state;
}

function makeEvent(state: GameState): EventProposal {
  const { character, world } = state;
  const age = Math.floor(character.ageMonths / 12);
  const eventNumber = state.eventCount++;

  if (age < 6) {
    return {
      id: `child-${eventNumber}`,
      title: '겨울의 열병',
      description: '긴 겨울이 닥쳤다. 이웃 아이들이 열에 쓰러지고, 집안의 약초도 바닥을 보인다.',
      choices: [
        { id: 'herbs', text: '약초꾼에게 가진 돈을 모두 맡긴다', check: { ability: 'WIS', dc: 12 }, onSuccess: [{ type: 'HEALTH_CHANGE', amount: 12 }, { type: 'WEALTH_CHANGE', amount: -7 }], onFailure: [{ type: 'WEALTH_CHANGE', amount: -7 }], successText: '쓴 약이 열을 가라앉혔다.', failureText: '약초는 효과가 없었지만 빚만 남았다.' },
        { id: 'care', text: '가족 곁에서 버틴다', check: { ability: 'CON', dc: 11 }, onSuccess: [{ type: 'HEALTH_CHANGE', amount: 8 }, { type: 'RELATION_CHANGE', amount: 4 }], onFailure: [{ type: 'HEALTH_CHANGE', amount: -9 }], successText: '가족의 보살핌으로 고비를 넘겼다.', failureText: '열이 폐까지 내려갔다.' },
        { id: 'prayer', text: '종루에 남은 빵을 구하러 보낸다', check: { ability: 'CHA', dc: 13 }, onSuccess: [{ type: 'HEALTH_CHANGE', amount: 6 }, { type: 'ADD_FLAG', value: '종루의 은혜' }], onFailure: [{ type: 'RELATION_CHANGE', amount: -4 }], successText: '낡은 종지기가 빵과 담요를 내주었다.', failureText: '문전에서 쫓겨나 가족의 원망만 샀다.' },
      ],
    };
  }

  if (age < 16) {
    return {
      id: `youth-${eventNumber}`,
      title: pick(state, ['수몰된 예배당', '숲 가장자리의 발자국', '장터의 낯선 서신']),
      description: '어른들이 외면한 일을 당신은 보았다. 그날의 선택은 아직 어린 당신에게도 값을 요구한다.',
      choices: [
        { id: 'investigate', text: '혼자 흔적을 따라간다', check: { ability: 'DEX', dc: 13 }, onSuccess: [{ type: 'ADD_FLAG', value: '숲의 비밀' }, { type: 'WEALTH_CHANGE', amount: 5 }], onFailure: [{ type: 'HEALTH_CHANGE', amount: -8 }], successText: '숨겨진 물건을 찾아냈다.', failureText: '돌아오는 길에 크게 다쳤다.' },
        { id: 'tell', text: '가족에게 먼저 알린다', check: { ability: 'WIS', dc: 11 }, onSuccess: [{ type: 'RELATION_CHANGE', amount: 6 }, { type: 'ADD_FLAG', value: '가족의 신뢰' }], onFailure: [{ type: 'RELATION_CHANGE', amount: -2 }], successText: '가족은 당신을 믿고 함께 움직였다.', failureText: '어른들은 아이의 말을 믿지 않았다.' },
        { id: 'ignore', text: '모른 척하고 하루 품삯을 번다', onSuccess: [{ type: 'WEALTH_CHANGE', amount: 8 }], successText: '작은 품삯이 손에 들어왔다.' },
      ],
    };
  }

  if (age < 55 && character.occupation === '아직 없음') {
    return {
      id: `work-${eventNumber}`,
      title: '갈라지는 길',
      description: '흉작과 징집 소문 속에서도 생계를 꾸려야 한다. 세 갈래 길 중 하나가 당신을 기다린다.',
      choices: [
        { id: 'guard', text: '변경 수비대에 지원한다', check: { ability: 'STR', dc: 12, proficiency: 1 }, onSuccess: [{ type: 'JOB_CHANGE', value: '변경 수비대' }, { type: 'WEALTH_CHANGE', amount: 12 }, { type: 'ADD_FLAG', value: '군번표' }], onFailure: [{ type: 'HEALTH_CHANGE', amount: -5 }, { type: 'JOB_CHANGE', value: '날품팔이' }], successText: '낡은 창과 군번표를 받았다.', failureText: '시험에서 떨어지고 막일을 구했다.' },
        { id: 'scribe', text: '수도원의 필경 견습이 된다', check: { ability: 'INT', dc: 12 }, onSuccess: [{ type: 'JOB_CHANGE', value: '수도원 필경사' }, { type: 'ADD_FLAG', value: '봉인된 서고' }], onFailure: [{ type: 'JOB_CHANGE', value: '묘지기' }], successText: '사본실의 문이 열렸다.', failureText: '글재주는 인정받지 못해 묘지에 배치됐다.' },
        { id: 'trade', text: '밀수꾼의 짐꾼이 된다', check: { ability: 'CHA', dc: 13 }, onSuccess: [{ type: 'JOB_CHANGE', value: '강나루 밀수꾼' }, { type: 'WEALTH_CHANGE', amount: 18 }], onFailure: [{ type: 'HEALTH_CHANGE', amount: -10 }, { type: 'WEALTH_CHANGE', amount: -6 }], successText: '강 건너에서 제 몫을 챙겼다.', failureText: '단속에 걸려 짐과 돈을 빼앗겼다.' },
      ],
    };
  }

  if (world.hunger > 52) {
    return {
      id: `famine-${eventNumber}`,
      title: '빈 곡물창고',
      description: '곡물 가격이 다시 올랐다. 창고 앞에는 굶주린 사람들이 모이고, 경비병은 활시위를 당긴다.',
      choices: [
        { id: 'ration', text: '가족 몫을 줄여 비축한다', check: { ability: 'WIS', dc: 13 }, onSuccess: [{ type: 'WEALTH_CHANGE', amount: -8 }, { type: 'HEALTH_CHANGE', amount: 5 }], onFailure: [{ type: 'HEALTH_CHANGE', amount: -7 }], successText: '겨울을 버틸 곡물을 숨겼다.', failureText: '배급은 끊기고 식구들이 앓기 시작했다.' },
        { id: 'work', text: '곡물 호송대를 경호한다', check: { ability: 'STR', dc: 12 }, onSuccess: [{ type: 'WEALTH_CHANGE', amount: 15 }, { type: 'HEALTH_CHANGE', amount: -2 }], onFailure: [{ type: 'HEALTH_CHANGE', amount: -12 }], successText: '호송을 마치고 보수를 받았다.', failureText: '길에서 습격을 당했다.' },
        { id: 'share', text: '이웃과 식량을 나눈다', check: { ability: 'CHA', dc: 11 }, onSuccess: [{ type: 'RELATION_CHANGE', amount: 8 }, { type: 'ADD_FLAG', value: '굶주린 이들의 빚' }], onFailure: [{ type: 'WEALTH_CHANGE', amount: -10 }], successText: '사람들이 당신의 이름을 기억했다.', failureText: '식량은 모자랐고 비축분만 사라졌다.' },
      ],
    };
  }

  return {
    id: `road-${eventNumber}`,
    title: pick(state, ['봉인된 통행세', '폐허에서 온 전령', '검은 안개 경보', '사라진 야간 순찰대']),
    description: '변경의 소문은 늘 반쯤 진실이다. 하지만 이번에는 종소리까지 다르다.',
    choices: [
      { id: 'invest', text: '위험을 감수하고 직접 확인한다', check: { ability: 'DEX', dc: 13 }, onSuccess: [{ type: 'WEALTH_CHANGE', amount: 13 }, { type: 'ADD_FLAG', value: '변경의 목격자' }], onFailure: [{ type: 'HEALTH_CHANGE', amount: -11 }], successText: '소문의 근원을 찾아 보상까지 받아냈다.', failureText: '돌아오는 길에 칼을 맞았다.' },
      { id: 'negotiate', text: '영주 대리인과 거래한다', check: { ability: 'CHA', dc: 12 }, onSuccess: [{ type: 'WEALTH_CHANGE', amount: 9 }, { type: 'JOB_CHANGE', value: '영주의 연락책' }], onFailure: [{ type: 'WEALTH_CHANGE', amount: -5 }], successText: '대리인은 당신에게 일을 맡겼다.', failureText: '거래가 틀어져 수수료만 날렸다.' },
      { id: 'shelter', text: '가족을 데리고 성벽 안에 숨는다', check: { ability: 'WIS', dc: 11 }, onSuccess: [{ type: 'HEALTH_CHANGE', amount: 7 }, { type: 'RELATION_CHANGE', amount: 3 }], onFailure: [{ type: 'WEALTH_CHANGE', amount: -8 }], successText: '며칠 뒤 경보가 거짓이었음이 드러났다.', failureText: '피난 비용으로 남은 돈을 거의 다 썼다.' },
    ],
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function applyEffects(state: GameState, effects: GameEffect[]): void {
  const { character } = state;
  for (const effect of effects) {
    switch (effect.type) {
      case 'HEALTH_CHANGE':
        character.health = clamp(character.health + clamp(effect.amount ?? 0, -30, 20), 0, 100);
        break;
      case 'WEALTH_CHANGE':
        character.wealth = clamp(character.wealth + clamp(effect.amount ?? 0, -50, 100), 0, 999);
        break;
      case 'RELATION_CHANGE':
        for (const familyMember of character.relatives) {
          if (familyMember.status === 'alive') familyMember.affinity = clamp(familyMember.affinity + clamp(effect.amount ?? 0, -20, 20), 0, 100);
        }
        break;
      case 'ADD_FLAG':
        if (effect.value && !character.flags.includes(effect.value)) character.flags.push(effect.value);
        break;
      case 'JOB_CHANGE':
        if (effect.value) character.occupation = effect.value.slice(0, 40);
        break;
      case 'LOCATION_CHANGE':
        if (effect.value && LOCATIONS.includes(effect.value)) character.location = effect.value;
        break;
      case 'NPC_STATUS_CHANGE': {
        const npc = character.relatives.find((item) => item.id === effect.targetId);
        if (npc) npc.status = effect.value === 'dead' ? 'dead' : 'alive';
        break;
      }
    }
  }
}

export function resolveChoice(current: GameState, choiceId: string): GameState {
  if (current.dead || !current.activeEvent) return current;
  const state: GameState = structuredClone(current);
  if (!state.activeEvent) return current;
  const event = state.activeEvent;
  const choice = event.choices.find((item) => item.id === choiceId);
  if (!choice) return current;

  let succeeded = true;
  if (choice.check) {
    const roll = 1 + Math.floor(random(state) * 20);
    const abilityScore = state.character.abilities[choice.check.ability];
    const modifier = Math.floor((abilityScore - 10) / 2);
    const proficiency = choice.check.proficiency ?? 0;
    const total = roll + modifier + proficiency;
    succeeded = total >= choice.check.dc;
    entry(
      state,
      'check',
      `${event.title}: ${succeeded ? '성공' : '실패'}`,
      `D20 ${roll} ${modifier >= 0 ? '+' : ''}${modifier} 능력 보정 + ${proficiency} 숙련 = ${total} / DC ${choice.check.dc}. ${succeeded ? '성공' : '실패'}`,
    );
  }

  const effects = succeeded ? choice.onSuccess : (choice.onFailure ?? []);
  applyEffects(state, effects);
  entry(state, 'choice', choice.text, succeeded ? choice.successText : (choice.failureText ?? '시도는 아무런 결실도 맺지 못했다.'));
  state.activeEvent = null;
  if (state.character.health <= 0) endLife(state, '사건으로 입은 상처가 악화되었다.');
  return state;
}

function endLife(state: GameState, cause: string): void {
  if (state.dead) return;
  state.dead = true;
  state.deathCause = cause;
  state.activeEvent = null;
  entry(state, 'death', '마지막 숨', cause);
}

function annualUpdate(state: GameState): void {
  const { character, world } = state;
  const age = Math.floor(character.ageMonths / 12);
  world.year += 1;
  world.unrest = clamp(world.unrest + Math.floor(random(state) * 13) - 5, 0, 100);
  world.hunger = clamp(world.hunger + Math.floor(random(state) * 15) - 7, 0, 100);
  world.danger = clamp(world.danger + Math.floor(random(state) * 11) - 4, 0, 100);

  if (age >= 16 && character.occupation !== '아직 없음') {
    const income = character.occupation === '강나루 밀수꾼' ? 18 : character.occupation === '날품팔이' ? 8 : 13;
    character.wealth = clamp(character.wealth + income - 7, 0, 999);
  } else if (age >= 16) {
    character.wealth = clamp(character.wealth - 4, 0, 999);
  }
  if (age > 48) character.health = clamp(character.health - 1 - Math.floor(random(state) * 2), 0, 100);
  if (age > 68) character.health = clamp(character.health - 1 - Math.floor(random(state) * 3), 0, 100);
  if (character.wealth === 0 && age >= 16 && random(state) < 0.25) character.health = clamp(character.health - 3, 0, 100);

  entry(state, 'year', `${age}세, ${character.occupation}`, `${character.location}에서 한 해를 보냈다. 수입과 생활비를 정산했다.`);
  if (character.health <= 0) {
    endLife(state, '오랜 병과 굶주림이 끝내 몸을 무너뜨렸다.');
  } else if (age > 84 || (age > 58 && random(state) < (age - 58) * 0.018)) {
    endLife(state, '긴 세월 끝에 심장이 멎었다.');
  }
}

export function advanceMonth(current: GameState): GameState {
  if (current.dead || current.activeEvent) return current;
  const state: GameState = structuredClone(current);
  state.character.ageMonths += 1;
  const age = Math.floor(state.character.ageMonths / 12);

  if (state.character.ageMonths % 12 === 0) {
    annualUpdate(state);
    if (state.dead) return state;
  }

  const milestone = [6, 12, 16, 18, 25, 40, 60].includes(age) && state.character.ageMonths % 12 === 0;
  const annualChance = state.character.ageMonths % 12 === 0 && random(state) < 0.7;
  if (milestone || annualChance) state.activeEvent = makeEvent(state);
  return state;
}

export function advanceToEvent(current: GameState, maxMonths = 36): GameState {
  let state = current;
  for (let month = 0; month < maxMonths && !state.dead && !state.activeEvent; month += 1) {
    state = advanceMonth(state);
  }
  return state;
}

export function ageLabel(ageMonths: number): string {
  const years = Math.floor(ageMonths / 12);
  const months = ageMonths % 12;
  return months === 0 ? `${years}세` : `${years}세 ${months}개월`;
}

export const ABILITY_LABELS: Record<Ability, string> = {
  STR: '근력', DEX: '민첩', CON: '체력', INT: '지능', WIS: '지혜', CHA: '매력',
};
