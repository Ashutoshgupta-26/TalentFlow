import json

try:
    with open('resume.ipynb', encoding='utf-8') as f:
        d = json.load(f)
    
    code_cells = [c['source'] for c in d['cells'] if c['cell_type'] == 'code']
    
    with open('extracted_cells.py', 'w', encoding='utf-8') as f:
        for i, cell in enumerate(code_cells[-3:]):
            f.write(f"\n# --- CELL {i+1} ---\n")
            f.write("".join(cell) + "\n")
            
except Exception as e:
    print(f"Error: {e}")
