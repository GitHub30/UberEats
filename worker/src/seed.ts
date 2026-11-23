export interface SeedStore {
  id: string;
  name: string;
  category: string;
  description: string;
  address: string;
  area: string;
  phone: string;
  lat: number;
  lng: number;
  image_url: string;
  is_partner: number;
  is_open: number;
  avg_prep_min: number;
  rating: number;
  review_count: number;
  takeout_notes: string;
}

export interface SeedMenuItem {
  id: string;
  store_id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  options_json: string;
  is_popular: number;
  sort_order: number;
}

export interface SeedDriver {
  id: string;
  name: string;
  phone: string;
  vehicle_type: string;
  is_online: number;
  proxy_card_enabled: number;
  is_approved: number;
  current_lat: number;
  current_lng: number;
  rating: number;
  completed_deliveries: number;
  total_earnings: number;
}

export const SEED_STORES: SeedStore[] = [
  {
    id: 'store-wagyu-burger',
    name: 'THE WAGYU CRAFT 渋谷店',
    category: 'バーガー',
    description: 'A5黒毛和牛100%の粗挽きパティと焼きたてブリオッシュバンズが自慢のクラフトバーガー専門店。',
    address: '東京都渋谷区宇田川町24-8 1F',
    area: '渋谷',
    phone: '03-6455-1201',
    lat: 35.6602,
    lng: 139.6992,
    image_url: 'images/burger.webp',
    is_partner: 1,
    is_open: 1,
    avg_prep_min: 15,
    rating: 4.8,
    review_count: 342,
    takeout_notes: '',
  },
  {
    id: 'store-edomae-sushi',
    name: '築地 鮨 雅（みやび）恵比寿',
    category: '寿司',
    description: '豊洲直送の旬魚を赤酢シャリで握る本格江戸前寿司。特注の木折箱でお届けします。',
    address: '東京都渋谷区恵比寿南1-11-9',
    area: '恵比寿',
    phone: '03-5724-8820',
    lat: 35.6468,
    lng: 139.7095,
    image_url: 'images/sushi.webp',
    is_partner: 1,
    is_open: 1,
    avg_prep_min: 20,
    rating: 4.9,
    review_count: 218,
    takeout_notes: '',
  },
  {
    id: 'store-spice-curry',
    name: 'SPICE LABO 代官山',
    category: 'カレー',
    description: '18種のホールスパイスを独自焙煎。サクサクの熟成三元豚カツと季節野菜のローストが人気。',
    address: '東京都渋谷区代官山町18-6',
    area: '代官山',
    phone: '03-6416-3390',
    lat: 35.6501,
    lng: 139.7031,
    image_url: 'images/curry.webp',
    is_partner: 1,
    is_open: 1,
    avg_prep_min: 18,
    rating: 4.7,
    review_count: 189,
    takeout_notes: '',
  },
  {
    id: 'store-matcha-cafe',
    name: '京都宇治茶寮 栞 表参道',
    category: 'カフェ',
    description: '宇治一番茶の濃厚抹茶ラテと、国産苺たっぷりの生クリームフルーツサンドが評判の茶寮。',
    address: '東京都港区北青山3-10-14',
    area: '表参道',
    phone: '03-6427-9041',
    lat: 35.6654,
    lng: 139.7124,
    image_url: 'images/cafe.webp',
    is_partner: 1,
    is_open: 1,
    avg_prep_min: 12,
    rating: 4.8,
    review_count: 274,
    takeout_notes: '',
  },
  {
    id: 'store-machi-chuka',
    name: '町中華 龍鳳軒（りゅうほうけん）',
    category: '町中華',
    description: '創業42年の老舗町中華。強火で煽るパラパラ黄金チャーハンと羽根つき餃子は地元の名物。デリバリー非提携のためドライバーが店頭でお持ち帰り注文します。',
    address: '東京都目黒区上目黒2-14-3',
    area: '中目黒',
    phone: '03-3712-4510',
    lat: 35.6442,
    lng: 139.6991,
    image_url: 'images/chuka.webp',
    is_partner: 0,
    is_open: 1,
    avg_prep_min: 22,
    rating: 4.9,
    review_count: 164,
    takeout_notes: 'レジまたはカウンターで「お持ち帰りで」と口頭注文してください。容器代が1品50円ほど加算される場合があります。現金・PayPay・タッチ決済可。',
  },
  {
    id: 'store-kagaribi-ramen',
    name: '麺屋 篝火（かがりび）道玄坂本店',
    category: 'ラーメン',
    description: '行列の絶えない濃厚豚骨魚介醤油ラーメン。炙りチャーシューと半熟味玉が絶品。店舗のテイクアウト食券をドライバーが代理購入してお届けします。',
    address: '東京都渋谷区道玄坂2-19-11',
    area: '渋谷',
    phone: '03-3461-7782',
    lat: 35.6581,
    lng: 139.6962,
    image_url: 'images/ramen.webp',
    is_partner: 0,
    is_open: 1,
    avg_prep_min: 25,
    rating: 4.8,
    review_count: 312,
    takeout_notes: '入口左の券売機で「テイクアウト専用」の食券を購入し、店員に渡してください。麺とスープはセパレート容器で受け取れます。',
  },
  {
    id: 'store-yoshoku-kitchen',
    name: '老舗洋食 キッチン三ツ星',
    category: '洋食',
    description: '3日間煮込んだ濃厚デミグラスソースのふわとろオムライスと手ごねハンバーグの名店。店頭テイクアウトをドライバーが代行購入します。',
    address: '東京都渋谷区恵比寿西1-16-2',
    area: '恵比寿',
    phone: '03-3464-2288',
    lat: 35.6484,
    lng: 139.7072,
    image_url: 'images/yoshoku.webp',
    is_partner: 0,
    is_open: 1,
    avg_prep_min: 20,
    rating: 4.8,
    review_count: 127,
    takeout_notes: '予約不要で入口カウンターにてテイクアウト注文可能です。ランチピークは待ち時間が15〜20分かかることがあります。',
  },
  {
    id: 'store-yakitori-bento',
    name: '炭火焼鳥 とり源 商店',
    category: '焼き鳥・弁当',
    description: '備長炭で香ばしく焼き上げるねぎま焼鳥と秘伝醤油ダレのジューシー唐揚げ弁当。テイクアウト専用窓口からドライバーが購入します。',
    address: '東京都港区六本木4-8-12',
    area: '六本木',
    phone: '03-3401-6619',
    lat: 35.6627,
    lng: 139.7294,
    image_url: 'images/yakitori.webp',
    is_partner: 0,
    is_open: 1,
    avg_prep_min: 18,
    rating: 4.7,
    review_count: 95,
    takeout_notes: '店舗右側のテイクアウト専用小窓から注文してください。焼鳥の味付け（タレ／塩）をお客様メモで確認のうえ注文お願いします。',
  },
];

