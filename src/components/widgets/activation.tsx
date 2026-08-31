import { useState, type JSX } from 'react';

/**
 * 活性化関数とその微分を並べて描くツール。
 *
 * 見せたいのは「微分の最大値」。シグモイドは 0.25 しかないので、
 * 層を重ねるだけで勾配が指数的に小さくなることを数値で示す。
 */
export const widgetId = 'activation';

interface Fn {
  id: string;
  name: string;
  f: (x: number) => number;
  df: (x: number) => number;
  yMin: number;
  yMax: number;
  note: string;
}

const sigmoid = (x: number): number => 1 / (1 + Math.exp(-x));
const gelu = (x: number): number =>
  0.5 * x * (1 + Math.tanh(Math.sqrt(2 / Math.PI) * (x + 0.044715 * x ** 3)));

const FNS: Fn[] = [
  {
    id: 'sigmoid',
    name: 'シグモイド',
    f: sigmoid,
    df: (x) => sigmoid(x) * (1 - sigmoid(x)),
    yMin: -0.3,
    yMax: 1.3,
    note: '出力は 0〜1。微分の最大が 0.25 しかないため、層を重ねると勾配が急速に小さくなる。',
  },
  {
    id: 'tanh',
    name: 'tanh',
    f: Math.tanh,
    df: (x) => 1 - Math.tanh(x) ** 2,
    yMin: -1.3,
    yMax: 1.3,
    note: '出力は −1〜1 で 0 中心。微分の最大は 1 だが、離れた場所では同じように潰れる。',
  },
  {
    id: 'relu',
    name: 'ReLU',
    f: (x) => Math.max(0, x),
    df: (x) => (x > 0 ? 1 : 0),
    yMin: -1,
    yMax: 5,
    note: '正の側では微分が 1 のまま。計算も速い。ただし負の側は微分が 0 で、入り込むと復帰できない（死んだ ReLU）。',
  },
  {
    id: 'leaky',
    name: 'Leaky ReLU (0.01)',
    f: (x) => (x > 0 ? x : 0.01 * x),
    df: (x) => (x > 0 ? 1 : 0.01),
    yMin: -1,
    yMax: 5,
    note: '負の側にわずかな傾きを残し、死んだ ReLU を避ける。傾きを学習させるのが PReLU。',
  },
  {
    id: 'gelu',
    name: 'GELU',
    f: gelu,
    df: (x) => (gelu(x + 1e-4) - gelu(x - 1e-4)) / 2e-4,
    yMin: -1,
    yMax: 5,
    note: 'ReLU の折れ曲がりを滑らかにしたもの。負の側もわずかに通す。Transformer 系で広く使われる。',
  },
];

const W = 340;
const H = 190;
const PAD = 26;
const X_MIN = -5;
const X_MAX = 5;

export default function ActivationWidget(): JSX.Element {
  const [id, setId] = useState('sigmoid');
  const fn = FNS.find((v) => v.id === id) ?? FNS[0];

  const xs: number[] = [];
  for (let i = 0; i <= 120; i++) xs.push(X_MIN + ((X_MAX - X_MIN) * i) / 120);

  const sx = (x: number): number => PAD + ((x - X_MIN) / (X_MAX - X_MIN)) * (W - 2 * PAD);
  const sy = (y: number): number => H - PAD - ((y - fn.yMin) / (fn.yMax - fn.yMin)) * (H - 2 * PAD);
  const clamp = (y: number): number => Math.min(fn.yMax, Math.max(fn.yMin, y));

  const path = (g: (x: number) => number): string =>
    xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${sx(x).toFixed(1)},${sy(clamp(g(x))).toFixed(1)}`).join(' ');

  const maxDf = Math.max(...xs.map((x) => fn.df(x)));
  const decay = maxDf ** 10;

  return (
    <>
      <div className="widget-head">
        <h4 className="widget-title">活性化関数とその微分</h4>
        <p className="widget-desc">
          実線が関数そのもの、破線がその微分です。逆伝播で掛け算されていくのは<strong>破線のほう</strong>です。
        </p>
      </div>

      <div className="widget-controls">
        <label className="widget-field">
          関数
          <select value={id} onChange={(e) => setId(e.target.value)}>
            {FNS.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${fn.name} のグラフ`}>
        <line className="axis" x1={PAD} y1={sy(0)} x2={W - PAD} y2={sy(0)} />
        <line className="axis" x1={sx(0)} y1={PAD} x2={sx(0)} y2={H - PAD} />
        {[X_MIN, 0, X_MAX].map((x) => (
          <text className="chart-text" key={x} x={sx(x)} y={H - PAD + 12} textAnchor="middle">
            {x}
          </text>
        ))}
        <text className="chart-text" x={sx(0) + 4} y={sy(fn.yMax) + 10}>
          {fn.yMax}
        </text>
        <path className="line" d={path(fn.f)} />
        <path className="line-2" d={path(fn.df)} />
      </svg>

      <div className="widget-out">
        <div className="out-item">
          <span className="out-label">x = 0 での値</span>
          <span className="out-value">{fn.f(0).toFixed(2)}</span>
        </div>
        <div className="out-item">
          <span className="out-label">微分の最大値</span>
          <span className="out-value">{maxDf.toFixed(2)}</span>
        </div>
        <div className="out-item">
          <span className="out-label">10 層ぶん掛けると</span>
          <span className="out-value">{decay < 0.001 ? decay.toExponential(1) : decay.toFixed(3)}</span>
        </div>
      </div>

      <p className="widget-note">
        {fn.note}
        <br />
        「10 層ぶん掛けると」は、微分の最大値を 10 回掛けた値です。実際に最大値の場所を通り続けるわけではないので、
        <strong>これは「もっとも条件がよくてもこの程度」という上限</strong>にあたります。
        {decay < 1 ? (
          <>
            いまの関数は上限そのものが小さく、<strong>10 層で {decay.toExponential(1)} 倍まで縮みます</strong>。これが勾配消失です。
          </>
        ) : (
          <>
            いまの関数は上限が 1 を下回りません（GELU だけは微分の最大が 1 をわずかに超えるので、上限は 1 より大きくなります）。
            <strong>活性化関数そのものが勾配消失の主因にはならない</strong>、ということです。
          </>
        )}
      </p>
    </>
  );
}
