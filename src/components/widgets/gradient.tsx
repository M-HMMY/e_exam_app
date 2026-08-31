import { useState, type JSX } from 'react';

/**
 * 勾配降下法の学習率を体感するツール。
 *
 * f(x) = x^2 という単純な関数で、学習率が小さいと進まない・大きいと
 * 行き過ぎる・2 を超えると発散する、という 3 つの顔を見せる。
 */
export const widgetId = 'gradient';

const W = 340;
const H = 190;
const PAD = 26;
const X_MIN = -3;
const X_MAX = 3;
const Y_MAX = 9;

export default function GradientWidget(): JSX.Element {
  const [lr, setLr] = useState(0.3);
  const [steps, setSteps] = useState(8);

  // x ← x − lr * f'(x)、f(x) = x^2 なので f'(x) = 2x
  const xs: number[] = [2.5];
  for (let i = 0; i < steps; i++) {
    const x = xs[xs.length - 1];
    const next = x - lr * 2 * x;
    xs.push(Number.isFinite(next) ? Math.max(-1e6, Math.min(1e6, next)) : 0);
  }
  const last = xs[xs.length - 1];
  const diverged = Math.abs(last) > Math.abs(xs[0]);

  const sx = (x: number): number => PAD + ((x - X_MIN) / (X_MAX - X_MIN)) * (W - 2 * PAD);
  const sy = (y: number): number => H - PAD - (Math.min(y, Y_MAX) / Y_MAX) * (H - 2 * PAD);
  const inView = (x: number): boolean => x >= X_MIN && x <= X_MAX;

  const curve: string[] = [];
  for (let i = 0; i <= 100; i++) {
    const x = X_MIN + ((X_MAX - X_MIN) * i) / 100;
    curve.push(`${i === 0 ? 'M' : 'L'}${sx(x).toFixed(1)},${sy(x * x).toFixed(1)}`);
  }

  return (
    <>
      <div className="widget-head">
        <h4 className="widget-title">勾配降下法と学習率</h4>
        <p className="widget-desc">
          f(x) = x² の谷を、x = 2.5 から降りていきます。学習率を動かすと、降り方がどう変わるかを見てください。
        </p>
      </div>

      <div className="widget-row">
        <label className="widget-field" htmlFor="gd-lr">
          学習率 = {lr.toFixed(2)}
        </label>
        <input
          id="gd-lr"
          className="slider"
          type="range"
          min="0.01"
          max="1.2"
          step="0.01"
          value={lr}
          onChange={(e) => setLr(Number(e.target.value))}
        />
        <label className="widget-field" htmlFor="gd-steps">
          回数 = {steps}
        </label>
        <input
          id="gd-steps"
          className="slider"
          type="range"
          min="1"
          max="30"
          step="1"
          value={steps}
          onChange={(e) => setSteps(Number(e.target.value))}
        />
      </div>

      <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="勾配降下法の軌跡">
        <line className="axis" x1={PAD} y1={sy(0)} x2={W - PAD} y2={sy(0)} />
        <line className="axis" x1={sx(0)} y1={PAD} x2={sx(0)} y2={H - PAD} />
        <path className="line" d={curve.join(' ')} />
        {xs.map((x, i) =>
          inView(x) ? <circle key={i} className="marker" cx={sx(x)} cy={sy(x * x)} r={i === xs.length - 1 ? 4.5 : 2.5} /> : null,
        )}
        {xs.slice(1).map((x, i) =>
          inView(x) && inView(xs[i]) ? (
            <line key={`l${i}`} className="grid" x1={sx(xs[i])} y1={sy(xs[i] * xs[i])} x2={sx(x)} y2={sy(x * x)} />
          ) : null,
        )}
        <text className="chart-text" x={sx(0)} y={H - PAD + 12} textAnchor="middle">
          0
        </text>
      </svg>

      <div className="widget-out">
        <div className="out-item">
          <span className="out-label">最後の x</span>
          <span className="out-value">{Math.abs(last) > 1000 ? last.toExponential(1) : last.toFixed(4)}</span>
        </div>
        <div className="out-item">
          <span className="out-label">最後の f(x)</span>
          <span className="out-value">
            {Math.abs(last * last) > 1000 ? (last * last).toExponential(1) : (last * last).toFixed(4)}
          </span>
        </div>
        <div className="out-item">
          <span className="out-label">1 回で掛かる倍率</span>
          <span className="out-value">{Math.abs(1 - 2 * lr).toFixed(2)} 倍</span>
        </div>
      </div>

      <p className="widget-note">
        更新は x ← x − 学習率 × 2x なので、1 回ごとに x は <strong>|1 − 2×学習率| 倍</strong>になります。
        {lr < 0.5 ? (
          <>
            いまの学習率では同じ側からゆっくり近づきます。小さすぎると<strong>いつまでも谷に着きません</strong>。
          </>
        ) : lr === 0.5 ? (
          <>
            倍率がちょうど 0 なので、<strong>1 回で谷の底に着きます</strong>。この関数に限った特別な値です。
          </>
        ) : lr < 1 ? (
          <>
            いまの学習率では<strong>反対側へ行き過ぎながら</strong>近づきます。振動しつつ収束する状態です。
          </>
        ) : lr === 1 ? (
          <>
            倍率がちょうど 1 なので、<strong>同じ幅を往復し続けて収束も発散もしません</strong>。
          </>
        ) : (
          <>
            いまの学習率では倍率が 1 を超えるので、<strong>行き過ぎが毎回大きくなって発散します</strong>。
            {diverged ? '実際に x が離れていくのが見えます。' : ''}
          </>
        )}
        <br />
        谷の形（この例では 2 という係数）によって、安全な学習率の上限が決まります。
        <strong>層ごとに勾配の大きさが違うと、1 つの学習率で全部をうまく扱えない</strong>——
        これが Adam のような手法が生まれた動機です。
      </p>
    </>
  );
}
