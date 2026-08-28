# Omnigateway 二次开发说明

本仓库是 [QuantumNous/new-api](https://github.com/QuantumNous/new-api) **v1.0.0-rc.26** 的下游二次开发，上游品牌、版权、许可证与署名保持不变（AGPLv3）。

不要把生产环境的镜像跟踪为 `calciumion/new-api:latest`。升级时在锁定标签上 cherry-pick 官方补丁，再重新构建本仓库镜像。

更细的计费表达式语法见 [`pkg/billingexpr/expr.md`](../../pkg/billingexpr/expr.md)。官方基线见 [`BASELINE.md`](./BASELINE.md)。

## 本仓库相对官方多了什么

### 售价（四选一，互斥）

每个模型只能选一种售价方式：

| 模式 | 含义 |
| --- | --- |
| 按 Token | 官方倍率 / 单价 |
| 按次 | 固定次数价 |
| `tiered_expr` | 官方表达式引擎（已有配置不要自动改成 `formula`） |
| `formula` | 本仓库新增的按公式售价 |

`input_seconds` 只用于本站计费，禁止发给上游。

### 倍率与成本

- 售价额度：`底价 × 分组倍率 × 用户模型倍率`
- 成本公式独立计算，**永不**乘分组倍率，也**永不**乘用户模型倍率
- 未配置成本时，利润看板显示为「—」

用户模型倍率在用户编辑页配置，只影响该用户、该模型的售价。

### 文档

- 前台 `/docs`：按分组展示已发布的接口文档，支持试跑
- 后台 `/api-docs`：统一管理独立文档和渠道 `api_docs`
- 渠道默认文档 id 为 `channel:{id}`，模型覆盖为 `channel:{id}:model:{name}`
- 渠道文档写回 `settings`，不走完整的 `channel.Update()`

系统设置里的公式说明 / 试算也在模型定价页，不再单独占一个系统设置分区。

### 其它

- 利润看板与流量图沿用官方数据通道，本仓库只补了计费视图和空数据保护
- 反代、通配域名、DNS、证书属于部署机 OpenResty / DNS 配置，**不在本仓库源码里**

## 不要提交的内容

下列内容禁止进入 Git：

- `.env`、真实数据库 / Redis 密码、`SESSION_SECRET`
- SSH 私钥、服务器密码、面板 Token、云厂商 Secret
- 证书私钥（`privkey.pem` 等）
- 部署机地址、内网 IP、1Panel 路径、线上域名清单
- 本地探测脚本目录 `.local-tests/`（已在 `.gitignore`）
- `docker save` 出来的镜像 tar / zip（体积大，且容易把构建缓存和本地配置打进去）

示例密码只出现在 Compose 样例里，部署前必须改掉。

## Docker：不要把镜像包丢进仓库

可以把镜像发布到 GitHub，但正确做法是 **GitHub Actions 构建后推到 GitHub Container Registry (GHCR)**，而不是把 `*.tar` 提交到 Git。

| 做法 | 建议 |
| --- | --- |
| `docker save` 后把 tar 上传到仓库 | 不建议。仓库会迅速膨胀，也无法自动更新 |
| GitHub Release 挂镜像附件 | 可以应急，仍然巨大且手工作业 |
| **Actions → `ghcr.io/<owner>/<repo>`** | 推荐。推送代码或打 tag 后自动打包 |

本仓库工作流：`.github/workflows/docker-ghcr.yml`

- 推送到 `main` / `feature/omnigateway`，或推送 `v*` 标签，或手动 Run workflow
- 产物：`ghcr.io/anxunqixun/omnigateway`
- 常用标签：`latest`（默认分支）、`<branch>`、`sha-<短哈希>`、版本 tag
- 使用 `GITHUB_TOKEN`，不必再配 Docker Hub
- 官方那条推 `calciumion/new-api` 的 workflow 只在上游官方仓库执行，本 fork 不会去推官方 Hub

仓库如果是私有的，拉镜像前先登录：

```bash
echo YOUR_GITHUB_PAT | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
```

PAT 只需要 `read:packages`（拉）或 `write:packages`（本机手动推）。Actions 自动推不需要你再配这个。

首次使用 GHCR 时，到仓库 **Packages** 里把 `omnigateway` 的可见性调成你需要的（私有/公开）。公开仓库默认镜像也可公开。

## 本地构建

```bash
docker build -t ghcr.io/anxunqixun/omnigateway:local .
```

`relaykit/` 必须能独立编译：

```bash
cd relaykit && GOWORK=off go build ./...
```

Windows 本机如果没有 `go.exe`，在有 Go 的机器或 CI 里编译即可。

## 部署

1. 复制 `env.omnigateway.example` 为 `.env`，改掉全部密码和 `SESSION_SECRET`
2. 使用本仓库的 Compose 覆盖，不要直接跑官方 `calciumion/new-api:latest`

```bash
docker compose -f docker-compose.omnigateway.yml --env-file .env up -d
```

或先等 GitHub Actions 打出镜像再拉：

```bash
docker pull ghcr.io/anxunqixun/omnigateway:latest
```

数据目录 `./data`、日志 `./logs` 不要提交。多机部署必须设置独立的 `SESSION_SECRET`。

## 升级官方补丁

1. 确认当前仍锁定在 `v1.0.0-rc.26` 的提交之上
2. cherry-pick 官方修复，不要直接 `git pull` 官方 `main`
3. 跑本仓库相关测试，再推送，让 Actions 重新出镜像

## 许可证

上游为 **AGPLv3**。保留版权头、页脚链接和 `LICENSE`。商业许可走 QuantumNous（`support@quantumnous.com`），本二次开发不替代该路径。
