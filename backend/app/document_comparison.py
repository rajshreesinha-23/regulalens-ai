
from difflib import SequenceMatcher


def compare_documents(old_text: str, new_text: str) -> dict:
    """
    Compare two document versions and identify
    added, removed, and modified text.
    """

    old_lines = old_text.splitlines()
    new_lines = new_text.splitlines()

    matcher = SequenceMatcher(
        None,
        old_lines,
        new_lines,
        autojunk=False
    )

    changes = []

    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == "equal":
            continue

        change = {
            "type": tag,
            "old_text": "\n".join(old_lines[i1:i2]),
            "new_text": "\n".join(new_lines[j1:j2]),
        }

        changes.append(change)

    return {
        "total_changes": len(changes),
        "changes": changes,
    }
