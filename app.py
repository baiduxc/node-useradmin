# Hugging Face Spaces入口文件
# 注意：Hugging Face Spaces主要用于Python/ML模型
# 对于Node.js项目，建议使用Docker部署方式

import subprocess
import os
import sys

def main():
    """启动Node.js应用"""
    print("Starting Node.js application...")
    
    # 检查Node.js是否安装
    try:
        result = subprocess.run(['node', '--version'], capture_output=True, text=True)
        print(f"Node.js version: {result.stdout.strip()}")
    except FileNotFoundError:
        print("Error: Node.js is not installed")
        sys.exit(1)
    
    # 安装依赖（如果需要）
    if not os.path.exists('node_modules'):
        print("Installing dependencies...")
        subprocess.run(['npm', 'install'], check=True)
    
    # 运行数据库迁移
    print("Running database migrations...")
    subprocess.run(['npm', 'run', 'migrate'], check=True)
    
    # 启动应用
    print("Starting application...")
    os.system('npm start')

if __name__ == "__main__":
    main()

