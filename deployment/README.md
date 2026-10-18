# ClassSight deployment

Everything runs in Docker Compose. Run commands from this `deployment/` folder.

| Service | Image | Port | Profile |
|---|---|---|---|
| `postgres` | `postgres:16` | 5432 | always |
| `backend` | built from `backend/Dockerfile` | 8000 | `app` |
| `frontend` | built from `deployment/frontend.Dockerfile` (nginx) | 80 | `app` |
| `s3` + `s3-init` | `chrislusf/seaweedfs:4.48` (S3-compatible, local only) | 8333 | `local` |

`docker compose up -d` with no profiles still starts **only Postgres**, for local
backend development and `pytest`.

## Run the whole app locally

```bash
cp .env.example .env
# set JWT_SECRET_KEY in .env:
python3 -c "import secrets; print(secrets.token_urlsafe(48))"

docker compose up -d --build        # COMPOSE_PROFILES=app,local in .env
docker compose ps                   # wait for backend to be (healthy)
```

- Frontend: http://localhost
- API docs: http://localhost:8000/docs
- Create the first admin:
  `docker exec -e SEED_ADMIN_EMAIL=you@school.edu classsight-backend python -m app.db.seed`

On its **first** start the backend downloads the face model (~280 MB) into the
`insightface_models` volume, which can take a few minutes; later starts take seconds.
At startup the container also applies database migrations.

## Run on EC2

```bash
# deployment/.env on the instance: COMPOSE_PROFILES=app, strong JWT_SECRET_KEY and
# POSTGRES_PASSWORD, VITE_API_BASE_URL=http://<public-ip>:8000,
# CORS_ALLOWED_ORIGINS=["http://<public-ip>"], S3_BUCKET_NAME, AWS_REGION.
docker compose -f docker-compose.yml -f docker-compose.ec2.yml up -d --build
```

`docker-compose.ec2.yml` switches to real S3 through the instance's IAM role (no
keys), binds Postgres to the instance only, and restarts services automatically.
The security group must allow 80 and 8000 (the browser calls the API directly), and
22 from your IP only.

## Notes

- The frontend reads `VITE_API_BASE_URL` at **build** time; rebuild it after changing it.
- Browsers allow camera capture only over HTTPS (or localhost); camera use on EC2 will
  need a domain and TLS.
- MinIO was the original plan for local S3, but its free images are no longer published
  on Docker Hub, so SeaweedFS is used instead.
