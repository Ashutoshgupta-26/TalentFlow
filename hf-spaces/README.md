---
title: TalentFlow ML ATS Scorer
emoji: 🎯
colorFrom: purple
colorTo: blue
sdk: docker
app_port: 7860
pinned: false
---

# TalentFlow ML ATS Scorer

AI-powered resume scoring API using an ensemble of:
- **BGE** Bi-Encoder (Semantic Similarity)
- **MiniLM** Bi-Encoder (Semantic Similarity)
- **Cross-Encoder** (Deep Learning Precision)
- **BM25 Okapi** (Keyword Matching)
- **NER Skill Overlap** (Entity Recognition)
- **Temporal Recency** (Experience Freshness)

## API Endpoints

- `GET /` — Health check
- `POST /score` — Score a candidate against a job description

## Usage

```bash
curl -X POST https://your-space.hf.space/score \
  -H "Content-Type: application/json" \
  -d '{
    "job_title": "Senior Python Developer",
    "job_description": "Backend development with Python and MongoDB",
    "required_skills": ["Python", "MongoDB", "AWS"],
    "experience_level": "5",
    "candidate_skills": "Python, Django, PostgreSQL, AWS",
    "candidate_education": "B.Tech Computer Science",
    "candidate_experience": "3 years backend development at TechCorp"
  }'
```
