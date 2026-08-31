import { useState, type JSX } from 'react';

/**
 * 畳み込み層の出力サイズとパラメータ数を、その場で確かめるツール。
 *
 * 公式を覚えるより、値を動かして「パディングを (F-1)/2 にすると保たれる」
 * 「パラメータ数は画像サイズに依存しない」を体で掴んでもらうのが狙い。
 */
export const widgetId = 'convsize';

export default function ConvSizeWidget(): JSX.Element {
  const [input, setInput] = useState(32);
  const [f, setF] = useState(3);
  const [s, setS] = useState(1);
  const [p, setP] = useState(1);
  const [cin, setCin] = useState(3);
  const [cout, setCout] = useState(64);

  const raw = (input + 2 * p - f) / s; // 「割り算の中身」として表示する値。+1 はこのあと
  const out = Math.floor((input + 2 * p - f) / s) + 1;
  const valid = out >= 1 && input + 2 * p - f >= 0;
  const weights = f * f * cin * cout;
  const params = weights + cout;
  const macs = out * out * weights; // 積和の回数（バイアスを除く）
  const same = valid && out === input;

  const num = (
    label: string,
    value: number,
    set: (v: number) => void,
    min: number,
    max: number,
  ): JSX.Element => (
    <label className="widget-field">
      {label}
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => {
          // 「-」や「1e」を打っている途中は NaN になる。Math.max は NaN を素通しするので先に弾く
          const v = Number(e.target.value);
          if (!Number.isFinite(v)) return;
          set(Math.max(min, Math.min(max, Math.round(v))));
        }}
      />
    </label>
  );

  return (
    <>
      <div className="widget-head">
        <h4 className="widget-title">畳み込みの出力サイズとパラメータ数</h4>
        <p className="widget-desc">
          出力の 1 辺は <span className="mono">floor((I + 2P − F) / S) + 1</span>、パラメータ数は{' '}
          <span className="mono">(F × F × C_in + 1) × C_out</span> です。値を動かして確かめてください。
        </p>
      </div>

      <div className="widget-controls">
        {num('入力 I', input, setInput, 1, 1024)}
        {num('フィルタ F', f, setF, 1, 11)}
        {num('ストライド S', s, setS, 1, 8)}
        {num('パディング P', p, setP, 0, 8)}
        {num('入力ch', cin, setCin, 1, 2048)}
        {num('出力ch', cout, setCout, 1, 2048)}
      </div>

      <div className="widget-out">
        <div className="out-item">
          <span className="out-label">出力サイズ</span>
          <span className="out-value">{valid ? `${out}×${out}` : '計算できない'}</span>
        </div>
        <div className="out-item">
          <span className="out-label">パラメータ数（バイアス込み）</span>
          <span className="out-value">{params.toLocaleString('en-US')}</span>
        </div>
        <div className="out-item">
          <span className="out-label">積和の回数</span>
          <span className="out-value">{valid ? macs.toLocaleString('en-US') : '—'}</span>
        </div>
      </div>

      <table className="widget-table">
        <tbody>
          <tr>
            <th>割り算の中身</th>
            <td className="mono">
              ({input} + 2×{p} − {f}) ÷ {s} = {valid ? raw.toFixed(2) : '—'}
            </td>
          </tr>
          <tr>
            <th>切り捨てて +1</th>
            <td className="mono">{valid ? `${Math.floor((input + 2 * p - f) / s)} + 1 = ${out}` : 'フィルタが入力からはみ出している'}</td>
          </tr>
          <tr>
            <th>重み ／ バイアス</th>
            <td className="mono">
              {f}×{f}×{cin}×{cout} = {weights.toLocaleString('en-US')} ／ {cout.toLocaleString('en-US')}
            </td>
          </tr>
        </tbody>
      </table>

      <p className="widget-note">
        {same ? (
          <>
            <strong>いまの設定では入力とサイズが変わりません。</strong>たいていは P = (F−1)/2 かつストライド 1 のときです。
          </>
        ) : f % 2 === 0 ? (
          <>
            <strong>フィルタが偶数のときは、左右対称のパディングでサイズを保てません。</strong>
            (F−1)/2 が整数にならないためで、3×3 や 5×5 のような奇数のフィルタが好まれるのはこれが理由です。
          </>
        ) : (
          <>P を (F−1)/2 = {(f - 1) / 2} にしてストライドを 1 にすると、サイズが保たれます。</>
        )}
        <br />
        <strong>入力サイズを変えてもパラメータ数は変わりません。</strong>変わるのは積和の回数（計算量）と特徴マップのメモリだけです。
        フィルタを 1×1 にすると、空間方向には何もせずチャネル数だけを変える層になります。
      </p>
    </>
  );
}
