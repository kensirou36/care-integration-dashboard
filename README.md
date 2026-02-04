# 介護統合ダッシュボード

スマホ・タブレット中心で使える、複数の介護サービスを自動統合する無料ダッシュボードアプリ。

## ✨ 主な機能

### 📊 Google Sheets連携
- **複数シート対応** - 1つのスプレッドシートで複数のサービスを管理
- **シート切り替えタブ** - タップで簡単にシート切り替え
- **自動更新** - 設定した間隔で自動的にデータを更新
- **検索・フィルター・ソート** - データを簡単に絞り込み

### 📝 手書きメモ機能
- **カメラ撮影** - スマホカメラで直接撮影
- **画像アップロード** - ギャラリーから画像を選択
- **OCR (文字認識)** - 手書きメモを自動でテキスト化
- **Google Sheetsエクスポート** - メモをワンタップでSheetsに転記
- **オフライン保存** - IndexedDBで端末に保存

### 🔒 セキュリティ
- **Google Apps Script (GAS) 対応** - APIキー不要で安全に接続
- **ローカルストレージ** - 設定情報は端末内のみに保存
- **HTTPS対応** - GitHub Pagesで自動的にHTTPS化

### 📱 PWA対応
- **ホーム画面に追加** - アプリとして使用可能
- **オフライン対応** - ネットワークがなくてもキャッシュデータを表示
- **モバイル最適化** - スマホ・タブレットで快適に操作

---

## 🚀 クイックスタート

### オンラインで使う（推奨）

1. **GitHub Pagesにアクセス**
   - https://あなたのユーザー名.github.io/care-integration-dashboard/

2. **GASをセットアップ**
   - [GASセットアップガイド](docs/gas-setup-guide.md)を参照
   - Google Sheetsに拡張機能を追加するだけ

3. **設定画面で接続**
   - GAS Web App URLを入力
   - 接続テストで確認

---

## 💻 ローカル開発

### 前提条件
- Node.js 18以上
- npm

### インストール

```bash
# リポジトリをクローン
git clone https://github.com/あなたのユーザー名/care-integration-dashboard.git
cd care-integration-dashboard

# 依存関係をインストール
npm install

# 開発サーバーを起動
npm run dev
```

ブラウザで `http://localhost:5173` にアクセス

### ビルド

```bash
npm run build
```

---

## 📖 セットアップガイド

### 1. Google Apps Script (GAS) のセットアップ

詳細は [GASセットアップガイド](docs/gas-setup-guide.md) を参照してください。

**簡単な手順:**
1. Google Sheetsを開く
2. 「拡張機能」→「Apps Script」
3. `docs/gas-script.gs` の内容をコピペ
4. Web Appとしてデプロイ
5. URLをダッシュボードに設定

### 2. Google Sheetsの準備

各サービスのデータをGoogle Sheetsにインポートします。

- [CSVインポートガイド](docs/csv-import-guide.md)
- [サンプルテンプレート](templates/)

---

## 📱 使い方

### ダッシュボード
1. 設定画面でGAS URLを入力
2. 接続テストで確認
3. 保存すると自動的にデータが表示されます

### メモ機能
1. 「📝 メモ」タブを開く
2. カメラで撮影 or 画像をアップロード
3. OCRで自動的にテキスト化
4. 編集して保存
5. 「📤」ボタンでGoogle Sheetsに転記

---

## 🛠️ 技術スタック

- **フロントエンド**: Vanilla JavaScript + Vite
- **スタイル**: CSS (モバイルファースト、レスポンシブデザイン)
- **API**: Google Sheets API v4 / Google Apps Script
- **OCR**: Tesseract.js
- **ストレージ**: LocalStorage + IndexedDB
- **PWA**: Service Worker、Web App Manifest
- **ホスティング**: GitHub Pages

---

## 🗺️ ロードマップ

- [x] **フェーズ1**: 基本ダッシュボード + Google Sheets連携
- [x] **フェーズ1.5**: Google Sheets統合強化
- [x] **フェーズ2**: 手書きメモ機能
- [x] **フェーズ3**: メモのGoogle Sheets連携 + GAS対応
- [ ] **フェーズ4**: その他サービス連携
- [ ] **フェーズ5**: 最終調整

---

## 🤝 コントリビューション

プルリクエストを歓迎します！大きな変更の場合は、まずissueを開いて変更内容を議論してください。

---

## 📄 ライセンス

MIT License - 詳細は [LICENSE](LICENSE) を参照

---

## 🙏 謝辞

- [Tesseract.js](https://tesseract.projectnaptha.com/) - OCR機能
- [idb](https://github.com/jakearchibald/idb) - IndexedDBラッパー
- [Vite](https://vitejs.dev/) - ビルドツール

---

## 📞 サポート

問題が発生した場合は、[Issues](https://github.com/あなたのユーザー名/care-integration-dashboard/issues)で報告してください。
