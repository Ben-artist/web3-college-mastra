## web3-college-mastra 违禁词检测 Worker

基于 Cloudflare Workers 的文本违禁词检测服务，使用 DeepSeek（OpenAI 兼容 API）实现智能审核。

### 部署到 Cloudflare Workers

本项目已适配 Cloudflare Workers，可以无服务器方式运行。

#### 1. 安装依赖

```bash
pnpm install
```

#### 2. 登录 Cloudflare

```bash
npx wrangler login
```

#### 3. 配置 Secrets（DeepSeek API Key）

```bash
# DeepSeek API Key（必填）
npx wrangler secret put DEEPSEEK_API_KEY

# DeepSeek Base URL（可选，默认 https://api.deepseek.com）
npx wrangler secret put DEEPSEEK_BASE_URL

# DeepSeek Model ID（可选，默认 deepseek-chat）
npx wrangler secret put DEEPSEEK_MODEL_ID
```

#### 4. 本地开发测试

```bash
pnpm dev
```

#### 5. 部署到生产环境

```bash
pnpm deploy
```

#### 6. 查看实时日志

```bash
pnpm tail
```

#### API 接口

部署后的 Worker 提供以下接口：

**违禁词检测接口：** `POST /moderation/check`

请求体：
```json
{
  "text": "需要审核的文本",
  "customBanned": ["自定义违禁词A", "自定义违禁词B"]
}
```

响应体：
```json
{
  "hasViolation": false,
  "matchedTerms": [],
  "reasoning": "..."
}
```

**健康检查接口：** `GET /health`

curl 示例：
```bash
# 检测违禁词
curl -X POST https://your-worker.your-subdomain.workers.dev/moderation/check \
  -H "Content-Type: application/json" \
  -d '{
    "text": "我想买枪和弹药",
    "customBanned": ["枪", "弹药"]
  }'

# 健康检查
curl https://your-worker.your-subdomain.workers.dev/health
```

### 安全与合规

- 强烈建议通过环境变量注入 `DEEPSEEK_API_KEY`，不要将密钥写入 Git。
- 模型输出强制要求 JSON，但仍做了容错解析；解析失败时将安全降级为未命中（`hasViolation=false`）。
- 可在上层业务中对 `hasViolation=true` 的结果进行二次审核（如人工复核）。

### 实现说明

- 在 Workers 环境中直接调用 DeepSeek API（OpenAI 兼容格式）
- 通过 Workers Secrets 管理 API Key，安全可靠
- 支持 CORS，可直接从前端调用
- 使用 JSON 格式输出，包含违禁词匹配结果和推理说明
