# Deploy overlay

1. Copy `env.omnigateway.example` to `.env` and replace every placeholder.
2. Prefer the image published by GitHub Actions: `ghcr.io/anxunqixun/omnigateway`.
3. Or build locally from this tree (`Dockerfile` is the official one).

```bash
docker compose -f docker-compose.omnigateway.yml --env-file .env up -d
```

Do not set the image to `calciumion/new-api:latest`.

On upgrade, cherry-pick official patches, rebuild or wait for GHCR, and recreate the container. Volumes and the rest of Compose stay official.

Do not put host IPs, SSH credentials, panel tokens, or certificate private keys in this repository.
