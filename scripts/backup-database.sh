#!/bin/bash

# ===================================
# 数据库自动备份脚本
# ===================================
#
# 使用说明:
# 1. 修改下方的数据库连接信息
# 2. 给脚本添加执行权限: chmod +x backup-database.sh
# 3. 手动执行测试: ./backup-database.sh
# 4. 设置定时任务(每天凌晨2点备份):
#    crontab -e
#    添加: 0 2 * * * /var/www/rebate_system/scripts/backup-database.sh

# ----------------------------------
# 配置区域(请修改为实际值)
# ----------------------------------
DB_HOST="<替换为数据库内网地址>"
DB_PORT="3306"
DB_USER="root"
DB_PASS="<替换为数据库密码>"
DB_NAME="rebate_system"

# 备份目录
BACKUP_DIR="/var/backups/mysql"
# 保留最近N天的备份
KEEP_DAYS=7

# ----------------------------------
# 备份逻辑(无需修改)
# ----------------------------------

# 创建备份目录
mkdir -p $BACKUP_DIR

# 生成备份文件名(包含日期时间)
BACKUP_FILE="$BACKUP_DIR/${DB_NAME}_$(date +%Y%m%d_%H%M%S).sql"

# 执行备份
echo "开始备份数据库: $DB_NAME"
mysqldump -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASS $DB_NAME > $BACKUP_FILE

# 检查备份是否成功
if [ $? -eq 0 ]; then
    echo "备份成功: $BACKUP_FILE"
    
    # 压缩备份文件
    gzip $BACKUP_FILE
    echo "压缩完成: ${BACKUP_FILE}.gz"
    
    # 删除超过保留天数的旧备份
    find $BACKUP_DIR -name "${DB_NAME}_*.sql.gz" -mtime +$KEEP_DAYS -delete
    echo "已清理 $KEEP_DAYS 天前的旧备份"
    
    # 显示当前备份列表
    echo "当前备份文件:"
    ls -lh $BACKUP_DIR
else
    echo "备份失败,请检查数据库连接信息"
    exit 1
fi
