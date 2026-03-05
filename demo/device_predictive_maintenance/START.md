# 快速启动指南

## Windows 用户（推荐）

### 一键启动

在项目根目录运行：
```cmd
start-demo.bat
```

这个脚本会自动：
1. ✅ 检查并生成演示数据
2. ✅ 检查后端API路由注册
3. ✅ 复制前端文件（如需要）
4. ✅ 启动后端和前端服务（会打开两个新窗口）

### 分步启动

**终端1 - 后端：**
```cmd
start-backend.bat
```

**终端2 - 前端：**
```cmd
start-frontend.bat
```

## 手动启动

### 步骤1：准备环境

**检查依赖：**
```powershell
# 检查Python
python --version  # 需要 3.11+

# 检查Node.js
node --version  # 需要 18+

# 检查pnpm
pnpm --version  # 如果没有，运行: npm install -g pnpm
```

**安装依赖：**
```powershell
# 后端依赖
cd backend
pip install -r requirements.txt
# 或使用 uv: uv sync

# 前端依赖
cd ../frontend
pnpm install
```

### 步骤2：生成数据

```powershell
cd demo/device_predictive_maintenance/data
python generate_health_data.py
cd ../../..
```

### 步骤3：注册API路由

确保 `backend/api/registry.py` 中包含：
```python
# 在导入部分
try:
    from demo.device_predictive_maintenance.backend.api.router import router as device_demo_router
except ImportError:
    device_demo_router = None

# 在 register_routes 函数中
if device_demo_router:
    app.include_router(device_demo_router, tags=["设备维护演示"])
```

### 步骤4：复制前端文件

```powershell
# 复制演示组件（如果还没有）
Copy-Item -Recurse -Force demo\device_predictive_maintenance\frontend\components\device-demo frontend\components\
```

### 步骤5：启动服务

**终端1 - 后端（在项目根目录）：**
```powershell
$env:PYTHONPATH = '.'
python -m uvicorn backend.main:app --reload --port 8000
```

**终端2 - 前端：**
```powershell
cd frontend
pnpm dev
```

## 访问演示

启动成功后，访问：
- **演示页面**: http://localhost:3000/device
- **API文档**: http://localhost:8000/docs

## 验证

### 检查API
访问 http://localhost:8000/api/device-demo/devices，应该返回设备列表JSON。

### 检查前端
访问 http://localhost:3000/device，应该看到：
- 左侧设备列表
- 健康趋势图表（10个数据点）
- 告警信息（2-4条）
- 一键智能诊断按钮

## 常见问题

### 后端启动失败：`ModuleNotFoundError: No module named 'backend'`

**解决：**
1. 确保在项目根目录运行（不是backend目录）
2. 设置 `$env:PYTHONPATH = '.'`（PowerShell）或 `set PYTHONPATH=.`（CMD）

### 前端启动失败：`Cannot find module`

**解决：**
```powershell
cd frontend
pnpm install
```

### 端口被占用

**检查端口：**
```powershell
netstat -ano | findstr :8000  # 后端端口
netstat -ano | findstr :3000  # 前端端口
```

**关闭进程：**
```powershell
taskkill /PID <PID> /F
```

### 数据未显示

1. 检查数据文件是否存在：`demo/device_predictive_maintenance/data/device_health_data.json`
2. 如果不存在，运行：`python demo/device_predictive_maintenance/data/generate_health_data.py`
3. 检查后端日志确认API正常返回数据

## 详细故障排查

如果遇到其他问题，请查看 [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
