// Firestore 요리/레벨 데이터의 표시용 번역.
//
// Firestore에는 한국어(name_kr, category, kick_options)와 영어(name_en, 레벨 title)만
// 있다. 데이터는 그대로 두고 화면에 보여줄 때만 여기서 번역한다 - 특히 킥 선택 답변은
// users 문서에 한국어 원문으로 저장되므로(saveKickChoice), 저장값을 바꾸지 않고 표시만
// 번역해야 기존 데이터와 호환된다. 사전에 없는 값(새로 추가된 요리 등)은 원문으로 보인다.

import type { Language } from "@/src/contexts/LanguageContext";

type Tr = { en: string; ja: string; zh: string };
type Tr4 = { ko: string } & Tr;

/** 요리 이름 (ko는 name_kr, en은 name_en을 쓰고 여기엔 일본어/중국어만) */
const DISH_NAMES: Record<string, { ja: string; zh: string }> = {
  rolled_omelet: { ja: "ケランマリ（卵焼き）", zh: "韩式鸡蛋卷" },
  bulgogi: { ja: "プルコギ", zh: "韩式烤牛肉" },
  kalguksu: { ja: "カルグクス", zh: "韩式刀切面" },
  korean_fried_chicken: { ja: "韓国式フライドチキン", zh: "韩式炸鸡" },
  korean_sweets: { ja: "韓菓（伝統菓子）", zh: "韩果（传统点心）" },
  galbitang: { ja: "カルビタン", zh: "排骨汤" },
  samgyeopsal: { ja: "サムギョプサル", zh: "烤五花肉" },
  bingsu: { ja: "パッピンス", zh: "红豆刨冰" },
  bibimbap: { ja: "ビビンバ", zh: "韩式拌饭" },
  gomtang_seolleongtang: { ja: "コムタン／ソルロンタン", zh: "牛骨汤（雪浓汤）" },
  buchimgae: { ja: "プッチムゲ（チヂミ）", zh: "韩式煎饼" },
  sikhye: { ja: "シッケ（米の甘い飲み物）", zh: "甜米露" },
  abalone_porridge: { ja: "アワビ粥", zh: "鲍鱼粥" },
  gimbap: { ja: "キンパ", zh: "紫菜包饭" },
  bindaetteok: { ja: "ピンデトッ（緑豆チヂミ）", zh: "绿豆煎饼" },
  dak_han_mari: { ja: "タッカンマリ", zh: "一只鸡（整鸡汤锅）" },
  suyuk: { ja: "スユク（ゆで豚）", zh: "白切猪肉" },
  bean_sprout_soup: { ja: "豆もやしスープ", zh: "黄豆芽汤" },
  traditional_tea: { ja: "伝統茶", zh: "传统茶" },
  ssambap: { ja: "サムパプ（包みご飯）", zh: "包饭" },
  fish_cake_soup: { ja: "おでんスープ", zh: "鱼饼汤" },
  kong_guksu: { ja: "コングクス（豆乳冷麺）", zh: "豆浆冷面" },
  white_kimchi: { ja: "白キムチ", zh: "白泡菜" },
  perilla_soup: { ja: "エゴマ鍋", zh: "紫苏汤" },
  jjimdak: { ja: "チムタク", zh: "安东炖鸡" },
  seaweed_soup: { ja: "わかめスープ", zh: "海带汤" },
  dried_pollack_soup: { ja: "干しダラのスープ", zh: "明太鱼干汤" },
  doenjang_jjigae: { ja: "テンジャンチゲ", zh: "大酱汤" },
  kimchi_jeon: { ja: "キムチチヂミ", zh: "泡菜煎饼" },
  kimchi_fried_rice: { ja: "キムチチャーハン", zh: "泡菜炒饭" },
  seafood_pancake: { ja: "海鮮チヂミ", zh: "海鲜葱饼" },
  young_radish_noodle: { ja: "ヨルムグクス", zh: "萝卜缨泡菜面" },
  grilled_eel: { ja: "ウナギ焼き", zh: "烤鳗鱼" },
  tofu_with_kimchi: { ja: "豆腐キムチ", zh: "泡菜豆腐" },
  raw_fish: { ja: "刺身（フェ）", zh: "生鱼片" },
  jokbal: { ja: "チョッパル（豚足）", zh: "酱猪蹄" },
  bossam: { ja: "ポッサム", zh: "菜包肉" },
  mussel_soup: { ja: "ムール貝スープ", zh: "青口贝汤" },
  soy_pulp_stew: { ja: "コンビジチゲ（おから鍋）", zh: "豆渣汤" },
  bibim_guksu: { ja: "ビビングクス", zh: "韩式拌面" },
  spicy_pork_stir_fry: { ja: "チェユクポックム", zh: "辣炒猪肉" },
  budae_jjigae: { ja: "プデチゲ", zh: "部队锅" },
  raw_beef: { ja: "ユッケ", zh: "生拌牛肉" },
  blowfish_soup: { ja: "フグのスープ", zh: "河豚汤" },
  dak_galbi: { ja: "タッカルビ", zh: "辣炒鸡排" },
  raw_gizzard_shad: { ja: "コノシロの刺身", zh: "斑鰶生鱼片" },
  tteokbokki: { ja: "トッポッキ", zh: "辣炒年糕" },
  kimchi_jjigae: { ja: "キムチチゲ", zh: "泡菜汤" },
  sundubu_jjigae: { ja: "スンドゥブチゲ", zh: "嫩豆腐汤" },
  yukgaejang: { ja: "ユッケジャン", zh: "辣牛肉汤" },
  bibim_naengmyeon: { ja: "ビビン冷麺", zh: "拌冷面" },
  kimchi_hotpot: { ja: "キムチ鍋", zh: "泡菜火锅" },
  live_octopus: { ja: "サンナクチ（活きダコ）", zh: "活章鱼" },
  spicy_chicken_stew: { ja: "タッポックムタン", zh: "辣炖鸡块" },
  braised_mackerel: { ja: "サバの煮付け", zh: "炖青花鱼" },
  braised_cutlassfish: { ja: "タチウオの煮付け", zh: "炖带鱼" },
  pollack_stew: { ja: "スケトウダラのチゲ", zh: "冻明太鱼汤" },
  gamjatang: { ja: "カムジャタン", zh: "土豆排骨汤" },
  kimchi: { ja: "キムチ", zh: "泡菜" },
  soft_octopus_soup: { ja: "ヨンポタン（テナガダコ鍋）", zh: "软章鱼汤" },
  jeotgal: { ja: "チョッカル（塩辛）", zh: "韩式腌海鲜" },
  spicy_sea_bream_soup: { ja: "鯛のメウンタン", zh: "辣炖鲷鱼汤" },
  sundae_soup: { ja: "スンデクッ", zh: "血肠汤" },
  seafood_stew: { ja: "ヘムルタン（海鮮鍋）", zh: "海鲜汤" },
  beef_tripe_hotpot: { ja: "コプチャン鍋", zh: "牛肠火锅" },
  steamed_aged_kimchi: { ja: "ムグンジチム（古漬けキムチ煮）", zh: "陈年泡菜焖菜" },
  maeun_tang: { ja: "メウンタン", zh: "辣鱼汤" },
  gejang: { ja: "ケジャン", zh: "酱蟹" },
  cheonggukjang: { ja: "チョングッチャン", zh: "清麴酱汤" },
  buldak: { ja: "プルダック", zh: "火辣烤鸡" },
  spicy_marinated_crab: { ja: "ヤンニョムケジャン", zh: "辣酱蟹" },
  fermented_skate: { ja: "ホンオフェ（発酵エイ）", zh: "发酵鳐鱼" },
  k_food_course_master: { ja: "韓食コースマスター", zh: "韩餐套餐达人" },
  soy_sauce_master: { ja: "醤油マスター", zh: "酱油达人" },
  traditional_fermented_paste: { ja: "伝統の醤（ジャン）体験", zh: "传统酱体验" },
  doenjang_master: { ja: "テンジャンマスター", zh: "大酱达人" },
  gochujang_master: { ja: "コチュジャンマスター", zh: "辣椒酱达人" },
};

