import fs from "fs";
import { parseWordDocument } from "./lib/wordParser";

async function test() {
  try {
    // 读取test.docx文件   职业卫生技术服务机构应当在有效期届满三个月前向原资质认可机关提出延续申请
    const buffer = fs.readFileSync("./allquestions.docx");

    // 解析文档
    const questions = await parseWordDocument(buffer);

    console.log(`\n成功解析了 ${questions.length} 道题目`);
    console.log("========================================");

    // 打印前10道题目
    questions.forEach((q, index) => {
      console.log(
        `${index + 1}. 题目类型：${
          q.type === "single"
            ? "单选题"
            : q.type === "multiple"
            ? "多选题"
            : "判断题"
        }`
      );
      console.log(`   题目：${q.content}`);

      if (q.options && q.options.length > 0) {
        console.log("   选项：");
        q.options.forEach((option) => {
          console.log(`   ${option}`);
        });
      }

      console.log(`   答案：${q.correctAnswer}`);
      console.log("---");
    });

    // 与预期结果比较
    console.log("\n=== 与预期结果比较 ===");
    const expectedCount = 10;
    if (questions.length >= expectedCount) {
      console.log(`✅ 成功解析至少${expectedCount}道题目`);
    } else {
      console.log(
        `❌ 只解析了${questions.length}道题目，预期${expectedCount}道`
      );
    }
  } catch (error) {
    console.error("测试失败:", error);
  }
}

test();
