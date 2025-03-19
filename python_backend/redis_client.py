import os
import redis.asyncio as redis
from loguru import logger

# 获取Redis配置
REDIS_HOST = os.getenv("REDIS_HOST", "redis")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
REDIS_DB = int(os.getenv("REDIS_DB", 0))
REDIS_PASSWORD = os.getenv("REDIS_PASSWORD", None)

# Redis客户端实例
_redis_client = None

async def get_redis():
    """
    获取Redis客户端实例，采用单例模式
    """
    global _redis_client
    
    if _redis_client is None:
        try:
            # 创建Redis连接
            _redis_client = redis.Redis(
                host=REDIS_HOST,
                port=REDIS_PORT,
                db=REDIS_DB,
                password=REDIS_PASSWORD,
                decode_responses=True,  # 自动将响应解码为字符串
            )
            
            # 测试连接
            await _redis_client.ping()
            logger.info(f"Redis连接成功: {REDIS_HOST}:{REDIS_PORT}")
        except Exception as e:
            logger.error(f"Redis连接失败: {e}")
            raise
    
    return _redis_client 