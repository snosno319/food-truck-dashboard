/**
 * @typedef {Object} Venue
 * @property {string} id
 * @property {string} name
 * @property {string} name_en
 * @property {number} lat
 * @property {number} lng
 * @property {string} address
 * @property {string} hours
 * @property {string} source_url
 * @property {string} note
 */

/**
 * @typedef {Object} Truck
 * @property {string} id
 * @property {string} name
 * @property {string} cuisine
 * @property {string} cuisine_label
 * @property {string} contact_instagram
 * @property {boolean} accepts_preorder
 * @property {string} url
 */

/**
 * @typedef {Object} ScheduleEntry
 * @property {string} date
 * @property {string} venue_id
 * @property {string} truck_id
 */

/**
 * @typedef {Object} ScheduleData
 * @property {string} last_updated
 * @property {Venue[]} venues
 * @property {Truck[]} trucks
 * @property {ScheduleEntry[]} schedule
 */
