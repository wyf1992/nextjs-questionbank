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
  const result = await mammoth.extractRawText({ buffer });
  const text = result.value;

  // 按行分割
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const questions: ParsedQuestion[] = [];
  let currentType: "single" | "multiple" | "judge" | null = null;
  let currentQuestion: {
    type: "single" | "multiple" | "judge";
    lines: string[];
  } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 检查是否是题型标题行
    if (line.includes("单选题")) {
      currentType = "single";
      continue;
    } else if (line.includes("多选题")) {
      currentType = "multiple";
      continue;
    } else if (line.includes("判断题")) {
      currentType = "judge";
      continue;
    }

    // 如果没有当前题型，尝试从内容推断
    if (!currentType) {
      if (line.includes("单选") || /答案[:：]\s*[A-Z]$/.test(line)) {
        currentType = "single";
      } else if (line.includes("多选") || /答案[:：]\s*[A-Z]{2,}/.test(line)) {
        currentType = "multiple";
      } else if (line.includes("判断") || /答案[:：]\s*[对错√×]/i.test(line)) {
        currentType = "judge";
      }
    }

    if (!currentType) continue;

    // 检查是否是新的题目开始
    const isNewQuestion = isQuestionStart(line, currentType);

    if (isNewQuestion && currentQuestion) {
      // 解析当前题目
      const question = parseQuestion(
        currentQuestion.lines,
        currentQuestion.type
      );
      if (question) {
        questions.push(question);
      }
      currentQuestion = { type: currentType, lines: [line] };
    } else if (isNewQuestion && !currentQuestion) {
      // 开始第一个题目
      currentQuestion = { type: currentType, lines: [line] };
    } else if (currentQuestion) {
      // 继续当前题目
      currentQuestion.lines.push(line);
    }
  }

  // 解析最后一个题目
  if (currentQuestion) {
    const question = parseQuestion(currentQuestion.lines, currentQuestion.type);
    if (question) {
      questions.push(question);
    }
  }

  return questions;
}

// 判断是否是题目开始
function isQuestionStart(
  line: string,
  type: "single" | "multiple" | "judge"
): boolean {
  // 如果是选项行，不是新题目
  if (/^[A-Z][.、．)]/.test(line)) {
    return false;
  }

  // 如果是答案行，不是新题目
  if (/答案[:：]/.test(line)) {
    return false;
  }

  // 如果一行只包含括号答案，不是新题目
  if (/^[（(]\s*[A-Z对错√×]+\s*[）)]$/.test(line)) {
    return false;
  }

  // 如果一行以"答案"结尾，不是新题目
  if (/答案[:：]\s*[A-Z对错√×]$/i.test(line)) {
    return false;
  }

  // 对于判断题，如果包含括号答案，可能是题目
  if (type === "judge" && /[（(]\s*[对错√×]\s*[）)]/.test(line)) {
    return true;
  }

  // 对于选择题，如果包含括号答案，可能是题目
  if (
    (type === "single" || type === "multiple") &&
    /[（(]\s*[A-Z]+\s*[）)]/.test(line)
  ) {
    return true;
  }

  // 检查是否是常见的问题开头模式
  const isQuestionPattern =
    line.endsWith("是") ||
    line.endsWith("?") ||
    line.endsWith("？") ||
    line.endsWith(":") ||
    line.endsWith("：") ||
    line.includes("下列") ||
    line.includes("哪些") ||
    line.includes("什么") ||
    line.includes("如何") ||
    line.includes("为什么") ||
    line.includes("可引起") ||
    line.includes("可导致") ||
    line.includes("可接触") ||
    line.includes("属于") ||
    line.includes("包括") ||
    line.includes("主要损害") ||
    line.includes("主要影响") ||
    line.includes("主要作用") ||
    line.includes("主要表现") ||
    line.includes("主要特征");

  // 其他情况：不是选项、不是答案，长度合适，且符合问题模式
  // 对于包含特定关键词的题目，即使长度较短也识别为新题目
  const hasQuestionKeywords =
    line.includes("可引起") ||
    line.includes("可导致") ||
    line.includes("可接触") ||
    line.includes("属于") ||
    line.includes("包括") ||
    line.includes("下列") ||
    line.includes("哪些") ||
    line.includes("什么") ||
    line.includes("如何") ||
    line.includes("为什么");

  return (
    !line.includes("单选题") &&
    !line.includes("多选题") &&
    !line.includes("判断题") &&
    ((line.length >= 5 && isQuestionPattern) ||
      line.length > 10 ||
      (line.length >= 5 && hasQuestionKeywords))
  );
}

