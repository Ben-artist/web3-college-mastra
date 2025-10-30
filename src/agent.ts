// 使用 DeepSeek 的 OpenAI 兼容 REST，避免 SDK 版本差异
export type BannedCheckResult = {
  hasViolation: boolean;
  matchedTerms: string[];
  reasoning: string;
};

/**
 * 使用 LLM 判断是否包含违禁信息。
 * @param text 待检测文本
 * @param customBanned 可选：自定义违禁词（精确词条），用于覆盖或补充
 */
export async function checkForBanned(
  text: string,
  customBanned?: string[]
): Promise<BannedCheckResult> {
  if (!process.env.DEEPSEEK_API_KEY) {
    throw new Error(
      "DEEPSEEK_API_KEY 未配置。请设置环境变量或在 .env 中提供。"
    );
  }

  const baseURL = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";
  const modelId = process.env.DEEPSEEK_MODEL_ID || "deepseek-chat";

  const systemPrompt = `你将收到一个待审核文本和一组可选违禁词。严格按照以下要求输出：\n- 仅输出一个 JSON 对象，不要任何额外文本或解释\n- 结构：{ hasViolation: boolean, matchedTerms: string[], reasoning: string }\n- 规则：\n  1) hasViolation 为 true 当文本直接或变体匹配到违禁，或语义上包含违禁含义\n  2) matchedTerms 为命中的违禁词或其变体（去重，最多 10 个）\n  3) reasoning 用简洁中文说明关键依据，避免复述原文`;

  const userPrompt = { text, customBanned: customBanned ?? [] };

  const resp = await fetch(`${baseURL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`
    },
    body: JSON.stringify({
      model: modelId,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: JSON.stringify(userPrompt) }
      ],
      temperature: 0,
      response_format: { type: "json_object" },
      max_tokens: 300
    })
  });

  if (!resp.ok) {
    const detail = await resp.text();
    throw new Error(`DeepSeek 调用失败: ${detail}`);
  }

  const data = (await resp.json()) as any;
  const content = data?.choices?.[0]?.message?.content ?? "";
  const jsonMatch = typeof content === "string" ? content.match(/\{[\s\S]*\}$/) : null;
  const jsonStr = jsonMatch ? jsonMatch[0] : content;

  try {
    const parsed = JSON.parse(jsonStr);
    return {
      hasViolation: Boolean(parsed.hasViolation),
      matchedTerms: Array.isArray(parsed.matchedTerms) ? parsed.matchedTerms : [],
      reasoning: typeof parsed.reasoning === "string" ? parsed.reasoning : ""
    };
  } catch {
    return {
      hasViolation: false,
      matchedTerms: [],
      reasoning: "模型未返回有效 JSON，已安全降级为未命中。"
    };
  }
}


