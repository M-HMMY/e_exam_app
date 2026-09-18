/**
 * データの整合性チェック。`npm run check` で実行する。
 *
 * 教本・問題・ドリルは手で書き足していくため、型では防げない食い違いが必ず混ざる。
 * ここで機械的に潰しておくと、あとから「なぜか画面に出ない」を探さずに済む。
 * 新しい不整合の型を見つけたら、直すついでにこのファイルへ検査を足すこと。
 */
import { readFileSync } from 'node:fs';
import { CATEGORIES } from '../src/data/categories';
import { SECTIONS } from '../src/data/textbook';
import { QUESTIONS } from '../src/data/questions';
import { DRILLS } from '../src/data/drills';
import { isKnownCommand } from '../src/lib/mathSymbols';
import { renderCheck } from './render-check';

const BACKSLASH = String.fromCharCode(92);
const LF = String.fromCharCode(10);

const errors: string[] = [];
const warnings: string[] = [];

const err = (m: string): void => {
  errors.push(m);
};
const warn = (m: string): void => {
  warnings.push(m);
};

/** 重複した ID を探す */
function dupes(label: string, ids: string[]): void {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) err(`${label}: ID が重複している → ${id}`);
    seen.add(id);
  }
}

const categoryIds = new Set(CATEGORIES.map((c) => c.id));
const sectionIds = new Set(SECTIONS.map((s) => s.id));

// ---- ID の重複 ----
dupes('分野', CATEGORIES.map((c) => c.id));
dupes('教本セクション', SECTIONS.map((s) => s.id));
dupes('確認問題', QUESTIONS.map((q) => q.id));
dupes('ドリル', DRILLS.map((d) => d.id));

// ---- 参照先の存在 ----
for (const s of SECTIONS) {
  if (!categoryIds.has(s.categoryId)) err(`教本 ${s.id}: 存在しない分野 ${s.categoryId}`);
}
for (const q of QUESTIONS) {
  if (!categoryIds.has(q.categoryId)) err(`問題 ${q.id}: 存在しない分野 ${q.categoryId}`);
  if (q.sectionId === undefined) warn(`問題 ${q.id}: sectionId が未設定（教本への復習導線が出ない）`);
  else if (!sectionIds.has(q.sectionId)) err(`問題 ${q.id}: 存在しない節 ${q.sectionId}`);
}
for (const d of DRILLS) {
  if (!categoryIds.has(d.categoryId)) err(`ドリル ${d.id}: 存在しない分野 ${d.categoryId}`);
  if (!sectionIds.has(d.sectionId)) err(`ドリル ${d.id}: 存在しない節 ${d.sectionId}`);
}

// ---- 問題の形 ----
for (const q of QUESTIONS) {
  if (q.choices.length !== 4) err(`問題 ${q.id}: 選択肢が ${q.choices.length} 個（4 個であること）`);
  if (q.answer < 0 || q.answer > 3) err(`問題 ${q.id}: answer が範囲外 ${q.answer}`);
  if (new Set(q.choices).size !== q.choices.length) err(`問題 ${q.id}: 選択肢に重複がある`);
  if (q.explanation.trim() === '') err(`問題 ${q.id}: 解説が空`);
}

// ---- ドリルは実際に生成して確かめる（乱数なので複数回試す） ----
for (const d of DRILLS) {
  for (let i = 0; i < 200; i++) {
    const item = d.generate();
    if (item.choices.length !== 4) {
      err(`ドリル ${d.id}: 選択肢が ${item.choices.length} 個になる場合がある`);
      break;
    }
    if (new Set(item.choices).size !== item.choices.length) {
      err(`ドリル ${d.id}: 選択肢が重複する場合がある → ${item.choices.join(' / ')}`);
      break;
    }
    if (item.answer < 0 || item.answer >= item.choices.length) {
      err(`ドリル ${d.id}: answer が範囲外になる場合がある`);
      break;
    }
  }
}

