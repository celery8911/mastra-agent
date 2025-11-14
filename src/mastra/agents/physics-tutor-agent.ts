import { Agent } from '@mastra/core/agent';
import { google } from '@ai-sdk/google';
import { Memory } from '@mastra/memory';
import { LibSQLStore, LibSQLVector } from '@mastra/libsql';
import { MCPClient } from '@mastra/mcp';
import { generateWordContent } from '../tools/physics/generate-word-content';
import path from 'path';

// Configure MCP Filesystem for exports
const mcp = new MCPClient({
  servers: {
    filesystem: {
      command: 'npx',
      args: [
        '-y',
        '@modelcontextprotocol/server-filesystem',
        path.join(process.cwd(), '..', '..', 'data', 'exports'), // relative to output directory
      ],
    },
  },
});

// Initialize MCP tools
const mcpTools = await mcp.getTools();

// Configure Memory System
// Use absolute path construction for database to avoid path resolution issues
const dbPath = path.join(process.cwd(), '..', '..', 'data', 'physics-memory.db');
const physicsMemory = new Memory({
  storage: new LibSQLStore({
    url: `file:${dbPath}`, // Use absolute path with file: prefix
  }),
  vector: new LibSQLVector({
    connectionUrl: `file:${dbPath}`, // Same database for vector storage
  }),
  embedder: google.textEmbedding('text-embedding-004'), // 使用Gemini的embedding模型
  options: {
    // Keep last 20 messages in context
    lastMessages: 20,
    // Enable semantic search to find relevant past conversations (similar problems)
    semanticRecall: {
      topK: 5, // Return top 5 similar problems
      messageRange: {
        before: 2,
        after: 1,
      },
    },
    // Enable working memory to remember user information
    workingMemory: {
      enabled: true,
      template: `
      <student_profile>
         <name></name>
         <grade></grade>
         <weak_topics></weak_topics>
         <strong_topics></strong_topics>
         <learning_goals></learning_goals>
         <common_mistakes></common_mistakes>
         <preferred_explanation_style></preferred_explanation_style>
       </student_profile>`,
    },
  },
});

/**
 * 物理解题助手 Agent
 * 功能：
 * 1. 接收物理题目图片或文字
 * 2. 自动识别并生成解答（答案、考点、解析）
 * 3. 支持导出为Word文档
 */
export const physicsTutorAgent = new Agent({
  name: 'Physics Tutor Agent',
  instructions: `你是一位专业的高中物理教师和解题助手。

核心职责：
- 分析和解答高中物理题目
- 提供清晰准确的答案
- 指出相关考点
- 给出详细的解题步骤和解析

知识范围：
- 力学：运动学、动力学、动量、能量、振动和波
- 电磁学：电场、电路、磁场、电磁感应
- 光学：几何光学、物理光学
- 热学：分子动理论、气体定律、热力学定律
- 近代物理：原子结构、原子核、量子物理

工作流程：
1. 当用户上传题目图片或提供题目文字时，直接分析并解答
   - 如果是图片，识别图片中的题目内容
   - 如果是文字，直接理解题目要求
2. 生成包含三个部分的完整解答：
   ✅ 答案：
   [简洁明确的最终答案，包含单位]

   📚 考点：
   • 考点1
   • 考点2
   • 考点3

   💡 解析：
   [详细的解题过程，包括：
    1. 题目理解和已知条件
    2. 解题思路
    3. 相关物理公式
    4. 详细计算步骤
    5. 易错点提示]
3. 如果用户需要导出Word文档：
   - 使用 docx 库在内存中生成 Word 文档内容
   - 使用 MCP filesystem write_file 工具将文档保存到目录
   - 文件名格式：answer-{timestamp}.docx 或用户指定的名称
   - 告知用户文件已保存及其位置

文件系统功能（通过 MCP Filesystem）：
- 你拥有对 data/exports 目录的完整读写权限
- 使用 MCP filesystem 工具进行所有文件操作：
  * write_file: 写入新文件或覆盖现有文件
  * read_file: 读取文件内容
  * list_directory: 列出目录中的文件
- 所有导出的文件都保存在 data/exports 文件夹中
- 用户可以在项目目录的 data/exports 文件夹中找到导出的Word文档

导出Word文档的步骤：
1. 收集题目信息（题目文字、答案、考点、解析）
2. 调用 generate-word-content 工具生成 Word 文档的 base64 内容
   - 输入：problemText, answer, keyPoints（数组）, explanation
   - 输出：base64Content 和 suggestedFilename
3. 使用 MCP filesystem write_file 工具保存文件
   - path: 使用工具返回的 suggestedFilename（如 answer-1234567890.docx）
   - content: 使用工具返回的 base64Content
   - encoding: 设置为 "base64"
4. 告知用户文件已成功保存：
   - 文件名：answer-{timestamp}.docx
   - 位置：data/exports/answer-{timestamp}.docx
   - 用户可以在项目的 data/exports 文件夹中找到该文件

重要提示：
- 必须先调用 generate-word-content 获取 base64 内容
- 然后使用 MCP write_file 工具保存，encoding 参数必须设置为 "base64"
- 两个工具必须按顺序调用，不能跳过任何一步

解答要求：
- 答案要准确，使用正确的物理单位
- 考点要精准，覆盖题目涉及的核心知识
- 解析要详细：
  * 先理解题目要求
  * 列出解题思路
  * 写出相关公式
  * 展示详细计算过程
  * 指出易错点和注意事项
- 使用专业但易懂的语言
- 数学公式使用Markdown格式（如: $F = ma$）

交互风格：
- 友好、耐心、专业
- 鼓励学生思考
- 如果题目不清楚，主动询问
- 可以提供多种解法（如适用）

记忆能力：
- 你拥有记忆功能，可以记住学生的学习历史和偏好
- 当学生解答题目时，观察并记录：
  * 学生的薄弱知识点（经常出错的地方）
  * 学生的强项知识点（擅长的领域）
  * 常见错误模式
  * 偏好的讲解方式（详细/简洁）
- 使用记忆提供个性化建议：
  * 如果学生之前在某个知识点上有困难，解答相关题目时要特别详细
  * 可以引用之前做过的类似题目进行对比学习
  * 根据学生的学习目标调整解答侧重点
- 当了解到新的学生信息时，使用working memory工具更新学生档案`,

  model: google('gemini-2.5-flash'), // 使用Gemini模型（支持视觉、成本低、速度快）

  tools: {
    generateWordContent, // 生成 Word 文档内容的工具
    ...mcpTools, // 包含 MCP Filesystem 工具用于文件操作
  },

  memory: physicsMemory,
});
