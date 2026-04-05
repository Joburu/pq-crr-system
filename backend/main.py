# main.py
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from database import init_db
from routers import calibration, portfolio, simulation

app = FastAPI(
    title="(p,q)-CRR Actuarial Portfolio System",
    description="""
    Life insurance portfolio optimisation under noisy observations.
    Calibrated to IRA Kenya Risk-Based Supervision Phase II.
    
    Based on: Oburu (2025) — A (p,q)-Binomial Extension of the CRR Model.
    Submitted to Stochastic Models (Taylor & Francis), ID 267719680.
    """,
    version="1.0.0",
    contact={
        "name":  "Jeffar Junior Oburu",
        "email": "joburu@jooust.ac.ke",
        "url":   "https://jooust.ac.ke"
    }
)

# CORS — allow frontend origin
origins = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://localhost:3000"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(calibration.router)
app.include_router(portfolio.router)
app.include_router(simulation.router)


@app.on_event("startup")
async def startup():
    init_db()


@app.get("/", tags=["Health"])
def root():
    return {
        "system": "(p,q)-CRR Actuarial Portfolio System",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
        "author": "Jeffar Junior Oburu — JOOUST Kenya",
        "paper": "Submitted to Stochastic Models, ID 267719680"
    }


@app.get("/health", tags=["Health"])
def health():
    return {"status": "ok"}
