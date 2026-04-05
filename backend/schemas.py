# schemas.py
from pydantic import BaseModel, Field
from typing import Optional, List, Dict
import datetime


class CalibrateRequest(BaseModel):
    prices: List[float] = Field(..., description="Price series (at least 12 observations)")
    asset_name: str = Field("asset", description="Asset class name for IRA defaults fallback")
    dt: float = Field(1/252, description="Time step (1/252 for daily, 1/12 for monthly)")

class CalibrateResponse(BaseModel):
    p: float
    q: float
    clipped: bool
    used_default: bool
    asset_name: str
    n_observations: int


class OptimiseRequest(BaseModel):
    p: float = Field(0.710, ge=0.51, le=0.99)
    q: float = Field(0.534, ge=0.05, le=0.96)
    alpha_p: float = Field(0.176, ge=0.05, le=0.50)
    target_return: float = Field(0.10, ge=0.05, le=0.25)
    risk_free_rate: float = Field(0.094, ge=0.0, le=0.20)
    regulatory: bool = Field(True, description="Apply IRA Kenya concentration limits")
    save: bool = Field(False)
    notes: str = Field("", max_length=500)

class OptimiseResponse(BaseModel):
    weights: Dict[str, float]
    expected_return: float
    volatility: float
    sharpe_ratio: float
    noise_sensitivity: Dict[str, float]
    optimisation_success: bool
    interpretation: str
    p: float
    q: float
    alpha_p: float
    db_id: Optional[int] = None


class SimulateRequest(BaseModel):
    p: float = Field(0.710, ge=0.51, le=0.99)
    q: float = Field(0.534, ge=0.05, le=0.96)
    alpha_p: float = Field(0.176, ge=0.05, le=0.50)
    target_return: float = Field(0.10, ge=0.05, le=0.25)
    risk_free_rate: float = Field(0.094)
    policy_years: int = Field(30, ge=5, le=50)
    n_policyholders: int = Field(1000, ge=100, le=10000)
    mortality_rate: float = Field(0.015, ge=0.001, le=0.05)
    seed: int = Field(42)
    save: bool = Field(False)
    notes: str = Field("", max_length=500)

class SimulateResponse(BaseModel):
    ruin_probability: float
    final_surplus: float
    final_active: int
    sharpe_ratio: float
    time_series: Dict[str, List[float]]
    db_id: Optional[int] = None


class SensitivityResponse(BaseModel):
    p_grid: List[float]
    sensitivities: Dict[str, List[float]]
    asset_names: List[str]


class ConvergenceResponse(BaseModel):
    black_scholes: float
    results: List[Dict]


class ReportListItem(BaseModel):
    id: int
    created_at: datetime.datetime
    notes: str
    ruin_probability: Optional[float] = None
    sharpe_ratio: Optional[float] = None

class ReportDetail(BaseModel):
    id: int
    created_at: datetime.datetime
    portfolio: Optional[Dict] = None
    simulation: Optional[Dict] = None


class MarketResponse(BaseModel):
    tbill_rate: float
    asset_names: List[str]
    mu_annual: Dict[str, float]
    sigma_annual: Dict[str, float]
    p_by_asset: Dict[str, float]
    q_by_asset: Dict[str, float]
    alpha_p_pooled: float
    alpha_p_by_asset: Dict[str, float]
    source: str
