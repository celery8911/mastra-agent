# Word文档导出功能使用指南

## 功能说明

Physics Tutor Agent 支持将解答的题目导出为 Word 文档，用户可以直接下载。

## 实现原理

### 1. 文件生成
当Agent使用 `export-word` 工具时：
- 工具在服务器端生成 Word 文档（.docx格式）
- 文档保存在 `data/exports/` 目录
- 返回下载URL给Agent

### 2. 文件下载
系统提供了下载API端点：
- **列出所有文件**: `GET /api/download/`
- **下载单个文件**: `GET /api/download/:filename`

### 3. Agent交互
Agent会在回复中提供可点击的下载链接：
```markdown
📥 **Word文档已生成！**

点击下载：[下载物理题解答.docx](http://localhost:4111/api/download/physics-solutions-1234567890.docx)

或复制链接：http://localhost:4111/api/download/physics-solutions-1234567890.docx
```

## 使用方法

### 方式1: 在对话中请求导出（推荐）

与Agent对话时，直接说：

```
用户: 帮我把刚才的题目和解答导出成Word文档
```

Agent会：
1. 调用 export-word 工具
2. 生成Word文档
3. 返回下载链接

### 方式2: 通过API列出文件

如果想查看所有已生成的文档：

```bash
curl http://localhost:4111/api/download/
```

响应示例：
```json
{
  "success": true,
  "files": [
    {
      "filename": "physics-solutions-1731577890123.docx",
      "size": 15234,
      "createdAt": "2025-11-14T10:58:10.123Z",
      "downloadUrl": "/api/download/physics-solutions-1731577890123.docx"
    }
  ],
  "total": 1
}
```

### 方式3: 直接下载文件

如果知道文件名，可以直接访问：

```
http://localhost:4111/api/download/文件名.docx
```

## Word文档内容

导出的Word文档包含：

### 文档结构
```
高中物理解题集
━━━━━━━━━━━━━━━━━━━━━━━

生成时间: 2025-11-14 18:58:10
题目数量: 1

━━━━━━━━━━━━━━━━━━━━━━━

题目 1
━━━━━━━━━━━━━━━━━━━━━━━

📝 题目：
[题目内容]

✅ 答案：
[答案内容]

📚 考点：
• 考点1
• 考点2
• 考点3

💡 解析：
[详细解析]
```

### 格式特点
- **标题**: 居中，大字体
- **答案**: 绿色，加粗
- **考点**: 蓝色，项目列表
- **解析**: 橙色标题
- **分隔线**: 美化文档结构

## 安全性

### 路径安全
- 使用 `path.basename()` 防止路径遍历攻击
- 只允许下载 `.docx` 文件
- 文件必须在 `data/exports/` 目录内

### 文件验证
- 检查文件是否存在
- 验证文件类型
- 返回适当的HTTP状态码

## API详细说明

### 1. 列出所有文件

**请求**:
```http
GET /api/download/
```

**响应**:
```json
{
  "success": true,
  "files": [
    {
      "filename": "physics-solutions-1731577890123.docx",
      "size": 15234,
      "createdAt": "2025-11-14T10:58:10.123Z",
      "downloadUrl": "/api/download/physics-solutions-1731577890123.docx"
    }
  ],
  "total": 1
}
```

### 2. 下载文件

**请求**:
```http
GET /api/download/physics-solutions-1731577890123.docx
```

**响应头**:
```
Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document
Content-Disposition: attachment; filename="physics-solutions-1731577890123.docx"
Content-Length: 15234
```

**响应**: 二进制文件流

### 错误处理

#### 文件不存在 (404)
```json
{
  "error": "文件不存在"
}
```

#### 非法文件类型 (400)
```json
{
  "error": "只支持下载Word文档"
}
```

#### 服务器错误 (500)
```json
{
  "error": "文件下载失败",
  "message": "具体错误信息"
}
```

## 开发者指南

### 扩展下载功能

如果需要支持其他文件格式，修改 `src/api/download.ts`:

```typescript
// 支持PDF
if (!filename.endsWith('.docx') && !filename.endsWith('.pdf')) {
  return c.json({ error: '不支持的文件类型' }, 400);
}

// 根据文件类型设置Content-Type
const contentType = filename.endsWith('.pdf')
  ? 'application/pdf'
  : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

c.header('Content-Type', contentType);
```

### 添加访问控制

如果需要限制访问：

```typescript
// 在download.ts中添加认证
downloadRoutes.use('*', async (c, next) => {
  const token = c.req.header('Authorization');

  if (!token || !isValidToken(token)) {
    return c.json({ error: '未授权' }, 401);
  }

  await next();
});
```

## 常见问题

### Q: 为什么链接是localhost:4111？
A: 这是开发环境的默认端口。部署到生产环境时，Agent会自动使用正确的域名。

### Q: 文件会永久保存吗？
A: 目前文件会一直保存在 `data/exports/` 目录。建议定期清理或实现自动过期机制。

### Q: 支持批量下载吗？
A: 目前不支持。可以通过列表API获取所有文件，然后分别下载。

### Q: 可以自定义文档样式吗？
A: 可以！修改 `src/mastra/tools/physics/export-word-tool.ts` 中的 docx 配置。

## 技术栈

- **文档生成**: [docx](https://www.npmjs.com/package/docx) - 强大的Word文档生成库
- **Web框架**: [Hono](https://hono.dev/) - 轻量级、高性能的Web框架
- **文件系统**: Node.js `fs/promises` - 异步文件操作

## 未来改进

- [ ] 添加文件过期自动清理
- [ ] 支持PDF导出
- [ ] 添加文档模板选择
- [ ] 支持批量下载（ZIP压缩）
- [ ] 添加下载统计和日志
- [ ] 实现文件预览功能

---

**更新时间**: 2025-11-14
**版本**: 1.0
