import { useState, type JSX } from 'react';

/**
 * 2 値のエントロピー曲線。
 *
 * 「偏るほど小さく、半々のとき最大」という形を、式ではなく曲線で掴ませる。
 * 自己情報量（−log2 p）も同時に出して、期待値として足していることを見せる。
 */
export const widgetId = 'entropy';

const W = 340;
const H = 180;
const PAD = 28;

const log2 = (x: number): number => Math.log(x) / Math.LN2;
const binaryEntropy = (p: number): number =>
  p <= 0 || p >= 1 ? 0 : -(p * log2(p) + (1 - p) * log2(1 - p));

export default function EntropyWidget(): JSX.Element {
  const [p, setP] = useState(0.5);

  const h = binaryEntropy(p);
  const sx = (x: number): number => PAD + x * (W - 2 * PAD);
  const sy = (y: number): number => H - PAD - y * (H - 2 * PAD);

  const path: string[] = [];
  for (let i = 0; i <= 100; i++) {
    const x = i / 100;
    path.push(`${i === 0 ? 'M' : 'L'}${sx(x).toFixed(1)},${sy(binaryEntropy(x)).toFixed(1)}`);
  }

  return (
    <>
      <div className="widget-head">
        <h4 className="widget-title">エントロピー（2 値の場合）</h4>
        <p className="widget-desc">
          表が出る確率 p のゆがんだコインを考えます。エントロピーは「結果を知ったときの驚きの平均」です。
        </p>
      </div>

      <div className="widget-row">
        <label className="widget-field" htmlFor="entropy-p">
          p = {p.toFixed(2)}
        </label>
        <input
          id="entropy-p"
          className="slider"
          type="range"
          min="0.01"
          max="0.99"
          step="0.01"
          value={p}
          onChange={(e) => setP(Number(e.target.value))}
        />
      </div>

      <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="2 値エントロピーの曲線">
        <line className="axis" x1={PAD} y1={sy(0)} x2={W - PAD} y2={sy(0)} />
        <line className="axis" x1={PAD} y1={sy(0)} x2={PAD} y2={sy(1)} />
        <line className="grid" x1={PAD} y1={sy(1)} x2={W - PAD} y2={sy(1)} />
        <path className="line" d={path.join(' ')} />
        <circle className="marker" cx={sx(p)} cy={sy(h)} r={4} />
        <text className="chart-text" x={PAD} y={H - PAD + 12}>0</text>
        <text className="chart-text" x={sx(0.5)} y={H - PAD + 12} textAnchor="middle">0.5</text>
        <text className="chart-text" x={W - PAD} y={H - PAD + 12} textAnchor="end">1</text>
        <text className="chart-text" x={PAD - 4} y={sy(1) + 4} textAnchor="end">1 bit</text>
      </svg>

      <div className="widget-out">
        <div className="out-item">
          <span className="out-label">エントロピー</span>
          <span className="out-value">{h.toFixed(3)} bit</span>
        </div>
        <div className="out-item">
          <span className="out-label">表の自己情報量</span>
          <span className="out-value">{(-log2(p)).toFixed(2)} bit</span>
        </div>
        <div className="out-item">
          <span className="out-label">裏の自己情報量</span>
          <span className="out-value">{(-log2(1 - p)).toFixed(2)} bit</span>
        </div>
      </div>

      <p className="widget-note">
        エントロピーは、2 つの自己情報量を<strong>確率で重み付けして足した値</strong>です。
        {p.toFixed(2)} × {(-log2(p)).toFixed(2)} + {(1 - p).toFixed(2)} × {(-log2(1 - p)).toFixed(2)} ={' '}
        {h.toFixed(3)} bit。
        <br />
        <strong>p = 0.5 のとき最大の 1 bit</strong>、両端に寄るほど 0 に近づきます。
        「めったに起きないこと」ほど自己情報量は大きくなりますが、めったに起きないぶん重みが小さいので、
        平均としては小さくなる、という釣り合いです。
      </p>
    </>
  );
}
