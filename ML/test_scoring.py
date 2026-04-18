import pandas as pd
from main import RecruiterATSScorer

def test_discrimination():
    scorer = RecruiterATSScorer()

    # Job: SDE requiring Python, AWS, SQL
    recruiter_query = """
    Title: Backend Software Engineer
    Required Experience: 3 years
    Skills: Python, AWS, SQL, Docker, FastAPI
    Description: We are looking for a backend engineer.
    """

    # Resumes
    sde_resume = """
    Title: Software Engineer
    Experience: 4 years
    Skills: Python, SQL, Amazon Web Services, Docker, FastAPI, Git
    Description: Built backend APIs using Python and FastAPI. Deployed to AWS. Managed SQL databases.
    """

    finance_resume = """
    Title: Financial Analyst
    Experience: 5 years
    Skills: Financial Modeling, Accounting, DCF, M&A, Excel
    Description: Conducted financial analysis, modeling, and forecasting. Evaluated M&A opportunities using DCF models.
    """

    df = pd.DataFrame([
        {"id": 1, "combined_resume": sde_resume},
        {"id": 2, "combined_resume": finance_resume}
    ])

    print("\n--- Running Absolute Single-Candidate Mode Simulation ---")
    results = scorer.find_top_candidates(recruiter_query, df, min_years_exp=3, top_n=2)
    
    print("\nResults:")
    for _, row in results.iterrows():
        print(f"Match Score: {row['match_score']:.2f}")
        print(f"Snapshot: {row['combined_resume'][:100]}...\n")

if __name__ == "__main__":
    test_discrimination()
