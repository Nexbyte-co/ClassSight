# Deploying ClassSight to AWS EC2 (S3 + your own domain, Free plan)

One EC2 instance runs the whole app with Docker Compose. Photos go to a private S3
bucket through an IAM role (no access keys). Caddy serves the app over HTTPS on your
domain. Do the steps in order and check each one before the next.

Placeholders used below: `<region>` (for example `us-east-1`), `<bucket>`, `<domain>`,
`<eip>` (the Elastic IP), `<instance-id>`.

Facts about AWS (prices, free-plan eligibility, defaults) are from memory and may have
changed. Check the credit balance and instance eligibility in your own console.

## 0. Costs and the Free plan

- The Free plan is credit-based: about $100, plus up to $100 more for completing
  onboarding tasks, for 6 months or until the credits run out. Then the account is
  **suspended and data is kept 90 days**.
- Biggest costs: the instance, the public IPv4 address / Elastic IP (about $3.65 per
  month), the disk and snapshots. Stopping the instance saves compute only.
- Before the plan ends: upgrade to Paid, or export a final database dump and the bucket
  contents (see Teardown).

## 1. Account safety

1. MFA on the root user.
2. Create an IAM admin user with MFA; use it from now on, not root.
3. Billing → Credits: note the balance and expiry date. Calendar reminder 2 weeks before.
4. Billing → Budgets: an alert at $10 of spend and one at about 80% of your credits.
5. Pick one region and use it for everything.

## 2. S3 bucket

- Name `<bucket>`, region `<region>` (must equal `AWS_REGION` in `.env`).
- Block all public access: on. Default encryption: SSE-S3. Versioning: off.
- Lifecycle rules: expire the `attendance/` prefix after 60 days and the `backups/`
  prefix after 14 days. Never expire `students/` (enrollment photos).
- CORS is needed only if the frontend fetches photos with JavaScript (plain `<img>`
  tags do not need it). If needed, allow `GET` from `https://app.<domain>`.

## 3. IAM role for the instance

IAM → Roles → create role, trusted entity EC2, name `classsight-ec2-role`, with this
inline policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {"Effect": "Allow",
     "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
     "Resource": "arn:aws:s3:::<bucket>/*"},
    {"Effect": "Allow",
     "Action": ["s3:ListBucket"],
     "Resource": "arn:aws:s3:::<bucket>"}
  ]
}
```

`docker-compose.ec2.yml` blanks the AWS key variables so the backend uses this role.

## 4. EC2 instance

Launch with:

- Ubuntu 24.04 LTS, type **c7i-flex.large** (4 GB RAM). The face model needs about that
  much, so avoid 1-2 GB types. Confirm the launch wizard marks it free-plan eligible in
  your region; if not, use a region where it is.
- 30 GB gp3 root volume with **Delete on termination = No**.
- Key pair (download it, `chmod 400`).
- IAM instance profile `classsight-ec2-role`.
- **Termination protection: enabled.** Stop keeps data; terminate deletes it.
- **Metadata options: IMDSv2 required, hop limit 2.** Containers sit one network hop
  behind the instance, so with hop limit 1 the backend cannot read its role credentials
  and uploads fail with "Unable to locate credentials". If you missed it at launch:
  ```bash
  aws ec2 modify-instance-metadata-options --instance-id <instance-id> \
    --http-tokens required --http-put-response-hop-limit 2
  ```
- Security group, inbound: **22 from My IP only**, **80** and **443** from anywhere.
  Nothing for 8000 or 5432.

Then allocate an **Elastic IP** and associate it with the instance. The domain needs a
fixed IP (the public IP otherwise changes on every stop/start). Release it on teardown;
an unattached Elastic IP is charged.

Prepare the server:

```bash
ssh -i key.pem ubuntu@<eip>
sudo apt-get update && sudo apt-get install -y git unattended-upgrades
sudo snap install aws-cli --classic          # installs to /snap/bin, see the cron note in step 7
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker ubuntu               # log out and back in afterwards

# 2 GB swap, so a memory spike does not kill the backend
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Docker log rotation, so logs cannot fill the disk
echo '{"log-driver":"json-file","log-opts":{"max-size":"10m","max-file":"3"}}' | \
  sudo tee /etc/docker/daemon.json
