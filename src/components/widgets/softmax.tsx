import { useState, type JSX } from 'react';

/**
 * ソフトマックスの体験ツール。
 *
 * 見せたいことは 3 つ。
 *   - 温度を上げると分布が平らになり、下げると 1 点に尖る（知識蒸留の温度）
 *   - 全部に同じ値を足しても結果が変わらない（オーバーフロー対策の根拠）
 *   - 出力の合計は必ず 1 になる
 */
export const widgetId = 'softmax';

const LABELS = ['クラス A', 'クラス B', 'クラス C', 'クラス D'];

function softmax(z: number[], t: number): number[] {
  const max = Math.max(...z);
  const e = z.map((v) => Math.exp((v - max) / t));
  const sum = e.reduce((a, b) => a + b, 0);
  return e.map((v) => v / sum);
}

export default function SoftmaxWidget(): JSX.Element {
  const [logits, setLogits] = useState<number[]>([3, 1, 0.2, -1]);
  const [temp, setTemp] = useState(1);

  const p = softmax(logits, temp);
  const entropy = -p.reduce((s, v) => (v > 0 ? s + v * Math.log2(v) : s), 0);
  const maxP = Math.max(...p);

  const setAt = (i: number, v: number): void => {
    // 「-」や「1e」を打っている途中は NaN、大きすぎる値は Infinity になる。
    // どちらも指数を取った時点で全体が NaN になるので、ここで弾いておく。
    if (!Number.isFinite(v)) return;
    const next = [...logits];
    next[i] = Math.max(-50, Math.min(50, v));
    setLogits(next);
  };

  return (
    <>
      <div className="widget-head">
        <h4 className="widget-title">ソフトマックスと温度</h4>
        <p className="widget-desc">
          ロジット（出力層の生の値）を確率に直します。温度を動かすと、分布の尖り方が変わります。
        </p>
      </div>

      <div className="widget-controls">
        {logits.map((v, i) => (
          <label className="widget-field" key={LABELS[i]}>
            {LABELS[i]}
            <input
              type="number"
              step="0.5"
              min="-50"
              max="50"
              value={v}
              onChange={(e) => setAt(i, Number(e.target.value))}
            />
          </label>
        ))}
      </div>

      <div className="widget-row">
        <label className="widget-field" htmlFor="softmax-temp">
          温度 T = {temp.toFixed(1)}
        </label>
        <input
          id="softmax-temp"
          className="slider"
          type="range"
          min="0.2"
          max="5"
          step="0.1"
          value={temp}
          onChange={(e) => setTemp(Number(e.target.value))}
        />
        <button type="button" className="btn small" onClick={() => setLogits(logits.map((v) => v + 5))}>
          全部に +5
        </button>
        <button type="button" className="btn small" onClick={() => { setLogits([3, 1, 0.2, -1]); setTemp(1); }}>
          戻す
        </button>
      </div>

      <div className="bar-chart">
        {p.map((v, i) => (
          <div className="bar-col" key={LABELS[i]}>
            <span className="bar-value">{(v * 100).toFixed(1)}%</span>
            {/* 列には値とラベルの 2 行も積まれるので、85% を上限にして枠からはみ出さないようにする
                （全部の棒を同じ倍率で縮めるので、棒どうしの比は変わらない） */}
            <div className="bar" style={{ height: `${Math.max(2, v * 85)}%`, flexShrink: 0 }} />
            <span className="bar-label">{LABELS[i].replace('クラス ', '')}</span>
          </div>
        ))}
      </div>

      <div className="widget-out">
        <div className="out-item">
          <span className="out-label">合計</span>
          <span className="out-value">{p.reduce((a, b) => a + b, 0).toFixed(3)}</span>
        </div>
        <div className="out-item">
          <span className="out-label">最大の確率</span>
          <span className="out-value">{(maxP * 100).toFixed(1)}%</span>
        </div>
        <div className="out-item">
          <span className="out-label">エントロピー</span>
          <span className="out-value">{entropy.toFixed(3)} bit</span>
        </div>
      </div>

      <p className="widget-note">
        <strong>「全部に +5」を押しても結果は変わりません。</strong>
        ソフトマックスは入力全体の平行移動に影響されないので、実装では最大値を引いてから指数を取り、オーバーフローを防ぎます。
        <br />
        温度を上げると分布が平らになり、エントロピーが増えます（知識蒸留で使う性質）。
        下げると 1 点に尖り、極端に小さくすると最大値だけを選ぶのと同じになります。
      </p>
    </>
  );
}
