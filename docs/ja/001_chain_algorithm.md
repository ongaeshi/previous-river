# 技術ドキュメント：同一チェイン判定アルゴリズムの検討と実装

## 1. 概要
本ドキュメントは、ナレッジベース（Zettelkasten等）において、リンクされたノート間の関係性を分析するためのアルゴリズムの検討プロセスと最終実装を記録したものです。具体的には、`previous`プロパティによって単方向リストとして繋がれたノード群において、「ノードAとノードBが同一の思考チェイン（同一経路）上に存在するか」を判定するロジックの導出についてまとめています。

## 2. 開発者の葛藤と課題
開発者は、ノート間が適切にリンクされているかを判定する仕組みを実装するにあたり、以下の課題と葛藤を抱えていました。

- **関係性の明確な定義と区別:**
  一直線上に繋がっている「祖先・子孫」関係と、共通の親を持つが別の分岐上にある「兄弟」関係（Y字分岐）をプログラム上で明確に区別して判定する必要がありました。
- **直感的で誤解を生まないネーミング:**
  リンクリストの繋がりを「チェイン」と表現してよいのか、より適切なプログラミング用語はないか。また、シンプルに記述しつつも、第三者がコードを読んだときに挙動（特に兄弟ノードは弾くという仕様）を誤認しないような、絶妙な関数名を見つけることに悩んでいました。

## 3. 解決プロセス（AIの提案の変遷）

開発者とAIとの対話を通じて、アルゴリズムの実装と命名は以下の4つのフェーズを経て洗練されていきました。

### フェーズ1：初期実装 (`areOnSameChain`)
- **提案内容:** `previous`ポインタを両方向から遡り、一方が他方の祖先であるかをチェックする基本的なロジックを実装。
- **課題:** 実装は正しいものの、「チェイン（Chain）」という言葉がデータ構造の文脈において最適かどうかの疑問が残りました。

### フェーズ2：役割の分割と専門用語の導入 (`isAncestor` / `areLinearlyConnected`)
- **提案内容:** 「チェイン」の代替表現として「パス（Path）」や「祖先/子孫（Ancestor/Descendant）」を検討。方向性を持つ一方向の判定を `isAncestor` として切り出し、双方向の判定を `areLinearlyConnected`（直線的に繋がっている）とする2段階構成に進化しました。
- **効果:** 関数の役割が明確になり、`isAncestor` の再利用性が高まりました。

### フェーズ3：シンプルさの追求と「兄弟の罠」 (`isConnected`)
- **提案内容:** 開発者から、よりシンプルに `isConnected` ではどうかという打診がありました。
- **課題（兄弟の罠）:** AIは、`isConnected` という名前だと、共通の親を持つだけの「兄弟関係」も `true` になると誤解されるリスクが高いことを指摘しました。本件の要件では兄弟関係は `false` となるべきであったため、この名前の採用は見送られました。

### フェーズ4：ニュアンスの完全な合致 (`isOnSamePath`)
- **提案内容:** 「同一経路にいるか？」という開発者の求めたニュアンスを正確に反映し、**`isOnSamePath`** という命名に到達しました。
- **結論:** 英語のニュアンスとしても「AからBへの道の上に存在している」となり、直感的かつ兄弟関係を含まないことが自明な、ベストな命名として確定しました。

## 4. 最終実装

最終的に、以下の通り「方向性を持つ祖先判定」と「双方向の同一経路判定」を組み合わせた堅牢なコードが完成しました。

```typescript
// ノードの定義
interface ListNode<T> {
  value: T;
  prev: ListNode<T> | null;
}

/**
 * target が node の祖先（同一経路上の親側）であるかを判定するヘルパー関数
 */
function isAncestor<T>(target: ListNode<T>, node: ListNode<T>): boolean {
  let current: ListNode<T> | null = node;
  while (current !== null) {
    if (current === target) return true;
    current = current.prev;
  }
  return false;
}

/**
 * 2つのノードが「同一経路上」にあるかを判定します。u
 * どちらか一方から辿って、もう一方に到達できる場合に true を返します。
 * (兄弟ノードのように分岐している場合は false になります)
 */
function isOnSamePath<T>(nodeA: ListNode<T>, nodeB: ListNode<T>): boolean {
  // A から辿って B が見つかる、または B から辿って A が見つかる
  return isAncestor(nodeA, nodeB) || isAncestor(nodeB, nodeA);
}
```

