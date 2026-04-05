# routers/portfolio.py
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import numpy as np
def norm_cdf(x): return (1 + np.erf(x / np.sqrt(2))) / 2

from database import get_db
from schemas import (OptimiseRequest, OptimiseResponse,
                     SensitivityResponse, ConvergenceResponse, MarketResponse)
import models
from core.pq_crr_engine import (
    PortfolioOptimiser, PQBinomialCRR, NoiseSensitivity
)
from core.pq_data_loader import (
    load_real_data, IRA_KENYA_DEFAULTS, ASSET_NAMES,
    ALPHA_P_POOLED, RISK_FREE_RATE
)

router = APIRouter(prefix="/api", tags=["Portfolio"])


def _build_returns(p, q, alpha_p, seed=2024):
    """Build monthly return matrix from IRA Kenya published parameters."""
    rng = np.random.default_rng(seed)
    N   = 108
    rets = np.column_stack([
        rng.normal(IRA_KENYA_DEFAULTS[name]["mu"] / 12,
                   IRA_KENYA_DEFAULTS[name]["sigma"] / np.sqrt(12), N)
        for name in ASSET_NAMES
    ])
    return rets


@router.post("/optimise", response_model=OptimiseResponse)
def optimise_portfolio(req: OptimiseRequest, db: Session = Depends(get_db)):
    """
    Run (p,q)-CRR portfolio optimisation with IRA Kenya constraints.
    Returns optimal weights, noise sensitivity ∂w*/∂p, and Sharpe ratio.
    """
    if req.q >= req.p - 0.02:
        raise HTTPException(422, f"Requires q < p − 0.02. Got p={req.p}, q={req.q}")

    rets = _build_returns(req.p, req.q, req.alpha_p)
    
    opt = PortfolioOptimiser(
        p=req.p, q=req.q, returns=rets,
        asset_names=ASSET_NAMES,
        w_max=0.40, alpha_p=req.alpha_p
    )
    
    result = opt.optimise(
        target_return=req.target_return / 12,
        regulatory=req.regulatory,
        risk_free_rate=req.risk_free_rate / 12
    )
    
    # Annualise
    ann_ret = result["expected_return"] * 12
    ann_vol = result["portfolio_volatility"] * np.sqrt(12)
    sharpe  = (ann_ret - req.risk_free_rate) / max(ann_vol, 1e-8)

    db_id = None
    if req.save:
        run = models.PortfolioRun(
            p=req.p, q=req.q, alpha_p=req.alpha_p,
            target_return=req.target_return,
            risk_free_rate=req.risk_free_rate,
            weights=result["weights"],
            expected_return=ann_ret,
            volatility=ann_vol,
            sharpe_ratio=sharpe,
            noise_sensitivity=result["noise_sensitivity"],
            optimisation_success=result["optimisation_success"],
            interpretation=result["interpretation"],
            notes=req.notes
        )
        db.add(run); db.commit(); db.refresh(run)
        db_id = run.id
    
    return OptimiseResponse(
        weights=result["weights"],
        expected_return=round(ann_ret, 6),
        volatility=round(ann_vol, 6),
        sharpe_ratio=round(sharpe, 4),
        noise_sensitivity=result["noise_sensitivity"],
        optimisation_success=result["optimisation_success"],
        interpretation=result["interpretation"],
        p=req.p, q=req.q, alpha_p=req.alpha_p,
        db_id=db_id
    )