// ---- 本文の記法 ----
const KNOWN_DIAGRAMS = new Set(['flow', 'stack', 'tree', 'matrix', 'cycle', 'seq', 'bits', 'compare']);
/** ```widget: で呼べるウィジェットの id。src/components/widgets/*.tsx のファイル名 */
const KNOWN_WIDGETS = new Set<string>([
  'activation',
  'softmax',
  'convsize',
  'matmul',
  'entropy',
  'distribution',
  'gradient',
  'attention',
  'confusion',
  'roc',
]);
/** 本文リンクで飛べるページ（ハッシュルータの第 1 要素） */
const KNOWN_PAGES = new Set([
  'home',
  'textbook',
  'tools',
  'practice',
  'drill',
  'sheet',
  'review',
  'mock',
  'stats',
  'settings',
]);

const fence = new RegExp('^```(.*)$');

for (const s of SECTIONS) {
  const lines = s.body.split(LF);
  let open: string | null = null;
  let quizBuf: string[] = [];

  for (const line of lines) {
    const m = fence.exec(line.trim());
    if (m) {
      if (open === null) {
        open = m[1].trim();
        quizBuf = [];
        const lang = open;
        if (lang.startsWith('diagram:')) {
          const t = lang.slice('diagram:'.length);
          if (!KNOWN_DIAGRAMS.has(t)) err(`教本 ${s.id}: 未知の図の種類 ${t}`);
        }
        if (lang.startsWith('widget:')) {
          const w = lang.slice('widget:'.length);
          if (!KNOWN_WIDGETS.has(w)) err(`教本 ${s.id}: 未登録のウィジェット ${w}`);
        }
      } else {
        if (open === 'quiz') {
          if (quizBuf.length === 0) err(`教本 ${s.id}: 空の quiz ブロック`);
          for (const q of quizBuf) {
            if (!q.includes('::')) err(`教本 ${s.id}: quiz の行に :: がない → ${q.slice(0, 30)}`);
          }
        }
        open = null;
      }
      continue;
    }
    if (open === 'quiz' && line.trim() !== '') quizBuf.push(line.trim());
  }
  if (open !== null) err(`教本 ${s.id}: 閉じていないコードフェンス（${open || '言語指定なし'}）`);
}

// ---- 図の中の書式 ----
// 図は Markdown を通らないので、`**強調**` を書くとアスタリスクがそのまま出る。
// compare は「1 行 1 セル、偶数行が左・奇数行が右」なので、要素が奇数だと対にならない。
const DIRECTIVE_KEYS = new Set(['title', 'top', 'bottom', 'x', 'y', 'note', 'actors', 'caption']);
for (const s of SECTIONS) {
  let type: string | null = null;
  let items = 0;
  for (const raw of s.body.split(LF)) {
    const t = raw.trim();
    if (t.startsWith('```')) {
      if (type !== null) {
        if (type === 'compare' && items % 2 === 1) {
          err(`教本 ${s.id}: compare の要素が奇数個なので左右が対にならない（1 行 1 セルで書く）`);
        }
        type = null;
      } else if (t.startsWith('```diagram:')) {
        type = t.slice('```diagram:'.length);
        items = 0;
      }
      continue;
    }
    if (type === null || t === '') continue;
    const m = /^([a-z]+):/.exec(t);
    if (m && DIRECTIVE_KEYS.has(m[1])) continue;
    items++;
    if (t.includes('**')) err(`教本 ${s.id}: 図の中の ** は強調にならずそのまま出る → ${t.slice(0, 40)}`);
  }
}

