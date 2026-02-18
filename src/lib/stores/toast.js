import { writable } from 'svelte/store';

/** @typedef {{id: number, message: string, type: string}} Toast */
/** @type {import('svelte/store').Writable<Toast[]>} */
export const toasts = writable([]);

let id = 0;

export function addToast(message, type = 'info', duration = 3000) {
    const toastId = id++;
    toasts.update(all => [...all, { id: toastId, message, type }]);

    if (duration) {
        setTimeout(() => {
            dismissToast(toastId);
        }, duration);
    }
}

export function dismissToast(id) {
    toasts.update(all => all.filter(t => t.id !== id));
}
