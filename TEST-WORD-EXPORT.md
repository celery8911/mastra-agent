# Word导出功能测试指南

## 快速测试步骤

### 1. 启动服务器

```bash
pnpm dev
```

服务器会在 `http://localhost:4111` 启动。

### 2. 访问Mastra Playground

打开浏览器，访问：
```
http://localhost:4111
```

### 3. 选择Physics Tutor Agent

在Playground中选择 `physicsTutorAgent`

### 4. 测试对话流程

#### 测试案例1: 解答题目并导出

**用户输入**：
```
一个物体从静止开始，以2m/s²的加速度匀加速运动，求5秒后的速度是多少？请帮我导出成Word文档。
```

**预期Agent回应**：
1. 首先提供完整的解答（答案、考点、解析）
2. 然后提供下载链接，格式类似：

```markdown
📥 **Word文档已生成！**

点击下载：[下载物理题解答.docx](http://localhost:4111/api/download/physics-solutions-1731577890123.docx)

或复制链接：http://localhost:4111/api/download/physics-solutions-1731577890123.docx
```

#### 测试案例2: 只导出之前的解答

**用户输入**：
```
把刚才的题目和解答导出成Word
```

**预期**：
- Agent会调用export-word工具
- 返回下载链接

### 5. 测试下载功能

#### 方法1: 点击链接（推荐）
- 直接点击Agent返回的下载链接
- 浏览器应该开始下载Word文档

#### 方法2: 使用curl测试
```bash
# 列出所有文件
curl http://localhost:4111/api/download/

# 下载特定文件
curl -O http://localhost:4111/api/download/physics-solutions-1731577890123.docx
```

#### 方法3: 浏览器直接访问
```
http://localhost:4111/api/download/physics-solutions-1731577890123.docx
```

### 6. 验证Word文档

打开下载的Word文档，检查：
- [ ] 文档标题：高中物理解题集
- [ ] 生成时间显示正确
- [ ] 题目数量正确
- [ ] 题目内容完整
- [ ] 答案格式正确（绿色、加粗）
- [ ] 考点列表完整（蓝色、项目符号）
- [ ] 解析内容详细（橙色标题）
- [ ] 文档格式美观

## 测试API端点

### 测试1: 列出所有文件

```bash
curl -X GET http://localhost:4111/api/download/
```

**预期响应**：
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

### 测试2: 下载不存在的文件

```bash
curl -X GET http://localhost:4111/api/download/nonexistent.docx
```

**预期响应** (404):
```json
{
  "error": "文件不存在"
}
```

### 测试3: 尝试下载非docx文件

```bash
curl -X GET http://localhost:4111/api/download/test.txt
```

**预期响应** (400):
```json
{
  "error": "只支持下载Word文档"
}
```

### 测试4: 路径遍历攻击测试

```bash
curl -X GET "http://localhost:4111/api/download/../../../etc/passwd"
```

**预期**：
- 应该被 `path.basename()` 处理
- 返回文件不存在或非法文件类型错误

## 调试技巧

### 查看生成的文件

```bash
# 列出导出目录中的文件
ls -lh data/exports/

# 查看文件详情
stat data/exports/physics-solutions-*.docx
```

### 查看服务器日志

启动服务器时添加详细日志：
```bash
DEBUG=* pnpm dev
```

### 清理测试文件

```bash
# 清空导出目录
rm -f data/exports/*.docx
```

## 常见问题排查

### 问题1: Agent没有提供下载链接

**检查**：
1. 确认exportWordTool是否成功执行
2. 查看服务器日志是否有错误
3. 确认 `data/exports/` 目录是否存在且可写

**解决**：
```bash
# 创建导出目录
mkdir -p data/exports
chmod 755 data/exports
```

### 问题2: 下载链接404

**检查**：
1. 确认文件确实生成了：`ls data/exports/`
2. 确认API路由正确注册
3. 检查文件名是否正确

**调试**：
```bash
# 手动测试API
curl -v http://localhost:4111/api/download/

# 应该返回文件列表
```

### 问题3: 下载的文件损坏

**检查**：
1. 文件大小是否合理（至少几KB）
2. 文件MIME类型是否正确

**验证**：
```bash
# 检查文件类型
file data/exports/physics-solutions-*.docx

# 应该显示：Microsoft Word 2007+
```

### 问题4: 浏览器不下载，而是打开

**原因**：
- Content-Disposition header可能未正确设置

**检查**：
```bash
curl -I http://localhost:4111/api/download/文件名.docx
```

应该包含：
```
Content-Disposition: attachment; filename="..."
```

## 性能测试

### 并发下载测试

```bash
# 使用ab (Apache Bench)
ab -n 100 -c 10 http://localhost:4111/api/download/physics-solutions-1731577890123.docx
```

### 大文件测试

创建包含多个题目的导出：
```javascript
// 在Agent对话中
用户: 帮我把这5道题目都导出成Word文档
```

验证：
- 文件大小合理
- 下载速度可接受
- 不会超时

## 集成测试

完整流程测试：

1. **解答题目** → 2. **导出Word** → 3. **获取链接** → 4. **下载文件** → 5. **打开验证**

```bash
# 自动化测试脚本示例
#!/bin/bash

echo "1. 启动服务器..."
pnpm dev &
SERVER_PID=$!
sleep 5

echo "2. 测试API端点..."
curl http://localhost:4111/api/download/

echo "3. 等待Agent生成文档..."
# 这里需要手动与Agent交互

echo "4. 下载文件..."
LATEST_FILE=$(ls -t data/exports/*.docx | head -1)
curl -O "http://localhost:4111/api/download/$(basename $LATEST_FILE)"

echo "5. 验证文件..."
file $(basename $LATEST_FILE)

echo "6. 清理..."
kill $SERVER_PID
```

## 成功标准

所有测试通过的标准：
- ✅ Agent能正确生成解答
- ✅ export-word工具成功创建文件
- ✅ Agent提供正确的下载链接
- ✅ 下载API返回正确的文件
- ✅ Word文档格式正确、内容完整
- ✅ 错误处理正确（404、400、500）
- ✅ 安全检查有效（路径遍历防护）

---

**测试完成检查清单**：
- [ ] 基本对话流程测试通过
- [ ] Word文档生成正确
- [ ] 下载功能正常
- [ ] API端点响应正确
- [ ] 错误处理符合预期
- [ ] 安全测试通过
- [ ] 文档格式美观

**测试人员**: _________
**测试日期**: _________
**测试结果**: ✅ 通过 / ❌ 失败