// ---- 本文リンクの飛び先 ----
const linkRe = /\[[^\]]+\]\(([^)\s]+)\)/g;
for (const s of SECTIONS) {
  let m: RegExpExecArray | null;
  while ((m = linkRe.exec(s.body)) !== null) {
    const to = m[1];
    const [pathPart] = to.split('?');
    const [page, param] = pathPart.split('/');
    if (!KNOWN_PAGES.has(page)) {
      err(`教本 ${s.id}: 存在しないページへのリンク ${to}`);
      continue;
    }
    if (page === 'textbook' && param !== undefined && !sectionIds.has(param)) {
      err(`教本 ${s.id}: 存在しない節へのリンク ${to}`);
    }
  }
}

// ---- 数式のバックスラッシュ落ち ----
// TS のテンプレートリテラル／文字列の中では `\` を 2 つ重ねる必要がある。
// 忘れると `\sum` が `sum` になって画面に出てしまうので、それを検出する。
const COMMANDS = [
  'sum', 'prod', 'int', 'partial', 'nabla', 'infty', 'frac', 'sqrt',
  'alpha', 'beta', 'gamma', 'delta', 'epsilon', 'eta', 'theta', 'lambda',
  'mu', 'sigma', 'tau', 'phi', 'psi', 'omega', 'Sigma', 'Delta', 'Omega',
  'times', 'cdot', 'approx', 'propto', 'hat', 'bar', 'mathbf', 'mathbb', 'mid',
];
const mathSpan = /\$([^$\n]+)\$/g;
const cmdRe = /\\([A-Za-z]+)/g;

/** 本文から数式の断片を集める（行内の `$...$` と ```math フェンスの中身） */
function mathPieces(text: string): string[] {
  const pieces: string[] = [];
  let m: RegExpExecArray | null;
  mathSpan.lastIndex = 0;
  while ((m = mathSpan.exec(text)) !== null) pieces.push(m[1]);
  let inMath = false;
  for (const line of text.split(LF)) {
    const t = line.trim();
    if (t.startsWith('```')) {
      inMath = t === '```math';
      continue;
    }
    if (inMath && t !== '') pieces.push(t);
  }
  return pieces;
}

const checkMath = (label: string, text: string): void => {
  for (const expr of mathPieces(text)) {
    for (const cmd of COMMANDS) {
      const at = expr.indexOf(cmd);
      if (at < 0) continue;
      if (expr[at - 1] === BACKSLASH) continue;
      // 変数名の一部（例: gamma の中の mu）を拾わないよう、前後が英字なら見送る
      const before = expr[at - 1] ?? '';
      const after = expr[at + cmd.length] ?? '';
      if (/[A-Za-z]/.test(before) || /[A-Za-z]/.test(after)) continue;
      warn(`${label}: 数式の ${cmd} にバックスラッシュがない（$ の中で ${BACKSLASH}${BACKSLASH}${cmd} と書く）→ ${expr}`);
    }
    // 表に無い命令は、記号にならずに名前がそのまま画面へ出る
    cmdRe.lastIndex = 0;
    let c: RegExpExecArray | null;
    while ((c = cmdRe.exec(expr)) !== null) {
      if (!isKnownCommand(c[1])) {
        err(`${label}: 数式に未知の命令 ${BACKSLASH}${c[1]}（記号にならず名前が表示される。src/lib/mathSymbols.ts に足すこと）→ ${expr}`);
      }
    }
  }
};
for (const s of SECTIONS) checkMath(`教本 ${s.id}`, s.body);
for (const q of QUESTIONS) {
  checkMath(`問題 ${q.id}`, q.question);
  checkMath(`問題 ${q.id}`, q.explanation);
  q.choices.forEach((c) => checkMath(`問題 ${q.id}`, c));
}

// ---- 問題の作りの偏り ----
// 型でもデータの整合でもなく「問題として成立しているか」を見る。
// fe_exam_app / g_exam_app で先に入れた検査を、あとから移植したもの。
//
// **このアプリでは、200 問すべての正解が「ア」だった。**
// 選択肢を描く ChoiceList は並び順どおりに出すので、「ア」を選ぶだけで
// 全問正解できる状態だった。数え上げていれば初日に気づけたはずのもの。

