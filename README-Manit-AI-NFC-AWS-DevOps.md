# ClassSight AI and Deployment README

## Owner

**Manit Sharma**

Primary responsibility: AI, NFC, AWS, and DevOps.

## Role Mission

Build the recognition and fallback systems that assist attendance, then make the integrated application reproducible and deployable. AI proposes matches; the teacher always makes the final attendance decision.

## Main Responsibilities

- Build the face-recognition prototype with approximately 20 subsection students.
- Implement face detection, face embeddings, similarity matching, and confidence scoring.
- Integrate recognition into the FastAPI backend.
- Establish and document confidence thresholds for review.
- Build the NFC reader and student-UID prototype.
- Configure AWS EC2, S3, IAM, and security groups.
- Create Docker and Docker Compose deployment configuration.
- Configure Nginx when needed.
- Add CI/CD where practical within the MVP schedule.
- Write AI, deployment, and HLD documentation and diagrams.

## Recognition Pipeline

```text
Classroom Image
      |
      v
Face Detection
      |
      v
Face Embedding
      |
      v
Compare With Registered Embeddings
      |
      v
Similarity / Distance
      |
      v
Confidence Score
      |
      v
Proposed Recognition Result
```

The recognition module should expose a focused interface such as:

```python
result = recognize_faces(image)
```

It should return proposed student matches, confidence values, and unrecognized faces without directly writing final attendance records.

## Prototype Workflow

```text
Student Photos
      |
      v
Detect Faces and Generate Embeddings
      |
      v
Store Registered Embeddings
      |
      v
Process Classroom Test Photograph
      |
      v
Compare and Return Student + Confidence
```

Test poor lighting, occlusion, face orientation, low image quality, nearby faces, and similar-looking faces. Record the limitations and threshold decisions in the AI documentation.

## NFC Fallback

```text
Face Not Reliably Recognized
      |
      v
Read NFC Student UID
      |
      v
Resolve UID to Student
      |
      v
Add Student to Attendance Session
      |
      v
Teacher Verification
```

The NFC path is a fallback, not an automatic bypass of teacher verification. Coordinate the UID-to-student lookup with Guransh and the status/confirmation interface with Parv.

## Deployment Responsibilities

- Use an EC2 IAM role for S3 access.
- Do not hardcode AWS access keys in source code or environment files committed to Git.
- Store classroom photographs in S3 and keep only the required reference in PostgreSQL.
- Package the backend and supporting services with Docker.
- Use Docker Compose for the MVP deployment.
- Keep PostgreSQL on the EC2 instance only as an MVP simplification.
- Treat CloudFront as optional if schedule permits.
- Document environment variables, ports, storage locations, and deployment steps.

## Expected Ownership Areas

```text
deployment/
├── docker-compose.yml
├── nginx/
└── aws/

backend/app/services/
├── face_recognition.py
└── s3_service.py
```

## Definition Of Done

- The recognition prototype produces repeatable results on the controlled dataset.
- Confidence values and failure cases are documented.
- The backend can call the recognition module without duplicating AI logic.
- NFC UID reads can be resolved to the correct student.
- The integrated application runs in Docker.
- EC2 can access S3 through IAM without embedded credentials.
- Deployment and rollback steps are documented.
- Integration and system tests cover recognition, NFC fallback, and the deployed path.

## Collaboration Handoffs

### With Parv

Provide stable recognition-result fields, confidence semantics, unrecognized-face states, and NFC events for the attendance review UI.

### With Guransh

Define the recognition service boundary, embedding storage format, S3 object behavior, and UID-to-student lookup contract. Coordinate environment configuration and deployment database access.

## Git Workflow

Use task-based branches from `develop`, for example:

```bash
git checkout develop
git pull origin develop
git checkout -b feature/face-recognition
```

Other examples include `feature/nfc`, `feature/s3-upload`, and `feature/deployment`. Push the branch and open a pull request into `develop` after testing locally.
