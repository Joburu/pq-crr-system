# routers/calibration.py
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
import pandas as pd, numpy as np, io, warnings

from database import get_db
from schemas import CalibrateRequest, CalibrateResponse
import models
from core.pq_data_loader import (
    robust_calibrate_pq, load_real_data,
    IRA_KENYA_DEFAULTS, ASSET_NAMES
)

router = APIRouter(prefix="/api/calibrate", tags=["Calibration"])


@router.post("", response_model=CalibrateResponse)
def calibrate_from_prices(req: CalibrateRequest):
    """Calibrate (p,q) from a price series using method of moments."""
    prices = np.asarray(req.prices, dtype=float)
    if len(prices) < 12:
        raise HTTPException(400, "Minimum 12 price observations required.")
    
    lr = np.diff(np.log(prices[prices > 0]))
    
    with warnings.catch_warnings(record=True) as caught:
        warnings.simplefilter("always")
        p, q = robust_calibrate_pq(lr, asset_name=req.asset_name)
        used_default = any("Using IRA Kenya default" in str(w.message) for w in caught)
        clipped      = any("clipped" in str(w.message) for w in caught)
    
    return CalibrateResponse(
        p=round(p, 4), q=round(q, 4),
        clipped=clipped, used_default=used_default,
        asset_name=req.asset_name,
        n_observations=len(lr)
    )


@router.post("/csv")
async def calibrate_from_csv(
    file: UploadFile = File(...),
    asset_name: str = "asset",
    price_col: str = "price",
    db: Session = Depends(get_db)
):
    """Upload a CSV file with a price column and calibrate (p,q)."""
    if not file.filename.endswith(".csv"):
        raise HTTPException(400, "Only CSV files are accepted.")
    
    contents = await file.read()
    try:
        df = pd.read_csv(io.StringIO(contents.decode("utf-8")))
    except Exception as e:
        raise HTTPException(400, f"Could not parse CSV: {e}")
    
    if price_col not in df.columns:
        cols = list(df.columns)
        # Try to find a numeric column
        num_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        if not num_cols:
            raise HTTPException(400, f"No numeric columns found. Columns: {cols}")
        price_col = num_cols[-1]
    
    prices = df[price_col].dropna().values
    if len(prices) < 12:
        raise HTTPException(400, f"Only {len(prices)} observations found. Need at least 12.")
    
    lr = np.diff(np.log(prices[prices > 0]))
    
    with warnings.catch_warnings(record=True) as caught:
        warnings.simplefilter("always")
        p, q = robust_calibrate_pq(lr, asset_name=asset_name)
        used_default = any("Using IRA Kenya default" in str(w.message) for w in caught)
    
    # Save calibration run
    run = models.CalibrationRun(
        name=f"CSV upload: {file.filename}",
        p_portfolio=p, q_portfolio=q,
        alpha_p=0.176, n_obs=len(lr),
        source=f"User upload: {file.filename}",
        pq_by_asset={asset_name: {"p": p, "q": q}},
        mu_annual={}, sigma_annual={}
    )
    db.add(run); db.commit(); db.refresh(run)
    
    return {
        "p": round(p, 4), "q": round(q, 4),
        "clipped": used_default,
        "asset_name": asset_name,
        "n_observations": len(lr),
        "column_used": price_col,
        "db_id": run.id
    }


@router.get("/kenya-defaults")
def get_kenya_defaults():
    """Return IRA Kenya published default parameters for all asset classes."""
    return {
        "asset_names": ASSET_NAMES,
        "parameters": IRA_KENYA_DEFAULTS,
        "alpha_p_pooled": 0.176,
        "risk_free_rate": 0.094,
        "source": "IRA Kenya Annual Report 2023; CBK Weekly Bulletins; Oburu (2025)"
    }


@router.get("/runs")
def list_calibration_runs(skip: int = 0, limit: int = 20, db: Session = Depends(get_db)):
    """List saved calibration runs."""
    runs = db.query(models.CalibrationRun)\
              .order_by(models.CalibrationRun.created_at.desc())\
              .offset(skip).limit(limit).all()
    return [{"id": r.id, "name": r.name, "created_at": r.created_at,
             "p": r.p_portfolio, "q": r.q_portfolio, "n_obs": r.n_obs} for r in runs]
