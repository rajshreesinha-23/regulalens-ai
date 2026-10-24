
import json
from fastapi.middleware.cors import CORSMiddleware

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

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
    """Check whether the API is running."""
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

            # Extract text page by page and preserve page metadata.
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
    old_document_id: int
    new_document_id: int


@app.post("/documents/compare")
def compare_document_versions(request: CompareDocumentsRequest):
    """Compare two saved document versions."""

    if request.old_document_id == request.new_document_id:
        raise HTTPException(
            status_code=400,
            detail="Please select two different documents."
        )

    with get_connection() as connection:
        old_document = connection.execute(
            """
            SELECT id, filename, pages_json
            FROM documents
            WHERE id = ?
            """,
            (request.old_document_id,)
        ).fetchone()

        new_document = connection.execute(
            """
            SELECT id, filename, pages_json
            FROM documents
            WHERE id = ?
            """,
            (request.new_document_id,)
        ).fetchone()

    if old_document is None:
        raise HTTPException(
            status_code=404,
            detail="Baseline document not found."
        )

    if new_document is None:
        raise HTTPException(
            status_code=404,
            detail="Document to compare was not found."
        )

    old_pages = json.loads(old_document["pages_json"])
    new_pages = json.loads(new_document["pages_json"])

    old_text = "\n".join(
        page["text"] for page in old_pages
    ).strip()

    new_text = "\n".join(
        page["text"] for page in new_pages
    ).strip()

    if not old_text or not new_text:
        raise HTTPException(
            status_code=400,
            detail="Both documents must contain readable text."
        )

    result = compare_documents(old_text, new_text)

    return {
        "old_document_id": old_document["id"],
        "old_filename": old_document["filename"],
        "new_document_id": new_document["id"],
        "new_filename": new_document["filename"],
        "comparison": result
    }