/** 카테고리는 "구이/육류"처럼 조각을 "/"로 이어붙인 형태라 조각 단위로 번역한다. */
const CATEGORY_ATOMS: Record<string, Tr> = {
  반찬: { en: "Side dish", ja: "おかず", zh: "小菜" },
  구이: { en: "Grilled", ja: "焼き物", zh: "烤物" },
  육류: { en: "Meat", ja: "肉料理", zh: "肉类" },
  면류: { en: "Noodles", ja: "麺類", zh: "面食" },
  간식: { en: "Snack", ja: "軽食", zh: "小吃" },
  디저트: { en: "Dessert", ja: "デザート", zh: "甜点" },
  국: { en: "Soup", ja: "汁物", zh: "汤" },
  밥류: { en: "Rice", ja: "ご飯もの", zh: "米饭类" },
  부침: { en: "Pan-fried", ja: "焼き", zh: "煎" },
  전: { en: "Pancake", ja: "チヂミ", zh: "煎饼" },
  음료: { en: "Drink", ja: "飲み物", zh: "饮品" },
  죽: { en: "Porridge", ja: "お粥", zh: "粥" },
  해산물: { en: "Seafood", ja: "海鮮", zh: "海鲜" },
  탕: { en: "Broth", ja: "スープ（タン）", zh: "炖汤" },
  삶은: { en: "Boiled", ja: "ゆで", zh: "白煮" },
  건강식: { en: "Healthy", ja: "ヘルシー", zh: "健康餐" },
  채식: { en: "Vegetarian", ja: "ベジタリアン", zh: "素食" },
  발효: { en: "Fermented", ja: "発酵", zh: "发酵" },
  김치: { en: "Kimchi", ja: "キムチ", zh: "泡菜" },
  찜: { en: "Braised", ja: "蒸し煮", zh: "炖" },
  닭: { en: "Chicken", ja: "鶏肉", zh: "鸡肉" },
  찌개: { en: "Stew", ja: "チゲ", zh: "汤锅" },
  안주: { en: "Bar snack", ja: "おつまみ", zh: "下酒菜" },
  볶음: { en: "Stir-fried", ja: "炒め物", zh: "炒菜" },
  회: { en: "Raw", ja: "刺身", zh: "生食" },
  매운: { en: "Spicy", ja: "辛い", zh: "辣" },
  전골: { en: "Hotpot", ja: "鍋料理", zh: "火锅" },
  조림: { en: "Simmered", ja: "煮付け", zh: "红烧" },
  생선: { en: "Fish", ja: "魚", zh: "鱼" },
  체험: { en: "Experience", ja: "体験", zh: "体验" },
  장류: { en: "Sauces & pastes", ja: "醤（ジャン）", zh: "酱类" },
};

