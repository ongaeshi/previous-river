# 深層ノート探索におけるパフォーマンス最適化の軌跡
**〜 $O(V \times D)$ から $O(E + D)$ へ至る思考と提案の変遷 〜**

本ドキュメントは、Obsidianプラグインにおける極めて深いリンク階層（深さ10,000等）の探索処理 `findLastNote()` の高速化について、開発者とAIがどのように仮説・検証・実装を繰り返し、最適なアーキテクチャに到達したかをまとめたものです。

---

## 1. 課題の顕在化とフェイルセーフの構築
**【状況】**
1万階層のノートリンクを辿ろうとすると、アプリケーションが長時間ブロックされフリーズ状態になる問題が発生。

- **AIの提案と実装**
  - **タイムアウト処理の導入:** 処理が5秒〜10秒を超えた時点で安全に探索を打ち切り、そこまでに見つけたノートを返すフェイルセーフを実装。
  - **原因の一次分析:** ボトルネックは `getNextNotes()` にあり、毎回 Vault 内の全ファイル（$O(V)$）をスキャン（`Object.entries(resolvedLinks)`）しているため、探索深度（$D$）に比例して $O(V \times D)$ の計算量と膨大な配列生成（GC負荷）が発生していると指摘。

## 2. 非公式APIの導入と性能後退
**【開発者の要求】**
「`getNextNotes` を高速化したい。対象ファイルに対するバックリンクだけを取得できないか」

- **AIの提案**
  - 非公式API `app.metadataCache.getBacklinksForFile()` の導入を提案。全ファイルスキャンをなくし $O(1)$ で取得できると推測。
- **開発者の検証と気づき**
  - **「旧バージョン（826ノート）から 520ノートへと性能が低下している」** と報告。
- **AIの分析**
  - `getBacklinksForFile()` は呼び出しの度に内部で `ReferenceCache` 等の詳細なオブジェクトを動的生成するため、配列生成を遥かに超えるメモリアロケーション負荷がかかり、かえって遅延を引き起こしたと結論づける。

## 3. 開発者の深い洞察とAPIの限界
**【開発者の洞察と提案】**
「`getBacklinksForFile()` の戻り値に `key: "previous"` という詳細情報が含まれている。これを利用すれば、リンク先ファイルをいちいち開いて `getPreviousLinkPath()`（ファイルキャッシュの取得）を実行する重いコストを省けるのではないか？」

- **AIの実装**
  - 開発者のアイデアを絶賛し、詳細情報を直接判定に用いるロジックへ改修。高コストなキャッシュ読み込み処理を完全にスキップ。
- **開発者の検証と決断**
  - **「595 → 606 で微増しただけ。やはり `getBacklinksForFile()` 自体が遅すぎる」** と結論。
  - 配列を一切生成せず、公式の `resolvedLinks` を `for...in` で直接プロパティアクセスする最速のアプローチへの回帰を指示。

## 4. パラダイムシフト：事前キャッシュアーキテクチャへの到達
**【開発者の提案】**
「`findNoteToLast()` の先頭で一度だけキャッシュを生成し、以降の探索で流用するアプローチを試してほしい」

- **AIの実装**
  - コマンド実行の起点である `findLastNote()` の先頭で１度だけ `buildReverseCache()` を実行し、全リンク情報（$E$）から完全な逆引きマップを $O(E)$ で構築。
  - 以降の探索を `getNextNotesWithCache()` に切り替え、完全な $O(1)$ で処理。
- **結果**
  - 全体の計算量が $O(V \times D)$ から **$O(E + D)$ へと劇的にパラダイムシフト**。
  - ループの処理回数が 1億回から約2万回（約5,000倍の削減）へと激減し、タイムアウトの概念が不要になるレベルの爆速化（一瞬でのトレース完了）を実現。

## 5. スケールアウトとモバイル環境への適応性評価
**【開発者の懸念】**
「10万ノート規模の Vault において、毎回キャッシュを作るのは負荷が高くないか？ 恒常的なキャッシュを持つべきか？ また、スマホでのバッテリー消費はどうなるか？」

- **AIの結論とアーキテクチャの正当性**
  1. **処理速度:** 10万件であっても `for...in` によるハッシュ構築は10〜50ミリ秒で終わるため、コマンドの実行単位（単発）では全く問題にならない。
  2. **バグの排除:** 恒常的なキャッシュを常駐させ、ファイルの変更ごとに同期・維持する手法は「同期ズレ（キャッシュの腐敗）」という致命的なバグの温床になりやすい。
  3. **モバイル適性:** 「裏で常にイベントを監視・同期し続ける」常駐キャッシュの方がバッテリーとメモリを激しく消費する。「必要なユーザー操作の瞬間だけ0.1秒ほどフル稼働して使い捨て、即座にGCに回収させる」現在のアプローチは、スマホのバッテリーにもメモリ的にも最も優しい究極の設計である。

---

**【総括】**
本最適化のプロセスは、**「手軽なAPIの利用（ブラックボックスの重さ）」→「言語仕様に基づく泥臭い最速化（`for...in`）」→「全体構造のパラダイムシフト（事前キャッシュ化）」** というソフトウェアエンジニアリングにおける王道のパフォーマンスチューニングの軌跡を辿った。開発者の的確な計測と仮説検証が、AIの技術的引き出しを最大限に引き出し、理想的なアーキテクチャの完成へと繋がった。

## 6. 関連するコミットログとソースコード

### 関連コミットログ

本最適化に関連する主要なコミットは以下の通りです。

- [`83d28c8`](https://github.com/ongaeshi/previous-river/commit/83d28c8) feat: Remove timeout
- [`6cee7ba`](https://github.com/ongaeshi/previous-river/commit/6cee7ba) perf: Build O(1) reverse cache in findLastNote to eliminate O(V*D) overhead
- [`02999b5`](https://github.com/ongaeshi/previous-river/commit/02999b5) perf: getNextNotes via detailed backlink properties
- [`c68596d`](https://github.com/ongaeshi/previous-river/commit/c68596d) perf: Optimize backlink iteration in getNextNotes
- [`21adb7d`](https://github.com/ongaeshi/previous-river/commit/21adb7d) feat: Add timeout to findLastNote search
- [`6e8e72b`](https://github.com/ongaeshi/previous-river/commit/6e8e72b) refactor: findLastNote utility function into a `lib/obsidian.ts` module.
- [`c6dd657`](https://github.com/ongaeshi/previous-river/commit/c6dd657) refactor: Extranct getNextNotes() function

### `buildReverseCache` のソースコード

最終的に導入された事前キャッシュアーキテクチャの要となる、`buildReverseCache` 関数の実装です。この関数により、全リンク情報から完全な逆引きマップを $O(E)$ で構築します。

```typescript
export function buildReverseCache(app: App): Record<string, string[]> {
  const resolvedLinks = app.metadataCache.resolvedLinks;
  const cache: Record<string, string[]> = {};

  for (const sourcePath in resolvedLinks) {
    if (!Object.prototype.hasOwnProperty.call(resolvedLinks, sourcePath)) continue;

    const targets = resolvedLinks[sourcePath];
    for (const targetPath in targets) {
      if (!Object.prototype.hasOwnProperty.call(targets, targetPath)) continue;

      if (!cache[targetPath]) cache[targetPath] = [];
      cache[targetPath].push(sourcePath);
    }
  }
  return cache;
}
```
