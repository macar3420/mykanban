[![Review Assignment Due Date](https://classroom.github.com/assets/deadline-readme-button-22041afd0340ce965d47ae6ef1cefeee28c7c493a6346c4f15d667ab976d596c.svg)](https://classroom.github.com/a/UrSBfkqg)
# Web Software Production
Welcome to the starter repository for your team project in the **Web Software Production** course.

As the course progress and you implement features, keep the README up-to-date.

## Project: “TeamBoard” – A Collaborative Task Management Web App
### 🎯 Project Goal
Build a full-stack web application that allows users to create, manage, and collaborate on tasks within teams. The app should support basic CRUD operations, user authentication, and real-time updates.

### 🧩 Core Features (Required for All Teams)
#### User Authentication
- Register, login, logout
- Join team

#### Task Management
- Create, edit, delete tasks
- Assign tasks to users
- Set due dates and priorities
- Team Collaboration

#### Create and join teams
- View team-specific task boards

### 🎨 Options (Choose 2–3 per team)
Teams can personalize their app by selecting from the following enhancements:
- AI Assistant: Suggest task priorities or deadlines using a simple ML model or rule-based logic.
- Calendar View: Visualize tasks in a calendar or timeline format.
- Notifications: Add email or in-app notifications for task updates.
- Analytics Dashboard: Show team productivity metrics (e.g., tasks completed per week).
- Multilingual Support: Add localization for at least two languages.
- Security Focus: Implement advanced security features like 2FA or audit logs.
- File Attachments: Allow users to upload files to tasks.
- Custom Themes: Let users choose or create UI themes.
- Responsive UI: Works well on desktop and mobile.
  
### 🛠️ Tech Stack Guidelines
Frontend: React
Backend: Node.js (Express)
Database: PostgreSQL
DevOps: Docker, GitHub Actions, CI/CD pipeline
Testing: Unit + integration tests using Jest, Mocha, Cypress, Playwrite, etc.

## Local development

- Backend
  - From `backend/`: `npm run dev` (listens on http://localhost:3000)

- Frontend
  - From `frontend/`: `npm run dev` (Vite, usually http://localhost:5173)

## Docker (frontend + backend + MySQL)

Build and start all services:

```
docker compose up -d --build
```

Services:
- API: http://localhost:3000
- Frontend: http://localhost:8080
- MySQL: localhost:3306 (root/devpass, db mob_barley)

Stop:

```
docker compose down
```

Data persists in Docker volume `mob_mysql_data`.