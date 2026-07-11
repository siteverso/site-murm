# Deploy - site-murm

Scripts de desenvolvimento local, preview e deploy no servidor.

## Scripts

- `local.dev.sh` — instala dependências e inicia o Astro em `http://localhost:4324`.
- `local.preview.sh` — gera o build e executa localmente na porta `3002`.
- `remote.deploy.sh` — sincroniza o projeto com `/home/sites/site-murm` no servidor.
- `remote.run.sh` — instala, gera o build e inicia/reinicia o processo `site-murm` no PM2, porta `3002`.
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
127.0.0.1:3002
```
