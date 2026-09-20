# レビューのひな形

**このリポジトリは系譜の初期の代で、章ごとの執筆プロンプトの仕組みがありません。**
ここに置いてあるのは、**あとから系譜全体へ配ったレビューのひな形**だけです。

| ファイル | 何を見るか |
| --- | --- |
| `92-review-drills.md` | **計算ドリルと体験ウィジェット。**系譜 7 本ぶん、誰も見ていませんでした |
| `93-review-2nd.md` | **2 巡目。**1 巡目の直しが新しい誤りを作っていないか |

**走らせ方**（★ リポジトリの直下で）。

```bash
codex exec --sandbox read-only --skip-git-repo-check --color never   -o out-92.txt - < scripts/prompts/92-review-drills.md
```

**道具も置いてあります。**

```
node scripts/echoes.mjs <語>   # その語がどこに何回あるかを、居場所つきで出す
node scripts/terms.mjs         # 確認問題が使っていて、教本に無い語を挙げる
```
