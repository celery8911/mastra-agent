import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
} from 'docx';

/**
 * 生成物理答案 Word 文档的 base64 内容
 * Agent 可以调用此工具获取 Word 文档内容，然后使用 MCP filesystem 工具保存
 */
export const generateWordContent = createTool({
  id: 'generate-word-content',
  description: '生成物理题目答案的 Word 文档内容（base64格式），可配合 MCP filesystem 工具保存文件',

  inputSchema: z.object({
    problemText: z.string().describe('物理题目文字'),
    answer: z.string().describe('题目答案'),
    keyPoints: z.array(z.string()).describe('考点列表'),
    explanation: z.string().describe('详细解析'),
  }),

  outputSchema: z.object({
    success: z.boolean(),
    base64Content: z.string(),
    suggestedFilename: z.string(),
    message: z.string().optional(),
    error: z.string().optional(),
  }),

  execute: async ({ context }) => {
    const { problemText, answer, keyPoints, explanation } = context;

    try {
      // 生成 Word 文档
      const doc = new Document({
        sections: [
          {
            properties: {},
            children: [
              // 文档标题
              new Paragraph({
                text: '物理题目解答',
                heading: HeadingLevel.TITLE,
                alignment: AlignmentType.CENTER,
                spacing: { after: 400 },
              }),

              // 生成时间
              new Paragraph({
                children: [
                  new TextRun({
                    text: `生成时间: ${new Date().toLocaleString('zh-CN')}`,
                    size: 20,
                    color: '666666',
                  }),
                ],
                alignment: AlignmentType.CENTER,
                spacing: { after: 800 },
              }),

              // 分隔线
              new Paragraph({
                text: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
                alignment: AlignmentType.CENTER,
                spacing: { after: 400 },
              }),

              // 题目部分
              new Paragraph({
                text: '题目',
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 400, after: 200 },
              }),

              new Paragraph({
                children: [
                  new TextRun({
                    text: '📝 ',
                    size: 24,
                  }),
                  new TextRun({
                    text: problemText,
                    size: 24,
                  }),
                ],
                spacing: { after: 400 },
              }),

              // 答案部分
              new Paragraph({
                text: '答案',
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 400, after: 200 },
              }),

              new Paragraph({
                children: [
                  new TextRun({
                    text: '✅ ',
                    bold: true,
                    size: 24,
                    color: '00AA00',
                  }),
                  new TextRun({
                    text: answer,
                    bold: true,
                    size: 24,
                  }),
                ],
                spacing: { after: 400 },
              }),

              // 考点部分
              new Paragraph({
                text: '考点',
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 400, after: 200 },
              }),

              ...keyPoints.map(
                (point) =>
                  new Paragraph({
                    text: `• ${point}`,
                    spacing: { after: 100 },
                    bullet: { level: 0 },
                  })
              ),

              new Paragraph({ text: '', spacing: { after: 200 } }),

              // 解析部分
              new Paragraph({
                text: '解析',
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 400, after: 200 },
              }),

              // 将解析文本按换行符分割，保持格式
              ...explanation.split('\n').map(
                (line) => {
                  const trimmedLine = line.trim();
                  if (!trimmedLine) {
                    return new Paragraph({ text: '', spacing: { after: 100 } });
                  }
                  return new Paragraph({
                    text: trimmedLine,
                    spacing: { after: 100 },
                  });
                }
              ),

              // 底部分隔线
              new Paragraph({
                text: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
                alignment: AlignmentType.CENTER,
                spacing: { before: 400, after: 200 },
              }),
            ],
          },
        ],
      });

      // 将 Word 文档转换为 base64 字符串
      const base64Content = await Packer.toBase64String(doc);

      // 生成建议的文件名
      const timestamp = Date.now();
      const suggestedFilename = `answer-${timestamp}.docx`;

      return {
        success: true,
        base64Content,
        suggestedFilename,
        message: `Word文档内容已生成（base64格式）。建议文件名: ${suggestedFilename}`,
      };
    } catch (error) {
      console.error('Word文档内容生成失败:', error);
      return {
        success: false,
        base64Content: '',
        suggestedFilename: '',
        error: error instanceof Error ? error.message : '文档内容生成失败',
      };
    }
  },
});