const TAGS: Record<string, Tr4> = {
  mild: { ko: "순한 맛", en: "Mild", ja: "マイルド", zh: "温和" },
  meat: { ko: "고기", en: "Meat", ja: "肉", zh: "肉类" },
  exotic_ingredient: { ko: "낯선 재료", en: "Unusual ingredients", ja: "珍しい食材", zh: "特殊食材" },
  seafood: { ko: "해산물", en: "Seafood", ja: "海鮮", zh: "海鲜" },
  fermented: { ko: "발효", en: "Fermented", ja: "発酵", zh: "发酵" },
  spicy: { ko: "매운맛", en: "Spicy", ja: "辛い", zh: "辣" },
  unusual_look: { ko: "낯선 비주얼", en: "Unusual look", ja: "見た目が独特", zh: "外观独特" },
  very_spicy: { ko: "아주 매움", en: "Very spicy", ja: "激辛", zh: "特辣" },
  strong_smell: { ko: "강한 향", en: "Strong smell", ja: "匂いが強い", zh: "气味浓烈" },
};

const KICK_QUESTION: Tr4 = {
  ko: "이 요리를 어떻게 즐겼나요?",
  en: "How did you enjoy this dish?",
  ja: "この料理をどう楽しみましたか？",
  zh: "你是怎么享用这道菜的？",
};

