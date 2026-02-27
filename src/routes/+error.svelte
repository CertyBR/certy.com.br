<script lang="ts">
  import { page } from '$app/stores';

  export let status: number | undefined;
  export let error: App.Error;

  $: resolvedStatus =
    typeof status === 'number'
      ? status
      : typeof $page.status === 'number' && $page.status > 0
        ? $page.status
        : 500;
  $: isNotFound = resolvedStatus === 404;
  $: title = isNotFound ? 'Not Found' : 'Algo saiu do esperado';
  $: message = isNotFound
    ? 'O endereço que você tentou abrir não existe ou foi movido.'
    : 'Ocorreu um erro inesperado ao carregar esta página.';

  let mobileNavOpen = false;

  function toggleMobileNav(): void {
    mobileNavOpen = !mobileNavOpen;
  }

  function closeMobileNav(): void {
    mobileNavOpen = false;
  }
</script>

<main class="shell error-shell">
  <header class="site-header">
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
      <a href="/emitir" on:click={closeMobileNav}>Sessão</a>
      <a href="/termos" on:click={closeMobileNav}>Termos</a>
    </nav>
  </header>

  <section class="stack" data-reveal>
    <article class="panel error-card">
      <p class="error-code">{resolvedStatus}</p>
      <h1 class="section-title error-title">{title}</h1>
      <p class="error-text">{message}</p>

      {#if error?.message && !isNotFound}
        <p class="error-detail">{error.message}</p>
      {/if}

      <div class="actions">
        <a class="btn btn-primary" href="/">Voltar ao início</a>
        <a class="btn btn-ghost" href="/emitir">Acompanhar sessão</a>
      </div>
    </article>
  </section>
</main>

<style>
  .error-shell {
    min-height: 100vh;
    padding-top: 1rem;
  }

  .error-card {
    width: min(860px, 96vw);
    margin: 2rem auto 0;
    background:
      radial-gradient(circle at 92% -8%, var(--brand-green-soft), transparent 44%),
      radial-gradient(circle at 2% 120%, var(--brand-gold-soft), transparent 38%),
      var(--card);
  }

  .error-code {
    margin: 0 0 0.2rem;
    color: var(--muted);
    font-family: 'Newsreader', serif;
    font-size: clamp(2.1rem, 7vw, 4.1rem);
    line-height: 0.9;
  }

  .error-title {
    margin-bottom: 0.45rem;
  }

  .error-text {
    margin: 0 0 0.9rem;
    color: var(--muted);
    max-width: 55ch;
  }

  .error-detail {
    margin: 0 0 0.9rem;
    color: var(--error-soft);
    border: 1px solid var(--error-border);
    background: var(--error-bg);
    border-radius: 0.68rem;
    padding: 0.55rem 0.7rem;
    font-size: 0.9rem;
  }

  @media (max-width: 760px) {
    .error-shell {
      padding-top: 0.75rem;
    }

    .error-card {
      width: 100%;
      margin-top: 1.2rem;
    }

    .error-text {
      max-width: none;
    }
  }

  @media (max-width: 480px) {
    .error-card {
      margin-top: 0.95rem;
    }

    .error-detail {
      padding: 0.5rem 0.62rem;
      font-size: 0.84rem;
    }
  }
</style>
