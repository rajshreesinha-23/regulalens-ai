from fastapi import FastAPI

app = FastAPI(
    title="RegulaLens AI",
    description="Regulatory intelligence and software impact analysis",
    version="0.1.0"
)


@app.get("/")
def home():
    return {
        "message": "Welcome to RegulaLens AI",
        "status": "running"
    }


@app.get("/health")
def health_check():
    return {"status": "healthy"}