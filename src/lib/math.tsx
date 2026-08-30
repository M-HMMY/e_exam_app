import type { JSX, ReactNode } from 'react';

/**
 * 依存を増やさずに済ませるための、ごく軽い数式表示。
 *
 * 本文では `$...$`（行内）と ```math フェンス（別行立て）で書く。扱うのは次だけ。
 *   - `^{...}` `_{...}` … 上付き・下付き（1 文字なら波かっこを省ける: `x^2`, `w_i`）
 *   - `\alpha` などのバックスラッシュ命令 … 下の SYMBOL 表にある記号に置換
 *   - `\frac{a}{b}` … 横線付きの分数
 *   - それ以外の文字はそのまま（変数はイタリック体で表示される）
 *
 * KaTeX を入れれば表現力は上がるが、この試験で必要な式は上の範囲でほぼ書ける。
 * 行列や総和の添字が積み上がる式など、どうしても足りない場合だけ図（```diagram:matrix）に逃がす。
 * 表現力が足りなくなったら KaTeX への差し替えを検討すること（この関数の置き換えだけで済む）。
 */

/** バックスラッシュそのもの。リテラルで書くと編集経路によって壊れやすいので定数にする */
const BACKSLASH = String.fromCharCode(92);

const SYMBOL: Record<string, string> = {
  alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε', varepsilon: 'ε',
  zeta: 'ζ', eta: 'η', theta: 'θ', iota: 'ι', kappa: 'κ', lambda: 'λ', mu: 'μ',
  nu: 'ν', xi: 'ξ', pi: 'π', rho: 'ρ', sigma: 'σ', tau: 'τ', phi: 'φ', chi: 'χ',
  psi: 'ψ', omega: 'ω',
  Gamma: 'Γ', Delta: 'Δ', Theta: 'Θ', Lambda: 'Λ', Xi: 'Ξ', Pi: 'Π',
  Sigma: 'Σ', Phi: 'Φ', Psi: 'Ψ', Omega: 'Ω',
  sum: '∑', prod: '∏', int: '∫', partial: '∂', nabla: '∇', infty: '∞',
  times: '×', cdot: '·', div: '÷', pm: '±', mp: '∓',
  le: '≤', ge: '≥', ne: '≠', approx: '≈', equiv: '≡', propto: '∝', sim: '∼',
  in: '∈', notin: '∉', subset: '⊂', subseteq: '⊆', cup: '∪', cap: '∩',
  forall: '∀', exists: '∃', emptyset: '∅',
  to: '→', rightarrow: '→', leftarrow: '←', mapsto: '↦', Rightarrow: '⇒',
  odot: '⊙', otimes: '⊗', oplus: '⊕', star: '⋆', ast: '∗',
  sqrt: '√', angle: '∠', perp: '⊥', parallel: '∥',
  ldots: '…', cdots: '⋯', vdots: '⋮', ddots: '⋱',
  hat: '^', bar: '‾', tilde: '~', prime: '′',
  mathbb: '', mathbf: '', mathrm: '', text: '', left: '', right: '',
};

/** `{...}` を対応を数えて取り出す。開き波かっこの位置を渡す */
function takeGroup(src: string, open: number): { body: string; end: number } {
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') {
      depth--;
      if (depth === 0) return { body: src.slice(open + 1, i), end: i + 1 };
    }
  }
  // 閉じかっこがない場合は残り全部を中身とみなす（本文が壊れても表示は続ける）
  return { body: src.slice(open + 1), end: src.length };
}

/** 上付き・下付きの対象を 1 つ取り出す。`^{...}` でも `^2` でも受ける */
function takeArg(src: string, at: number): { body: string; end: number } {
  if (src[at] === '{') return takeGroup(src, at);
  return { body: src[at] ?? '', end: at + 1 };
}

function render(src: string, keyPrefix: string): ReactNode[] {
  const out: ReactNode[] = [];
  let plain = '';
  let n = 0;
  const flush = (): void => {
    if (plain !== '') {
      out.push(plain);
      plain = '';
    }
  };

  let i = 0;
  while (i < src.length) {
    const c = src[i];

    if (c === BACKSLASH) {
      const m = /^\\([A-Za-z]+)/.exec(src.slice(i));
      if (m) {
        const name = m[1];
        i += m[0].length;
        if (name === 'frac') {
          // \frac{分子}{分母}
          const num = takeGroup(src, src.indexOf('{', i));
          const den = takeGroup(src, src.indexOf('{', num.end));
          flush();
          out.push(
            <span className="frac" key={`${keyPrefix}-f${n++}`}>
              <span className="frac-num">{render(num.body, `${keyPrefix}-f${n}n`)}</span>
              <span className="frac-den">{render(den.body, `${keyPrefix}-f${n}d`)}</span>
            </span>,
          );
          i = den.end;
          continue;
        }
        const sym = SYMBOL[name];
        if (sym !== undefined) {
          // \mathbf{x} のような装飾命令は中身だけ残す
          plain += sym;
          continue;
        }
        plain += name; // 未知の命令は名前をそのまま出す（読めなくはならない）
        continue;
      }
      plain += src[i + 1] ?? ''; // \{ や \, などのエスケープ
      i += 2;
      continue;
    }

    if (c === '^' || c === '_') {
      const arg = takeArg(src, i + 1);
      flush();
      const inner = render(arg.body, `${keyPrefix}-s${n}`);
      out.push(
        c === '^' ? (
          <sup key={`${keyPrefix}-s${n++}`}>{inner}</sup>
        ) : (
          <sub key={`${keyPrefix}-s${n++}`}>{inner}</sub>
        ),
      );
      i = arg.end;
      continue;
    }

    plain += c;
    i++;
  }
  flush();
  return out;
}

/** 行内数式（`$...$`） */
export function MathInline({ expr }: { expr: string }): JSX.Element {
  return <span className="math">{render(expr, 'mi')}</span>;
}

/** 別行立ての数式（```math フェンス）。1 行 1 式で書く */
export function MathBlock({ source }: { source: string }): JSX.Element {
  const lines = source
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l !== '');
  return (
    <div className="math-block">
      {lines.map((l, i) => (
        <div className="math-line" key={i}>
          <span className="math">{render(l, `mb${i}`)}</span>
        </div>
      ))}
    </div>
  );
}
