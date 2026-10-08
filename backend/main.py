from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from endpoints.hello import router as hello_router
from endpoints.entries import router as entries_router
from endpoints.count import router as count_router
from endpoints.dashboard import router as dashboard_router

import uvicorn

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://waste-dashboard-rho.vercel.app",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(hello_router)
app.include_router(entries_router)
app.include_router(count_router)
app.include_router(dashboard_router)

if __name__ == "__main__":
    uvicorn.run(app, host = "0.0.0.0", port = 8000)
