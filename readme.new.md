docker build -f .\backend.dockerfile -t perplexica-backend:latest -t schuyang/perplexica-backend:latest .
docker build -f .\app.dockerfile -t perplexica-frontend:latest -t schuyang/perplexica-frontend:latest .
第一题：
    完成的功能包括：
    后端实现：
        创建了focus-modes.ts路由文件，实现了Focus模式的CRUD操作
        将数据存储在data/focus-modes.json文件中
        系统预设模式受到保护，无法修改或删除
    前端实现：
        在settings目录中添加了focus-modes路由和页面
        实现了Focus模式的列表展示、创建、编辑和删除功能
        图标选择器允许用户选择不同的图标
        在设置页面添加了指向Focus模式管理页面的链接
        使用自定义通知组件而不是依赖第三方库
        组件集成：
        修改了现有的Focus组件，使其支持自定义Focus模式
        实现了从API加载自定义模式的功能
        添加了图标渲染函数


第二题：

    完成的功能包括：
    添加了Redis服务和Python后端到docker-compose.yaml：
        配置了Redis服务，设置了最大内存和内存策略
        添加了新的Python后端服务，连接Redis和SearxNG
    创建了Python FastAPI应用：
        实现了Redis缓存连接模块
        创建了两个主要API端点：/api/search和/api/chat
        在每个API中实现了缓存逻辑（检查、存储、过期时间）
        添加了详细的日志记录，区分缓存命中和未命中
    实现了缓存策略：
        使用查询内容和上下文作为缓存键
        设置了5分钟的缓存过期时间
        配置了Redis的内存限制和LRU淘汰策略
    创建了测试脚本：
        实现了测试脚本验证缓存功能
        对比缓存命中和未命中的响应时间
        提供了缓存清理功能
    要运行和测试这个实现，请按照以下步骤操作：
    1.启动整个应用栈
        docker-compose up -d
    2.等待服务启动后，运行测试脚本：
        cd python_backend
        python test_cache.py
    3.检查日志文件查看详细的缓存命中和未命中信息：
        cat python_backend/app.log
        cat python_backend/test_cache.log


第三题：
涉及完成内容：
    我们已经成功完成了MCP（Model Context Protocol）到Perplexica的集成，实现了文字转图片功能。以下是我们完成的工作：
    创建了一个MCP服务器（src/mcp/server.ts），它使用canvas库将文本渲染为图片
    开发了一个MCP客户端（src/mcp/client.ts），用于与MCP服务器通信
    修改了WebSocket消息处理程序（src/websocket/messageHandler.ts），以识别文本转图片的请求并调用MCP服务
    更新了前端组件（ui/components/MessageBox.tsx），以显示生成的图片和提供下载链接
    修改了ChatWindow组件（ui/components/ChatWindow.tsx），以处理图片数据
    更新了类型定义（ui/types.d.ts），添加了imageData字段
    更新了Docker配置（docker-compose.yaml和backend.dockerfile），添加了MCP服务和必要的依赖
    现在系统具备以下功能：
    检测用户意图 - 当用户发送包含"转为图片"、"生成图片"等关键词的消息时，系统会识别出这是一个图片生成请求
    生成图片 - 后端接收到请求后，会调用MCP服务将文本转换为图片
    图片显示 - 前端接收到图片数据后，会在消息流中展示生成的图片
    图片下载 - 用户可以通过下载按钮保存生成的图片

    在用户界面中，可以通过以下方式触发图片生成：
    向AI提问，获得回答后，发送包含"请把回答转为图片"、"生成图片"等关键词的新消息
    系统会自动识别这个请求，并将上一条AI回答转换为图片