import { useCallback, useEffect, useMemo, useState, type JSX } from 'react';
import type { MockResult, Question } from '../types';
import { QUESTIONS } from '../data/questions';
import { QuestionCard } from '../components/QuestionCard';
import { categoryName } from '../data/categories';
import { actions } from '../store';
import { navigate } from '../lib/router';
import { choiceIndexOf, useKeys } from '../lib/useKeys';

interface Item {
  qid: string;
  categoryId: string;
  q: Question;
  answer: number;
}

function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** 模試の問題を作る。分野の偏りを抑えるため全体からランダムに選ぶ */
function build(count: number): Item[] {
  return shuffle(QUESTIONS)
    .slice(0, count)
    .map((q) => ({ qid: q.id, categoryId: q.categoryId, q, answer: q.answer }));
}

interface Config {
  count: number;
  minutes: number;
}

const PRESETS: (Config & { label: string; note: string })[] = [
  { label: '本番形式', count: 100, minutes: 120, note: '100 問 / 120 分。1 問あたり約 70 秒の感覚をつかむ' },
  { label: 'ハーフ', count: 50, minutes: 60, note: '50 問 / 60 分。時間配分の練習に' },
  { label: '短縮', count: 20, minutes: 25, note: '20 問 / 25 分。すきま時間に' },
];

interface Session {
  config: Config;
  items: Item[];
  answers: (number | null)[];
  idx: number;
  startedAt: number;
  /** 採点済みなら経過秒数を保持 */
  finishedAt: number | null;
}

