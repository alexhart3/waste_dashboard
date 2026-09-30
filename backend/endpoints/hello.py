from fastapi import APIRouter

router = APIRouter(
    prefix = "",
    tags = ["hello"]
)

@router.get("/")
async def hello():
    return {"message" : "Hello World"}
