# Word Parser 测试用例

本文档描述了为 `lib/wordParser.ts` 模块编写的测试用例，用于测试 `test.docx` 文件的解析功能。

## 测试结构

项目包含两种类型的测试：

### 1. 集成测试 (`__tests__/wordParser.test.ts`)

- 测试实际的 `test.docx` 文件解析
- 验证解析器能够正确解析真实 Word 文档
- 检查解析出的题目结构是否正确
- 验证题型识别、答案提取和选项解析

### 2. 单元测试 (`__tests__/wordParser.unit.test.ts`)

- 使用模拟的 mammoth 模块进行测试
- 测试各种边界情况和错误处理
- 验证题型识别逻辑
- 测试解析器的核心功能

### 3. 内容验证测试 (`__tests__/wordParser.content.test.ts`)

- 验证解析出的题目内容是否与原始 Word 文档内容一致
- 使用从 test.docx 中提取的预期题目数据进行比对
- 验证题型、内容、答案和选项的准确性

## 测试用例概述

### 集成测试用例

1. **应该正确解析 test.docx 文件**

   - 读取并解析 `test.docx` 文件
   - 验证解析出的题目数量（32 个题目）
   - 检查每个题目的结构：
     - 题型（single/multiple/judge）
     - 题目内容（非空字符串）
     - 正确答案
     - 选择题的选项
   - 验证答案在选项范围内（对于选择题）
   - 输出解析结果用于调试

2. **应该正确处理空缓冲区**

   - 测试空缓冲区输入
   - 验证返回空数组或正确处理错误

3. **应该正确处理无效的 Word 文档**
   - 测试无效的 Word 文档内容
   - 验证解析器能够处理错误情况

### 单元测试用例

1. **解析功能测试**

   - 应该正确解析单选题
   - 应该正确解析多选题
   - 应该正确解析判断题
   - 应该正确处理有 5 个选项的题目
   - 应该返回空数组当输入为空缓冲区时
   - 应该正确处理无效的文本内容

2. **题型识别测试**
   - 应该从文本中识别单选题
   - 应该从文本中识别多选题
   - 应该从文本中识别判断题

## 测试配置

### 依赖项

- `jest`: 测试框架
- `ts-jest`: TypeScript 支持
- `@types/jest`: Jest 类型定义
- `@testing-library/react`: React 测试工具（虽然本项目未使用 React 组件测试，但已安装）

### Jest 配置 (`jest.config.js`)

```javascript
{
  preset: "ts-jest",
  testEnvironment: "node",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  testMatch: [
    "**/__tests__/**/*.test.[jt]s?(x)",
    "**/?(*.)+(spec|test).[jt]s?(x)",
  ],
  collectCoverageFrom: [
    "lib/**/*.{js,jsx,ts,tsx}",
    "!**/node_modules/**",
    "!**/dist/**",
  ],
  coverageDirectory: "coverage",
}
```

### package.json 脚本

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch"
  }
}
```

## 运行测试

### 运行所有测试

```bash
npm test
```

### 运行特定测试文件

```bash
npm test -- --testPathPatterns=wordParser.test.ts
```

### 运行特定测试用例

```bash
npm test -- --testNamePattern="应该正确解析 test.docx 文件"
```

### 监视模式

```bash
npm run test:watch
```

## 测试结果

从测试输出可以看到：

- 成功解析了 32 个题目
- 包含单选题、多选题和判断题
- 解析器能够处理各种格式的题目
- 包括有 5 个选项的题目（A-E）
- 能够正确识别括号中的答案和单独的答案行

## 注意事项

1. **test.docx 文件内容**：测试使用的 `test.docx` 文件包含职业卫生相关的题目，包括：

   - 法律、法规、规章、规范性文件相关的单选题
   - 职业卫生技术服务相关的多选题
   - 职业卫生基础知识相关的判断题

2. **解析器特性**：

   - 支持多种答案格式：（C）、答案：C、【答案】C 等
   - 能够处理 5 个选项的题目
   - 将判断题的"√"转换为"对"
   - 能够识别题型标题（单选题、多选题、判断题）

3. **测试覆盖率**：
   - 测试覆盖了正常情况和边界情况
   - 包括错误处理测试
   - 验证了解析器的健壮性