function formatTime(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export function Mock(): JSX.Element {
  const [session, setSession] = useState<Session | null>(null);
  const [now, setNow] = useState(Date.now());
  const [reviewing, setReviewing] = useState(false);

  const running = session !== null && session.finishedAt === null;

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [running]);

  const remaining = session ? session.config.minutes * 60 - (now - session.startedAt) / 1000 : 0;

  const finish = (s: Session) => {
    const elapsed = Math.round((Date.now() - s.startedAt) / 1000);
    const byCategory: MockResult['byCategory'] = {};
    let correct = 0;
    s.items.forEach((item, i) => {
      const ok = s.answers[i] === item.answer;
      if (ok) correct += 1;
      const entry = byCategory[item.categoryId] ?? { total: 0, correct: 0 };
      entry.total += 1;
      if (ok) entry.correct += 1;
      byCategory[item.categoryId] = entry;
      // 未解答も含めて記録し、SRS へ反映する
      actions.answer({ qid: item.qid, categoryId: item.categoryId, correct: ok, mode: 'mock' });
    });
    actions.addMock({
      id: `mock-${Date.now()}`,
      at: Date.now(),
      preset: `${s.items.length} 問 / ${s.config.minutes} 分`,
      total: s.items.length,
      correct,
      elapsed,
      byCategory,
    });
    setSession({ ...s, finishedAt: Date.now() });
    setReviewing(false);
  };

  // 制限時間の到達で自動採点する
  useEffect(() => {
    if (session && session.finishedAt === null && remaining <= 0) finish(session);
    // finish は session を引数に取るため依存に含めない
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining, session]);

  // 1〜4 で選択、← → で前後の問題へ
  useKeys(
    useCallback(
      (key: string) => {
        if (session === null || session.finishedAt !== null) return;
        const choice = choiceIndexOf(key, 4);
        if (choice !== null) {
          setSession((s) => {
            if (s === null) return s;
            const answers = [...s.answers];
            answers[s.idx] = choice;
            return { ...s, answers };
          });
          return;
        }
        if (key === 'ArrowLeft' || key === 'ArrowRight') {
          setSession((s) => {
            if (s === null) return s;
            const delta = key === 'ArrowLeft' ? -1 : 1;
            return { ...s, idx: Math.min(s.items.length - 1, Math.max(0, s.idx + delta)) };
          });
        }
      },
      [session],
    ),
  );

  const unanswered = useMemo(
    () => (session ? session.answers.reduce<number[]>((acc, a, i) => (a === null ? [...acc, i] : acc), []) : []),
    [session],
  );

  // ---- 設定画面 ----
  if (!session) {
    return (
      <div className="page">
        <header className="page-head">
          <h1>模試</h1>
          <p className="lead">
            時間制限つきで通しで解きます。途中で正誤は表示されません。時間配分の感覚をつかむことが目的です。
          </p>
        </header>
        <div className="preset-grid">
          {PRESETS.map((p) => {
            const enough = QUESTIONS.length >= p.count;
            return (
              <button
                key={p.label}
                type="button"
                className="action"
                disabled={!enough}
                onClick={() =>
                  setSession({
                    config: { count: p.count, minutes: p.minutes },
                    items: build(p.count),
                    answers: new Array(p.count).fill(null),
                    idx: 0,
                    startedAt: Date.now(),
                    finishedAt: null,
                  })
                }
              >
                <span className="action-title">{p.label}</span>
                <span className="action-sub">
                  {enough ? p.note : `収録問題が不足しています（現在 ${QUESTIONS.length} 問）`}
                </span>
              </button>
            );
          })}
        </div>
        <p className="hint">
          合格基準は公表されていませんが、まずは正答率 70% を安定して超えることを目標にしてください。正答率そのものより、**時間内に最後まで到達できるか**を先に確かめるのがこの画面の目的です。
        </p>
      </div>
    );
  }

  // ---- 採点結果 ----
  if (session.finishedAt !== null) {
    const correct = session.items.filter((item, i) => session.answers[i] === item.answer).length;
    const rate = Math.round((correct / session.items.length) * 100);
    const elapsed = Math.round((session.finishedAt - session.startedAt) / 1000);
    const byCat = new Map<string, { total: number; correct: number }>();
    session.items.forEach((item, i) => {
      const e = byCat.get(item.categoryId) ?? { total: 0, correct: 0 };
      e.total += 1;
      if (session.answers[i] === item.answer) e.correct += 1;
      byCat.set(item.categoryId, e);
    });

    if (reviewing) {
      return (
        <div className="page">
          <header className="page-head">
            <h1>模試の見直し</h1>
            <p className="hint">誤答と未解答を中心に確認してください。</p>
          </header>
          {session.items.map((item, i) => (
            <QuestionCard
              key={item.qid}
              q={item.q}
              selected={session.answers[i]}
              revealed
              onSelect={() => undefined}
              counter={`${i + 1} / ${session.items.length}`}
            />
          ))}
          <div className="read-actions">
            <button type="button" className="btn" onClick={() => setReviewing(false)}>
              結果へ戻る
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="page">
        <header className="page-head">
          <h1>模試の結果</h1>
        </header>
        <div className="cards">
          <div className="card stat">
            <span className="stat-label">得点</span>
            <span className="stat-value">
              {correct} / {session.items.length}
            </span>
            <span className="stat-sub">正答率 {rate}%</span>
          </div>
          <div className="card stat">
            <span className="stat-label">所要時間</span>
            <span className="stat-value">{formatTime(elapsed)}</span>
            <span className="stat-sub">制限 {session.config.minutes} 分</span>
          </div>
          <div className="card stat">
            <span className="stat-label">判定の目安</span>
            <span className="stat-value">{rate >= 60 ? '合格圏' : 'あと一歩'}</span>
            <span className="stat-sub">正答率 60% が目安</span>
          </div>
        </div>

        <section className="section">
          <h2>分野別の結果</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>分野</th>
                  <th>正解 / 出題</th>
                  <th>正答率</th>
                </tr>
              </thead>
              <tbody>
                {[...byCat.entries()]
                  .sort((a, b) => a[1].correct / a[1].total - b[1].correct / b[1].total)
                  .map(([cat, e]) => (
                    <tr key={cat} className={e.correct / e.total < 0.6 ? 'low' : ''}>
                      <td>{categoryName(cat)}</td>
                      <td>
                        {e.correct} / {e.total}
                      </td>
                      <td>{Math.round((e.correct / e.total) * 100)}%</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="read-actions">
          <button type="button" className="btn primary" onClick={() => setReviewing(true)}>
            解説を見て復習する
          </button>
          <button type="button" className="btn" onClick={() => setSession(null)}>
            もう一度受ける
          </button>
          <button type="button" className="btn ghost" onClick={() => navigate('stats')}>
            成績分析へ
          </button>
        </div>
      </div>
    );
  }

  // ---- 受験中 ----
  const item = session.items[session.idx];
  const setAnswer = (choice: number) => {
    const answers = [...session.answers];
    answers[session.idx] = choice;
    setSession({ ...session, answers });
  };
  const move = (delta: number) => {
    const idx = Math.min(session.items.length - 1, Math.max(0, session.idx + delta));
    setSession({ ...session, idx });
  };

  return (
    <div className="page">
      <div className={`exam-bar ${remaining < 300 ? 'urgent' : ''}`}>
        <span className="exam-timer">残り {formatTime(remaining)}</span>
        <span className="exam-count">
          解答済み {session.answers.filter((a) => a !== null).length} / {session.items.length}
        </span>
        <button type="button" className="btn small" onClick={() => finish(session)}>
          採点する
        </button>
      </div>

      <QuestionCard
        q={item.q}
        selected={session.answers[session.idx]}
        revealed={false}
        onSelect={setAnswer}
        counter={`${session.idx + 1} / ${session.items.length}`}
        hideResult
      />

      <div className="exam-nav">
        <button type="button" className="btn" disabled={session.idx === 0} onClick={() => move(-1)}>
          ← 前の問題
        </button>
        <button
          type="button"
          className="btn"
          disabled={session.idx === session.items.length - 1}
          onClick={() => move(1)}
        >
          次の問題 →
        </button>
      </div>
      <p className="kbd-hint">
        <kbd>1</kbd>〜<kbd>4</kbd> で選択、<kbd>←</kbd> <kbd>→</kbd> で問題を移動できます
      </p>

      <section className="section">
        <h2>解答状況</h2>
        <div className="grid-nav">
          {session.items.map((_, i) => (
            <button
              key={i}
              type="button"
              className={`grid-cell ${session.answers[i] !== null ? 'filled' : ''} ${i === session.idx ? 'current' : ''}`}
              onClick={() => setSession({ ...session, idx: i })}
            >
              {i + 1}
            </button>
          ))}
        </div>
        {unanswered.length > 0 && <p className="hint">未解答が {unanswered.length} 問あります。</p>}
      </section>
    </div>
  );
}
