/**
 * PM2进程管理配置文件 - 经销商返利对账系统
 * 
 * 使用说明:
 * 1. 确保已安装PM2: npm install -g pm2
 * 2. 启动应用: pm2 start ecosystem.config.js
 * 3. 查看状态: pm2 status
 * 4. 查看日志: pm2 logs rebate-system
 * 5. 重启应用: pm2 restart rebate-system
 * 6. 设置开机自启: pm2 startup && pm2 save
 */

module.exports = {
  apps: [
    {
      // 应用名称
      name: 'rebate-system',
      
      // 启动脚本
      script: 'npm',
      args: 'run start',
      
      // 工作目录
      cwd: '/var/www/rebate_system',
      
      // 实例数量(建议设置为CPU核心数)
      instances: 1,
      
      // 集群模式(单实例使用fork模式)
      exec_mode: 'fork',
      
      // 自动重启配置
      autorestart: true,
      watch: false, // 生产环境不建议开启文件监听
      max_memory_restart: '500M', // 内存超过500MB自动重启
      
      // 环境变量
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      
      // 日志配置
      error_file: '/var/log/pm2/rebate-system-error.log',
      out_file: '/var/log/pm2/rebate-system-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      // 进程管理
      min_uptime: '10s', // 最小运行时间
      max_restarts: 10, // 最大重启次数
      restart_delay: 4000, // 重启延迟(毫秒)
      
      // 优雅退出
      kill_timeout: 5000, // 强制杀死前的等待时间
      wait_ready: false,
      listen_timeout: 3000,
    },
  ],
};
