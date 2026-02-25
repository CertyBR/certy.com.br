<script lang="ts">
  import { page } from '$app/stores';
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

  interface RouteSeoMeta {
    title: string;
    description: string;
    robots?: string;
    ogType?: 'website' | 'article';
  }

  const MENU_WIDTH = 228;
  const MENU_HEIGHT = 104;
  const MENU_MARGIN = 10;
  const TOAST_DURATION_MS = 2400;
  const THEME_STORAGE_KEY = 'certy-theme';
  const LIGHT_THEME_COLOR = '#f8f5ef';
  const DARK_THEME_COLOR = '#0d1210';
  const SITE_NAME = 'Certy';
  const SITE_URL = 'https://certy.com.br';
  const SITE_LOCALE = 'pt_BR';
  const DEFAULT_OG_IMAGE_URL = `${SITE_URL}/og/certy-og.svg`;
  const DEFAULT_OG_IMAGE_ALT = 'Certy - Certificados SSL gratuitos via Let\'s Encrypt';
  const ROUTE_TITLES: Record<string, string> = {
    '/': 'Início',
    '/emitir': 'Acompanhar Sessão',
    '/termos': 'Termos de Uso e Privacidade'
  };
  const ROUTE_SEO: Record<string, RouteSeoMeta> = {
    '/': {
      title: 'SSL gratuito com Let\'s Encrypt',
      description:
        'Certy emite certificados SSL gratuitos com validação DNS, sem cadastro e com fluxo simples.'
    },
    '/emitir': {
      title: 'Acompanhar Sessão',
      description:
        'Acompanhe a validação DNS e finalize a emissão do certificado SSL da sua sessão.',
      robots: 'noindex, nofollow'
    },
    '/termos': {
      title: 'Termos de Uso e Privacidade',
      description: 'Termos de Uso e Política de Privacidade do Certy.'
    }
  };

  let menuOpen = false;
  let menuX = 0;
  let menuY = 0;
  let nextToastId = 1;
  let toasts: ToastItem[] = [];
  const toastTimers = new Map<number, ReturnType<typeof setTimeout>>();
  let pageTitle = 'Certy';
  let pageDescription = 'Certificados SSL gratuitos com validação DNS.';
  let pageRobots = 'index, follow';
  let pageOgType: 'website' | 'article' = 'website';
  let canonicalUrl = SITE_URL;
  let pageStatus = 200;
  let themeColorMeta = LIGHT_THEME_COLOR;
  let themeMode: 'light' | 'dark' = 'light';

  function prettifyRouteSegment(segment: string): string {
    const normalized = segment.replace(/[-_]+/g, ' ').trim();
    if (!normalized) return 'Página';
    return `${normalized.charAt(0).toUpperCase()}${normalized.slice(1)}`;
  }

  $: {
    const pathname = $page.url.pathname;
    const normalizedStatus = typeof $page.status === 'number' && $page.status > 0 ? $page.status : 200;
    const isErrorPage = normalizedStatus >= 400;
    pageStatus = normalizedStatus;
    canonicalUrl = `${SITE_URL}${pathname || '/'}`;

    if (isErrorPage) {
      pageTitle = normalizedStatus === 404 ? 'Not Found' : `Error ${normalizedStatus}`;
      pageDescription =
        normalizedStatus === 404
          ? 'A página solicitada não foi encontrada.'
          : 'Ocorreu um erro ao carregar esta página.';
      pageRobots = 'noindex, nofollow';
      pageOgType = 'website';
    } else {
      const routeMeta = ROUTE_SEO[pathname];
      if (routeMeta) {
        pageTitle = `${routeMeta.title} | ${SITE_NAME}`;
        pageDescription = routeMeta.description;
        pageRobots = routeMeta.robots ?? 'index, follow';
        pageOgType = routeMeta.ogType ?? 'website';
      } else {
        const mappedTitle = ROUTE_TITLES[pathname];
        if (mappedTitle) {
          pageTitle = `${mappedTitle} | ${SITE_NAME}`;
          pageDescription = 'Conteúdo oficial do Certy.';
          pageRobots = 'index, follow';
          pageOgType = 'website';
        } else {
          const segments = pathname.split('/').filter(Boolean);
          const lastSegment = segments[segments.length - 1] ?? '';
          const dynamicTitle = prettifyRouteSegment(decodeURIComponent(lastSegment));
          pageTitle = `${dynamicTitle} | ${SITE_NAME}`;
          pageDescription = 'Conteúdo oficial do Certy.';
          pageRobots = 'index, follow';
          pageOgType = 'website';
        }
      }
    }
  }

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

  function setTheme(mode: 'light' | 'dark', persist = true): void {
    themeMode = mode;
    themeColorMeta = mode === 'dark' ? DARK_THEME_COLOR : LIGHT_THEME_COLOR;
    document.documentElement.setAttribute('data-theme', mode);

    if (persist) {
      window.localStorage.setItem(THEME_STORAGE_KEY, mode);
    }
  }

  function toggleTheme(): void {
    const nextMode = themeMode === 'dark' ? 'light' : 'dark';
    setTheme(nextMode, true);
    pushToast(nextMode === 'dark' ? 'Tema escuro ativado.' : 'Tema claro ativado.', 'info');
  }

  onMount(() => {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    const systemThemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const initialTheme =
      storedTheme === 'light' || storedTheme === 'dark'
        ? (storedTheme as 'light' | 'dark')
        : systemThemeQuery.matches
          ? 'dark'
          : 'light';

    setTheme(initialTheme, false);

    const handleSystemThemeChange = (event: MediaQueryListEvent): void => {
      const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme === 'light' || savedTheme === 'dark') {
        return;
      }
      setTheme(event.matches ? 'dark' : 'light', false);
    };

    if (typeof systemThemeQuery.addEventListener === 'function') {
      systemThemeQuery.addEventListener('change', handleSystemThemeChange);
    } else {
      systemThemeQuery.addListener(handleSystemThemeChange);
    }

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

      if (typeof systemThemeQuery.removeEventListener === 'function') {
        systemThemeQuery.removeEventListener('change', handleSystemThemeChange);
      } else {
        systemThemeQuery.removeListener(handleSystemThemeChange);
      }

      for (const timer of toastTimers.values()) {
        clearTimeout(timer);
      }
      toastTimers.clear();
    };
  });
