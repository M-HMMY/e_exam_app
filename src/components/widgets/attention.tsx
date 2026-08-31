import { useState, type JSX } from 'react';

/**
 * Self-Attention の重みができるまでを 1 手ずつ見るツール。
 *
 * 「内積でスコア → √d で割る → ソフトマックス → V の重み付き和」という
 * 4 段階を、4 語・4 次元の小さな例で追えるようにした。
 * √d の割り算を切ると、スコアが尖って重みが 1 点に集中することも確かめられる。
 */
export const widgetId = 'attention';

const WORDS = ['猫', 'が', '魚', 'を'];
// 次元を小さくしすぎると、√d で割るかどうかの差が画面に出ない（d = 4 では内積が 2 弱にしかならない）。
// 4 次元のパターンを 4 回繰り返して 16 次元にし、実際に尖り方が変わるようにしている。
const BASE: number[][] = [
  [1.0, 0.2, 0.9, 0.1], // 猫
  [0.1, 1.0, 0.0, 0.9], // が
  [0.9, 0.1, 1.0, 0.2], // 魚
  [0.0, 0.9, 0.1, 1.0], // を
];
const VECTORS: number[][] = BASE.map((v) => [...v, ...v, ...v, ...v]);
const DIM = VECTORS[0].length;

const dot = (a: number[], b: number[]): number => a.reduce((s, v, i) => s + v * b[i], 0);

export default function AttentionWidget(): JSX.Element {
  const [q, setQ] = useState(0);
  const [scaled, setScaled] = useState(true);

  const scale = scaled ? Math.sqrt(DIM) : 1;
  const scores = VECTORS.map((k) => dot(VECTORS[q], k) / scale);
  const max = Math.max(...scores);
  const exps = scores.map((s) => Math.exp(s - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  const weights = exps.map((e) => e / sum);
  const output = Array.from({ length: DIM }, (_, d) =>
    weights.reduce((s, w, i) => s + w * VECTORS[i][d], 0),
  );
  // 自分自身との内積はいつも最大になるので、見るべきはその次
  const otherBest = weights.reduce((best, w, i) => (i !== q && w > weights[best] ? i : best), q === 0 ? 1 : 0);

  return (
    <>
      <div className="widget-head">
        <h4 className="widget-title">Self-Attention の重み</h4>
        <p className="widget-desc">
          クエリにする語を選ぶと、その語が<strong>どの語をどれだけ見るか</strong>が決まります。
          ここでは Q・K・V をすべて同じベクトルにした、いちばん素朴な形で計算しています。
        </p>
      </div>

      <div className="widget-controls">
        <label className="widget-field">
          クエリの語
          <select value={q} onChange={(e) => setQ(Number(e.target.value))}>
            {WORDS.map((w, i) => (
              <option key={w} value={i}>
                {w}
              </option>
            ))}
          </select>
        </label>
        <label className="widget-field">
          <input type="checkbox" checked={scaled} onChange={(e) => setScaled(e.target.checked)} />
          √d で割る（スケール化）
        </label>
      </div>

      <table className="widget-table">
        <thead>
          <tr>
            <th>キーの語</th>
            <th>内積スコア</th>
            <th>Attention 重み</th>
          </tr>
        </thead>
        <tbody>
          {WORDS.map((w, i) => (
            <tr key={w}>
              <th>{w}</th>
              <td className="mono">{scores[i].toFixed(3)}</td>
              <td className={i === q ? 'hit' : undefined}>
                {(weights[i] * 100).toFixed(1)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="widget-out">
        <div className="out-item">
          <span className="out-label">重みの合計</span>
          <span className="out-value">{weights.reduce((a, b) => a + b, 0).toFixed(3)}</span>
        </div>
        <div className="out-item">
          <span className="out-label">自分以外でいちばん見た語</span>
          <span className="out-value">{WORDS[otherBest]}</span>
        </div>
        <div className="out-item">
          <span className="out-label">出力ベクトル</span>
          <span className="out-value mono" style={{ fontSize: '13px' }}>
            {output.map((v) => v.toFixed(2)).join(', ')}
          </span>
        </div>
      </div>

      <p className="widget-note">
        重みは<strong>ソフトマックスの出力なので、足すと必ず 1</strong> になります。
        <strong>自分自身との内積がいちばん大きくなるのは当たり前</strong>なので、見るべきはその次です。
        「猫」をクエリにすると意味の近い「魚」が、「が」をクエリにすると「を」が上がります。
        <strong>近い向きのベクトルほど内積が大きくなる</strong>、それだけの仕掛けです。
        <br />
        チェックを外すと √d で割らなくなり、スコアの差がそのままソフトマックスに入ります。
        <strong>関係のない語の重みがほぼ 0 になり、分布が極端に尖る</strong>のが分かります。次元が大きいほど内積は大きくなりがちなので、
        割らないと勾配がほとんど流れなくなります。
      </p>
    </>
  );
}
