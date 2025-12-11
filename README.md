# Web Software Production - Mob Barley Kanban Board

This is a web application that allows you to create a kanban board and manage your tasks.

## Environment Setup

### Backend Environment Variables (`backend/.env`)

Required:
- `DB_HOST` - Database host (e.g., RDS endpoint or `127.0.0.1` for local)
- `DB_PORT` - Database port (default: `3306`)
- `DB_USER` - Database username
- `DB_PASSWORD` - Database password
- `DB_NAME` - Database name (default: `mob_barley`)
- `DB_SSL` - Enable SSL for database connection (`true`/`false`, required for RDS)

Optional:
- `SENDGRID_API_KEY` - SendGrid API key for password reset emails
- `SENDGRID_FROM_EMAIL` - Email address for password reset emails

## Local development

- Backend
  - From `backend/`: `npm run dev` (http://localhost:3000)

- Frontend
  - From `frontend/`: `npm run dev` (http://localhost:8080)

## Docker (frontend + backend)

Build and start all services:

```
docker compose up -d --build
```

Services:
- API: http://localhost:3000
- Frontend: http://localhost:8080

Stop:

```
docker compose down
```

**Note:** Database is hosted on AWS RDS (MySQL). Ensure `backend/.env` is configured with:
- `DB_HOST` - RDS endpoint
- `DB_USER` - Database username
- `DB_PASSWORD` - Database password
- `DB_NAME` - Database name (default: `mob_barley`)
- `DB_SSL` - Set to `true` for RDS connections

## How to use the app

1. Go to http://localhost:8080
2. Click "Create an account"
3. Fill in the form in Signup.
4. Click "Create account"
5. You will be automatically logged in and redirected to the home page.
6. There are 2 boards in the home page. One is your personal board and the other is your team board.
7. You can create a new task in your personal board.
8. You can CRUD tasks in your personal board, also drag-drop tasks between the columns.
9. You can create a new team and add direclty other users to join.
10. Typing the username of the user you want to add to the team will show you the user and you can add them to the team.
11. The team you created and other teams you are a member of will be shown over the board.
12. Clicking on a team will show you the tasks in that team.
13. You can create a new task in the team board.
14. You can CRUD tasks in the team board.
15. As an owner of a team and a member of the team you can assign other users to the team by using the "Assign Team" button.
16. As an owner of the team you can use the "Edit Team Name", "Delete Team" and "Manage Members" buttons. But if you are only a member of the team you can only see "Leave Team" button.
17. You can logout by clicking the "Logout" button in the top right corner.
