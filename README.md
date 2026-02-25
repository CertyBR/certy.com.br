# Certy Frontend (SvelteKit + Cloudflare Workers)

Landing page frontend da Certy (`certy.com.br`) com estilo minimalista, sem backend acoplado.

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

1. Exponha a API no seu VPS (HTTPS).
2. Defina variáveis `PUBLIC_*` para URL pública do backend.
3. Faça chamadas `fetch` no frontend para os endpoints da API.
