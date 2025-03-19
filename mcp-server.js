const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// 确保上传目录存在
const UPLOADS_DIR = path.join(__dirname, 'uploads', 'images');
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

// 文字转图片功能 - 使用SVG
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
function createSVGImage(text, theme, width) {
  const LINE_HEIGHT = 24;
  const PADDING = 30;
  const MAX_WIDTH = width - (PADDING * 2);
  
  // 设置颜色
  const colors = {
    light: {
      background: '#ffffff',
      text: '#333333',
      border: '#eeeeee',
      title: '#1a73e8',
      shadow: 'rgba(0,0,0,0.05)'
    },
    dark: {
      background: '#1e1e1e',
      text: '#ffffff',
      border: '#333333',
      title: '#7ab5ff',
      shadow: 'rgba(0,0,0,0.2)'
    }
  };
  
  // 处理文本，转义特殊字符
  const escapedText = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
  
  // 更智能地分割文本为行 - 改进的处理方式
  const lines = [];
  // 首先按自然段落分隔
  const paragraphs = escapedText.split(/\n+/);
  
  for (const paragraph of paragraphs) {
    if (!paragraph.trim()) {
      lines.push(''); // 保留空行
      continue;
    }
    
    // 对于代码块或特殊格式，保持原样
    if (paragraph.trim().startsWith('```') || paragraph.trim().match(/^\s*[-*]\s+/)) {
      lines.push(paragraph);
      continue;
    }
    
    // 普通文本，进行分词处理
    let currentLine = '';
    // 针对中文和英文混合的特殊处理
    const segments = paragraph.split(/(\s+)/).filter(Boolean);
    
    for (const segment of segments) {
      // 如果是空格，直接添加到当前行
      if (segment.match(/^\s+$/)) {
        currentLine += segment;
        continue;
      }
      
      // 如果添加这个片段后行宽超过限制，则换行
      if (currentLine.length + segment.length > MAX_WIDTH / 7) { 
        // 7是一个经验值，用于估计平均字符宽度
        if (currentLine) lines.push(currentLine);
        currentLine = segment;
      } else {
        currentLine += segment;
      }
    }
    
    if (currentLine) lines.push(currentLine);
  }
  
  // 计算整体高度，考虑标题和边距
  const titleHeight = 60; // 为标题留出空间
  const height = titleHeight + lines.length * LINE_HEIGHT + (PADDING * 2);
  
  // 添加当前日期
  const currentDate = new Date().toLocaleDateString('zh-CN');
  
  // 构建SVG元素 - 添加更多样式和元素
  let svgContent = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" style="font-family: 'Arial', 'Noto Sans SC', sans-serif;">
      <!-- 背景和边框 -->
      <rect width="${width}" height="${height}" fill="${colors[theme].background}" rx="8" ry="8" />
      <rect x="1" y="1" width="${width-2}" height="${height-2}" fill="none" rx="7" ry="7" 
        stroke="${colors[theme].border}" stroke-width="1" />
      
      <!-- 阴影效果 -->
      <rect x="2" y="2" width="${width-4}" height="${height-4}" rx="6" ry="6" 
        fill="none" stroke="${colors[theme].shadow}" stroke-width="2" opacity="0.5" />
      
      <!-- 标题区域 -->
      <rect x="0" y="0" width="${width}" height="${titleHeight}" fill="${colors[theme].title}" opacity="0.1" rx="8" ry="8" />
      <path d="M0,${titleHeight} H${width}" stroke="${colors[theme].border}" stroke-width="1" />
      
      <!-- Perplexica Logo和标题 -->
      <text x="${PADDING}" y="${PADDING + 15}" 
        font-family="'Arial', sans-serif" font-size="22px" font-weight="bold" fill="${colors[theme].title}">
        Perplexica 文字转图片
      </text>
      
      <!-- 日期信息 -->
      <text x="${width - PADDING}" y="${PADDING + 15}" 
        font-family="'Arial', sans-serif" font-size="14px" text-anchor="end" fill="${colors[theme].text}" opacity="0.7">
        ${currentDate}
      </text>
  `;
  
  // 添加文本元素
  lines.forEach((line, index) => {
    // 特殊处理标题格式
    if (line.startsWith('# ')) {
      svgContent += `
        <text x="${PADDING}" y="${titleHeight + (index * LINE_HEIGHT) + 16}" 
          font-family="'Arial', 'Noto Sans SC', sans-serif" font-size="20px" font-weight="bold" fill="${colors[theme].title}">
          ${line.substring(2)}
        </text>
      `;
    } 
    // 处理二级标题
    else if (line.startsWith('## ')) {
      svgContent += `
        <text x="${PADDING}" y="${titleHeight + (index * LINE_HEIGHT) + 16}" 
          font-family="'Arial', 'Noto Sans SC', sans-serif" font-size="18px" font-weight="bold" fill="${colors[theme].title}">
          ${line.substring(3)}
        </text>
      `;
    }
    // 处理列表项
    else if (line.match(/^\s*[-*]\s+/)) {
      svgContent += `
        <text x="${PADDING + 10}" y="${titleHeight + (index * LINE_HEIGHT) + 16}" 
          font-family="'Arial', 'Noto Sans SC', sans-serif" font-size="16px" fill="${colors[theme].text}">
          <tspan x="${PADDING}" font-weight="bold">•</tspan>
          <tspan x="${PADDING + 20}">${line.replace(/^\s*[-*]\s+/, '')}</tspan>
        </text>
      `;
    }
    // 普通文本
    else {
      svgContent += `
        <text x="${PADDING}" y="${titleHeight + (index * LINE_HEIGHT) + 16}" 
          font-family="'Arial', 'Noto Sans SC', sans-serif" font-size="16px" fill="${colors[theme].text}">
          ${line}
        </text>
      `;
    }
  });
  
  // 添加水印和脚注
  svgContent += `
    <text x="${width - PADDING}" y="${height - PADDING}" 
      font-family="'Arial', sans-serif" font-size="12px" text-anchor="end" fill="${colors[theme].text}" opacity="0.5">
      Generated by Perplexica MCP Server
    </text>
  `;
  
  // 闭合SVG标签
  svgContent += '</svg>';
  
  return svgContent;
}

// 健康检查端点
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// 启动服务器
const PORT = process.env.MCP_SERVER_PORT || 3100;
app.listen(PORT, () => {
  console.log(`MCP服务器运行在端口 ${PORT}`);
}); 