/**
 * 与Python缓存API交互的服务
 */

// Python API的基础URL
const PYTHON_API_URL = process.env.NEXT_PUBLIC_PYTHON_API_URL || 'http://localhost:8000';

/**
 * 搜索响应接口
 */
interface SearchResponse {
  message: string;
  sources: Array<{
    title: string;
    url: string;
    content: string;
    engines: string[];
  }>;
  cached: boolean;
  imageUrl?: string;
  downloadUrl?: string;
}

/**
 * 发送搜索请求到Python缓存API
 * @param query 搜索查询
 * @param focusMode 聚焦模式
 * @param optimizationMode 优化模式
 * @returns 搜索结果
 */
export async function searchWithCache(
  query: string,
  focusMode: string = 'webSearch',
  optimizationMode: string = 'balanced',
): Promise<SearchResponse> {
  try {
    const response = await fetch(`${PYTHON_API_URL}/api/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        focusMode,
        optimizationMode,
      }),
    });

    if (!response.ok) {
      throw new Error(`搜索请求失败: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('与Python缓存API通信时出错:', error);
    throw error;
  }
}

/**
 * 发送聊天请求到Python缓存API
 * @param query 聊天查询
 * @param history 聊天历史记录
 * @param focusMode 聚焦模式
 * @param optimizationMode 优化模式
 * @returns 聊天响应
 */
export async function chatWithCache(
  query: string,
  history: Array<[string, string]> = [],
  focusMode: string = 'webSearch',
  optimizationMode: string = 'balanced',
) {
  try {
    const response = await fetch(`${PYTHON_API_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        history,
        focusMode,
        optimizationMode,
      }),
    });

    if (!response.ok) {
      throw new Error(`聊天请求失败: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('与Python缓存API通信时出错:', error);
    throw error;
  }
}

/**
 * 清除缓存
 * @returns 清除结果
 */
export async function clearCache() {
  try {
    const response = await fetch(`${PYTHON_API_URL}/api/cache/clear`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`清除缓存请求失败: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('清除缓存时出错:', error);
    throw error;
  }
} 