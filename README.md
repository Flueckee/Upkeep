# Upkeep — Bike Maintenance Tracker

Track service history and get reminders for upcoming maintenance across all your bikes.

---

## Stack

| Layer | Technology |
|---|---|
| Backend | Python · FastAPI · SQLAlchemy · Alembic · PostgreSQL |
| Mobile | React Native · Expo SDK 51 · TypeScript · React Navigation |
| Auth | JWT (HS256, 7-day tokens) |

---

## Quick Start (Docker)

```bash
# 1. Clone and enter the repo
git clone <repo-url> && cd Upkeep

# 2. Copy env file
cp backend/.env.example backend/.env
#    Edit backend/.env — at minimum set a strong SECRET_KEY

# 3. Start Postgres + backend (runs migrations automatically on boot)
docker compose up --build

# 4. Seed demo data
docker compose exec backend python seed.py
```

API is now live at **http://localhost:8000**
Interactive docs: **http://localhost:8000/docs**

---

## Manual Backend Setup

```bash
cd backend

python -m venv .venv
# Windows:    .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate

pip install -r requirements.txt

cp .env.example .env   # then edit DATABASE_URL and SECRET_KEY

alembic upgrade head
python seed.py         # optional demo data
uvicorn app.main:app --reload
```

---

## Mobile Setup

```bash
cd mobile
npm install

# Create mobile/.env with your machine's LAN IP so devices can reach the backend:
# EXPO_PUBLIC_API_URL=http://192.168.1.x:8000

npx expo start
```

Scan the QR code with **Expo Go**, or press `a` / `i` for emulators.

---

## Environment Variables

### `backend/.env`

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://upkeep:upkeep@localhost:5432/upkeep` |
| `SECRET_KEY` | JWT signing secret — **change this in production** | — |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token lifetime | `10080` (7 days) |

### `mobile/.env`

| Variable | Description |
|---|---|
| `EXPO_PUBLIC_API_URL` | Backend base URL (no trailing slash) |

---

## API Reference

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Create account, returns JWT |
| `POST` | `/api/auth/login` | Login, returns JWT |
| `GET` | `/api/auth/me` | Current user |
| `GET` | `/api/bikes` | List bikes |
| `POST` | `/api/bikes` | Create bike (auto-creates 12 preset components) |
| `GET/PUT/DELETE` | `/api/bikes/{id}` | Get / update / delete bike |
| `PATCH` | `/api/bikes/{id}/odometer` | Update km reading |
| `GET` | `/api/bikes/{id}/due` | Components that are due, due soon, or need first service |
| `GET/POST` | `/api/bikes/{id}/components` | List / add components |
| `PUT/DELETE` | `/api/components/{id}` | Update / delete component |
| `GET/POST` | `/api/components/{id}/logs` | List / add maintenance logs |
| `DELETE` | `/api/logs/{id}` | Delete log entry |
| `POST` | `/api/components/{id}/interval` | Set service interval |
| `PUT/DELETE` | `/api/intervals/{id}` | Update / remove interval |

---

## Due-Soon Logic

For each component with a configured interval:

- **Time:** `days_since >= interval_days - reminder_days_before` → due soon; `>= interval_days` → overdue
- **Distance:** `km_since >= interval_km × 0.9` → due soon; `>= interval_km` → overdue
- **No log yet:** always "needs first service"
- **No interval:** excluded from `/due` results

---

## Demo Account

After running `python seed.py`:

```
Email:    demo@upkeep.app
Password: demo1234
Bike:     Canyon Ultimate CF SLX (4 250 km)
```

The chain and bar tape will show as overdue immediately.

---

## Project Structure

```
Upkeep/
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI app + router registration
│   │   ├── config.py          # pydantic-settings (reads .env)
│   │   ├── database.py        # SQLAlchemy engine + session factory
│   │   ├── dependencies.py    # get_current_user JWT dependency
│   │   ├── models/            # ORM: User, Bike, Component, MaintenanceLog, ServiceInterval
│   │   ├── schemas/           # Pydantic I/O models for every entity
│   │   ├── routers/           # auth · bikes · components · logs · intervals
│   │   └── services/          # auth_service · bike_service · due_service
│   ├── alembic/               # Migrations (001_initial_schema)
│   ├── seed.py
│   ├── Dockerfile
│   └── requirements.txt
├── mobile/
│   ├── App.tsx                # NavigationContainer + AuthProvider
│   └── src/
│       ├── theme.ts           # Colors / Spacing / Typography constants
│       ├── types/             # Shared TypeScript interfaces
│       ├── services/          # axios API clients per domain
│       ├── context/           # AuthContext (JWT storage + user state)
│       ├── navigation/        # Root / AuthStack / AppTabs / BikeStack
│       ├── components/        # StatusBadge · LoadingView
│       └── screens/           # Login · Register · Home · BikeDetail · ComponentDetail
│                              # AddBike · AddLog · EditComponent · DueSoon · Settings
└── docker-compose.yml
```
