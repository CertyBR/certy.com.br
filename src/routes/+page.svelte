<script lang="ts">
  import { browser } from '$app/environment';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import {
    createCertificateSession,
    hasApiBaseUrl,
    validateEmailAddress,
    type EmailValidationPayload
  } from '$lib/api/certy';
  import { notify } from '$lib/toast';

  interface Benefit {
    title: string;
    description: string;
  }

  interface FaqItem {
    question: string;
    answer: string;
  }

  interface CloseHashModalOptions {
    clearHash?: boolean;
  }

  type HashModal = 'faq' | 'beneficios';

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
      description: 'Não precisa criar conta. Apenas informe seu domínio e e-mail para começar.'
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
        "Certificados Let's Encrypt são válidos por 90 dias. Você receberá um e-mail de lembrete antes do vencimento."
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
  const homeSeoJsonLd = JSON.stringify(
    [
      {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'Certy',
        url: 'https://certy.com.br',
        sameAs: ['https://zerocert.com.br']
      },
      {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'Certy',
        url: 'https://certy.com.br',
        inLanguage: 'pt-BR'
      },
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqs.map((faq) => ({
          '@type': 'Question',
          name: faq.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: faq.answer
          }
        }))
      }
    ],
    null,
    0
  );

  let domain = '';
  let email = '';
  let domainError = '';
  let emailError = '';
  let isCreating = false;
  let isValidatingEmail = false;
  let hashModal: HashModal | null = null;

  onMount(() => {
    const handleModalKeydown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape' && hashModal) {
        closeHashModal();
      }
    };

    window.addEventListener('keydown', handleModalKeydown);

    const query = new URLSearchParams(window.location.search);
    const sessionFromQuery = query.get('session')?.trim();
    if (sessionFromQuery) {
      void goto(`/emitir?session=${encodeURIComponent(sessionFromQuery)}`, { replaceState: true });
    }

    if (!hasApiBaseUrl()) {
      notify('Serviço temporariamente indisponível. Tente novamente em instantes.', 'error');
    }

    const initialHash = window.location.hash.trim().toLowerCase();
    if (initialHash === '#faq' || initialHash === '#beneficios') {
      hashModal = initialHash === '#faq' ? 'faq' : 'beneficios';
      const url = new URL(window.location.href);
      url.hash = '';
      window.history.replaceState(null, '', `${url.pathname}${url.search}`);
    }

    return () => {
      window.removeEventListener('keydown', handleModalKeydown);
    };
  });

  function asStringError(error: unknown): string {
    if (error instanceof Error) return error.message;
    return 'Erro inesperado.';
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
    if (!value) return 'Informe um e-mail.';
    if (value.length > 254 || value.includes(' ')) return 'E-mail inválido.';

    const parts = value.split('@');
    if (parts.length !== 2) return 'E-mail inválido.';

    const [local, domainPart] = parts;
    if (!local || !domainPart || !domainPart.includes('.')) return 'E-mail inválido.';

    return '';
  }

  function emailValidationMessage(payload: EmailValidationPayload): string {
    if (!payload.format_valid) {
      return 'Formato de e-mail inválido.';
    }
    if (payload.is_disposable) {
      return 'Use um e-mail permanente. E-mails descartáveis não são aceitos.';
    }
    if (!payload.dns_valid) {
      return 'Domínio de e-mail sem DNS/MX válido.';
    }
    if (payload.errors.length > 0) {
      return payload.errors[0] ?? 'E-mail inválido.';
    }
    return 'E-mail inválido.';
  }

  function isEmailValidationAccepted(payload: EmailValidationPayload): boolean {
    return payload.valid && payload.format_valid && !payload.is_disposable && payload.dns_valid;
  }

  async function validateEmailWithLikn(
    rawEmail: string,
    options: { onNetworkError: 'block' | 'allow' } = { onNetworkError: 'allow' }
  ): Promise<boolean> {
    const normalizedEmail = rawEmail.trim().toLowerCase();
    const formatError = validateEmailFormat(normalizedEmail);
    if (formatError) {
      emailError = formatError;
      return false;
    }

    isValidatingEmail = true;
    try {
      const payload = await validateEmailAddress(normalizedEmail);
      if (!isEmailValidationAccepted(payload)) {
        emailError = emailValidationMessage(payload);
        return false;
      }

      emailError = '';
      return true;
    } catch (error) {
      if (options.onNetworkError === 'block') {
        emailError =
          'Não foi possível validar o e-mail no momento. Tente novamente em alguns instantes.';
        return false;
      }

      notify(
        'Validação externa de e-mail indisponível no navegador. O backend validará no envio.',
        'info'
      );
      return true;
    } finally {
      isValidatingEmail = false;
    }
  }

  async function handleEmailBlur(): Promise<void> {
    email = email.trim().toLowerCase();
    const formatError = validateEmailFormat(email);
    emailError = formatError;
    if (formatError) return;
    await validateEmailWithLikn(email, { onNetworkError: 'allow' });
  }

  function validateClientForm(): boolean {
    domainError = validateDomainFormat(domain);
    emailError = validateEmailFormat(email);
    return !domainError && !emailError;
  }

  async function handleCreateSession(): Promise<void> {
    if (!hasApiBaseUrl()) {
      notify('Serviço temporariamente indisponível. Tente novamente em instantes.', 'error');
      return;
    }

    domain = normalizeDomainInput(domain);
    email = email.trim().toLowerCase();

    if (!validateClientForm()) {
      notify('Revise os campos e tente novamente.', 'error');
      return;
    }

    const hasValidEmail = await validateEmailWithLikn(email, { onNetworkError: 'block' });
    if (!hasValidEmail) {
      notify('Use um e-mail válido e não descartável.', 'error');
      return;
    }

    isCreating = true;

    try {
      const payload = await createCertificateSession({ domain, email });
      const createdSessionId = payload?.session_id?.trim();

      if (!createdSessionId) {
        throw new Error('Sessão inválida retornada pelo servidor.');
      }

      notify(payload?.message ?? 'Sessão criada com sucesso.', 'success');
      await goto(`/emitir?session=${encodeURIComponent(createdSessionId)}`);
    } catch (error) {
      notify(asStringError(error), 'error');
    } finally {
      isCreating = false;
    }
  }

  function scrollToSection(sectionId: string): void {
    if (!browser) return;
    const target = document.getElementById(sectionId);
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function closeHashModal(options: CloseHashModalOptions = {}): void {
    const { clearHash = true } = options;
    hashModal = null;

    if (browser && clearHash && window.location.hash) {
      const url = new URL(window.location.href);
      url.hash = '';
      window.history.replaceState(null, '', `${url.pathname}${url.search}`);
    }
  }

  function handleHashModalBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      closeHashModal();
    }
  }