## 5. 実際のプロジェクト（`previous-river`）への統合と発展

これらの対話を経て決定された `isOnSamePath` は、実際のObsidianプラグイン「`previous-river`」の機能に組み込まれました。実環境への適応にあたり、アルゴリズムはさらに実用的かつ堅牢に進化しています。

### 5.1 Obsidian APIへの適応と無限ループ対策 (`isAncestor`)

Zettelkastenのノート群を扱うため、汎用的なジェネリクス型から、Obsidianの `TFile` と `App` APIを利用した実装へと実体化されました。さらに、実際のユーザーの操作によって生じうる**循環参照（サイクル）**による無限ループを防ぐため、`visited` による訪問済み判定と、フェイルセーフとしての `maxDepth` の概念が導入されました。

```typescript
export function isAncestor(app: App, note: TFile, target: TFile): boolean {
  let current = note;
  const visited = new Set<string>();
  visited.add(current.path);

  let depth = 0;
  const maxDepth = 100000;

  while (depth < maxDepth) {
    const prev = getPreviousNote(app, current);
    if (!prev) {
      return false;
    }

    if (prev.path === target.path) {
      return true;
    }

    if (visited.has(prev.path)) {
      return false; // 循環参照（サイクル）の検出
    }

    visited.add(prev.path);
    current = prev;
    depth++;
  }

  return false;
}
```

### 5.2 コマンド制御における安全装置としての活用 (`isOnSamePath`)

`isOnSamePath` は、ノート間のリンク操作（チェインへの挿入など）において、**構造の矛盾や循環参照の発生を未然に防ぐ重要なバリデーション**として機能しています。

```typescript
export function isOnSamePath(app: App, note1: TFile, note2: TFile): boolean {
  if (note1.path === note2.path) {
    return true;
  }
  return isAncestor(app, note1, note2) || isAncestor(app, note2, note1);
}
```

実際のコマンド（`insertNoteCommand`, `insertNoteToLastCommand`, `insertNoteToFirstCommand` 等）では、挿入対象と選択先が既に同じ経路上にある場合、操作をブロックしてユーザーに警告（Notice）を出します。

```typescript
// 実際の利用例 (commands.ts より)
if (isOnSamePath(app, file, selectedNote)) {
    new Notice(`Cannot insert: "${file.basename}" and "${selectedNote.basename}" are on the same path.`);
    return;
}
```

この実装により、「すでに繋がっているノート同士を誤って再度繋ぎ直してしまい、構造が崩れる」という事故を防止し、安全なノートのリンク管理を実現しています。

## 6. リファレンス (関連コミット)

本アルゴリズムが `previous-river` に統合された際の実際のコミットは以下の通りです。

- [`be9fcf6` - feat: Do not detach before inserting](https://github.com/ongaeshi/previous-river/commit/be9fcf6f0eecf0920654c89f71aaf368d6d956a7)
  - `isAncestor` および `isOnSamePath` の本体実装。`visited` による無限ループ検出が導入され、`insertNoteCommand` のバリデーションとして組み込まれました。
- [`b6ca1db` - feat: Support group insertion in insertNoteToLastCommand and prevent cycles](https://github.com/ongaeshi/previous-river/commit/b6ca1dbf49eaa98b3c0ea441edaee3972fec3904)
  - 末尾挿入コマンド (`insertNoteToLastCommand`) にも、チェインの循環を防ぐための `isOnSamePath` バリデーションが追加されました。
- [`e63ea67` - feat: Support group insertion in insertNoteToFirstCommand](https://github.com/ongaeshi/previous-river/commit/e63ea67804254f162a12707e97d07595546c0a35)
  - 先頭挿入コマンド (`insertNoteToFirstCommand`) に対しても同様に、循環チェックが組み込まれました。