/** 同じ型の注意が大量に出ると全部読み飛ばされるので、多いときはまとめる */
function warnGroup(label: string, items: string[], show = 10): void {
  if (items.length === 0) return;
  if (items.length <= show) {
    items.forEach(warn);
    return;
  }
  warn(`${label}（${items.length} 件。ひどい順に ${show} 件だけ表示）`);
  items.slice(0, show).forEach((m) => warn('    ' + m));
}

{
  // 出典のある問題は原文どおり収録するもので、こちらでは直せない。直せないものを
  // 警告してはいけない（警告そのものが読み飛ばされるようになる）。
  const own = QUESTIONS.filter((q) => q.source === undefined);

  // 正解の位置。四肢択一なので、散っていれば各 25% 前後になる。
  {
    const count = [0, 0, 0, 0];
    for (const q of own) if (q.answer >= 0 && q.answer <= 3) count[q.answer] += 1;
    const label = ['ア', 'イ', 'ウ', 'エ'];
    for (let i = 0; i < 4; i += 1) {
      const ratio = count[i] / Math.max(1, own.length);
      if (ratio > 0.32 || ratio < 0.18) {
        warn(
          `正解の位置が ${label[i]} に偏っている（自作 ${count[i]} / ${own.length} 問 = ` +
            `${Math.round(ratio * 100)}%）。選択肢を並べ替えて散らすこと。` +
            `ただし数値が昇順に並んでいる問題は並べ替えない`,
        );
      }
    }
  }

  // 正解だけが長いと、読まずに「長いものを選ぶ」で当てられる。
  // 数式は 1 文字ぶんに潰してから数える（$\frac{1}{2}$ は見た目には短い）。
  {
    const width = (s: string): number => s.replace(/\$[^$]*\$/g, '#').replace(/\s/g, '').length;
    const found: { diff: number; msg: string }[] = [];
    for (const q of own) {
      if (q.choices.length !== 4) continue;
      const lens = q.choices.map(width);
      const other = Math.max(...lens.filter((_, i) => i !== q.answer));
      const mine = lens[q.answer];
      // **比で測ってはいけない。** 以前の「1.3 倍かつ 6 字差」では、
      // 長い選択肢どうしの 40 字 / 34 字が 1.18 倍にしかならず素通りする。
      // そうして漏れたものが積み上がり、このアプリでは 200 問のうち 62 問で
      // 正解が最長になっていた（長さの分布から計算した期待値の 3.6 倍）。
      // 受験者がやるのは比の計算ではなく見比べなので、**字数の差**で見る。
      // 以下は入れ替える前の根拠：
      // 閾値の根拠：1.5 倍では緩く、レビューで指摘されたものは 1.35 倍前後に
      // 集中していた。24 字の下限は、短い選択肢どうしで比が暴れるのを防ぐため
      // （「13 字 / 5 字」で 2.6 倍になってしまう）。5 本の姉妹アプリで同じ値。
      if (mine - other >= 5) {
        found.push({ diff: mine - other, msg: `問題 ${q.id}: 正解 ${mine} 字 / 最長の誤答 ${other} 字` });
      }
    }
    found.sort((a, b) => b.diff - a.diff);
    warnGroup('正解だけが突出して長い。誤答も同じ密度で書くこと', found.map((f) => f.msg));
  }

  // 「必ず」「常に」が誤答にしか出てこないと、それ自体が手掛かりになる。
  //
  // **「3 つすべて」では緩すぎた。** 2 つ消去できれば残りは二択になり、
  // それだけで正答率が 25 % から 50 % に上がる。2 つ以上で数える。
  //
  // 「すべて」は数え方が難しい。「すべての入力に対して」のようなただの記述まで
  // 拾ってしまうので、断定を強める語だけを見る。
  // 「常に」は部分一致だと「非常に」「通常に」まで拾ってしまうので、直前の字で除く
  // （「局所最適解が非常に多く」を誤って拾ったことがある）。
  {
    const absolute = /必ず|(?<![非通日])常に|まったく|全く|一切|絶対|例外なく|いかなる場合|どのような場合|どんな場合|一律|あらゆる/;
    const found: string[] = [];
    for (const q of own) {
      if (q.choices.length !== 4) continue;
      const wrong = q.choices.filter((_, i) => i !== q.answer).filter((c) => absolute.test(c)).length;
      if (wrong >= 2 && !absolute.test(q.choices[q.answer])) {
        found.push(`問題 ${q.id}: 誤答 ${wrong} つに言い切りがあり、正解にはない`);
      }
    }
    warnGroup('言い切りが誤答側にだけ出ている', found);
  }

  // 「本文で挙げられているものはどれか」は、知識ではなく直前の記載を覚えているかを
  // 問う形になっていて、教本を閉じた受験者には答えようがない。
  {
    const found: string[] = [];
    for (const q of own) {
      // 「本文」だけで見ると、文字列照合の「本文（探索される側の文字列）」まで
      // 拾ってしまう。記載を指す動詞と組になっているときだけ数える。
      if (/(本文|教本|この節)(で|に)(挙げ|述べ|示さ|説明さ|書か)/.test(q.question)) {
        found.push(`問題 ${q.id}: 設問が教本の記載そのものを指している（「${q.question.slice(0, 24)}…」）`);
      }
    }
    warnGroup('教材内の記載を探させる設問になっている。知識を問う形にすること', found);
  }
}

