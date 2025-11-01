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

  const systemPrompt = `你将收到一个待审核文本和一组可选违禁词。严格按照以下要求输出：
- 仅输出一个 JSON 对象，不要任何额外文本或解释
- 结构：{ hasViolation: boolean, matchedTerms: string[], reasoning: string }
- 规则：
  1) hasViolation 为 true 当文本直接或变体匹配到违禁，或语义上包含违禁含义
  2) matchedTerms 为命中的违禁词或其变体（去重，最多 10 个）
  3) reasoning 用简洁中文说明关键依据，避免复述原文`;

  const userPrompt = JSON.stringify({
    text,
    customBanned: customBanned ?? [],
  });

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

