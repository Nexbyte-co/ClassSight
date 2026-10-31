#!/usr/bin/env bash
# Dump Postgres and upload it to s3://<S3_BUCKET_NAME>/backups/ (the instance's IAM role
# provides the credentials). Run nightly from cron on the EC2 instance:
#   PATH=/usr/local/bin:/usr/bin:/bin:/snap/bin   (cron's default PATH lacks /snap/bin, where aws lives)
#   0 2 * * * /home/ubuntu/ClassSight/deployment/backup.sh >> /home/ubuntu/backup.log 2>&1
# Pruning is done by the bucket's lifecycle rule (expire backups/ after 14 days).
set -euo pipefail

cd "$(dirname "$0")"

# Plain KEY=value only (no quotes or inline comment); `|| true` so the check below reports it.
bucket=$(grep -E '^S3_BUCKET_NAME=' .env | cut -d= -f2- | tr -d '\r' || true)
[ -n "$bucket" ] || { echo "S3_BUCKET_NAME is not set in .env" >&2; exit 1; }

name="classsight-$(date +%F).sql.gz"
tmp=$(mktemp)
trap 'rm -f "$tmp"' EXIT

docker compose -f docker-compose.yml -f docker-compose.ec2.yml exec -T postgres \
  pg_dump -U classsight classsight | gzip > "$tmp"

aws s3 cp "$tmp" "s3://$bucket/backups/$name"
echo "uploaded s3://$bucket/backups/$name"
