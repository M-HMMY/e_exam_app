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
  {
    id: 'fcparams',
    name: '全結合層のパラメータ数',
    categoryId: 'dl-ffn',
    sectionId: 'dl-ffn-1',
    summary: '入力・出力の次元から、重みとバイアスの個数を数える（バイアスの足し忘れに注意）',
    generate: () => {
      const din = pick([64, 100, 128, 256, 512, 784]);
      const dout = pick([10, 32, 50, 64, 128, 256]);
      const batch = pick([16, 32, 64, 128]);
      const withBias = rnd(1, 4) !== 1; // 4 回に 1 回はバイアスなしの層を出す
      const weights = din * dout;
      const correct = withBias ? weights + dout : weights;
      const fmt = (n: number): string => Math.round(n).toLocaleString('en-US');
      const { choices, answer } = buildNumeric(correct, fmt, [
        weights, // バイアスの足し忘れ（またはその逆）
        weights + dout * batch, // バイアスをバッチぶん数えた
        weights * batch, // バッチサイズを掛けてしまった
        din + dout,
      ]);
      return {
        question: `入力 ${din} 次元、出力 ${dout} 次元の全結合層が 1 層ある（バイアス${withBias ? 'あり' : 'なし'}）。バッチサイズ ${batch} で学習するとき、この層のパラメータ数はいくつか。`,
        choices,
        answer,
        explanation: withBias
          ? `重みが ${din} × ${dout} = ${fmt(weights)} 個、バイアスが出力次元と同じ ${dout} 個。合計 ${fmt(correct)} 個になる。**バイアスの足し忘れが典型的な失点。** バッチサイズ ${batch} はパラメータ数に関係しない（増えるのは計算量とメモリ）。`
          : `バイアスがないので重みだけを数える。${din} × ${dout} = ${fmt(correct)} 個。バッチ正規化を直後に置く場合など、バイアスを持たせない設定では出力次元ぶんを足さない。バッチサイズ ${batch} はパラメータ数に関係しない。`,
      };
    },
  },
  {
    id: 'iters',
    name: 'エポックとイテレーション',
    categoryId: 'dl-opt',
    sectionId: 'dl-opt-1',
    summary: 'データ数・バッチサイズ・エポック数から、パラメータの更新回数を求める',
    generate: () => {
      const perEpoch = pick([100, 125, 200, 250, 300, 500]);
      const batch = pick([32, 50, 64, 100, 128]);
      const n = perEpoch * batch;
      const epochs = pick([3, 5, 10, 12, 20]);
      const correct = perEpoch * epochs;
      const fmt = (v: number): string => `${Math.round(v).toLocaleString('en-US')} 回`;
      const { choices, answer } = buildNumeric(correct, fmt, [
        perEpoch, // 1 エポックぶんで止めた
        n * epochs, // 1 件ごとに更新すると勘違いした
        epochs, // エポック数そのもの
        Math.round(n / epochs),
      ]);
      return {
        question: `訓練データ ${n.toLocaleString('en-US')} 件を、バッチサイズ ${batch} で ${epochs} エポック学習する。パラメータの更新は合計何回行われるか。`,
        choices,
        answer,
        explanation: `1 エポックのイテレーション数は ${n.toLocaleString('en-US')} ÷ ${batch} = ${perEpoch} 回。${epochs} エポックなら ${perEpoch} × ${epochs} = ${fmt(correct)} である。\n\n**エポックはデータを一巡すること、イテレーションはパラメータを 1 回更新すること。** バッチサイズを変えれば、同じエポック数でも更新回数は変わる。`,
      };
    },
  },
  {
    id: 'confmat',
    name: '混同行列から指標を出す',
    categoryId: 'ml-method',
    sectionId: 'ml-method-2',
    summary: 'TP・FP・FN・TN の 4 つの数から、正解率・適合率・再現率・F 値を計算する',
    generate: () => {
      const tp = rnd(6, 60);
      const fn = rnd(4, 40);
      const fp = rnd(4, 40);
      const tn = rnd(30, 200);
      const precision = tp / (tp + fp);
      const recall = tp / (tp + fn);
      const f1 = (2 * precision * recall) / (precision + recall);
      const acc = (tp + tn) / (tp + fp + fn + tn);
      const target = pick(['適合率', '再現率', 'F 値', '正解率'] as const);
      const value = target === '適合率' ? precision : target === '再現率' ? recall : target === 'F 値' ? f1 : acc;
      // 問題文で桁を指定しているので、fx と違って末尾の 0 を落とさない
      const fmt = (n: number): string => n.toFixed(3);
      // 誤答には他の指標の値を並べる（取り違えがそのまま選択肢になる）
      const { choices, answer } = build(
        fmt(value),
        [precision, recall, f1, acc, (precision + recall) / 2, tp / (tp + fp + fn + tn)].map(fmt),
        (i) => fmt(Math.min(0.999, Math.max(0.001, value + (i % 2 === 0 ? 1 : -1) * 0.017 * i))),
      );
      const detail: Record<string, string> = {
        適合率: `適合率 = TP / (TP + FP) = ${tp} / ${tp + fp} = ${fmt(precision)}。分母は**陽性と予測した件数**（予測の側）。`,
        再現率: `再現率 = TP / (TP + FN) = ${tp} / ${tp + fn} = ${fmt(recall)}。分母は**実際に陽性である件数**（正解の側）。`,
        'F 値': `適合率 = ${tp} / ${tp + fp} = ${fmt(precision)}、再現率 = ${tp} / ${tp + fn} = ${fmt(recall)}。F 値はこの 2 つの調和平均で、丸めを挟まずに書くと 2TP / (2TP + FP + FN) = ${2 * tp} / ${2 * tp + fp + fn} = ${fmt(f1)}。${fmt(f1) === fmt((precision + recall) / 2) ? 'この問題では適合率と再現率が近いため算術平均と同じ値に見えるが、両者が離れるほど F 値は**低いほうへ引っ張られる**。' : `**算術平均（${fmt((precision + recall) / 2)}）ではない。**`}`,
        正解率: `正解率 = (TP + TN) / 全件 = (${tp} + ${tn}) / ${tp + fp + fn + tn} = ${fmt(acc)}。**陰性を当てた分も含む**ので、不均衡データでは高く出やすい。`,
      };
      return {
        question: `混同行列が TP = ${tp}、FP = ${fp}、FN = ${fn}、TN = ${tn} であるとき、${target}はいくらか（小数第 3 位まで）。`,
        choices,
        answer,
        explanation: `${detail[target]}\n\n他の指標も出しておくと取り違えに気付ける。適合率 ${fmt(precision)} / 再現率 ${fmt(recall)} / F 値 ${fmt(f1)} / 正解率 ${fmt(acc)}。\n\n**FN は「陰性と予測して外した」＝見逃し。** 2 文字目が予測、1 文字目が当たり外れ、と読むと表を間違えない。`,
      };
    },
  },
  {
    id: 'convout',
    name: '畳み込みの出力サイズ',
    categoryId: 'dl-cnn',
    sectionId: 'dl-cnn-1',
    summary: '入力・フィルタ・ストライド・パディングから出力サイズを求める（切り捨てに注意）',
    generate: () => {
      const input = pick([28, 32, 56, 64, 112, 224]);
      const f = pick([1, 3, 5, 7]);
      const s = pick([1, 1, 2, 2, 3]);
      // パディングはフィルタサイズに従属させる（1×1 に 2 画素のパディングは現実に出てこない）
      const p = f === 1 ? 0 : pick([0, 1, (f - 1) / 2]);
      const correct = Math.floor((input + 2 * p - f) / s) + 1;
      const fmt = (n: number): string => `${Math.round(n)}×${Math.round(n)}`;
      const { choices, answer } = buildNumeric(correct, fmt, [
        correct - 1, // 最後の +1 を忘れた
        Math.ceil((input + 2 * p - f) / s) + 1, // 切り捨てずに繰り上げた
        Math.floor((input - f) / s) + 1, // パディングを数え落とした
        Math.floor(input / s), // ストライドで割っただけ
      ]);
      return {
        question: `入力 ${input}×${input}、フィルタ ${f}×${f}、ストライド ${s}、パディング ${p} の畳み込みを行ったときの出力サイズはどれか。`,
        choices,
        answer,
        explanation: `出力の 1 辺は「(入力 + 2×パディング − フィルタ) ÷ ストライド」を**切り捨ててから 1 を足す**。\n\n(${input} + 2×${p} − ${f}) ÷ ${s} = ${((input + 2 * p - f) / s).toFixed(2)} → 切り捨てて ${Math.floor((input + 2 * p - f) / s)}、 +1 で **${correct}**。\n\n${p === (f - 1) / 2 && s === 1 ? 'この設定は P = (F−1)/2 かつストライド 1 なので、**入力とサイズが変わらない**。' : s >= 2 ? 'ストライドが 2 以上なので、出力はおおよそ入力をストライドで割った大きさになる。' : 'ストライドは 1 だが、パディングが (F−1)/2 に足りないぶん、フィルタのはみ出す分だけ縮む。'}`,
      };
    },
  },
  {
    id: 'convparams',
    name: '畳み込み層のパラメータ数',
    categoryId: 'dl-cnn',
    sectionId: 'dl-cnn-1',
    summary: 'フィルタサイズと入出力チャネル数から、重みとバイアスの個数を数える',
    generate: () => {
      const f = pick([1, 3, 5, 7]);
      const cin = pick([3, 16, 32, 64, 128, 256]);
      const cout = pick([16, 32, 64, 128, 256, 512]);
      const size = pick([28, 32, 56, 224]);
      const withBias = rnd(1, 4) !== 1;
      const weights = f * f * cin * cout;
      const correct = withBias ? weights + cout : weights;
      const fmt = (n: number): string => Math.round(n).toLocaleString('en-US');
      const { choices, answer } = buildNumeric(correct, fmt, [
        weights, // バイアスの足し忘れ（またはその逆）
        f * f * cout, // 入力チャネル数を掛け忘れた
        f * f * cin * cout + cin, // バイアスを入力チャネル数にした
        weights * size, // 画像サイズを掛けてしまった
      ]);
      return {
        question: `入力 ${cin} チャネル、出力 ${cout} チャネル、フィルタ ${f}×${f}（バイアス${withBias ? 'あり' : 'なし'}）の畳み込み層を、${size}×${size} の画像に適用する。この層のパラメータ数はいくつか。`,
        choices,
        answer,
        explanation: withBias
          ? `フィルタは入力チャネルすべてにまたがるので、重みは ${f} × ${f} × ${cin} × ${cout} = ${fmt(weights)} 個。バイアスは出力チャネルと同じ ${cout} 個。合計 **${fmt(correct)}** 個。\n\n**入力チャネル数を掛け忘れる**のと**バイアスを足し忘れる**のが二大失点。また、パラメータ数は画像サイズ（${size}×${size}）に依存しない。増えるのは計算量と特徴マップのメモリである。`
          : `バイアスがないので重みだけを数える。${f} × ${f} × ${cin} × ${cout} = **${fmt(correct)}** 個。\n\nフィルタが入力チャネルすべてにまたがる点に注意する。バッチ正規化を直後に置く構成では、このようにバイアスを省くことがある。パラメータ数は画像サイズ（${size}×${size}）に依存しない。`,
      };
    },
  },
  {
    id: 'discount',
    name: '割引収益の計算',
    categoryId: 'dl-rl',
    sectionId: 'dl-rl-1',
    summary: '報酬の列と割引率から収益を求める（割引の指数のずれに注意）',
    generate: () => {
      const gamma = pick([0.5, 0.8, 0.9]);
      // 先頭を 1 以上にしておく（0 だと「最初の報酬は割り引かない」という要点が観測できない）
      const rewards = [rnd(1, 3), rnd(0, 3), rnd(0, 3), rnd(1, 3)];
      const correct = rewards.reduce((sum, r, k) => sum + gamma ** k * r, 0);
      const shifted = rewards.reduce((sum, r, k) => sum + gamma ** (k + 1) * r, 0);
      const flat = rewards.reduce((sum, r) => sum + gamma * r, 0);
      const plain = rewards.reduce((sum, r) => sum + r, 0);
      const fmt = (n: number): string => fx(n, 4);
      const { choices, answer } = buildNumeric(correct, fmt, [
        plain, // 割り引かずに単純に足した
        shifted, // 割引の指数を 1 つずらした
        flat, // すべての報酬に γ を 1 回だけ掛けた
        correct - rewards[0], // 最初の報酬を数え落とした
      ]);
      return {
        question: `ある時刻から順に報酬 ${rewards.join(', ')} を受け取り、そこでエピソードが終了した。割引率 γ = ${gamma} のとき、この時刻の収益 G はいくらか。`,
        choices,
        answer,
        explanation: `収益は G = r₁ + γr₂ + γ²r₃ + γ³r₄ で、**最初の報酬は割り引かない**（γ⁰ = 1）。\n\n${rewards.map((r, k) => `${fx(gamma ** k, 4)} × ${r}`).join(' + ')} = **${fmt(correct)}**。\n\n割り引かずに足すと ${fmt(plain)}、指数を 1 つずらすと ${fmt(shifted)} になる。**割引の指数は「何手先の報酬か」と一致する**と覚えておくとよい。`,
      };
    },
  },
  {
    id: 'qlearn',
    name: 'Q 学習の更新',
    categoryId: 'dl-rl',
    sectionId: 'dl-rl-2',
    summary: '報酬・次状態の最大 Q・学習率から、更新後の Q 値を求める',
    generate: () => {
      const alpha = pick([0.1, 0.2, 0.5]);
      const gamma = pick([0.5, 0.8, 0.9]);
      const r = pick([0, 1, 2, 5]);
      const maxNext = pick([0.5, 1, 2, 3, 4]);
      const target = r + gamma * maxNext;
      // 目標値と現在の Q が一致すると TD 誤差が 0 になり、正解が目標値そのものになってしまう
      // （「目標値をそのまま答えないこと」という解説と矛盾する）ので、その値は候補から外す
      const q = pick([0, 0.5, 1, 1.5, 2, 3].filter((v) => v !== target));
      const correct = q + alpha * (target - q);
      const fmt = (n: number): string => fx(n, 4);
      const td = target - q;
      // 負の TD 誤差はかっこで囲まないと「+ 0.1 × -0.1」と読みにくくなる
      const tdText = td < 0 ? `(${fmt(td)})` : fmt(td);
      const { choices, answer } = buildNumeric(correct, fmt, [
        target, // 更新式ではなく目標値そのものを答えた（＝学習率を 1 にした）
        q + alpha * target, // 現在の Q を引き忘れた
        q + alpha * (r + maxNext - q), // 割引率を掛け忘れた
        q + alpha * (r - q), // 次状態の価値を数え落とした
      ]);
      return {
        question: `Q(s, a) = ${q} のとき、行動 a を取って報酬 ${r} を得て状態 s' に移った。s' での行動価値の最大値が ${maxNext}、学習率 α = ${alpha}、割引率 γ = ${gamma} である。Q 学習で更新した後の Q(s, a) はいくらか。`,
        choices,
        answer,
        explanation: `Q 学習の更新式は **Q ← Q + α[r + γ·maxQ(s', a') − Q]** である。\n\nまず目標値は ${r} + ${gamma} × ${maxNext} = ${fmt(target)}。TD 誤差は ${fmt(target)} − ${q} = ${fmt(td)} なので、\n\nQ ← ${q} + ${alpha} × ${tdText} = **${fmt(correct)}**。\n\n**目標値 ${fmt(target)} をそのまま答えないこと**（それは α = 1 の場合）。また、次の行動を実際に選んで Q(s', a') を使うのが SARSA、最大値を使うのが Q 学習である。`,
      };
    },
  },
  {
    id: 'iou',
    name: 'IoU の計算',
    categoryId: 'dl-adv',
    sectionId: 'dl-adv-1',
    summary: '2 つの矩形の座標から IoU（重なり ÷ 和集合）を求める',
    generate: () => {
      // 条件が 2 つある。
      // (1) 正解の矩形が予測の矩形からはみ出すこと。内包されると「予測の面積で割る」誤答が
      //     正解と一致してしまい、選択肢の補充で IoU が 1 を超える値まで現れる。
      // (2) IoU が小さすぎないこと。小さいと「重なりを引き忘れた」誤答が丸めて同じ表示になる。
      let w = 0;
      let h = 0;
      let w2 = 0;
      let h2 = 0;
      let dx = 0;
      let dy = 0;
      let inter = 0;
      let union = 0;
      for (let i = 0; i < 100; i++) {
        w = rnd(6, 12);
        h = rnd(6, 12);
        dx = rnd(1, w - 2);
        dy = rnd(1, h - 2);
        w2 = rnd(w - dx + 1, 14); // 右へはみ出させる
        h2 = rnd(3, 12);
        inter = (Math.min(w, dx + w2) - dx) * (Math.min(h, dy + h2) - dy);
        union = w * h + w2 * h2 - inter;
        if (inter / union >= 0.15) break;
      }
      const areaA = w * h;
      const areaB = w2 * h2;
      const correct = inter / union;
      const fmt = (n: number): string => fx(n, 3);
      // 面積が偶然そろうと誤答候補が重なる。buildNumeric の倍率補充だと
      // そこで IoU が 1 を超える選択肢が出てしまうので、補充関数を自前で渡す。
      const nudge = [0.09, -0.07, 0.17, -0.13, 0.26, -0.21];
      const { choices, answer } = build(
        fmt(correct),
        [
          fmt(inter / areaB), // 分母を正解の矩形の面積にした
          fmt(inter / (areaA + areaB)), // 重なりを引かずに単純な和で割った
          fmt(inter / areaA), // 分母を予測の矩形の面積にした
        ],
        (i) => fmt(Math.min(0.995, Math.max(0.005, correct + nudge[(i - 1) % nudge.length]))),
      );
      return {
        question: `予測した矩形が左上 (0, 0)・右下 (${w}, ${h})、正解の矩形が左上 (${dx}, ${dy})・右下 (${dx + w2}, ${dy + h2}) である。この 2 つの IoU はいくつか。`,
        choices,
        answer,
        explanation: `重なりの領域は左上 (${dx}, ${dy})・右下 (${Math.min(w, dx + w2)}, ${Math.min(h, dy + h2)}) で、面積は ${Math.min(w, dx + w2) - dx} × ${Math.min(h, dy + h2) - dy} = ${inter}。\n\n2 つの矩形の面積は ${areaA} と ${areaB} なので、和集合は ${areaA} + ${areaB} − ${inter} = ${union}。\n\nIoU = ${inter} ÷ ${union} = **${fmt(correct)}**。\n\n**分母は和集合であって、正解の矩形の面積ではない**（それで割ると ${fmt(inter / areaB)} になる）。重なりを引き忘れて ${areaA} + ${areaB} で割るのもありがちな失点である。`,
      };
    },
  },
  {
    id: 'modelmem',
    name: 'モデルのメモリ量',
    categoryId: 'dv-env',
    sectionId: 'dv-env-1',
    summary: 'パラメータ数と数値形式から、重み（と学習時の状態）のメモリ量を求める',
    generate: () => {
      // 2500 万は確認問題 q-env-5 と同じ設定になるので入れない
      const params = pick([1_000_000, 7_000_000, 30_000_000, 60_000_000, 125_000_000, 350_000_000]);
      const [bits, name] = pick([
        [32, 'FP32'],
        [16, 'FP16'],
        [8, 'INT8'],
      ] as const);
      // 「Adam で学習するとき」を問うのは FP32 のときだけにする。
      // INT8 で勾配やモーメントを持つ運用はないし、FP16 の混合精度学習は
      // 重みの原本とモーメントを FP32 で持つので、単純な 4 倍にならない。
      const training = bits === 32 && rnd(1, 2) === 1;
      const factor = training ? 4 : 1;
      const bytes = (params * bits) / 8;
      const correct = (bytes * factor) / 1e6;
      const fmt = (n: number): string => `${fx(n, 1)} MB`;
      // 「125 百万」は読みにくいので、万・億で書く
      const label = params >= 1e8 ? `${fx(params / 1e8, 2)} 億` : `${params / 1e4} 万`;
      const { choices, answer } = buildNumeric(correct, fmt, [
        (params * bits) / 1e6, // ビットをバイトに直し忘れた（8 倍）
        bytes / 1e6, // 学習時なのに重みだけ数えた
        (bytes * 2) / 1e6, // 勾配までしか数えなかった
        (params * 4 * factor) / 1e6, // 形式によらず 4 バイトで計算した
      ]);
      return {
        question: `パラメータ数 ${label} のモデルを ${name} で扱う。${training ? 'Adam で学習するとき、パラメータ・勾配・Adam の状態（1 次と 2 次のモーメント）に必要な' : '重みを保持するために必要な'}メモリはおよそいくらか（1 MB = 10⁶ バイトとする）。`,
        choices,
        answer,
        explanation: `${name} は 1 パラメータ ${bits} ビット＝**${bits / 8} バイト**なので、重みだけなら ${(params / 1e6).toFixed(0)}×10⁶ × ${bits / 8} = **${fmt(bytes / 1e6)}**。\n\n${
          training
            ? `Adam では**重み・勾配・1 次モーメント・2 次モーメント**の 4 つ分が要るので、${fmt(bytes / 1e6)} × 4 = **${fmt(correct)}**。\n\nSGD（モーメンタムなし）なら状態を持たないので 2 倍で済む。`
            : `推論なら勾配も最適化器の状態も要らないので、これがほぼそのまま必要量になる。**学習ではこの 4 倍**（重み・勾配・モーメント 2 つ）が要る。`
        }\n\n**ビットとバイトの取り違え（重みだけの値に対して 8 倍のずれ）**が最も多い失点である。実際にはこのほかに中間の活性のぶんも必要になる。`,
      };
    },
  },
  {
    id: 'entropy',
    name: 'エントロピーの計算',
    categoryId: 'm-info',
    sectionId: 'm-info-1',
    summary: '確率分布から平均情報量（エントロピー）をビット単位で求める',
    generate: () => {
      const cases = [
        { label: ['1/2', '1/2'], p: [0.5, 0.5] },
        { label: ['1/2', '1/4', '1/4'], p: [0.5, 0.25, 0.25] },
        { label: ['1/2', '1/4', '1/8', '1/8'], p: [0.5, 0.25, 0.125, 0.125] },
        { label: ['1/4', '1/4', '1/4', '1/4'], p: [0.25, 0.25, 0.25, 0.25] },
        { label: ['3/4', '1/4'], p: [0.75, 0.25] },
        { label: ['7/8', '1/8'], p: [0.875, 0.125] },
        { label: ['1/2', '1/8', '1/8', '1/8', '1/8'], p: [0.5, 0.125, 0.125, 0.125, 0.125] },
        { label: ['1/2', '1/4', '1/8', '1/16', '1/16'], p: [0.5, 0.25, 0.125, 0.0625, 0.0625] },
      ];
      const c = pick(cases);
      const correct = -c.p.reduce((sum, p) => sum + p * Math.log2(p), 0);
      const uniform = Math.log2(c.p.length); // 一様分布だと思い込んだ（この分布での上限）
      const nat = correct * Math.LN2; // 自然対数で計算した（単位が nat になる）
      const topOnly = -Math.log2(Math.max(...c.p)); // いちばん起こりやすい事象の自己情報量だけを見た
      const noWeight = -c.p.reduce((sum, p) => sum + Math.log2(p), 0); // 確率で重み付けせずに足した
      const half = correct / 2; // 上の 3 つが正解と重なったときの控え
      const isUniform = Math.abs(correct - uniform) < 1e-9;
      const fmt = (n: number): string => `${fx(n, 3)} bit`;
      // 誤答も 0 〜 log2(n) に収める。エントロピーがこの範囲を出ることはないので、
      // 範囲外の値を混ぜると計算せずに消去できてしまう。
      const { choices, answer } = build(
        fmt(correct),
        // 一様分布のときは uniform と topOnly が正解と重なって消える。そのままだと
        // 残る誤答がすべて正解より小さくなり「いちばん大きい選択肢」を選ぶだけで当たってしまうので、
        // 重み付けを忘れた値（正解より大きい）を候補に入れておく。
        [fmt(uniform), fmt(nat), fmt(topOnly), fmt(noWeight), fmt(half)],
        // 一様分布のとき uniform と topOnly が正解と重なるので、補充は正解より小さい側から作る
        (i) => fmt(Math.max(0.05, correct * (1 - 0.13 * i))),
      );
      const terms = c.p
        .map((p, i) => `${c.label[i]} × ${fx(-Math.log2(p), 3)}`)
        .join(' + ');
      return {
        question: `確率分布 (${c.label.join(', ')}) のエントロピーはいくらか。対数の底は 2 とする。`,
        choices,
        answer,
        explanation: `エントロピーは「自己情報量の期待値」なので、各事象の −log₂p を確率で重み付けして足す。\n\n${terms} = **${fmt(correct)}**\n\n確率 1/2 の事象は 1 bit、1/4 なら 2 bit、1/8 なら 3 bit の情報量を持つ。${isUniform ? 'この分布はすべての事象の確率が等しいので、どの事象の自己情報量も同じ値になり、エントロピーもその値に一致する。**一様分布はエントロピーが最大**になる場合である。' : '**いちばん起こりやすい事象の情報量（' + fx(topOnly, 3) + ' bit）だけでは答えにならない。**'}すべての事象を、確率で重み付けして足す（重み付けを忘れて自己情報量をそのまま足すと ${fx(noWeight, 3)} になるが、これはエントロピーの上限 ${fx(uniform, 3)} bit すら超えてしまう）。\n\n底を 2 ではなく e にすると単位が nat になり、値は ${fx(nat, 3)} nat になる。**bit で答えるなら底は 2**。\n\nなお、この分布が ${c.p.length} 個の値を取るので、**一様分布ならエントロピーは log₂${c.p.length} = ${fx(uniform, 3)} bit** で最大になる。偏りがあるほど値は小さくなる。`,
      };
    },
  },
  {
    id: 'bayes',
    name: 'ベイズの定理（陽性的中率）',
    categoryId: 'm-prob',
    sectionId: 'm-prob-1',
    summary: '有病率・感度・特異度から、陽性と出た人が実際に罹患している確率を求める',
    generate: () => {
      const prev = pick([0.001, 0.002, 0.005, 0.01, 0.02, 0.05]);
      const sens = pick([0.9, 0.95, 0.99]);
      const spec = pick([0.9, 0.95, 0.99]);
      const n = 100000;
      const sick = n * prev;
      const tp = sick * sens; // 罹患していて陽性
      const fp = (n - sick) * (1 - spec); // 罹患していないのに陽性
      const correct = tp / (tp + fp);
      const fmt = (x: number): string => `${fx(x * 100, 1)}%`;
      // 「偽陽性の計算で (1 − 有病率) を掛け忘れた値」は、有病率が低いと正解と
      // 小数 1 桁では区別できないので誤答に使わない。
      const { choices, answer } = build(
        fmt(correct),
        [
          fmt(sens), // 感度をそのまま答えた
          fmt(tp / n), // 分母を陽性者ではなく全体にした
          fmt(1 - correct), // 陽性者のうち罹患していない割合と取り違えた
          fmt(prev), // 有病率をそのまま答えた
          fmt(1 - spec), // 特異度の裏をそのまま答えた
        ],
        (i) => fmt(Math.max(0.001, Math.min(0.999, correct * (1 + 0.35 * i)))),
      );
      return {
        question: `ある病気の有病率は ${fx(prev * 100, 1)}%、検査の感度（罹患者を陽性と判定する割合）は ${fx(sens * 100, 0)}%、特異度（非罹患者を陰性と判定する割合）は ${fx(spec * 100, 0)}% である。検査で陽性となった人が実際に罹患している確率はおよそいくらか。`,
        choices,
        answer,
        explanation: `10 万人で考えると分かりやすい。\n\n- 罹患している人：100000 × ${fx(prev * 100, 1)}% = ${fx(sick, 0)} 人。うち陽性は ${fx(sick, 0)} × ${fx(sens * 100, 0)}% = **${fx(tp, 0)} 人**\n- 罹患していない人：${fx(n - sick, 0)} 人。うち陽性は ${fx(n - sick, 0)} × ${fx((1 - spec) * 100, 0)}% = **${fx(fp, 0)} 人**\n\n陽性者は合わせて ${fx(tp + fp, 0)} 人なので、そのうち本当に罹患しているのは ${fx(tp, 0)} ÷ ${fx(tp + fp, 0)} = **${fmt(correct)}**。\n\n式で書けば、これがベイズの定理そのものである。

P(罹患|陽性) = P(陽性|罹患)P(罹患) ÷ { P(陽性|罹患)P(罹患) + P(陽性|非罹患)P(非罹患) }

**感度 ${fx(sens * 100, 0)}% と答えてはいけない。** 感度は「罹患者のうち陽性になる割合」であって、いま聞かれているのは逆向きの「陽性者のうち罹患している割合」である。**有病率が低いほど、非罹患者から出る偽陽性が効いて的中率は下がる。**

なお、この陽性的中率は[評価指標](textbook/ml-method-2)でいう**適合率（Precision）**と同じ量である。同じように感度＝再現率（Recall）、特異度＝真陰性率にあたる。**呼び名が変わっても計算は同じ**である。`,
      };
    },
  },
  {
    id: 'adammoment',
    name: 'Adam のモーメント更新',
    categoryId: 'dl-opt',
    sectionId: 'dl-opt-2',
    summary: '前ステップのモーメントと勾配から、更新後の 1 次・2 次モーメントを求める',
    generate: () => {
      const first = rnd(1, 2) === 1; // 1 次モーメントか、2 次モーメントか
      const g = pick([0.1, 0.2, 0.4, 0.5, 1, 2]);
      const fmt = (n: number): string => fx(n, 5);
      if (first) {
        const beta = 0.9;
        // 0 を入れない。prev = 0 は t = 1 と読めてしまい、誤答「g そのもの」が
        // バイアス補正後の m̂ = m/(1 − β₁) = g と一致してしまう。
        const prev = pick([0.1, 0.2, 0.5, 1]);
        const correct = beta * prev + (1 - beta) * g;
        const { choices, answer } = buildNumeric(correct, fmt, [
          (1 - beta) * prev + beta * g, // 係数を逆に掛けた
          (prev + g) / 2, // 単純な平均にした
          prev + (1 - beta) * g, // 前の値を減衰させ忘れた
          beta * prev + g, // 勾配に係数を掛け忘れた
        ]);
        return {
          question: `Adam の 1 次モーメントについて、前ステップの値が m = ${prev}、今回の勾配が g = ${g}、β₁ = ${beta} である。更新後の m はいくらか。`,
          choices,
          answer,
          explanation: `1 次モーメントの更新は **m ← β₁·m + (1 − β₁)·g** である。\n\n${beta} × ${prev} + ${fx(1 - beta, 1)} × ${g} = **${fmt(correct)}**\n\n**古い値に β₁、新しい勾配に (1 − β₁) を掛ける**（指数移動平均）。係数を逆にすると、過去をほとんど覚えない別物になってしまう。\n\nなお実際の Adam では、この m をさらに $1 - \\beta_1^t$ で割る**バイアス補正**を行ってから使う。初期値が 0 のせいで序盤の m が小さく出るのを補うためである。`,
        };
      }
      const beta = 0.999;
      // 同じ理由で 0 を入れない（誤答「g²」が補正後の v̂ と一致する）
      const prev = pick([0.01, 0.04, 0.09, 0.25]);
      const correct = beta * prev + (1 - beta) * g * g;
      const { choices, answer } = buildNumeric(correct, fmt, [
        beta * prev + (1 - beta) * g, // 勾配を 2 乗し忘れた
        (1 - beta) * prev + beta * g * g, // 係数を逆に掛けた
        prev + (1 - beta) * g * g, // 前の値を減衰させ忘れた
        g * g, // 勾配の 2 乗をそのまま答えた
      ]);
      return {
        question: `Adam の 2 次モーメントについて、前ステップの値が v = ${prev}、今回の勾配が g = ${g}、β₂ = ${beta} である。更新後の v はいくらか。`,
        choices,
        answer,
        explanation: `2 次モーメントの更新は **v ← β₂·v + (1 − β₂)·g²** である。**勾配の 2 乗**を使う点が 1 次モーメントとの違い。\n\n${beta} × ${prev} + ${fx(1 - beta, 3)} × ${g}² = ${beta} × ${prev} + ${fx(1 - beta, 3)} × ${fx(g * g, 2)} = **${fmt(correct)}**\n\nβ₂ が 0.999 と大きいのは、**2 乗した値はばらつきが大きく、長い区間で均さないとスケールの推定が安定しない**ためである。$1/(1-\\beta)$ で見ると、β₁ = 0.9 はおよそ 10 ステップ、β₂ = 0.999 はおよそ 1000 ステップぶんを見ていることになる。

更新は $\\eta \\cdot \\hat{m} / (\\sqrt{\\hat{v}} + \\epsilon)$ で、**分子も分母も勾配とともに大きくなる**。したがって勾配が一定して大きいだけでは歩幅は変わらない（スケール不変）。歩幅が縮むのは、**符号が揃わずに振動している方向**である（打ち消し合って $\\hat{m}$ は小さいのに、2 乗の平均である $\\hat{v}$ は大きいままになる）。\n\nこちらも $1 - \\beta_2^t$ で割る**バイアス補正**を行ってから使う。`,
      };
    },
  },
];

export const drillById = (id: string): Drill | undefined => DRILLS.find((d) => d.id === id);
