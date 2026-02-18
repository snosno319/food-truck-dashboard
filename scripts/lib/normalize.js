/**
 * Truck name normalization and matching utilities.
 */

/**
 * Manual alias mappings for trucks whose scraped names differ
 * significantly from the master data (e.g., JP vs EN names).
 * Key: normalized scraped name → Value: truck ID in trucks.json
 */
const ALIASES = {
    // Kawabata — site uses Japanese names, trucks.json has English
    'キッチンあがいてぃーら': 'kitchen-agaityla',
    'グリルキッチンbesideu': 'beside-u',
    'レオ ストリート キッチン': 'leo-street',
    'レオストリートキッチン': 'leo-street',
    'lino marama cafe': 'lino-marama',
    // Neo Yatai — name variations
    'mikaバインミー': 'mika-banhmi',
    '東京ricordo': 'ricordo',
    '+spice': 'plus-spice',
    '蓮 ren': 'ren',
    '和tokyo': 'wa-tokyo',
    '台湾佐記麺線': 'taiwan-saki',
    'mr.chicken★torihanten': 'mr-chicken',
    'mr.chicken torihanten': 'mr-chicken',
    'mr.chicken': 'mr-chicken',
    'ボナペティ': 'bonappetit',
    'bt massaru': 'bt-massaru',
    // Mellow — scraped names include menu items, so use substring matching
    // These are for exact matches where substring won't work
    'kusina personal by an': 'kusina',
    'anne&may': 'anne-may',
    'サンドリヨン': 'sandoriyon',
    'アイランド': 'island',
    '鳳': 'otori',
    'まま事屋': 'mamagoto',
    'senor coppe': 'senor-coppe',
    'señor coppe': 'senor-coppe',
    'cucina daino': 'daino',
    'smile tokyo': 'smile-tokyo',
    'ラハイナテーブル': 'lahaina',
    '西京屋 周': 'saikyoya',
    '西京屋　周': 'saikyoya',
    '祥福堂': 'shofukudo',
    'churrascaria que bom!': 'quebom',
    // Kawabata — newly discovered trucks
    '長崎屋': 'nagasakiya',
    'ジュリーズスパイス': 'julies-spice',
    'ごっさむ': 'gossam',
    'アジアンフード': 'asian-food',
    'ミラーン': 'millan',
    'ビストロカルロス': 'bistro-carlos',
    'パパガヤデリ': 'papagaya-deli',
    '鳳唐揚げ弁当': 'otori',
    // Marunouchi Trust City trucks
    'parlor zono': 'parlor-zono',
    'island kitchen': 'island-kitchen',
    '食堂新': 'shokudo-shin',
    'caffe latte': 'caffe-latte',
    'box lunch casa': 'box-lunch-casa',
    'キッチンカーたこみーと': 'tacomeat',
    'grace lei': 'grace-lei',
    'keiki beach 83': 'keiki-beach',
    // TOKYO TORCH & Otemachi Park trucks (Mellow names include menu items)
    '韓美味': 'truck-1771400426440',
    'たこみーと': 'truck-1771400426441',
    'mr.chicken 鶏飯店': 'mrchicken',
    "18's kitchen & market": '18s-kitchen-market',
    'ここにぎり': 'truck-1771400426442',
    'dandy lion kitchen': 'dandy-lion-kitchen',
    'ふくの鳥': '48-484',
    'dublin 7 food truck': 'dublin-7-food-truck',
    'wellvide': 'wellvide',
    'okilab': 'okilab',
    'おきらぼ': 'okilab',
    'むら川': 'truck-1771400426443',
    '2nd base': '2nd-base',
    'おばんざいバル つむぎ': 'truck-1771400426444',
    'おばんざいバル': 'truck-1771400426444',
    '早稲田ゴールデン': 'truck-1771400426445',
    'chopi rich': 'chopi-rich',
    "waka's kitchen": 'wakas-kitchen',
    "waka's  kitchen": 'wakas-kitchen',
    'mogu mogu stand': 'mogu-mogu-stand',
    'burn.': 'burn',
    'mos burger kitchen car': 'mos5050th-mos',
    'mos50': 'mos5050th-mos',
    'モスのキッチンカー「mos50一号車」': 'mos5050th-mos',
    'まごころkitchen ととちゃん': 'kitchen',
    'ぞうさん食堂': 'truck-1771400426447',
    // Newly discovered trucks
    '海鮮ボンクラージュ': 'truck-1771418341566',
    'kuokoa': 'kuokoa',
    'カーニャパッソ': 'truck-1771418341569',
    'ピエニ キッサ': 'truck-1771405545500',
};

