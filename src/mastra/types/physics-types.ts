// Physics Tutor Types - 简化版本

export interface Solution {
  answer: string;           // 答案
  keyPoints: string[];      // 考点
  explanation: string;      // 解析
}

export interface ProblemWithSolution {
  problemText: string;      // 识别出的题目文字
  imageUrl?: string;        // 原图URL（可选）
  solution: Solution;       // 解答内容
}

export interface ExportResult {
  success: boolean;
  filepath: string;
  fileSize: number;
  downloadUrl?: string;    // 下载URL
  filename?: string;       // 文件名
  error?: string;          // 错误信息（当success为false时）
}
