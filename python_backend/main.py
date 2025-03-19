from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os
import httpx
import json
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from redis_client import get_redis
from loguru import logger
import time
import re

# 配置logger
logger.add("app.log", rotation="10 MB", level="INFO")

app = FastAPI(title="Perplexica Python Cache API")

# 添加CORS中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 获取SearxNG API URL
SEARXNG_API_URL = os.getenv("SEARXNG_API_URL", "http://searxng:8080")

# 获取MCP服务器URL
MCP_SERVER_URL = os.getenv("MCP_SERVER_URL", "http://perplexica-mcp:3100/mcp")

# 定义请求模型
class SearchRequest(BaseModel):
    query: str
    focusMode: str = "webSearch"
    optimizationMode: str = "balanced"
    history: List[List[str]] = []

# 定义响应模型
class SearchResponse(BaseModel):
    message: str
    sources: List[Dict[str, Any]] = []
    cached: bool = False
    imageUrl: Optional[str] = None
    downloadUrl: Optional[str] = None

@app.get("/")
async def root():
    return {"message": "Perplexica Python Cache API is running"}

@app.post("/api/search", response_model=SearchResponse)
async def search(request: SearchRequest, redis=Depends(get_redis)):
    """
    搜索端点，支持Redis缓存。
    检查Redis是否存在缓存，如果有则直接返回，否则调用SearxNG获取结果并缓存。
    """
    # 创建缓存键
    cache_key = f"search:{request.focusMode}:{request.query}"
    
    start_time = time.time()
    
    # 尝试从Redis获取缓存
    cached_result = await redis.get(cache_key)
    
    if cached_result:
        # 解析缓存结果
        result = json.loads(cached_result)
        elapsed_time = time.time() - start_time
        logger.info(f"Cache HIT for '{request.query}' - Elapsed time: {elapsed_time:.4f}s")
        return SearchResponse(
            message=result["message"],
            sources=result.get("sources", []),
            cached=True
        )
    
    # 缓存未命中，调用SearxNG
    logger.info(f"Cache MISS for '{request.query}' - Calling SearxNG")
    
    try:
        # 转换请求数据
        # 注意：这里假设SearxNG接受的是相同格式的请求
        # 如果格式不同，需要进行转换
        payload = {
            "q": request.query,
            "categories": request.focusMode,
            "format": "json"
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{SEARXNG_API_URL}/search", 
                params=payload,
                timeout=10.0
            )
            
            if response.status_code != 200:
                raise HTTPException(status_code=response.status_code, detail="Error from search service")
                
            search_results = response.json()
            
            # 处理搜索结果，格式化为我们需要的格式
            sources = []
            for result in search_results.get("results", []):
                sources.append({
                    "title": result.get("title", ""),
                    "url": result.get("url", ""),
                    "content": result.get("content", ""),
                    "engines": result.get("engines", [])
                })
            
            # 构建回复消息
            message = f"Search results for: {request.query}"
            
            # 构造结果
            result = {
                "message": message,
                "sources": sources
            }
            
            # 缓存结果，设置过期时间为5分钟（300秒）
            await redis.set(cache_key, json.dumps(result), ex=300)
            
            elapsed_time = time.time() - start_time
            logger.info(f"Search completed for '{request.query}' - Elapsed time: {elapsed_time:.4f}s")
            
            return SearchResponse(
                message=message,
                sources=sources,
                cached=False
            )
    
    except httpx.RequestError as exc:
        logger.error(f"Error making request to SearxNG: {exc}")
        raise HTTPException(status_code=500, detail=f"Error making request to search service: {exc}")
    
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        raise HTTPException(status_code=500, detail=f"Unexpected error: {e}")

