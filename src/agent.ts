// 使用 Mastra 框架集成 DeepSeek
import { Agent } from "@mastra/core";

export type BannedCheckResult = {
  hasViolation: boolean;
  matchedTerms: string[];
  reasoning: string;
};

// 创建违禁词检测 Agent 实例
// 使用 Mastra 的 DeepSeek 集成，模型标识为 "deepseek/deepseek-chat"
// Mastra 会自动使用 DEEPSEEK_API_KEY 环境变量进行认证
const moderationAgent = new Agent({
  name: "banned-content-checker",
  instructions: `你将收到一个待审核文本和一组可选违禁词。严格按照以下要求输出：
- 仅输出一个 JSON 对象，不要任何额外文本或解释
- 结构：{ hasViolation: boolean, matchedTerms: string[], reasoning: string }
- 规则：
  1) hasViolation 为 true 当文本直接或变体匹配到违禁，或语义上包含违禁含义
  2) matchedTerms 为命中的违禁词或其变体（去重，最多 10 个）
  3) reasoning 用简洁中文说明关键依据，避免复述原文`,
  model: process.env.DEEPSEEK_MODEL_ID
    ? `deepseek/${process.env.DEEPSEEK_MODEL_ID}`
    : "deepseek/deepseek-chat"
});

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

  // 构建用户输入，包含待检测文本和自定义违禁词
  const userPrompt = JSON.stringify({
    text,
    customBanned: customBanned ?? []
  });

  try {
    const response = await moderationAgent.generate(userPrompt);

    const content = response.text || "";

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
          : ""
      };
    } catch {
      return {
        hasViolation: false,
        matchedTerms: [],
        reasoning: "模型未返回有效 JSON，已安全降级为未命中。"
      };
    }
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : String(error);
    throw new Error(`DeepSeek 调用失败: ${message}`);
  }
}
