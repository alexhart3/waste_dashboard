from typing import Literal
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="Waste dashboard API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # your frontend's origin
    allow_methods=["*"],
    allow_headers=["*"],
)

class Pickup(BaseModel):
    id: int
    status: Literal["picked_up", "missed"]
    fullness: float | None = None   # % full at collection
    contaminated: bool = False

pickups: list[Pickup] = []  # in memory for now; swap for a database later

@app.post("/pickups", status_code=201)
def add_pickup(p: Pickup):
    pickups.append(p)
    return p

@app.get("/kpis")
def kpis():
    scheduled = len(pickups)
    done = [p for p in pickups if p.status == "picked_up"]
    missed = scheduled - len(done)
    excess = sum(1 for p in done if p.fullness is not None and p.fullness < 50)
    fullness = [p.fullness for p in done if p.fullness is not None]
    contaminated = sum(1 for p in done if p.contaminated)

    def pct(n, d):
        return round(100 * n / d) if d else 0

    return {
        "total_pickups": len(done),
        "scheduled": scheduled,
        "missed": missed,
        "missed_pct": pct(missed, scheduled),
        "excess": excess,
        "excess_pct": pct(excess, len(done)),
        "avg_fullness": round(sum(fullness) / len(fullness)) if fullness else 0,
        "contaminated": contaminated,
        "contamination_pct": pct(contaminated, len(done)),
    }
@app.get("/")
def root():
    return {"status": "ok"}