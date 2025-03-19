FROM node:16-alpine

WORKDIR /app

# 创建应用目录
RUN mkdir -p /app/uploads/images

# 复制MCP服务器代码
COPY mcp-server.js /app/

# 安装少量必要的依赖
RUN npm init -y && \
    npm install express cors uuid --no-audit --no-fund

# 暴露端口
EXPOSE 3100

# 启动服务器
CMD ["node", "mcp-server.js"]