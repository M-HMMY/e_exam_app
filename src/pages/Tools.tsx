import { useState, type JSX } from 'react';
import { Widget, widgetIds } from '../components/Widget';
import { navigate } from '../lib/router';

/**
 * 体験ツール（対話ウィジェット）の一覧。教本の該当箇所にも同じものが埋め込まれている。
 *
 * ここに並べた id は、`src/components/widgets/<id>.tsx` を作れば自動で有効になる
 * （`Widget.tsx` がファイルを走査して登録する）。まだ書いていない id は表示されない。
 * つまり**この一覧は「作りたいものの計画表」も兼ねている。**
 */
const GROUPS: { name: string; note: string; ids: string[] }[] = [
  {
    name: '応用数学',
    note: '式のままでは掴みにくいところを、数値を動かして確かめます',
    ids: ['matmul', 'softmax', 'entropy', 'distribution'],
  },
  {
    name: '深層学習',
    note: '層の中で何が起きているかを、目で見て確かめます',
    ids: ['activation', 'gradient', 'convsize', 'attention'],
  },
  {
    name: '評価',
    note: '混同行列と各指標の関係を、数値を動かして体感します',
    ids: ['confusion', 'roc'],
  },
];

export function Tools(): JSX.Element {
  const [openGroup, setOpenGroup] = useState<string>(GROUPS[0].name);
  const known = new Set(GROUPS.flatMap((g) => g.ids));
  const others = widgetIds.filter((id) => !known.has(id));

  if (widgetIds.length === 0) {
    return (
      <div className="page">
        <header className="page-head">
          <h1>体験ツール</h1>
          <p className="lead">
            文章だけでは掴みにくいところを、数値を動かして確かめるための道具です。教本の該当セクションにも同じものが埋め込まれます。
          </p>
        </header>
        <section className="section">
          <p className="hint">
            体験ツールはまだ 1 つも用意されていません。
            <code>src/components/widgets/</code> にファイルを追加すると、この画面と教本本文の両方で自動的に使えるようになります。
          </p>
        </section>
        <div className="read-actions">
          <button type="button" className="btn primary" onClick={() => navigate('textbook')}>
            教本を読む
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="page-head">
        <h1>体験ツール</h1>
        <p className="lead">
          文章だけでは掴みにくいところを、数値を動かして確かめるための道具です。教本の該当セクションにも同じものが埋め込まれています。
        </p>
      </header>

      <div className="chips">
        {GROUPS.map((g) => (
          <button
            key={g.name}
            type="button"
            className={`chip ${openGroup === g.name ? 'on' : ''}`}
            onClick={() => setOpenGroup(g.name)}
          >
            {g.name}（{g.ids.filter((id) => widgetIds.includes(id)).length}）
          </button>
        ))}
      </div>

      {GROUPS.filter((g) => g.name === openGroup).map((g) => {
        const ready = g.ids.filter((id) => widgetIds.includes(id));
        return (
          <section key={g.name} className="section">
            <h2>{g.name}</h2>
            <p className="hint">{g.note}</p>
            {ready.length === 0 && <p className="hint">この分類のツールはまだ用意されていません。</p>}
            {ready.map((id) => (
              <Widget key={id} id={id} />
            ))}
          </section>
        );
      })}

      {others.length > 0 && (
        <section className="section">
          <h2>その他</h2>
          {others.map((id) => (
            <Widget key={id} id={id} />
          ))}
        </section>
      )}
    </div>
  );
}
