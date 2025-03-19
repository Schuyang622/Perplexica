"""
测试缓存功能的脚本。
连续发送相同的查询请求，验证第一次是否调用API并缓存，后续请求是否使用缓存。
"""
import asyncio
import httpx
import time
from loguru import logger

logger.add("test_cache.log", rotation="10 MB", level="INFO")

API_URL = "http://localhost:8000"

async def test_search_cache():
    """测试搜索缓存功能"""
    logger.info("===== 开始测试搜索缓存 =====")
    
    async with httpx.AsyncClient() as client:
        # 查询参数
        query = "python redis cache example"
        
        # 第一次请求，预期会调用API并缓存结果
        logger.info(f"发送第一次搜索请求: '{query}'")
        start_time = time.time()
        response1 = await client.post(
            f"{API_URL}/api/search",
            json={"query": query, "focusMode": "webSearch"}
        )
        elapsed1 = time.time() - start_time
        
        if response1.status_code != 200:
            logger.error(f"第一次请求失败: {response1.status_code} - {response1.text}")
            return
            
        result1 = response1.json()
        is_cached1 = result1.get("cached", False)
        logger.info(f"第一次请求完成: 耗时 {elapsed1:.4f}秒, 是否缓存: {is_cached1}")
        
        # 等待1秒
        await asyncio.sleep(1)
        
        # 第二次请求，预期会直接从缓存获取结果
        logger.info(f"发送第二次搜索请求 (相同查询): '{query}'")
        start_time = time.time()
        response2 = await client.post(
            f"{API_URL}/api/search",
            json={"query": query, "focusMode": "webSearch"}
        )
        elapsed2 = time.time() - start_time
        
        if response2.status_code != 200:
            logger.error(f"第二次请求失败: {response2.status_code} - {response2.text}")
            return
            
        result2 = response2.json()
        is_cached2 = result2.get("cached", False)
        logger.info(f"第二次请求完成: 耗时 {elapsed2:.4f}秒, 是否缓存: {is_cached2}")
        
        # 验证结果
        logger.info(f"速度对比: 第一次 {elapsed1:.4f}秒 vs 第二次 {elapsed2:.4f}秒")
        logger.info(f"缓存状态: 第一次 {is_cached1} vs 第二次 {is_cached2}")
        
        # 清理缓存
        logger.info("清理缓存...")
        clear_response = await client.delete(f"{API_URL}/api/cache/clear")
        logger.info(f"缓存清理结果: {clear_response.status_code} - {clear_response.text}")
        
    logger.info("===== 搜索缓存测试完成 =====\n")

async def test_chat_cache():
    """测试聊天缓存功能"""
    logger.info("===== 开始测试聊天缓存 =====")
    
    async with httpx.AsyncClient() as client:
        # 查询参数
        query = "如何使用Python和Redis实现缓存？"
        history = [["human", "你好"], ["ai", "你好！有什么我可以帮助你的？"]]
        
        # 第一次请求，预期会调用API并缓存结果
        logger.info(f"发送第一次聊天请求: '{query}'")
        start_time = time.time()
        response1 = await client.post(
            f"{API_URL}/api/chat",
            json={
                "query": query, 
                "focusMode": "academicSearch",
                "history": history
            }
        )
        elapsed1 = time.time() - start_time
        
        if response1.status_code != 200:
            logger.error(f"第一次请求失败: {response1.status_code} - {response1.text}")
            return
            
        result1 = response1.json()
        is_cached1 = result1.get("cached", False)
        logger.info(f"第一次请求完成: 耗时 {elapsed1:.4f}秒, 是否缓存: {is_cached1}")
        
        # 等待1秒
        await asyncio.sleep(1)
        
        # 第二次请求，预期会直接从缓存获取结果
        logger.info(f"发送第二次聊天请求 (相同查询和历史): '{query}'")
        start_time = time.time()
        response2 = await client.post(
            f"{API_URL}/api/chat",
            json={
                "query": query, 
                "focusMode": "academicSearch",
                "history": history
            }
        )
        elapsed2 = time.time() - start_time
        
        if response2.status_code != 200:
            logger.error(f"第二次请求失败: {response2.status_code} - {response2.text}")
            return
            
        result2 = response2.json()
        is_cached2 = result2.get("cached", False)
        logger.info(f"第二次请求完成: 耗时 {elapsed2:.4f}秒, 是否缓存: {is_cached2}")
        
        # 验证结果
        logger.info(f"速度对比: 第一次 {elapsed1:.4f}秒 vs 第二次 {elapsed2:.4f}秒")
        logger.info(f"缓存状态: 第一次 {is_cached1} vs 第二次 {is_cached2}")
        
        # 清理缓存
        logger.info("清理缓存...")
        clear_response = await client.delete(f"{API_URL}/api/cache/clear")
        logger.info(f"缓存清理结果: {clear_response.status_code} - {clear_response.text}")
        
    logger.info("===== 聊天缓存测试完成 =====\n")

async def main():
    """主函数"""
    logger.info("开始缓存测试")
    
    # 测试服务器是否在线
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{API_URL}/")
            logger.info(f"服务器状态: {response.status_code} - {response.json()}")
    except Exception as e:
        logger.error(f"无法连接到服务器: {e}")
        logger.info("请确保服务器已启动并运行在 http://localhost:8000")
        return
    
    # 测试搜索缓存
    await test_search_cache()
    
    # 测试聊天缓存
    await test_chat_cache()
    
    logger.info("缓存测试完成")

if __name__ == "__main__":
    asyncio.run(main()) 