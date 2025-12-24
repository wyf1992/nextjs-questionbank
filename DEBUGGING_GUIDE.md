# 调试 test_parse.ts 指南

本文档介绍如何使用 VS Code 调试 `test_parse.ts` 脚本。

## 已配置的调试选项

在 `.vscode/launch.json` 文件中，已经配置了以下两种调试方式：

### 1. Debug test_parse.ts with tsx

- **名称**: "Debug test_parse.ts with tsx"
- **方法**: 使用 npx 运行 tsx
- **命令**: `npx tsx test_parse.ts`
- **特点**: 最接近手动运行命令的方式

### 2. Debug test_parse.ts (simple)

- **名称**: "Debug test_parse.ts (simple)"
- **方法**: 使用 Node.js 的 `-r tsx/register` 参数
- **命令**: `node -r tsx/register test_parse.ts`
- **特点**: 更简单的配置，直接使用 Node.js 调试器

## 使用方法

### 在 VS Code 中调试

1. 打开 VS Code 的调试视图（Ctrl+Shift+D 或 Cmd+Shift+D）
2. 在调试配置下拉菜单中选择 "Debug test_parse.ts with tsx" 或 "Debug test_parse.ts (simple)"
3. 点击绿色播放按钮开始调试
4. 可以在代码中设置断点进行调试

### 手动调试命令

如果需要手动调试，可以使用以下命令：

```bash
# 方法1: 使用 tsx
npx tsx test_parse.ts

# 方法2: 使用 node + tsx/register
node -r tsx/register test_parse.ts

# 方法3: 启动调试器
node --inspect-brk -r tsx/register test_parse.ts
```

## 设置断点

在 `test_parse.ts` 文件中：

1. 点击行号左侧的空白区域设置断点（会出现红点）
2. 常见的断点位置：
   - `const buffer = fs.readFileSync("./test.docx");` (第 7 行)
   - `const questions = await parseWordDocument(buffer);` (第 10 行)
   - `console.log(`\n 成功解析了 ${questions.length} 道题目`);` (第 12 行)

## 调试技巧

1. **变量监视**: 在调试过程中，可以在 VS Code 的调试面板中查看变量值
2. **步进调试**: 使用步进按钮（F10/F11）逐行执行代码
3. **调用堆栈**: 查看函数调用堆栈，了解代码执行路径
4. **控制台输出**: 调试输出会显示在 VS Code 的调试控制台中

## 常见问题

### 1. 调试器无法启动

- 确保已安装 tsx：`npx tsx --version`
- 确保 test.docx 文件存在于项目根目录

### 2. 断点不生效

- 确保使用的是正确的调试配置
- 尝试重新加载 VS Code 窗口

### 3. 模块找不到错误

- 确保所有依赖已安装：`npm install`
- 确保 TypeScript 配置正确

## 验证调试配置

要验证调试配置是否正常工作：

1. 在 `test_parse.ts` 中设置断点
2. 选择 "Debug test_parse.ts with tsx" 配置
3. 启动调试
4. 程序应在断点处暂停
5. 检查变量值并继续执行

如果一切正常，您应该能看到脚本的输出，显示解析的题目数量。
