FROM node:18-slim

# 直接安装依赖，不尝试修改sources.list
RUN apt-get update || (rm -rf /var/lib/apt/lists/* && apt-get update) && \
    apt-get install -y --no-install-recommends \
    build-essential \
    python3 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# 创建工作目录
WORKDIR /home/perplexica

# 复制项目文件
COPY src /home/perplexica/src
COPY tsconfig.json /home/perplexica/
COPY drizzle.config.ts /home/perplexica/
COPY package.json /home/perplexica/
COPY yarn.lock /home/perplexica/

# 创建必要的目录
RUN mkdir -p /home/perplexica/data
RUN mkdir -p /home/perplexica/uploads/images

# 安装依赖并构建项目
RUN yarn install --network-timeout 600000
RUN yarn build

CMD ["yarn", "start"]