// 節をまたいだ重複は、1 節ずつ見ている限り気づけないので機械に数えさせる。
// 問題文だけで測ると「〜として、適切なものはどれか」の定型が効いて全部似るため、
// 選択肢も混ぜて測る。同じ節の中で似るのは対比のために対で作った問題なので正常。
{
  const grams = (q: (typeof QUESTIONS)[number]): Set<string> => {
    const t = (q.question + [...q.choices].sort().join('')).replace(
      /[\s。、，,．.「」『』（）()]/g,
      '',
    );
    const set = new Set<string>();
    for (let i = 0; i < t.length - 1; i += 1) set.add(t.slice(i, i + 2));
    return set;
  };
  /** 問題文と選択肢に出てくる数を、順序どおりに並べた文字列 */
  const numbers = (q: (typeof QUESTIONS)[number]): string =>
    (q.question + q.choices.join(' ')).match(/[0-9][0-9,.]*/g)?.join('/') ?? '';
  const rows = QUESTIONS.map((q) => ({ q, g: grams(q), nums: numbers(q) }));
  const found: string[] = [];
  for (let i = 0; i < rows.length; i += 1) {
    for (let j = i + 1; j < rows.length; j += 1) {
      if (rows[i].q.source !== undefined && rows[j].q.source !== undefined) continue;
      const a = rows[i].g;
      const b = rows[j].g;
      let hit = 0;
      a.forEach((g) => {
        if (b.has(g)) hit += 1;
      });
      const sim = (2 * hit) / (a.size + b.size);
      const sameSection =
        rows[i].q.sectionId !== undefined && rows[i].q.sectionId === rows[j].q.sectionId;
      // 同じ公式を、理論の節と演習の節で**数値だけ変えて**出すのは意図した繰返し
      // なので重複ではない（稼働率・損益分岐点・伝送時間・待ち行列など）。
      // 文面が似ていても、出てくる数が違えば別の問題として扱う。
      if (sim >= 0.6 && !sameSection && rows[i].nums === rows[j].nums) {
        found.push(`${rows[i].q.id} と ${rows[j].q.id} が別の節でほぼ同じ内容（類似度 ${sim.toFixed(2)}）`);
      }
    }
  }
  warnGroup('別の節にほぼ同じ問題がある。片方の数値か観点を変える', found);
}

