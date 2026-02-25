<script lang="ts">
  import { onMount } from 'svelte';
  import '../app.css';

  type ToastTone = 'info' | 'success' | 'error';

  interface ToastItem {
    id: number;
    message: string;
    tone: ToastTone;
  }

  interface ToastDetail {
    message?: string;
    tone?: ToastTone;
  }

  const MENU_WIDTH = 228;
  const MENU_HEIGHT = 104;
  const MENU_MARGIN = 10;
  const TOAST_DURATION_MS = 2400;

  let menuOpen = false;
  let menuX = 0;
  let menuY = 0;
  let nextToastId = 1;
  let toasts: ToastItem[] = [];
  const toastTimers = new Map<number, ReturnType<typeof setTimeout>>();

  function pushToast(message: string, tone: ToastTone = 'info'): void {
    const trimmed = message.trim();
    if (!trimmed) return;

    const id = nextToastId++;
    toasts = [...toasts, { id, message: trimmed, tone }];

    const timer = setTimeout(() => {
      toasts = toasts.filter((toast) => toast.id !== id);
      toastTimers.delete(id);
    }, TOAST_DURATION_MS);

    toastTimers.set(id, timer);
  }

  function positionMenu(clientX: number, clientY: number): void {
    const maxX = Math.max(MENU_MARGIN, window.innerWidth - MENU_WIDTH - MENU_MARGIN);
    const maxY = Math.max(MENU_MARGIN, window.innerHeight - MENU_HEIGHT - MENU_MARGIN);
    menuX = Math.min(Math.max(MENU_MARGIN, clientX), maxX);
    menuY = Math.min(Math.max(MENU_MARGIN, clientY), maxY);
  }

  function closeMenu(): void {
    menuOpen = false;
  }

  function blockEvent(event: Event): void {
    event.preventDefault();
  }

  function handleContextMenu(event: MouseEvent): void {
    event.preventDefault();
    positionMenu(event.clientX, event.clientY);
    menuOpen = true;
  }

  function handlePointerDown(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (!target?.closest('[data-macos-context-menu]')) {
      closeMenu();
    }
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      closeMenu();
      return;
    }

    if (event.ctrlKey || event.metaKey) {
      const key = event.key.toLowerCase();
      if (key === 'c' || key === 'x' || key === 'v' || key === 'a') {
        event.preventDefault();
      }
    }
  }

  async function copyCurrentUrl(): Promise<void> {
    closeMenu();
    try {
      await navigator.clipboard.writeText(window.location.href);
      pushToast('URL atual copiada.', 'success');
    } catch {
      pushToast('Não foi possível copiar a URL.', 'error');
    }
  }

  function reloadPage(): void {
    closeMenu();
    window.location.reload();
  }

  onMount(() => {
    const handleToastEvent = (event: Event): void => {
      const customEvent = event as CustomEvent<ToastDetail>;
      const message = customEvent.detail?.message ?? '';
      const tone = customEvent.detail?.tone ?? 'info';
      pushToast(message, tone);
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('copy', blockEvent);
    document.addEventListener('cut', blockEvent);
    document.addEventListener('paste', blockEvent);
    document.addEventListener('selectstart', blockEvent);
    document.addEventListener('dragstart', blockEvent);
    document.addEventListener('drop', blockEvent);
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeydown);
    window.addEventListener('certy:toast', handleToastEvent);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('copy', blockEvent);
      document.removeEventListener('cut', blockEvent);
      document.removeEventListener('paste', blockEvent);
      document.removeEventListener('selectstart', blockEvent);
      document.removeEventListener('dragstart', blockEvent);
      document.removeEventListener('drop', blockEvent);
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeydown);
      window.removeEventListener('certy:toast', handleToastEvent);
      for (const timer of toastTimers.values()) {
        clearTimeout(timer);
      }
      toastTimers.clear();
    };
  });
</script>

<slot />

{#if menuOpen}
  <div
    class="macos-context-menu"
    data-macos-context-menu
    role="menu"
    tabindex="-1"
    aria-label="Menu de contexto"
    style={`left:${menuX}px; top:${menuY}px;`}
    on:contextmenu|preventDefault|stopPropagation
  >
    <button type="button" class="macos-context-item" role="menuitem" on:click={reloadPage}>
      Recarregar página
    </button>
    <button type="button" class="macos-context-item" role="menuitem" on:click={copyCurrentUrl}>
      Copiar URL atual
    </button>
  </div>
{/if}

{#if toasts.length > 0}
  <div class="macos-toast-stack" aria-live="polite" role="status">
    {#each toasts as toast (toast.id)}
      <div class={`macos-toast macos-toast-${toast.tone}`}>{toast.message}</div>
    {/each}
  </div>
{/if}

<style>
  :global(body),
  :global(body *) {
    -webkit-user-select: none;
    user-select: none;
    -webkit-touch-callout: none;
  }

  :global(img),
  :global(a) {
    -webkit-user-drag: none;
  }

  .macos-context-menu {
    position: fixed;
    z-index: 9999;
    width: 228px;
    padding: 0.34rem;
    border-radius: 0.78rem;
    border: 1px solid rgba(45, 43, 39, 0.18);
    background: rgba(246, 244, 240, 0.92);
    backdrop-filter: blur(14px);
    box-shadow:
      0 16px 30px -20px rgba(18, 18, 18, 0.45),
      0 1px 0 rgba(255, 255, 255, 0.9) inset;
  }

  .macos-context-item {
    width: 100%;
    border: 0;
    border-radius: 0.56rem;
    background: transparent;
    color: #1f1d1a;
    text-align: left;
    font: inherit;
    font-size: 0.88rem;
    padding: 0.52rem 0.65rem;
    line-height: 1.2;
  }

  .macos-context-item:hover {
    background: #1f1d1a;
    color: #ffffff;
  }

  .macos-context-item:focus-visible {
    outline: none;
    background: #1f1d1a;
    color: #ffffff;
  }

  .macos-toast-stack {
    position: fixed;
    left: 50%;
    bottom: 1.1rem;
    transform: translateX(-50%);
    z-index: 9999;
    display: grid;
    gap: 0.5rem;
    justify-items: center;
  }

  .macos-toast {
    border-radius: 999px;
    border: 1px solid rgba(45, 43, 39, 0.18);
    background: rgba(246, 244, 240, 0.95);
    backdrop-filter: blur(12px);
    padding: 0.4rem 0.72rem;
    font-size: 0.82rem;
    color: #1f1d1a;
    box-shadow: 0 12px 24px -18px rgba(18, 18, 18, 0.45);
    max-width: min(90vw, 740px);
    text-align: center;
  }

  .macos-toast-success {
    border-color: #abd7be;
    background: rgba(236, 250, 243, 0.95);
    color: #1c5c34;
  }

  .macos-toast-error {
    border-color: #e2b5b5;
    background: rgba(253, 241, 241, 0.95);
    color: #7f2a2a;
  }
</style>
