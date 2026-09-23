import os

from dotenv import load_dotenv
from fastapi import FastAPI
from supabase import create_client, Client

import uvicorn

load_dotenv()

url : str = os.getenv("SUPABASE_URL")
key : str = os.getenv("SUPABASE_KEY")

supabase : Client = create_client(
    url, key
)

app = FastAPI()

@app.get("/")
async def read_root():
    return {"message" : "Hello World"}


@app.get("/test")
async def test():
    # This function will get all dumpster entries (currently full of fake data)

    table_name : str = "dumpsters"
    selection_query : str = "*"

    response = supabase.from_(table_name).select(selection_query).execute()

    # To get data

    for row in response.data:
        example_row = row.get("id")

        print("The dumpster ID is: " + example_row)

    return response.data



if __name__ == "__main__":
    uvicorn.run(app, host = "127.0.0.1", port = 8000)