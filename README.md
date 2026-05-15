# Certy Frontend

<p align="center">
  <img src="https://certy.zerocert.com.br/logo.svg" alt="Certy" width="180" />
</p>

Frontend oficial do [Certy](https://certy.com.br/), construído com SvelteKit + TypeScript e deployado no Cloudflare Workers.

## Links

- Site: https://certy.com.br/
- Repositório: https://github.com/CertyBR/certy.com.br
- Patrocinador: [ZeroCert](https://zerocert.com.br)

## Mantenedores

- André Ribas ([@RibasSu](https://github.com/RibasSu))
- Sarah Maia ([@sarahsec](https://github.com/sarahsec))

## Stack

- SvelteKit 2 + Svelte 5
- TypeScript
- Vite 7
- Adapter Cloudflare (`@sveltejs/adapter-cloudflare`)
- Bun 1.3+

## Rotas

| Rota | Descrição |
| --- | --- |
| `/` | Home — form de emissão, benefícios, FAQ |
| `/emitir` | Acompanhamento de sessão em andamento |
| `/verificar` | Ferramenta de verificação de certificados SSL |
| `/termos` | Termos de Uso e Política de Privacidade |
| `/*` | Página de erro/404 customizada |

## Integração com a API

O frontend se comunica com o backend via proxy Cloudflare Worker (`PUBLIC_API_BASE_URL`).

Endpoints usados:

| Método | Rota | Descrição |
| --- | --- | --- |
| `POST` | `/api/v1/certificates/sessions` | Criar sessão de emissão |
| `GET` | `/api/v1/certificates/sessions/{id}` | Consultar sessão |
| `POST` | `/api/v1/certificates/sessions/{id}/verification-code` | Reenviar código |
| `POST` | `/api/v1/certificates/sessions/{id}/verify-email` | Verificar código de e-mail |
| `POST` | `/api/v1/certificates/sessions/{id}/dns-check` | Pré-checar DNS |
| `POST` | `/api/v1/certificates/sessions/{id}/finalize` | Finalizar emissão |
| `GET` | `/api/v1/certificates/check?host=example.com` | Verificar certificado SSL de qualquer site |

## Variáveis de Ambiente

Crie `.env.local` a partir de `.env.example`:

```bash
cp .env.example .env.local
```

| Variável | Descrição | Obrigatória |
| --- | --- | --- |
| `PUBLIC_API_BASE_URL` | URL base do proxy/API | ✓ |
| `PUBLIC_EMAIL_VALIDATION_API_URL` | Endpoint Likn para validação de e-mail | — |
| `PUBLIC_TURNSTILE_SITE_KEY` | Chave pública do Cloudflare Turnstile | — |

Em desenvolvimento local (com `bun run dev`), aponte `PUBLIC_API_BASE_URL` para o wrangler dev do proxy:

```env
PUBLIC_API_BASE_URL=http://localhost:8787
PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA
```

> A chave `1x00000000000000000000AA` é a chave de teste oficial da Cloudflare — sempre aprova o desafio sem exibir captcha.

Em deploy via `wrangler`, as variáveis públicas são lidas do `wrangler.jsonc` (seção `vars`). O `TURNSTILE_SECRET_KEY` (sem prefixo `PUBLIC_`) pertence ao **backend**, não ao frontend.

## Desenvolvimento Local

Pré-requisitos:

- Bun 1.3+
- Backend rodando (Docker Compose recomendado)
- Proxy wrangler dev rodando (`cd proxy && bunx wrangler dev`)

```bash
bun install
cp .env.example .env.local
# Edite .env.local com as URLs locais
bun run dev
```

A stack completa local usa as portas padrão:

- Frontend: `http://localhost:5173`
- Proxy: `http://localhost:8787`
- Backend: `http://localhost:3000`

## Scripts

```bash
bun run dev      # servidor de desenvolvimento (Vite)
bun run w:dev    # servidor de desenvolvimento (Wrangler — emula Cloudflare Workers)
bun run check    # checagem de tipos Svelte/TypeScript
bun run build    # build de produção
bun run preview  # preview local da build
bun run deploy   # build + deploy no Cloudflare Workers
```

## Deploy

Este frontend usa Cloudflare Workers via adapter SvelteKit.

```bash
bunx wrangler login
bun run deploy
```

Variáveis públicas de produção estão em `wrangler.jsonc` (seção `vars`). Segredos (ex.: `TURNSTILE_SECRET_KEY`) devem ser configurados diretamente no Cloudflare Dashboard ou via `wrangler secret put`.

## CI (GitHub Actions)

Pipeline em `.github/workflows/frontend-ci-cd.yml`:

- Roda em `push`, `pull_request` e `workflow_dispatch`
- Etapas: `bun install --frozen-lockfile` → `bun run check` → `bun run build`

Variables recomendadas no GitHub (Repository Variables):

- `PUBLIC_API_BASE_URL`
- `PUBLIC_EMAIL_VALIDATION_API_URL`
- `PUBLIC_TURNSTILE_SITE_KEY`

## Estrutura

```text
src/
  lib/
    api/certy.ts        ← cliente HTTP da API (todos os endpoints)
    toast.ts            ← sistema de notificações
  routes/
    +layout.svelte      ← layout global (tema, toasts, context menu)
    +page.svelte        ← home (form de emissão + Turnstile)
    +error.svelte       ← página de erro/404
    emitir/
      +page.svelte      ← acompanhamento de sessão
    verificar/
      +page.svelte      ← verificação de certificado SSL
    termos/
      +page.svelte      ← termos de uso e privacidade
  app.css               ← estilos globais
  app.html              ← HTML base (inclui loading screen)
  hooks.server.ts       ← security headers + cache-control
static/
  favicon.svg
  logo.svg
  og/certy-og.svg
  robots.txt
  sitemap.xml
  cursors/
```

## Contribuições

Guia completo em [CONTRIBUTING.md](./CONTRIBUTING.md).

## Licença

Este projeto está sob a licença MIT. Veja [LICENSE](./LICENSE).
