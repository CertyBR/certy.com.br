# Certy Frontend (SvelteKit + TypeScript + Cloudflare Workers)

Frontend da Certy (`certy.com.br`) com fluxo real de emissão conectado ao backend via proxy.

## Requisitos

- Bun 1.3+
- Conta Cloudflare com Wrangler autenticado (`bunx wrangler login`)

## Rodando local

```bash
bun install
cp .env.example .env
bun run dev
```

## Build e deploy

```bash
bun run build
bun run deploy
```

## Integração com backend Rust

1. Defina `PUBLIC_API_BASE_URL` para a URL do proxy Cloudflare (ex.: `https://proxy.certy.com.br`).
2. O frontend cria sessão, exibe registros DNS e finaliza emissão via:
   - `POST /api/v1/certificates/sessions`
   - `GET /api/v1/certificates/sessions/{session_id}`
   - `POST /api/v1/certificates/sessions/{session_id}/finalize`
