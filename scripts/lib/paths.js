/**
 * Shared path constants for all scraper scripts.
 * Centralizes file path resolution to avoid duplication.
 */
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const SCRIPTS_DIR = join(__dirname, '..');
export const ROOT_DIR = join(SCRIPTS_DIR, '..');
export const DATA_DIR = join(ROOT_DIR, 'static', 'data');
export const TRUCKS_PATH = join(DATA_DIR, 'trucks.json');
export const SCHEDULE_PATH = join(DATA_DIR, 'schedule.json');
