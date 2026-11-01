#!/usr/bin/env bash
# Update the running EC2 deployment to the latest code on the current branch.
#   ~/ClassSight/deployment/deploy.sh   (in a Session Manager shell: sudo -iu ubuntu; or via ssh while port 22 is open)
# Compose rebuilds only the services whose inputs changed. The frontend bakes in
# VITE_API_BASE_URL at build time, so edit .env first if the API address changed.
set -euo pipefail

cd "$(dirname "$0")"

git pull --ff-only
docker compose -f docker-compose.yml -f docker-compose.ec2.yml up -d --build
docker image prune -f
docker compose -f docker-compose.yml -f docker-compose.ec2.yml ps
