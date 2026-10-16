
import json

import fitz
from fastapi import FastAPI, UploadFile, File, HTTPException
from pydantic import BaseModel

from backend.app.document_comparison import compare_documents
from backend.app.database import get_connection


app = FastAPI(
    title="RegulaLens AI",
    description="Regulatory intelligence and software impact analysis",
    version="0.2.0"
)

MAX_PDF_SIZE = 10 * 1024 * 1024  # 10 MB


@app.get("/")
def home():
    return {
        "message": "Welcome to RegulaLens AI",
        "status": "running"
    }


@app.get("/health")
def health_check():
    return {"status": "healthy"}


def save_document(filename, pages):
    """Save extracted document text and metadata in SQLite."""

    with get_connection() as connection:
        cursor = connection.execute(
            """
            INSERT INTO documents (filename, page_count, pages_json)
            VALUES (?, ?, ?)
            """,
            (
                filename,
                len(pages),
                json.dumps(pages, ensure_ascii=False)
            )
        )

        return cursor.lastrowid


@app.post("/documents/extract")
async def extract_pdf(file: UploadFile = File(...)):
    """Validate a PDF, extract page text, and save it."""

    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Please upload a PDF file."
        )

    try:
        # Read one byte beyond the limit to detect oversized uploads.
        pdf_bytes = await file.read(MAX_PDF_SIZE + 1)

        if not pdf_bytes:
            raise HTTPException(
                status_code=400,
                detail="The uploaded file is empty."
            )

        if len(pdf_bytes) > MAX_PDF_SIZE:
            raise HTTPException(
                status_code=413,
                detail="PDF size must not exceed 10 MB."
            )

        # Validate the actual PDF content.
        try:
            document = fitz.open(
                stream=pdf_bytes,
                filetype="pdf"
            )
        except Exception as exc:
            raise HTTPException(
                status_code=400,
                detail="The file is not a valid, readable PDF."
            ) from exc

        try:
            if document.is_encrypted:
                raise HTTPException(
                    status_code=400,
                    detail="Password-protected PDFs are not supported."
                )

          pages = []

try:
    for page_index, page in enumerate(document):
        extracted_text = page.get_text("text").strip()

        pages.append({
            "page_number": page_index + 1,
            "text": extracted_text,
            "character_count": len(extracted_text),
            "word_count": len(extracted_text.split())
        })

except Exception as exc:
    raise HTTPException(
        status_code=422,
        detail="Text extraction failed for this PDF."
    ) from exc
            except Exception as exc:
                raise HTTPException(
                    status_code=422,
                    detail="Text extraction failed for this PDF."
                ) from exc

            if not any(page["text"] for page in pages):
                raise HTTPException(
                    status_code=422,
                    detail=(
                        "No readable text was found. "
                        "The PDF may be scanned and require OCR."
                    )
                )

            # Save only after successful text extraction.
            document_id = save_document(file.filename, pages)

            return {
                "message": "PDF extracted and saved successfully.",
                "document_id": document_id,
                "filename": file.filename,
                "page_count": len(pages),
                "pages": pages
            }

        finally:
            document.close()

    finally:
        await file.close()


@app.get("/documents")
def list_documents():
    """List saved documents without returning their full text."""

    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT id, filename, page_count, created_at
            FROM documents
            ORDER BY id DESC
            """
        ).fetchall()

    return {
        "count": len(rows),
        "documents": [dict(row) for row in rows]
    }


@app.get("/documents/{document_id}")
def get_document(document_id: int):
    """Retrieve a saved document and its extracted page text."""

    with get_connection() as connection:
        row = connection.execute(
            """
            SELECT id, filename, page_count, pages_json, created_at
            FROM documents
            WHERE id = ?
            """,
            (document_id,)
        ).fetchone()

    if row is None:
        raise HTTPException(
            status_code=404,
            detail="Document not found."
        )

    return {
        "document_id": row["id"],
        "filename": row["filename"],
        "page_count": row["page_count"],
        "created_at": row["created_at"],
        "pages": json.loads(row["pages_json"])
    }


class CompareDocumentsRequest(BaseModel):
    old_text: str
    new_text: str


@app.post("/documents/compare")
def compare_document_versions(request: CompareDocumentsRequest):
    """Compare two versions of a regulatory document."""

    if not request.old_text.strip() or not request.new_text.strip():
        raise HTTPException(
            status_code=400,
            detail="Both document versions must contain text."
        )

    return compare_documents(
        request.old_text,
        request.new_text
    )
