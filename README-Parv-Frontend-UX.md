# ClassSight Frontend README

## Owner

**Parv Rawat**

Primary responsibility: frontend development and user experience.

## Role Mission

Build a clear, reliable interface that lets teachers review AI attendance suggestions and make the final attendance decision. The frontend must keep the teacher in control and make uncertain matches easy to correct.

## Main Responsibilities

- Build the React and Vite application.
- Implement login, routing, token handling, and protected routes.
- Create the teacher dashboard and classroom views.
- Build the attendance workflow:
  - Select a classroom.
  - Start an attendance session.
  - Upload a classroom photograph.
  - Display recognition results and confidence scores.
  - Allow manual corrections and student additions.
  - Support NFC confirmation states.
  - Submit verified attendance.
- Build student attendance dashboards and history views.
- Create reusable components and frontend API services.
- Build analytics and report views when the backend endpoints are available.
- Write frontend tests and maintain SRS/UI documentation.

## Expected Frontend Structure

```text
frontend/
├── public/
├── src/
│   ├── assets/
│   ├── components/
│   ├── pages/
│   ├── layouts/
│   ├── services/
│   ├── hooks/
│   ├── context/
│   ├── utils/
│   ├── App.jsx
│   └── main.jsx
├── package.json
└── README.md
```

## Key API Touchpoints

The UI should integrate with these backend operations:

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

The recognition response contains proposed matches and confidence values. Treat those values as review data, not as final attendance decisions.

## Definition Of Done

- Users can log in and reach only the pages allowed for their role.
- Teachers can complete the full attendance review flow.
- Confidence scores and unrecognized faces are visible and understandable.
- Teachers can correct AI results before confirmation.
- Loading, error, empty, and success states are handled.
- API errors do not leave the interface in an incorrect state.
- The interface works on the target desktop and mobile sizes.
- Frontend tests cover the most important user interactions.

## Collaboration Handoffs

### With Guransh

Confirm endpoint paths, request bodies, response shapes, authentication behavior, and error formats before wiring screens. Use mocked responses while APIs are still being developed.

### With Manit

Agree on the recognition-result shape, confidence display rules, unrecognized-face states, NFC status events, and image-upload behavior.

## Git Workflow

Use task-based branches from `develop`, for example:

```bash
git checkout develop
git pull origin develop
git checkout -b feature/attendance-ui
```

Keep commits focused and open a pull request into `develop`. Do not use permanent member-name branches.
