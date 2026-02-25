<script lang="ts">
  import { browser } from '$app/environment';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import {
    finalizeCertificateSession,
    getCertificateSession,
    hasApiBaseUrl,
    type DnsRecord,
    type SessionPayload,
    type SessionStatus
  } from '$lib/api/certy';
  import { notify } from '$lib/toast';

  interface SessionView {
    session_id: string;
    status: SessionStatus;
    domain: string;
    email: string;
    dns_records: DnsRecord[];
    created_at: number | null;
    updated_at: number | null;
    expires_at: number | null;
    last_error: string | null;
    certificate_pem: string | null;
    private_key_pem: string | null;
  }

  interface RefreshOptions {
    silent?: boolean;
  }

  const statusLabels: Record<SessionStatus, string> = {
    pending_dns: 'Aguardando DNS',
    validating: 'Validando',
    issued: 'Emitido',
    failed: 'Falhou',
    expired: 'Expirado'
  };

  let session: SessionView | null = null;
  let sessionId = '';
  let isLoadingSession = false;
  let isRefreshing = false;
  let isFinalizing = false;

  function redirectToHome(): void {
    if (!browser) return;
    void goto('/', { replaceState: true });
  }

  onMount(() => {
    if (!hasApiBaseUrl()) {
      notify('Serviço temporariamente indisponível. Tente novamente em instantes.', 'error');
      return;
    }

    const query = new URLSearchParams(window.location.search);
    const sessionFromQuery = query.get('session')?.trim() ?? '';
    if (!sessionFromQuery) {
      redirectToHome();
      return;
    }

    sessionId = sessionFromQuery;
    isLoadingSession = true;
    void refreshSession(sessionFromQuery, { silent: true });
  });

  function statusLabel(status: SessionStatus | string | null | undefined): string {
    if (!status) return 'desconhecido';
    if (status in statusLabels) {
      return statusLabels[status as SessionStatus];
    }
    return status;
  }

  function asStringError(error: unknown): string {
    if (error instanceof Error) return error.message;
    return 'Erro inesperado.';
  }

  function isSessionNotFoundError(error: unknown): boolean {
    const message = asStringError(error).toLowerCase();
    return (
      message.includes('sessão não encontrada') ||
      message.includes('sessao não encontrada') ||
      message.includes('sessao nao encontrada') ||
      message.includes('session not found') ||
      message.includes('erro 404') ||
      message.includes('error 404')
    );
  }

  function formatUnixTimestamp(unix: number | null | undefined): string {
    if (!unix) return '-';
    return new Date(unix * 1000).toLocaleString('pt-BR');
  }

  function buildSessionLink(): string {
    if (!browser || !sessionId) return '';
    return `${window.location.origin}/emitir?session=${sessionId}`;
  }

  function payloadValue<K extends keyof SessionView>(
    payload: SessionPayload,
    key: K,
    fallback: SessionView[K]
  ): SessionView[K] {
    if (key in payload) {
      return payload[key as keyof SessionPayload] as SessionView[K];
    }
    return fallback;
  }

  function mergeSession(payload: SessionPayload | null | undefined): void {
    if (!payload) return;

    const previousError = session?.last_error ?? null;

    session = {
      session_id: payloadValue(payload, 'session_id', session?.session_id ?? sessionId ?? ''),
      status: payloadValue(payload, 'status', session?.status ?? 'pending_dns'),
      domain: payloadValue(payload, 'domain', session?.domain ?? ''),
      email: payloadValue(payload, 'email', session?.email ?? ''),
      dns_records: payloadValue(payload, 'dns_records', session?.dns_records ?? []),
      created_at: payloadValue(payload, 'created_at', session?.created_at ?? null),
      updated_at: payloadValue(payload, 'updated_at', session?.updated_at ?? null),
      expires_at: payloadValue(payload, 'expires_at', session?.expires_at ?? null),
      last_error: payloadValue(payload, 'last_error', session?.last_error ?? null),
      certificate_pem: payloadValue(payload, 'certificate_pem', session?.certificate_pem ?? null),
      private_key_pem: payloadValue(payload, 'private_key_pem', session?.private_key_pem ?? null)
    };

    sessionId = session.session_id || sessionId;

    if (session.last_error && session.last_error !== previousError) {
      notify(session.last_error, 'error');
    }

    if (browser && sessionId) {
      const url = new URL(window.location.href);
      url.searchParams.set('session', sessionId);
      window.history.replaceState(null, '', url.toString());
    }
  }

  function clearSessionState(): void {
    session = null;
    sessionId = '';
    isLoadingSession = false;

    if (browser) {
      const url = new URL(window.location.href);
      url.searchParams.delete('session');
      window.history.replaceState(null, '', `${url.pathname}${url.search}`);
    }
  }

  async function refreshSession(
    targetSessionId: string = sessionId,
    options: RefreshOptions = {}
  ): Promise<void> {
    const { silent = false } = options;

    if (!targetSessionId) {
      redirectToHome();
      return;
    }

    isRefreshing = true;

    try {
      const payload = await getCertificateSession(targetSessionId);
      mergeSession(payload);
      if (!silent) {
        notify('Sessão atualizada com sucesso.', 'success');
      }
    } catch (error) {
      if (isSessionNotFoundError(error)) {
        clearSessionState();
        redirectToHome();
        return;
      }

      if (!silent) {
        notify(asStringError(error), 'error');
      }
    } finally {
      isRefreshing = false;
      isLoadingSession = false;
    }
  }

  async function handleFinalizeSession(): Promise<void> {
    if (!sessionId) {
      notify('Crie uma nova sessão para continuar.', 'error');
      return;
    }

    isFinalizing = true;

    try {
      const payload = await finalizeCertificateSession(sessionId);
      mergeSession(payload);

      if (payload?.status === 'issued') {
        notify('Certificado emitido com sucesso.', 'success');
      } else {
        notify(payload?.message ?? 'Finalização solicitada.', 'info');
      }

      if (payload?.status !== 'issued') {
        await refreshSession(sessionId, { silent: true });
      }
    } catch (error) {
      if (isSessionNotFoundError(error)) {
        clearSessionState();
        redirectToHome();
        return;
      }

      notify(asStringError(error), 'error');
    } finally {
      isFinalizing = false;
    }
  }

  async function copyText(value: string | null | undefined, label: string): Promise<void> {
    if (!browser || !value) return;

    try {
      await navigator.clipboard.writeText(value);
      notify(`${label} copiado com sucesso.`, 'success');
    } catch {
      notify(`Não foi possível copiar ${label.toLowerCase()}.`, 'error');
    }
  }
