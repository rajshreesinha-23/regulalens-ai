"""Lightweight BM25 retrieval over page-aware document chunks."""

import math
import re
from collections import Counter

from backend.app.document_chunker import chunk_pages

# Keeps clause numbers like "3.2.1" together as one token.
TOKEN_PATTERN = re.compile(r"\w+(?:\.\w+)*")

STOPWORDS = {
    "a", "an", "the", "and", "or", "of", "to", "in", "on", "for", "is", "are",
    "was", "were", "be", "by", "with", "as", "at", "that", "this", "it", "from",
    "what", "which", "who", "how", "does", "do", "shall", "must", "may",
}


def tokenize(text):
    tokens = TOKEN_PATTERN.findall(text.lower())
    return [t for t in tokens if t not in STOPWORDS]


def build_chunks(documents):
    """
    documents: list of dicts with id, filename, pages (list of page dicts).
    Returns chunks tagged with document and page info for citations.
    """
    chunks = []

    for doc in documents:
        for chunk in chunk_pages(doc["pages"]):
            chunks.append({
                "document_id": doc["id"],
                "filename": doc["filename"],
                "page_number": chunk["page_number"],
                "text": chunk["text"],
                "tokens": tokenize(chunk["text"]),
            })

    return chunks


def search(chunks, query, top_k=5, k1=1.5, b=0.75):
    """Rank chunks against the query with BM25. Returns only positive matches."""

    query_tokens = tokenize(query)

    if not chunks or not query_tokens:
        return []

    total = len(chunks)
    avg_len = sum(len(c["tokens"]) for c in chunks) / total or 1

    doc_freq = Counter()
    for chunk in chunks:
        doc_freq.update(set(chunk["tokens"]))

    scored = []

    for chunk in chunks:
        term_counts = Counter(chunk["tokens"])
        length = len(chunk["tokens"]) or 1
        score = 0.0

        for term in set(query_tokens):
            freq = term_counts.get(term, 0)
            if freq == 0:
                continue

            idf = math.log(1 + (total - doc_freq[term] + 0.5) / (doc_freq[term] + 0.5))
            score += idf * (freq * (k1 + 1)) / (
                freq + k1 * (1 - b + b * length / avg_len)
            )

        if score > 0:
            scored.append((score, chunk))

    scored.sort(key=lambda item: item[0], reverse=True)

    return [
        {**{k: v for k, v in chunk.items() if k != "tokens"}, "score": round(score, 3)}
        for score, chunk in scored[:top_k]
    ]