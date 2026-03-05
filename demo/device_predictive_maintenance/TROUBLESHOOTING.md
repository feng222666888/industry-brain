# 故障排查指南

## 启动问题

### 问题1：后端启动失败

**错误：** `ModuleNotFoundError: No module named 'backend'`

**原因：**
- 在错误的目录运行（应该在项目根目录，不是backend目录）
- PYTHONPATH未设置

**解决：**
```powershell
# 确保在项目根目录
cd D:\work\projects\industry-brain

# 设置PYTHONPATH
$env:PYTHONPATH = '.'

# 启动后端
python -m uvicorn backend.main:app --reload --port 8000
```

### 问题2：前端启动失败

**错误：** `Cannot find module` 或 `node_modules missing`

**解决：**
```powershell
cd frontend
pnpm install
pnpm dev
```

### 问题3：端口被占用

**检查端口：**
```powershell
netstat -ano | findstr :8000
netstat -ano | findstr :3000
```

**关闭进程：**
```powershell
# 找到PID后
taskkill /PID <PID> /F
```

**或修改端口：**
- 后端：修改启动命令中的 `--port 8000` 为其他端口
- 前端：在 `frontend/package.json` 的 dev 脚本中添加 `-p 3001`

## 数据问题

### 问题1：健康趋势无数据

**检查步骤：**
1. 确认数据文件存在：`demo/device_predictive_maintenance/data/device_health_data.json`
2. 检查文件内容：应该包含5个设备的数据
3. 查看浏览器控制台（F12）是否有API错误
4. 查看后端日志确认API正常返回数据

**解决：**
```powershell
# 重新生成数据
cd demo/device_predictive_maintenance/data
python generate_health_data.py
```

### 问题2：告警信息为空

**原因：**
- API返回空数据
- 数据格式不匹配

**解决：**
- 前端有fallback机制，会自动生成告警
- 如果仍然为空，检查设备健康评分是否正常

### 问题3：API返回404

**检查：**
1. 确认 `backend/api/registry.py` 中已注册路由
2. 确认后端服务正常运行
3. 访问 http://localhost:8000/docs 查看API文档

**解决：**
编辑 `backend/api/registry.py`，确保包含：
```python
try:
    from demo.device_predictive_maintenance.backend.api.router import router as device_demo_router
except ImportError:
    device_demo_router = None

def register_routes(app: FastAPI) -> None:
    # ... 其他路由 ...
    if device_demo_router:
        app.include_router(device_demo_router, tags=["设备维护演示"])
```

## 前端问题

### 问题1：页面空白

**检查：**
1. 浏览器控制台（F12）是否有错误
2. 组件文件是否已复制到 `frontend/components/device-demo/`
3. API路径是否正确（应该是 `/api/device-demo/...` 或 `/api/device/...`）

**解决：**
```powershell
# 重新复制组件
Copy-Item -Recurse -Force demo\device_predictive_maintenance\frontend\components\device-demo frontend\components\
```

### 问题2：组件导入错误

**检查：**
1. 所有组件文件是否已复制
2. `page.tsx` 中的导入路径是否正确
3. 依赖是否已安装：`pnpm install`

### 问题3：ReactFlow 报错

**错误：** `ReactFlow is not defined` 或类似错误

**解决：**
```powershell
cd frontend
pnpm install @xyflow/react
```

## 诊断功能问题

### 问题1：点击诊断按钮无反应

**检查：**
1. 打开浏览器控制台（F12）查看错误
2. 检查后端日志是否有错误
3. 确认 `/api/device/{device_id}/diagnose` 端点可访问

**解决：**
- 检查后端服务是否正常运行
- 确认API路由已正确注册
- 查看后端日志中的错误信息

### 问题2：诊断步骤不显示

**检查：**
1. SSE连接是否建立（查看网络请求）
2. 后端是否正确发送SSE事件
3. 前端是否正确处理SSE事件

**解决：**
- 查看浏览器控制台的SSE事件日志
- 检查后端 `diagnose_fault` 函数的SSE实现

## 环境问题

### 问题1：Python版本不兼容

**要求：** Python 3.11+

**检查：**
```powershell
python --version
```

**解决：** 升级Python或使用虚拟环境

### 问题2：Node.js版本不兼容

**要求：** Node.js 18+

**检查：**
```powershell
node --version
```

**解决：** 升级Node.js

### 问题3：依赖安装失败

**后端：**
```powershell
cd backend
pip install --upgrade pip
pip install -r requirements.txt
```

**前端：**
```powershell
cd frontend
pnpm install --force
```

## 调试技巧

### 1. 查看后端日志

后端启动时会显示详细的日志，包括：
- API路由注册情况
- 数据文件加载情况
- 请求处理情况

### 2. 查看浏览器控制台

打开浏览器开发者工具（F12），查看：
- Console：JavaScript错误和日志
- Network：API请求和响应
- Application：存储和缓存

### 3. 测试API端点

使用浏览器或curl测试API：
```powershell
# 测试设备列表
curl http://localhost:8000/api/device-demo/devices

# 测试健康数据
curl http://localhost:8000/api/device/DEV-PUMP-001/health
```

### 4. 检查数据文件

```powershell
# 查看数据文件内容
Get-Content demo\device_predictive_maintenance\data\device_health_data.json | ConvertFrom-Json | ConvertTo-Json -Depth 10
```

## 获取帮助

如果以上方法都无法解决问题：
1. 查看项目主README：`README.md`
2. 查看数据说明：`README_DATA.md`
3. 检查代码注释和日志
4. 提交Issue并附上错误日志
