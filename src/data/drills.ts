/**
 * 計算ドリル：出題のたびに数値が変わる自動生成問題。
 *
 * 計算問題は同じ問題文を暗記してしまうと本番で崩れるため、
 * 値を振り直して「手順」だけが身に付くようにしている。
 * 生成した問題は復習カード（SRS）には登録しない（同じ問題が二度と現れないため）。
 */

export interface DrillItem {
  question: string;
  choices: string[];
  answer: number;
  /** 計算手順の解説 */
  explanation: string;
}

export interface Drill {
  id: string;
  name: string;
  categoryId: string;
  sectionId: string;
  summary: string;
  generate: () => DrillItem;
}

// ---------------------------------------------------------------- 補助関数

const rnd = (min: number, max: number): number => min + Math.floor(Math.random() * (max - min + 1));

/** 選択肢や条件をランダムに 1 つ選ぶ。新しいドリルを書くときに使う */
export function pick<T>(items: readonly T[]): T {
  return items[rnd(0, items.length - 1)];
}

/** 小数を読みやすく整える（末尾の 0 を落とす）。新しいドリルを書くときに使う */
export function fx(n: number, digits = 2): string {
  return Number(n.toFixed(digits)).toString();
}

/** 正解と誤答候補から 4 択を作る。重複は除き、足りなければ補充関数で埋める */
function build(
  correct: string,
  wrongs: string[],
  fallback?: (i: number) => string,
): { choices: string[]; answer: number } {
  const pool: string[] = [];
  for (const w of wrongs) {
    if (w !== correct && !pool.includes(w)) pool.push(w);
    if (pool.length === 3) break;
  }
  for (let i = 1; pool.length < 3 && i < 60; i++) {
    const extra = fallback ? fallback(i) : String(i);
    if (extra !== correct && !pool.includes(extra)) pool.push(extra);
  }
  const all = [correct, ...pool];
  for (let j = all.length - 1; j > 0; j--) {
    const k = rnd(0, j);
    [all[j], all[k]] = [all[k], all[j]];
  }
  return { choices: all, answer: all.indexOf(correct) };
}

/**
 * 数値の 4 択。ありがちな誤答を先に使い、足りない分は倍率でずらして作る。
 * 正解が 0 や負になりうる問題では倍率では埋まらないので、build に自前の
 * 補充関数を渡すこと（npm run check が「選択肢が 2 個になる」で捕まえる）。
 */
export function buildNumeric(
  correct: number,
  fmt: (n: number) => string,
  mistakes: number[],
): { choices: string[]; answer: number } {
  const wrongs = mistakes.filter((n) => Number.isFinite(n) && n >= 0).map(fmt);
  const factors = [2, 0.5, 1.5, 0.8, 1.25, 3, 0.25, 1.1, 0.9];
  let fi = 0;
  return build(fmt(correct), wrongs, () => fmt(correct * factors[fi++ % factors.length]));
}

// ---------------------------------------------------------------- ドリル本体

export const DRILLS: Drill[] = [
  {
    id: 'matshape',
    name: '行列積の形',
    categoryId: 'm-linalg',
    sectionId: 'm-linalg-1',
    summary: '2 つの行列の形から、積の形を求める（計算できない場合もある）',
    generate: () => {
      const a = rnd(2, 9);
      const b = rnd(2, 9);
      const c = rnd(2, 9);
      // 3 回に 1 回は内側が食い違う問題を出す（「計算できない」を選ばせる）
      const broken = rnd(1, 3) === 1;
      let left = b;
      while (broken && left === b) left = rnd(2, 9);
      const correct = broken ? '計算できない' : `(${a}, ${c})`;
      const { choices, answer } = build(
        correct,
        broken
          ? [`(${a}, ${c})`, `(${a}, ${left})`, `(${left}, ${c})`]
          : ['計算できない', `(${c}, ${a})`, `(${a}, ${b})`, `(${b}, ${c})`],
      );
      return {
        question: `形が (${a}, ${broken ? left : b}) の行列と (${b}, ${c}) の行列を、この順で行列積として掛ける。結果の形はどれか。`,
        choices,
        answer,
        explanation: broken
          ? `左の列数 ${left} と右の行数 ${b} が一致していないので計算できない。行列積は**内側の次元が一致していること**が条件で、一致していなければ計算そのものができない。`
          : `左の列数と右の行数がどちらも ${b} で一致しているので計算できる。内側の ${b} が消え、外側の ${a} と ${c} が残って (${a}, ${c}) になる。`,
      };
    },
  },
  {
    id: 'dot',
    name: 'ベクトルの内積',
    categoryId: 'm-linalg',
    sectionId: 'm-linalg-1',
    summary: '同じ位置の成分を掛けて総和を取る。ニューロン 1 個の計算そのもの',
    generate: () => {
      const n = rnd(3, 4);
      const a: number[] = [];
      const b: number[] = [];
      for (let i = 0; i < n; i++) {
        a.push(rnd(-4, 6));
        b.push(rnd(-4, 6));
      }
      const correct = a.reduce((s, v, i) => s + v * b[i], 0);
      const sumA = a.reduce((s, v) => s + v, 0);
      const sumB = b.reduce((s, v) => s + v, 0);
      const terms = a.map((v, i) => `${v}×${b[i]}`).join(' + ');
      // 内積は 0 や負にもなるので、倍率ではなく差でずらして誤答を作る
      const { choices, answer } = build(
        String(correct),
        [String(sumA + sumB), String(sumA * sumB), String(correct + a[0] * b[0])],
        (i) => String(correct + (i % 2 === 0 ? i : -i)),
      );
      return {
        question: `a = (${a.join(', ')}), b = (${b.join(', ')}) のとき、内積 a・b の値はどれか。`,
        choices,
        answer,
        explanation: `同じ位置の成分どうしを掛けて、全部足す。${terms} = ${correct}。**結果はスカラー 1 個**であって、ベクトルではない。掛けずに足すだけ（${sumA + sumB}）や、総和どうしを掛ける（${sumA * sumB}）のは典型的な誤り。`,
      };
    },
  },
];

export const drillById = (id: string): Drill | undefined => DRILLS.find((d) => d.id === id);
