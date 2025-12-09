# 经销商返利对账系统 - 腾讯云部署指南(小白版)

> 本指南专为没有服务器部署经验的用户编写,提供详细的步骤说明和成本优化建议。

---

## 📋 目录

1. [部署方案概述](#部署方案概述)
2. [成本预算](#成本预算)
3. [准备工作](#准备工作)
4. [步骤一:购买腾讯云服务器](#步骤一购买腾讯云服务器)
5. [步骤二:购买云数据库MySQL](#步骤二购买云数据库mysql)
6. [步骤三:配置服务器环境](#步骤三配置服务器环境)
7. [步骤四:部署项目代码](#步骤四部署项目代码)
8. [步骤五:配置域名访问](#步骤五配置域名访问)
9. [步骤六:配置HTTPS证书](#步骤六配置https证书)
10. [日常运维](#日常运维)
11. [常见问题](#常见问题)

---

## 部署方案概述

本系统采用**前后端一体化架构**,需要以下云资源:

| 资源类型 | 用途 | 推荐配置 |
|---------|------|---------|
| **云服务器CVM** | 运行Node.js应用 | 2核4GB内存,40GB硬盘 |
| **云数据库MySQL** | 存储业务数据 | 1核1GB,20GB存储 |
| **域名** | 提供访问地址 | 可选,建议购买 |
| **SSL证书** | HTTPS加密访问 | 免费证书即可 |

**部署架构图**:

```
用户浏览器
    ↓
域名(example.com)
    ↓
腾讯云服务器(运行Node.js + Nginx)
    ↓
腾讯云MySQL数据库
```

---

## 成本预算

### 最低成本方案(约 **¥50-80/月**)

| 项目 | 配置 | 价格 | 说明 |
|-----|------|------|------|
| 云服务器CVM | 2核4GB,带宽1Mbps | ¥40-60/月 | 新用户首年有优惠 |
| 云数据库MySQL | 1核1GB,20GB存储 | ¥10-20/月 | 按量计费更灵活 |
| 域名 | .com/.cn域名 | ¥50-80/年 | 可选,首年优惠 |
| SSL证书 | 免费DV证书 | ¥0 | 腾讯云免费提供 |

**💡 省钱技巧**:
- 新用户可享受首年3折优惠,服务器最低可到¥100/年
- 选择按量计费的数据库,业务量小时成本更低
- 使用腾讯云免费SSL证书,无需购买付费证书
- 带宽选择1Mbps即可,后期可按需升级

---

## 准备工作

### 1. 注册腾讯云账号

访问 [腾讯云官网](https://cloud.tencent.com/),点击右上角"注册"按钮:

1. 使用手机号或微信注册账号
2. 完成**实名认证**(个人认证即可,需要身份证照片)
3. 实名认证通过后才能购买服务器

**⚠️ 注意**: 实名认证通常需要1-2小时审核,建议提前完成。

### 2. 充值账户余额

进入"费用中心"→"账户充值",建议先充值¥100-200元:
- 支持微信、支付宝、银行卡充值
- 充值后可享受新用户优惠价格

### 3. 准备本地工具

在您的电脑上安装以下工具:

**Windows用户**:
- [MobaXterm](https://mobaxterm.mobatek.net/download.html) - SSH连接工具(免费版即可)
- [FileZilla](https://filezilla-project.org/) - FTP文件传输工具(可选)

**Mac用户**:
- 使用系统自带的"终端"应用即可
- 或安装 [iTerm2](https://iterm2.com/) 获得更好体验

---

## 步骤一:购买腾讯云服务器

### 1.1 进入购买页面

1. 登录腾讯云控制台
2. 点击顶部导航"产品" → "云服务器CVM"
3. 点击"立即选购"按钮

### 1.2 选择配置

**基础配置**:

| 配置项 | 推荐选择 | 说明 |
|-------|---------|------|
| 计费模式 | 包年包月 | 比按量计费便宜30% |
| 地域 | 就近选择(如华南-广州) | 离用户越近访问越快 |
| 可用区 | 随机分配 | 保持默认即可 |
| 实例 | 标准型S5 | 性价比最高 |
| 规格 | 2核4GB | 满足100+用户并发 |

**镜像配置**:

| 配置项 | 推荐选择 | 说明 |
|-------|---------|------|
| 镜像 | 公共镜像 | 选择官方镜像 |
| 操作系统 | Ubuntu Server 22.04 LTS | 稳定且易用 |

**存储和网络**:

| 配置项 | 推荐选择 | 说明 |
|-------|---------|------|
| 系统盘 | 高性能云硬盘 40GB | 足够使用 |
| 公网带宽 | 按流量计费 1Mbps | 灵活且便宜 |
| 分配公网IP | 勾选"免费分配独立公网IP" | 必须勾选 |

**安全组**:

选择"放通全部端口"(后续会手动配置防火墙)

### 1.3 设置密码

**登录方式**: 选择"设置密码"
- 设置一个复杂密码(包含大小写字母、数字、符号)
- **务必记住此密码**,后续登录服务器需要使用

### 1.4 确认购买

1. 购买时长选择"1年"(享受新用户优惠)
2. 勾选"同意《腾讯云服务协议》"
3. 点击"立即购买"并完成支付

**💡 提示**: 购买后会收到短信和邮件通知,包含服务器的公网IP地址。

---

## 步骤二:购买云数据库MySQL

### 2.1 进入购买页面

1. 控制台 → "产品" → "云数据库MySQL"
2. 点击"立即选购"

### 2.2 选择配置

**基础配置**:

| 配置项 | 推荐选择 | 说明 |
|-------|---------|------|
| 计费模式 | 按量计费 | 业务量小时更省钱 |
| 地域 | 与服务器相同 | 必须同地域才能内网访问 |
| 数据库版本 | MySQL 8.0 | 最新稳定版 |
| 架构 | 基础版 | 成本最低 |
| 规格 | 1核1GB | 满足初期使用 |
| 硬盘 | 20GB | 可后期扩容 |

**网络配置**:

| 配置项 | 推荐选择 | 说明 |
|-------|---------|------|
| 网络 | 与CVM相同VPC | 确保内网互通 |
| 安全组 | 放通3306端口 | 允许服务器访问 |

### 2.3 设置数据库

1. **root密码**: 设置数据库管理员密码(务必记住)
2. **字符集**: 选择"utf8mb4"(支持中文和emoji)
3. 点击"立即购买"

### 2.4 获取连接信息

购买完成后,进入数据库实例详情页:

1. 记录**内网地址**(格式如: `rm-xxxxx.mysql.rds.aliyuncs.com:3306`)
2. 记录**root用户名**(通常是`root`)
3. 记录您设置的**密码**

**⚠️ 重要**: 请将这些信息保存到记事本,后续配置需要使用。

---

## 步骤三:配置服务器环境

### 3.1 连接到服务器

**Windows用户(使用MobaXterm)**:

1. 打开MobaXterm
2. 点击左上角"Session" → "SSH"
3. 填写连接信息:
   - **Remote host**: 服务器公网IP(在控制台查看)
   - **Username**: `ubuntu`
   - **Port**: `22`
4. 点击"OK",首次连接会提示输入密码
5. 输入购买服务器时设置的密码

**Mac用户(使用终端)**:

打开终端,输入以下命令:

```bash
ssh ubuntu@您的服务器IP
```

首次连接会提示是否信任,输入`yes`,然后输入密码。

**✅ 成功标志**: 看到类似 `ubuntu@VM-xxx:~$` 的提示符,说明已成功连接。

### 3.2 更新系统

连接成功后,依次执行以下命令:

```bash
# 更新软件包列表
sudo apt update

# 升级已安装的软件包
sudo apt upgrade -y
```

**⏱️ 耗时**: 约3-5分钟,请耐心等待。

### 3.3 安装Node.js环境

执行以下命令安装Node.js 22.x版本:

```bash
# 添加Node.js官方源
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -

# 安装Node.js
sudo apt install -y nodejs

# 验证安装
node -v  # 应显示 v22.x.x
npm -v   # 应显示 10.x.x
```

### 3.4 安装pnpm包管理器

```bash
# 安装pnpm
sudo npm install -g pnpm

# 验证安装
pnpm -v  # 应显示版本号
```

### 3.5 安装Git

```bash
# 安装Git
sudo apt install -y git

# 验证安装
git --version  # 应显示版本号
```

### 3.6 安装PM2进程管理器

PM2用于保持Node.js应用持续运行:

```bash
# 安装PM2
sudo npm install -g pm2

# 验证安装
pm2 -v  # 应显示版本号
```

### 3.7 安装Nginx反向代理

```bash
# 安装Nginx
sudo apt install -y nginx

# 启动Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# 验证安装
sudo systemctl status nginx  # 应显示 active (running)
```

**✅ 测试**: 在浏览器访问 `http://您的服务器IP`,应该看到Nginx欢迎页面。

---

## 步骤四:部署项目代码

### 4.1 创建项目目录

```bash
# 创建应用目录
sudo mkdir -p /var/www/rebate_system
sudo chown -R ubuntu:ubuntu /var/www/rebate_system
cd /var/www/rebate_system
```

### 4.2 上传项目文件

**方法一: 使用Git(推荐)**

如果您的代码已托管在GitHub/GitLab:

```bash
# 克隆代码仓库
git clone https://github.com/您的用户名/rebate_system.git .
```

**方法二: 手动上传**

1. 在本地将项目文件夹打包为 `rebate_system.zip`
2. 使用FileZilla或MobaXterm的SFTP功能上传到服务器
3. 在服务器上解压:

```bash
cd /var/www/rebate_system
unzip rebate_system.zip
```

### 4.3 安装项目依赖

```bash
cd /var/www/rebate_system

# 安装依赖包
pnpm install

# 构建前端代码
pnpm run build
```

**⏱️ 耗时**: 约5-10分钟,取决于网络速度。

### 4.4 配置环境变量

创建生产环境配置文件:

```bash
nano .env.production
```

按 `i` 进入编辑模式,粘贴以下内容(替换为您的实际信息):

```env
# 数据库配置
DATABASE_URL=mysql://root:您的数据库密码@数据库内网地址/rebate_system

# JWT密钥(随机生成一个复杂字符串)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# OAuth配置(如果使用Manus OAuth)
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://oauth.manus.im
VITE_APP_ID=your-app-id

# 应用配置
VITE_APP_TITLE=经销商返利对账系统
NODE_ENV=production
PORT=3000
```

**⚠️ 重要替换项**:
- `您的数据库密码`: 步骤二中设置的MySQL密码
- `数据库内网地址`: 步骤二中记录的内网地址
- `JWT_SECRET`: 生成一个随机字符串(可访问 https://randomkeygen.com/ 生成)

保存文件:
1. 按 `Esc` 退出编辑模式
2. 输入 `:wq` 并按回车保存

### 4.5 初始化数据库

```bash
# 推送数据库结构
pnpm db:push
```

**✅ 成功标志**: 看到 "Database schema pushed successfully" 提示。

### 4.6 启动应用

使用PM2启动应用:

```bash
# 启动应用
pm2 start npm --name "rebate-system" -- run start

# 设置开机自启
pm2 startup
pm2 save

# 查看应用状态
pm2 status
```

**✅ 成功标志**: `pm2 status` 显示应用状态为 `online`。

### 4.7 测试应用

```bash
# 测试应用是否正常响应
curl http://localhost:3000
```

应该看到HTML内容返回,说明应用启动成功。

---

## 步骤五:配置域名访问

### 5.1 购买域名(可选)

如果您还没有域名:

1. 进入腾讯云"域名注册"页面
2. 搜索并购买一个域名(如 `yourbusiness.com`)
3. 完成域名实名认证(1-2小时审核)

**💡 提示**: 如果暂时不想购买域名,可以直接使用服务器IP访问,跳过此步骤。

### 5.2 添加域名解析

1. 进入腾讯云"云解析DNS"
2. 点击"添加解析"
3. 添加以下记录:

| 主机记录 | 记录类型 | 记录值 | 说明 |
|---------|---------|--------|------|
| @ | A | 服务器公网IP | 主域名解析 |
| www | A | 服务器公网IP | www子域名解析 |

**⏱️ 生效时间**: 通常10分钟内生效,最长24小时。

### 5.3 配置Nginx反向代理

创建Nginx配置文件:

```bash
sudo nano /etc/nginx/sites-available/rebate_system
```

粘贴以下配置(替换 `yourdomain.com` 为您的域名):

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # 如果暂时没有域名,使用IP访问,则改为:
    # server_name _;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

启用配置:

```bash
# 创建软链接
sudo ln -s /etc/nginx/sites-available/rebate_system /etc/nginx/sites-enabled/

# 删除默认配置
sudo rm /etc/nginx/sites-enabled/default

# 测试配置
sudo nginx -t

# 重启Nginx
sudo systemctl restart nginx
```

**✅ 测试**: 在浏览器访问 `http://您的域名` 或 `http://服务器IP`,应该看到系统登录页面。

---

## 步骤六:配置HTTPS证书

### 6.1 安装Certbot

```bash
# 安装Certbot和Nginx插件
sudo apt install -y certbot python3-certbot-nginx
```

### 6.2 申请免费SSL证书

**如果您有域名**:

```bash
# 自动申请并配置证书
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

按提示操作:
1. 输入邮箱地址(用于证书到期提醒)
2. 同意服务条款(输入 `Y`)
3. 选择是否重定向HTTP到HTTPS(建议选择 `2` 强制HTTPS)

**⏱️ 耗时**: 约1-2分钟。

### 6.3 设置自动续期

Let's Encrypt证书有效期90天,需要定期续期:

```bash
# 测试自动续期
sudo certbot renew --dry-run
```

如果测试成功,Certbot会自动添加续期任务到系统计划任务。

**✅ 完成**: 现在可以通过 `https://您的域名` 安全访问系统了!

---

## 日常运维

### 查看应用日志

```bash
# 查看实时日志
pm2 logs rebate-system

# 查看最近100行日志
pm2 logs rebate-system --lines 100

# 清空日志
pm2 flush
```

### 重启应用

```bash
# 重启应用
pm2 restart rebate-system

# 重新加载(零停机重启)
pm2 reload rebate-system
```

### 更新代码

```bash
cd /var/www/rebate_system

# 拉取最新代码
git pull

# 安装新依赖
pnpm install

# 重新构建
pnpm run build

# 推送数据库变更
pnpm db:push

# 重启应用
pm2 restart rebate-system
```

### 数据库备份

```bash
# 创建备份目录
mkdir -p ~/backups

# 备份数据库(在服务器上执行)
mysqldump -h 数据库内网地址 -u root -p rebate_system > ~/backups/rebate_system_$(date +%Y%m%d).sql
```

**💡 建议**: 设置每周自动备份,使用cron定时任务。

### 监控服务器资源

```bash
# 查看CPU和内存使用
htop

# 查看磁盘使用
df -h

# 查看网络连接
netstat -tunlp
```

---

## 常见问题

### Q1: 无法访问网站,显示"无法访问此网站"

**可能原因**:
1. 服务器防火墙未开放80/443端口
2. 安全组未配置入站规则
3. Nginx未启动

**解决方法**:

```bash
# 检查Nginx状态
sudo systemctl status nginx

# 检查应用状态
pm2 status

# 检查端口监听
sudo netstat -tunlp | grep :80
sudo netstat -tunlp | grep :3000

# 开放防火墙端口(如果使用ufw)
sudo ufw allow 80
sudo ufw allow 443
```

同时检查腾讯云控制台的安全组规则,确保开放了80和443端口。

### Q2: 数据库连接失败

**可能原因**:
1. 数据库地址配置错误
2. 数据库密码错误
3. 数据库安全组未开放3306端口

**解决方法**:

```bash
# 测试数据库连接
mysql -h 数据库内网地址 -u root -p

# 检查环境变量配置
cat .env.production
```

确保 `DATABASE_URL` 格式正确:
```
mysql://用户名:密码@数据库地址:端口/数据库名
```

### Q3: 应用启动后自动停止

**可能原因**:
1. 端口被占用
2. 环境变量配置错误
3. 依赖包未正确安装

**解决方法**:

```bash
# 查看详细错误日志
pm2 logs rebate-system --err

# 检查端口占用
sudo lsof -i :3000

# 重新安装依赖
cd /var/www/rebate_system
rm -rf node_modules
pnpm install
```

### Q4: 如何修改管理员密码?

系统使用OAuth登录,管理员身份由环境变量 `OWNER_OPEN_ID` 控制。如需修改:

1. 登录系统获取您的OpenID
2. 修改 `.env.production` 中的 `OWNER_OPEN_ID`
3. 重启应用: `pm2 restart rebate-system`

### Q5: 如何升级服务器配置?

当业务量增长,可以在腾讯云控制台进行配置升级:

1. 进入云服务器控制台
2. 选择实例 → "更多" → "调整配置"
3. 选择新配置(如升级到4核8GB)
4. 确认并支付差价

**💡 提示**: 升级过程中服务会短暂中断(约1-2分钟)。

### Q6: 如何查看系统访问量?

```bash
# 查看Nginx访问日志
sudo tail -f /var/log/nginx/access.log

# 统计今日访问量
sudo cat /var/log/nginx/access.log | grep $(date +%d/%b/%Y) | wc -l
```

---

## 🎉 部署完成检查清单

完成以下检查,确保系统正常运行:

- [ ] 可以通过域名或IP访问系统首页
- [ ] 管理员可以正常登录管理后台
- [ ] 经销商可以使用用户名密码登录
- [ ] 可以创建经销商、产品、订单等数据
- [ ] 数据库连接正常,数据可以保存
- [ ] HTTPS证书已配置(如果有域名)
- [ ] PM2显示应用状态为 `online`
- [ ] 已设置数据库定期备份计划

---

## 📞 技术支持

如果在部署过程中遇到问题:

1. **查看日志**: 大部分问题可以通过日志定位
   ```bash
   pm2 logs rebate-system
   sudo tail -f /var/log/nginx/error.log
   ```

2. **检查配置**: 确认环境变量和Nginx配置正确

3. **重启服务**: 很多问题可以通过重启解决
   ```bash
   pm2 restart rebate-system
   sudo systemctl restart nginx
   ```

4. **联系开发者**: 提供详细的错误日志和配置信息

---

## 📚 扩展阅读

- [腾讯云服务器快速入门](https://cloud.tencent.com/document/product/213/2936)
- [腾讯云MySQL使用指南](https://cloud.tencent.com/document/product/236/3128)
- [PM2官方文档](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [Nginx配置指南](https://nginx.org/en/docs/beginners_guide.html)
- [Let's Encrypt证书申请](https://letsencrypt.org/getting-started/)

---

**文档版本**: v1.0  
**最后更新**: 2025年1月  
**作者**: Manus AI
