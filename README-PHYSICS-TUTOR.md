# 高中物理解题助手 - 使用指南

## 功能简介

这是一个基于AI的高中物理解题助手，可以：
- 📷 上传物理题目图片或输入题目文字
- 🤖 自动识别并生成完整解答
- 📝 输出格式：**答案** + **考点** + **解析**
- 📄 支持导出为Word文档
- 🧠 **记忆功能**: 记住学生的学习历史、薄弱点和偏好，提供个性化指导

## 快速开始

### 1. 环境配置

确保已配置 Google Gemini API Key（支持视觉识别、文本embedding，一个Key搞定所有功能）:

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件，填入你的 Google Gemini API Key
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key_here
```

> 💡 **获取Gemini API Key**: 访问 [https://aistudio.google.com/apikey](https://aistudio.google.com/apikey) 注册并获取API密钥
>
> ✨ **优势**: 一个API Key同时支持：
> - 视觉识别（gemini-2.5-flash）
> - 文本embedding（text-embedding-004）
> - 无需额外配置OpenAI或其他服务

### 2. 启动开发服务器

```bash
# 安装依赖（如果还没安装）
pnpm install

# 启动开发模式
pnpm dev
```

### 3. 使用Agent

Physics Tutor Agent已经注册到Mastra中，可以通过以下方式使用：

#### 方式1: 通过Mastra Playground (推荐)

启动开发服务器后，访问Mastra的Web界面，选择 `physicsTutorAgent`

#### 方式2: 通过代码调用

```typescript
import { mastra } from './src/mastra';

async function solvePhysics() {
  const agent = mastra.getAgent('physicsTutorAgent');

  // 发送题目图片
  const result = await agent.generate([
    {
      role: 'user',
      content: [
        { type: 'text', text: '请帮我解答这道物理题' },
        {
          type: 'image',
          image: 'https://example.com/physics-problem.jpg'
        }
      ]
    }
  ]);

  console.log(result.text);
}

solvePhysics();
```

#### 方式3: 通过文字描述

```typescript
const result = await agent.generate([
  {
    role: 'user',
    content: '一个质量为2kg的物体在水平地面上受到10N的水平拉力，摩擦系数为0.2，g=10m/s²，求物体的加速度。'
  }
]);

console.log(result.text);
```

## 解答格式

Agent会生成包含三个部分的完整解答：

```
✅ 答案：
a = 3 m/s²

📚 考点：
• 牛顿第二定律
• 摩擦力
• 受力分析

💡 解析：
1. 题目理解
   本题考查在摩擦力作用下物体的运动问题...

2. 受力分析
   物体受到：
   - 重力 G = mg = 2 × 10 = 20 N
   - 拉力 F = 10 N
   - 摩擦力 f = μN = μmg = 0.2 × 20 = 4 N

3. 应用牛顿第二定律
   根据 F合 = ma
   F - f = ma
   10 - 4 = 2a
   a = 3 m/s²

4. 易错点提示
   - 注意摩擦力方向与运动方向相反
   - 正确计算滑动摩擦力 f = μN
```

## 导出Word文档

Agent可以将解答导出为Word文档：

```typescript
// 在对话中直接请求导出
const result = await agent.generate([
  {
    role: 'user',
    content: '请将刚才的解答导出为Word文档'
  }
]);

// 或者直接调用工具
const exportResult = await agent.tools.exportWordTool.execute({
  problems: [
    {
      problemText: "题目内容",
      solution: {
        answer: "答案",
        keyPoints: ["考点1", "考点2"],
        explanation: "详细解析"
      }
    }
  ],
  outputFilename: "physics-solutions"
});

console.log(`文档已导出：${exportResult.filepath}`);
```

导出的文件默认保存在 `data/exports/` 目录下。

## 工具说明

### 1. exportWordTool

**功能**: 导出Word文档

**输入**:
- `problems`: 题目和解答数组
- `outputFilename` (可选): 输出文件名

**输出**:
- `success`: 是否成功
- `filepath`: 文件路径
- `fileSize`: 文件大小

## 项目结构

```
src/mastra/
├── agents/
│   └── physics-tutor-agent.ts     # 物理解题Agent（内置视觉识别）
├── tools/
│   └── physics/
│       └── export-word-tool.ts    # Word导出工具
└── types/
    └── physics-types.ts            # 类型定义

data/
├── physics-memory.db # 记忆数据库
└── exports/          # 导出的文档
```

## 使用示例

### 示例1: 解答力学题目

```typescript
const agent = mastra.getAgent('physicsTutorAgent');

