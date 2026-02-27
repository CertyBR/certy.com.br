<script lang="ts">
  import { browser } from '$app/environment';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import {
    checkCertificateDns,
    finalizeCertificateSession,
    getCertificateSession,
    hasApiBaseUrl,
    resendEmailVerificationCode,
    verifyEmailCode,
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
    email_verified_at: number | null;
    email_verification_expires_at: number | null;
    email_verification_last_sent_at: number | null;
    email_verification_attempts: number;
    email_verification_resend_count: number;
  }

  interface RefreshOptions {
    silent?: boolean;
  }

  const statusLabels: Record<SessionStatus, string> = {
    awaiting_email_verification: 'Verificar e-mail',
    pending_dns: 'Aguardando DNS',
    validating: 'Validando na CA',
    issued: 'Emitido',
    failed: 'Falhou',
    expired: 'Expirado'
  };
  const EMAIL_RESEND_LIMIT = 3;
  const EMAIL_RESEND_INTERVAL_SECONDS = 10 * 60;

  let session: SessionView | null = null;
  let sessionId = '';
  let isLoadingSession = false;
  let isRefreshing = false;
  let isVerifyingCode = false;
  let isResendingCode = false;
  let isCheckingDns = false;
  let isFinalizing = false;
  let emailCode = '';
  let nowMs = Date.now();
  let mobileNavOpen = false;

  function toggleMobileNav(): void {
    mobileNavOpen = !mobileNavOpen;
  }

  function closeMobileNav(): void {
    mobileNavOpen = false;
  }

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

    const timer = window.setInterval(() => {
      nowMs = Date.now();
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
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

  function formatRemainingFromUnix(unix: number | null | undefined): string {
    if (!unix) return '-';
    const diffMs = unix * 1000 - nowMs;
    if (diffMs <= 0) return 'Expirado';

    const totalSeconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
  }

  function getResendCooldownRemainingSeconds(currentSession: SessionView | null): number {
    if (!currentSession?.email_verification_last_sent_at) return 0;
    const availableAtMs =
      (currentSession.email_verification_last_sent_at + EMAIL_RESEND_INTERVAL_SECONDS) * 1000;
    return Math.max(0, Math.ceil((availableAtMs - nowMs) / 1000));
  }

  function formatRemainingFromSeconds(totalSeconds: number): string {
    if (totalSeconds <= 0) return '0m 00s';
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
  }

  function getRemainingResendAttempts(currentSession: SessionView | null): number {
    const used = currentSession?.email_verification_resend_count ?? 0;
    return Math.max(0, EMAIL_RESEND_LIMIT - used);
  }

  function canResendCode(currentSession: SessionView | null): boolean {
    if (!currentSession) return false;
    if (getRemainingResendAttempts(currentSession) <= 0) return false;
    if (getResendCooldownRemainingSeconds(currentSession) > 0) return false;
    return true;
  }

  function buildSessionLink(): string {
    if (!browser || !sessionId) return '';
    return `${window.location.origin}/emitir?session=${sessionId}`;
  }

  function normalizeCodeInput(raw: string): string {
    return raw.replace(/\D/g, '').slice(0, 6);
  }

  function sanitizeDomainForFilename(domain: string | null | undefined): string {
    if (!domain) return 'certy';
    const base = domain
      .toLowerCase()
      .replace(/^\*\./, 'wildcard-')
      .replace(/[^a-z0-9.-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    return base || 'certy';
  }

  function downloadTextFile(contents: string, filename: string): void {
    if (!browser || !contents.trim()) return;

    const blob = new Blob([contents], { type: 'application/x-pem-file;charset=utf-8' });
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = filename;
    anchor.rel = 'noopener';
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(objectUrl);
  }

  function downloadCertificatePem(): void {
    if (!session?.certificate_pem) return;
    const domain = sanitizeDomainForFilename(session.domain);
    downloadTextFile(session.certificate_pem, `${domain}-cert.pem`);
    notify('Certificado baixado.', 'success');
  }

  function downloadPrivateKeyPem(): void {
    if (!session?.private_key_pem) return;
    const domain = sanitizeDomainForFilename(session.domain);
    downloadTextFile(session.private_key_pem, `${domain}-key.pem`);
    notify('Chave privada baixada.', 'success');
  }

  function downloadCombinedPem(): void {
    if (!session?.certificate_pem || !session?.private_key_pem) return;
    const domain = sanitizeDomainForFilename(session.domain);
    const combinedPem = `${session.certificate_pem.trim()}\n\n${session.private_key_pem.trim()}\n`;
    downloadTextFile(combinedPem, `${domain}-cert-key.pem`);
    notify('Arquivo combinado baixado.', 'success');
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
      status: payloadValue(
        payload,
        'status',
        session?.status ?? 'awaiting_email_verification'
      ),
      domain: payloadValue(payload, 'domain', session?.domain ?? ''),
      email: payloadValue(payload, 'email', session?.email ?? ''),
      dns_records: payloadValue(payload, 'dns_records', session?.dns_records ?? []),
      created_at: payloadValue(payload, 'created_at', session?.created_at ?? null),
      updated_at: payloadValue(payload, 'updated_at', session?.updated_at ?? null),
      expires_at: payloadValue(payload, 'expires_at', session?.expires_at ?? null),
      last_error: payloadValue(payload, 'last_error', session?.last_error ?? null),
      certificate_pem: payloadValue(payload, 'certificate_pem', session?.certificate_pem ?? null),
      private_key_pem: payloadValue(payload, 'private_key_pem', session?.private_key_pem ?? null),
      email_verified_at: payloadValue(
        payload,
        'email_verified_at',
        session?.email_verified_at ?? null
      ),
      email_verification_expires_at: payloadValue(
        payload,
        'email_verification_expires_at',
        session?.email_verification_expires_at ?? null
      ),
      email_verification_last_sent_at: payloadValue(
        payload,
        'email_verification_last_sent_at',
        session?.email_verification_last_sent_at ?? null
      ),
      email_verification_attempts: payloadValue(
        payload,
        'email_verification_attempts',
        session?.email_verification_attempts ?? 0
      ),
      email_verification_resend_count: payloadValue(
        payload,
        'email_verification_resend_count',
        session?.email_verification_resend_count ?? 0
      )
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

  async function handleResendCode(): Promise<void> {
    if (!sessionId) return;
    if (!canResendCode(session)) {
      const remainingAttempts = getRemainingResendAttempts(session);
      const cooldownRemaining = getResendCooldownRemainingSeconds(session);
      if (remainingAttempts <= 0) {
        notify('Limite de reenvios atingido. Inicie uma nova sessão.', 'error');
      } else if (cooldownRemaining > 0) {
        notify(
          `Aguarde ${formatRemainingFromSeconds(cooldownRemaining)} para reenviar outro código.`,
          'info'
        );
      }
      return;
    }

    isResendingCode = true;

    try {
      const payload = await resendEmailVerificationCode(sessionId);
      notify(payload?.message ?? 'Novo código enviado.', 'success');
      await refreshSession(sessionId, { silent: true });
    } catch (error) {
      if (isSessionNotFoundError(error)) {
        clearSessionState();
        redirectToHome();
        return;
      }
      notify(asStringError(error), 'error');
    } finally {
      isResendingCode = false;
    }
  }

  async function handleVerifyEmailCode(): Promise<void> {
    if (!sessionId) return;

    emailCode = normalizeCodeInput(emailCode);
    if (emailCode.length !== 6) {
      notify('Informe o código de 6 dígitos enviado no e-mail.', 'error');
      return;
    }

    isVerifyingCode = true;

    try {
      const payload = await verifyEmailCode(sessionId, { code: emailCode });
      mergeSession(payload);
      emailCode = '';
      notify(payload?.message ?? 'E-mail verificado com sucesso.', 'success');
    } catch (error) {
      if (isSessionNotFoundError(error)) {
        clearSessionState();
        redirectToHome();
        return;
      }
      notify(asStringError(error), 'error');
    } finally {
      isVerifyingCode = false;
    }
  }

  async function runFinalizeFlow(): Promise<void> {
    if (!sessionId) return;

    isCheckingDns = true;

    try {
      const dnsCheck = await checkCertificateDns(sessionId);
      notify(dnsCheck.message, dnsCheck.dns_ready ? 'success' : 'info');

      if (!dnsCheck.dns_ready) {
        if (dnsCheck.missing_records.length > 0) {
          notify(
            `Ainda faltam ${dnsCheck.missing_records.length} registro(s) DNS propagarem.`,
            'info'
          );
        }
        await refreshSession(sessionId, { silent: true });
        return;
      }

      isFinalizing = true;
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
      isCheckingDns = false;
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
      <a href="/#faq" on:click={closeMobileNav}>FAQ</a>
      <a href="/termos" on:click={closeMobileNav}>Termos</a>
    </nav>
  </header>

  <section class="stack issuer" data-reveal style="animation-delay: 120ms">
    <h1 class="section-title session-page-title">Acompanhar Sessão</h1>
    <p class="issuer-lead">
      Emissão em etapas: valide o e-mail, configure o DNS e só então o Certy envia para a CA emitir
      seu certificado.
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
      </article>

      {#if session.status === 'awaiting_email_verification'}
        <article class="session-card">
          <h2 class="panel-title">1. Verificar e-mail</h2>
          <p class="issuer-lead">
            Enviamos um código para <strong>{session.email}</strong>. Digite os 6 dígitos para
            liberar a etapa de DNS.
          </p>

          <label class="field" for="email-verification-code">
            <span>Código de verificação</span>
            <input
              id="email-verification-code"
              type="text"
              inputmode="numeric"
              maxlength="6"
              placeholder="000000"
              value={emailCode}
              on:input={(event) => {
                const target = event.currentTarget as HTMLInputElement;
                emailCode = normalizeCodeInput(target.value);
              }}
            />
            <small class="field-hint">
              Expira em: {formatRemainingFromUnix(session.email_verification_expires_at)}
            </small>
          </label>

          <div class="actions">
            <button
              class="btn btn-primary"
              type="button"
              on:click={handleVerifyEmailCode}
              disabled={isVerifyingCode}
            >
              {isVerifyingCode ? 'Validando...' : 'Validar código'}
            </button>

            <button
              class="btn btn-ghost"
              type="button"
              on:click={handleResendCode}
              disabled={isResendingCode || !canResendCode(session)}
            >
              {#if isResendingCode}
                Reenviando...
              {:else if getRemainingResendAttempts(session) <= 0}
                Limite de reenvio atingido
              {:else if getResendCooldownRemainingSeconds(session) > 0}
                Reenviar em {formatRemainingFromSeconds(getResendCooldownRemainingSeconds(session))}
              {:else}
                Reenviar código
              {/if}
            </button>

            <button
              class="btn btn-ghost"
              type="button"
              on:click={() => refreshSession()}
              disabled={isRefreshing}
            >
              {isRefreshing ? 'Atualizando...' : 'Atualizar sessão'}
            </button>

            <a class="btn btn-ghost" href="/">Nova emissão</a>
          </div>
        </article>
      {:else if session.status === 'pending_dns'}
        <article class="session-card">
          <h2 class="panel-title">2. Configurar DNS</h2>
          <p class="issuer-lead">
            Adicione os registros abaixo no DNS do domínio e use o botão para pré-validar. Se tudo
            estiver ok, a emissão na CA será iniciada automaticamente.
          </p>

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

          <div class="actions">
            <button
              class="btn btn-primary"
              type="button"
              on:click={runFinalizeFlow}
              disabled={isCheckingDns || isFinalizing}
            >
              {isCheckingDns || isFinalizing ? 'Verificando...' : 'Verificar DNS e emitir'}
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
            >
              Copiar link da sessão
            </button>

            <a class="btn btn-ghost" href="/">Nova emissão</a>
          </div>
        </article>
      {:else if session.status === 'validating'}
        <article class="session-card">
          <h2 class="panel-title">3. Validando com a CA</h2>
          <p class="issuer-lead">
            O pedido foi enviado para o Let's Encrypt. Aguarde alguns instantes e atualize esta
            sessão.
          </p>

          <div class="actions">
            <button
              class="btn btn-primary"
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
            >
              Copiar link da sessão
            </button>

            <a class="btn btn-ghost" href="/">Nova emissão</a>
          </div>
        </article>
      {:else if session.status === 'issued'}
        <article class="session-card">
          <h2 class="panel-title">4. Certificado emitido</h2>
          <p class="flash flash-info">
            Aviso de segurança: certificado e chave privada são exibidos apenas agora. Eles não foram
            armazenados pelo Certy e não poderão ser exibidos novamente.
          </p>

          <div class="pem-action-row">
            <button
              class="copy-icon-btn"
              type="button"
              title="Baixar certificado + chave"
              aria-label="Baixar certificado e chave em um único arquivo"
              on:click={downloadCombinedPem}
              disabled={!session.certificate_pem || !session.private_key_pem}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M12 4v9m0 0l-3.5-3.5M12 13l3.5-3.5M5 16.5v2.5h14v-2.5"
                  fill="none"
                  stroke="currentColor"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="1.6"
                />
              </svg>
            </button>
            <span class="field-hint">Baixar arquivo combinado (.pem)</span>
          </div>

          {#if session.certificate_pem}
            <article class="pem-card">
              <div class="pem-header">
                <h3>Certificado (PEM)</h3>
                <div class="icon-actions">
                  <button
                    class="copy-icon-btn"
                    type="button"
                    title="Copiar certificado"
                    aria-label="Copiar certificado PEM"
                    on:click={() => copyText(session?.certificate_pem, 'Certificado PEM')}
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
                  <button
                    class="copy-icon-btn"
                    type="button"
                    title="Baixar certificado"
                    aria-label="Baixar certificado PEM"
                    on:click={downloadCertificatePem}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        d="M12 4v9m0 0l-3.5-3.5M12 13l3.5-3.5M5 16.5v2.5h14v-2.5"
                        fill="none"
                        stroke="currentColor"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="1.6"
                      />
                    </svg>
                  </button>
                </div>
              </div>
              <pre>{session.certificate_pem}</pre>
            </article>
          {/if}

          {#if session.private_key_pem}
            <article class="pem-card">
              <div class="pem-header">
                <h3>Chave Privada (PEM)</h3>
                <div class="icon-actions">
                  <button
                    class="copy-icon-btn"
                    type="button"
                    title="Copiar chave privada"
                    aria-label="Copiar chave privada PEM"
                    on:click={() => copyText(session?.private_key_pem, 'Chave privada PEM')}
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
                  <button
                    class="copy-icon-btn"
                    type="button"
                    title="Baixar chave privada"
                    aria-label="Baixar chave privada PEM"
                    on:click={downloadPrivateKeyPem}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        d="M12 4v9m0 0l-3.5-3.5M12 13l3.5-3.5M5 16.5v2.5h14v-2.5"
                        fill="none"
                        stroke="currentColor"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="1.6"
                      />
                    </svg>
                  </button>
                </div>
              </div>
              <pre>{session.private_key_pem}</pre>
            </article>
          {/if}

          <div class="actions">
            <a class="btn btn-primary" href="/">Nova emissão</a>
          </div>
        </article>
      {:else}
        <article class="session-card">
          <h2 class="panel-title">Sessão indisponível</h2>
          <p class="issuer-lead">
            {session.last_error ?? 'Não foi possível continuar com esta sessão.'}
          </p>
          <div class="actions">
            <button
              class="btn btn-ghost"
              type="button"
              on:click={() => refreshSession()}
              disabled={isRefreshing}
            >
              {isRefreshing ? 'Atualizando...' : 'Atualizar sessão'}
            </button>
            <a class="btn btn-primary" href="/">Nova emissão</a>
          </div>
        </article>
      {/if}
    {/if}
  </section>
</main>
