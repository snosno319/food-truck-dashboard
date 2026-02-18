/**
 * Scraper configuration: venue registry with URLs and parser assignments.
 */

export const VENUES = {
    kawabata: {
        id: 'kawabata',
        url: 'https://otemachi-foodgarden.com/list/',
        parser: 'kawabata'
    },
    'otemachi-place': {
        id: 'otemachi-place',
        url: 'https://www.mellow.jp/ss_web/markets/G7TyQW',
        parser: 'mellow'
    },
    'otemachi-park': {
        id: 'otemachi-park',
        url: 'https://www.mellow.jp/ss_web/markets/xVTjJY',
        parser: 'mellow'
    },
    'marunouchi-trust': {
        id: 'marunouchi-trust',
        url: 'https://www.mellow.jp/ss_web/markets/8bTX0',
        parser: 'mellow'
    },
    'tokyo-torch-tower': {
        id: 'tokyo-torch-tower',
        url: 'https://www.mellow.jp/ss_web/markets/KqT2DZ',
        parser: 'mellow'
    },
    'tokyo-torch-park': {
        id: 'tokyo-torch-park',
        url: 'https://www.mellow.jp/ss_web/markets/VWTQ8',
        parser: 'mellow'
    },
    sankei: {
        id: 'sankei',
        url: 'https://www.w-tokyodo.com/neostall/space/lunch/?lunch=%E6%9D%B1%E4%BA%AC%E3%82%B5%E3%83%B3%E3%82%B1%E3%82%A4%E3%83%93%E3%83%AB%20%E3%83%8D%E3%82%AA%E5%B1%8B%E5%8F%B0%E6%9D%91',
        parser: 'neo-yatai'
    }
};

/**
 * Request options for all scrapers.
 */
export const FETCH_OPTIONS = {
    headers: {
        'User-Agent': 'OtemachiEats-Scraper/1.0 (+https://github.com/user/food-truck-dashboard)',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'ja,en;q=0.5'
    }
};
