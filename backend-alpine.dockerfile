FROM node:18-alpine

# 安装基本构建工具
RUN apk add --no-cache python3 make g++ build-base

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