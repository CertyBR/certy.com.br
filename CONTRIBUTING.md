# Contribuindo com o Certy Frontend

Obrigado por contribuir com o Certy.

## Pré-requisitos

- Bun 1.3+
- Git

## Setup local

```bash
bun install
cp .env.example .env
bun run dev
```

## Fluxo recomendado

1. Faça fork do repositório.
2. Crie uma branch descritiva:
   - `feat/...` para funcionalidade
   - `fix/...` para correção
   - `chore/...` para manutenção
   - `docs/...` para documentação
3. Implemente sua mudança com foco em escopo pequeno e objetivo.
4. Valide localmente:
   - `bun run check`
   - `bun run build`
5. Abra um Pull Request com contexto claro.

## Padrões do projeto

- Use Bun. Não use npm neste projeto.
- Use TypeScript em todas as novas implementações de frontend.
- Preserve o estilo visual e o padrão de UX já adotados.
- Evite introduzir logs de debug no código final.
- Nunca commitar segredos, chaves ou `.env` real.

## O que incluir no Pull Request

- Objetivo da mudança.
- Resumo técnico do que foi alterado.
- Impactos esperados (UX, API, SEO, etc.).
- Evidências visuais quando houver mudanças de interface (prints/gifs).

## Checklist rápido antes de enviar

- O código compila e passa em `bun run check`.
- A build de produção funciona com `bun run build`.
- Não há arquivos sensíveis no commit.
- O escopo do PR está claro e sem mudanças não relacionadas.

## Reportar problemas

Para bugs e sugestões, abra uma Issue no repositório oficial:

- https://github.com/CertyBR/certy.com.br
