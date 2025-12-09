#!/bin/bash

# ===================================
# 快速部署脚本 - 经销商返利对账系统
# ===================================
#
# 使用说明:
# 1. 首次部署前,请先完成环境安装(Node.js、pnpm、PM2等)
# 2. 配置好 .env.production 文件
# 3. 给脚本添加执行权限: chmod +x deploy.sh
# 4. 执行部署: ./deploy.sh

set -e  # 遇到错误立即退出

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}经销商返利对账系统 - 自动部署脚本${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# ----------------------------------
# 1. 检查环境
# ----------------------------------
echo -e "${YELLOW}[1/7] 检查运行环境...${NC}"

if ! command -v node &> /dev/null; then
    echo -e "${RED}错误: 未安装Node.js,请先安装${NC}"
    exit 1
fi

if ! command -v pnpm &> /dev/null; then
    echo -e "${RED}错误: 未安装pnpm,请先安装${NC}"
    exit 1
fi

if ! command -v pm2 &> /dev/null; then
    echo -e "${RED}错误: 未安装PM2,请先安装${NC}"
    exit 1
fi

echo -e "${GREEN}✓ 环境检查通过${NC}"
echo ""

# ----------------------------------
# 2. 检查配置文件
# ----------------------------------
echo -e "${YELLOW}[2/7] 检查配置文件...${NC}"

if [ ! -f ".env.production" ]; then
    echo -e "${RED}错误: 未找到 .env.production 文件${NC}"
    echo -e "${YELLOW}请复制 .env.production.example 并填写配置${NC}"
    exit 1
fi

echo -e "${GREEN}✓ 配置文件存在${NC}"
echo ""

# ----------------------------------
# 3. 拉取最新代码(如果是Git仓库)
# ----------------------------------
if [ -d ".git" ]; then
    echo -e "${YELLOW}[3/7] 拉取最新代码...${NC}"
    git pull
    echo -e "${GREEN}✓ 代码更新完成${NC}"
else
    echo -e "${YELLOW}[3/7] 跳过(非Git仓库)${NC}"
fi
echo ""

# ----------------------------------
# 4. 安装依赖
# ----------------------------------
echo -e "${YELLOW}[4/7] 安装项目依赖...${NC}"
pnpm install --prod=false
echo -e "${GREEN}✓ 依赖安装完成${NC}"
echo ""

# ----------------------------------
# 5. 构建前端代码
# ----------------------------------
echo -e "${YELLOW}[5/7] 构建前端代码...${NC}"
pnpm run build
echo -e "${GREEN}✓ 前端构建完成${NC}"
echo ""

# ----------------------------------
# 6. 推送数据库变更
# ----------------------------------
echo -e "${YELLOW}[6/7] 同步数据库结构...${NC}"
pnpm db:push
echo -e "${GREEN}✓ 数据库同步完成${NC}"
echo ""

# ----------------------------------
# 7. 重启应用
# ----------------------------------
echo -e "${YELLOW}[7/7] 重启应用...${NC}"

# 检查应用是否已在运行
if pm2 list | grep -q "rebate-system"; then
    echo "应用已存在,执行重启..."
    pm2 restart rebate-system
else
    echo "首次启动应用..."
    pm2 start ecosystem.config.js
    pm2 save
fi

echo -e "${GREEN}✓ 应用重启完成${NC}"
echo ""

# ----------------------------------
# 8. 显示应用状态
# ----------------------------------
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}部署完成!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
pm2 status
echo ""
echo -e "${YELLOW}查看日志: pm2 logs rebate-system${NC}"
echo -e "${YELLOW}停止应用: pm2 stop rebate-system${NC}"
echo -e "${YELLOW}重启应用: pm2 restart rebate-system${NC}"
echo ""
