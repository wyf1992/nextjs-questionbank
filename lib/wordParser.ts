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

  while (i < totalLines) {
    const line = lines[i];

    // 检查是否是题目类型标记
    if (
      line.length < 8 &&
      (line.includes("单选题") ||
        line.includes("多选题") ||
        line.includes("判断题"))
    ) {
      // 如果已经有题目在收集，先保存
      if (currentQuestion) {
        // 如果当前题目还没有答案，尝试从内容中提取答案
        if (currentQuestion.correctAnswer === "") {
          extractAnswerFromContent(currentQuestion);
        }
        questions.push(currentQuestion);
        questionCount++;
        currentQuestion = null;
      }

      // 开始新题目
      let type: "single" | "multiple" | "judge";
      if (line.includes("单选题")) {
        type = "single";
      } else if (line.includes("多选题")) {
        type = "multiple";
      } else {
        type = "judge";
      }

      currentQuestion = {
        type,
        content: "",
        correctAnswer: "",
        options: type === "judge" ? undefined : [],
      };
      collectingOptions = type !== "judge";

      if (currentQuestion.correctAnswer === "") {
        extractAnswerFromContent(currentQuestion);
      }

      i++;
      continue;
    }

    // 检查是否是答案行（支持更多格式）
    const answerMatch =
      /^(?:[【(（\s]{0,4}答案[】(（\s]{0,4})[：:（(]?\s{0,2}([A-E√×对错正确错误]+)\s{0,2}[)）]?.{0,6}$/.exec(
        line
      );

    if (answerMatch) {
      if (currentQuestion) {
        // 如果答案包含"对"、"错"等字样，但当前题目类型不是判断题，则修正类型
        const answer = answerMatch[1];
        if (isJudgeAnswer(answer) && currentQuestion.type !== "judge") {
          currentQuestion.type = "judge";
          currentQuestion.options = undefined;
        }

        currentQuestion.correctAnswer = normalizeAnswer(
          answer,
          currentQuestion.type
        );
        currentQuestion.type = isMulipleAnswer(currentQuestion.correctAnswer)
          ? "multiple"
          : isSingleAnswer(currentQuestion.correctAnswer)
          ? "single"
          : currentQuestion.type;

        questions.push(currentQuestion);
        questionCount++;
        currentQuestion = null;
        collectingOptions = false;
      } else {
        // 如果没有当前题目，但遇到了答案行，说明上一个题目可能没有正确结束
        // 尝试从上一行开始新的题目
        if (i > 0) {
          const prevLine = lines[i - 1];
          // 检查上一行是否是题目内容
          if (prevLine && !isOptionLine(prevLine) && !isAnswerLine(prevLine)) {
            // 根据答案类型推断题目类型
            const answer = answerMatch[1];
            let type: "single" | "multiple" | "judge" = "single";
            if (isJudgeAnswer(answer)) {
              type = "judge";
            } else if (answer.length > 1) {
              type = "multiple";
            }

            currentQuestion = {
              type,
              content: prevLine,
              correctAnswer: normalizeAnswer(answer, type),
              options: type === "judge" ? undefined : [],
            };

            currentQuestion.type = isMulipleAnswer(
              currentQuestion.correctAnswer
            )
              ? "multiple"
              : isSingleAnswer(currentQuestion.correctAnswer)
              ? "single"
              : currentQuestion.type;

            questions.push(currentQuestion);
            questionCount++;
            currentQuestion = null;
          }
        }
      }
      i++;
      continue;
    }

    // 检查是否是新的题目开始（当前行看起来像题目，且没有当前题目）
    if (
      !currentQuestion &&
      isPotentialQuestionStart(line, i > 0 ? lines[i - 1] : "")
    ) {
      // 推断题目类型
      let type: "single" | "multiple" | "judge" = "single";
      // 检查是否有判断题特征
      if (line.match(/[（(]\s{0,2}([√×对正确错误]{1,2})\s{0,2}[)）]/)) {
        type = "judge";
      }

      currentQuestion = {
        type,
        content: line,
        correctAnswer: "",
        options: type === "judge" ? undefined : [],
      };
      if (currentQuestion.correctAnswer === "") {
        extractAnswerFromContent(currentQuestion);
      }

      collectingOptions = type !== "judge";

      i++;
      continue;
    }

    // 如果当前没有题目，跳过
    if (!currentQuestion) {
      i++;
      continue;
    }

    // 处理题目内容
    if (currentQuestion.content === "") {
      // 第一行非类型、非答案的内容是题目
      currentQuestion.content = line;
    } else if (isOptionLine(line)) {
      currentQuestion?.options?.push(...normalizeOption([line]));
    } else {
      // 如果不是选项行，可能是题目结束了
      // 检查是否是新的题目开始
      if (isPotentialQuestionStart(line, lines[i - 1])) {
        // 保存当前题目
        if (currentQuestion.correctAnswer === "") {
          extractAnswerFromContent(currentQuestion);
        }

        if (
          !currentQuestion?.options?.length &&
          !currentQuestion.correctAnswer
        ) {
          // 将当前行追加到题目内容中
          currentQuestion.content += "\n" + line;
        } else {
          questions.push(currentQuestion);
          questionCount++;

          // 开始新题目
          let type: "single" | "multiple" | "judge" = "single";
          if (line.match(/[（(]\s{0,2}([√×对正确错误]{1,2})\s{0,2}[)）]/)) {
            type = "judge";
          }

          currentQuestion = {
            type,
            content: line,
            correctAnswer: "",
            options: type === "judge" ? undefined : [],
          };

          if (currentQuestion.correctAnswer === "") {
            extractAnswerFromContent(currentQuestion);
          }
          collectingOptions = type !== "judge";
        }
      }
    }

    i++;
  }

  // 处理最后一个题目
  if (currentQuestion) {
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
  return /^[\s]{0,2}[A-E][^A-E]+/.test(line);
}

// 从题目内容中提取答案
function extractAnswerFromContent(question: ParsedQuestion): void {
  const content = question.content;

  // 尝试从题干中提取答案，例如："空气中四乙基铅测定方法是（A）"
  const answerInParentheses = content.match(
    /[（(]\s{0,2}([A-E]{1,6})\s{0,2}[)）]/
  );
  if (answerInParentheses) {
    question.correctAnswer = normalizeAnswer(
      answerInParentheses[1],
      question.type
    );
    question.type = isMulipleAnswer(question.correctAnswer)
      ? "multiple"
      : isSingleAnswer(question.correctAnswer)
      ? "single"
      : question.type;
    // 从题干中移除答案部分
    question.content = content
      .replace(/[（(]\s{0,2}([A-E]{1,6})\s{0,2}[)）]/, "（ ）")
      .trim();
  }

  // 对于判断题，检查是否有"（对）"或"（错）"
  if (question.type === "judge") {
    if (content.match(/[（(]\s{0,2}([√对正确]{0,2})\s{0,2}[)）]/)) {
      question.correctAnswer = "对";
      question.content = content
        .replace(/[（(]\s{0,2}([√对正确]{0,2})\s{0,2}[)）]/g, "（ ）")
        .trim();
    }
    if (content.match(/[（(]\s{0,2}([×错误]{0,2})\s{0,2}[)）]/)) {
      question.correctAnswer = "错";
      question.content = content
        .replace(/[（(]\s{0,2}([×错误]{0,2})\s{0,2}[)）]/g, "（ ）")
        .trim();
    }
  }
}

// 检查是否是答案行
function isAnswerLine(line: string): boolean {
  return /^(?:[【(（\s]{0,4}答案[】(（\s]{0,4})[：:（(]?\s{0,2}([A-E√×对错正确错误]+)\s{0,2}[)）]?.{0,6}$/.test(
    line
  );
}

// 检查是否是潜在的题目开始
function isPotentialQuestionStart(line: string, prevLine: string): boolean {
  // 如果上一行是答案行，那么这一行可能是新题目
  if (isAnswerLine(prevLine)) {
    return true;
  }

  // 如果这一行看起来像题目（不是选项，不是答案，不是类型标记）
  if (
    line.length > 5 &&
    !isOptionLine(line) &&
    !isAnswerLine(line) &&
    !line.includes("单选题") &&
    !line.includes("多选题") &&
    !line.includes("判断题")
  ) {
    // 检查是否包含问号、括号等题目特征
    if (
      line.includes("？") ||
      line.includes("?") ||
      line.includes("。") ||
      line.includes("（") ||
      line.includes("）") ||
      line.includes("(") ||
      line.includes(")")
    ) {
      return true;
    }

    // 检查是否是中文句子（包含常见的中文标点）
    const chinesePunctuation = /[，。；：？！]/;
    if (chinesePunctuation.test(line)) {
      return true;
    }
  }

  return false;
}

// 规范化答案
function normalizeAnswer(
  answer: string,
  type: "single" | "multiple" | "judge"
): string {
  if (type === "judge") {
    if (
      answer.includes("对") ||
      answer.includes("正确") ||
      answer.includes("√")
    ) {
      return "对";
    } else if (
      answer.includes("错") ||
      answer.includes("错误") ||
      answer.includes("×")
    ) {
      return "错";
    }
    return answer;
  }

  // 选择题答案：移除空格和特殊字符
  return answer.replace(/\s+/g, "").toUpperCase();
}

// 检查答案是否是判断题答案
function isJudgeAnswer(answer: string): boolean {
  return ["对", "错", "正确", "错误", "√", "×"].some((v) => answer.includes(v));
}

//检查答案是否是对选题答案
function isMulipleAnswer(answer: string): boolean {
  return /^[A-E]{2,}$/.test(answer);
}
//检查答案是否是单选题答案
function isSingleAnswer(answer: string): boolean {
  return /^[A-E]{1}$/.test(answer);
}

// 规范化选项，按A，B，C，D， E 再次分割
function normalizeOption(option: string[]): string[] {
  return option.flatMap((opt) => {
    const splitOptions = opt
      .split(/[\s](?=[A-E])/)
      .map((o) => o.trim().replace(/^[A-E][、.\s．]?/, ""));
    return splitOptions;
  });
}