/** 레벨 칭호 - Firestore levels/{n}.title은 영어로 저장돼 있다. */
const LEVEL_TITLES: Record<number, Omit<Tr4, "en">> = {
  1: { ko: "호기심 많은 입문자", ja: "好奇心旺盛な入門者", zh: "好奇新手" },
  2: { ko: "길거리 음식 팬", ja: "屋台グルメファン", zh: "街头美食迷" },
  3: { ko: "동네 탐험가", ja: "ローカル探検家", zh: "本地探索者" },
  4: { ko: "매운맛 모험가", ja: "激辛アドベンチャラー", zh: "辣味冒险家" },
  5: { ko: "김치 러버", ja: "キムチ好き", zh: "泡菜爱好者" },
  6: { ko: "발효 음식 마니아", ja: "発酵フードファン", zh: "发酵美食迷" },
  7: { ko: "날것도 도전하는 용자", ja: "生もの勇者", zh: "生食勇士" },
  8: { ko: "극한 도전자", ja: "極限チャレンジャー", zh: "极限挑战者" },
  9: { ko: "홍어 영웅", ja: "ホンオの英雄", zh: "发酵鳐鱼英雄" },
  10: { ko: "한식 코스 마스터", ja: "韓食コースマスター", zh: "韩餐套餐大师" },
  11: { ko: "간장 마스터", ja: "醤油マスター", zh: "酱油大师" },
  12: { ko: "한식의 전설", ja: "韓国料理レジェンド", zh: "韩食传奇" },
};

