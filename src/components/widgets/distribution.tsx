import { useState, type JSX } from 'react';

/**
 * 代表的な確率分布のかたちを見るツール。
 *
 * 「何を数えているか」で分布が決まる、という対応を掴ませたい。
 * 期待値と分散も出して、ポアソンでは両方が λ になることを見せる。
 */
export const widgetId = 'distribution';

type Kind = 'binomial' | 'poisson' | 'normal';

const factorialLog = (n: number): number => {
  let s = 0;
  for (let i = 2; i <= n; i++) s += Math.log(i);
  return s;
};

/** 二項係数を対数で計算する（n が大きいと階乗が桁あふれするため） */
const binomialPmf = (n: number, p: number, k: number): number => {
  if (p <= 0) return k === 0 ? 1 : 0;
  if (p >= 1) return k === n ? 1 : 0;
  const logC = factorialLog(n) - factorialLog(k) - factorialLog(n - k);
  return Math.exp(logC + k * Math.log(p) + (n - k) * Math.log(1 - p));
};

const poissonPmf = (lambda: number, k: number): number =>
  Math.exp(-lambda + k * Math.log(lambda) - factorialLog(k));

const normalPdf = (mu: number, sigma: number, x: number): number =>
  Math.exp(-((x - mu) ** 2) / (2 * sigma * sigma)) / (sigma * Math.sqrt(2 * Math.PI));

export default function DistributionWidget(): JSX.Element {
  const [kind, setKind] = useState<Kind>('binomial');
  const [n, setN] = useState(10);
  const [p, setP] = useState(0.5);
  const [lambda, setLambda] = useState(3);
  const [sigma, setSigma] = useState(1);

  let labels: string[] = [];
  let values: number[] = [];
  let mean = 0;
  let variance = 0;
  let note = '';

  if (kind === 'binomial') {
    labels = Array.from({ length: n + 1 }, (_, k) => String(k));
    values = labels.map((_, k) => binomialPmf(n, p, k));
    mean = n * p;
    variance = n * p * (1 - p);
    note = 'コインを n 回投げて表が何回出るか。1 回だけならベルヌーイ分布で、二項分布の n = 1 の場合にあたる。';
  } else if (kind === 'poisson') {
    const upper = Math.max(8, Math.ceil(lambda * 3));
    labels = Array.from({ length: upper + 1 }, (_, k) => String(k));
    values = labels.map((_, k) => poissonPmf(lambda, k));
    mean = lambda;
    variance = lambda;
    note = '単位時間あたりに、まれな事象が何回起きるか。期待値も分散も λ になるのがこの分布の特徴。';
  } else {
    const step = 0.5;
    labels = Array.from({ length: 17 }, (_, i) => ((i - 8) * step).toFixed(1));
    values = labels.map((v) => normalPdf(0, sigma, Number(v)));
    mean = 0;
    variance = sigma * sigma;
    note = '連続量の分布。棒の高さは確率ではなく確率密度で、足して 1 になるのは面積のほう。';
  }

  const max = Math.max(...values, 1e-9);

  return (
    <>
      <div className="widget-head">
        <h4 className="widget-title">代表的な確率分布</h4>
        <p className="widget-desc">
          分布は「何を数えているか」で決まります。パラメータを動かして、形と期待値・分散の変わり方を見てください。
        </p>
      </div>

      <div className="widget-controls">
        <label className="widget-field">
          分布
          <select value={kind} onChange={(e) => setKind(e.target.value as Kind)}>
            <option value="binomial">二項分布</option>
            <option value="poisson">ポアソン分布</option>
            <option value="normal">正規分布</option>
          </select>
        </label>
        {kind === 'binomial' && (
          <>
            <label className="widget-field" htmlFor="dist-n">
              n = {n}
            </label>
            <input
              id="dist-n"
              className="slider"
              type="range"
              min="1"
              max="20"
              step="1"
              value={n}
              onChange={(e) => setN(Number(e.target.value))}
            />
            <label className="widget-field" htmlFor="dist-p">
              p = {p.toFixed(2)}
            </label>
            <input
              id="dist-p"
              className="slider"
              type="range"
              min="0.05"
              max="0.95"
              step="0.05"
              value={p}
              onChange={(e) => setP(Number(e.target.value))}
            />
          </>
        )}
        {kind === 'poisson' && (
          <>
            <label className="widget-field" htmlFor="dist-l">
              λ = {lambda.toFixed(1)}
            </label>
            <input
              id="dist-l"
              className="slider"
              type="range"
              min="0.5"
              max="10"
              step="0.5"
              value={lambda}
              onChange={(e) => setLambda(Number(e.target.value))}
            />
          </>
        )}
        {kind === 'normal' && (
          <>
            <label className="widget-field" htmlFor="dist-s">
              σ = {sigma.toFixed(1)}
            </label>
            <input
              id="dist-s"
              className="slider"
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={sigma}
              onChange={(e) => setSigma(Number(e.target.value))}
            />
          </>
        )}
      </div>

      <div className="bar-chart">
        {values.map((v, i) => (
          <div className="bar-col" key={labels[i]}>
            <div className="bar" style={{ height: `${Math.max(1, (v / max) * 88)}%`, flexShrink: 0 }} />
            <span className="bar-label">{labels[i]}</span>
          </div>
        ))}
      </div>

      <div className="widget-out">
        <div className="out-item">
          <span className="out-label">期待値</span>
          <span className="out-value">{mean.toFixed(2)}</span>
        </div>
        <div className="out-item">
          <span className="out-label">分散</span>
          <span className="out-value">{variance.toFixed(2)}</span>
        </div>
        <div className="out-item">
          <span className="out-label">標準偏差</span>
          <span className="out-value">{Math.sqrt(variance).toFixed(2)}</span>
        </div>
      </div>

      <p className="widget-note">
        {note}
        <br />
        二項分布は n を大きくすると正規分布に近づき、n が大きく p が小さいときはポアソン分布に近づきます。
        <strong>どれも別々に覚えるより、「何を数えているか」と「近づく先」でつないでおく</strong>と忘れません。
      </p>
    </>
  );
}
