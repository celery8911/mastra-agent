
import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { LibSQLStore } from '@mastra/libsql';
import { registerApiRoute } from '@mastra/core/server';
import { weatherWorkflow } from './workflows/weather-workflow';
import { weatherAgent } from './agents/weather-agent';
import { financialAgent } from './agents/financial-agent';
import { physicsTutorAgent } from './agents/physics-tutor-agent';
import { toolCallAppropriatenessScorer, completenessScorer, translationScorer } from './scorers/weather-scorer';
import fs from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

export const mastra = new Mastra({
  workflows: { weatherWorkflow },
  agents: { weatherAgent, financialAgent, physicsTutorAgent },
  scorers: { toolCallAppropriatenessScorer, completenessScorer, translationScorer },
  storage: new LibSQLStore({
    // stores observability, scores, ... into memory storage, if it needs to persist, change to file:../mastra.db
    url: ":memory:",
  }),
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'info',
  }),
  telemetry: {
    // Telemetry is deprecated and will be removed in the Nov 4th release
    enabled: false,
  },
  observability: {
    // Enables DefaultExporter and CloudExporter for AI tracing
    default: { enabled: true },
  },
  server: {
    apiRoutes: [
      // 列出所有可下载的文件
      registerApiRoute('/files', {
        method: 'GET',
        handler: async (c) => {
          try {
            const exportDir = path.join(process.cwd(), 'data', 'exports');
            await fs.mkdir(exportDir, { recursive: true });

            const files = await fs.readdir(exportDir);
            const docxFiles = files.filter(file => file.endsWith('.docx'));

            const fileInfos = await Promise.all(
              docxFiles.map(async (filename) => {
                const filepath = path.join(exportDir, filename);
                const stats = await fs.stat(filepath);
                return {
                  filename,
                  size: stats.size,
                  createdAt: stats.birthtime,
                  downloadUrl: `/files/${filename}`,
                };
              })
            );

            fileInfos.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

            return c.json({
              success: true,
              files: fileInfos,
              total: fileInfos.length,
            });
          } catch (error) {
            console.error('获取文件列表失败:', error);
            return c.json({
              error: '获取文件列表失败',
              message: error instanceof Error ? error.message : '未知错误'
            }, 500);
          }
        },
      }),
      // 下载单个文件
      registerApiRoute('/files/:filename', {
        method: 'GET',
        handler: async (c) => {
          try {
            const filename = c.req.param('filename');

            if (!filename.endsWith('.docx')) {
              return c.json({ error: '只支持下载Word文档' }, 400);
            }

            const safeFilename = path.basename(filename);
            const exportDir = path.join(process.cwd(), 'data', 'exports');
            const filepath = path.join(exportDir, safeFilename);

            if (!existsSync(filepath)) {
              return c.json({ error: '文件不存在' }, 404);
            }

            const fileStats = await fs.stat(filepath);
            const fileBuffer = await fs.readFile(filepath);

            c.header('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
            c.header('Content-Disposition', `attachment; filename="${encodeURIComponent(safeFilename)}"`);
            c.header('Content-Length', fileStats.size.toString());

            return c.body(fileBuffer);
          } catch (error) {
            console.error('文件下载失败:', error);
            return c.json({
              error: '文件下载失败',
              message: error instanceof Error ? error.message : '未知错误'
            }, 500);
          }
        },
      }),
    ],
  },
});
