# routers/simulation.py
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import numpy as np

from database import get_db
from schemas import SimulateRequest, SimulateResponse, ReportListItem, ReportDetail
import models
from core.pq_crr_engine import PortfolioOptimiser, LifeInsuranceSimulator
from core.pq_data_loader import (
    IRA_KENYA_DEFAULTS, ASSET_NAMES, ALPHA_P_POOLED, RISK_FREE_RATE
)

router = APIRouter(prefix="/api", tags=["Simulation & Reports"])


def _build_returns(p, q, seed=2024):
    rng = np.random.default_rng(seed)
    N   = 108
    return np.column_stack([
        rng.normal(IRA_KENYA_DEFAULTS[name]["mu"] / 12,
                   IRA_KENYA_DEFAULTS[name]["sigma"] / np.sqrt(12), N)
        for name in ASSET_NAMES
    ])


@router.post("/simulate", response_model=SimulateResponse)
def run_simulation(req: SimulateRequest, db: Session = Depends(get_db)):
    """
    Run a 30-year life insurance portfolio simulation.
    Returns ruin probability, surplus evolution, and time series.
    """
    if req.q >= req.p - 0.02:
        raise HTTPException(422, "Requires q < p − 0.02")

    rets = _build_returns(req.p, req.q)
    opt  = PortfolioOptimiser(
        p=req.p, q=req.q, returns=rets,
        asset_names=ASSET_NAMES, w_max=0.40, alpha_p=req.alpha_p
    )
    
    opt_result = opt.optimise(
        target_return=req.target_return / 12,
        risk_free_rate=req.risk_free_rate / 12
    )
    
    sim = LifeInsuranceSimulator(
        opt,
        n_policyholders=req.n_policyholders,
        policy_years=req.policy_years,
        seed=req.seed
    )
    
    df = sim.simulate(
        target_return=req.target_return / 12,
        mortality_rate=req.mortality_rate,
        risk_free_rate=req.risk_free_rate / 12
    )
    
    time_series = {
        "year":                    df["year"].tolist(),
        "portfolio_value":         [round(v, 4) for v in df["portfolio_value"]],
        "noisy_observation":       [round(v, 4) for v in df["noisy_observation"]],
        "optimisation_threshold":  [round(v, 4) for v in df["optimisation_threshold"]],
        "cumulative_liabilities":  [round(v, 4) for v in df["cumulative_liabilities"]],
        "surplus":                 [round(v, 4) for v in df["surplus"]],
        "active_policyholders":    df["active_policyholders"].tolist(),
    }
    
    ruin_prob     = round(df.attrs["ruin_probability"], 4)
    final_surplus = round(float(df["surplus"].iloc[-1]), 4)
    final_active  = int(df["active_policyholders"].iloc[-1])
    sharpe        = round(df.attrs["sharpe_ratio"], 4)

    db_id = None
    if req.save:
        run = models.SimulationRun(
            policy_years=req.policy_years,
            n_policyholders=req.n_policyholders,
            mortality_rate=req.mortality_rate,
            ruin_probability=ruin_prob,
            final_surplus=final_surplus,
            final_active=final_active,
            sharpe_ratio=sharpe,
            time_series=time_series,
            notes=req.notes
        )
        db.add(run); db.commit(); db.refresh(run)
        db_id = run.id
    
    return SimulateResponse(
        ruin_probability=ruin_prob,
        final_surplus=final_surplus,
        final_active=final_active,
        sharpe_ratio=sharpe,
        time_series=time_series,
        db_id=db_id
    )


@router.get("/reports", response_model=list[ReportListItem])
def list_reports(skip: int = 0, limit: int = 30, db: Session = Depends(get_db)):
    """List all saved simulation reports."""
    sims = db.query(models.SimulationRun)\
              .order_by(models.SimulationRun.created_at.desc())\
              .offset(skip).limit(limit).all()
    return [ReportListItem(
        id=r.id,
        created_at=r.created_at,
        notes=r.notes or "",
        ruin_probability=r.ruin_probability,
        sharpe_ratio=r.sharpe_ratio
    ) for r in sims]


@router.get("/reports/{report_id}")
def get_report(report_id: int, db: Session = Depends(get_db)):
    """Retrieve a saved simulation report by ID."""
    sim = db.query(models.SimulationRun).filter(
        models.SimulationRun.id == report_id
    ).first()
    if not sim:
        raise HTTPException(404, f"Report {report_id} not found.")
    
    return {
        "id": sim.id,
        "created_at": sim.created_at,
        "ruin_probability": sim.ruin_probability,
        "final_surplus": sim.final_surplus,
        "final_active": sim.final_active,
        "sharpe_ratio": sim.sharpe_ratio,
        "policy_years": sim.policy_years,
        "n_policyholders": sim.n_policyholders,
        "mortality_rate": sim.mortality_rate,
        "time_series": sim.time_series,
        "notes": sim.notes
    }


@router.delete("/reports/{report_id}")
def delete_report(report_id: int, db: Session = Depends(get_db)):
    sim = db.query(models.SimulationRun).filter(
        models.SimulationRun.id == report_id
    ).first()
    if not sim:
        raise HTTPException(404, f"Report {report_id} not found.")
    db.delete(sim); db.commit()
    return {"deleted": report_id}
