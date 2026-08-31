import { renderToStaticMarkup } from 'react-dom/server';
import { Markdown } from '../src/lib/markdown';
import { SECTIONS } from '../src/data/textbook';
import { QUESTIONS } from '../src/data/questions';

/**
 * 実際に描いてみて、画面に出てはいけないものが残っていないかを見る検査。
 * `npm run check` から呼ばれる（check.ts と違い、こちらは React を通す）。
 *
 * 型でも記法の検査でも捕まらない崩れ方が実際にあった。
 *   - `$...$` が強調の中にあると数式にならず、$ ごと画面に出ていた
 *   - `\mathbf{x}` の波かっこが記号にならず `{x}` と出ていた
 * どちらも「描いてみれば一目で分かる」たぐいなので、機械にやらせる。
 */

const BACKSLASH = String.fromCharCode(92);

/** 数式として描かれた部分だけを取り出す */
function mathTexts(html: string): string[] {
  const out: string[] = [];
  const re = /<span class="math">([\s\S]*?)<\/span>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) out.push(m[1].replace(/<[^>]+>/g, ''));
  return out;
}

function inspect(label: string, source: string, problems: string[]): void {
  const html = renderToStaticMarkup(<Markdown source={source} />);
  for (const t of mathTexts(html)) {
    if (t.includes('{') || t.includes('}')) {
      problems.push(`${label}: 数式に波かっこがそのまま出ている → ${t.slice(0, 60)}`);
    }
    if (t.includes(BACKSLASH)) {
      problems.push(`${label}: 数式にバックスラッシュがそのまま出ている → ${t.slice(0, 60)}`);
    }
  }
  if (html.includes('$')) {
    const at = html.indexOf('$');
    problems.push(`${label}: $ が数式にならず本文に出ている → ${html.slice(Math.max(0, at - 40), at + 40).replace(/<[^>]+>/g, '')}`);
  }
  if (html.includes('未対応の図の種類')) problems.push(`${label}: 未対応の図がある`);
}

/** 見つかった問題の一覧を返す。空なら異常なし */
export function renderCheck(): string[] {
  const problems: string[] = [];
  for (const s of SECTIONS) inspect(`教本 ${s.id}`, s.body, problems);
  for (const q of QUESTIONS) {
    inspect(`問題 ${q.id}`, q.question, problems);
    inspect(`問題 ${q.id}`, q.explanation, problems);
    q.choices.forEach((c) => inspect(`問題 ${q.id}`, c, problems));
  }
  return problems;
}
