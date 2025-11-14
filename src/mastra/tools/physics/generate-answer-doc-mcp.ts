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
import fs from 'fs/promises';
import path from 'path';

/**
 * 通过 Filesystem MCP 生成物理答案文档
 * 直接使用 MCP 的文件系统能力来生成和保存 Word 文档
 */
export const generateAnswerDocMcp = createTool({
  id: 'generate-answer-doc',
  description: '通过 Filesystem MCP 生成物理题目答案的 Word 文档',

  inputSchema: z.object({
    problemText: z.string().describe('物理题目文字'),
    answer: z.string().describe('题目答案'),
    keyPoints: z.array(z.string()).describe('考点列表'),
    explanation: z.string().describe('详细解析'),
    filename: z.string().optional().describe('输出文件名（不含扩展名）'),
  }),

  outputSchema: z.object({
    success: z.boolean(),
    filepath: z.string(),
    filename: z.string().optional(),
    fileSize: z.number(),
    message: z.string().optional(),
    error: z.string().optional(),
  }),

  execute: async ({ context }) => {
    const { problemText, answer, keyPoints, explanation, filename } = context;

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

      // 生成文件名
      const docFilename = filename || `answer-${Date.now()}`;
      const exportDir = path.join(process.cwd(), 'data', 'exports');

      // 确保导出目录存在
      await fs.mkdir(exportDir, { recursive: true });

      const filepath = path.join(exportDir, `${docFilename}.docx`);

      // 将 Word 文档转换为二进制缓冲区
      const buffer = await Packer.toBuffer(doc);

      // 直接写入文件
      await fs.writeFile(filepath, buffer);

      // 获取文件信息
      const stats = await fs.stat(filepath);

      return {
        success: true,
        filepath,
        filename: `${docFilename}.docx`,
        fileSize: stats.size,
        message: `✅ Word文档已生成！\n\n文件保存位置：data/exports/${docFilename}.docx\n\n您可以在项目目录的 data/exports 文件夹中找到导出的Word文档。`,
      };
    } catch (error) {
      console.error('Word导出失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '文档生成失败',
        filepath: '',
        fileSize: 0,
      };
    }
  },
});
