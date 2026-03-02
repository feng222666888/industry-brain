"""Industry Brain - FastAPI Application Entry Point."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api.registry import register_routes
from backend.config.settings import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    # TODO: initialize DB connections, load LiteLLM config, warm up models
    yield
    # TODO: cleanup connections


app = FastAPI(
    title="Industry Brain API",
    description="石化行业大脑 - 核心运行+底座支撑+自我进化引擎",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_routes(app)
