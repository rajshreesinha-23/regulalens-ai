
from backend.app.document_comparison import compare_documents


old_version = """
1. Reports must be submitted monthly.
2. Records must be retained for 5 years.
3. Access must be restricted to authorized users.
"""

new_version = """
1. Reports must be submitted weekly.
2. Records must be retained for 7 years.
3. Access must be restricted to authorized users.
4. Reviews must be documented.
"""

result = compare_documents(old_version, new_version)

print("Total changes:", result["total_changes"])

for change in result["changes"]:
    print("\nChange type:", change["type"])
    print("Old text:", change["old_text"])
    print("New text:", change["new_text"])
