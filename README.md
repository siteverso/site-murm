# Murmurinho

Protótipo Astro com login Google, conta por usuário/e-mail e senha, perfil, definição posterior de senha para contas Google, recuperação local de senha, feed, votos, respostas, compartilhamento e idiomas português/inglês.

## Desenvolvimento

```bash
npm install
npm run dev
```

Acesse `http://localhost:4321`.

## Google

```env
PUBLIC_GOOGLE_CLIENT_ID="SEU_CLIENT_ID.apps.googleusercontent.com"
```

## Idiomas

Os textos ficam separados da estrutura em:

```text
src/i18n/pt-BR.ts
src/i18n/en.ts
```

## Oracle

Os scripts estão em `sind-oracle/database`. Execute:

```sql
@install-murmurinho.sql
```

A autenticação desta versão ainda é local no navegador. Em produção, senha e token Google devem ser validados no backend e a sessão deve usar cookie HTTP-only.
