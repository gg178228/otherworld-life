import { useEffect, useState } from 'react';
import { ABILITY_LABELS, advanceMonth, advanceToEvent, ageLabel, createLife, resolveChoice } from './game/engine';
import type { Ability, GameState } from './game/types';

const SAVE_KEY = 'ashen-years-save-v1';
const SPEEDS = [1, 2, 4, 8, 16] as const;
const SPEED_INTERVALS: Record<number, number> = { 1: 1600, 2: 800, 4: 400, 8: 200, 16: 100 };
const ABILITIES: Ability[] = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];

function loadGame(): GameState {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const saved = JSON.parse(raw) as GameState;
      if (saved.version === 1 && saved.character && Array.isArray(saved.chronicle)) return saved;
    }
  } catch {
    localStorage.removeItem(SAVE_KEY);
  }
  return createLife();
}

function App() {
  const [game, setGame] = useState<GameState>(loadGame);
  const [speed, setSpeed] = useState(0);
  const character = game.character;
  const age = Math.floor(character.ageMonths / 12);
  const atBirth = character.ageMonths === 0 && !game.activeEvent && !game.dead;

  useEffect(() => {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(game));
    } catch {
      // The current life remains playable if browser storage is unavailable.
    }
  }, [game]);

  useEffect(() => {
    if (!speed || game.dead || game.activeEvent || atBirth) return;
    const timer = window.setInterval(() => {
      setGame((current) => advanceMonth(current));
    }, SPEED_INTERVALS[speed]);
    return () => window.clearInterval(timer);
  }, [speed, game.dead, game.activeEvent, atBirth]);

  useEffect(() => {
    if (game.activeEvent || game.dead) setSpeed(0);
  }, [game.activeEvent, game.dead]);

  function startLife(): void {
    setGame(createLife());
    setSpeed(0);
  }

  function begin(): void {
    setGame((current) => advanceToEvent(current));
  }

  function choose(choiceId: string): void {
    setGame((current) => resolveChoice(current, choiceId));
  }

  function advanceOneMonth(): void {
    setGame((current) => advanceMonth(current));
  }

  function advanceToNextEvent(): void {
    setSpeed(0);
    setGame((current) => advanceToEvent(current));
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="wordmark" href="#top" aria-label="잿빛 세월 처음으로">
          <span className="wordmark-seal">잿</span>
          <span><strong>잿빛 세월</strong><small>THE ASHEN YEARS</small></span>
        </a>
        <div className="topbar-right">
          <span className="save-state"><i /> 브라우저에 기록 중</span>
          <span className="cycle-count">제 {game.eventCount + 1}장</span>
        </div>
      </header>

      <section className="landscape" id="top" aria-label="회색왕국의 안개 낀 숲">
        <div className="landscape-copy">
          <span className="eyebrow">{character.nation} · 회색 달력 {game.world.year}년</span>
          <h1>태어난 곳은<br /><em>{character.location}</em></h1>
          <p>종소리가 세 번 울리면, 숲은 그날의 이름을 삼킨다.</p>
        </div>
        <div className="weather-stamp"><span>현재의 징조</span><strong>{game.world.hunger > 55 ? '흉작' : game.world.danger > 65 ? '국경 소요' : '검은 안개'}</strong></div>
      </section>

      <div className="dashboard">
        <aside className="left-column" aria-label="인물 정보">
          <section className="identity-panel">
            <div className="portrait-mark" aria-hidden="true"><span>{character.name.slice(0, 1)}</span></div>
            <div className="identity-heading">
              <span className="eyebrow">이번 생의 이름</span>
              <h2>{character.name}</h2>
              <p>{character.race} · {character.gender}</p>
            </div>
            <div className="identity-rule" />
            <dl className="facts-list">
              <div><dt>가문</dt><dd>{character.family}</dd></div>
              <div><dt>태어난 곳</dt><dd>{character.nation}</dd></div>
              <div><dt>출생 계층</dt><dd>{character.className}</dd></div>
              <div><dt>신분</dt><dd>{character.status}</dd></div>
              <div><dt>직업</dt><dd>{character.occupation}</dd></div>
              <div><dt>나이</dt><dd>{ageLabel(character.ageMonths)}</dd></div>
              <div><dt>직업 기회</dt><dd>{character.jobOpportunity}</dd></div>
              <div><dt>재산</dt><dd>{character.wealth}<small> 은화</small></dd></div>
            </dl>
          </section>

          <section className="side-section vitals-section">
            <div className="section-heading"><h3>몸과 기운</h3><span>{character.health} / 100</span></div>
            <div className="health-track" role="meter" aria-label="건강" aria-valuemin={0} aria-valuemax={100} aria-valuenow={character.health}>
              <span style={{ width: `${character.health}%` }} />
            </div>
            <div className="ability-list">
              {ABILITIES.map((ability) => (
                <div className="ability-row" key={ability}>
                  <span>{ABILITY_LABELS[ability]}</span>
                  <div className="ability-track"><i style={{ width: `${(character.abilities[ability] / 18) * 100}%` }} /></div>
                  <strong>{character.abilities[ability]}</strong>
                </div>
              ))}
            </div>
          </section>

          <section className="side-section family-section">
            <div className="section-heading"><h3>가족과 인연</h3><span>{character.relatives.filter((person) => person.status === 'alive').length} 생존</span></div>
            <ul className="family-list">
              {character.relatives.map((person) => (
                <li key={person.id} className={person.status === 'dead' ? 'relative-dead' : ''}>
                  <span className="relative-seal">{person.name.slice(0, 1)}</span>
                  <span className="relative-name"><strong>{person.name}</strong><small>{person.relation}</small></span>
                  <span className="affinity" aria-label={`유대 ${person.affinity}%`}>{person.status === 'dead' ? '사망' : `${person.affinity}%`}</span>
                </li>
              ))}
            </ul>
          </section>
        </aside>

        <section className="main-column" aria-label="생애 진행">
          <div className="life-heading">
            <div><span className="eyebrow">생애 기록 · {character.nation}</span><h2>{game.dead ? '한 생이 끝나다' : atBirth ? '첫 숨' : `${age}년째의 삶`}</h2></div>
            <span className={`life-status ${game.dead ? 'status-dead' : ''}`}><i />{game.dead ? '기록 종료' : atBirth ? '출생' : game.activeEvent ? '결정 대기' : '흐르는 시간'}</span>
          </div>

          {atBirth && (
            <article className="birth-card">
              <div className="birth-ornament" aria-hidden="true">✳</div>
              <span className="eyebrow">기록 제 001호 · 출생</span>
              <h3>{character.name}, {character.location}의 아이</h3>
              <p>{character.nation}의 변두리, {character.family}에서 한 아이가 태어났다. 세상은 이미 기울어 있었고, 누구도 아이에게 오래 살 거라 약속하지 않았다.</p>
              <div className="birth-summary"><span>{character.race}</span><span>{character.gender}</span><span>{character.className}</span><span>직업 기회 · {character.jobOpportunity}</span></div>
              <button className="primary-button" onClick={begin}>이 생을 시작한다 <span aria-hidden="true">↗</span></button>
            </article>
          )}

          {game.activeEvent && !game.dead && (
            <article className="event-card" aria-live="polite">
              <div className="event-topline"><span className="event-mark">중요한 사건</span><span>{ageLabel(character.ageMonths)} · {character.location}</span></div>
              <h3>{game.activeEvent.title}</h3>
              <p className="event-description">{game.activeEvent.description}</p>
              <div className="choice-list">
                {game.activeEvent.choices.map((choice, index) => (
                  <button className="choice-button" key={choice.id} onClick={() => choose(choice.id)}>
                    <span className="choice-index">0{index + 1}</span>
                    <span className="choice-copy"><strong>{choice.text}</strong><small>{choice.check ? `${ABILITY_LABELS[choice.check.ability]} 판정 · DC ${choice.check.dc}${choice.check.proficiency ? ` · 숙련 +${choice.check.proficiency}` : ''}` : '판정 없이 진행'}</small></span>
                    <span className="choice-arrow" aria-hidden="true">↗</span>
                  </button>
                ))}
              </div>
              <p className="roll-note">주사위는 엔진이 굴립니다. 자연 1과 20은 자동 성공·실패가 아닙니다.</p>
            </article>
          )}

          {game.dead && (
            <article className="death-card">
              <div className="death-mark" aria-hidden="true">†</div>
              <span className="eyebrow">생애 종결 · 회색 달력 {game.world.year}년</span>
              <h3>{character.name}의 마지막</h3>
              <p className="death-cause">{game.deathCause}</p>
              <div className="death-summary">
                <div><span>태어난 곳</span><strong>{character.nation}</strong></div>
                <div><span>살아온 시간</span><strong>{ageLabel(character.ageMonths)}</strong></div>
                <div><span>마지막 직업</span><strong>{character.occupation}</strong></div>
                <div><span>남긴 재산</span><strong>{character.wealth} 은화</strong></div>
              </div>
              <p className="last-impression">{game.chronicle.find((item) => item.category === 'choice')?.detail ?? '한 생이 기록되었다.'}</p>
              <button className="primary-button" onClick={startLife}>다시 태어나기 <span aria-hidden="true">↗</span></button>
            </article>
          )}

          {!game.dead && !atBirth && !game.activeEvent && (
            <section className="quiet-state">
              <div className="quiet-rule"><span /></div>
              <span className="eyebrow">{ageLabel(character.ageMonths)} · {character.location}</span>
              <h3>세상은 당신 없이도 흐른다</h3>
              <p>잠시 숨을 고르거나, 다음 갈림길까지 시간을 보내세요.</p>
              <div className="advance-actions">
                <button className="secondary-button" onClick={advanceOneMonth}>한 달 보내기 <span>→</span></button>
                <button className="text-button" onClick={advanceToNextEvent}>다음 사건까지 <span>↗</span></button>
              </div>
            </section>
          )}

          <section className="chronicle-section">
            <div className="chronicle-heading"><div><span className="eyebrow">잊히지 않을 일</span><h3>연대기</h3></div><span>{game.chronicle.length} 기록</span></div>
            <ol className="chronicle-list">
              {game.chronicle.slice(0, 8).map((item) => (
                <li className={`chronicle-entry entry-${item.category}`} key={item.id}>
                  <span className="timeline-dot" />
                  <div className="chronicle-copy"><span>{ageLabel(item.ageMonths)} · {item.category === 'check' ? '판정 기록' : item.category === 'birth' ? '출생' : item.category === 'death' ? '사망' : item.category === 'year' ? '해의 끝' : '선택'}</span><strong>{item.title}</strong><p>{item.detail}</p></div>
                </li>
              ))}
            </ol>
            {game.chronicle.length > 8 && <p className="chronicle-footnote">오래된 기록은 생애 기록에 보관됩니다.</p>}
          </section>
        </section>

        <aside className="right-column" aria-label="세계와 시간">
          <section className="world-panel">
            <div className="section-heading"><div><span className="eyebrow">{character.nation}</span><h3>변경의 기류</h3></div><span className="world-year">{game.world.year}년</span></div>
            <div className="world-meter"><div><span>민심의 불안</span><strong>{game.world.unrest}%</strong></div><i><b style={{ width: `${game.world.unrest}%` }} /></i></div>
            <div className="world-meter"><div><span>곡물 부족</span><strong>{game.world.hunger}%</strong></div><i><b style={{ width: `${game.world.hunger}%` }} /></i></div>
            <div className="world-meter"><div><span>길 위의 위험</span><strong>{game.world.danger}%</strong></div><i><b style={{ width: `${game.world.danger}%` }} /></i></div>
            <p className="world-note">변경 소식은 해마다 바뀌며 삶의 갈림길에 영향을 준다.</p>
          </section>

          <section className="time-panel">
            <div className="section-heading"><div><span className="eyebrow">시간의 흐름</span><h3>세월 보내기</h3></div><span className="pause-symbol">Ⅱ</span></div>
            <div className="speed-control" role="group" aria-label="시간 배속">
              <button className={speed === 0 ? 'speed-active' : ''} onClick={() => setSpeed(0)} aria-label="일시 정지" title="일시 정지">Ⅱ</button>
              {SPEEDS.map((value) => <button key={value} className={speed === value ? 'speed-active' : ''} onClick={() => setSpeed(value)} disabled={atBirth || game.dead || Boolean(game.activeEvent)}>{value}x</button>)}
            </div>
            <div className="time-actions">
              <button onClick={advanceOneMonth} disabled={atBirth || game.dead || Boolean(game.activeEvent)}>한 달 진행 <span>→</span></button>
              <button onClick={advanceToNextEvent} disabled={atBirth || game.dead || Boolean(game.activeEvent)}>다음 사건까지 진행 <span>↗</span></button>
            </div>
            <p className="pause-note">중요한 사건이 생기면 모든 배속에서 자동으로 멈춥니다.</p>
          </section>

          <section className="omens-panel">
            <span className="eyebrow">삶에 새겨진 흔적</span>
            {character.flags.length ? <ul>{character.flags.map((flag) => <li key={flag}>{flag}</li>)}</ul> : <p>아직 이 삶의 이름으로 남긴 흔적은 없다.</p>}
            <div className="omen-bottom"><span>가문 유대</span><strong>{character.relatives.length ? Math.round(character.relatives.reduce((sum, person) => sum + person.affinity, 0) / character.relatives.length) : 0}<small>%</small></strong></div>
          </section>
        </aside>
      </div>
      <footer className="app-footer"><span>잿빛 세월 · 한 사람의 생애를 위한 기록</span><span>이야기는 선택으로, 결과는 규칙으로</span></footer>
    </main>
  );
}

export default App;