/** 킥 선택지 (키 = Firestore에 저장된 한국어 원문) */
const KICK_OPTIONS: Record<string, Tr> = {
  // 요리 문서에 kick_options가 없을 때 쓰는 기본 선택지 (mission/kick.tsx)
  "맛": { en: "Taste", ja: "味", zh: "味道" },
  "식감": { en: "Texture", ja: "食感", zh: "口感" },
  "냄새": { en: "Aroma", ja: "香り", zh: "气味" },
  "생김새": { en: "Look", ja: "見た目", zh: "外观" },
  "케첩 찍어먹기": { en: "Dip in ketchup", ja: "ケチャップをつけて", zh: "蘸番茄酱" },
  "치즈 추가하기": { en: "Add cheese", ja: "チーズをトッピング", zh: "加奶酪" },
  "상추쌈에 마늘 올리기": { en: "Lettuce wrap with garlic", ja: "サンチュにニンニクをのせて包む", zh: "用生菜包上蒜片" },
  "국물에 밥 비벼먹기": { en: "Mix rice into the sauce", ja: "汁にご飯を混ぜて", zh: "用汤汁拌饭" },
  "다대기 넣기": { en: "Add spicy seasoning paste", ja: "ダデギ（薬味だれ）を入れる", zh: "加辣味调料" },
  "김치 곁들이기": { en: "Have it with kimchi", ja: "キムチを添えて", zh: "配泡菜" },
  "양념 소스 찍기": { en: "Dip in sweet chili sauce", ja: "ヤンニョムソースにつけて", zh: "蘸甜辣酱" },
  "무/피클 곁들이기": { en: "With pickled radish", ja: "大根ピクルスを添えて", zh: "配腌萝卜" },
  "아이스크림 곁들이기": { en: "With ice cream", ja: "アイスクリームを添えて", zh: "配冰淇淋" },
  "따뜻한 차와 함께": { en: "With warm tea", ja: "温かいお茶と一緒に", zh: "配热茶" },
  "당면 추가하기": { en: "Add glass noodles", ja: "春雨を追加", zh: "加粉条" },
  "파 듬뿍 넣기": { en: "Add lots of green onion", ja: "ネギをたっぷり", zh: "多放葱" },
  "구운김치 곁들이기": { en: "With grilled kimchi", ja: "焼きキムチを添えて", zh: "配烤泡菜" },
  "파절이와 먹기": { en: "With green onion salad", ja: "ネギサラダと一緒に", zh: "配葱丝沙拉" },
  "인절미 가루 추가": { en: "Add roasted soybean powder", ja: "きな粉を追加", zh: "加黄豆粉" },
  "연유 곁들이기": { en: "With condensed milk", ja: "練乳をかけて", zh: "配炼乳" },
  "고추장 한 스푼 더하기": { en: "Add a spoon of gochujang", ja: "コチュジャンをもうひとさじ", zh: "多加一勺辣椒酱" },
  "참기름 한 스푼 더하기": { en: "Add a spoon of sesame oil", ja: "ごま油をもうひとさじ", zh: "多加一勺香油" },
  "참기름 한스푼 더하기": { en: "Add a spoon of sesame oil", ja: "ごま油をもうひとさじ", zh: "多加一勺香油" },
  "소면 말아먹기": { en: "Add thin noodles", ja: "そうめんを入れて", zh: "加细面" },
  "깍두기 국물 넣기": { en: "Add radish kimchi juice", ja: "カクテキの汁を入れる", zh: "加萝卜块泡菜汁" },
  "양파 간장 찍기": { en: "Dip in onion soy sauce", ja: "玉ねぎ醤油につけて", zh: "蘸洋葱酱油" },
  "빠삭할때 바로 먹기": { en: "Eat it while it's crispy", ja: "カリカリのうちに食べる", zh: "趁脆吃" },
  "잣 띄워 마시기": { en: "Float pine nuts on top", ja: "松の実を浮かべて", zh: "撒上松子喝" },
  "시원하게 마시기": { en: "Drink it ice-cold", ja: "冷たくして飲む", zh: "冰镇着喝" },
  "떡볶이 국물 찍기": { en: "Dip in tteokbokki sauce", ja: "トッポッキのタレにつけて", zh: "蘸辣炒年糕酱汁" },
  "단무지와 먹기": { en: "With pickled yellow radish", ja: "たくあんと一緒に", zh: "配黄萝卜" },
  "막걸리와 함께": { en: "With makgeolli (rice wine)", ja: "マッコリと一緒に", zh: "配马格利米酒" },
  "초간장 찍기": { en: "Dip in vinegar soy sauce", ja: "酢醤油につけて", zh: "蘸醋酱油" },
  "칼국수 사리 넣기": { en: "Add knife-cut noodles", ja: "カルグクス麺を追加", zh: "加刀切面" },
  "죽으로 마무리": { en: "Finish with porridge", ja: "最後はお粥で締め", zh: "最后煮成粥" },
  "새우젓 찍기": { en: "Dip in salted shrimp", ja: "アミの塩辛につけて", zh: "蘸虾酱" },
  "보쌈김치 곁들이기": { en: "With bossam kimchi", ja: "ポッサムキムチを添えて", zh: "配包肉泡菜" },
  "청양고추 넣기": { en: "Add hot green chili", ja: "青唐辛子を入れる", zh: "加青阳辣椒" },
  "밥 말아먹기": { en: "Add rice to the soup", ja: "ご飯を入れて食べる", zh: "泡饭吃" },
  "꿀 추가하기": { en: "Add honey", ja: "はちみつを追加", zh: "加蜂蜜" },
  "한과자와 곁들이기": { en: "With Korean sweets", ja: "韓菓と一緒に", zh: "配韩果" },
  "쌈장 듬뿍 올리기": { en: "Add plenty of ssamjang", ja: "サムジャンをたっぷり", zh: "多放包饭酱" },
  "마늘 추가하기": { en: "Add garlic", ja: "ニンニクを追加", zh: "加蒜" },
  "와사비 간장 찍기": { en: "Dip in wasabi soy sauce", ja: "わさび醤油につけて", zh: "蘸芥末酱油" },
  "고추 썰어 넣기": { en: "Add sliced chili", ja: "唐辛子を刻んで入れる", zh: "加辣椒圈" },
  "국물 마시기": { en: "Drink the broth", ja: "スープを飲み干す", zh: "喝汤" },
  "오이채 곁들이기": { en: "With julienned cucumber", ja: "千切りきゅうりを添えて", zh: "配黄瓜丝" },
  "들기름 뿌리기": { en: "Drizzle perilla oil", ja: "エゴマ油をかける", zh: "淋紫苏油" },
  "비빔국수와 먹기": { en: "With spicy mixed noodles", ja: "ビビングクスと一緒に", zh: "配拌面" },
  "볶음밥으로 마무리": { en: "Finish with fried rice", ja: "最後はチャーハンで締め", zh: "最后做炒饭" },
  "계란 풀어넣기": { en: "Stir in an egg", ja: "卵を溶き入れる", zh: "打个蛋花" },
  "밥에 비벼먹기": { en: "Mix it into rice", ja: "ご飯に混ぜて", zh: "拌饭吃" },
  "청양고추 송송 썰어넣기": { en: "Add chopped hot chili", ja: "青唐辛子を刻んで入れる", zh: "加切碎的青阳辣椒" },
  "계란후라이와 함께": { en: "With a fried egg", ja: "目玉焼きと一緒に", zh: "配煎蛋" },
  "삶은 계란 올리기": { en: "Top with a boiled egg", ja: "ゆで卵をのせて", zh: "加个水煮蛋" },
  "열무김치 듬뿍": { en: "Plenty of young radish kimchi", ja: "ヨルムキムチをたっぷり", zh: "多放萝卜缨泡菜" },
  "생강절임과 함께": { en: "With pickled ginger", ja: "ガリと一緒に", zh: "配腌姜" },
  "와사비 얹어먹기": { en: "Top with wasabi", ja: "わさびをのせて", zh: "配芥末" },
  "볶음김치와 먹기": { en: "With stir-fried kimchi", ja: "炒めキムチと一緒に", zh: "配炒泡菜" },
  "구운 두부로 먹기": { en: "With pan-fried tofu", ja: "焼き豆腐で食べる", zh: "配煎豆腐" },
  "초고추장 찍기": { en: "Dip in vinegar gochujang", ja: "酢コチュジャンにつけて", zh: "蘸醋辣椒酱" },
  "간장과 와사비": { en: "Soy sauce and wasabi", ja: "醤油とわさびで", zh: "酱油加芥末" },
  "쟁반막국수와 먹기": { en: "With a buckwheat noodle platter", ja: "マッククスと一緒に", zh: "配荞麦拌面" },
  "마늘 얹어먹기": { en: "Top with garlic", ja: "ニンニクをのせて", zh: "配蒜片" },
  "보쌈김치 얹기": { en: "Top with bossam kimchi", ja: "ポッサムキムチをのせて", zh: "放上包肉泡菜" },
  "알배기 배추와": { en: "With fresh napa cabbage", ja: "白菜の若葉で包んで", zh: "配嫩白菜" },
  "밥 비벼먹기": { en: "Mix with rice", ja: "ご飯に混ぜて食べる", zh: "拌饭" },
  "비빔밥으로 먹기": { en: "Make it into bibimbap", ja: "ビビンバにして食べる", zh: "做成拌饭吃" },
  "상추에 싸먹기": { en: "Wrap in lettuce", ja: "サンチュで包んで", zh: "用生菜包着吃" },
  "상추쌈에 마늘": { en: "Lettuce wrap with garlic", ja: "サンチュにニンニクを包んで", zh: "生菜包蒜片" },
  "깻잎에 싸먹기": { en: "Wrap in perilla leaves", ja: "エゴマの葉で包んで", zh: "用紫苏叶包着吃" },
  "라면 사리 추가": { en: "Add ramen noodles", ja: "ラーメンを追加", zh: "加拉面" },
  "두부 추가하기": { en: "Add tofu", ja: "豆腐を追加", zh: "加豆腐" },
  "배와 함께 먹기": { en: "With Korean pear", ja: "梨と一緒に", zh: "配梨丝" },
  "참기름장에 찍기": { en: "Dip in sesame oil and salt", ja: "ごま油塩につけて", zh: "蘸香油盐" },
  "식초 살짝 넣기": { en: "Add a splash of vinegar", ja: "酢を少し入れる", zh: "加点醋" },
  "우동 사리 추가": { en: "Add udon noodles", ja: "うどんを追加", zh: "加乌冬面" },
  "된장 찍기": { en: "Dip in doenjang", ja: "テンジャンにつけて", zh: "蘸大酱" },
  "튀김 범벅하기": { en: "Toss with fried snacks", ja: "天ぷらを絡めて", zh: "拌炸物" },
  "참치캔 넣기": { en: "Add canned tuna", ja: "ツナ缶を入れる", zh: "加金枪鱼罐头" },
  "날계란 풀어넣기": { en: "Crack in a raw egg", ja: "生卵を落とす", zh: "打个生鸡蛋" },
  "육수 부어먹기": { en: "Pour in cold broth", ja: "冷たいスープをかけて", zh: "倒入冷汤" },
  "겨자 추가하기": { en: "Add mustard", ja: "からしを追加", zh: "加黄芥末" },
  "밥 볶아먹기": { en: "Fry rice in the leftover sauce", ja: "残りでご飯を炒める", zh: "用剩汤炒饭" },
  "무조림과 먹기": { en: "With braised radish", ja: "煮た大根と一緒に", zh: "配炖萝卜" },
  "국물에 밥 비비기": { en: "Mix rice with the sauce", ja: "煮汁にご飯を混ぜる", zh: "汤汁拌饭" },
  "수제비 사리 추가": { en: "Add hand-torn dough", ja: "スジェビを追加", zh: "加面片" },
  "들깨가루 추가": { en: "Add perilla seed powder", ja: "エゴマの粉を追加", zh: "加紫苏籽粉" },
  "라면에 넣어먹기": { en: "Add it to ramen", ja: "ラーメンに入れて", zh: "放进拉面里" },
  "참기름 듬뿍 넣기": { en: "Plenty of sesame oil", ja: "ごま油をたっぷり", zh: "多放香油" },
  "밥이랑 같이 먹기": { en: "Eat with rice", ja: "ご飯と一緒に", zh: "配米饭吃" },
  "냄새부터 느껴보기": { en: "Take in the smell first", ja: "まず香りを確かめる", zh: "先闻闻味道" },
  "들깨가루 듬뿍": { en: "Plenty of perilla powder", ja: "エゴマの粉をたっぷり", zh: "多放紫苏籽粉" },
  "다대기 듬뿍 넣기": { en: "Plenty of spicy seasoning", ja: "ダデギをたっぷり", zh: "多放辣味调料" },
  "두부 곁들이기": { en: "With tofu", ja: "豆腐を添えて", zh: "配豆腐" },
  "김가루 뿌리기": { en: "Sprinkle seaweed flakes", ja: "刻み海苔をかける", zh: "撒海苔碎" },
  "치즈/주먹밥": { en: "Cheese or rice balls", ja: "チーズ／おにぎり", zh: "奶酪／饭团" },
  "계란찜 곁들이기": { en: "With steamed egg", ja: "ケランチム（蒸し卵）を添えて", zh: "配鸡蛋羹" },
  "김가루 비벼먹기": { en: "Mix with seaweed flakes", ja: "刻み海苔を混ぜて", zh: "拌海苔碎" },
  "참기름 비벼먹기": { en: "Mix with sesame oil", ja: "ごま油を混ぜて", zh: "拌香油" },
  "초장 살짝 찍기": { en: "Dip lightly in chojang", ja: "チョジャンに軽くつけて", zh: "轻蘸醋辣酱" },
  "코스 순서대로 즐기기": { en: "Enjoy each course in order", ja: "コースの順番どおりに", zh: "按顺序享用每道菜" },
  "가장 기억에 남는 요리 골라보기": { en: "Pick your most memorable dish", ja: "一番印象的な料理を選ぶ", zh: "选出最难忘的一道" },
  "숙성 기간 비교해보기": { en: "Compare aging periods", ja: "熟成期間を比べる", zh: "比较发酵时长" },
  "향 먼저 맡아보기": { en: "Smell it first", ja: "まず香りをかぐ", zh: "先闻香气" },
  "장 종류별로 맛 비교하기": { en: "Compare each type of jang", ja: "醤の種類ごとに味比べ", zh: "比较各种酱的味道" },
  "만드는 과정 구경하기": { en: "Watch how it's made", ja: "作る過程を見学", zh: "观看制作过程" },
  "숙성 연도별 맛 비교하기": { en: "Compare by aging year", ja: "熟成年数ごとに味比べ", zh: "按年份比较味道" },
  "매운맛 단계별 비교하기": { en: "Compare spice levels", ja: "辛さの段階ごとに比べる", zh: "比较不同辣度" },
  "재료에 찍어먹어보기": { en: "Dip ingredients in it", ja: "食材につけて食べる", zh: "用食材蘸着吃" },
};

