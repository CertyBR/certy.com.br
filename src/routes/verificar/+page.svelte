<script lang="ts">
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';
  import { checkCertificate, hasApiBaseUrl, type CertCheckPayload, type CertInfo } from '$lib/api/certy';
  import { notify } from '$lib/toast';

  let hostInput = '';
  let inputError = '';
  let isChecking = false;
  let result: CertCheckPayload | null = null;
  let checkError = '';
  let mobileNavOpen = false;

  function toggleMobileNav(): void {
    mobileNavOpen = !mobileNavOpen;
  }

  function closeMobileNav(): void {
    mobileNavOpen = false;
  }

  function normalizeHostInput(raw: string): string {
    let host = raw.trim().toLowerCase();
    host = host.replace(/^https?:\/\//i, '');
    const slashIdx = host.indexOf('/');
    if (slashIdx !== -1) host = host.slice(0, slashIdx);
    return host.replace(/\.+$/, '');
  }

  function validateInput(host: string): string {
    if (!host) return 'Informe um domínio ou URL.';
    if (host.length > 253) return 'Domínio muito longo.';
    const base = host.startsWith('*.') ? host.slice(2) : host;
    const labels = base.split('.');
    if (labels.length < 2) return 'Informe um domínio completo (ex: example.com).';
    return '';
  }

  function formatDate(iso: string | null | undefined): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  function formatSerial(serial: string): string {
    const upper = serial.toUpperCase().replace(/[^A-F0-9]/g, '');
    return upper.match(/.{1,2}/g)?.join(':') ?? serial;
  }

  function usedPercent(cert: CertInfo): number {
    const start = new Date(cert.not_before).getTime();
    const end = new Date(cert.not_after).getTime();
    const now = Date.now();
    const total = end - start;
    if (total <= 0) return 100;
    return Math.min(100, Math.max(0, Math.round(((now - start) / total) * 100)));
  }

  type StatusClass = 'valid' | 'warning' | 'critical' | 'expired' | 'unknown';

  function getStatusClass(r: CertCheckPayload | null): StatusClass {
    if (!r?.cert) return 'unknown';
    if (r.cert.is_expired) return 'expired';
    if (r.cert.days_remaining <= 14) return 'critical';
    if (r.cert.days_remaining <= 30) return 'warning';
    return 'valid';
  }

  function getStatusTitle(r: CertCheckPayload | null): string {
    if (!r) return '';
    if (!r.cert) {
      return r.site_ok
        ? 'Sem certificado SSL detectado'
        : 'Site não acessível via HTTPS';
    }
    if (r.cert.is_expired) return 'Certificado expirado';
    if (r.cert.days_remaining <= 14)
      return `Expira em ${r.cert.days_remaining} dia${r.cert.days_remaining === 1 ? '' : 's'} — atenção`;
    if (r.cert.days_remaining <= 30)
      return `Expira em ${r.cert.days_remaining} dias`;
    return 'Certificado SSL válido';
  }

  function getStatusSub(r: CertCheckPayload | null): string {
    if (!r) return '';
    if (!r.cert) {
      return r.site_error ?? 'Verifique se o domínio existe e está configurado com HTTPS.';
    }
    const issuer = r.cert.issuer_o || r.cert.issuer_cn || 'CA desconhecida';
    return `Emitido por ${issuer} · Válido até ${formatDate(r.cert.not_after)}`;
  }

  function getBarColor(cls: StatusClass): string {
    if (cls === 'valid') return 'var(--brand-green)';
    if (cls === 'warning') return '#c47a00';
    if (cls === 'critical' || cls === 'expired') return 'var(--error)';
    return 'var(--muted)';
  }

  const SANS_PREVIEW = 5;
  let sansExpanded = false;
  $: result, (sansExpanded = false);

  async function handleCheck(): Promise<void> {
    const normalized = normalizeHostInput(hostInput);
    const error = validateInput(normalized);

    if (error) {
      inputError = error;
      return;
    }

    if (!hasApiBaseUrl()) {
      notify('Serviço temporariamente indisponível. Tente novamente em instantes.', 'error');
      return;
    }

    inputError = '';
    isChecking = true;
    result = null;
    checkError = '';

    if (browser) {
      const url = new URL(window.location.href);
      url.searchParams.set('host', normalized);
      window.history.replaceState(null, '', url.toString());
    }

    try {
      result = await checkCertificate(normalized);
    } catch (err) {
      checkError = err instanceof Error ? err.message : 'Erro ao verificar certificado.';
      notify(checkError, 'error');
    } finally {
      isChecking = false;
    }
  }

  onMount(() => {
    const query = new URLSearchParams(window.location.search);
    const hostFromQuery = query.get('host')?.trim();
    if (hostFromQuery) {
      hostInput = hostFromQuery;
      void handleCheck();
    }
  });

  $: statusClass = getStatusClass(result);
  $: statusTitle = getStatusTitle(result);
  $: statusSub = getStatusSub(result);
  $: barColor = getBarColor(statusClass);
</script>

<main class="shell">
  <header class="site-header" data-reveal>
    <a class="brand" href="/">certy</a>
    <button
      type="button"
      class="nav-toggle"
      aria-label={mobileNavOpen ? 'Fechar menu' : 'Abrir menu'}
      aria-expanded={mobileNavOpen}
      on:click={toggleMobileNav}
    >
      <span></span>
      <span></span>
      <span></span>
    </button>
    <nav class="links" class:links-open={mobileNavOpen}>
      <a href="/" on:click={closeMobileNav}>Início</a>
      <a href="/emitir" on:click={closeMobileNav}>Emitir SSL</a>
      <a href="/termos" on:click={closeMobileNav}>Termos</a>
    </nav>
  </header>

  <section class="stack issuer" data-reveal style="animation-delay: 120ms">
    <h1 class="section-title session-page-title">Verificar Certificado SSL</h1>
    <p class="issuer-lead">
      Informe um domínio ou URL para analisar o certificado SSL ativo, validade, emissor e domínios
      cobertos com base nos logs de transparência de certificados.
    </p>

    <form class="issue-form" on:submit|preventDefault={handleCheck}>
      <label class="field">
        <span>Domínio ou URL</span>
        <input
          type="text"
          bind:value={hostInput}
          on:blur={() => {
            const n = normalizeHostInput(hostInput);
            if (hostInput && n) hostInput = n;
            inputError = hostInput ? validateInput(normalizeHostInput(hostInput)) : '';
          }}
          placeholder="example.com ou https://example.com"
          autocomplete="off"
          autocapitalize="none"
          spellcheck="false"
          required
        />
        {#if inputError}
          <small class="field-error">{inputError}</small>
        {/if}
      </label>

      <div class="actions">
        <button class="btn btn-primary" type="submit" disabled={isChecking}>
          {#if isChecking}
            <svg class="spin-icon" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="9" stroke-dasharray="28 56" />
            </svg>
            Verificando...
          {:else}
            Verificar certificado
          {/if}
        </button>
      </div>
    </form>
  </section>

  {#if result}
    <section class="stack cert-status-banner cert-status-{statusClass}" data-reveal>
      <div class="cert-status-inner">
        <span class="cert-status-icon" aria-hidden="true">
          {#if statusClass === 'valid'}
            <svg viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="9" />
              <path d="M8 12l3 3 5-5" />
            </svg>
          {:else if statusClass === 'warning'}
            <svg viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5.5M12 16.5h.01" />
            </svg>
          {:else if statusClass === 'critical' || statusClass === 'expired'}
            <svg viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="9" />
              <path d="M9 9l6 6M15 9l-6 6" />
            </svg>
          {:else}
            <svg viewBox="0 0 24 24">
              <path d="M12 2l8 4v6c0 5-4 9-8 10C8 21 4 17 4 12V6z" />
              <path d="M12 8v4.5M12 16.5h.01" />
            </svg>
          {/if}
        </span>
        <div class="cert-status-text">
          <p class="cert-status-title">{statusTitle}</p>
          <p class="cert-status-sub">{statusSub}</p>
        </div>
      </div>
    </section>

    {#if result.cert}
      <section class="stack" data-reveal style="animation-delay: 60ms">
        <article class="session-card">
          <h2 class="panel-title">Validade do Certificado</h2>

          <div class="cert-bar-wrap">
            <div
              class="cert-bar"
              style="width:{usedPercent(result.cert)}%; background:{barColor}"
            ></div>
          </div>
          <div class="cert-bar-labels">
            <span>{formatDate(result.cert.not_before)}</span>
            <span class="cert-days-badge" data-status={statusClass}>
              {#if result.cert.is_expired}
                Expirado há {Math.abs(result.cert.days_remaining)} dias
              {:else}
                {result.cert.days_remaining} dias restantes
              {/if}
            </span>
            <span>{formatDate(result.cert.not_after)}</span>
          </div>

          <div class="cert-meta-grid">
            <div class="cert-meta-item">
              <span class="cert-meta-label">Emissor</span>
              <span class="cert-meta-value">{result.cert.issuer_o || result.cert.issuer_cn || '—'}</span>
            </div>
            <div class="cert-meta-item">
              <span class="cert-meta-label">CN (Common Name)</span>
              <span class="cert-meta-value"><code>{result.cert.common_name}</code></span>
            </div>
            <div class="cert-meta-item">
              <span class="cert-meta-label">Válido de</span>
              <span class="cert-meta-value">{formatDate(result.cert.not_before)}</span>
            </div>
            <div class="cert-meta-item">
              <span class="cert-meta-label">Válido até</span>
              <span class="cert-meta-value">{formatDate(result.cert.not_after)}</span>
            </div>
            <div class="cert-meta-item cert-meta-item-wide">
              <span class="cert-meta-label">Número de série</span>
              <span class="cert-meta-value cert-serial">
                <code>{formatSerial(result.cert.serial)}</code>
              </span>
            </div>
            <div class="cert-meta-item">
              <span class="cert-meta-label">Tipo</span>
              <span class="cert-meta-value">
                {result.cert.is_wildcard ? 'Wildcard (*.domínio)' : 'Domínio específico'}
              </span>
            </div>
            <div class="cert-meta-item cert-meta-item-wide">
              <span class="cert-meta-label">Cadeia do emissor (DN)</span>
              <span class="cert-meta-value cert-dn-value">
                <code>{result.cert.issuer}</code>
              </span>
            </div>
          </div>
        </article>

        {#if result.cert.sans.length > 0}
          <article class="session-card">
            <h2 class="panel-title">
              Domínios Cobertos
              <span class="cert-count-badge">{result.cert.sans.length}</span>
            </h2>
            <div class="san-pills">
              {#each (sansExpanded ? result.cert.sans : result.cert.sans.slice(0, SANS_PREVIEW)) as san}
                <code class="san-pill" class:san-pill-wildcard={san.startsWith('*.')}>{san}</code>
              {/each}
            </div>
            {#if result.cert.sans.length > SANS_PREVIEW}
              <button
                class="btn btn-ghost san-toggle-btn"
                type="button"
                on:click={() => (sansExpanded = !sansExpanded)}
              >
                {sansExpanded
                  ? 'Ver menos'
                  : `Ver todos (${result.cert.sans.length - SANS_PREVIEW} ocultos)`}
              </button>
            {/if}
          </article>
        {/if}

        <article class="session-card">
          <h2 class="panel-title">Status e Histórico</h2>
          <div class="cert-meta-grid">
            <div class="cert-meta-item">
              <span class="cert-meta-label">HTTPS acessível</span>
              <span class="cert-meta-value">
                <span class="status-pill" data-status={result.site_ok ? 'issued' : 'failed'}>
                  {result.site_ok ? 'Sim' : 'Não'}
                </span>
              </span>
            </div>
            {#if result.redirects_to}
              <div class="cert-meta-item">
                <span class="cert-meta-label">Redireciona para</span>
                <span class="cert-meta-value cert-redirect-value">{result.redirects_to}</span>
              </div>
            {/if}
            {#if result.site_error && !result.site_ok}
              <div class="cert-meta-item">
                <span class="cert-meta-label">Erro de acesso</span>
                <span class="cert-meta-value cert-error-text">{result.site_error}</span>
              </div>
            {/if}
          </div>

          <div class="actions" style="margin-top: 1rem">
            <a
              class="btn btn-ghost"
              href="https://crt.sh/?q={encodeURIComponent(result.host)}"
              target="_blank"
              rel="noreferrer"
            >
              Ver histórico no crt.sh
            </a>
            <button
              class="btn btn-ghost"
              type="button"
              on:click={() => {
                hostInput = result?.host ?? hostInput;
                void handleCheck();
              }}
              disabled={isChecking}
            >
              {isChecking ? 'Verificando...' : 'Reverificar'}
            </button>
          </div>
        </article>
      </section>
    {:else}
      <section class="stack" data-reveal style="animation-delay: 60ms">
        <article class="session-card">
          <h2 class="panel-title">Status de Acesso</h2>
          <div class="cert-meta-grid">
            <div class="cert-meta-item">
              <span class="cert-meta-label">HTTPS acessível</span>
              <span class="cert-meta-value">
                <span class="status-pill" data-status={result.site_ok ? 'issued' : 'failed'}>
                  {result.site_ok ? 'Sim' : 'Não'}
                </span>
              </span>
            </div>
            {#if result.site_error}
              <div class="cert-meta-item">
                <span class="cert-meta-label">Detalhe</span>
                <span class="cert-meta-value cert-error-text">{result.site_error}</span>
              </div>
            {/if}
          </div>
          <div class="actions" style="margin-top: 1rem">
            <button
              class="btn btn-primary"
              type="button"
              on:click={() => void handleCheck()}
              disabled={isChecking}
            >
              {isChecking ? 'Verificando...' : 'Tentar novamente'}
            </button>
            <a class="btn btn-ghost" href="/">Emitir SSL gratuito</a>
          </div>
        </article>
      </section>
    {/if}
  {/if}

  {#if !result && checkError}
    <section class="stack" data-reveal>
      <article class="panel">
        <p class="flash flash-error" style="margin:0">{checkError}</p>
        <div class="actions" style="margin-top: 0.8rem">
          <button
            class="btn btn-primary"
            type="button"
            on:click={() => void handleCheck()}
            disabled={isChecking}
          >
            Tentar novamente
          </button>
        </div>
      </article>
    </section>
  {/if}

  <footer class="site-footer" data-reveal style="animation-delay: 260ms">
    <span>© {new Date().getFullYear()} Certy</span>
    <span class="footer-links">
      <a href="/termos">Termos</a>
      <span>•</span>
      <a href="/">Emitir SSL</a>
      <span>•</span>
      <a href="https://crt.sh" target="_blank" rel="noreferrer">crt.sh</a>
    </span>
  </footer>
</main>

<style>
  /* Status banner */
  .cert-status-banner {
    border: 1px solid var(--surface-border);
    border-radius: 1.15rem;
    padding: 1rem 1.25rem;
    background: var(--surface-glass);
    backdrop-filter: blur(var(--glass-blur));
    margin-bottom: 0;
  }

  .cert-status-inner {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .cert-status-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 3rem;
    height: 3rem;
    border-radius: 50%;
    flex-shrink: 0;
    background: color-mix(in srgb, var(--muted) 12%, transparent);
  }

  .cert-status-icon svg {
    width: 1.45rem;
    height: 1.45rem;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.7;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .cert-status-text {
    min-width: 0;
  }

  .cert-status-title {
    margin: 0 0 0.18rem;
    font-size: 1.05rem;
    font-weight: 600;
    color: var(--ink);
  }

  .cert-status-sub {
    margin: 0;
    font-size: 0.88rem;
    color: var(--muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* Status variants */
  .cert-status-valid {
    border-color: var(--status-issued-border);
    background:
      linear-gradient(135deg, var(--status-issued-bg), transparent 55%),
      var(--surface-glass);
  }

  .cert-status-valid .cert-status-icon {
    background: var(--status-issued-bg);
    color: var(--brand-green);
  }

  .cert-status-warning {
    border-color: var(--status-pending-border);
    background:
      linear-gradient(135deg, var(--status-pending-bg), transparent 55%),
      var(--surface-glass);
  }

  .cert-status-warning .cert-status-icon {
    background: var(--status-pending-bg);
    color: #b06a00;
  }

  .cert-status-critical {
    border-color: var(--status-failed-border);
    background:
      linear-gradient(135deg, color-mix(in srgb, var(--status-failed-bg) 50%, transparent), transparent 55%),
      var(--surface-glass);
  }

  .cert-status-critical .cert-status-icon {
    background: var(--status-failed-bg);
    color: var(--error);
  }

  .cert-status-expired {
    border-color: var(--status-failed-border);
    background:
      linear-gradient(135deg, var(--status-failed-bg), transparent 55%),
      var(--surface-glass);
  }

  .cert-status-expired .cert-status-icon {
    background: var(--status-failed-bg);
    color: var(--error);
  }

  .cert-status-unknown {
    border-color: var(--line);
  }

  /* Expiry progress bar */
  .cert-bar-wrap {
    height: 5px;
    border-radius: 999px;
    background: var(--line);
    margin: 1rem 0 0.4rem;
    overflow: hidden;
  }

  .cert-bar {
    height: 100%;
    border-radius: 999px;
  }

  .cert-bar-labels {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.78rem;
    color: var(--muted);
    margin: 0 0 0.9rem;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .cert-days-badge {
    padding: 0.14rem 0.55rem;
    border-radius: 999px;
    border: 1px solid var(--line);
    font-size: 0.74rem;
    background: var(--surface-glass-strong);
    white-space: nowrap;
    flex: 0 0 auto;
  }

  .cert-days-badge[data-status='valid'] {
    border-color: var(--status-issued-border);
    background: var(--status-issued-bg);
  }

  .cert-days-badge[data-status='warning'] {
    border-color: var(--status-pending-border);
    background: var(--status-pending-bg);
  }

  .cert-days-badge[data-status='critical'],
  .cert-days-badge[data-status='expired'] {
    border-color: var(--status-failed-border);
    background: var(--status-failed-bg);
  }

  /* Metadata grid */
  .cert-meta-grid {
    display: grid;
    gap: 0.75rem 1rem;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  }

  .cert-meta-item {
    display: flex;
    flex-direction: column;
    gap: 0.18rem;
    min-width: 0;
  }

  .cert-meta-item-wide {
    grid-column: 1 / -1;
  }

  .cert-meta-label {
    font-size: 0.74rem;
    color: var(--muted);
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .cert-meta-value {
    font-size: 0.9rem;
    color: var(--ink);
    word-break: break-word;
  }

  .cert-serial code {
    font-size: 0.78rem;
    letter-spacing: 0.02em;
    word-break: break-all;
  }

  .cert-dn-value code {
    font-size: 0.78rem;
    word-break: break-all;
    line-height: 1.5;
  }

  .cert-redirect-value {
    word-break: break-all;
    font-size: 0.85rem;
  }

  .cert-error-text {
    color: var(--error-soft);
  }

  /* SAN pills */
  .cert-count-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin-left: 0.45rem;
    padding: 0.1rem 0.45rem;
    border-radius: 999px;
    border: 1px solid var(--line);
    background: var(--surface-glass-strong);
    font-size: 0.74rem;
    font-family: 'Sora', sans-serif;
    font-weight: 500;
    vertical-align: middle;
  }

  .san-pills {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    margin-top: 0.75rem;
  }

  .san-toggle-btn {
    margin-top: 0.75rem;
    min-width: 0;
    width: auto;
    font-size: 0.82rem;
    min-height: 2.1rem;
    padding: 0 0.8rem;
  }

  .san-pill {
    display: inline-flex;
    align-items: center;
    padding: 0.24rem 0.6rem;
    border-radius: 0.6rem;
    border: 1px solid var(--line);
    background: var(--code-bg);
    font-size: 0.8rem;
    color: var(--ink);
    word-break: break-all;
  }

  .san-pill-wildcard {
    border-color: var(--brand-green-soft);
    background: color-mix(in srgb, var(--brand-green-soft) 40%, var(--code-bg));
  }

  /* Spin animation for loading */
  .spin-icon {
    width: 1em;
    height: 1em;
    display: inline-block;
    fill: none;
    stroke: currentColor;
    stroke-width: 2.2;
    stroke-linecap: round;
    animation: spin 0.9s linear infinite;
    flex-shrink: 0;
    vertical-align: middle;
    margin-top: -0.1em;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  /* Mobile */
  @media (max-width: 760px) {
    .cert-status-inner {
      gap: 0.75rem;
    }

    .cert-status-icon {
      width: 2.5rem;
      height: 2.5rem;
    }

    .cert-status-title {
      font-size: 0.97rem;
    }

    .cert-status-sub {
      white-space: normal;
    }

    .cert-meta-grid {
      grid-template-columns: 1fr;
    }

    .cert-bar-labels {
      flex-direction: column;
      align-items: flex-start;
    }

    .cert-days-badge {
      order: 0;
    }
  }

  @media (max-width: 480px) {
    .cert-status-banner {
      padding: 0.9rem;
    }

    .san-pill {
      font-size: 0.76rem;
      padding: 0.2rem 0.5rem;
    }
  }
</style>
