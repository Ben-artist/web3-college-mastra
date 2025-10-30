## web3-college-mastra 违禁词检测 Agent

本包使用 Mastra（TypeScript Agent Framework）与 DeepSeek（OpenAI 兼容 API）实现“文本违禁词检测”智能体。你可以调用导出的 `checkForBanned(text, customBanned?)` 来判断一段文本是否包含违禁词或其变体，并获得结构化结果。

参考：Mastra 官网文档与产品介绍（统一模型、工作流、可观测性等能力），见 [Mastra 官网](https://mastra.ai/)。

### 安装与运行

1. 在项目根目录配置 DeepSeek API Key（不要将密钥写入代码仓库）：
   - shell 临时设置：
     ```bash
     export DEEPSEEK_API_KEY="<你的_deepseek_key>"
     export DEEPSEEK_BASE_URL="https://api.deepseek.com"   # 可选，默认此值
     export DEEPSEEK_MODEL_ID="deepseek-chat"               # 可选
     ```

2. 安装依赖并本地运行示例：
   ```bash
   cd web3-college-mastra
   pnpm i # 或 npm i / yarn
   pnpm dev "我想发一些不当的文字..."
   ```

3. 作为库使用：
   ```ts
   import { checkForBanned } from "web3-college-mastra/dist";

   const result = await checkForBanned("待审核文本", ["自定义违禁词A"]);
   ```

### 导出 API

- `checkForBanned(text: string, customBanned?: string[]): Promise<{ hasViolation: boolean; matchedTerms: string[]; reasoning: string; }>`
  - **text**: 待检测文本
  - **customBanned**: 可选，自定义违禁词（精确词条），用来补充或覆盖模型判断
  - 返回：
    - **hasViolation**: 是否命中违禁
    - **matchedTerms**: 实际命中的违禁词或其变体（最多 10 个）
    - **reasoning**: 简短中文说明理由

### 启动本地 HTTP 服务

```bash
pnpm serve
# 默认端口 8787，可通过 PORT=xxxx 覆盖
```

接口：`POST /moderation/check`

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

curl 示例：
```bash
curl -X POST http://localhost:8787/moderation/check \
  -H "Content-Type: application/json" \
  -d '{
    "text": "我想买枪和弹药",
    "customBanned": ["枪", "弹药"]
  }'
```

### 安全与合规

- 强烈建议通过环境变量注入 `DEEPSEEK_API_KEY`，不要将密钥写入 Git。
- 模型输出强制要求 JSON，但仍做了容错解析；解析失败时将安全降级为未命中（`hasViolation=false`）。
- 可在上层业务中对 `hasViolation=true` 的结果进行二次审核（如人工复核）。

### 实现说明

- 使用 Mastra 的 `Agent` + OpenAI 兼容 Provider 接入 DeepSeek：
  - 通过 `baseURL=https://api.deepseek.com` 与 `apiKey=DEEPSEEK_API_KEY`。
  - 模型名默认 `deepseek-chat`，可通过环境变量覆盖。
- 审核提示词（system）要求输出严格 JSON，并约束匹配规则（直接命中或语义相近变体）。

### 参考链接

- Mastra 产品与文档：[Mastra 官网](https://mastra.ai/)


