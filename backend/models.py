# models.py
import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, JSON, Boolean, Text
from database import Base


class CalibrationRun(Base):
    __tablename__ = "calibration_runs"
    id          = Column(Integer, primary_key=True, index=True)
    name        = Column(String(200), default="Unnamed run")
    created_at  = Column(DateTime, default=datetime.datetime.utcnow)
    p_portfolio = Column(Float)
    q_portfolio = Column(Float)
    alpha_p     = Column(Float)
    n_obs       = Column(Integer)
    source      = Column(String(500))
    pq_by_asset = Column(JSON)
    mu_annual   = Column(JSON)
    sigma_annual = Column(JSON)
    notes       = Column(Text, default="")


class PortfolioRun(Base):
    __tablename__ = "portfolio_runs"
    id             = Column(Integer, primary_key=True, index=True)
    created_at     = Column(DateTime, default=datetime.datetime.utcnow)
    calibration_id = Column(Integer, nullable=True)
    p              = Column(Float)
    q              = Column(Float)
    alpha_p        = Column(Float)
    target_return  = Column(Float)
    risk_free_rate = Column(Float)
    weights        = Column(JSON)
    expected_return = Column(Float)
    volatility     = Column(Float)
    sharpe_ratio   = Column(Float)
    noise_sensitivity = Column(JSON)
    optimisation_success = Column(Boolean)
    interpretation = Column(Text)
    notes          = Column(Text, default="")


class SimulationRun(Base):
    __tablename__ = "simulation_runs"
    id              = Column(Integer, primary_key=True, index=True)
    created_at      = Column(DateTime, default=datetime.datetime.utcnow)
    portfolio_run_id = Column(Integer, nullable=True)
    policy_years    = Column(Integer)
    n_policyholders = Column(Integer)
    mortality_rate  = Column(Float)
    ruin_probability = Column(Float)
    final_surplus   = Column(Float)
    final_active    = Column(Integer)
    sharpe_ratio    = Column(Float)
    time_series     = Column(JSON)
    notes           = Column(Text, default="")


class MarketSnapshot(Base):
    __tablename__ = "market_snapshots"
    id          = Column(Integer, primary_key=True, index=True)
    created_at  = Column(DateTime, default=datetime.datetime.utcnow)
    source      = Column(String(500))
    tbill_rate  = Column(Float)
    nsi_return  = Column(Float)
    parameters  = Column(JSON)
