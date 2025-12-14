# 经销商返利对账系统

一个专业的经销商返利和对账管理系统,支持多层级返利计算、自动结算、对账单生成等功能。

## 🌟 核心功能

### 管理后台
- **经销商管理** - 核心/普通经销商分类管理,支持CRUD操作
- **产品管理** - 产品信息维护,价格管理
- **订单管理** - 订单录入、编辑、删除,支持多产品订单
- **结算周期管理** - 创建结算周期,激活/停用控制
- **结算管理** - 自动计算返利,审批结算单
- **政策设置** - 返利阶梯、市场基金比例等政策参数配置

### 轻量级后台管理面板 (新增)
- **用户管理增强** - 用户列表、角色管理、禁用/启用、登录历史追踪
- **内容管理系统(CMS)** - 公告管理、帮助文档、通知消息
- **系统设置面板** - 基础设置、主题配置、邮件SMTP、安全策略、自动备份

### 经销商门户
- **对账单查看** - 查看当前周期结算详情
- **采购计算器** - 智能推荐最优采购方案
- **历史记录** - 查看历史采购计算记录
- **密码管理** - 修改登录密码

## 📊 返利计算规则

系统支持多维度返利计算:

1. **核心经销商返利** - 基于回款金额的阶梯返利
2. **市场基金** - 按回款金额百分比计算
3. **下级提成** - 核心经销商可获得下级普通经销商的提成
4. **综合让利** - 综合计算总让利比例

## 🛠️ 技术栈

### 前端
- **React 19** - 用户界面框架
- **TypeScript** - 类型安全
- **Tailwind CSS 4** - 样式框架
- **shadcn/ui** - UI组件库
- **tRPC** - 类型安全的API调用
- **Wouter** - 轻量级路由

### 后端
- **Node.js** - 运行环境
- **Express 4** - Web框架
- **tRPC 11** - 端到端类型安全API
- **Drizzle ORM** - 数据库ORM
- **MySQL/TiDB** - 数据库

## 🚀 快速开始

### 环境要求
- Node.js 22+
- pnpm 9+
- MySQL 8.0+ 或 TiDB

### 安装依赖
```bash
pnpm install
```

### 配置环境变量
复制 `.env.example` 为 `.env` 并配置:
```env
DATABASE_URL=mysql://user:password@host:port/database
JWT_SECRET=your-jwt-secret
# ... 其他配置
```

### 数据库迁移
```bash
pnpm db:push
```

### 启动开发服务器
```bash
pnpm dev
```

访问 http://localhost:3000

## 📁 项目结构

```
rebate_system/
├── client/                 # 前端代码
│   ├── src/
│   │   ├── pages/         # 页面组件
│   │   ├── components/    # 可复用组件
│   │   ├── lib/          # 工具函数
│   │   └── App.tsx       # 应用入口
│   └── public/           # 静态资源
├── server/                # 后端代码
│   ├── routers.ts        # tRPC路由
│   ├── db.ts            # 数据库查询
│   ├── auth.ts          # 认证逻辑
│   └── _core/           # 核心框架
├── drizzle/              # 数据库schema
│   └── schema.ts        # 表定义
├── shared/               # 前后端共享代码
└── scripts/             # 部署脚本
```

## 🔐 默认账号

### 管理员
- 账号: 通过OAuth登录(系统所有者自动为管理员)

### 经销商
- 账号: 由管理员创建
- 初始密码: 由管理员设置
- 首次登录需修改密码

## 📖 部署指南

详细部署文档请查看:
- [腾讯云部署指南](./DEPLOYMENT_GUIDE.md)
- [快速启动指南](./QUICK_START.md)
- [部署检查清单](./DEPLOYMENT_CHECKLIST.md)

## 🔧 常用命令

```bash
# 开发
pnpm dev              # 启动开发服务器

# 数据库
pnpm db:push          # 推送schema到数据库
pnpm db:studio        # 打开数据库管理界面

# 构建
pnpm build            # 构建生产版本

# 部署
./scripts/deploy.sh   # 一键部署脚本
```

## 📝 功能清单

- [x] 经销商管理
- [x] 产品管理
- [x] 订单管理
- [x] 结算周期管理
- [x] 自动结算计算
- [x] 结算审批
- [x] 政策参数配置
- [x] 经销商对账单
- [x] 采购计算器
- [x] 用户管理增强
- [x] 公告管理(CMS)
- [x] 系统设置面板
- [ ] 数据导出功能
- [ ] 富文本编辑器
- [ ] 操作日志审计

## 🚀 CI/CD (GitHub Actions)

本项目已配置自动化CI/CD流程:

- **CI流程** (`.github/workflows/ci.yml`) - 自动执行 install / lint / typecheck / test / build
- **CD流程** (`.github/workflows/deploy-tencent.yml`) - push到main分支自动部署到腾讯云

### GitHub Secrets配置

需要在GitHub仓库配置以下Secrets (Settings → Secrets and variables → Actions):

- `TC_HOST` - 腾讯云服务器公网IP/域名
- `TC_PORT` - SSH端口 (通常22)
- `TC_USER` - 部署用户 (建议非root)
- `TC_SSH_PRIVATE_KEY` - 部署用户的SSH私钥 (OpenSSH格式)
- `TC_DEPLOY_PATH` - 部署目录 (例: `/opt/rebate-system`)

## 📚 文档

- [🛠️ 技术设计文档](./docs/TECHNICAL_DESIGN.md) - 架构设计、模块说明、安全设计
- [📝 轻量级后台管理面板操作手册](./docs/ADMIN_PANEL_USER_GUIDE.md) - 详细的用户操作指南
- [🚀 腾讯云部署指南](./DEPLOYMENT_GUIDE.md) - 小白版部署教程
- [⚡ 快速启动指南](./QUICK_START.md) - 5分钟快速上手
- [✅ 部署检查清单](./DEPLOYMENT_CHECKLIST.md) - 部署前检查项

## 🤝 贡献

欢迎提交Issue和Pull Request!

## 📄 许可证

MIT License

## 📧 联系方式

如有问题或建议,请通过GitHub Issues联系。
