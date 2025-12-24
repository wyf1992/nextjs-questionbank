import mammoth from "mammoth";

export interface ParsedQuestion {
  type: "single" | "multiple" | "judge";
  content: string;
  options?: string[];
  correctAnswer: string;
  explanation?: string;
}

// 解析 Word 文档
export async function parseWordDocument(
  buffer: Buffer
): Promise<ParsedQuestion[]> {
  const questions: ParsedQuestion[] = [];
  const result = await mammoth.convertToHtml({ buffer });
  const htmlText = result.value;

  // 将HTML转换为纯文本，保留换行
  const text = htmlToPlainText(htmlText);

  console.log("转换后的纯文本内容预览:", text.slice(0, 1000));
  // 按行分割
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  let i = 0;
  const totalLines = lines.length;
  let questionCount = 0;

  // 简单状态机解析
  let currentQuestion: ParsedQuestion | null = null;
  let collectingOptions = false;

  while (i < totalLines && questionCount < 10) {
    const line = lines[i];

    // 检查是否是题目类型标记
    if (line === "单选题" || line === "多选题" || line === "判断题") {
      // 如果已经有题目在收集，先保存
      if (currentQuestion) {
        questions.push(currentQuestion);
        questionCount++;
        currentQuestion = null;
      }

      // 开始新题目
      const type =
        line === "单选题" ? "single" : line === "多选题" ? "multiple" : "judge";
      currentQuestion = {
        type,
        content: "",
        correctAnswer: "",
        options: type === "judge" ? undefined : [],
      };
      collectingOptions = type !== "judge";
      i++;
      continue;
    }

    // 如果当前没有题目，跳过
    if (!currentQuestion) {
      i++;
      continue;
    }

    // 检查是否是答案行
    const answerMatch =
      line.match(/答案[：:]?\s*([对错正确错误A-E]+)/) ||
      line.match(/【答案】\s*([对错正确错误A-E]+)/) ||
      line.match(/答案（\s*([对错正确错误A-E]+)\s*\)/);

    if (answerMatch) {
      if (currentQuestion) {
        currentQuestion.correctAnswer = normalizeAnswer(
          answerMatch[1],
          currentQuestion.type
        );
        questions.push(currentQuestion);
        questionCount++;
        currentQuestion = null;
        collectingOptions = false;
      }
      i++;
      continue;
    }

    // 处理题目内容
    if (currentQuestion.content === "") {
      // 第一行非类型、非答案的内容是题目
      currentQuestion.content = line;
    } else if (collectingOptions && currentQuestion.options) {
      // 收集选项
      if (isOptionLine(line)) {
        // 简单处理选项行
        const optionMatch = line.match(/^([A-E])[、\.\s]\s*(.*)/);
        if (optionMatch) {
          const [, letter, text] = optionMatch;
          currentQuestion.options.push(`${letter}、${text.trim()}`);
        } else {
          currentQuestion.options.push(line);
        }
      }
    }

    i++;
  }

  // 处理最后一个题目
  if (currentQuestion && questionCount < 10) {
    questions.push(currentQuestion);
  }

  return questions;
}

// 将HTML转换为纯文本
function htmlToPlainText(html: string): string {
  // 首先移除章节标题相关的HTML元素
  // 匹配包含章节标题的段落和标题标签
  let processedHtml = html;

  // 移除包含章节标题的<h1>-<h6>标签
  processedHtml = processedHtml.replace(/<h[1-6][^>]*>[^<]*<\/h[1-6]>/g, "");

  // 移除包含章节标题的<p>标签
  processedHtml = processedHtml.replace(
    /<p[^>]*>\s*第\s*(?:[一二三四五六七八九十]+|\d+)\s*[章节][^<]{0,20}<\/p>/g,
    ""
  );

  // 移除包含特定标题的标签
  const titlesToRemove: string[] = [];

  titlesToRemove.forEach((title) => {
    const escapedTitle = title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    processedHtml = processedHtml.replace(
      new RegExp(`<[^>]*>${escapedTitle}<\\/[^>]*>`, "g"),
      ""
    );
  });

  // 处理列表项，添加换行
  let text = processedHtml.replace(/<ol>/g, "");
  text = text.replace(/<\/ol>/g, "\n");
  text = text.replace(/<li>/g, "");
  text = text.replace(/<\/li>/g, "\n");

  // 处理段落和标题
  text = text.replace(/<\/p>/g, "\n");
  text = text.replace(/<\/h[1-6]>/g, "\n");

  // 移除所有HTML标签
  text = text.replace(/<[^>]*>/g, "");

  // 转换HTML实体
  text = text.replace(/&nbsp;/g, " ");
  text = text.replace(/</g, "<");
  text = text.replace(/>/g, ">");
  text = text.replace(/&/g, "&");
  text = text.replace(/"/g, '"');
  text = text.replace(/&#39;/g, "'");

  // 合并多个空格，但保留换行
  text = text.replace(/[ \t]+/g, " ");

  // 合并多个换行
  text = text.replace(/\n\s*\n\s*\n/g, "\n\n");

  return text.trim();
}

// 检查是否是选项行
function isOptionLine(line: string): boolean {
  return (
    /^[A-E][、\s].*/.test(line) ||
    /^[A-E]\./.test(line) ||
    /^[A-E]\s+/.test(line)
  );
}

// 规范化答案
function normalizeAnswer(
  answer: string,
  type: "single" | "multiple" | "judge"
): string {
  if (type === "judge") {
    if (answer.includes("对") || answer.includes("正确") || answer === "√") {
      return "对";
    } else if (
      answer.includes("错") ||
      answer.includes("错误") ||
      answer === "×"
    ) {
      return "错";
    }
    return answer;
  }

  // 选择题答案：移除空格和特殊字符
  return answer.replace(/\s+/g, "").toUpperCase();
}