sudo systemctl restart docker
```

## 5. Domain and DNS

Create two **A records** pointing at `<eip>`:

| Name | Value |
|---|---|
| `app.<domain>` | `<eip>` |
| `api.<domain>` | `<eip>` |

If the domain uses Cloudflare DNS, set both to **DNS only** (grey cloud) so certificate
validation reaches the server. Wait until `dig +short app.<domain>` and
`dig +short api.<domain>` both return `<eip>` **before** the first deploy; failed
certificate attempts count against Let's Encrypt rate limits.

## 6. Deploy

```bash
git clone https://github.com/Nexbyte-co/ClassSight.git
cd ClassSight/deployment
cp .env.example .env && chmod 600 .env
```

Edit `.env`:

```
COMPOSE_PROFILES=app
JWT_SECRET_KEY=<python3 -c "import secrets; print(secrets.token_urlsafe(48))">
POSTGRES_PASSWORD=<strong value; set before the first start>
APP_HOST=app.<domain>
API_HOST=api.<domain>
VITE_API_BASE_URL=https://api.<domain>
CORS_ALLOWED_ORIGINS=["https://app.<domain>"]
S3_BUCKET_NAME=<bucket>
AWS_REGION=<region>
ENROLL_AUGMENT=false
```

Then:

```bash
./deploy.sh
docker compose -f docker-compose.yml -f docker-compose.ec2.yml ps    # backend (healthy)
docker compose -f docker-compose.yml -f docker-compose.ec2.yml exec \
  -e SEED_ADMIN_EMAIL=you@school.edu backend python -m app.db.seed
```

The first start downloads the face model (about 280 MB) into a volume, which can take up
to 5 minutes; later starts take seconds. `POSTGRES_PASSWORD` only applies when the
Postgres volume is first created.

## 7. Backups

- **Nightly database dump to S3** (keeps 14 days through the lifecycle rule):
  `crontab -e` and add (cron's default PATH does not include `/snap/bin`, where `aws` lives):
  ```
  PATH=/usr/local/bin:/usr/bin:/bin:/snap/bin
  0 2 * * * /home/ubuntu/ClassSight/deployment/backup.sh >> /home/ubuntu/backup.log 2>&1
  ```
  Run `./backup.sh` once by hand first and check the file appears under `backups/`.
- **EBS snapshots:** EC2 → Lifecycle Manager → a daily policy for the instance's volume,
  keeping 3 (snapshots cost credits).
- **Restore drill (do it once):** download a dump, create a scratch database in the
  Postgres container, restore with
  `gunzip -c file.sql.gz | docker compose ... exec -T postgres psql -U classsight scratch`,
  compare row counts, then drop the scratch database.

## 8. Verify (in this order)

1. `https://app.<domain>` loads with a valid certificate; `https://api.<domain>/health`
   returns `{"status":"healthy"}`; `http://` redirects to `https://`. (`/docs` is turned
   off on EC2; see Hardening.)
2. Upload one photo through the API and confirm it appears in the bucket. This catches
   the hop-limit and region problems first.
3. A presigned photo URL opens in the browser.
4. From your laptop (the photos stay there):
   ```bash
   python scripts/e2e_verify.py --base-url https://api.<domain> \
     --data-dir ~/classsight-data --label ec2
   ```
   Add the results to `docs/e2e-verification.md`.
5. `sudo reboot`, then check `docker compose ... ps`: everything should come back healthy
   on its own.
6. The browser shows the camera permission prompt (needs HTTPS).

## 9. Updating and rolling back

- **Update:** `git push` from your laptop, then
  `ssh ubuntu@app.<domain> ~/ClassSight/deployment/deploy.sh`.
- **Changed domain or API address:** edit `.env`, then run `deploy.sh` (it rebuilds the
  frontend, which has the API URL baked in).
- **Roll back:** `git checkout <previous-commit>`, then `docker compose -f docker-compose.yml
  -f docker-compose.ec2.yml up -d --build` (not `deploy.sh`, whose `git pull` fails on a
  detached HEAD). To return to normal updates, `git checkout <branch>` first. The backend
  applies database migrations at startup, so rolling back past a migration also needs a
  database restore.
- **Caddyfile changes:** `deploy.sh` does not restart Caddy when only the Caddyfile
  changed. Run `docker compose -f docker-compose.yml -f docker-compose.ec2.yml restart caddy`.

