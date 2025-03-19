# Perplexica Python Cache API

这是一个Python FastAPI应用，为Perplexica提供Redis缓存层，用于加速重复的搜索和聊天查询。

## 功能

- 为搜索和聊天请求提供Redis缓存支持
- 自动缓存API响应结果，设置合理的过期时间
- 记录缓存命中和未命中的详细日志
- 提供缓存清理API

## 技术栈

- Python 3.9+
- FastAPI Web框架
- Redis缓存（通过redis-py异步客户端）
- Docker容器化部署

## 目录结构

```
python_backend/
├── Dockerfile         # Docker构建文件
├── main.py            # 主应用入口
├── redis_client.py    # Redis客户端连接模块
├── requirements.txt   # 项目依赖
├── test_cache.py      # 缓存测试脚本
└── .env.example       # 环境变量示例
```

## 使用方法

### 通过Docker Compose启动

与Perplexica一起启动：

```bash
# 在Perplexica项目根目录
docker-compose up -d
```

### 本地开发

1. 创建虚拟环境：

```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
# 或
venv\Scripts\activate     # Windows
```

2. 安装依赖：

```bash
pip install -r requirements.txt
```

3. 复制环境变量文件：

```bash
cp .env.example .env
```

4. 启动应用：

```bash
uvicorn main:app --reload
```

## API端点

- `GET /`: 健康检查
- `POST /api/search`: 带缓存的搜索端点
- `POST /api/chat`: 带缓存的聊天端点
- `DELETE /api/cache/clear`: 清除所有缓存

## 测试缓存

运行测试脚本验证缓存功能：

```bash
python test_cache.py
```

## 缓存策略

- 搜索查询缓存键格式：`search:{focus_mode}:{query}`
- 聊天查询缓存键格式：`chat:{focus_mode}:{history_hash}:{query}`
- 缓存过期时间：5分钟（300秒）
- Redis内存策略：allkeys-lru（当达到内存上限时，删除最近最少使用的键）
- 最大内存限制：100MB

## 日志

日志文件位于：

- 应用日志：`app.log`
- 测试日志：`test_cache.log` 