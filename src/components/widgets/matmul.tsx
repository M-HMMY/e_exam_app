import { useState, type JSX } from 'react';

/**
 * 行列積の形を確かめるツール。
 *
 * 「内側が一致していないと計算できない」「内側が消えて外側が残る」を、
 * 数字を動かしながら見てもらう。小さい形のときは実際の積も表示する。
 */
export const widgetId = 'matmul';

const MAX_SHOW = 4; // これ以下の形なら中身も描く

export default function MatMulWidget(): JSX.Element {
  const [a, setA] = useState(2);
  const [b, setB] = useState(3);
  const [c, setC] = useState(3);
  const [d, setD] = useState(2);

  const ok = b === c;
  const macs = a * b * d;

  // 中身の例（1 から順に並べた行列）
  const showBody = ok && a <= MAX_SHOW && b <= MAX_SHOW && d <= MAX_SHOW;
  const A: number[][] = Array.from({ length: a }, (_, i) => Array.from({ length: b }, (_, j) => i * b + j + 1));
  const B: number[][] = Array.from({ length: c }, (_, i) => Array.from({ length: d }, (_, j) => (i * d + j) % 5));
  const C: number[][] = Array.from({ length: a }, (_, i) =>
    Array.from({ length: d }, (_, j) => A[i].reduce((sum, v, k) => sum + v * B[k][j], 0)),
  );

  const num = (label: string, value: number, set: (v: number) => void): JSX.Element => (
    <label className="widget-field">
      {label}
      <input
        type="number"
        min={1}
        max={12}
        value={value}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (!Number.isFinite(v)) return;
          set(Math.max(1, Math.min(12, Math.round(v))));
        }}
      />
    </label>
  );

  const grid = (m: number[][], caption: string): JSX.Element => (
    <div className="out-item">
      <span className="out-label">{caption}</span>
      <span className="mono" style={{ fontSize: '12px', lineHeight: 1.6 }}>
        {m.map((row, i) => (
          <span key={i} style={{ display: 'block' }}>
            {row.join('  ')}
          </span>
        ))}
      </span>
    </div>
  );

  return (
    <>
      <div className="widget-head">
        <h4 className="widget-title">行列積の形</h4>
        <p className="widget-desc">
          形 (A行, A列) と (B行, B列) を動かしてみてください。<strong>内側の 2 つが一致していないと計算できません。</strong>
        </p>
      </div>

      <div className="widget-controls">
        {num('A の行', a, setA)}
        {num('A の列', b, setB)}
        {num('B の行', c, setC)}
        {num('B の列', d, setD)}
      </div>

      <div className="widget-out">
        <div className="out-item">
          <span className="out-label">計算</span>
          <span className="out-value mono">
            ({a}, {b}) × ({c}, {d})
          </span>
        </div>
        <div className="out-item">
          <span className="out-label">結果の形</span>
          <span className="out-value">{ok ? `(${a}, ${d})` : '計算できない'}</span>
        </div>
        <div className="out-item">
          <span className="out-label">積和の回数</span>
          <span className="out-value">{ok ? macs.toLocaleString('en-US') : '—'}</span>
        </div>
      </div>

      {showBody && (
        <div className="widget-out">
          {grid(A, `A （${a}, ${b}）`)}
          {grid(B, `B （${c}, ${d}）`)}
          {grid(C, `A × B （${a}, ${d}）`)}
        </div>
      )}

      <p className="widget-note">
        {ok ? (
          <>
            内側の {b} が一致しているので計算できます。<strong>内側が消えて外側が残り、({a}, {d}) になります。</strong>
            結果の各要素は「A の 1 行と B の 1 列の内積」なので、掛け算が {b} 回、足し算が {b - 1} 回必要です。
          </>
        ) : (
          <>
            <strong>A の列数 {b} と B の行数 {c} が違うので計算できません。</strong>
            この場合、B の形を ({b}, ?) にするか、A の形を (?, {c}) にする必要があります。
          </>
        )}
        <br />
        ミニバッチを流すときの (バッチ, 入力次元) × (入力次元, 出力次元) も同じ形です。
        <strong>バッチの次元は消えずに残る</strong>ので、出力は (バッチ, 出力次元) になります。
      </p>
    </>
  );
}
