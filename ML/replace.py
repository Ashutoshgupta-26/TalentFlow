import sys

with open('extracted_cells.py', encoding='utf-8') as f:
    lines = f.readlines()

out = []
skip = False
for line in lines:
    if line.startswith("    def load_and_prep_candidates("):
        skip = True
        out.append("""    def load_and_prep_candidates(
        self, uri: str = "mongodb://localhost:27017", limit: int = None
    ) -> pd.DataFrame:
        import pymongo
        print(f"Loading candidates from MongoDB at: {uri}")
        client = pymongo.MongoClient(uri)
        db = client["ats_db"]
        
        rows = []
        for r in db.resumes.find():
            u_id = r.get("userId") or r.get("user_id")
            user = db.users.find_one({"id": u_id}) or {}
            
            r_id = r.get("id")
            edu_cur = db.education.find({"resume_id": r_id})
            edu_str = " | ".join([f"{e.get('degree', '')} {e.get('field', '')} {e.get('institution', '')}" for e in edu_cur])
            
            exp_cur = db.experience.find({"resume_id": r_id})
            exp_str = " | ".join([f"{x.get('title', '')} {x.get('company', '')} {x.get('description', '')}" for x in exp_cur])
            
            skills = ", ".join(r.get("skills", []))
            
            rows.append({
                "id": r_id,
                "Skills": skills,
                "Education": edu_str,
                "Experience": exp_str,
                "Role": user.get("role", "candidate")
            })
            if limit and len(rows) >= limit:
                break
                
        df = pd.DataFrame(rows)
        if df.empty:
            df = pd.DataFrame([{"id": -1, "Skills": "None", "Experience": "0", "Education": "None", "Role": "None"}])
            
        df["combined_resume"] = df.apply(
            lambda row: "\\n".join(f"{c}: {v}" for c, v in row.items()), axis=1
        )
        
        exp_cols = [c for c in df.columns if c.lower().replace(" ", "_") in _EXP_COL_NAMES]
        print(f"Prepared {len(df)} profiles.  Experience columns detected: {exp_cols or 'none — will use regex'}\\n")
        return df\n""")
        continue
        
    if skip and "def _score_bge(" in line:
        skip = False
        
    if not skip:
        out.append(line)

final_out = []
skip = False
for line in out:
    if line.startswith('    _banner(') and 'RECRUITER INPUT DASHBOARD' in line:
        skip = True
        final_out.append("""    _banner("RECRUITER INPUT DASHBOARD")
    job_position        = "Senior Software Engineer"
    years_of_experience = "5"
    skillset            = "Python, AWS, SQL"
    job_description     = "Robust backend development using Python and MongoDB."

    print(f"Using test values -> Title: {job_position}, Exp: {years_of_experience}, Skills: {skillset}")

    recruiter_query = (
        f"Title: {job_position}\\n"
        f"Required Experience: {years_of_experience} years\\n"
        f"Skills: {skillset}\\n"
        f"Description: {job_description}"
    )

    DB_URI = "mongodb://localhost:27017"

    try:
        candidates_df = scorer.load_and_prep_candidates(DB_URI, limit=1000)
    except Exception as e:
        print(f"\\n❌  DB Connection Failed: {e}")
        exit()\n""")
        continue
    
    if skip and "display_results(" in line:
        final_out.append(line)
        skip = False
        continue
        
    if not skip:
        if line.startswith("pip install"):
            final_out.append("# " + line)
        else:
            final_out.append(line)
        
with open('main.py', 'w', encoding='utf-8') as f:
    f.writelines(final_out)
print("Line-based replacement completed successfully!")

