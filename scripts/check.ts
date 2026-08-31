/**
 * データの整合性チェック。`npm run check` で実行する。
 *
 * 教本・問題・ドリルは手で書き足していくため、型では防げない食い違いが必ず混ざる。
 * ここで機械的に潰しておくと、あとから「なぜか画面に出ない」を探さずに済む。
 * 新しい不整合の型を見つけたら、直すついでにこのファイルへ検査を足すこと。
 */
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
