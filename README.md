# MachiEats — UberEats型フードデリバリーPWA（非提携店舗の店頭持ち帰り代理注文対応）

公式提携レストランからの配達に加え、**デリバリー非提携のお店（町中華・行列ラーメン・商店街のお惣菜店など）でも、ドライバーが店舗へ足を運び持ち帰り注文・代理決済してお届けする**フードデリバリープラットフォームです。

- **フロントエンド（GitHub Pages PWA・クリーンURL）**: https://github30.github.io/UberEats/
- **バックエンドAPI（Cloudflare Workers + D1 + KV）**: https://ubereats-api.6u.workers.dev
- **AI/LLM向けドキュメント**: [llms.txt](https://github30.github.io/UberEats/llms.txt) / [llms-full.txt](https://github30.github.io/UberEats/llms-full.txt) / [リアルタイムJSON API](https://ubereats-api.6u.workers.dev/api/llms.json)

## 4つのアプリケーション（ハッシュなしクリーンパスURL）

| アプリ | URL | 主な機能 |
| --- | --- | --- |
| **総合ポータル** | https://github30.github.io/UberEats/ | サービス概要、提携 vs 非提携代理持ち帰り比較表、FAQ、4アプリ導線 |
| **1. エンドユーザー注文アプリ** | https://github30.github.io/UberEats/customer/ | 提携店／非提携店の検索・絞り込み、掲載外店舗の自由リクエスト代理注文、カート・手数料計算、リアルタイム配達マップ、レシート実費確認、ドライバーチャット、評価 |
| **2. ドライバー配達アプリ** | https://github30.github.io/UberEats/driver/ | 屋外高視認性ダークUI、オンライン切替、通常配達＆高報酬な「店頭代理注文」の受諾、持ち帰り注文チェックリスト、実費入力＆レシート写真アップロード（Cloudflare KV）、GPS位置更新、顧客チャット |
| **3. 店舗受注タブレットアプリ** | https://github30.github.io/UberEats/merchant/ | 公式提携店向けPOSボード（新規注文の調理時間指定受注・調理完了・受け渡し待ち）、営業／混雑モード切替、メニュー追加＆ワンタップ「売り切れ」即時同期 |
| **4. 運営管理画面アプリ** | https://github30.github.io/UberEats/admin/ | GMV・提携／非提携比率・収益KPI分析、全注文ライブ監視＆強制介入・手動割当・レシート監査、未掲載リクエスト店のカタログ公開／公式提携店への昇格、ドライバー代理決済カード管理、配達料・代理手数料の動的設定 |

## PWA・SEO・AEO/GEO・AIO・LLMO 最適化

- **PWA**: `manifest.webmanifest`（4アプリショートカット・maskableアイコン）、`sw.js`（ナビゲーションNetwork-First / 静的アセットStale-While-Revalidate / API Network-Only / オフライン専用ページ `offline.html`）、インストールプロンプト対応
- **クリーンパスルーティング**: HTML5 History API + ビルド時ルート別静的プリレンダリング（`/`, `/customer/`, `/driver/`, `/merchant/`, `/admin/` すべて GitHub Pages で HTTP 200 を返却。ハッシュルーティング不使用）
- **SEO / AEO / GEO / AIO / LLMO**: ルート別 `<title>`・`canonical`・OGP/Twitter Card・JSON-LD `@graph`（`Organization`, `WebSite`, `WebApplication`, `Service`, `ItemList/Restaurant`, `FAQPage`, `HowTo`, `BreadcrumbList`）、`robots.txt`（主要AIクローラー許可）、`sitemap.xml`、`llms.txt`、`llms-full.txt`、`/api/llms.json`
- **セキュリティ強化**: 提携店舗のサーバー側DB価格検証（改ざん防止）、注文状態遷移マシン厳格化、アップロード画像のマジックバイト検証＆CSPサンドボックス配信

## ローカル開発

```bash
# バックエンド (Cloudflare Workers)
cd worker
npm install
npm run dev

# フロントエンド (Vite + 静的プリレンダリング)
cd web
npm install
npm run dev
npm run build
```
