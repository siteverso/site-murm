# Deploy - site-murm

Scripts de desenvolvimento local, preview e deploy no servidor.

## Portas

As portas ficam no `.env` da raiz do projeto:

```env
SITE_MURM_LOCAL_HOST=0.0.0.0
SITE_MURM_LOCAL_PORT=4325
SITE_MURM_REMOTE_HOST=127.0.0.1
SITE_MURM_REMOTE_PORT=3125
```

O modo `dev` e o modo `preview` usam a mesma porta local `4325`, pois apenas um deles é executado por vez.

## Scripts

- `local.dev.sh` — instala dependências e inicia o Astro na porta local `4325`.
- `local.preview.sh` — gera o build e executa localmente na mesma porta `4325`.
- `remote.deploy.sh` — sincroniza o projeto com `/home/sites/site-murm` no servidor.
- `remote.run.sh` — instala, gera o build e inicia/reinicia o processo `site-murm` no PM2, na porta remota `3125`.
- `ssh.sh` — abre o SSH do servidor.
- `auto-clean-root.sh` — importa automaticamente ZIPs `site-murm-*.zip`, remove `Zone.Identifier` e gera `src.zip`.

## Preparação

```bash
cd /home/daniel/Code/site-murm
chmod +x deploy/*.sh
```

## Desenvolvimento local

```bash
./deploy/local.dev.sh
```

## Preview local

```bash
./deploy/local.preview.sh
```

## Deploy remoto

```bash
./deploy/remote.deploy.sh
./deploy/remote.run.sh
```

O Nginx deverá encaminhar o domínio do Murmurinho para:

```text
127.0.0.1:3125
```
