import axios from 'axios';

// MCP客户端配置
const MCP_SERVER_URL = process.env.MCP_SERVER_URL || 'http://perplexica-mcp:3100/mcp';

/**
 * MCP客户端类，用于与MCP服务器通信
 */
export class MCPClient {
  private baseUrl: string;

  constructor(baseUrl: string = MCP_SERVER_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * 获取MCP服务器的元信息
   */
  async getServerInfo() {
    try {
      const response = await axios.get(this.baseUrl);
      return response.data;
    } catch (error) {
      console.error('获取MCP服务器信息失败:', error);
      throw new Error('获取MCP服务器信息失败');
    }
  }

  /**
   * 将文本转换为图片
   * @param text 要转换的文本内容
   * @param options 额外选项
   * @returns 图片URL信息
   */
  async textToImage(text: string, options: { theme?: 'light' | 'dark', width?: number } = {}) {
    try {
      const response = await axios.post(`${this.baseUrl}/text-to-image`, {
        text,
        ...options
      });
      
      return response.data;
    } catch (error) {
      console.error('文字转图片失败:', error);
      throw new Error('文字转图片失败');
    }
  }

  /**
   * 检测用户意图是否为要求生成图片
   * @param message 用户消息
   * @returns 布尔值表示是否需要生成图片以及需要处理的文本内容
   */
  isTextToImageRequest(message: string): { isImageRequest: boolean; extractedContent?: string } {
    const lowerMessage = message.toLowerCase();
    
    // 检测是否包含请求生成图片的关键词
    const keywords = [
      '转为图片', '生成图片', '转换为图片', '转换成图片', 
      '转成图片', '制作图片', '做成图片', '变成图片',
      'convert to image', 'make an image', 'generate image',
      '保存为图片', '导出为图片', '导出图片', '保存图片',
      '图片形式', '生成一张图片', '转为图像', '创建图片',
      '图形化', '可视化', '以图片方式', '渲染为图片',
      '输出为图片', '图像化', '以图片形式展示'
    ];
    
    // 尝试提取指定内容
    const extractContentPatterns = [
      /把[：:]([\s\S]+)(?:生成|转为|转换为|制作)(?:成)?图片/i,
      /把([\s\S]+)(?:生成|转为|转换为|制作)(?:成)?图片/i,
      /将[：:]([\s\S]+)(?:生成|转为|转换为|制作)(?:成)?图片/i,
      /将([\s\S]+)(?:生成|转为|转换为|制作)(?:成)?图片/i,
      /(?:生成|转为|转换为|制作)(?:成)?图片[：:]([\s\S]+)/i,
      /关于([\s\S]+)(?:生成|制作|创建)(?:一张)?图片/i
    ];
    
    // 检查是否有明确的提取模式
    for (const pattern of extractContentPatterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        return { 
          isImageRequest: true,
          extractedContent: match[1].trim()
        };
      }
    }
    
    // 简单版：检查是否包含任一关键词
    if (keywords.some(keyword => lowerMessage.includes(keyword))) {
      return { isImageRequest: true };
    }
    
    // 更复杂版：尝试识别句子意图
    const imagePhrasePatterns = [
      /能否.{0,10}(图片|图像)/,
      /请.{0,10}(图片|图像)/,
      /把.{0,20}(转|生成|制作|创建|变成).{0,10}(图片|图像)/,
      /将.{0,20}(转|生成|制作|创建|变成).{0,10}(图片|图像)/,
      /以.{0,10}(图片|图像).{0,10}(形式|方式)/
    ];
    
    if (imagePhrasePatterns.some(pattern => pattern.test(lowerMessage))) {
      return { isImageRequest: true };
    }
    
    return { isImageRequest: false };
  }

  /**
   * 生成内容并创建图片
   * @param query 用户查询
   * @param llm 大模型实例
   * @param history 对话历史
   * @param options 图片选项
   * @returns 生成的内容和图片URL
   */
  async generateContentAndCreateImage(
    query: string, 
    llm: any, 
    history: any[] = [],
    options: { theme?: 'light' | 'dark', width?: number } = {}
  ): Promise<{ content: string; imageData: TextToImageResponse }> {
    try {
      // 从用户查询中提取内容提示
      const imageRequestResult = this.isTextToImageRequest(query);
      let contentPrompt = query;
      
      if (imageRequestResult.extractedContent) {
        // 用户明确指定了要转换的内容
        contentPrompt = imageRequestResult.extractedContent;
      } else {
        // 构建提示以生成内容
        contentPrompt = `请针对以下请求生成一个简洁、信息丰富的回答，将会被转换为图片格式：
"${query}"

回答应该:
1. 包含标题和适当的小标题
2. 使用要点列表呈现关键信息
3. 适当分段，便于阅读
4. 突出重要概念
5. 不超过300字

以"#"开头作为主标题，以"##"开头作为子标题。`;
      }
      
      // 调用大模型生成内容
      const response = await llm.invoke([
        ...history,
        { role: 'user', content: contentPrompt }
      ]);
      
      const generatedContent = typeof response.content === 'string' 
        ? response.content 
        : JSON.stringify(response.content);
      
      // 将生成的内容转换为图片
      const imageResult = await this.textToImage(generatedContent, options);
      
      return {
        content: generatedContent,
        imageData: imageResult
      };
    } catch (error) {
      console.error('生成内容并创建图片失败:', error);
      throw new Error('生成内容并创建图片失败');
    }
  }
}

// 导出默认实例
export const mcpClient = new MCPClient();

// 导出接口类型
export interface TextToImageResponse {
  success: boolean;
  imageUrl: string;
  downloadUrl: string;
  error?: string;
}

// 单例导出
export default mcpClient; 