# Portas do site-murm

As portas são exclusivas deste projeto e ficam no `.env` da raiz.

```env
SITE_MURM_LOCAL_HOST=0.0.0.0
SITE_MURM_LOCAL_PORT=4325
SITE_MURM_REMOTE_HOST=127.0.0.1
SITE_MURM_REMOTE_PORT=3125
```

- `4325`: usada localmente tanto no modo `dev` quanto no modo `preview`.
- `3125`: usada no servidor remoto pelo processo PM2, atrás do Nginx.

O `.env.example` fica na raiz e pode ser versionado no Git. O `.env` real não deve ser versionado.
