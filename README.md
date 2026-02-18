# MS Planer – Tutor Operations Platform with Django & React

A full-stack tutoring management platform for handling students, courses, schedules, exams, todos, and invoices.  
Built with **Django 6 (DRF)**, **React (Vite)**, **TailwindCSS**, and deployable via **Docker + Gunicorn**.

---

## 🌐 Features

### 📚 Core Management
- **Student Management:** CRUD, status/level filtering, billing profile fields
- **Course Management:** registration tracking, paid/unpaid status, period filters
- **Schedule Management:** weekly/monthly range queries and lesson CRUD
- **Exam Management:** official + mock exam records with analysis-ready structure
- **Todo Management:** priority/category-based task organization

### 🧾 Invoice Workflow
- Invoice creation with line items and adjustments
- PDF export for invoices
- Unsent invoice highlighting + notification sync

### 🔐 Authentication & Account
- Email login/signup with verification flow
- Password reset/change flow
- Social login support (Google, Kakao)
- User settings/profile management

### 🌍 Internationalization (i18n)
- Frontend UI supports **German/Korean**
- Backend translated messages via Django i18n
- Localized email templates

### ⚡ Performance (Recent Improvements)
- Removed redundant data fetches on heavy pages
- Added lazy tab-based loading in student details
- Applied queryset tuning (`select_related` / `prefetch_related`)
- Optimized dashboard upcoming-exam data flow

---

## 🛠️ Tech Stack

| Layer        | Tech |
|--------------|------|
| Backend      | Python, Django 6, DRF, dj-rest-auth, django-allauth |
| Frontend     | React 19, Vite, TailwindCSS, Recharts |
| Auth         | JWT Cookie Auth + Email/Social Login |
| i18n         | i18next (frontend), Django i18n (backend) |
| Database     | PostgreSQL |
| Deployment   | Docker, Gunicorn, WhiteNoise |

---

## 📂 Project Structure

```text
pf3_manager/
├── config/                 # Django settings, root URLs
├── tutor/                  # Main app: models/views/serializers/api
├── templates/              # Account & email templates
├── locale/                 # Backend translation files
├── frontend/               # React app (pages/components/locales)
├── Dockerfile
├── docker-compose.yml      # PostgreSQL service (local)
└── manage.py
```

---

## 🧭 Routes Overview

### Frontend Routes

| Route | Description |
|-------|-------------|
| `/login` | Login/Signup page |
| `/password-reset/confirm/:uid/:token` | Password reset confirm |
| `/accounts/confirm-email/:key` | Email verification page |
| `/` | Dashboard |
| `/schedule` | Schedule page |
| `/students` | Student management |
| `/courses` | Course & invoice management |
| `/exams` | Exam management |
| `/settings` | User/account settings |

### Backend API (Main)

| Route | Description |
|-------|-------------|
| `/api/students/` | Student CRUD/filter |
| `/api/courses/` | Course registration CRUD/filter |
| `/api/lessons/` | Lesson CRUD/filter (`/today/` supported) |
| `/api/exam-records/` | Mock exam CRUD |
| `/api/official-results/` | Official exam CRUD |
| `/api/todos/` | Todo CRUD |
| `/api/invoices/` | Invoice CRUD + custom actions |
| `/api/dashboard/stats/` | Dashboard aggregate metrics |
| `/api/auth/*` | Auth endpoints (dj-rest-auth) |

---

## 🚀 Local Setup

### 1) Backend (Django)

Create `.env` in project root:

```env
SECRET_KEY=your-secret-key
DEBUG=True
ALLOWED_HOSTS=127.0.0.1,localhost
FRONTEND_BASE_URL=http://127.0.0.1:5173
BACKEND_BASE_URL=http://127.0.0.1:8000
DATABASE_URL=postgresql://<DB_USER>:<DB_PASSWORD>@127.0.0.1:<DB_PORT>/<DB_NAME>
```

Run:

```bash
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

### 2) Frontend (React)

Create `frontend/.env`:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

Run:

```bash
cd frontend
npm install
npm run dev
```

---

## 🐳 Run with Docker

```bash
# Build image
docker build -t pf3-manager .

# Run app container
docker run -p 8000:8000 --env-file .env pf3-manager
```

For local PostgreSQL:

```bash
docker compose up -d db
```

Then point `DATABASE_URL` to your Postgres instance.

Example compose env values:

```env
DB_NAME=pf3_manager
DB_USER=postgres
DB_PASSWORD=postgres
DB_PORT=5432
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/pf3_manager
```

---

## 📝 Notes

- Several list APIs are currently non-paginated.  
  For large datasets, apply pagination incrementally with coordinated frontend changes.
- Recent commits include major i18n coverage and page-load optimization refactors.

---

## 👨‍💻 Author

Built with ❤️ by **Myeonggyun Park**  
This project is a portfolio-ready full-stack tutoring management application, demonstrating practical capabilities from backend architecture and API design to responsive frontend UX.
