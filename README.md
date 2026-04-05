# (p,q)-CRR Actuarial Portfolio System

**Author:** Jeffar Junior Oburu — JOOUST, Kenya  
**Based on:** Oburu (2025) — *A (p,q)-Binomial Extension of the Cox–Ross–Rubinstein Model for Portfolio Optimisation Under Noisy Observations in Life Insurance*

A production-ready actuarial platform for life insurance portfolio optimisation under noisy observations, calibrated to Kenyan and East African market data. Built for IRA Kenya Risk-Based Supervision Phase II compliance.

---

## Architecture

```
pq-crr-system/
├── backend/          # FastAPI — Python computation engine
│   ├── core/         # (p,q)-CRR engine + data loader
│   ├── routers/      # API endpoints
│   ├── models.py     # SQLAlchemy database models
│   ├── database.py   # DB connection (SQLite dev / PostgreSQL prod)
│   ├── schemas.py    # Pydantic request/response models
│   └── main.py       # FastAPI application entry point
├── frontend/         # React + Vite — actuarial dashboard
│   └── src/
│       ├── components/  # Reusable UI components
│       ├── pages/       # Dashboard, Reports, Calibration
│       └── hooks/       # API hooks
├── deployment/       # Railway / Render configs
└── docker-compose.yml
```

---

## Quick Start (Local Development)

### Prerequisites
- Python 3.10+
- Node.js 18+
- Git

### 1. Clone and set up backend

```bash
git clone https://github.com/YOUR_USERNAME/pq-crr-system.git
cd pq-crr-system

cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Create environment file
cp .env.example .env
# Edit .env and set SECRET_KEY and ANTHROPIC_API_KEY

# Run database migrations
python database.py

# Start backend (port 8000)
uvicorn main:app --reload
```

### 2. Set up frontend

```bash
cd ../frontend
npm install

# Create environment file
cp .env.example .env
# Set VITE_API_URL=http://localhost:8000

# Start frontend (port 5173)
npm run dev
```

### 3. Docker Compose (recommended)

```bash
# From project root
docker-compose up --build
# Backend: http://localhost:8000
# Frontend: http://localhost:5173
# API docs: http://localhost:8000/docs
```

---

## Deployment

### Deploy to Railway (recommended — free tier available)

1. Push this repo to GitHub
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Add two services: backend (Python) and frontend (Node)
4. Set environment variables in Railway dashboard:
   - `SECRET_KEY` — random 32-char string
   - `ANTHROPIC_API_KEY` — from console.anthropic.com
   - `DATABASE_URL` — Railway auto-provides PostgreSQL URL
5. Custom domain: Railway Settings → Domains → Add custom domain

### Deploy to Render

Use `deployment/render.yaml` — click "New Blueprint" in Render dashboard.

---

## Environment Variables

### Backend `.env`
```
SECRET_KEY=your-secret-key-here
ANTHROPIC_API_KEY=your-anthropic-key
DATABASE_URL=sqlite:///./pqcrr.db          # dev
# DATABASE_URL=postgresql://...            # prod (Railway/Render auto-provides)
ALLOWED_ORIGINS=http://localhost:5173,https://yourdomain.com
```

### Frontend `.env`
```
VITE_API_URL=http://localhost:8000         # dev
# VITE_API_URL=https://your-backend.railway.app  # prod
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/calibrate` | Calibrate p,q from CSV price data |
| POST | `/api/optimise` | Run portfolio optimisation |
| POST | `/api/simulate` | Run 30-year insurance simulation |
| GET  | `/api/sensitivity` | Compute noise sensitivity surface |
| GET  | `/api/convergence` | Black-Scholes convergence table |
| POST | `/api/reports` | Save and retrieve simulation reports |
| GET  | `/api/reports/{id}` | Retrieve saved report |
| GET  | `/api/market/kenya` | Current Kenyan market parameters |

Full interactive docs at `/docs` (Swagger) or `/redoc`.

---

## Key Model Parameters (IRA Kenya calibrated)

| Asset | μ (p.a.) | σ (p.a.) | p | q | α_p |
|-------|----------|----------|-----|-----|-----|
| T-Bills (91-day) | 9.4% | 2.5% | 0.720 | 0.540 | 0.12 |
| NSE Equities | 14.2% | 18.7% | 0.683 | 0.491 | 0.22 |
| Govt Bonds | 13.1% | 3.8% | 0.715 | 0.534 | 0.10 |
| Corp Bonds | 10.2% | 5.6% | 0.710 | 0.528 | 0.15 |
| Real Estate | 8.9% | 7.2% | 0.698 | 0.515 | 0.18 |

Pooled α_p = **0.176** (empirically calibrated — Oburu 2025, Paper 2)

---

## References

- Cox, Ross & Rubinstein (1979). Option pricing: a simplified approach. *J. Financial Economics*, 7(3), 229–263.
- Breton, El-Khatib, Fan & Privault (2023). A q-binomial extension of the CRR asset pricing model. *Stochastic Models*, 39(4), 772–796.
- Oburu, J.J. (2025). A (p,q)-binomial extension of the CRR model. Submitted to *Stochastic Models*.
- IRA Kenya (2023). Insurance Industry Annual Report 2023.

---

## License

MIT License — see LICENSE file.
