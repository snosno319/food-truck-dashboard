<script>
    import { flip } from "svelte/animate";
    import { fade, fly } from "svelte/transition";
    import { toasts, dismissToast } from "../stores/toast.js";
</script>

<div class="toast-container">
    {#each $toasts as toast (toast.id)}
        <div
            class="toast {toast.type}"
            animate:flip
            in:fly={{ y: 20, duration: 300 }}
            out:fade={{ duration: 200 }}
        >
            <span class="message">{toast.message}</span>
            <button class="dismiss" on:click={() => dismissToast(toast.id)}
                >✕</button
            >
        </div>
    {/each}
</div>

<style>
    .toast-container {
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        flex-direction: column;
        gap: 8px;
        z-index: 9999;
        width: max-content;
        max-width: 90vw;
        pointer-events: none; /* Let clicks pass through container */
    }

    .toast {
        pointer-events: auto;
        background: var(--surface-1, white);
        color: var(--text, #333);
        padding: 12px 20px;
        border-radius: 50px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 0.9rem;
        font-weight: 500;
        border: 1px solid rgba(0, 0, 0, 0.05);
    }

    .toast.success {
        border-left: 4px solid var(--success, #00b894);
    }
    .toast.error {
        border-left: 4px solid #ff4757;
    }
    .toast.info {
        border-left: 4px solid var(--primary, #3e8ed0);
    }

    .dismiss {
        background: none;
        border: none;
        font-size: 0.8rem;
        cursor: pointer;
        opacity: 0.5;
        padding: 4px;
        margin-left: 4px;
    }

    .dismiss:hover {
        opacity: 1;
    }
</style>
