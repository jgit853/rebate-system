# 快速部署指南(5分钟版)

> 如果您已经有腾讯云服务器和数据库,可以按照此快速指南完成部署。  
> 完整详细版请查看 [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)

---

## 前置条件

- ✅ 已购买腾讯云服务器(Ubuntu 22.04,2核4GB)
- ✅ 已购买腾讯云MySQL数据库(1核1GB)
- ✅ 已获取数据库内网地址和密码

---

## 一、连接服务器

```bash
ssh ubuntu@您的服务器IP
```

---

## 二、安装环境(首次部署)

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# 安装pnpm和PM2
sudo npm install -g pnpm pm2

# 安装Nginx
sudo apt install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# 安装Git
sudo apt install -y git
```

---

## 三、部署项目

### 1. 创建项目目录

```bash
sudo mkdir -p /var/www/rebate_system
sudo chown -R ubuntu:ubuntu /var/www/rebate_system
cd /var/www/rebate_system
```

### 2. 上传代码

**方法A: 使用Git**
```bash
git clone https://github.com/您的用户名/rebate_system.git .
```

**方法B: 手动上传**
- 使用FileZilla/MobaXterm上传项目文件到 `/var/www/rebate_system`

### 3. 配置环境变量

```bash
# 复制配置模板
cp .env.production.example .env.production

# 编辑配置文件
nano .env.production
```

修改以下关键配置:
```env
DATABASE_URL=mysql://root:您的密码@数据库地址:3306/rebate_system
JWT_SECRET=随机生成的复杂字符串
OWNER_OPEN_ID=管理员OpenID
```

保存: `Ctrl+X` → `Y` → `Enter`

### 4. 执行自动部署脚本

```bash
# 给脚本添加执行权限
chmod +x scripts/deploy.sh

# 执行部署
./scripts/deploy.sh
```

脚本会自动完成:
- ✅ 安装依赖
- ✅ 构建前端
- ✅ 同步数据库
- ✅ 启动应用

---

## 四、配置Nginx

```bash
# 复制Nginx配置
sudo cp nginx.conf.example /etc/nginx/sites-available/rebate_system

# 编辑配置(替换域名或使用IP)
sudo nano /etc/nginx/sites-available/rebate_system
```

如果使用IP访问,将 `server_name` 改为:
```nginx
server_name _;
```

启用配置:
```bash
sudo ln -s /etc/nginx/sites-available/rebate_system /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

---

## 五、测试访问

在浏览器访问:
```
http://您的服务器IP
```

应该看到系统登录页面!

---

## 六、配置HTTPS(可选)

如果有域名:

```bash
# 安装Certbot
sudo apt install -y certbot python3-certbot-nginx

# 申请证书
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

---

## 常用命令

```bash
# 查看应用状态
pm2 status

# 查看日志
pm2 logs rebate-system

# 重启应用
pm2 restart rebate-system

# 更新代码并重新部署
cd /var/www/rebate_system
./scripts/deploy.sh
```

---

## 下一步

- 📖 查看完整部署指南: [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
- 🔐 配置数据库定期备份
- 📊 设置服务器监控
- 🌐 绑定自定义域名

---

**遇到问题?** 查看日志定位错误:
```bash
pm2 logs rebate-system --err
sudo tail -f /var/log/nginx/error.log
```