const result = await agent.generate([
  {
    role: 'user',
    content: '一辆汽车从静止开始匀加速行驶，经过10s速度达到20m/s，求：(1)加速度大小 (2)这段时间内行驶的距离'
  }
]);
```

### 示例2: 批量解题并导出

```typescript
// 1. 解答多道题目
const problems = [];

for (const question of questions) {
  const result = await agent.generate([
    { role: 'user', content: question }
  ]);

  // 解析结果并保存
  problems.push({
    problemText: question,
    solution: parseResult(result.text)
  });
}

// 2. 导出为Word文档
const exportResult = await agent.tools.exportWordTool.execute({
  problems,
  outputFilename: `physics-homework-${Date.now()}`
});

console.log(`已导出 ${problems.length} 道题目到: ${exportResult.filepath}`);
```

## 记忆功能详解

Physics Tutor Agent配备了强大的记忆系统，可以：

### 1. 对话历史记忆
- 保留最近20条对话消息
- 维护连贯的对话上下文
- 理解前后文关联

### 2. 语义相似检索
- 自动查找之前做过的相似题目（Top 5）
- 对比学习：引用历史题目的解题方法
- 避免重复错误：提醒之前类似题目的易错点

### 3. 学生档案（Working Memory）
Agent会自动记录和更新学生信息：
- **姓名和年级**
- **薄弱知识点**: 经常出错的物理概念
- **强项知识点**: 擅长的领域
- **常见错误**: 重复出现的错误模式
- **学习目标**: 当前的学习计划
- **讲解偏好**: 喜欢详细还是简洁的解释

### 4. 个性化建议
基于记忆，Agent会：
- 针对薄弱点提供更详细的解析
- 在类似题目中引用之前的解法
- 根据学习目标调整解答重点
- 提醒注意常犯的错误

### 使用示例
```typescript
// 第一次对话
const result1 = await agent.generate([
  { role: 'user', content: '我是小明，高二学生，牛顿定律总是搞不清楚' }
]);
// Agent会记住：name=小明, grade=高二, weak_topics=牛顿定律

// 后续对话，Agent会个性化回应
const result2 = await agent.generate([
  { role: 'user', content: '一个物体受力10N...' }
]);
// Agent会特别详细地讲解牛顿定律相关部分
```

## 注意事项

1. **API调用成本**:
   - Google Gemini 2.5 Flash: 成本极低，速度快
   - Google Text Embedding 004: 用于记忆向量化，免费额度充足
   - 支持视觉识别，无需额外的OCR服务
   - **只需一个Gemini API Key**，无需配置多个服务
2. **图片格式**: 支持常见图片格式（JPG, PNG等）
3. **题目清晰度**: 图片越清晰，识别准确率越高
4. **数据持久化**: 记忆数据存储在 `data/physics-memory.db`

## 常见问题

### Q: 识别准确率低怎么办？
A: 确保图片清晰，文字可读。如果是手写题目，建议提供打印版本或手动输入文字。

### Q: 如何切换AI模型？
A: 当前使用的是Google Gemini 2.5 Flash模型（支持视觉、成本低、速度快）。如需切换到其他模型，编辑 `src/mastra/agents/physics-tutor-agent.ts`：

```typescript
// 当前配置：Gemini 2.5 Flash (推荐，支持视觉、成本低)
model: google('gemini-2.5-flash')

// 切换到Gemini 1.5 Pro (更强大，但成本更高)
model: google('gemini-1.5-pro')

// 切换到OpenAI GPT-4o (需支持视觉功能)
model: openai('gpt-4o')

// 切换到Claude (需要额外配置，支持视觉)
model: anthropic('claude-3-5-sonnet-20241022')
```

### Q: 导出的Word文档在哪里？
A: 默认在 `data/exports/` 目录下，文件名为 `physics-solutions-{timestamp}.docx`

### Q: 支持哪些物理知识范围？
A: 涵盖高中物理所有模块：
- 力学（运动学、动力学、动量、能量）
- 电磁学（电场、电路、磁场、电磁感应）
- 光学
- 热学
- 近代物理

## 开发计划

- [ ] 添加图片和PDF导出格式
- [ ] 支持历史记录查询
- [ ] 添加错题本功能
- [ ] 支持多语言（英文）
- [ ] 优化解析格式（支持LaTeX公式）

## 技术支持

如有问题或建议，欢迎提Issue或联系开发者。

---

**项目状态**: MVP v1.0
**最后更新**: 2025-11-14
**开发框架**: Mastra + Google Gemini
**AI模型**: Gemini 1.5 Flash (支持视觉、成本低、速度快)