type DishLike = { id: string; name_kr: string; name_en: string };

/** 크게 보여줄 요리 이름(사용자 언어) */
export function dishName(dish: DishLike, lang: Language): string {
  if (lang === "ko") return dish.name_kr;
  if (lang === "en") return dish.name_en;
  return DISH_NAMES[dish.id]?.[lang] ?? dish.name_en;
}

/**
 * 이름 아래 작게 보여줄 보조 이름. 한국어 사용자에겐 영문명을, 외국인에겐 한글 원어를
 * 보여준다 - 실제 식당 메뉴판에서 마주칠 한글 표기를 자연스럽게 익히게 하려는 의도.
 */
export function dishSubName(dish: DishLike, lang: Language): string {
  return lang === "ko" ? dish.name_en : dish.name_kr;
}

export function categoryLabel(category: string | undefined, lang: Language): string {
  if (!category) return "";
  if (lang === "ko") return category.split("/").join(" · ");
  return category
    .split("/")
    .map((atom) => CATEGORY_ATOMS[atom.trim()]?.[lang] ?? atom)
    .join(" · ");
}

export function tagLabel(tag: string, lang: Language): string {
  return TAGS[tag]?.[lang] ?? tag;
}

export function kickQuestion(original: string | undefined, lang: Language): string {
  if (!original || original === KICK_QUESTION.ko) return KICK_QUESTION[lang];
  return original;
}

export function kickOptionLabel(option: string, lang: Language): string {
  if (lang === "ko") return option;
  return KICK_OPTIONS[option]?.[lang] ?? option;
}

export function levelTitle(level: number, storedTitle: string | undefined, lang: Language): string {
  if (lang === "en") return storedTitle ?? `Level ${level}`;
  return LEVEL_TITLES[level]?.[lang] ?? storedTitle ?? `Level ${level}`;
}

// 테스트에서 사전 커버리지를 확인하기 위해 노출
export const __content = { DISH_NAMES, CATEGORY_ATOMS, TAGS, KICK_OPTIONS, LEVEL_TITLES };