// 解析题目
function parseQuestion(
  lines: string[],
  type: "single" | "multiple" | "judge"
): ParsedQuestion | null {
  const fullText = lines.join(" ").trim();
  if (!fullText) return null;

  let content = "";
  const options: string[] = [];
  let correctAnswer = "";

  // 提取答案
  if (type === "single" || type === "multiple") {
    // 尝试从括号中提取答案：如（C）或（ABCD）
    const bracketMatch = fullText.match(/[（(]\s*([A-Z]+)\s*[）)]/);
    if (bracketMatch) {
      correctAnswer =
        type === "single"
          ? bracketMatch[1]
          : bracketMatch[1].split("").sort().join("");
    } else {
      // 尝试从答案前缀提取
      const answerMatch = fullText.match(/答案[:：]\s*([A-Z]+)/);
      if (answerMatch) {
        correctAnswer =
          type === "single"
            ? answerMatch[1]
            : answerMatch[1].split("").sort().join("");
      }
    }
  } else if (type === "judge") {
    // 判断题答案
    const bracketMatch = fullText.match(/[（(]\s*([对错√×])\s*[）)]/);
    if (bracketMatch) {
      const answerText = bracketMatch[1];
      correctAnswer = /对|√/i.test(answerText) ? "对" : "错";
    } else {
      const answerMatch = fullText.match(/答案[:：]\s*([对错√×])/i);
      if (answerMatch) {
        const answerText = answerMatch[1];
        correctAnswer = /对|√/i.test(answerText) ? "对" : "错";
      }
    }
  }

  // 提取选项（选择题）
  if (type === "single" || type === "multiple") {
    // 改进的选项匹配：匹配A．选项内容（不包含答案文本）
    // 先尝试匹配所有选项，然后清理每个选项
    const optionRegex =
      /([A-Z])[.、．]\s*([^A-Z]+?)(?=\s+[A-Z][.、．]|答案[:：]|$)/g;
    let match;
    while ((match = optionRegex.exec(fullText)) !== null) {
      let optionText = match[2].trim();

      // 清理选项文本：去除可能包含的答案文本
      optionText = optionText.replace(/\s*答案[:：]\s*[A-Z对错√×]+/g, "");
      optionText = optionText.replace(/\s*[（(]\s*[A-Z对错√×]+\s*[）)]/g, "");

      if (optionText) {
        options.push(optionText.trim());
      }
    }

    // 如果上面的方法没有找到选项，尝试另一种方法
    if (options.length === 0) {
      const optionMatches = fullText.match(/([A-Z])[.、．]\s*([^A-Z.、．]+)/g);
      if (optionMatches) {
        optionMatches.forEach((opt) => {
          const optMatch = opt.match(/([A-Z])[.、．]\s*(.+)/);
          if (optMatch) {
            let optionText = optMatch[2].trim();
            // 清理选项文本
            optionText = optionText.replace(/\s*答案[:：]\s*[A-Z对错√×]+/g, "");
            optionText = optionText.replace(
              /\s*[（(]\s*[A-Z对错√×]+\s*[）)]/g,
              ""
            );
            if (optionText) {
              options.push(optionText);
            }
          }
        });
      }
    }
  }

  // 提取题目内容
  content = fullText;

  // 去除答案部分
  if (type === "single" || type === "multiple") {
    // 去除括号答案
    content = content.replace(/[（(]\s*[A-Z]+\s*[）)]/g, "( )");
    // 去除答案前缀
    content = content.replace(/答案[:：]\s*[A-Z]+/g, "");
  } else if (type === "judge") {
    // 去除括号答案
    content = content.replace(/[（(]\s*[对错√×]\s*[）)]/g, "( )");
    // 去除答案前缀
    content = content.replace(/答案[:：]\s*[对错√×]/gi, "");
  }

  // 去除选项
  if (options.length > 0) {
    options.forEach((opt, index) => {
      const optionLetter = String.fromCharCode(65 + index);
      const escapedOpt = opt.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const optionPattern = new RegExp(
        `${optionLetter}[.、．)]\\s*${escapedOpt}`,
        "g"
      );
      content = content.replace(optionPattern, "");
    });
  }

  // 清理内容
  content = content
    .replace(/^\d+[.、．)]\s*/, "")
    .replace(/\s+/g, " ")
    .trim();

  // 如果内容为空，使用原始文本（去除答案和选项）
  if (!content) {
    content = fullText;
    if (type === "single" || type === "multiple") {
      content = content.replace(/[（(]\s*[A-Z]+\s*[）)]/g, "");
      content = content.replace(/答案[:：]\s*[A-Z]+/g, "");
    } else if (type === "judge") {
      content = content.replace(/[（(]\s*[对错√×]\s*[）)]/g, "");
      content = content.replace(/答案[:：]\s*[对错√×]/gi, "");
    }
    content = content.trim();
  }

  // 验证
  if (!content) return null;
  if ((type === "single" || type === "multiple") && options.length === 0)
    return null;

  return {
    type,
    content,
    options: type === "judge" ? undefined : options,
    correctAnswer: correctAnswer || (type === "judge" ? "对" : "A"),
  };
}
