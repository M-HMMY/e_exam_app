import { useState, type JSX } from 'react';

/**
 * 混同行列から各指標を出すツール。
 *
 * 狙いは「不均衡データで正解率を見てはいけない」を数字で体験させること。
 * プリセットを押すと、正解率 99% なのに再現率 10% という状態が作れる。
 */
export const widgetId = 'confusion';

const fmt = (x: number): string => (Number.isFinite(x) ? `${(x * 100).toFixed(1)}%` : '—');

export default function ConfusionWidget(): JSX.Element {
  const [tp, setTp] = useState(40);
  const [fp, setFp] = useState(10);
  const [fn, setFn] = useState(20);
  const [tn, setTn] = useState(30);

  const total = tp + fp + fn + tn;
  const accuracy = total > 0 ? (tp + tn) / total : NaN;
  const precision = tp + fp > 0 ? tp / (tp + fp) : NaN;
  const recall = tp + fn > 0 ? tp / (tp + fn) : NaN;
  const specificity = tn + fp > 0 ? tn / (tn + fp) : NaN;
  const f1 = Number.isFinite(precision) && Number.isFinite(recall) && precision + recall > 0
    ? (2 * precision * recall) / (precision + recall)
    : NaN;

  const num = (label: string, value: number, set: (v: number) => void): JSX.Element => (
    <label className="widget-field">
      {label}
      <input
        type="number"
        min={0}
        max={100000}
        value={value}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (!Number.isFinite(v)) return;
          set(Math.max(0, Math.min(100000, Math.round(v))));
        }}
      />
    </label>
  );

  const preset = (a: number, b: number, c: number, d: number): void => {
    setTp(a);
    setFp(b);
    setFn(c);
    setTn(d);
  };

  return (
    <>
      <div className="widget-head">
        <h4 className="widget-title">混同行列と評価指標</h4>
        <p className="widget-desc">
          4 つの数を動かすと、各指標がどう連動するかが見えます。とくに<strong>正解率だけを見る危うさ</strong>を確かめてください。
        </p>
      </div>

      <div className="widget-controls">
        {num('TP（陽性を陽性）', tp, setTp)}
        {num('FP（陰性を陽性）', fp, setFp)}
        {num('FN（陽性を陰性）', fn, setFn)}
        {num('TN（陰性を陰性）', tn, setTn)}
      </div>

      <div className="widget-row">
        <button type="button" className="btn small" onClick={() => preset(1, 0, 9, 990)}>
          不均衡な例（見逃しだらけ）
        </button>
        <button type="button" className="btn small" onClick={() => preset(50, 450, 0, 500)}>
          取りこぼさない代わりに誤報だらけ
        </button>
        <button type="button" className="btn small" onClick={() => preset(40, 10, 20, 30)}>
          戻す
        </button>
      </div>

      <table className="widget-table">
        <thead>
          <tr>
            <th />
            <th>予測 陽性</th>
            <th>予測 陰性</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th>実際 陽性</th>
            <td className="hit">TP {tp}</td>
            <td className="miss">FN {fn}</td>
          </tr>
          <tr>
            <th>実際 陰性</th>
            <td className="miss">FP {fp}</td>
            <td className="hit">TN {tn}</td>
          </tr>
        </tbody>
      </table>

      <div className="widget-out">
        <div className="out-item">
          <span className="out-label">正解率</span>
          <span className="out-value">{fmt(accuracy)}</span>
        </div>
        <div className="out-item">
          <span className="out-label">適合率</span>
          <span className="out-value">{fmt(precision)}</span>
        </div>
        <div className="out-item">
          <span className="out-label">再現率</span>
          <span className="out-value">{fmt(recall)}</span>
        </div>
        <div className="out-item">
          <span className="out-label">F 値</span>
          <span className="out-value">{fmt(f1)}</span>
        </div>
        <div className="out-item">
          <span className="out-label">特異度</span>
          <span className="out-value">{fmt(specificity)}</span>
        </div>
      </div>

      <p className="widget-note">
        <strong>「不均衡な例」を押すと、正解率 99.1% なのに再現率は 10.0%</strong> になります。
        1000 件のうち陽性が 10 件しかないので、ほとんどを陰性と答えるだけで正解率は上がってしまいます。
        <br />
        <strong>適合率と再現率は綱引きの関係</strong>です。陽性と答える基準をゆるめれば FN が減って再現率が上がり、
        代わりに FP が増えて適合率が下がります。F 値はその 2 つの調和平均で、
        <strong>算術平均ではありません</strong>（片方が極端に低いと F 値も低くなります）。
      </p>
    </>
  );
}
