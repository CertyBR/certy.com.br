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
  $: headTitle = isNotFound ? 'Not Found' : `Error ${resolvedStatus}`;
  $: message = isNotFound
    ? 'O endereço que você tentou abrir não existe ou foi movido.'
    : 'Ocorreu um erro inesperado ao carregar esta página.';
</script>

<svelte:head>
  <title>{headTitle}</title>
  <meta name="robots" content="noindex" />
</svelte:head>

<main class="shell error-shell">
  <header class="site-header">
    <a class="brand" href="/">certy</a>
    <nav class="links">
      <a href="/">Início</a>
      <a href="/emitir">Sessão</a>
      <a href="/termos">Termos</a>
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
      radial-gradient(circle at 92% -8%, rgba(214, 240, 235, 0.9), transparent 44%),
      radial-gradient(circle at 2% 120%, rgba(244, 233, 214, 0.86), transparent 38%),
      var(--card);
  }

  .error-code {
    margin: 0 0 0.2rem;
    color: #857c71;
    font-family: 'Newsreader', serif;
    font-size: clamp(2.1rem, 7vw, 4.1rem);
    line-height: 0.9;
  }

  .error-title {
    margin-bottom: 0.45rem;
  }

  .error-text {
    margin: 0 0 0.9rem;
    color: #5e5650;
    max-width: 55ch;
  }

  .error-detail {
    margin: 0 0 0.9rem;
    color: #8a3737;
    border: 1px solid #e7c8c8;
    background: #fff1f1;
    border-radius: 0.68rem;
    padding: 0.55rem 0.7rem;
    font-size: 0.9rem;
  }
</style>