def is_text_to_image_request(message: str) -> dict:
    """
    检测用户意图是否为要求生成图片
    
    Args:
        message: 用户消息
        
    Returns:
        dict: 包含是否为图片请求和可能提取的内容
    """
    lowerMessage = message.lower()
    
    # 检测是否包含请求生成图片的关键词
    keywords = [
        '转为图片', '生成图片', '转换为图片', '转换成图片', 
        '转成图片', '制作图片', '做成图片', '变成图片',
        'convert to image', 'make an image', 'generate image',
        '保存为图片', '导出为图片', '导出图片', '保存图片',
        '图片形式', '生成一张图片', '转为图像', '创建图片',
        '图形化', '可视化', '以图片方式', '渲染为图片',
        '输出为图片', '图像化', '以图片形式展示'
    ]
    
    # 尝试提取指定内容
    extractContentPatterns = [
        r'把[：:]([\s\S]+)(?:生成|转为|转换为|制作)(?:成)?图片',
        r'把([\s\S]+)(?:生成|转为|转换为|制作)(?:成)?图片',
        r'将[：:]([\s\S]+)(?:生成|转为|转换为|制作)(?:成)?图片',
        r'将([\s\S]+)(?:生成|转为|转换为|制作)(?:成)?图片',
        r'(?:生成|转为|转换为|制作)(?:成)?图片[：:]([\s\S]+)',
        r'关于([\s\S]+)(?:生成|制作|创建)(?:一张)?图片'
    ]
    
    # 检查是否有明确的提取模式
    for pattern in extractContentPatterns:
        match = re.search(pattern, message, re.IGNORECASE)
        if match and match.group(1):
            return {
                "isImageRequest": True,
                "extractedContent": match.group(1).strip()
            }
    
    # 简单版：检查是否包含任一关键词
    if any(keyword in lowerMessage for keyword in keywords):
        return {"isImageRequest": True}
    
    # 更复杂版：尝试识别句子意图
    imagePhrasePatterns = [
        r'能否.{0,10}(图片|图像)',
        r'请.{0,10}(图片|图像)',
        r'把.{0,20}(转|生成|制作|创建|变成).{0,10}(图片|图像)',
        r'将.{0,20}(转|生成|制作|创建|变成).{0,10}(图片|图像)',
        r'以.{0,10}(图片|图像).{0,10}(形式|方式)'
    ]
    
    if any(re.search(pattern, lowerMessage) for pattern in imagePhrasePatterns):
        return {"isImageRequest": True}
    
    return {"isImageRequest": False}

async def call_mcp_text_to_image(text: str, theme: str = "light") -> dict:
    """
    调用MCP服务将文本转换为图片
    
    Args:
        text: 要转换的文本
        theme: 主题（light或dark）
        
    Returns:
        dict: 包含图片URL的响应
    """
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{MCP_SERVER_URL}/text-to-image",
                json={"text": text, "theme": theme},
                timeout=15.0  # 图片生成可能需要更长时间
            )
            
            if response.status_code != 200:
                logger.error(f"MCP服务响应错误: {response.status_code}")
                return {"success": False, "error": "图片生成服务响应错误"}
            
            return response.json()
    except Exception as e:
        logger.error(f"调用MCP服务失败: {e}")
        return {"success": False, "error": f"图片生成服务调用失败: {e}"}

