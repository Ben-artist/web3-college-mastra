import 'dotenv/config';
import { checkForBanned } from "./agent";

// 作为库导出
export { checkForBanned } from "./agent";

// 可直接运行的示例（本地开发：pnpm dev 或 npm run dev）
async function main() {
  if (process.env.NODE_ENV === "production") return;

  const sampleText = process.argv.slice(2).join(" ") || "这里是一段待审核的示例文本";
  const result = await checkForBanned(sampleText, [
    // 可添加自定义违禁词，例如：
    // "违禁词A", "敏感词B" 
  ]);

  // eslint-disable-next-line no-console
  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});


