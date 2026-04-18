# TalentFlow — Backend

A FastAPI REST API for TalentFlow, an Applicant Tracking System. Uses MongoDB for data storage, JWT for authentication, bcrypt for password hashing, and Cloudinary for resume PDF blobs.

## Tech Stack

- **FastAPI** — high-performance async web framework
- **Uvicorn** — ASGI server
- **MongoDB** — document database
- **pymongo** — MongoDB Python driver
- **python-jose** — JWT token encoding/decoding
- **bcrypt** — password hashing
- **Pydantic** — request/response validation
- **cloudinary** — Cloudinary upload for resume PDFs

## Project Structure

```
backend/
├── app/
│   ├── main.py              # FastAPI app, CORS, router registration
│   ├── config.py            # Mongo URI, secret key, upload dir
│   ├── database.py          # MongoDB client, indexes, ID counters
│   ├── auth.py              # Password hashing, JWT utils
│   ├── schemas.py           # Pydantic request/response models
│   └── routes/
│       ├── auth_routes.py          # POST /api/auth/login, /api/auth/signup
│       ├── resume_routes.py        # /api/resumes/*
│       ├── job_routes.py           # /api/jobs/*
│       ├── application_routes.py   # /api/applications/*
│       └── dashboard_routes.py     # /api/dashboard/*
├── uploads/                 # Local uploads (legacy, optional)
├── fix_passwords.py         # One-time script to re-hash seed passwords
└── requirements.txt         # Python dependencies
```

## Database Collections

- `users` - core auth/account data (`id`, `name`, `email`, `role`, `password_hash`)
- `candidate_profiles` - candidate-specific profile and preferences (skills, salary expectation, links, availability)
- `recruiter_profiles` - recruiter/company hiring profile (company metadata, hiring regions, focus skills, contact)
- `resumes`, `education`, `experience` - resume and related timeline records
- `jobs` - job postings
- `applications` - candidate applications with matching score and status
- `counters` - auto-increment style sequence values used by routes

## API Endpoints

| Method | Endpoint                            | Description                  |
| ------ | ----------------------------------- | ---------------------------- |
| POST   | `/api/auth/signup`                  | Register a new user          |
| POST   | `/api/auth/login`                   | Login, returns JWT token     |
| POST   | `/api/resumes/upload`               | Upload a resume (PDF)        |
| GET    | `/api/resumes/user/{userId}`        | Get resume by user ID        |
| GET    | `/api/jobs/`                        | List all active jobs         |
| POST   | `/api/jobs/`                        | Create a new job posting     |
| GET    | `/api/jobs/matches/{userId}`        | Get job matches for a user   |
| POST   | `/api/ats/analyze`                  | Analyze resume ATS score      |
| POST   | `/api/applications/apply`           | Apply to a job               |
| GET    | `/api/applications/candidate/{id}`  | Get applications by candidate|
| GET    | `/api/applications/job/{id}`        | Get applications by job      |
| GET    | `/api/dashboard/{role}`             | Dashboard stats              |

Full interactive docs available at **http://localhost:8000/docs** (Swagger UI).

## Getting Started

### Prerequisites

- Python 3.10+
- MongoDB 6+
- Database `ats_db` created and seeded (see `../app/schema.sql`)

### Database Setup

```bash
mongosh < ../app/schema.sql
```

### Install Dependencies

```bash
pip install -r requirements.txt
```

### Configuration

Edit `app/config.py` or set environment variables:

| Variable          | Default                                 | Description             |
| ----------------- | --------------------------------------- | ----------------------- |
| `MONGODB_URI`     | `mongodb://localhost:27017`             | MongoDB connection URI  |
| `MONGODB_DB_NAME` | `ats_db`                                | MongoDB database name   |
| `GROQ_API_KEY`    | `""`                                   | Groq API key            |
| `GROQ_MODEL`      | `llama3-70b-8192`                       | Groq model name         |
| `SECRET_KEY`      | `ats-secret-key-change-in-production`   | JWT signing secret      |
| `CLOUDINARY_CLOUD_NAME` | `""`                            | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | `""`                                | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | `""`                             | Cloudinary API secret |
| `CLOUDINARY_UPLOAD_FOLDER` | `resumes`                      | Folder for uploaded resume files |

Example `.env` values:

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLOUDINARY_UPLOAD_FOLDER=resumes
```

### Run the Server

```bash
cd backend
py -3.13 -m uvicorn app.main:app --reload --port 8000
```

The API will be available at **http://localhost:8000**.

### Fix Seed Passwords (if needed)

If login returns 500 errors, re-hash the demo user passwords:

```bash
cd backend
python fix_passwords.py
```

## Demo Credentials

| Role      | Email                | Password    |
| --------- | -------------------- | ----------- |
| Candidate | candidate@demo.com   | password123 |
| Recruiter | recruiter@demo.com   | password123 |
