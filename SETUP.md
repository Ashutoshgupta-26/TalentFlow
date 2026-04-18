# TalentFlow — Setup & Run Commands

## Prerequisites

| Tool       | Version        | Purpose                  |
| ---------- | -------------- | ------------------------ |
| Node.js    | 18+            | Frontend runtime         |
| Python     | 3.10+          | Backend runtime          |
| PostgreSQL | 14+            | Database                 |
| npm        | 9+ (or pnpm)  | Frontend package manager |

---

## 1. Database Setup

Open a PostgreSQL shell (`psql`) and run:

```sql
-- Create the database
CREATE DATABASE ats_db;

-- Connect to it
\c ats_db

-- Run the schema file (adjust path as needed)
\i path/to/app/schema.sql
```

Or from a terminal:

```bash
psql -U postgres -c "CREATE DATABASE ats_db;"
psql -U postgres -d ats_db -f app/schema.sql
```

> The schema file creates all tables, indexes, enum types, and inserts seed data (demo users, jobs, etc.).

---

## 2. Backend Setup & Run

```bash
# Navigate to the project root
cd TalentFlow

# Install Python dependencies
pip install -r backend/requirements.txt

# (Optional) Fix seed user passwords if login fails
cd backend
python fix_passwords.py
cd ..
```

### Configure Database Connection

Edit `backend/app/config.py` or set environment variables:

```bash
# Environment variable (recommended)
set DATABASE_URL=dbname=ats_db user=postgres password=YOUR_PASSWORD host=localhost port=5432

# Or set the secret key
set SECRET_KEY=your-secret-key
```

### Start the Backend

```bash
cd backend
python -m uvicorn app.main:app --reload --port 8000
```

The API will be available at **http://localhost:8000**.  
Swagger docs at **http://localhost:8000/docs**.

---

## 3. Frontend Setup & Run

```bash
# Navigate to the frontend directory
cd app

# Install dependencies
npm install

# Start the dev server
npm run dev
```

The frontend will be available at **http://localhost:5173**.

### Build for Production

```bash
cd app
npm run build
npm run preview   # preview the production build locally
```

---

## 4. Demo Credentials

| Role      | Email                | Password      |
| --------- | -------------------- | ------------- |
| Candidate | candidate@demo.com   | password123   |
| Recruiter | recruiter@demo.com   | password123   |

---

## Quick Start (All-in-One)

Open **two terminals** from the project root:

**Terminal 1 — Backend:**
```bash
cd backend
python -m uvicorn app.main:app --reload --port 8000
```

**Terminal 2 — Frontend:**
```bash
cd app
npm install
npm run dev
```

Then open **http://localhost:5173** in your browser.