@app.post("/api/chat", response_model=SearchResponse)
async def chat(request: SearchRequest, redis=Depends(get_redis)):
    """
    聊天端点，支持Redis缓存和图片生成。
    1. 检查历史记录和查询是否有缓存
    2. 检测是否为图片生成请求
    3. 如果是图片请求，调用MCP服务生成图片
    4. 如果不是图片请求，通过SearxNG进行搜索
    """
    # 考虑到聊天历史的存在，创建一个更复杂的缓存键
    history_hash = ""
    if request.history:
        # 将历史记录转换为字符串并创建简单哈希
        history_str = json.dumps(request.history)
        history_hash = str(abs(hash(history_str)) % 10000000)  # 简单的哈希
    
    cache_key = f"chat:{request.focusMode}:{history_hash}:{request.query}"
    
    start_time = time.time()
    
    # 尝试从Redis获取缓存
    cached_result = await redis.get(cache_key)
    
    if cached_result:
        # 解析缓存结果
        result = json.loads(cached_result)
        elapsed_time = time.time() - start_time
        logger.info(f"Cache HIT for chat '{request.query}' - Elapsed time: {elapsed_time:.4f}s")
        return SearchResponse(
            message=result["message"],
            sources=result.get("sources", []),
            cached=True,
            imageUrl=result.get("imageUrl"),
            downloadUrl=result.get("downloadUrl")
        )
    
    # 检测是否为图片生成请求
    image_request = is_text_to_image_request(request.query)
    
    if image_request["isImageRequest"]:
        # 处理图片生成请求
        logger.info(f"检测到图片生成请求: '{request.query}'")
        
        try:
            # 准备要转换为图片的文本
            text_content = ""
            
            if "extractedContent" in image_request and image_request["extractedContent"]:
                # 使用提取的内容
                text_content = image_request["extractedContent"]
                message = f"以下内容已生成为图片：\n\n{text_content}"
            else:
                # 使用整个查询
                text_content = request.query
                message = f"已将您的请求转换为图片。"
            
            # 调用MCP服务生成图片
            image_result = await call_mcp_text_to_image(text_content)
            
            if not image_result.get("success", False):
                # 图片生成失败，返回错误信息
                error_message = image_result.get("error", "图片生成失败，请重试。")
                return SearchResponse(
                    message=error_message,
                    sources=[],
                    cached=False
                )
            
            # 构造结果
            result = {
                "message": message,
                "sources": [],
                "imageUrl": image_result.get("imageUrl", ""),
                "downloadUrl": image_result.get("downloadUrl", "")
            }
            
            # 缓存结果，设置过期时间为5分钟（300秒）
            await redis.set(cache_key, json.dumps(result), ex=300)
            
            elapsed_time = time.time() - start_time
            logger.info(f"图片生成完成: '{request.query}' - Elapsed time: {elapsed_time:.4f}s")
            
            return SearchResponse(
                message=message,
                sources=[],
                cached=False,
                imageUrl=image_result.get("imageUrl", ""),
                downloadUrl=image_result.get("downloadUrl", "")
            )
            
        except Exception as e:
            logger.error(f"图片生成请求处理失败: {e}")
            return SearchResponse(
                message=f"图片生成失败: {str(e)}",
                sources=[],
                cached=False
            )
    
    # 不是图片请求，使用SearxNG进行搜索
    logger.info(f"Cache MISS for chat '{request.query}' - Searching with SearxNG")
    
    try:
        # 准备SearxNG搜索请求
        payload = {
            "q": request.query,
            "categories": request.focusMode,
            "format": "json"
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{SEARXNG_API_URL}/search", 
                params=payload,
                timeout=10.0
            )
            
            if response.status_code != 200:
                raise HTTPException(status_code=response.status_code, detail="Error from search service")
                
            search_results = response.json()
            
            # 处理搜索结果，格式化为我们需要的格式
            sources = []
            for result in search_results.get("results", []):
                sources.append({
                    "title": result.get("title", ""),
                    "url": result.get("url", ""),
                    "content": result.get("content", ""),
                    "engines": result.get("engines", [])
                })
            
            # 生成回复消息
            message = f"以下是关于 '{request.query}' 的搜索结果："
            
            if sources:
                for i, source in enumerate(sources[:3], 1):  # 仅使用前3个结果作为摘要
                    message += f"\n\n{i}. {source['title']}\n"
                    message += f"{source['content'][:150]}..." if len(source['content']) > 150 else source['content']
            else:
                message = f"未找到关于 '{request.query}' 的搜索结果。请尝试其他关键词。"
            
            # 构造结果
            result = {
                "message": message,
                "sources": sources
            }
            
            # 缓存结果，设置过期时间为5分钟（300秒）
            await redis.set(cache_key, json.dumps(result), ex=300)
            
            elapsed_time = time.time() - start_time
            logger.info(f"Chat search completed for '{request.query}' - Elapsed time: {elapsed_time:.4f}s")
            
            return SearchResponse(
                message=message,
                sources=sources,
                cached=False
            )
    
    except httpx.RequestError as exc:
        logger.error(f"Error making request to SearxNG: {exc}")
        raise HTTPException(status_code=500, detail=f"Error making request to search service: {exc}")
    
    except Exception as e:
        logger.error(f"Unexpected error in chat: {e}")
        raise HTTPException(status_code=500, detail=f"Unexpected error in chat: {e}")

@app.delete("/api/cache/clear")
async def clear_cache(redis=Depends(get_redis)):
    """
    清除所有缓存数据。仅用于测试和管理目的。
    """
    await redis.flushdb()
    return {"message": "Cache cleared successfully"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True) 