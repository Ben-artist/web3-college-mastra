# Web3 College Mastra - 违禁词检测服务

基于 Cloudflare Workers 的文本违禁词检测服务，使用 DeepSeek API 进行智能审核。

## 项目概述

这是一个部署在 Cloudflare Workers 上的文本内容审核服务，通过调用 DeepSeek API 对用户提交的文本进行违禁词检测。服务支持自定义违禁词列表，并提供灵活的检测规则。

## 功能特性

- ✅ **智能违禁词检测**: 使用 DeepSeek LLM 进行语义级别的违禁内容识别
- ✅ **自定义违禁词**: 支持传入自定义违禁词列表，灵活配置检测规则
- ✅ **CORS 支持**: 完整支持跨域请求
- ✅ **错误处理**: 完善的错误处理和降级机制
- ✅ **TypeScript 支持**: 完整的类型定义和类型安全
- ✅ **健康检查**: 提供健康检查接口

## 技术栈

- **运行时**: Cloudflare Workers
- **语言**: TypeScript
- **框架**: Cloudflare Workers API
- **AI 服务**: DeepSeek API (OpenAI 兼容)
- **构建工具**: TypeScript Compiler

## 项目结构

```
web3-college-mastra/
├── src/
│   ├── worker.ts          # Cloudflare Workers 入口文件（HTTP 处理）
│   └── agent-worker.ts    # 违禁词检测核心逻辑
├── dist/                  # 编译输出目录
├── package.json           # 项目配置和依赖
├── tsconfig.json          # TypeScript 配置
├── wrangler.toml          # Cloudflare Workers 部署配置
└── README.md              # 项目文档
```

## 环境配置

### 必需的环境变量（在 Cloudflare Workers 中设置 Secrets）

1. **DEEPSEEK_API_KEY** (必填)
   - DeepSeek API 密钥
   - 设置方式：`wrangler secret put DEEPSEEK_API_KEY`

2. **DEEPSEEK_BASE_URL** (可选)
   - DeepSeek API 基础 URL
   - 默认值：`https://api.deepseek.com`
   - 设置方式：`wrangler secret put DEEPSEEK_BASE_URL`

3. **DEEPSEEK_MODEL_ID** (可选)
   - DeepSeek 模型 ID
   - 默认值：`deepseek-chat`
   - 设置方式：`wrangler secret put DEEPSEEK_MODEL_ID`

## 本地开发

### 安装依赖

```bash
pnpm install
```

### 本地运行

```bash
# 启动开发环境（需要配置 .dev.vars 文件）
pnpm run worker:dev
```

### 构建项目

```bash
# 编译 TypeScript 代码
pnpm run build
```

## 部署

### 1. 配置文件说明

项目包含 `wrangler.toml` 配置文件，用于指定：
- Worker 名称：`web3-college-mastra`
- 入口文件：`src/worker.ts`
- 兼容性日期：`2024-11-02`

如果需要修改 Worker 名称或配置，请编辑 `wrangler.toml` 文件。

### 2. 配置环境变量

```bash
# 登录 Cloudflare
npx wrangler login

# 设置必需的 Secret
npx wrangler secret put DEEPSEEK_API_KEY

# 可选：设置其他配置
npx wrangler secret put DEEPSEEK_BASE_URL
npx wrangler secret put DEEPSEEK_MODEL_ID
```

### 3. 部署到 Cloudflare Workers

```bash
# 部署到生产环境
pnpm run worker:deploy

# 查看日志
pnpm run worker:tail
```

**注意**：部署前确保已创建 `wrangler.toml` 配置文件，否则部署将失败。

## API 接口

### 1. 违禁词检测

**POST** `/moderation/check`

**请求头：**
```
Content-Type: application/json
```

**请求体：**
```json
{
  "text": "待检测的文本内容",
  "customBanned": ["自定义违禁词1", "自定义违禁词2"]  // 可选
}
```

**响应：**
```json
{
  "hasViolation": false,
  "matchedTerms": [],
  "reasoning": "文本内容符合规范，未发现违禁信息。"
}
```

**响应字段说明：**
- `hasViolation`: `boolean` - 是否包含违禁内容
- `matchedTerms`: `string[]` - 匹配到的违禁词列表（最多10个）
- `reasoning`: `string` - 检测依据的中文说明

**错误响应：**
- `400`: 参数校验失败（text 不能为空）
- `500`: 服务器内部错误（API 调用失败等）

### 2. 健康检查

**GET** `/health`

**响应：**
```json
{
  "status": "ok",
  "service": "web3-college-mastra",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## TypeScript 配置

项目使用 `tsconfig.json` 进行 TypeScript 编译配置：

- **编译目标**: ES2022
- **模块系统**: ESNext (支持 ES Modules)
- **类型支持**: `@cloudflare/workers-types`
- **输出目录**: `./dist`
- **源码目录**: `./src`
- **严格模式**: 启用所有严格类型检查

## 使用示例

### JavaScript/TypeScript

```typescript
async function checkText(text: string, customBanned?: string[]) {
  const response = await fetch('https://your-worker.workers.dev/moderation/check', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      customBanned,
    }),
  });

  const result = await response.json();
  return result;
}

// 使用示例
const result = await checkText('这是一段需要检测的文本', ['敏感词1', '敏感词2']);
if (result.hasViolation) {
  console.log('发现违禁内容:', result.matchedTerms);
  console.log('原因:', result.reasoning);
}
```

### curl

```bash
curl -X POST https://your-worker.workers.dev/moderation/check \
  -H "Content-Type: application/json" \
  -d '{
    "text": "待检测文本",
    "customBanned": ["违禁词1", "违禁词2"]
  }'
```

## 注意事项

1. **API 密钥安全**: 请勿在客户端代码中直接使用 API 密钥，应通过 Cloudflare Workers Secrets 管理
2. **速率限制**: DeepSeek API 可能有速率限制，建议在生产环境中实现请求限流
3. **成本控制**: 每次检测都会消耗 DeepSeek API 配额，注意控制调用频率
4. **错误降级**: 当 API 调用失败时，服务会返回安全的降级结果（默认不命中违禁词）

## 开发计划

- [ ] 添加请求限流功能
- [ ] 支持批量文本检测
- [ ] 添加检测历史记录（可选）
- [ ] 支持更多 AI 模型提供商
- [ ] 添加缓存机制减少 API 调用

## 许可证

MIT