/**
 * Normalize a truck name for comparison.
 * Strips whitespace, normalizes unicode, lowercases.
 * @param {string} raw
 * @returns {string}
 */
export function normalizeName(raw) {
    return raw
        // Normalize unicode (fullwidth → halfwidth, etc.)
        .normalize('NFKC')
        // Remove special decorative characters
        .replace(/[★☆♪♫❤️🌟✨]/g, '')
        // Collapse whitespace
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
}

/**
 * Generate a URL-safe slug ID from a truck name.
 * @param {string} name - Raw truck name
 * @returns {string} Slug like "mr-chicken"
 */
export function generateId(name) {
    return normalizeName(name)
        // Remove Japanese characters for the slug (keep them in name)
        .replace(/[^\w\s-]/g, '')
        // Replace spaces with hyphens
        .replace(/\s+/g, '-')
        // Collapse multiple hyphens
        .replace(/-+/g, '-')
        // Trim leading/trailing hyphens
        .replace(/^-|-$/g, '')
        // Fallback: if empty (all Japanese), romanize minimally
        || `truck-${Date.now()}`;
}

/**
 * Find a matching truck in the existing trucks list by name.
 * Uses normalized comparison with fuzzy matching.
 * @param {string} rawName - Raw scraped truck name
 * @param {Array<{id: string, name: string}>} existingTrucks
 * @returns {{id: string, name: string}|null} Matched truck or null
 */
export function findMatch(rawName, existingTrucks) {
    const normalized = normalizeName(rawName);

    // 0. Check manual alias table first
    const aliasId = ALIASES[normalized];
    if (aliasId) {
        const aliased = existingTrucks.find(t => t.id === aliasId);
        if (aliased) return aliased;
    }

    // 1. Exact normalized match
    for (const truck of existingTrucks) {
        if (normalizeName(truck.name) === normalized) {
            return truck;
        }
    }

    // 2. Substring match: scraped name contains or is contained by existing name
    //    Only match if the shorter string is at least 4 chars (avoid false positives)
    for (const truck of existingTrucks) {
        const existingNorm = normalizeName(truck.name);
        const shorter = normalized.length < existingNorm.length ? normalized : existingNorm;
        if (shorter.length >= 4) {
            if (normalized.includes(existingNorm) || existingNorm.includes(normalized)) {
                return truck;
            }
        }
    }

    // 3. ID-based match: the generated slug matches an existing ID
    const slug = generateId(rawName);
    for (const truck of existingTrucks) {
        if (truck.id === slug) {
            return truck;
        }
    }

    return null;
}

/**
 * Cuisine detection keywords, ordered from most specific to most generic.
 * First match wins, so specific ethnic cuisines come before broad categories.
 * Avoid overly generic words (kitchen, lunch, cafe) that cause false positives.
 */