export const SEED_MENU_ITEMS: SeedMenuItem[] = [
  // THE WAGYU CRAFT
  {
    id: 'item-wagyu-1',
    store_id: 'store-wagyu-burger',
    name: 'ダブル和牛チーズバーガー',
    description: '黒毛和牛パティ2枚・濃厚チェダーチーズ・飴色玉ねぎ・自家製トリュフマヨ',
    price: 1680,
    category: 'バーガー',
    options_json: JSON.stringify([
      { name: 'ポテトセット', choices: [{ label: '単品', price: 0 }, { label: 'トリュフポテトS付き', price: 320 }] },
      { name: '焼き加減', choices: [{ label: 'ミディアムレア（おすすめ）', price: 0 }, { label: 'ウェルダン', price: 0 }] },
    ]),
    is_popular: 1,
    sort_order: 1,
  },
  {
    id: 'item-wagyu-2',
    store_id: 'store-wagyu-burger',
    name: 'スモーキーベーコン和牛バーガー',
    description: '厚切り燻製ベーコンとスモークBBQソースが香る人気No.2バーガー',
    price: 1540,
    category: 'バーガー',
    options_json: JSON.stringify([
      { name: 'トッピング', choices: [{ label: 'なし', price: 0 }, { label: 'アボカド追加', price: 220 }, { label: '目玉焼き追加', price: 160 }] },
    ]),
    is_popular: 1,
    sort_order: 2,
  },
  {
    id: 'item-wagyu-3',
    store_id: 'store-wagyu-burger',
    name: 'トリュフ＆パルメザンポテト L',
    description: '揚げたての皮付きポテトに黒トリュフ塩と削りパルメザンチーズ',
    price: 580,
    category: 'サイド',
    options_json: '[]',
    is_popular: 0,
    sort_order: 3,
  },
  {
    id: 'item-wagyu-4',
    store_id: 'store-wagyu-burger',
    name: '自家製スパイスクラフトコーラ',
    description: 'カルダモンと国産レモンを漬け込んだ爽やかなクラフトコーラ',
    price: 420,
    category: 'ドリンク',
    options_json: '[]',
    is_popular: 0,
    sort_order: 4,
  },

  // 築地 鮨 雅
  {
    id: 'item-sushi-1',
    store_id: 'store-edomae-sushi',
    name: '特上 江戸前握り10貫折',
    description: '本鮪大トロ・中トロ・炙りサーモン・活車海老・カンパチ・玉子ほか厳選10貫',
    price: 2980,
    category: '握り折',
    options_json: JSON.stringify([
      { name: 'わさび', choices: [{ label: 'あり（通常）', price: 0 }, { label: 'サビ抜き・別添え', price: 0 }] },
    ]),
    is_popular: 1,
    sort_order: 1,
  },
  {
    id: 'item-sushi-2',
    store_id: 'store-edomae-sushi',
    name: '本鮪・生サーモン豪華二色丼',
    description: '赤酢シャリの上に脂の乗った本鮪とノルウェー産生サーモンを贅沢に',
    price: 1880,
    category: '海鮮丼',
    options_json: JSON.stringify([
      { name: 'シャリ量', choices: [{ label: '並盛', price: 0 }, { label: '大盛', price: 150 }] },
    ]),
    is_popular: 1,
    sort_order: 2,
  },
  {
    id: 'item-sushi-3',
    store_id: 'store-edomae-sushi',
    name: '炙りサーモンとアボカドのロール',
    description: '香ばしく炙ったサーモンに濃厚アボカドとイクラをトッピング（6切）',
    price: 1280,
    category: '巻物',
    options_json: '[]',
    is_popular: 0,
    sort_order: 3,
  },
  {
    id: 'item-sushi-4',
    store_id: 'store-edomae-sushi',
    name: '真鯛の旨み赤だしあら汁',
    description: '鯛の骨からじっくり出汁をとった上品な赤だし（保温カップ入り）',
    price: 380,
    category: '汁物',
    options_json: '[]',
    is_popular: 0,
    sort_order: 4,
  },

  // SPICE LABO
  {
    id: 'item-curry-1',
    store_id: 'store-spice-curry',
    name: '熟成三元豚のスパイスカツカレー',
    description: '低温熟成した厚切りロースカツと18種スパイスの特製ルウ・焼き野菜添え',
    price: 1580,
    category: 'カレー',
    options_json: JSON.stringify([
      { name: '辛さ', choices: [{ label: '中辛（定番）', price: 0 }, { label: '辛口', price: 0 }, { label: '激辛（＋ハバネロ）', price: 80 }] },
      { name: 'ライス量', choices: [{ label: '普通 200g', price: 0 }, { label: '大盛 300g', price: 120 }] },
    ]),
    is_popular: 1,
    sort_order: 1,
  },
  {
    id: 'item-curry-2',
    store_id: 'store-spice-curry',
    name: '2種あいがけスパイスカレー',
    description: '濃厚バターチキンと粗挽きラムキーマの欲張りあいがけプレート',
    price: 1420,
    category: 'カレー',
    options_json: '[]',
    is_popular: 1,
    sort_order: 2,
  },
  {
    id: 'item-curry-3',
    store_id: 'store-spice-curry',
    name: '炙りチーズキーマカレー',
    description: 'とろける炙りチーズと温泉卵を絡めて楽しむ濃厚キーマ',
    price: 1350,
    category: 'カレー',
    options_json: '[]',
    is_popular: 0,
    sort_order: 3,
  },
  {
    id: 'item-curry-4',
    store_id: 'store-spice-curry',
    name: 'アルフォンソマンゴーラッシー',
    description: 'スパイスカレーと相性抜群の濃厚ヨーグルトドリンク',
    price: 450,
    category: 'ドリンク',
    options_json: '[]',
    is_popular: 0,
    sort_order: 4,
  },

  // 京都宇治茶寮 栞
  {
    id: 'item-cafe-1',
    store_id: 'store-matcha-cafe',
    name: 'あまおう苺とマスカルポーネのフルーツサンド',
    description: '甘さ控えめの特製マスカルポーネクリームと完熟苺をふわふわ食パンで',
    price: 880,
    category: 'スイーツ',
    options_json: '[]',
    is_popular: 1,
    sort_order: 1,
  },
  {
    id: 'item-cafe-2',
    store_id: 'store-matcha-cafe',
    name: '石臼挽き濃厚宇治抹茶ラテ',
    description: '注文ごとに点てる宇治一番茶と北海道産ミルクの二層ラテ',
    price: 680,
    category: 'ドリンク',
    options_json: JSON.stringify([
      { name: '温度', choices: [{ label: 'アイス', price: 0 }, { label: 'ホット', price: 0 }] },
      { name: '甘さ', choices: [{ label: '微糖（おすすめ）', price: 0 }, { label: '無糖', price: 0 }, { label: '甘め', price: 0 }] },
    ]),
    is_popular: 1,
    sort_order: 2,
  },
  {
    id: 'item-cafe-3',
    store_id: 'store-matcha-cafe',
    name: 'フランス産発酵バタークロワッサン（2個）',
    description: '外はパリッと中はもっちり、香り高い焼きたてクロワッサン',
    price: 760,
    category: 'ベーカリー',
    options_json: '[]',
    is_popular: 0,
    sort_order: 3,
  },
  {
    id: 'item-cafe-4',
    store_id: 'store-matcha-cafe',
    name: '焦がしほうじ茶バスクチーズケーキ',
    description: '香ばしい京都産ほうじ茶が香るトロトロ食感のチーズケーキ',
    price: 720,
    category: 'スイーツ',
    options_json: '[]',
    is_popular: 0,
    sort_order: 4,
  },

  // 町中華 龍鳳軒（非提携）
  {
    id: 'item-chuka-1',
    store_id: 'store-machi-chuka',
    name: '名物 黄金パラパラチャーハン',
    description: '自家製焼豚・卵・ねぎ・ナルトを強火で仕上げた王道町中華チャーハン（※店頭価格目安）',
    price: 850,
    category: '飯もの',
    options_json: JSON.stringify([
      { name: 'サイズ', choices: [{ label: '並盛', price: 0 }, { label: '大盛', price: 150 }] },
    ]),
    is_popular: 1,
    sort_order: 1,
  },
  {
    id: 'item-chuka-2',
    store_id: 'store-machi-chuka',
    name: 'パリパリ羽根つき焼き餃子（6個）',
    description: 'ニンニクと生姜が効いた肉汁あふれる手作り餃子（※店頭価格目安）',
    price: 480,
    category: '点心',
    options_json: '[]',
    is_popular: 1,
    sort_order: 2,
  },
  {
    id: 'item-chuka-3',
    store_id: 'store-machi-chuka',
    name: 'ぷりぷり大海老のチリソース',
    description: '豆板醤の旨辛チリソースが絡む大ぶりエビチリ（※店頭価格目安）',
    price: 1180,
    category: '一品料理',
    options_json: '[]',
    is_popular: 1,
    sort_order: 3,
  },
  {
    id: 'item-chuka-4',
    store_id: 'store-machi-chuka',
    name: '五目あんかけ焼きそば',
    description: '香ばしく焼いた中華麺に具だくさんの熱々醤油あん（※店頭価格目安）',
    price: 980,
    category: '麺類',
    options_json: '[]',
    is_popular: 0,
    sort_order: 4,
  },

  // 麺屋 篝火（非提携）
  {
    id: 'item-ramen-1',
    store_id: 'store-kagaribi-ramen',
    name: '特製 濃厚豚骨魚介醤油ラーメン（持ち帰り）',
    description: '炙りチャーシュー2枚・半熟味玉・海苔・九条ねぎ付き（麺・スープ別添）',
    price: 1250,
    category: 'ラーメン',
    options_json: JSON.stringify([
      { name: '麺の硬さ・量', choices: [{ label: '並盛（茹で済み）', price: 0 }, { label: '大盛', price: 150 }] },
    ]),
    is_popular: 1,
    sort_order: 1,
  },
  {
    id: 'item-ramen-2',
    store_id: 'store-kagaribi-ramen',
    name: '厚切り炙りチャーシュー麺',
    description: '香ばしく炙ったトロトロ豚バラチャーシューを4枚贅沢に乗せた一杯',
    price: 1380,
    category: 'ラーメン',
    options_json: '[]',
    is_popular: 1,
    sort_order: 2,
  },
  {
    id: 'item-ramen-3',
    store_id: 'store-kagaribi-ramen',
    name: '燻製チャーシューご飯（テイクアウト）',
    description: '刻みチャーシューと特製甘辛ダレ・白ねぎのミニ丼',
    price: 420,
    category: 'サイド丼',
    options_json: '[]',
    is_popular: 0,
    sort_order: 3,
  },

  // 老舗洋食 キッチン三ツ星（非提携）
  {
    id: 'item-yoshoku-1',
    store_id: 'store-yoshoku-kitchen',
    name: 'ふわとろデミグラスオムライス',
    description: 'バター香るチキンライスに半熟卵と3日間煮込みデミグラスソース',
    price: 1280,
    category: '洋食メイン',
    options_json: '[]',
    is_popular: 1,
    sort_order: 1,
  },
  {
    id: 'item-yoshoku-2',
    store_id: 'store-yoshoku-kitchen',
    name: 'オムライス＆手ごねハンバーグ特製プレート',
    description: '名物オムライスと肉汁溢れるハンバーグを一皿にした一番人気テイクアウト',
    price: 1880,
    category: '洋食メイン',
    options_json: '[]',
    is_popular: 1,
    sort_order: 2,
  },
  {
    id: 'item-yoshoku-3',
    store_id: 'store-yoshoku-kitchen',
    name: '手ごね和牛ハンバーグ弁当',
    description: '特製オニオンデミソース・ライス・千切りキャベツサラダ付き',
    price: 1480,
    category: '弁当',
    options_json: '[]',
    is_popular: 0,
    sort_order: 3,
  },
  {
    id: 'item-yoshoku-4',
    store_id: 'store-yoshoku-kitchen',
    name: '北海道とうもろこしポタージュ',
    description: '濃厚でクリーミーな手作りコーンスープ',
    price: 380,
    category: 'スープ',
    options_json: '[]',
    is_popular: 0,
    sort_order: 4,
  },

  // 炭火焼鳥 とり源 商店（非提携）
  {
    id: 'item-yakitori-1',
    store_id: 'store-yakitori-bento',
    name: '炭火ねぎま焼鳥＆秘伝唐揚げ弁当',
    description: '備長炭で焼いたねぎま2本・ジューシー唐揚げ3個・海苔ごまご飯の豪華弁当',
    price: 1150,
    category: '弁当',
    options_json: JSON.stringify([
      { name: '焼鳥の味付け', choices: [{ label: '秘伝タレ', price: 0 }, { label: 'こだわりの塩', price: 0 }] },
    ]),
    is_popular: 1,
    sort_order: 1,
  },
  {
    id: 'item-yakitori-2',
    store_id: 'store-yakitori-bento',
    name: 'おまかせ炭火焼鳥6本パック',
    description: 'ねぎま・もも・つくね・皮・砂肝・ぼんじりの人気6本盛り合わせ',
    price: 1080,
    category: '焼鳥',
    options_json: JSON.stringify([
      { name: '味付け', choices: [{ label: 'タレ中心', price: 0 }, { label: '塩中心', price: 0 }, { label: 'おまかせ', price: 0 }] },
    ]),
    is_popular: 1,
    sort_order: 2,
  },
  {
    id: 'item-yakitori-3',
    store_id: 'store-yakitori-bento',
    name: '秘伝醤油のジューシー唐揚げ（5個）',
    description: '生姜とにんにくが香るカリッとジューシーな鶏もも唐揚げ',
    price: 650,
    category: '揚げ物',
    options_json: '[]',
    is_popular: 0,
    sort_order: 3,
  },
];

