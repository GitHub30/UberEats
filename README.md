# MachiEats — UberEats型フードデリバリープラットフォーム（非提携店舗の店頭持ち帰り代理注文対応）

公式提携レストランからの配達に加え、**デリバリー非提携のお店（町中華・行列ラーメン・商店街のお惣菜店など）でも、ドライバーが店舗へ足を運び持ち帰り注文・代理決済してお届けする**フードデリバリープラットフォームです。

- **フロントエンド（GitHub Pages）**: https://github30.github.io/UberEats/
- **バックエンドAPI（Cloudflare Workers + D1 + KV）**: https://ubereats-api.6u.workers.dev

## 4つのアプリケーション

| アプリ | URLパス | 主な機能 |
| --- | --- | --- |
| **1. エンドユーザー注文アプリ** | `#/customer` | 提携店／非提携店の検索・絞り込み、掲載外店舗の自由リクエスト代理注文、カート・手数料計算、リアルタイム配達マップ、レシート実費確認、ドライバーチャット、評価 |
| **2. ドライバー配達アプリ** | `#/driver` | 屋外高視認性ダークUI、オンライン切替、通常配達＆高報酬な「店頭代理注文」の受諾、持ち帰り注文チェックリスト、実費入力＆レシート写真アップロード（Cloudflare KV）、GPS位置更新、顧客チャット |
| **3. 店舗受注タブレットアプリ** | `#/merchant` | 公式提携店向けPOSボード（新規注文の調理時間指定受注・調理完了・受け渡し待ち）、営業／混雑モード切替、メニュー追加＆ワンタップ「売り切れ」即時同期 |
| **4. 運営管理画面アプリ** | `#/admin` | GMV・提携／非提携比率・収益KPI分析、全注文ライブ監視＆強制介入・手動割当・レシート監査、未掲載リクエスト店のカタログ公開／公式提携店への昇格、ドライバー代理決済カード管理、配達料・代理手数料の動的設定 |

## アーキテクチャ

- `web/`: Vite + React + TypeScript + Vanilla CSS（GitHub Actions で GitHub Pages へ自動デプロイ）
- `worker/`: Cloudflare Workers REST API
  - **Cloudflare D1 (`ubereats-db`)**: 店舗・メニュー・ドライバー・注文・進行タイムライン・チャット・手数料設定の永続化
  - **Cloudflare KV (`UBEREATS_MEDIA`)**: ドライバーがアップロードした店頭購入レシート画像の保存・配信

## ローカル開発

```bash
# バックエンド (Cloudflare Workers)
cd worker
npm install
npm run dev

# フロントエンド (Vite)
cd web
npm install
npm run dev
```
