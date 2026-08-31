import { useState, type JSX } from 'react';

/**
 * しきい値と ROC 曲線のツール。
 *
 * 陽性・陰性のスコア分布を 2 つの正規分布で作り、しきい値を動かすと
 * 再現率（TPR）と偽陽性率（FPR）がどう動くかを見せる。
 * ROC 曲線は「しきい値を全部試した軌跡」であることを、点の位置で示す。
 */
export const widgetId = 'roc';

const W = 300;
const H = 220;
const PAD = 34;

/** 標準正規分布の累積分布（誤差関数の近似）*/
function phi(x: number): number {
  // Abramowitz & Stegun 26.2.17
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp((-x * x) / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - p : p;
}

export default function RocWidget(): JSX.Element {
  // 陽性クラスは平均 separation、陰性クラスは平均 0（どちらも標準偏差 1）
  const [separation, setSeparation] = useState(2);
  const [threshold, setThreshold] = useState(1);

  const tpr = 1 - phi(threshold - separation);
  const fpr = 1 - phi(threshold);
  // 2 つの正規分布が等分散のとき AUC = Φ(d / √2)
  const auc = phi(separation / Math.SQRT2);

  const sx = (x: number): number => PAD + x * (W - 2 * PAD);
  const sy = (y: number): number => H - PAD - y * (H - 2 * PAD);

  const curve: string[] = [];
  for (let i = 0; i <= 100; i++) {
    const t = 5 - (i / 100) * 10; // しきい値を高い方から下げていく
    curve.push(`${i === 0 ? 'M' : 'L'}${sx(1 - phi(t)).toFixed(1)},${sy(1 - phi(t - separation)).toFixed(1)}`);
  }

  return (
    <>
      <div className="widget-head">
        <h4 className="widget-title">しきい値と ROC 曲線</h4>
        <p className="widget-desc">
          陽性と陰性のスコア分布がどれだけ離れているか（分離度）と、どこで切るか（しきい値）を動かします。
        </p>
      </div>

      <div className="widget-row">
        <label className="widget-field" htmlFor="roc-sep">
          分離度 = {separation.toFixed(1)}
        </label>
        <input
          id="roc-sep"
          className="slider"
          type="range"
          min="0"
          max="4"
          step="0.1"
          value={separation}
          onChange={(e) => setSeparation(Number(e.target.value))}
        />
        <label className="widget-field" htmlFor="roc-th">
          しきい値 = {threshold.toFixed(1)}
        </label>
        <input
          id="roc-th"
          className="slider"
          type="range"
          min="-3"
          max="5"
          step="0.1"
          value={threshold}
          onChange={(e) => setThreshold(Number(e.target.value))}
        />
      </div>

      <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="ROC 曲線">
        <line className="axis" x1={PAD} y1={sy(0)} x2={W - PAD} y2={sy(0)} />
        <line className="axis" x1={PAD} y1={sy(0)} x2={PAD} y2={sy(1)} />
        <line className="grid" x1={sx(0)} y1={sy(0)} x2={sx(1)} y2={sy(1)} />
        <path className="line" d={curve.join(' ')} />
        <circle className="marker" cx={sx(fpr)} cy={sy(tpr)} r={5} />
        <text className="chart-text" x={sx(0.5)} y={H - PAD + 14} textAnchor="middle">
          偽陽性率 FPR
        </text>
        <text className="chart-text" x={PAD - 6} y={sy(1) + 4} textAnchor="end">
          1
        </text>
        <text className="chart-text" x={PAD - 6} y={sy(0) + 4} textAnchor="end">
          0
        </text>
      </svg>

      <div className="widget-out">
        <div className="out-item">
          <span className="out-label">再現率（TPR）</span>
          <span className="out-value">{(tpr * 100).toFixed(1)}%</span>
        </div>
        <div className="out-item">
          <span className="out-label">偽陽性率（FPR）</span>
          <span className="out-value">{(fpr * 100).toFixed(1)}%</span>
        </div>
        <div className="out-item">
          <span className="out-label">特異度</span>
          <span className="out-value">{((1 - fpr) * 100).toFixed(1)}%</span>
        </div>
        <div className="out-item">
          <span className="out-label">AUC</span>
          <span className="out-value">{auc.toFixed(3)}</span>
        </div>
      </div>

      <p className="widget-note">
        しきい値を下げるほど「陽性」と答える数が増えるので、<strong>TPR も FPR も一緒に上がります</strong>。
        点は左下（何も陽性と言わない）から右上（全部陽性と言う）へ動くだけで、曲線そのものは動きません。
        <strong>ROC 曲線はしきい値を全部試した軌跡</strong>で、AUC はその下の面積です。
        <br />
        分離度を 0 にすると曲線が対角線に重なり、AUC は 0.5——<strong>でたらめに答えるのと同じ</strong>になります。
        AUC は<strong>しきい値の選び方に依存しない</strong>ので、モデルどうしの比較に使えます。
        一方で、正解率や F 値は選んだしきい値ごとの値である点に注意してください。
      </p>
    </>
  );
}