export const SEED_DRIVERS: SeedDriver[] = [
  {
    id: 'drv-tanaka',
    name: '田中 健太',
    phone: '090-1234-5678',
    vehicle_type: 'ebike',
    is_online: 1,
    proxy_card_enabled: 1,
    is_approved: 1,
    current_lat: 35.6565,
    current_lng: 139.7012,
    rating: 4.95,
    completed_deliveries: 428,
    total_earnings: 268400,
  },
  {
    id: 'drv-sato',
    name: '佐藤 美咲',
    phone: '090-2345-6789',
    vehicle_type: 'scooter',
    is_online: 1,
    proxy_card_enabled: 1,
    is_approved: 1,
    current_lat: 35.6485,
    current_lng: 139.7061,
    rating: 4.92,
    completed_deliveries: 315,
    total_earnings: 214900,
  },
  {
    id: 'drv-suzuki',
    name: '鈴木 大輔',
    phone: '080-3456-7890',
    vehicle_type: 'bicycle',
    is_online: 1,
    proxy_card_enabled: 0,
    is_approved: 1,
    current_lat: 35.6632,
    current_lng: 139.7104,
    rating: 4.81,
    completed_deliveries: 142,
    total_earnings: 84200,
  },
  {
    id: 'drv-yamamoto',
    name: '山本 拓海',
    phone: '080-9876-5432',
    vehicle_type: 'scooter',
    is_online: 0,
    proxy_card_enabled: 1,
    is_approved: 1,
    current_lat: 35.6521,
    current_lng: 139.7198,
    rating: 4.88,
    completed_deliveries: 204,
    total_earnings: 139600,
  },
];

