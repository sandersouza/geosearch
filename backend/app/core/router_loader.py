import importlib
import pkgutil
from typing import Iterable

from fastapi import FastAPI


def _iter_router_modules() -> Iterable[str]:
    package_name = "app.routers"
    package = importlib.import_module(package_name)
    for module_info in pkgutil.iter_modules(package.__path__, package_name + "."):
        if module_info.ispkg:
            continue
        yield module_info.name


def include_routers(app: FastAPI) -> None:
    for module_name in _iter_router_modules():
        module = importlib.import_module(module_name)
        router = getattr(module, "router", None)
        if router is not None:
            app.include_router(router)