## 10. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| "Unable to locate credentials" on upload | Metadata hop limit is 1 | Set it to 2 (step 4) |
| Signature or redirect errors on S3 URLs | `AWS_REGION` differs from the bucket's region | Make them match |
| Browser "network error" while `curl` works | `CORS_ALLOWED_ORIGINS` does not match exactly (scheme, trailing slash) | Fix it, restart the backend |
| Frontend calls the wrong address | `VITE_API_BASE_URL` is baked in at build time | Edit `.env`, run `deploy.sh` |
| No certificate | DNS not pointing at `<eip>` yet, or 80/443 closed | Fix DNS or the security group; `docker compose ... logs caddy` |
| Backend restarts or is killed | Out of memory | Check the swap file and that the instance has 4 GB |
| Changing `POSTGRES_PASSWORD` has no effect | Applies only on first volume creation | Change it inside Postgres, or recreate the volume (loses data) |
| `429` on login | Failed-login throttle (5 per email or 20 per IP in 15 minutes) | Wait for `Retry-After`; restarting the backend also clears it |
| `/docs` returns 404 | API docs are off on EC2 | Set `ENABLE_DOCS=true` in `.env` temporarily, run `deploy.sh`, then turn it off again |
| Disk full | Docker images and logs | `docker system prune`; check log rotation |
| Domain stopped working after a stop/start | No Elastic IP | Associate one |

## 11. Security and hardening

**Already in place**
- Only ports 80 and 443 are public; Postgres is bound to the instance only; the backend
  is reachable only through Caddy. HTTPS everywhere.
- The bucket is private and encrypted; the instance role can touch only that bucket and
  there are no access keys. IMDSv2 is required. Photo links expire after 5 minutes.
- Only an admin can create users (no self-signup). `.env` is mode 600 and git-ignored.
- The EC2 compose file turns off the interactive API docs (`/docs`, `/redoc`,
  `/openapi.json`) and shortens login sessions to 120 minutes. Override with
  `ENABLE_DOCS` and `ACCESS_TOKEN_EXPIRE_MINUTES` in `.env`.
- Failed logins are throttled: 5 failures per email or 20 per client IP within 15
  minutes gives `429` with a `Retry-After` header, even for the right password. The
  counters are in memory, so they reset when the backend restarts, and a determined
  attacker can still lock a real user out for 15 minutes (accepted for a demo).

**Do these yourself**
1. **Protect the AWS account first:** root MFA, the IAM admin user, and billing alerts
   (step 1). Budgets only alert; they do not stop spending. A hijacked console is a
   bigger risk than anything on the server.
2. **Close port 22 with Session Manager (recommended).** Attach the AWS managed policy
   `AmazonSSMManagedInstanceCore` to `classsight-ec2-role`, wait a few minutes until the
   instance shows under Systems Manager → Fleet Manager, connect with the console's
   *Connect → Session Manager* tab or `aws ssm start-session --target <instance-id>`,
   then remove the port 22 rule. If you keep SSH, restrict it to your IP and never open
   it to `0.0.0.0/0`, not even temporarily.
3. **Optional: Cloudflare in front** (free): proxied (orange cloud) records hide the
   server IP and add basic DDoS protection and rate-limit rules. Set SSL/TLS mode to
   *Full (strict)*. Trade-offs: the app then sees Cloudflare's addresses instead of
   visitors' (so the per-IP login limit is shared and the per-email one still works),
   and certificate issuance can fail until you switch the records to DNS only during
   the first deploy. Skip it if unsure.
4. **Keep it patched:** unattended upgrades cover the OS. `deploy.sh` does not fetch
   newer base images, so about once a month run
   `docker compose -f docker-compose.yml -f docker-compose.ec2.yml build --pull`
   followed by `deploy.sh`.
5. **Rotate secrets** if you ever suspect a leak: change `JWT_SECRET_KEY` in `.env` and
   run `deploy.sh`; everyone is logged out.

**Data**
- Enrollment photos and stored face embeddings are biometric: a leak cannot be undone
  the way a password reset can. Until consent and a retention rule exist, demo with
  synthetic or consenting people only.
- Until Phase E, the deployed UI uses mock data and hardcoded demo accounts and does not
  use the live backend.

## 12. Teardown

Disable termination protection, terminate the instance, delete the root volume and any
snapshots, release the Elastic IP, and (after exporting what you need) empty and delete
the bucket.

## Known limits and open items

- The frontend still uses hardcoded demo accounts and mock data (commit 1940ccf), so the
  full camera and attendance flow is only demoable after Phase E. Tell the teammate
  before Phase E touches those files.
- The one-face rule (keep strict, or accept the dominant face) is undecided.
- The demo uses 5 students with `ENROLL_AUGMENT=false`.