export async function seedDatabase(db: D1Database): Promise<void> {
  const now = new Date().toISOString();
  const minsAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString();

  const statements: D1PreparedStatement[] = [
    db.prepare('DELETE FROM order_messages'),
    db.prepare('DELETE FROM order_events'),
    db.prepare('DELETE FROM orders'),
    db.prepare('DELETE FROM menu_items'),
    db.prepare('DELETE FROM drivers'),
    db.prepare('DELETE FROM stores'),
    db.prepare('DELETE FROM platform_settings'),
    db
      .prepare(
        `INSERT INTO platform_settings
         (id, base_delivery_fee, proxy_order_fee, service_fee_rate, merchant_commission_rate, driver_base_payout, driver_proxy_bonus, updated_at)
         VALUES (1, 320, 250, 0.10, 0.25, 380, 240, ?)`
      )
      .bind(now),
  ];

  for (const s of SEED_STORES) {
    statements.push(
      db
        .prepare(
          `INSERT INTO stores
           (id, name, category, description, address, area, phone, lat, lng, image_url, is_partner, is_unlisted_request, is_open, busy_mode, avg_prep_min, rating, review_count, takeout_notes, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 0, ?, ?, ?, ?, ?)`
        )
        .bind(
          s.id, s.name, s.category, s.description, s.address, s.area, s.phone,
          s.lat, s.lng, s.image_url, s.is_partner, s.is_open, s.avg_prep_min,
          s.rating, s.review_count, s.takeout_notes, now
        )
    );
  }

  for (const m of SEED_MENU_ITEMS) {
    statements.push(
      db
        .prepare(
          `INSERT INTO menu_items
           (id, store_id, name, description, price, category, options_json, is_available, is_popular, sort_order)
           VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`
        )
        .bind(m.id, m.store_id, m.name, m.description, m.price, m.category, m.options_json, m.is_popular, m.sort_order)
    );
  }

  for (const d of SEED_DRIVERS) {
    statements.push(
      db
        .prepare(
          `INSERT INTO drivers
           (id, name, phone, vehicle_type, is_online, proxy_card_enabled, is_approved, current_lat, current_lng, rating, completed_deliveries, total_earnings, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          d.id, d.name, d.phone, d.vehicle_type, d.is_online, d.proxy_card_enabled,
          d.is_approved, d.current_lat, d.current_lng, d.rating,
          d.completed_deliveries, d.total_earnings, now
        )
    );
  }

  const sampleOrders = [
    {
      id: 'ORD-1001',
      order_code: 'W84K',
      order_type: 'partner',
      status: 'placed',
      customer_name: '高橋 悠斗',
      customer_phone: '090-5511-2233',
      delivery_address: '東京都渋谷区神南1-12-16 パークサイド渋谷 502号室',
      delivery_note: '置き配希望（玄関ドア前・インターホン不要）',
      delivery_lat: 35.6631,
      delivery_lng: 139.7018,
      store_id: 'store-wagyu-burger',
      store_name: 'THE WAGYU CRAFT 渋谷店',
      store_address: '東京都渋谷区宇田川町24-8 1F',
      store_lat: 35.6602,
      store_lng: 139.6992,
      store_is_partner: 1,
      takeout_notes: '',
      driver_id: null,
      driver_name: null,
      items_json: JSON.stringify([
        { menu_item_id: 'item-wagyu-1', name: 'ダブル和牛チーズバーガー', unit_price: 2000, quantity: 1, selected_options: ['トリュフポテトS付き', 'ミディアムレア（おすすめ）'], note: 'ピクルス抜きでお願いします' },
        { menu_item_id: 'item-wagyu-4', name: '自家製スパイスクラフトコーラ', unit_price: 420, quantity: 1, selected_options: [], note: '' },
      ]),
      estimated_subtotal: 2420,
      actual_subtotal: 2420,
      price_diff: 0,
      delivery_fee: 320,
      service_fee: 242,
      proxy_fee: 0,
      tip_amount: 100,
      total_amount: 3082,
      driver_payout: 480,
      payment_method: 'paypay',
      payment_label: 'PayPay',
      payment_status: 'paid',
      billing_profile: 'personal',
      substitution_policy: 'contact',
      max_budget_overage: 0,
      estimated_prep_min: null,
      created_at: minsAgo(4),
      updated_at: minsAgo(4),
    },
    {
      id: 'ORD-1002',
      order_code: 'P39M',
      order_type: 'proxy_takeout',
      status: 'placed',
      customer_name: '中村 さくら',
      customer_phone: '080-4422-8899',
      delivery_address: '東京都目黒区青葉台1-22-4 メゾン中目黒 301',
      delivery_note: 'オートロック301呼出お願いします。割り箸2膳希望です！',
      delivery_lat: 35.6476,
      delivery_lng: 139.6968,
      store_id: 'store-machi-chuka',
      store_name: '町中華 龍鳳軒（りゅうほうけん）',
      store_address: '東京都目黒区上目黒2-14-3',
      store_lat: 35.6442,
      store_lng: 139.6991,
      store_is_partner: 0,
      takeout_notes: 'レジまたはカウンターで「お持ち帰りで」と口頭注文してください。容器代が1品50円ほど加算される場合があります。現金・PayPay・タッチ決済可。',
      driver_id: null,
      driver_name: null,
      items_json: JSON.stringify([
        { menu_item_id: 'item-chuka-1', name: '名物 黄金パラパラチャーハン', unit_price: 1000, quantity: 1, selected_options: ['大盛'], note: '紅生姜多めが可能ならお願いします' },
        { menu_item_id: 'item-chuka-2', name: 'パリパリ羽根つき焼き餃子（6個）', unit_price: 480, quantity: 2, selected_options: [], note: 'タレ・ラー油別添え希望' },
      ]),
      estimated_subtotal: 1960,
      actual_subtotal: null,
      price_diff: 0,
      delivery_fee: 320,
      service_fee: 196,
      proxy_fee: 250,
      tip_amount: 150,
      total_amount: 2876,
      driver_payout: 770,
      payment_method: 'cash',
      payment_label: '現金（配達時払い）',
      payment_status: 'cash_on_delivery',
      billing_profile: 'personal',
      substitution_policy: 'contact',
      max_budget_overage: 300,
      estimated_prep_min: 22,
      created_at: minsAgo(6),
      updated_at: minsAgo(6),
    },
    {
      id: 'ORD-1003',
      order_code: 'R71T',
      order_type: 'proxy_takeout',
      status: 'proxy_ordering',
      customer_name: '伊藤 翔太',
      customer_phone: '090-7788-1122',
      delivery_address: '東京都渋谷区恵比寿南2-8-14 恵比寿テラス 704',
      delivery_note: '玄関チャイム鳴らしてください',
      delivery_lat: 35.6448,
      delivery_lng: 139.7078,
      store_id: 'store-yoshoku-kitchen',
      store_name: '老舗洋食 キッチン三ツ星',
      store_address: '東京都渋谷区恵比寿西1-16-2',
      store_lat: 35.6484,
      store_lng: 139.7072,
      store_is_partner: 0,
      takeout_notes: '予約不要で入口カウンターにてテイクアウト注文可能です。ランチピークは待ち時間が15〜20分かかることがあります。',
      driver_id: 'drv-sato',
      driver_name: '佐藤 美咲',
      items_json: JSON.stringify([
        { menu_item_id: 'item-yoshoku-2', name: 'オムライス＆手ごねハンバーグ特製プレート', unit_price: 1880, quantity: 1, selected_options: [], note: '' },
        { menu_item_id: 'item-yoshoku-4', name: '北海道とうもろこしポタージュ', unit_price: 380, quantity: 1, selected_options: [], note: '' },
      ]),
      estimated_subtotal: 2260,
      actual_subtotal: null,
      price_diff: 0,
      delivery_fee: 320,
      service_fee: 226,
      proxy_fee: 250,
      tip_amount: 0,
      total_amount: 3056,
      driver_payout: 620,
      payment_method: 'suica',
      payment_label: 'モバイルSuica',
      payment_status: 'paid',
      billing_profile: 'personal',
      substitution_policy: 'similar',
      max_budget_overage: 300,
      estimated_prep_min: 20,
      created_at: minsAgo(15),
      updated_at: minsAgo(3),
    },
    {
      id: 'ORD-1000',
      order_code: 'S12B',
      order_type: 'partner',
      status: 'delivered',
      customer_name: '渡辺 陽菜',
      customer_phone: '080-6633-9900',
      delivery_address: '東京都渋谷区広尾1-9-15 広尾レジデンス 401',
      delivery_note: '宅配ボックス不可・手渡し希望',
      delivery_lat: 35.6502,
      delivery_lng: 139.7165,
      store_id: 'store-edomae-sushi',
      store_name: '築地 鮨 雅（みやび）恵比寿',
      store_address: '東京都渋谷区恵比寿南1-11-9',
      store_lat: 35.6468,
      store_lng: 139.7095,
      store_is_partner: 1,
      takeout_notes: '',
      driver_id: 'drv-tanaka',
      driver_name: '田中 健太',
      items_json: JSON.stringify([
        { menu_item_id: 'item-sushi-1', name: '特上 江戸前握り10貫折', unit_price: 2980, quantity: 1, selected_options: ['あり（通常）'], note: '' },
        { menu_item_id: 'item-sushi-4', name: '真鯛の旨み赤だしあら汁', unit_price: 380, quantity: 1, selected_options: [], note: '' },
      ]),
      estimated_subtotal: 3360,
      actual_subtotal: 3360,
      price_diff: 0,
      delivery_fee: 320,
      service_fee: 336,
      proxy_fee: 0,
      tip_amount: 200,
      total_amount: 4216,
      driver_payout: 580,
      payment_method: 'credit_card',
      payment_label: 'Visa •••• 4919',
      payment_status: 'paid',
      billing_profile: 'business',
      substitution_policy: 'contact',
      max_budget_overage: 0,
      estimated_prep_min: 20,
      created_at: minsAgo(55),
      updated_at: minsAgo(22),
    },
  ];

  for (const o of sampleOrders) {
    statements.push(
      db
        .prepare(
          `INSERT INTO orders (
            id, order_code, order_type, status, customer_name, customer_phone,
            delivery_address, delivery_note, delivery_lat, delivery_lng,
            store_id, store_name, store_address, store_lat, store_lng, store_is_partner, takeout_notes,
            driver_id, driver_name, items_json,
            estimated_subtotal, actual_subtotal, price_diff,
            delivery_fee, service_fee, proxy_fee, tip_amount, discount_amount, voucher_code, total_amount, driver_payout,
            payment_method, payment_label, payment_status, billing_profile, driver_store_payment_method,
            substitution_policy, max_budget_overage, estimated_prep_min,
            customer_rating_store, customer_rating_driver, customer_review_comment,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, '', ?, ?, ?, ?, ?, ?, 'proxy_card', ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          o.id, o.order_code, o.order_type, o.status, o.customer_name, o.customer_phone,
          o.delivery_address, o.delivery_note, o.delivery_lat, o.delivery_lng,
          o.store_id, o.store_name, o.store_address, o.store_lat, o.store_lng, o.store_is_partner, o.takeout_notes,
          o.driver_id, o.driver_name, o.items_json,
          o.estimated_subtotal, o.actual_subtotal, o.price_diff,
          o.delivery_fee, o.service_fee, o.proxy_fee, o.tip_amount, o.total_amount, o.driver_payout,
          o.payment_method, o.payment_label, o.payment_status, o.billing_profile,
          o.substitution_policy, o.max_budget_overage, o.estimated_prep_min,
          o.id === 'ORD-1000' ? 5 : null,
          o.id === 'ORD-1000' ? 5 : null,
          o.id === 'ORD-1000' ? 'ネタが新鮮でとても丁寧な配達でした！' : null,
          o.created_at, o.updated_at
        )
    );
  }

  statements.push(
    db.prepare(`INSERT INTO order_events (order_id, actor_role, actor_name, event_type, message, created_at) VALUES (?, 'customer', '高橋 悠斗', 'placed', '提携店舗へ注文が送信されました（店舗の承認待ち）', ?)`).bind('ORD-1001', minsAgo(4)),
    db.prepare(`INSERT INTO order_events (order_id, actor_role, actor_name, event_type, message, created_at) VALUES (?, 'customer', '中村 さくら', 'placed', '非提携店舗の店頭代理注文リクエストが作成されました（対応ドライバー検索中）', ?)`).bind('ORD-1002', minsAgo(6)),
    db.prepare(`INSERT INTO order_events (order_id, actor_role, actor_name, event_type, message, created_at) VALUES (?, 'customer', '伊藤 翔太', 'placed', '非提携店舗の店頭代理注文リクエストが作成されました', ?)`).bind('ORD-1003', minsAgo(15)),
    db.prepare(`INSERT INTO order_events (order_id, actor_role, actor_name, event_type, message, created_at) VALUES (?, 'driver', '佐藤 美咲', 'driver_assigned', 'ドライバー佐藤 美咲が代理購入を受諾し店舗へ向かっています', ?)`).bind('ORD-1003', minsAgo(11)),
    db.prepare(`INSERT INTO order_events (order_id, actor_role, actor_name, event_type, message, created_at) VALUES (?, 'driver', '佐藤 美咲', 'proxy_ordering', '店舗に到着し、持ち帰り注文の手続きを開始しました', ?)`).bind('ORD-1003', minsAgo(3)),
    db.prepare(`INSERT INTO order_events (order_id, actor_role, actor_name, event_type, message, created_at) VALUES (?, 'customer', '渡辺 陽菜', 'placed', '注文が送信されました', ?)`).bind('ORD-1000', minsAgo(55)),
    db.prepare(`INSERT INTO order_events (order_id, actor_role, actor_name, event_type, message, created_at) VALUES (?, 'driver', '田中 健太', 'delivered', '配達が完了しました', ?)`).bind('ORD-1000', minsAgo(22)),
    db.prepare(`INSERT INTO order_messages (order_id, sender_role, sender_name, body, created_at) VALUES ('ORD-1003', 'driver', '佐藤 美咲', 'キッチン三ツ星に到着しました！ただいま店頭カウンターでオムライス＆ハンバーグプレートとポタージュの持ち帰り注文を行います。', ?)`).bind(minsAgo(3)),
    db.prepare(`INSERT INTO order_messages (order_id, sender_role, sender_name, body, created_at) VALUES ('ORD-1003', 'customer', '伊藤 翔太', 'ありがとうございます！お手数おかけしますがよろしくお願いします。', ?)`).bind(minsAgo(2))
  );

  await db.batch(statements);
}
