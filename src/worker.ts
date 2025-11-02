/**
 * Cloudflare Workers 入口文件
 * 将违禁词检测服务适配到 Cloudflare Workers 环境
 */

import { checkForBannedWithEnv, type BannedCheckResult } from "./agent-worker";

// 定义 Workers 环境变量接口
export interface Env {
  DEEPSEEK_API_KEY?: string;
  DEEPSEEK_BASE_URL?: string;
  DEEPSEEK_MODEL_ID?: string;
}

// CORS 响应头
function getCorsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };
}

// 处理 OPTIONS 预检请求
function handleOptions(): Response {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(),
  });
}

// 处理违禁词检测请求
async function handleModerationCheck(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    // 解析请求体
    const body = await request.json() as {
      text?: string;
      customBanned?: string[];
    };

    const text = body?.text ?? "";
    const customBanned = Array.isArray(body?.customBanned)
      ? body.customBanned
      : [];

    // 验证参数
    if (!text || text.trim().length === 0) {
      return new Response(
        JSON.stringify({
          message: "参数校验失败",
          issues: [{ path: ["text"], message: "text 不能为空" }],
        }),
        {
          status: 400,
          headers: getCorsHeaders(),
        }
      );
    }

    // 调用检测函数（传入 env）
    const result = await checkForBannedWithEnv(text, customBanned, env);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: getCorsHeaders(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ message }),
      {
        status: 500,
        headers: getCorsHeaders(),
      }
    );
  } 
}

// Workers fetch handler
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // 处理 OPTIONS 预检请求
    if (request.method === "OPTIONS") {
      return handleOptions();
    }

    // 处理违禁词检测接口
    if (request.method === "POST" && url.pathname === "/moderation/check") {
      return handleModerationCheck(request, env);
    }

    // 健康检查接口
    if (request.method === "GET" && url.pathname === "/health") {
      return new Response(
        JSON.stringify({
          status: "ok",
          service: "web3-college-mastra",
          timestamp: new Date().toISOString(),
        }),
        {
          status: 200,
          headers: getCorsHeaders(),
        }
      );
    }

    // 404 未找到
    return new Response(
      JSON.stringify({ message: "Not Found" }),
      {
        status: 404,
        headers: getCorsHeaders(),
      }
    );
  },
};

