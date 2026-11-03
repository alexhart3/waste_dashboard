from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from endpoints.hello import router as hello_router
from endpoints.entries import router as entries_router
from endpoints.count import router as count_router
from endpoints.dashboard import router as dashboard_router
from endpoints.auth import router as auth_router
from utils.auth import require_admin

import uvicorn

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://waste-dashboard-rho.vercel.app",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(hello_router)
app.include_router(auth_router)
app.include_router(entries_router, dependencies=[Depends(require_admin)])
app.include_router(count_router, dependencies=[Depends(require_admin)])
app.include_router(dashboard_router, dependencies=[Depends(require_admin)])


@app.middleware("http")
async def prevent_data_caching(request, call_next):
    response = await call_next(request)
    response.headers["Cache-Control"] = "no-store"
    return response

if __name__ == "__main__":
    uvicorn.run(app, host = "0.0.0.0", port = 8000)
