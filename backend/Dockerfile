# Layak backend — FastAPI + ADK-Python + WeasyPrint on Cloud Run.
#
# Build: docker build -t layak-backend -f backend/Dockerfile backend
# Run:   docker run --rm -p 8080:8080 \
#           -e GEMINI_API_KEY=$GEMINI_API_KEY \
#           -e GOOGLE_CLOUD_PROJECT=$GOOGLE_CLOUD_PROJECT \
#           layak-backend
#
# Cloud Run deploy (Task 6): `gcloud run deploy layak-backend --source backend`
# supplies these same native libs automatically via its buildpacks, but we ship
# an explicit Dockerfile so behaviour is reproducible across platforms.

FROM python:3.12-slim

# WeasyPrint's native deps. Without these the Python-side import succeeds but
# every `HTML(...).write_pdf()` raises `OSError: cannot load library libgobject-2.0-0`.
# `libpango-1.0-0`, `libpangoft2-1.0-0`, `libharfbuzz0b` cover text shaping.
# `libcairo2` is the rasteriser. `libgdk-pixbuf-2.0-0` handles embedded images.
# `shared-mime-info`, `fonts-dejavu-core`, `fonts-liberation` round out fonts
# + MIME detection so PDFs render with non-tofu glyphs for Malay + Chinese text.
RUN apt-get update && apt-get install -y --no-install-recommends \
      libpango-1.0-0 \
      libpangoft2-1.0-0 \
      libharfbuzz0b \
      libcairo2 \
      libgdk-pixbuf-2.0-0 \
      shared-mime-info \
      fonts-dejavu-core \
      fonts-liberation \
      && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python deps first for better layer caching.
COPY pyproject.toml ./
RUN pip install --no-cache-dir --upgrade pip wheel \
    && pip install --no-cache-dir \
       "fastapi>=0.115" \
       "uvicorn[standard]>=0.30" \
       "pydantic>=2.7" \
       "python-multipart>=0.0.9" \
       "google-adk>=1.31,<1.32" \
       "google-genai>=1.0" \
       "jinja2>=3.1" \
       "weasyprint>=62" \
       "firebase-admin>=6.5,<7"

# App code (templates + schemas + tools + rules + agents + fixtures + main).
COPY app ./app
COPY data ./data

# Cloud Run injects PORT; default to 8080 for local runs.
ENV PORT=8080
EXPOSE 8080

# `exec` form so uvicorn is PID 1 and receives SIGTERM cleanly on Cloud Run revisions.
CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080}"]
