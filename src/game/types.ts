export type Ability = 'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA';
export type EffectType =
  | 'HEALTH_CHANGE'
  | 'WEALTH_CHANGE'
  | 'RELATION_CHANGE'
  | 'ADD_FLAG'
  | 'JOB_CHANGE'
  | 'LOCATION_CHANGE'
  | 'NPC_STATUS_CHANGE';

export interface Check {
  ability: Ability;
  dc: number;
  proficiency?: number;
}

export interface GameEffect {
  type: EffectType;
  amount?: number;
  value?: string;
  targetId?: string;
}

export interface Choice {
  id: string;
  text: string;
  check?: Check;
  onSuccess: GameEffect[];
  onFailure?: GameEffect[];
  successText: string;
  failureText?: string;
}

export interface EventProposal {
  id: string;
  title: string;
  description: string;
  choices: Choice[];
}

export interface Relative {
  id: string;
  name: string;
  relation: string;
  status: 'alive' | 'dead';
  affinity: number;
}

export interface Character {
  name: string;
  race: '인간' | '엘프' | '수인';
  nation: string;
  gender: '여성' | '남성' | '논바이너리';
  family: string;
  className: string;
  jobOpportunity: string;
  status: string;
  ageMonths: number;
  health: number;
  wealth: number;
  location: string;
  occupation: string;
  abilities: Record<Ability, number>;
  relatives: Relative[];
  flags: string[];
}

export interface WorldState {
  unrest: number;
  hunger: number;
  danger: number;
  year: number;
}

export interface ChronicleEntry {
  id: string;
  ageMonths: number;
  category: 'birth' | 'year' | 'choice' | 'check' | 'death';
  title: string;
  detail: string;
}

export interface GameState {
  version: 1;
  seed: number;
  rngState: number;
  character: Character;
  world: WorldState;
  activeEvent: EventProposal | null;
  chronicle: ChronicleEntry[];
  dead: boolean;
  deathCause: string | null;
  eventCount: number;
}
