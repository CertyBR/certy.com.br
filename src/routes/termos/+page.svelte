<script lang="ts">
  const termsSeoJsonLd = JSON.stringify(
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'Termos de Uso e Política de Privacidade - Certy',
      url: 'https://certy.com.br/termos',
      inLanguage: 'pt-BR',
      dateModified: '2025-11-30',
      publisher: {
        '@type': 'Organization',
        name: 'Certy',
        url: 'https://certy.com.br'
      }
    },
    null,
    0
  );
</script>

<svelte:head>
  <script type="application/ld+json">{termsSeoJsonLd}</script>
</svelte:head>

<main class="shell">
  <header class="site-header" data-reveal>
    <a class="brand" href="/">certy</a>
    <nav class="links">
      <a href="/">Início</a>
      <a href="/emitir">Sessão</a>
    </nav>
  </header>

  <section class="stack terms-shell" data-reveal style="animation-delay: 110ms">
    <br>
    <h1>Termos de Uso e Política de Privacidade</h1>
    <p class="terms-date">Última atualização: 30 de novembro de 2025</p>

    <div class="terms-content">
      <article class="card terms-card">
        <h2 class="terms-title">Termos de Uso</h2>

        <h3>1. Aceitação dos Termos</h3>
        <p>
          Ao utilizar o Certy, você concorda com estes Termos de Uso. Se você não concorda com
          qualquer parte destes termos, não utilize nosso serviço.
        </p>

        <h3>2. Descrição do Serviço</h3>
        <p>
          O Certy é um serviço gratuito que facilita a obtenção de certificados SSL através do
          Let's Encrypt. Não cobramos nenhuma taxa e não exigimos cadastro ou cartão de crédito.
        </p>

        <h3>3. Responsabilidades do Usuário</h3>
        <ul>
          <li>Você é responsável por fornecer informações corretas (domínio e email)</li>
          <li>Você deve ter autoridade para configurar registros DNS do domínio</li>
          <li>Você é responsável pela segurança e armazenamento das chaves privadas geradas</li>
          <li>Você deve usar o serviço de acordo com as leis aplicáveis</li>
        </ul>

        <h3>4. Limitações do Serviço</h3>
        <ul>
          <li>O serviço é fornecido "como está", sem garantias de disponibilidade</li>
          <li>Não garantimos que o serviço estará sempre disponível ou livre de erros</li>
          <li>Os certificados gerados estão sujeitos aos limites de taxa do Let's Encrypt</li>
          <li>Reservamo-nos o direito de suspender ou encerrar o serviço a qualquer momento</li>
        </ul>

        <h3>5. Certificados e Chaves Privadas</h3>
        <ul>
          <li>Os certificados e chaves privadas são exibidos apenas uma vez</li>
          <li>Não armazenamos suas chaves privadas em nossos servidores</li>
          <li>É sua responsabilidade baixar e armazenar com segurança os arquivos gerados</li>
          <li>Uma vez fechada a janela, não será possível recuperar os certificados</li>
        </ul>

        <h3>6. Limitação de Responsabilidade</h3>
        <p>
          O Certy e a
          <a href="https://zerocert.com.br" target="_blank" rel="noreferrer">ZeroCert</a>
          não se responsabilizam por quaisquer danos diretos, indiretos, incidentais, especiais ou
          consequenciais resultantes do uso ou da impossibilidade de usar o serviço.
        </p>

        <h3>7. Modificações nos Termos</h3>
        <p>
          Reservamo-nos o direito de modificar estes termos a qualquer momento. As alterações
          entrarão em vigor imediatamente após a publicação nesta página.
        </p>
      </article>

      <article class="card terms-card">
        <h2 class="terms-title">Política de Privacidade</h2>

        <h3>1. Informações Coletadas</h3>
        <p>Coletamos apenas as seguintes informações necessárias para o funcionamento do serviço:</p>
        <ul>
          <li>
            <strong>Domínio:</strong>
            O nome do domínio para o qual você deseja gerar o certificado
          </li>
          <li>
            <strong>Email:</strong>
            Usado para registro na Let's Encrypt e validação
          </li>
          <li>
            <strong>Fingerprint do certificado:</strong>
            Hash SHA256 do certificado gerado (apenas para registro)
          </li>
        </ul>

        <h3>2. Como Usamos Suas Informações</h3>
        <ul>
          <li>Para validar a propriedade do domínio através de registros DNS</li>
          <li>Para gerar certificados SSL através do Let's Encrypt</li>
          <li>Para validar que o email fornecido é real e não é temporário</li>
          <li>Para manter registros básicos de certificados emitidos (apenas fingerprints)</li>
        </ul>

        <h3>3. Compartilhamento de Dados</h3>
        <p>Compartilhamos suas informações apenas com:</p>
        <ul>
          <li>
            <strong>Let's Encrypt:</strong>
            Para gerar os certificados SSL
          </li>
          <li>
            <strong>Serviços de validação de email:</strong>
            Para verificar se o email é válido
          </li>
        </ul>
        <p>
          Nunca vendemos, alugamos ou compartilhamos suas informações com terceiros para fins
          comerciais.
        </p>

        <h3>4. Armazenamento de Dados</h3>
        <ul>
          <li>Armazenamos temporariamente os dados da sessão durante o processo de geração</li>
          <li>Todos os dados da sessão são excluídos imediatamente após a geração do certificado</li>
          <li>Não armazenamos chaves privadas em nenhum momento</li>
          <li>Mantemos apenas registros de email, domínio e fingerprint do certificado</li>
        </ul>

        <h3>5. Segurança</h3>
        <p>
          Implementamos medidas de segurança técnicas e organizacionais para proteger suas
          informações. No entanto, nenhuma transmissão pela internet é 100% segura, e não podemos
          garantir segurança absoluta.
        </p>

        <h3>6. Cookies e Rastreamento</h3>
        <p>
          Não utilizamos cookies de rastreamento ou ferramentas de análise de terceiros. Usamos
          apenas armazenamento de sessão temporário necessário para o funcionamento do serviço.
        </p>

        <h3>7. Seus Direitos</h3>
        <p>Você tem o direito de:</p>
        <ul>
          <li>Saber quais informações temos sobre você</li>
          <li>Solicitar a exclusão de suas informações</li>
          <li>Solicitar correções em suas informações</li>
          <li>Retirar seu consentimento a qualquer momento</li>
        </ul>

        <h3>8. Retenção de Dados</h3>
        <ul>
          <li>Dados de sessão: Excluídos imediatamente após geração do certificado</li>
          <li>
            Registros de email/domínio/fingerprint: Mantidos indefinidamente para fins de auditoria
          </li>
          <li>Sessões expiradas: Excluídas automaticamente após 24 horas</li>
        </ul>

        <h3>9. Contato</h3>
        <p>
          Para questões sobre privacidade ou exercer seus direitos, entre em contato através do
          repositório GitHub do projeto ou através dos canais oficiais da
          <a href="https://zerocert.com.br" target="_blank" rel="noreferrer">ZeroCert</a>.
        </p>

        <h3>10. Conformidade Legal</h3>
        <p>
          Esta política de privacidade está em conformidade com as leis de proteção de dados
          aplicáveis, incluindo a LGPD (Lei Geral de Proteção de Dados) do Brasil.
        </p>
      </article>

      <article class="card terms-card">
        <h2 class="terms-title">Informações Adicionais</h2>

        <h3>Open Source</h3>
        <p>
          O Certy é um projeto de código aberto. Você pode revisar o código-fonte e contribuir
          através do nosso repositório no GitHub.
        </p>

        <h3>Let's Encrypt</h3>
        <p>
          Os certificados são emitidos pelo Let's Encrypt, uma autoridade certificadora gratuita,
          automatizada e aberta. Para mais informações, visite
          <a href="https://letsencrypt.org" target="_blank" rel="noreferrer">letsencrypt.org</a>.
        </p>

        <h3>Suporte</h3>
        <p>
          Este é um serviço gratuito fornecido sem garantias. Não oferecemos suporte técnico
          oficial, mas você pode relatar problemas através do repositório GitHub.
        </p>
      </article>
    </div>

    <div class="actions terms-actions">
      <a class="btn btn-primary" href="/">Voltar para início</a>
    </div>
  </section>
