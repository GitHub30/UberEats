# MachiEats — UberEats型フードデリバリーPWA（非提携店舗の店頭持ち帰り代理注文対応）

公式提携レストランからの配達に加え、**デリバリー非提携のお店（町中華・行列ラーメン・商店街のお惣菜店など）でも、ドライバーが店舗へ足を運び持ち帰り注文・代理決済してお届けする**フードデリバリープラットフォームです。

- **フロントエンド（GitHub Pages PWA・クリーンURL）**: https://github30.github.io/UberEats/
- **バックエンドAPI（Cloudflare Workers + D1 + KV）**: https://ubereats-api.6u.workers.dev
- **AI/LLM向けドキュメント**: [llms.txt](https://github30.github.io/UberEats/llms.txt) / [llms-full.txt](https://github30.github.io/UberEats/llms-full.txt) / [リアルタイムJSON API](https://ubereats-api.6u.workers.dev/api/llms.json)

## 4つの独立アプリケーション（共通ヘッダーなし・個別PWA・ハッシュなしクリーンURL）

4つの業務アプリは Vite MPA（Multi-Page App）により**個別の HTML・独立バンドル・専用アプリアイコン・専用 `manifest.webmanifest`** を持つ独立アプリとして構築されており、共通ナビゲーションヘッダーを表示しません。

| アプリ | URL | 専用 Manifest | 主な機能 |
| --- | --- | --- | --- |
| **総合ポータル** | https://github30.github.io/UberEats/ | `/UberEats/manifest.webmanifest` | サービス概要、提携 vs 非提携代理持ち帰り比較表、FAQ、4独立アプリ起動リンク |
| **1. エンドユーザー注文アプリ** | https://github30.github.io/UberEats/customer/ | `/UberEats/customer/manifest.webmanifest` | 提携店／非提携店の検索・絞り込み、掲載外店舗の自由リクエスト代理注文、**お支払いウォレット（現金・クレジットカード・PayPay・モバイルSuica・Apple Pay・楽天ペイ・d払い・バウチャー・個人/ビジネス切替）**、リアルタイム配達マップ、レシート実費確認、チャット、評価 |
| **2. ドライバー配達アプリ** | https://github30.github.io/UberEats/driver/ | `/UberEats/driver/manifest.webmanifest` | 屋外高視認性ダークUI、オンライン切替、通常配達＆高報酬な「店頭代理注文」の受諾、店頭支払手段（代理カード・現金立替・PayPay・Suica）記録、**代金引換（現金払い）の受領確認チェック**、レシート写真KV保存、GPS位置更新、顧客チャット |
| **3. 店舗受注タブレットアプリ** | https://github30.github.io/UberEats/merchant/ | `/UberEats/merchant/manifest.webmanifest` | 公式提携店向けPOSボード（調理時間指定受注・決済方法／ステータス確認・調理完了・受け渡し待ち）、営業／混雑モード切替、メニュー追加＆ワンタップ「売り切れ」即時同期 |
| **4. 運営管理画面アプリ** | https://github30.github.io/UberEats/admin/ | `/UberEats/admin/manifest.webmanifest` | GMV・提携／非提携比率・**決済手段別内訳分析**、全注文ライブ監視＆強制介入・手動割当・レシート監査、未掲載リクエスト店のカタログ公開／公式提携店への昇格、ドライバー代理決済カード管理、配達料・代理手数料の動的設定 |

## 対応決済手段・バウチャー（Cloudflare D1 永続化・サーバー側検証）

- **対応決済手段**: 現金（配達時代金引換・ドライバー受領確認付き）、クレジットカード（Visa / Mastercard / JCB / AMEX）、PayPay、モバイルSuica / 交通系IC、Apple Pay、楽天ペイ、d払い
- **領収書プロファイル**: 個人／ビジネス切替（`billing_profile`）
- **サーバー側検証バウチャー**: `WELCOME500`（小計¥1,000以上で¥500 OFF）、`PROXY250`（非提携代理手数料¥250無料）、`PAYPAY100`（PayPay決済¥100 OFF）、`SUICA100`（Suica決済¥100 OFF）、MachiEats Cash 残高割引（¥500 OFF）

## PWA・SEO・AEO/GEO・AIO・LLMO 最適化

- **4アプリ個別PWA**: 各アプリ専用の `manifest.webmanifest` とテーマ色別アイコン、`sw.js`（ナビゲーションNetwork-First / 静的アセットStale-While-Revalidate / API Network-Only / オフライン専用ページ `offline.html`）、インストールプロンプト対応
- **クリーンパスルーティング**: Vite MPA + ビルド時ルート別静的プリレンダリング（`/`, `/customer/`, `/driver/`, `/merchant/`, `/admin/` すべて GitHub Pages で HTTP 200 を返却。ハッシュルーティング不使用）
- **SEO / AEO / GEO / AIO / LLMO**: ルート別 `<title>`・`canonical`・OGP/Twitter Card・JSON-LD `@graph`（`Organization`, `WebSite`, `WebApplication`, `Service`, `ItemList/Restaurant`, `FAQPage`, `HowTo`, `BreadcrumbList`）、`robots.txt`、`sitemap.xml`、`llms.txt`、`llms-full.txt`、`/api/llms.json`
- **セキュリティ強化**: サーバー側DB価格＆バウチャー検証（改ざん防止）、原子SQL CASによる注文状態遷移マシン厳格化、アップロード画像のマジックバイト検証＆CSPサンドボックス配信

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
