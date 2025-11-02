/**
 * 适配 Cloudflare Workers 环境的违禁词检测函数
 * 在 Workers 环境中，由于 Mastra 可能不完全兼容，使用直接调用 DeepSeek API 的方式
 */

export type BannedCheckResult = {
  hasViolation: boolean;
  matchedTerms: string[];
  reasoning: string;
};

// Workers 环境变量接口
export interface WorkerEnv {
  DEEPSEEK_API_KEY?: string;
  DEEPSEEK_BASE_URL?: string;
  DEEPSEEK_MODEL_ID?: string;
}

/**
 * 使用 LLM 判断是否包含违禁信息（Workers 环境版本）
 * 在 Workers 环境中直接调用 DeepSeek API，保持与 Mastra 相同的接口和逻辑
 * 
 * 检测范围包括：
 * - 脏话粗口（中英文，包括变体、谐音等）
 * - 辱骂攻击（人身攻击、恶意贬低）
 * - 性暗示色情内容
 * - 暴力威胁
 * - 歧视言论
 * - 其他不当、冒犯性表达
 * 
 * 采用零容忍策略，即使是轻微程度的脏话或不文明用语也会被标记为违规。
 * 
 * @param text 待检测文本
 * @param customBanned 可选：自定义违禁词（精确词条），用于覆盖或补充
 * @param env Workers 环境变量对象
 */
export async function checkForBannedWithEnv(
  text: string,
  customBanned: string[] | undefined,
  env: WorkerEnv
): Promise<BannedCheckResult> {
  if (!env.DEEPSEEK_API_KEY) {
    throw new Error(
      "DEEPSEEK_API_KEY 未配置。请在 Cloudflare Workers 中设置 Secret。"
    );
  }

  const baseURL = env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";
  const modelId = env.DEEPSEEK_MODEL_ID || "deepseek-chat";

  const systemPrompt = `你是一个严格的内容审核系统，负责检测文本中的违禁内容。严格按照以下要求输出：
- 仅输出一个 JSON 对象，不要任何额外文本或解释
- 结构：{ hasViolation: boolean, matchedTerms: string[], reasoning: string }

违禁内容类型（必须严格检测，包括中英文）：
1. 脏话粗口：任何脏话、粗俗语言、不文明用语（如：f*ck, sh*t, 操, 靠, 妈, 日等及其变体）
2. 辱骂攻击：任何形式的辱骂、人身攻击、恶意贬低（如：傻逼, 白痴, 蠢货, idiot, stupid, asshole等）
3. 性暗示色情：性暗示、色情内容、低俗表达（包括中英文）
4. 暴力威胁：暴力威胁、恐吓性语言
5. 歧视言论：种族、性别、地域等歧视性语言
6. 敏感政治：政治敏感内容（如需要）
7. 其他不当内容：任何不文明、不礼貌、冒犯性的表达

检测规则（必须严格遵守）：
1. hasViolation 为 true 当文本满足以下任一条件：
   - 直接包含违禁词（完全匹配）
   - 包含违禁词的变体（拼音、谐音、拆分、字符替换、符号插入等）
   - 语义上明显包含违禁含义（即使没有直接使用违禁词）
   - 使用委婉表达但明显指向违禁内容
   - 轻微程度的脏话或不文明用语也必须标记

2. matchedTerms 数组：
   - 包含所有命中的违禁词或其变体（去重）
   - 如果是语义违规，标注关键触发词
   - 最多 10 个，按严重程度排序

3. reasoning 说明：
   - 用简洁中文说明违规类型和关键依据
   - 标注是直接匹配、变体匹配还是语义匹配
   - 避免复述原文

重要：对脏话、辱骂等不文明用语必须零容忍，即使轻微程度也要标记为违规。`;

  const userPrompt = `请严格检测以下文本中的违禁内容（包括脏话、辱骂、不文明用语等，中英文都要检测）：

待检测文本：
${text}

${customBanned && customBanned.length > 0 
    ? `\n自定义违禁词列表（请优先匹配）：\n${customBanned.join(', ')}` 
    : ''}

请仔细检查文本中的：
- 所有脏话、粗口、不文明用语（直接出现、变体、谐音等）
- 任何形式的辱骂、人身攻击、贬低性语言
- 性暗示、色情、低俗内容
- 暴力威胁、恐吓性语言
- 歧视性言论
- 其他不当、冒犯性表达

即使是轻微程度的脏话或不文明用语也必须标记为违规。`;

  // 在 Workers 环境中直接调用 DeepSeek API
  const resp = await fetch(`${baseURL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: modelId,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0,
      response_format: { type: "json_object" },
      max_tokens: 300,
    }),
  });

  if (!resp.ok) {
    const detail = await resp.text();
    throw new Error(`DeepSeek 调用失败: ${detail}`);
  }

  const data = (await resp.json()) as any;
  const content = data?.choices?.[0]?.message?.content ?? "";
  const jsonMatch = typeof content === "string"
    ? content.match(/\{[\s\S]*\}$/)
    : null;
  const jsonStr = jsonMatch ? jsonMatch[0] : content;

  try {
    const parsed = JSON.parse(jsonStr);
    return {
      hasViolation: Boolean(parsed.hasViolation),
      matchedTerms: Array.isArray(parsed.matchedTerms)
        ? parsed.matchedTerms
        : [],
      reasoning: typeof parsed.reasoning === "string"
        ? parsed.reasoning
        : "",
    };
  } catch {
    return {
      hasViolation: false,
      matchedTerms: [],
      reasoning: "模型未返回有效 JSON，已安全降级为未命中。",
    };
  }
}

