<script>
  const benefits = [
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

  const faqs = [
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
        Projeto frontend da Certy pronto para Cloudflare Workers. Fluxo enxuto, visual limpo e foco total em
        certificação.
      </p>
      <div class="actions">
        <a class="btn btn-primary" href="#beneficios">Ver benefícios</a>
        <a class="btn btn-ghost" href="#faq">Ler FAQ</a>
      </div>
    </div>

    <aside class="panel" data-reveal style="animation-delay: 180ms">
      <p class="panel-title">Versão atual: somente frontend</p>
      <ul>
        <li>Sem backend conectado por enquanto.</li>
        <li>Interface pronta para integração futura com sua API Rust.</li>
        <li>Deploy global com Cloudflare Workers.</li>
      </ul>
    </aside>
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
