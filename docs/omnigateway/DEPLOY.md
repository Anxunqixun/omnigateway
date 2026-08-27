# Deploy overlay

1. Build the image from this tree (`Dockerfile` is the official one).
2. Copy `docker-compose.yml` from the locked tag (already in this repo).
3. Change **only** the image name, as in `docker-compose.omnigateway.yml`.

```bash
docker compose -f docker-compose.omnigateway.yml up -d
```

Do not set the image to `calciumion/new-api:latest`.

On upgrade, cherry-pick official patches, rebuild the same image name, and recreate the container. Volumes and the rest of Compose stay official.
