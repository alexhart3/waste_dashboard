from fastapi import FastAPI
from endpoints.hello import router as hello_router
from endpoints.entries import router as entries_router
from endpoints.count import router as count_router

import uvicorn

app = FastAPI()

app.include_router(hello_router)
app.include_router(entries_router)
app.include_router(count_router)

if __name__ == "__main__":
    uvicorn.run(app, host = "0.0.0.0", port = 8000)