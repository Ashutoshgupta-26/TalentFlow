# TalentFlow — Frontend

The React + TypeScript frontend for TalentFlow, an Applicant Tracking System (ATS) built with Vite, Tailwind CSS, and shadcn/ui.

## Tech Stack

- **React 18** with TypeScript
- **Vite** — dev server & bundler
- **Tailwind CSS** — utility-first styling
- **shadcn/ui** — accessible component library (Radix UI primitives)
- **React Router** — client-side routing
- **Lucide React** — icons
- **Sonner** — toast notifications
- **Recharts** — dashboard charts

## Project Structure

```
src/
├── components/
│   ├── layout/          # Navbar, ProtectedRoute
│   └── ui/              # shadcn/ui components
├── context/             # AuthContext, ThemeContext
├── hooks/               # Custom hooks
├── lib/                 # Utility functions
├── pages/
│   ├── candidate/       # Candidate dashboard, resume upload, job match, etc.
│   └── recruiter/       # Recruiter dashboard, job creation, applicants, etc.
├── services/            # API client (api.js)
├── router.tsx           # Route definitions
└── main.tsx             # App entry point
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+ (or pnpm)
- Backend API running on `http://localhost:8000` (see `../backend/`)

### Install & Run

```bash
# Install dependencies
npm install

# Start the dev server
npm run dev
```

The app will be available at **http://localhost:5173**.

### Build for Production

```bash
npm run build      # outputs to dist/
npm run preview    # preview the production build
```

### Lint

```bash
npm run lint
```

## API Configuration

The frontend connects to the backend at `http://localhost:8000/api` (configured in `src/services/api.js`). To change this, update the `API_BASE` constant in that file.

## Demo Credentials

| Role      | Email                | Password    |
| --------- | -------------------- | ----------- |
| Candidate | candidate@demo.com   | password123 |
| Recruiter | recruiter@demo.com   | password123 |