const CUISINE_KEYWORDS = [
    // Specific ethnic cuisines first
    { key: 'hawaiian', label: 'ハワイアン', keywords: ['hawaii', 'poke', 'loco', 'ポキ', 'ロコモコ', 'aloha'] },
    { key: 'kebab', label: 'ケバブ', keywords: ['kebab', 'ケバブ', 'ハラル', 'halal', 'ファラフェル', 'falafel'] },
    { key: 'korean', label: '韓国料理', keywords: ['korea', 'bibimbap', 'pocha', '韓国', 'ビビンバ', 'ポチャ', 'チヂミ', 'k-food', '韓美味'] },
    { key: 'vietnamese', label: 'ベトナム', keywords: ['vietnam', 'banh mi', 'pho', 'ベトナム', 'バインミー', 'フォー'] },
    { key: 'okinawan', label: '沖縄料理', keywords: ['okinawa', 'taco', 'spam', '沖縄', 'タコライス'] },
    { key: 'chinese', label: '中華', keywords: ['chinese', 'gyoza', 'dimsum', '中華', '餃子', '麻婆', '炒飯', '魯肉飯'] },
    { key: 'italian', label: 'イタリアン', keywords: ['pizza', 'pasta', 'lasagna', 'italian', 'ピザ', 'パスタ', 'ラザニア', 'イタリアン', 'sicil'] },
    // Protein-focused
    { key: 'chicken', label: 'チキン', keywords: ['chicken', 'チキン', '唐揚', 'からあげ', 'ロティサリー', 'rotisserie', '鷄', '照り焼きチキン', 'テリヤキチキン'] },
    { key: 'curry', label: 'カレー', keywords: ['curry', 'カレー', 'インド', 'ビリヤニ', 'biryani', 'スパイスカレー', 'カリー'] },
    { key: 'meat', label: '肉料理', keywords: ['beef', 'meat', 'steak', 'hamburg', 'shalasco', 'que bom', 'lamb', 'pork', '肉', 'ステーキ', 'ハンバーグ', 'シュラスコ', '牛', '焼肉', 'boucherie', 'ローストポーク', '豚', 'ホルモン'] },
    // Broad Asian (after specific ones so Korean/Vietnamese/Chinese match first)
    { key: 'asian', label: 'アジアン', keywords: ['asian', 'thai', 'gapao', 'nasi', 'adobo', 'taiwan', 'アジアン', 'タイ', 'ガパオ', 'ナシゴレン', 'アドボ', '台湾', 'ルーロー', 'ナンロール', 'ナン', 'スパイス'] },
    // Food types
    { key: 'bread', label: 'パン', keywords: ['bread', 'sandwich', 'hotdog', 'burger', 'パン', 'サンド', 'バーガー', 'ドッグ', 'coppe', 'ホットドッグ', 'ホットドック', 'スラッピージョー'] },
    { key: 'japanese', label: '和食', keywords: ['japanese', 'sushi', 'tempura', '和食', '寿司', '丼', '天ぷら', 'うどん', 'そば', '鰻', '西京', '魚', 'かつ丼', 'カツ', 'やきそば', '焼きそば', 'おばんざい', 'にぎり'] },
    { key: 'sweets', label: 'スイーツ', keywords: ['crepe', 'sweets', 'coffee', 'クレープ', 'スイーツ', 'カフェ', 'crakey'] },
    // Most generic — only matches if nothing else did
    { key: 'western', label: '洋食', keywords: ['western', 'omurice', 'bistro', '洋食', 'オムライス'] },
];

/**
 * Attempt to detect cuisine from truck name and optional extra text
 * (e.g., description + menu items from the truck's detail page).
 * @param {string} name - Truck name
 * @param {string} [extraText=''] - Extra text (description, menu items) for better detection
 * @returns {{cuisine: string, cuisine_label: string}}
 */
export function detectCuisine(name, extraText = '') {
    const combined = normalizeName(name + ' ' + extraText);

    for (const category of CUISINE_KEYWORDS) {
        for (const keyword of category.keywords) {
            if (combined.includes(keyword)) {
                return { cuisine: category.key, cuisine_label: category.label };
            }
        }
    }

    return { cuisine: 'unknown', cuisine_label: '?' };
}

/**
 * Create a placeholder truck entry for a newly discovered truck.
 * @param {string} rawName - Raw scraped name
 * @returns {import('../../src/lib/types.js').Truck}
 */
export function createPlaceholder(rawName, extraText = '') {
    const { cuisine, cuisine_label } = detectCuisine(rawName, extraText);
    return {
        id: generateId(rawName),
        name: rawName.trim(),
        cuisine,
        cuisine_label,
        contact_instagram: '',
        accepts_preorder: false,
        url: ''
    };
}
