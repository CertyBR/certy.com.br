# Certy Frontend

<p align="center">
  <img src="https://certy.zerocert.com.br/logo.svg" alt="Certy" width="180" />
</p>

Frontend oficial do [Certy](https://certy.com.br/), construído com SvelteKit + TypeScript e deployado no Cloudflare Workers.

## Links

- Site: https://certy.com.br/
- Repositório: https://github.com/CertyBR/certy.com.br
- Patrocinador: [ZeroCert](https://zerocert.com.br)

## Mantenedores Chefes

- André Ribas ([@RibasSu](https://github.com/RibasSu))
- Sarah Maia ([@sarahsec](https://github.com/sarahsec))

## Stack

- SvelteKit 2
- TypeScript
- Vite 7
- Adapter Cloudflare (`@sveltejs/adapter-cloudflare`)
- Bun

## Rotas

- `/` Home
- `/emitir` Acompanhamento de sessão
- `/termos` Termos de Uso e Política de Privacidade
- `/*` Página de erro/404 customizada

## Integração com API

O frontend se comunica com a API via proxy (Cloudflare Worker) usando `PUBLIC_API_BASE_URL`.

Endpoints usados pelo frontend:

- `POST /api/v1/certificates/sessions`
- `GET /api/v1/certificates/sessions/{session_id}`
- `POST /api/v1/certificates/sessions/{session_id}/verification-code`
- `POST /api/v1/certificates/sessions/{session_id}/verify-email`
- `POST /api/v1/certificates/sessions/{session_id}/dns-check`
- `POST /api/v1/certificates/sessions/{session_id}/finalize`

## Variáveis de Ambiente

Crie `.env` a partir de `.env.example`:

```env
PUBLIC_API_BASE_URL=https://api.certy.com.br
PUBLIC_EMAIL_VALIDATION_API_URL=https://api.likn.dev/v1/public/email-validation/validate
```

## Desenvolvimento Local

Pré-requisitos:

- Bun 1.3+

Passos:

```bash
bun install
cp .env.example .env
bun run dev
```

## Scripts

```bash
bun run dev      # desenvolvimento
bun run check    # checagem Svelte/TypeScript
bun run build    # build produção
bun run preview  # preview local da build
bun run deploy   # build + deploy no Cloudflare Workers
```

## Deploy

Este frontend usa Cloudflare Workers via adapter do SvelteKit.

Antes do deploy:

```bash
bunx wrangler login
```

Depois:

```bash
bun run deploy
```

## Estrutura (resumo)

```text
src/
  lib/
    api/certy.ts
    toast.ts
  routes/
    +layout.svelte
    +page.svelte
    +error.svelte
    emitir/+page.svelte
    termos/+page.svelte
  app.css
static/
  favicon.svg
  logo.svg
  og/certy-og.svg
  robots.txt
  sitemap.xml
  cursors/
```

## Contribuições

Contribuições são bem-vindas.

1. Faça fork do repositório.
2. Crie uma branch para sua mudança (`feat/...`, `fix/...`, `chore/...`).
3. Garanta que o projeto continua estável:
   - `bun run check`
   - `bun run build`
4. Abra um Pull Request com:
   - contexto da mudança
   - impacto esperado
   - prints/gifs quando houver alteração visual

Diretrizes importantes:

- Use Bun (não use npm neste projeto).
- Mantenha TypeScript estrito e código consistente com o estilo atual.
- Evite incluir dados sensíveis em commits.

## Licença

Este projeto está sob a licença MIT. Veja [LICENSE](./LICENSE).
