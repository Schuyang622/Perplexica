import express from 'express';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import cors from 'cors';

// 确保上传目录存在
const UPLOADS_DIR = path.join(process.cwd(), 'uploads', 'images');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// 创建Express应用
const app = express();
app.use(express.json());
app.use(cors());

// 服务静态文件
app.use('/images', express.static(UPLOADS_DIR));

// 定义MCP服务器元信息
app.get('/mcp', (req, res) => {
  res.json({
    name: 'Perplexica MCP Server',
    version: '1.0.0',
    description: 'MCP服务器，支持文字转图片功能',
    capabilities: ['text-to-image'],
    tools: [
      {
        id: 'text-to-image',
        name: '文字转图片',
        description: '将文本内容转换为图片',
        parameters: {
          type: 'object',
          properties: {
            text: {
              type: 'string',
              description: '要转换为图片的文本内容'
            },
            theme: {
              type: 'string',
              enum: ['light', 'dark'],
              default: 'light',
              description: '图片主题，浅色或深色'
            },
            width: {
              type: 'number',
              default: 800,
              description: '图片宽度'
            }
          },
          required: ['text']
        }
      }
    ]
  });
});

// 文字转图片功能 - 使用SVG代替Canvas
app.post('/mcp/text-to-image', async (req, res) => {
  try {
    const { text, theme = 'light', width = 800 } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: '缺少文本内容' });
    }
    
    // 创建SVG图片
    const svgContent = createSVGImage(text, theme, width);
    
    // 保存为SVG文件
    const fileName = `${uuidv4()}.svg`;
    const filePath = path.join(UPLOADS_DIR, fileName);
    fs.writeFileSync(filePath, svgContent);
    
    // 返回图片URL
    const imageUrl = `/images/${fileName}`;
    
    res.json({
      success: true,
      imageUrl,
      downloadUrl: imageUrl
    });
  } catch (error) {
    console.error('文字转图片出错:', error);
    res.status(500).json({ error: '处理请求时出错' });
  }
});

// 创建SVG图片
function createSVGImage(text: string, theme: 'light' | 'dark', width: number): string {
  const LINE_HEIGHT = 24;
  const PADDING = 20;
  const MAX_WIDTH = width - (PADDING * 2);
  
  // 设置颜色
  const colors = {
    light: {
      background: '#ffffff',
      text: '#333333',
      border: '#eeeeee'
    },
    dark: {
      background: '#1e1e1e',
      text: '#ffffff',
      border: '#333333'
    }
  };
  
  // 处理文本，转义特殊字符
  const escapedText = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
  
  // 简单分割文本为行
  const lines = [];
  const words = escapedText.split(' ');
  let currentLine = '';
  
  // 估算每个单词的平均长度，用于简单的断行处理
  for (const word of words) {
    if (currentLine.length + word.length + 1 > MAX_WIDTH / 8) { // 使用简单的估算
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = currentLine ? `${currentLine} ${word}` : word;
    }
  }
  
  if (currentLine) {
    lines.push(currentLine);
  }
  
  // 计算整体高度
  const height = lines.length * LINE_HEIGHT + (PADDING * 2);
  
  // 构建SVG元素
  let svgContent = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <rect width="${width}" height="${height}" fill="${colors[theme].background}" stroke="${colors[theme].border}" stroke-width="1" />
  `;
  
  // 添加文本元素
  lines.forEach((line, index) => {
    svgContent += `
      <text x="${PADDING}" y="${PADDING + index * LINE_HEIGHT + 16}" 
        font-family="Arial, sans-serif" font-size="16px" fill="${colors[theme].text}">
        ${line}
      </text>
    `;
  });
  
  // 闭合SVG标签
  svgContent += '</svg>';
  
  return svgContent;
}

// 启动服务器
const PORT = process.env.MCP_SERVER_PORT || 3100;
app.listen(PORT, () => {
  console.log(`MCP服务器运行在端口 ${PORT}`);
});

export default app; 