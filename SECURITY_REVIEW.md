# Revisão de Segurança — Certy Frontend

Data: 2026-02-25
Escopo: aplicação SvelteKit (rotas públicas, cliente HTTP, configurações de build/deploy e higiene de segredos no repositório).

## Metodologia

- Leitura estática dos arquivos de aplicação e configuração.
- Execução de checks locais de tipagem/build.
- Verificação de superfícies de ataque comuns para frontend SSR/SPA:
  - XSS, injeção por URL/path e manipulação de parâmetros.
  - Exposição de segredos/versionamento indevido de variáveis de ambiente.
  - Falta de hardening de headers HTTP e políticas de cache em páginas sensíveis.

## Riscos identificados e ações aplicadas

### 1) IDs de sessão em rotas de API sem codificação de segmento

**Risco:** chamadas para endpoints com `sessionId` interpolado diretamente no path podiam aceitar caracteres especiais sem codificação. Isso abria espaço para manipulação de rota no cliente e requisições inesperadas ao backend.

**Ação:** adição de `encodePathSegment()` e uso obrigatório em todos os endpoints que recebem `sessionId`.

**Status:** corrigido.

### 2) Ausência de hardening central de headers HTTP

**Risco:** sem baseline consistente de headers de proteção, a aplicação ficava mais exposta a classes de ataque web (clickjacking, MIME sniffing, permissões desnecessárias, isolamento de origem e controle de embed).

**Ação:** criado `src/hooks.server.ts` com:

- `Content-Security-Policy`
- `X-Content-Type-Options`
- `X-Frame-Options`
- `Referrer-Policy`
- `Permissions-Policy`
- `Cross-Origin-Opener-Policy`
- `Cross-Origin-Resource-Policy`
- `Origin-Agent-Cluster`

Além disso, para `/emitir` (URL com identificador de sessão) foi aplicado `Cache-Control: no-store` e `Pragma: no-cache`.

**Status:** corrigido.

### 3) Arquivo `.env` versionado

**Risco:** versionar `.env` aumenta risco de vazamento de configuração sensível em histórico e forks.

**Ação:** remoção do `.env` do repositório e atualização do `.gitignore` para ignorar `.env` e `.env.*` preservando `.env.example`.

**Status:** corrigido.

## Validações executadas

- `bun run check`.
- `bun run build`.
- Tentativa de auditoria de dependências com npm audit via `bunx` (bloqueada por restrição externa de registry no ambiente de execução).

## Recomendações adicionais

- Ativar varredura contínua de segredos (ex.: Gitleaks/TruffleHog) no CI.
- Ativar auditoria de dependências no CI/CD (npm/bun audit equivalente, SCA).
- Considerar CSP com nonce/hash para remover gradualmente `unsafe-inline`.
- Definir rotação e proteção de variáveis de ambiente em ambientes de deploy.
