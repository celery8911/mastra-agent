import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  UnderlineType,
} from 'docx';
import fs from 'fs/promises';
import path from 'path';
import type { ProblemWithSolution, ExportResult } from '../../types/physics-types';

/**
 * Word文档导出工具
 * 将题目和解答导出为Word文档
 */
export const exportWordTool = createTool({
  id: 'export-word',
  description: '将物理题目和解答导出为Word文档',

  inputSchema: z.object({
    problems: z.array(
      z.object({
        problemText: z.string(),
        imageUrl: z.string().optional(),
        solution: z.object({
          answer: z.string(),
          keyPoints: z.array(z.string()),
          explanation: z.string(),
        }),
      })
    ).describe('题目和解答列表'),
    outputFilename: z.string().optional().describe('输出文件名（不含扩展名）'),
  }),

  execute: async ({ context }) => {
    const { problems, outputFilename } = context;

    try {
      // 创建Word文档
      const doc = new Document({
        sections: [
          {
            properties: {},
            children: [
              // 文档标题
              new Paragraph({
                text: '高中物理解题集',
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
                spacing: { after: 600 },
              }),

              // 题目数量
              new Paragraph({
                children: [
                  new TextRun({
                    text: `题目数量: ${problems.length}`,
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

              // 遍历每道题目
              ...problems.flatMap((problem, index) => [
                // 题目标题
                new Paragraph({
                  text: `题目 ${index + 1}`,
                  heading: HeadingLevel.HEADING_1,
                  spacing: { before: 400, after: 200 },
                }),

                // 题目内容
                new Paragraph({
                  children: [
                    new TextRun({
                      text: '📝 题目：',
                      bold: true,
                      size: 24,
                    }),
                  ],
                  spacing: { after: 100 },
                }),
                new Paragraph({
                  text: problem.problemText,
                  spacing: { after: 300 },
                }),

                // 答案部分
                new Paragraph({
                  children: [
                    new TextRun({
                      text: '✅ 答案：',
                      bold: true,
                      size: 24,
                      color: '00AA00',
                    }),
                  ],
                  spacing: { after: 100 },
                }),
                new Paragraph({
                  children: [
                    new TextRun({
                      text: problem.solution.answer,
                      size: 24,
                      bold: true,
                    }),
                  ],
                  spacing: { after: 300 },
                }),

                // 考点部分
                new Paragraph({
                  children: [
                    new TextRun({
                      text: '📚 考点：',
                      bold: true,
                      size: 24,
                      color: '0066CC',
                    }),
                  ],
                  spacing: { after: 100 },
                }),
                ...problem.solution.keyPoints.map(
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
                  children: [
                    new TextRun({
                      text: '💡 解析：',
                      bold: true,
                      size: 24,
                      color: 'FF6600',
                    }),
                  ],
                  spacing: { after: 100 },
                }),
                // 将解析文本按换行符分割
                ...problem.solution.explanation.split('\n').map(
                  (line) =>
                    new Paragraph({
                      text: line.trim(),
                      spacing: { after: 100 },
                    })
                ),

                // 题目分隔线
                new Paragraph({
                  text: '─────────────────────────────────────',
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 400, after: 400 },
                }),
              ]),
            ],
          },
        ],
      });

      // 生成文件名和路径
      const filename = outputFilename || `physics-solutions-${Date.now()}`;
      const exportDir = path.join(process.cwd(), 'data', 'exports');

      // 确保导出目录存在
      await fs.mkdir(exportDir, { recursive: true });

      const filepath = path.join(exportDir, `${filename}.docx`);

      // 生成Word文档
      const buffer = await Packer.toBuffer(doc);
      await fs.writeFile(filepath, buffer);

      const stats = await fs.stat(filepath);

      // 生成下载URL
      const downloadUrl = `/files/${filename}.docx`;

      return {
        success: true,
        filepath,
        fileSize: stats.size,
        downloadUrl,
        filename: `${filename}.docx`,
      } as ExportResult;
    } catch (error) {
      console.error('Word导出失败:', error);
      return {
        success: false,
        filepath: '',
        fileSize: 0,
        error: error instanceof Error ? error.message : 'Word导出失败',
      };
    }
  },
});
