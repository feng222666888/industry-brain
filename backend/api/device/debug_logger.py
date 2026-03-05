"""Debug logger for device API - writes to file for debugging."""

import logging
import os
from pathlib import Path
from datetime import datetime

# 创建日志目录
LOG_DIR = Path(__file__).parent.parent.parent.parent / "logs"
LOG_DIR.mkdir(exist_ok=True)

# 创建文件处理器
log_file = LOG_DIR / f"device_api_{datetime.now().strftime('%Y%m%d')}.log"
file_handler = logging.FileHandler(log_file, encoding="utf-8")
file_handler.setLevel(logging.DEBUG)

# 创建格式
formatter = logging.Formatter(
    '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
file_handler.setFormatter(formatter)

# 创建logger
debug_logger = logging.getLogger("device_api_debug")
debug_logger.setLevel(logging.DEBUG)
debug_logger.addHandler(file_handler)

# 防止重复添加handler
if not debug_logger.handlers or not any(isinstance(h, logging.FileHandler) for h in debug_logger.handlers):
    debug_logger.addHandler(file_handler)

def log_device_api(level: str, message: str, **kwargs):
    """Log device API events."""
    log_msg = message
    if kwargs:
        log_msg += " | " + " | ".join(f"{k}={v}" for k, v in kwargs.items())
    
    if level == "DEBUG":
        debug_logger.debug(log_msg)
    elif level == "INFO":
        debug_logger.info(log_msg)
    elif level == "WARNING":
        debug_logger.warning(log_msg)
    elif level == "ERROR":
        debug_logger.error(log_msg)
    else:
        debug_logger.info(log_msg)