</script>

<svelte:head>
  <script type="application/ld+json">{homeSeoJsonLd}</script>
</svelte:head>

<main class="shell">
  <header class="site-header" data-reveal>
    <a class="brand" href="/">certy</a>
    <nav class="links">
      <a href="/" on:click|preventDefault={() => scrollToSection('emitir')}>Emitir</a>
      <a href="/" on:click|preventDefault={() => scrollToSection('beneficios')}>
        Benefícios
      </a>
      <a href="/" on:click|preventDefault={() => scrollToSection('faq')}>FAQ</a>
      <a href="https://zerocert.com.br" target="_blank" rel="noreferrer">ZeroCert</a>
    </nav>
  </header>

  <section class="hero">
    <div data-reveal style="animation-delay: 110ms">
      <p class="badge">SSL grátis • Let's Encrypt</p>
      <h1>Emita SSL gratuito para seu domínio sem complicação.</h1>
      <p class="lead">
        Informe domínio e e-mail para iniciar. Depois você acompanha os passos em uma página dedicada
        da sessão.
      </p>
    </div>

    <aside class="panel" data-reveal style="animation-delay: 180ms">
      <p class="panel-title">Como funciona</p>
      <ul>
        <li>Você informa domínio e e-mail para iniciar.</li>
        <li>Você recebe uma sessão exclusiva para acompanhar a validação DNS.</li>
        <li>Após validar, o certificado e a chave ficam disponíveis para cópia.</li>
      </ul>
    </aside>
  </section>

  <section id="emitir" class="stack issuer" data-reveal style="animation-delay: 140ms">
    <h2 class="section-title">Emitir Certificado</h2>

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
        <span>E-mail</span>
        <input
          type="email"
          bind:value={email}
          on:blur={handleEmailBlur}
          placeholder="ops@example.com"
          autocomplete="email"
          required
        />
        {#if isValidatingEmail}
          <small class="field-hint">Validando e-mail...</small>
        {/if}
        {#if emailError}
          <small class="field-error">{emailError}</small>
        {/if}
      </label>

      <div class="actions">
        <button
          class="btn btn-primary"
          type="submit"
          disabled={isCreating || isValidatingEmail || !hasApiBaseUrl()}
        >
          {isCreating ? 'Criando sessão...' : 'Criar sessão'}
        </button>
      </div>
    </form>
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
    <h2>
      Feito com dedicação pela
      <a href="https://zerocert.com.br" target="_blank" rel="noreferrer">ZeroCert</a>
    </h2>
  </section>

  <footer class="site-footer" data-reveal style="animation-delay: 260ms">
    <span>© {new Date().getFullYear()} Certy</span>
    <span class="footer-links">
      <a href="/termos">Termos de Uso e Privacidade</a>
      <span>•</span>
      <a href="https://github.com/CertyBR" target="_blank" rel="noreferrer">GitHub</a>
      <span>•</span>
      <a href="https://letsencrypt.org/pt-br/" target="_blank" rel="noreferrer">Let's Encrypt</a>
    </span>
  </footer>
</main>

{#if hashModal === 'faq'}
  <div class="macos-modal-backdrop" role="presentation" on:click={handleHashModalBackdropClick}>
    <div class="macos-modal" role="dialog" aria-modal="true" aria-labelledby="faq-modal-title">
      <header class="macos-modal-header">
        <button
          class="macos-dot macos-dot-close"
          type="button"
          aria-label="Fechar"
          on:click={() => closeHashModal()}
        ></button>
        <span class="macos-modal-title">Certy</span>
      </header>

      <div class="macos-modal-content">
        <h2 id="faq-modal-title">Perguntas Frequentes</h2>
        <p>Resumo rápido para quem acessou a URL direta do FAQ.</p>

        <div class="macos-modal-faq-list">
          {#each faqs as faq}
            <details class="macos-modal-faq-item">
              <summary>{faq.question}</summary>
              <p>{faq.answer}</p>
            </details>
          {/each}
        </div>

        <div class="actions">
          <button
            class="btn btn-primary"
            type="button"
            on:click={() => {
              closeHashModal({ clearHash: false });
              scrollToSection('emitir');
            }}
          >
            Ir para emissão
          </button>
          <button class="btn btn-ghost" type="button" on:click={() => closeHashModal()}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

{#if hashModal === 'beneficios'}
  <div class="macos-modal-backdrop" role="presentation" on:click={handleHashModalBackdropClick}>
    <div
      class="macos-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="beneficios-modal-title"
    >
      <header class="macos-modal-header">
        <button
          class="macos-dot macos-dot-close"
          type="button"
          aria-label="Fechar"
          on:click={() => closeHashModal()}
        ></button>
        <span class="macos-modal-title">Certy</span>
      </header>

      <div class="macos-modal-content">
        <h2 id="beneficios-modal-title">Benefícios</h2>
        <p>Resumo direto dos principais pontos da plataforma.</p>

        <div class="macos-modal-benefits">
          {#each benefits as benefit}
            <article class="card">
              <h3>{benefit.title}</h3>
              <p>{benefit.description}</p>
            </article>
          {/each}
        </div>

        <div class="actions">
          <button class="btn btn-primary" type="button" on:click={() => closeHashModal()}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}
