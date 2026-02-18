/**
 * Shared cuisine icon/color mapping used across all components.
 * Single source of truth for visual representation of cuisines.
 */

/** @type {Record<string, {emoji: string, bg: string, text: string, gradient: string}>} */
export const CUISINE_MAP = {
	meat: { emoji: '🥩', bg: '#fef0f0', text: '#c0392b', gradient: 'linear-gradient(135deg, #FF9A9E 0%, #FECFEF 100%)' },
	chicken: { emoji: '🍗', bg: '#fff8e1', text: '#e67e22', gradient: 'linear-gradient(135deg, #F6D365 0%, #FDA085 100%)' },
	japanese: { emoji: '🍱', bg: '#f0f4ff', text: '#2c3e8c', gradient: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)' },
	hawaiian: { emoji: '🌺', bg: '#e8f8f5', text: '#1abc9c', gradient: 'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)' },
	asian: { emoji: '🍜', bg: '#fdf2e9', text: '#d35400', gradient: 'linear-gradient(135deg, #ffc3a0 0%, #ffafbd 100%)' },
	curry: { emoji: '🍛', bg: '#fff3cd', text: '#856404', gradient: 'linear-gradient(135deg, #fccb90 0%, #d57eeb 100%)' },
	korean: { emoji: '🥘', bg: '#fce4ec', text: '#c62828', gradient: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 99%, #fecfef 100%)' },
	italian: { emoji: '🍝', bg: '#e8f5e9', text: '#2e7d32', gradient: 'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)' },
	western: { emoji: '🍳', bg: '#ede7f6', text: '#5e35b1', gradient: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)' },
	okinawan: { emoji: '🌴', bg: '#e0f7fa', text: '#00838f', gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
	kebab: { emoji: '🥙', bg: '#fff8e1', text: '#bf360c', gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' },
	bento: { emoji: '🍙', bg: '#f3e5f5', text: '#7b1fa2', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
	bread: { emoji: '🥖', bg: '#fbe9e7', text: '#a1887f', gradient: 'linear-gradient(135deg, #d299c2 0%, #fef9d7 100%)' },
	chinese: { emoji: '🥟', bg: '#fff0f0', text: '#d32f2f', gradient: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)' },
	vietnamese: { emoji: '🥢', bg: '#f1f8e9', text: '#558b2f', gradient: 'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)' },
	sweets: { emoji: '🍰', bg: '#fff0f5', text: '#e91e63', gradient: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)' },
	unknown: { emoji: '🚚', bg: '#f5f5f5', text: '#9e9e9e', gradient: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)' },
};

/**
 * Get cuisine display info for a truck.
 * @param {string} cuisineKey - e.g. 'meat', 'japanese'
 * @returns {{emoji: string, bg: string, text: string, gradient: string}}
 */
export function getCuisine(cuisineKey) {
	return CUISINE_MAP[cuisineKey] || CUISINE_MAP.unknown;
}
