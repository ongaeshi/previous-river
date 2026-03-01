# Previous River

Obsidian のノートに前後関係を設定することができるプラグインです。  
ユーザーがフロントマターに設定した`previous` プロパティとバックリンクに基づいてノート間を移動できます。

<img width="640" src="https://github.com/user-attachments/assets/db3d5466-affd-43de-aebe-b5d4757e08ac" />

## インストール

現在、このプラグインは Obsidian のコミュニティプラグインの一覧からはインストールできません。代わりに [BRAT](https://github.com/TfTHacker/obsidian42-brat) を使用してインストールします。

1. Obsidian のコミュニティプラグインから **Obsidian42 - BRAT** プラグインをインストールします。
2. BRAT プラグインを有効化します。
3. BRAT の設定を開き、**Add Beta plugin** をクリックします。
4. GitHub リポジトリ `ongaeshi/previous-river` を入力して追加します。
5. コミュニティプラグインの一覧から **Previous River** プラグインを有効化します。

## 機能
### Go to previous note(前のノートに移動)
現在のノートのフロントマターにある `previous` プロパティでリンクされたノートに移動します。

### Go to next note(次のノートに移動)
現在のノートにバックリンクを持ち、かつその `previous` プロパティが現在のノートを指しているノートに移動します。  
候補が複数ある場合は、選択用のモーダルが表示されます。

### Go to first note(最初のノートに移動)
`previous` プロパティのチェーンをたどり、シーケンス内の最初のノートに移動します。

### Go to last note(最後のノートに移動)
次のノートをたどり、シーケンス内の最後のノートに移動します。  
候補が複数ある場合は、選択用のモーダルが表示されます。

### Insert notes(ノートの挿入)
ノートを現在の連続したシーケンスに挿入します。
- **Insert note**: 選択したノートをシーケンスに挿入します。
- **Insert note to first**: 選択したノートをシーケンスの先頭に挿入します。
- **Insert note to last**: 選択したノートをシーケンスの最後に挿入します。

### Detach note(ノートの切り離し)
現在のノートの `previous` プロパティを `ROOT` に設定することで、シーケンスから切り離します。

## ホットキーの例
特に「前のノートに移動」と「次のノートに移動」にホットキーを設定しておくことをおすすめします！

- **Go to previous note**: `Alt+,`
- **Go to next note**: `Alt+.`
- **Go to first note**: `Alt+Shift+,`
- **Go to last note**: `Alt+Shift+.`

### コントリビュート

バグ報告や機能リクエストは Issues で受け付けています。プルリクエストも歓迎します！