<script lang="ts">
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';
  import {
    createCertificateSession,
    finalizeCertificateSession,
    type DnsRecord,
    getCertificateSession,
    hasApiBaseUrl,
    type SessionPayload,
    type SessionStatus
  } from '$lib/api/certy';

  interface Benefit {
    title: string;
    description: string;
  }

  interface FaqItem {
    question: string;
    answer: string;
  }

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

  const benefits: Benefit[] = [
    {
      title: '100% Gratuito',
      description:
        'Sem taxas ocultas, sem necessidade de cartão de crédito. Certificados SSL totalmente gratuitos.'
    },
    {
      title: 'Rápido e Fácil',
      description: 'Gere seu certificado em minutos. Apenas adicione um registro DNS e pronto!'
    },
    {
      title: 'Seguro',
      description: "Powered by Let's Encrypt, a autoridade certificadora mais confiável do mundo."
    },
    {
      title: 'Sem Cadastro',
      description: 'Não precisa criar conta. Apenas informe seu domínio e email para começar.'
    }
  ];

  const faqs: FaqItem[] = [
    {
      question: 'Por que preciso adicionar um registro DNS?',
      answer:
        "O registro DNS é necessário para provar que você é o proprietário do domínio. O Let's Encrypt verifica automaticamente se o registro existe antes de emitir o certificado."
    },
    {
      question: 'Quanto tempo leva para o DNS propagar?',
      answer:
        'A propagação DNS geralmente leva de 1 a 15 minutos, mas em alguns casos pode levar até 24 horas dependendo do seu provedor.'
    },
    {
      question: 'Por quanto tempo o certificado é válido?',
      answer:
        "Certificados Let's Encrypt são válidos por 90 dias. Você receberá um email de lembrete antes do vencimento."
    },
    {
      question: 'Posso usar em vários subdomínios?',
      answer:
        'Cada certificado é emitido para um domínio específico. Para subdomínios, você precisa gerar um certificado separado para cada um.'
    },
    {
      question: 'É seguro usar este serviço?',
      answer:
        "Sim! Não armazenamos suas chaves privadas permanentemente. Todo o processo é transparente e baseado no protocolo ACME do Let's Encrypt."
    },
    {
      question: 'O que acontece se eu perder minha sessão?',
      answer:
        'Se você salvar a URL da sessão, pode voltar a qualquer momento. Caso contrário, basta gerar um novo certificado.'
    }
  ];

  const statusLabels: Record<SessionStatus, string> = {
    pending_dns: 'Aguardando DNS',
    validating: 'Validando',
    issued: 'Emitido',
    failed: 'Falhou',
    expired: 'Expirado'
  };

  let domain = '';
  let email = '';
  let domainError = '';
  let emailError = '';
  let session: SessionView | null = null;
  let sessionId = '';
  let formError = '';
  let formInfo = '';
  let copyInfo = '';
  let isCreating = false;
  let isRefreshing = false;
  let isFinalizing = false;

  onMount(() => {
    if (!hasApiBaseUrl()) {
      formError = 'Serviço temporariamente indisponível. Tente novamente em instantes.';
      return;
    }

    const query = new URLSearchParams(window.location.search);
    const sessionFromQuery = query.get('session');
    if (sessionFromQuery) {
      sessionId = sessionFromQuery;
      void refreshSession(sessionFromQuery, { silent: true });
    }
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
    return `${window.location.origin}/?session=${sessionId}`;
  }

  function normalizeDomainInput(raw: string): string {
    let value = raw.trim().toLowerCase();
    if (value.startsWith('https://')) value = value.slice('https://'.length);
    if (value.startsWith('http://')) value = value.slice('http://'.length);
    if (value.includes('/')) value = value.split('/')[0] ?? value;
    return value.replace(/\.+$/, '');
  }

  function validateDomainFormat(raw: string): string {
    const value = normalizeDomainInput(raw);
    if (!value) return 'Informe um domínio.';

    const wildcard = value.startsWith('*.');
    const hostname = wildcard ? value.slice(2) : value;
    if (!hostname || hostname.length > 253 || !hostname.includes('.')) {
      return 'Domínio inválido.';
    }

    const labels = hostname.split('.');
    for (const label of labels) {
      if (!label || label.length > 63) return 'Domínio inválido.';
      if (label.startsWith('-') || label.endsWith('-')) return 'Domínio inválido.';
      if (!/^[a-z0-9-]+$/.test(label)) return 'Domínio inválido.';
    }

    return '';
  }

  function validateEmailFormat(raw: string): string {
    const value = raw.trim().toLowerCase();
    if (!value) return 'Informe um email.';
    if (value.length > 254 || value.includes(' ')) return 'Email inválido.';

    const parts = value.split('@');
    if (parts.length !== 2) return 'Email inválido.';

    const [local, domainPart] = parts;
    if (!local || !domainPart || !domainPart.includes('.')) return 'Email inválido.';

    return '';
  }

  function validateClientForm(): boolean {
    domainError = validateDomainFormat(domain);
    emailError = validateEmailFormat(email);
    return !domainError && !emailError;
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

    session = {
      session_id: payloadValue(payload, 'session_id', session?.session_id ?? sessionId ?? ''),
      status: payloadValue(payload, 'status', session?.status ?? 'pending_dns'),
      domain: payloadValue(payload, 'domain', session?.domain ?? domain),
      email: payloadValue(payload, 'email', session?.email ?? email),
      dns_records: payloadValue(payload, 'dns_records', session?.dns_records ?? []),
      created_at: payloadValue(payload, 'created_at', session?.created_at ?? null),
      updated_at: payloadValue(payload, 'updated_at', session?.updated_at ?? null),
      expires_at: payloadValue(payload, 'expires_at', session?.expires_at ?? null),
      last_error: payloadValue(payload, 'last_error', session?.last_error ?? null),
      certificate_pem: payloadValue(payload, 'certificate_pem', session?.certificate_pem ?? null),
      private_key_pem: payloadValue(payload, 'private_key_pem', session?.private_key_pem ?? null)
    };

    sessionId = session.session_id || sessionId;
    if (session.domain) domain = session.domain;
    if (session.email) email = session.email;

    if (browser && sessionId) {
      const url = new URL(window.location.href);
      url.searchParams.set('session', sessionId);
      window.history.replaceState(null, '', url.toString());
    }
  }

  async function handleCreateSession(): Promise<void> {
    if (!hasApiBaseUrl()) {
      formError = 'Serviço temporariamente indisponível. Tente novamente em instantes.';
      return;
    }

    domain = normalizeDomainInput(domain);
    email = email.trim().toLowerCase();
    if (!validateClientForm()) {
      formError = 'Revise os campos e tente novamente.';
      return;
    }

    formError = '';
    formInfo = '';
    copyInfo = '';
    isCreating = true;

    try {
      const payload = await createCertificateSession({ domain, email });
      mergeSession(payload);
      formInfo =
        payload?.message ??
        'Sessão criada com sucesso. Adicione os registros TXT e depois finalize a emissão.';
    } catch (error) {
      formError = asStringError(error);
    } finally {
      isCreating = false;
    }
  }

  async function refreshSession(
    targetSessionId: string = sessionId,
    options: RefreshOptions = {}
  ): Promise<void> {
    const { silent = false } = options;

    if (!targetSessionId) {
      if (!silent) {
        formError = 'Crie uma sessão antes de atualizar o status.';
      }
      return;
    }

    if (!silent) {
      formError = '';
      copyInfo = '';
    }
    isRefreshing = true;

    try {
      const payload = await getCertificateSession(targetSessionId);
      mergeSession(payload);
      if (!silent) {
        formInfo = 'Sessão atualizada com sucesso.';
      }
    } catch (error) {
      if (isSessionNotFoundError(error)) {
        startNewSession();
        return;
      }

      if (!silent) {
        formError = asStringError(error);
      }
    } finally {
      isRefreshing = false;
    }
  }

  async function handleFinalizeSession(): Promise<void> {
    if (!sessionId) {
      formError = 'Crie ou carregue uma sessão antes de finalizar.';
      return;
    }

    formError = '';
    formInfo = '';
    copyInfo = '';
    isFinalizing = true;

    try {
      const payload = await finalizeCertificateSession(sessionId);
      mergeSession(payload);
      formInfo = payload?.message ?? 'Finalização solicitada.';

      if (payload?.status !== 'issued') {
        await refreshSession(sessionId, { silent: true });
      }
    } catch (error) {
      if (isSessionNotFoundError(error)) {
        startNewSession();
        return;
      }

      formError = asStringError(error);
    } finally {
      isFinalizing = false;
    }
  }

  async function copyText(value: string | null | undefined, label: string): Promise<void> {
    if (!browser || !value) return;

    try {
      await navigator.clipboard.writeText(value);
      copyInfo = `${label} copiado com sucesso.`;
    } catch {
      copyInfo = `Não foi possível copiar ${label.toLowerCase()}.`;
    }
  }

  function startNewSession(): void {
    session = null;
    sessionId = '';
    domain = '';
    email = '';
    domainError = '';
    emailError = '';
    formError = '';
    formInfo = '';
    copyInfo = '';

    if (browser) {
      const url = new URL(window.location.href);
      url.searchParams.delete('session');
      window.history.replaceState(null, '', url.toString());
    }
  }
</script>

<svelte:head>
  <title>Certy | SSL gratuito com Let's Encrypt</title>
  <meta
    name="description"
    content="Certificados SSL gratuitos com validação DNS, experiência rápida e frontend minimalista."
  />
</svelte:head>

<main class="shell">
  <header class="site-header" data-reveal>
    <a class="brand" href="/">certy</a>
    <nav class="links">
      <a href="#emitir">Emitir</a>
      <a href="#beneficios">Benefícios</a>
      <a href="#faq">FAQ</a>
      <a href="#zerocert">ZeroCert</a>
    </nav>
  </header>

  <section class="hero">
    <div data-reveal style="animation-delay: 110ms">
      <p class="badge">SSL grátis • Let's Encrypt</p>
      <h1>Emita SSL gratuito para seu domínio sem complicação.</h1>
      <p class="lead">
        Crie sua solicitação, adicione o registro DNS indicado e conclua a emissão com segurança.
      </p>
      <div class="actions">
        <a class="btn btn-primary" href="#emitir">Começar emissão</a>
        <a class="btn btn-ghost" href="#faq">Ler FAQ</a>
      </div>
    </div>

    <aside class="panel" data-reveal style="animation-delay: 180ms">
      <p class="panel-title">Como funciona</p>
      <ul>
        <li>Você informa domínio e email para iniciar.</li>
        <li>Nós mostramos o registro DNS necessário para validação.</li>
        <li>Após validar, o certificado e a chave ficam disponíveis para cópia.</li>
      </ul>
    </aside>
  </section>

  <section id="emitir" class="stack issuer" data-reveal style="animation-delay: 140ms">
    <h2 class="section-title">Emitir Certificado</h2>

    {#if !sessionId}
      <form class="issue-form" on:submit|preventDefault={handleCreateSession}>
        <label class="field">
          <span>Domínio</span>
          <input
            type="text"
            bind:value={domain}
            on:blur={() => (domainError = validateDomainFormat(domain))}
            placeholder="example.com ou *.example.com"
            autocomplete="off"
            required
          />
          {#if domainError}
            <small class="field-error">{domainError}</small>
          {/if}
        </label>

        <label class="field">
          <span>Email</span>
          <input
            type="email"
            bind:value={email}
            on:blur={() => (emailError = validateEmailFormat(email))}
            placeholder="ops@example.com"
            autocomplete="email"
            required
          />
          {#if emailError}
            <small class="field-error">{emailError}</small>
          {/if}
        </label>

        <div class="actions">
          <button class="btn btn-primary" type="submit" disabled={isCreating || !hasApiBaseUrl()}>
            {isCreating ? 'Criando sessão...' : 'Criar sessão'}
          </button>
        </div>
      </form>
    {:else}
      <article class="session-mode">
        <p>Uma sessão ativa foi detectada. Domínio e email ficam bloqueados para evitar confusão.</p>
        <div class="actions">
          <button
            class="btn btn-primary"
            type="button"
            on:click={() => refreshSession()}
            disabled={isRefreshing}
          >
            {isRefreshing ? 'Atualizando...' : 'Atualizar sessão'}
          </button>
          <button class="btn btn-ghost" type="button" on:click={startNewSession}>
            Iniciar nova sessão
          </button>
        </div>
      </article>
    {/if}

    {#if formError}
      <p class="flash flash-error">{formError}</p>
    {/if}
    {#if formInfo}
      <p class="flash flash-info">{formInfo}</p>
    {/if}
    {#if copyInfo}
      <p class="flash flash-info">{copyInfo}</p>
    {/if}
    {#if sessionId && !session && isRefreshing}
      <p class="flash flash-info">Carregando sessão...</p>
    {/if}

    {#if session}
      <article class="session-card">
        <div class="session-meta">
          <p><strong>Domínio:</strong> {session.domain}</p>
          <p><strong>Email:</strong> {session.email}</p>
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
            on:click={() => copyText(buildSessionLink(), 'Link da sessão')}
            disabled={!sessionId}
          >
            Copiar link da sessão
          </button>
        </div>

        {#if session.last_error}
          <p class="flash flash-error">{session.last_error}</p>
        {/if}

        <div class="dns-grid">
          {#each session.dns_records ?? [] as record, index}
            <article class="dns-card">
              <p class="dns-title">Registro DNS #{index + 1}</p>
              <p><strong>Tipo:</strong> {record.type ?? record.record_type ?? 'TXT'}</p>
              <p><strong>Nome:</strong> <code>{record.name}</code></p>
              <p><strong>Valor:</strong> <code>{record.value}</code></p>
              <div class="actions">
                <button
                  class="btn btn-ghost"
                  type="button"
                  on:click={() => copyText(record.name, 'Nome DNS')}
                >
                  Copiar nome
                </button>
                <button
                  class="btn btn-ghost"
                  type="button"
                  on:click={() => copyText(record.value, 'Valor DNS')}
                >
                  Copiar valor
                </button>
              </div>
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

  <section id="beneficios" class="stack">
    <h2 class="section-title" data-reveal style="animation-delay: 80ms">Benefícios</h2>
    <div class="grid">
      {#each benefits as benefit, index}
        <article class="card" data-reveal style={`animation-delay: ${120 + index * 55}ms`}>
          <h3>{benefit.title}</h3>
          <p>{benefit.description}</p>
        </article>
      {/each}
    </div>
  </section>

  <section id="faq" class="stack">
    <h2 class="section-title" data-reveal style="animation-delay: 90ms">Perguntas Frequentes</h2>
    <div class="faq-list">
      {#each faqs as faq, index}
        <details class="faq-item" data-reveal style={`animation-delay: ${140 + index * 45}ms`}>
          <summary>{faq.question}</summary>
          <p>{faq.answer}</p>
        </details>
      {/each}
    </div>
  </section>

  <section class="callout" id="zerocert" data-reveal style="animation-delay: 220ms">
    <h2>Feito com dedicação pela ZeroCert</h2>
  </section>

  <footer class="site-footer" data-reveal style="animation-delay: 260ms">
    <span>© {new Date().getFullYear()} Certy</span>
    <span class="footer-links">
      <a href="/termos">Termos de Uso e Privacidade</a>
      <span>•</span>
      <a href="https://github.com" target="_blank" rel="noreferrer">GitHub</a>
      <span>•</span>
      <a href="https://letsencrypt.org/pt-br/" target="_blank" rel="noreferrer">Let's Encrypt</a>
    </span>
  </footer>
</main>