</script>

<main class="shell">
  <header class="site-header" data-reveal>
    <a class="brand" href="/">certy</a>
    <nav class="links">
      <a href="/">Início</a>
      <a href="/">FAQ</a>
      <a href="/termos">Termos</a>
    </nav>
  </header>

  <section class="stack issuer" data-reveal style="animation-delay: 120ms">
    <h1 class="section-title session-page-title">Acompanhar Sessão</h1>
    <p class="issuer-lead">
      Esta página é dedicada aos passos da emissão. Atualize o status, valide o DNS e copie seus
      arquivos quando o certificado for emitido.
    </p>

    {#if isLoadingSession && !session}
      <article class="session-mode">
        <p>Carregando sessão...</p>
      </article>
    {/if}

    {#if session}
      <article class="session-card">
        <div class="session-meta">
          <p><strong>Domínio:</strong> {session.domain}</p>
          <p><strong>E-mail:</strong> {session.email}</p>
          <p>
            <strong>Status:</strong>
            <span class="status-pill" data-status={session.status}>{statusLabel(session.status)}</span>
          </p>
          <p><strong>Criado em:</strong> {formatUnixTimestamp(session.created_at)}</p>
          <p><strong>Expira em:</strong> {formatUnixTimestamp(session.expires_at)}</p>
        </div>

        <div class="actions">
          <button
            class="btn btn-primary"
            type="button"
            on:click={handleFinalizeSession}
            disabled={isFinalizing || !sessionId || session.status === 'issued'}
          >
            {isFinalizing ? 'Finalizando...' : 'Validar DNS e emitir'}
          </button>

          <button
            class="btn btn-ghost"
            type="button"
            on:click={() => refreshSession()}
            disabled={isRefreshing}
          >
            {isRefreshing ? 'Atualizando...' : 'Atualizar sessão'}
          </button>

          <button
            class="btn btn-ghost"
            type="button"
            on:click={() => copyText(buildSessionLink(), 'Link da sessão')}
            disabled={!sessionId}
          >
            Copiar link da sessão
          </button>

          <a class="btn btn-ghost" href="/">Nova emissão</a>
        </div>

        <div class="dns-grid">
          {#each session.dns_records ?? [] as record, index}
            <article class="dns-card">
              <p class="dns-title">Registro DNS #{index + 1}</p>
              <p><strong>Tipo:</strong> {record.type ?? record.record_type ?? 'TXT'}</p>
              <p class="dns-row">
                <strong>Nome:</strong>
                <span class="dns-inline-value">
                  <code>{record.name}</code>
                  <button
                    class="copy-icon-btn"
                    type="button"
                    title="Copiar nome"
                    aria-label="Copiar nome DNS"
                    on:click={() => copyText(record.name, 'Nome DNS')}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        d="M9 9h10v10H9zM5 5h10v2H7v8H5z"
                        fill="none"
                        stroke="currentColor"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="1.6"
                      />
                    </svg>
                  </button>
                </span>
              </p>
              <p class="dns-row">
                <strong>Valor:</strong>
                <span class="dns-inline-value">
                  <code>{record.value}</code>
                  <button
                    class="copy-icon-btn"
                    type="button"
                    title="Copiar valor"
                    aria-label="Copiar valor DNS"
                    on:click={() => copyText(record.value, 'Valor DNS')}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        d="M9 9h10v10H9zM5 5h10v2H7v8H5z"
                        fill="none"
                        stroke="currentColor"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="1.6"
                      />
                    </svg>
                  </button>
                </span>
              </p>
            </article>
          {/each}
        </div>

        {#if session.certificate_pem}
          <article class="pem-card">
            <div class="pem-header">
              <h3>Certificado (PEM)</h3>
              <button
                class="btn btn-ghost"
                type="button"
                on:click={() => copyText(session?.certificate_pem, 'Certificado PEM')}
              >
                Copiar certificado
              </button>
            </div>
            <pre>{session.certificate_pem}</pre>
          </article>
        {/if}

        {#if session.private_key_pem}
          <article class="pem-card">
            <div class="pem-header">
              <h3>Chave Privada (PEM)</h3>
              <button
                class="btn btn-ghost"
                type="button"
                on:click={() => copyText(session?.private_key_pem, 'Chave privada PEM')}
              >
                Copiar chave privada
              </button>
            </div>
            <pre>{session.private_key_pem}</pre>
          </article>
        {/if}
      </article>
    {/if}
  </section>
</main>