// ---- 実際に描いてみる ----
// 記法としては正しくても、描くと崩れている場合がある（強調の中の数式など）。
for (const p of renderCheck()) err(p);

// ---- 集計して表示 ----
const sectionsPerCategory = new Map<string, number>();
for (const s of SECTIONS) sectionsPerCategory.set(s.categoryId, (sectionsPerCategory.get(s.categoryId) ?? 0) + 1);
const emptyChapters = CATEGORIES.filter((c) => !sectionsPerCategory.has(c.id));

const chars = SECTIONS.reduce((n, s) => n + s.body.length, 0);
const linked = QUESTIONS.filter((q) => q.sectionId !== undefined).length;

console.log('--- 収録状況 ---');
console.log(`教本      : ${SECTIONS.length} 節 / ${chars.toLocaleString()} 字（未着手の章 ${emptyChapters.length}）`);
console.log(`確認問題  : ${QUESTIONS.length} 問（節にひも付き ${linked} 問）`);
console.log(`計算ドリル: ${DRILLS.length} 種類`);
if (emptyChapters.length > 0) {
  console.log(`未着手の章: ${emptyChapters.map((c) => c.name).join('、')}`);
}

console.log('');

// ---- 姉妹アプリと共有する入れ物に、アプリ固有の名前が付いているか ----
//
// **localStorage も Cache Storage もオリジン単位**なので、
// github.io に姉妹アプリを並べると 1 つの入れ物を共有する。
//   - localStorage のキーがぶつかれば、学習記録が混ざる
//   - サービスワーカーの activate が「自分以外」を消せば、隣のキャッシュまで巻き添えになる
//
// **★ 実際に起きていた**（2026 年 9 月 19 日に発見）。
// このアプリを含む 5 本が activate で「自分以外を全部消す」形になっていて、
// **開くたびに姉妹アプリのオフラインキャッシュを消していた。**
// 型でもビルドでも止まらず、8 本を並べて見比べて初めて分かった。
//
// 接頭辞は**いま使っているものを動かさない**こと。付け替えると、
// すでに配布したキャッシュを一度捨てることになる。
{
  const OWN_PREFIX = 'e-exam-app-';
  try {
    const sw = readFileSync('public/sw.js', 'utf8');
    const m = sw.match(/const CACHE_PREFIX = '([^']*)'/);
    if (!m) {
      err('public/sw.js: CACHE_PREFIX がありません。キャッシュ名がオリジンの中でアプリ固有になっていません');
    } else if (m[1] !== OWN_PREFIX) {
      err(`public/sw.js: CACHE_PREFIX が ${m[1]}。このアプリの接頭辞は ${OWN_PREFIX} です`);
    }
    if (!/startsWith\(CACHE_PREFIX\)/.test(sw)) {
      err(
        'public/sw.js: activate が startsWith(CACHE_PREFIX) で絞っていません。' +
          'オリジンを共有する姉妹アプリのキャッシュまで消します',
      );
    }
  } catch {
    /* sw.js が無いなら飛ばす */
  }
  try {
    const st = readFileSync('src/lib/storage.ts', 'utf8');
    const m = st.match(/const KEY = '([^']*)'/);
    if (m && !m[1].startsWith(OWN_PREFIX)) {
      err(`src/lib/storage.ts: localStorage のキーが ${m[1]}。${OWN_PREFIX} で始めてください`);
    }
  } catch {
    /* storage.ts が無いなら飛ばす */
  }
}

if (warnings.length > 0) {
  console.log(`--- 注意 ${warnings.length} 件 ---`);
  warnings.forEach((w) => console.log('  ' + w));
  console.log('');
}
if (errors.length === 0) {
  console.log('整合性チェック: エラーなし');
} else {
  console.log(`--- エラー ${errors.length} 件 ---`);
  errors.forEach((e) => console.log('  ' + e));
  process.exit(1);
}
