# ClassSight Backend README

## Owner

**Guransh Rally**

Primary responsibility: backend development, database design, and API contracts.

## Role Mission

Provide a dependable FastAPI and PostgreSQL foundation for authentication, classroom management, attendance sessions, verification, and reporting. The backend records the teacher’s verified decision, not an unreviewed AI guess.

## Main Responsibilities

- Build the FastAPI backend.
- Design and maintain the PostgreSQL schema and migrations.
- Implement authentication with JWT and bcrypt password hashing.
- Implement role-aware access for teachers, students, and admins.
- Build classroom and user management APIs.
- Build attendance session, upload, processing, confirmation, and log APIs.
- Integrate backend storage with Amazon S3.
- Implement verification and attendance-record rules.
- Build analytics and reporting APIs.
- Write backend tests and API documentation.
- Maintain the backend/database LLD.

## Expected Backend Structure

```text
backend/
├── app/
│   ├── api/
│   │   ├── auth.py
│   │   ├── classrooms.py
│   │   ├── attendance.py
│   │   └── users.py
│   ├── core/
│   │   ├── config.py
│   │   ├── security.py
│   │   └── database.py
│   ├── models/
│   ├── schemas/
│   ├── services/
│   │   ├── face_recognition.py
│   │   ├── s3_service.py
│   │   └── attendance_service.py
│   └── main.py
├── tests/
├── requirements.txt
├── Dockerfile
└── README.md
```

## Core Database Entities

- `users`: login identity, name, email, password hash, and role.
- `classrooms`: course, section, and assigned teacher.
- `students`: roll number, name, classroom, and registered face embedding.
- `attendance_sessions`: classroom, date, and classroom photograph URL.
- `attendance_records`: session, student, status, and recognition confidence.

For the MVP, one embedding may be stored per student. Keep the design open for a future separate embeddings table.

## API Contract

```text
POST /auth/login
GET  /classrooms
POST /attendance/session
POST /attendance/upload
POST /attendance/process
POST /attendance/confirm
GET  /attendance/logs
GET  /attendance/analytics
```

`/attendance/process` returns proposed recognized students, confidence scores, and unrecognized-face counts. `/attendance/confirm` must accept the teacher-reviewed result and persist the final statuses.

## Backend Rules

- Validate every request at the API boundary.
- Enforce role and classroom ownership checks on protected operations.
- Store only hashed passwords; never store plaintext passwords.
- Keep AI recognition separate from final attendance persistence.
- Never hardcode AWS credentials; use the EC2 IAM role.
- Return consistent error responses so the frontend can handle failures.
- Keep database changes in migrations and document contract changes.

## Definition Of Done

- Authentication and authorization are tested.
- A teacher can create, process, review, and confirm an attendance session.
- Attendance records cannot be confirmed for an unauthorized classroom.
- Student and classroom data are persisted correctly.
- S3 image references are stored without exposing unnecessary credentials.
- Logs and analytics return stable, documented response shapes.
- Backend tests cover success paths, validation failures, and authorization failures.

## Collaboration Handoffs

### With Parv

Publish endpoint documentation with request examples, response schemas, authentication requirements, and error formats. Notify the frontend owner before changing a public contract.

### With Manit

Define the recognition result format and the boundary between AI output and attendance confirmation. Coordinate the student lookup used by NFC UID verification.

## Git Workflow

Use task-based branches from `develop`, for example:

```bash
git checkout develop
git pull origin develop
git checkout -b feature/attendance-api
```

Keep schema, API, and test changes reviewable in focused commits. Merge through pull requests into `develop`.