</main>

<style>
  .terms-shell {
    border: 1px solid var(--line);
    border-radius: 1.15rem;
    padding: 1.2rem;
    background: var(--card);
  }

  .terms-back {
    margin-bottom: 0.6rem;
  }

  .terms-date {
    margin: 0.35rem 0 1rem;
    color: var(--muted);
    font-size: 0.9rem;
  }

  .terms-content {
    display: grid;
    gap: 0.9rem;
  }

  .terms-title {
    margin: 0 0 0.45rem;
    font-family: 'Newsreader', serif;
    font-size: clamp(1.3rem, 3.2vw, 1.85rem);
  }

  .terms-card h3 {
    margin: 1rem 0 0.35rem;
    font-size: 1.03rem;
  }

  .terms-card h3:first-of-type {
    margin-top: 0.35rem;
  }

  .terms-card p {
    margin: 0;
    color: var(--muted);
  }

  .terms-card ul {
    margin: 0.45rem 0 0;
    padding-left: 1.15rem;
    color: var(--muted);
  }

  .terms-card li + li {
    margin-top: 0.26rem;
  }

  .terms-card a {
    text-decoration: underline;
    text-underline-offset: 0.15rem;
  }

  .terms-actions {
    margin-top: 1.8rem;
  }

  @media (max-width: 760px) {
    .terms-shell {
      border-radius: 1rem;
      padding: 0.95rem;
    }

    .terms-date {
      margin: 0.35rem 0 0.85rem;
      font-size: 0.86rem;
    }

    .terms-title {
      margin-bottom: 0.35rem;
    }

    .terms-card h3 {
      margin-top: 0.85rem;
      font-size: 0.98rem;
    }

    .terms-actions {
      margin-top: 1.35rem;
    }
  }

  @media (max-width: 480px) {
    .terms-shell {
      padding: 0.82rem;
    }

    .terms-back {
      width: 100%;
    }

    .terms-card ul {
      padding-left: 1rem;
    }

    .terms-actions .btn {
      width: 100%;
    }
  }
</style>
