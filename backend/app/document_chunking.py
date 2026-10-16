"""Utilities for splitting extracted PDF pages into searchable chunks."""


def chunk_pages(pages, chunk_size=1000, overlap=150):
    """
    Split extracted pages into smaller text chunks.

    Each chunk retains its original page number for later citations.
    Chunk size and overlap are measured in characters.
    """

    if chunk_size <= 0:
        raise ValueError("chunk_size must be greater than zero.")

    if overlap < 0 or overlap >= chunk_size:
        raise ValueError("overlap must be non-negative and smaller than chunk_size.")

    chunks = []

    for page in pages:
        page_number = page.get("page_number")
        text = page.get("text", "").strip()

        if not text:
            continue

        start = 0
        page_chunk_index = 0

        while start < len(text):
            end = min(start + chunk_size, len(text))

            # Prefer splitting at a word boundary when practical.
            if end < len(text):
                boundary = text.rfind(" ", start + chunk_size // 2, end)

                if boundary > start:
                    end = boundary

            chunk_text = text[start:end].strip()

            if chunk_text:
                chunks.append({
                    "page_number": page_number,
                    "chunk_index": page_chunk_index,
                    "text": chunk_text,
                    "character_count": len(chunk_text)
                })
                page_chunk_index += 1

            if end >= len(text):
                break

            # Overlap preserves context between adjacent chunks.
            start = max(start + 1, end - overlap)

    return chunks