@router.get("/sensitivity", response_model=SensitivityResponse)
def get_noise_sensitivity(
    q: float = 0.534,
    alpha_p: float = 0.176,
    target_return: float = 0.10,
    n_points: int = 25
):
    """
    Compute ∂w_i*/∂p across a grid of p values.
    Returns the full noise sensitivity surface for all asset classes.
    """
    q = max(0.10, min(q, 0.90))
    p_min = max(q + 0.04, 0.52)
    p_grid = np.linspace(p_min, 0.96, n_points).tolist()
    
    sensitivities: dict[str, list[float]] = {name: [] for name in ASSET_NAMES}
    
    for p_val in p_grid:
        try:
            rets = _build_returns(p_val, q, alpha_p)
            opt  = PortfolioOptimiser(
                p=p_val, q=q, returns=rets,
                asset_names=ASSET_NAMES, w_max=0.40, alpha_p=alpha_p
            )
            res = opt.optimise(target_return=target_return/12,
                               risk_free_rate=RISK_FREE_RATE/12)
            for name in ASSET_NAMES:
                sensitivities[name].append(round(res["noise_sensitivity"][name], 5))
        except Exception:
            for name in ASSET_NAMES:
                sensitivities[name].append(0.0)
    
    return SensitivityResponse(
        p_grid=[round(p, 3) for p in p_grid],
        sensitivities=sensitivities,
        asset_names=ASSET_NAMES
    )


@router.get("/convergence", response_model=ConvergenceResponse)
def get_convergence(
    p: float = 0.710,
    q: float = 0.534,
    S0: float = 100.0,
    K: float = 95.0,
    T: float = 1.0,
    r: float = 0.094,
    sigma: float = 0.20
):
    """
    Compute (p,q)-CRR convergence to Black-Scholes.
    Validates Theorems 4.1-4.2 numerically.
    """
    
    
    if q >= p - 0.02:
        raise HTTPException(422, "Requires q < p − 0.02")

    d1 = (np.log(S0/K) + (r + 0.5*sigma**2)*T) / (sigma*np.sqrt(T))
    d2 = d1 - sigma*np.sqrt(T)
    bs = float(S0*norm_cdf(d1) - K*np.exp(-r*T)*norm_cdf(d2))

    N_list = [25, 50, 75, 100, 200, 500, 1000, 5000]
    results = []
    for N in N_list:
        model = PQBinomialCRR(p=p, q=q, n_steps=N)
        price = model.option_price(S0, K, T, r, sigma)
        err   = abs(price - bs)
        results.append({
            "N": N,
            "price_pq": round(price, 4),
            "black_scholes": round(bs, 4),
            "abs_error": round(err, 6),
            "pct_error": round(err/bs*100, 4)
        })
    
    return ConvergenceResponse(black_scholes=round(bs, 4), results=results)


@router.get("/market/kenya", response_model=MarketResponse)
def get_kenya_market():
    """Return current Kenyan market parameters (IRA + CBK calibrated)."""
    return MarketResponse(
        tbill_rate=RISK_FREE_RATE,
        asset_names=ASSET_NAMES,
        mu_annual={n: IRA_KENYA_DEFAULTS[n]["mu"]    for n in ASSET_NAMES},
        sigma_annual={n: IRA_KENYA_DEFAULTS[n]["sigma"] for n in ASSET_NAMES},
        p_by_asset={n: IRA_KENYA_DEFAULTS[n]["p"]    for n in ASSET_NAMES},
        q_by_asset={n: IRA_KENYA_DEFAULTS[n]["q"]    for n in ASSET_NAMES},
        alpha_p_pooled=ALPHA_P_POOLED,
        alpha_p_by_asset={n: IRA_KENYA_DEFAULTS[n]["alpha_p"] for n in ASSET_NAMES},
        source="IRA Kenya Annual Report 2023; CBK Weekly Bulletins; Oburu (2025)"
    )


@router.get("/portfolio/runs")
def list_portfolio_runs(skip: int = 0, limit: int = 20, db: Session = Depends(get_db)):
    runs = db.query(models.PortfolioRun)\
              .order_by(models.PortfolioRun.created_at.desc())\
              .offset(skip).limit(limit).all()
    return [{"id": r.id, "created_at": r.created_at, "sharpe_ratio": r.sharpe_ratio,
             "expected_return": r.expected_return, "p": r.p, "notes": r.notes} for r in runs]
