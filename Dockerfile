FROM node:22-slim
WORKDIR /app
RUN npm install -g pnpm@10
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY tsconfig.json ./
COPY src ./src
ENV LANDED_API_BASE=https://api.landed.jobs/api/v1
CMD ["pnpm", "exec", "tsx", "src/stdio.ts"]
