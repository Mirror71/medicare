# MediCare Companion

A medication-management web app that helps elderly users and their caregivers track medicines, check drug interactions, understand side effects, and chat about symptoms -- all powered by AI.

> **Disclaimer:** This app is informational only -- not medical advice. Always check with your doctor or pharmacist.

## Features

- **Medication tracking** -- Add medicines manually or by photographing a medicine box (AI-powered identification). Log doses with time-of-day scheduling, food relation, and start/end dates.
- **Drug interaction checks** -- Automatic pairwise interaction analysis when a new medication is added. Results are color-coded (safe / caution / danger / uncertain) and persisted.
- **Side effect lookup** -- Plain-language explanations of common and serious side effects with red-flag markers and "when to seek help" guidance.
- **Symptom chat** -- Describe a symptom and get an AI assessment of whether it might relate to your current medications, with urgency triage (emergency / soon / routine).
- **Dashboard** -- Time-grouped dose schedule (Morning / Afternoon / Evening / Night), adherence percentage, overdue alerts, and a warning strip for unacknowledged interactions.
- **Caregiver view** -- Read-only summary with live Supabase Realtime updates across tabs. Includes adherence stats, missed doses, active warnings, and a copy-to-clipboard summary.
- **Browser notifications** -- Reminder alerts for doses due in the next 5 minutes and missed dose tracking.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, React Router 7, Vite 7, Tailwind CSS v4 |
| Backend | Express 5, Node.js |
| AI | Google Gemini (`@google/generative-ai`) |
| Database | Supabase (PostgreSQL + Realtime) |

## Project Structure

```
medicare/
  client/          React frontend (Vite)
    src/
      components/  Reusable UI components
      hooks/       Custom hooks (notifications)
      lib/         API client, Supabase client
      mocks/       Mock data (symptom chat)
      pages/       Route-level page components
      store/       MedicationContext (state management)
  server/          Express API server
    lib/           Gemini service, prompts, validators
    middleware/    Error handler
    routes/        API route handlers
```

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or later
- A [Supabase](https://supabase.com/) project with the required tables (see [Database Setup](#database-setup))
- A [Google AI Studio](https://aistudio.google.com/) API key for Gemini

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/your-username/medicare.git
cd medicare
```

### 2. Set up environment variables

Copy the example files and fill in your keys:

```bash
# Client
cp client/.env.example client/.env.local

# Server
cp server/.env.example server/.env
```

See each `.env.example` for descriptions of every variable.

### 3. Install dependencies

```bash
cd client && npm install
cd ../server && npm install
```

### 4. Start the development servers

In two separate terminals:

```bash
# Terminal 1 -- API server
cd server
npm run dev

# Terminal 2 -- Frontend
cd client
npm run dev
```

The client runs on `http://localhost:5173` and proxies `/api/*` requests to the server on port 3001.

### 5. Open the app

Visit `http://localhost:5173` in your browser.

## Database Setup

Create the following tables in your Supabase project. Enable **Realtime** on all three for live caregiver updates.

### `medications`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | Primary key |
| `patient_id` | `text` | |
| `name` | `text` | |
| `generic_name` | `text` | Nullable |
| `dosage_amount` | `numeric` | |
| `dosage_unit` | `text` | mg, mcg, g, ml, IU, tablet, capsule, drop, puff |
| `times_per_day` | `integer` | |
| `interval_hours` | `integer` | |
| `days_of_week` | `text[]` | Nullable |
| `times_of_day` | `text[]` | e.g. `["08:00","14:00","20:00"]` |
| `food_relation` | `text` | `before_food`, `with_food`, `after_food`, `no_preference` |
| `start_date` | `date` | |
| `end_date` | `date` | Nullable |
| `ongoing` | `boolean` | |
| `notes` | `text` | Nullable, max 500 chars |
| `source_photo_id` | `text` | Nullable |
| `created_at` | `timestamptz` | Default `now()` |
| `updated_at` | `timestamptz` | Default `now()` |

### `dose_log`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | Primary key, default `gen_random_uuid()` |
| `medication_id` | `uuid` | FK to `medications` |
| `patient_id` | `text` | |
| `scheduled_at` | `timestamptz` | |
| `taken` | `boolean` | |
| `taken_at` | `timestamptz` | Nullable |

### `interactions`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | Primary key, default `gen_random_uuid()` |
| `patient_id` | `text` | |
| `drug_a` | `text` | Alphabetically sorted (A < B) |
| `drug_b` | `text` | |
| `status` | `text` | `safe`, `caution`, `danger`, `uncertain` |
| `severity` | `text` | `none`, `low`, `moderate`, `high`, `unknown` |
| `headline` | `text` | |
| `explanation` | `text` | |
| `mechanism` | `text` | Nullable |
| `recommendation` | `text` | |
| `confidence` | `text` | `high`, `medium`, `low` |
| `is_uncertain` | `boolean` | |
| `uncertainty_reason` | `text` | Nullable |
| `acknowledged_at` | `timestamptz` | Nullable |

**Unique constraint** on `interactions`: `(patient_id, drug_a, drug_b)`.

## API Endpoints

All endpoints are under `/api/gemma/`.

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/gemma/photo-id` | Identify a medicine from a photo (base64 image) |
| `POST` | `/api/gemma/interaction` | Check interaction between two drugs |
| `POST` | `/api/gemma/side-effects` | Get side effects for a medication |
| `POST` | `/api/gemma/symptom` | Assess a symptom against current medications |
| `GET` | `/health` | Server health check |

## Building for Production

```bash
cd client
npm run build
```

The output is in `client/dist/`. Serve it with any static file server and point `VITE_API_URL` to your deployed API server.

## License

[MIT](LICENSE)