</script>

<svelte:head>
  <title>{pageTitle}</title>
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <link rel="shortcut icon" href="/favicon.svg" type="image/svg+xml" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
  <meta name="description" content={pageDescription} />
  <meta name="robots" content={pageRobots} />
  <meta name="referrer" content="strict-origin-when-cross-origin" />
  <meta name="theme-color" content={themeColorMeta} />
  <link rel="canonical" href={canonicalUrl} />
  <link rel="alternate" hreflang="pt-BR" href={canonicalUrl} />

  <meta property="og:type" content={pageOgType} />
  <meta property="og:site_name" content={SITE_NAME} />
  <meta property="og:locale" content={SITE_LOCALE} />
  <meta property="og:title" content={pageTitle} />
  <meta property="og:description" content={pageDescription} />
  <meta property="og:url" content={canonicalUrl} />
  <meta property="og:image" content={DEFAULT_OG_IMAGE_URL} />
  <meta property="og:image:type" content="image/svg+xml" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content={DEFAULT_OG_IMAGE_ALT} />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={pageTitle} />
  <meta name="twitter:description" content={pageDescription} />
  <meta name="twitter:image" content={DEFAULT_OG_IMAGE_URL} />
  <meta name="twitter:image:alt" content={DEFAULT_OG_IMAGE_ALT} />

  {#if pageStatus >= 400}
    <meta name="googlebot" content="noindex, nofollow" />
  {/if}
</svelte:head>

<slot />

<button
  class="theme-toggle"
  type="button"
  on:click={toggleTheme}
  aria-label={themeMode === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}
  aria-pressed={themeMode === 'dark'}
>
  <span class="theme-toggle-icon" aria-hidden="true">
    {#if themeMode === 'dark'}
      <svg viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="4.6"></circle>
        <path d="M12 2.6v2.5M12 18.9v2.5M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M2.6 12h2.5M18.9 12h2.5M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"></path>
      </svg>
    {:else}
      <svg viewBox="0 0 24 24">
        <path d="M14.6 3.2a8.9 8.9 0 1 0 6.2 14.9a9.4 9.4 0 1 1-6.2-14.9z"></path>
      </svg>
    {/if}
  </span>
  <span>{themeMode === 'dark' ? 'Tema claro' : 'Tema escuro'}</span>
</button>

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
    border: 1px solid var(--context-border);
    background: var(--context-bg);
    backdrop-filter: blur(14px);
    box-shadow: 0 16px 30px -20px rgba(6, 14, 9, 0.56);
  }

  .macos-context-item {
    width: 100%;
    border: 0;
    border-radius: 0.56rem;
    background: transparent;
    color: var(--context-text);
    text-align: left;
    font: inherit;
    font-size: 0.88rem;
    padding: 0.52rem 0.65rem;
    line-height: 1.2;
  }

  .macos-context-item:hover {
    background: var(--context-hover-bg);
    color: var(--context-hover-text);
  }

  .macos-context-item:focus-visible {
    outline: none;
    background: var(--context-hover-bg);
    color: var(--context-hover-text);
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
    border: 1px solid var(--toast-border);
    background: var(--toast-bg);
    backdrop-filter: blur(12px);
    padding: 0.4rem 0.72rem;
    font-size: 0.82rem;
    color: var(--toast-text);
    box-shadow: 0 12px 24px -18px rgba(6, 12, 8, 0.58);
    max-width: min(90vw, 740px);
    text-align: center;
  }

  .macos-toast-success {
    border-color: var(--toast-success-border);
    background: var(--toast-success-bg);
    color: var(--toast-success-text);
  }

  .macos-toast-error {
    border-color: var(--toast-error-border);
    background: var(--toast-error-bg);
    color: var(--toast-error-text);
  }

  .theme-toggle {
    position: fixed;
    right: 1rem;
    bottom: 1rem;
    z-index: 9998;
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    border: 1px solid var(--surface-border);
    border-radius: 999px;
    background: var(--surface-glass-strong);
    backdrop-filter: blur(var(--glass-blur));
    color: var(--ink);
    min-height: 2.4rem;
    padding: 0 0.8rem;
    font: inherit;
    font-size: 0.82rem;
    box-shadow: 0 14px 24px -20px rgba(2, 68, 32, 0.5);
    transition:
      border-color 220ms ease,
      box-shadow 220ms ease;
  }

  .theme-toggle:hover {
    border-color: var(--brand-green);
    box-shadow: 0 16px 28px -20px rgba(4, 124, 56, 0.65);
  }

  .theme-toggle:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px var(--focus-ring);
  }

  .theme-toggle-icon {
    width: 1rem;
    height: 1rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    line-height: 0;
  }

  .theme-toggle-icon svg {
    width: 1rem;
    height: 1rem;
    display: block;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.8;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  @media (max-width: 760px) {
    .theme-toggle {
      right: 0.72rem;
      bottom: 0.72rem;
      min-height: 2.25rem;
      font-size: 0.78rem;
      padding: 0 0.72rem;
    }
  }
</style>
