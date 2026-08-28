# Baseline

This tree is a fork of [QuantumNous/new-api](https://github.com/QuantumNous/new-api) locked to **v1.0.0-rc.26**.

Secondary-development notes, Docker/GHCR, and what must not be committed: the repository root [`README.md`](../../README.md).

Do not track `calciumion/new-api:latest` in production.

## License

- The upstream project is **AGPLv3**. Keep the copyright headers, footer links, and `LICENSE` file.
- Commercial licensing of the upstream project is a separate path through QuantumNous (`support@quantumnous.com`). This overlay does not replace that.

## What we verified here

- Source archive: `https://codeload.github.com/QuantumNous/new-api/tar.gz/refs/tags/v1.0.0-rc.26`
- Official `docker-compose.yml` is kept as-is except when you switch the image name (see `DEPLOY.md`).
- This environment does not have Docker installed, so Compose was not started locally. Use the official compose file (or `docker-compose.omnigateway.yml`) on a host that has Docker.

## Upgrade rule

Cherry-pick official commits onto the locked tag. Never `git pull` `main`/`latest` into production.
