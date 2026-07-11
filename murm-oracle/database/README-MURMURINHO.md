# Banco Murmurinho

Execute pelo SQLcl ou SQL*Plus dentro da pasta `sind-oracle/database`:

```sql
@install-murmurinho.sql
```

As senhas nunca devem ser gravadas em texto puro. O backend deve gerar `password_hash` com Argon2id ou bcrypt. O token de sessão e o token de recuperação também devem ser gravados apenas como hash.

O login Google deve validar o ID Token no servidor e persistir apenas o identificador `sub` em `murm_user.google_sub`.
