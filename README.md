# SciSubmit Project

SciSubmit is a project management system for conference submissions and reviews. It allows users to submit papers, manage conferences, assign reviews, and much more. Built using **Vue.js**, **Node.js (Express)**, and **MongoDB**, this project leverages **Docker** for containerization.

## Table of Contents

- [Project Overview](#project-overview)
- [Technologies Used](#technologies-used)
- [Installation](#installation)
- [Development Workflow](#development-workflow)
- [License](#license)

## Project Overview

SciSubmit is a web application designed to streamline the process of submitting papers to academic conferences and managing the review process. **Admins** can create conferences, assign reviewers, and manage paper submissions, while **authors** can submit their work for review.

## Technologies Used

- **Frontend**: Vue 3 (Composition API, TypeScript, Pinia, Vuetify)
- **Backend**: Express.js (Node.js) with TypeScript, Mongoose (MongoDB ORM)
- **Database**: MongoDB
- **Containerization**: Docker with Docker Compose
- **Version Control**: Git and GitHub
- **Other Tools**: ESLint, Prettier

## Installation

SciSubmit is **containerized using Docker**, making setup straightforward. Follow these steps:

### Prerequisites

- **Docker & Docker Compose** (Ensure Docker is installed)
- **Node.js** (Only required for running locally without Docker)

### Clone the Repository

```bash
git clone https://github.com/Elfonator/No-Commit-No-Glory.git
cd SciSubmit
```

### Development environment with Docker

1. **Backend Environment File (backend/.env.dev)**

The environment is managed using .env.dev files, which are dynamically injected via Docker Compose.
```ini
PORT=5000
MONGO_URI=mongodb://root:secret@mongo:27017/scisubmit?authSource=admin

ADMIN_EMAIL=email@example.com
ADMIN_PASSWORD=password

NODE_ENV=development

BASE_URL=http://localhost:5000
BASE_FRONTEND_URL=http://localhost:8080
BASE_UPLOAD_DIR=/app/uploads

JWT_SECRET=development_token

EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USER=email@example.com
EMAIL_PASS=application_password
```

2. **Frontend Environment File (frontend/.env.dev)**
```ini
VITE_API_URL=http://localhost:5000
VITE_APP_TITLE=SciSubmit
```

3. **Docker-compose File (docker-compose.yml)**

We use Docker Compose to run the application in a development environment.

```yaml
services:
  mongo:
    image: mongo:latest
    restart: always
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db
    environment:
      MONGO_INITDB_DATABASE: scisubmit
      MONGO_INITDB_ROOT_USERNAME: root
      MONGO_INITDB_ROOT_PASSWORD: secret

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    volumes:
      - ./backend:/app
      - /usr/src/app/node_modules
      # Named volume for persistent storage of uploaded files
      - project_storage:/app/uploads
    env_file:
      - ./backend/.env.dev  #Inject .env.dev dynamically
    ports:
      - "5000:5000"
    depends_on:
      - mongo

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    volumes:
      - ./frontend:/app
      - /app/node_modules
    env_file:
      - ./frontend/.env.dev
    ports:
      - "8080:8080"
      - "9000:9000"
    command: ["npm", "run", "dev", "--", "--host"]
    depends_on:
      - backend

volumes:
  mongo_data:
  project_storage:
```

4. **Start the Application using Docker**

```bash
docker-compose up --build
```

To stop and remove container, use:
```bash
docker-compose down
```

### Local environment without Docker (Optional)

If you want to run the application without Docker, you can do so manually:

1. Backend Setup
```bash
cd backend
npm install
```

2. Database seeding
```bash
cd backend/src
npx ts-node seed.ts
```

3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

## Development Workflow

We are following the Git Flow methodology, so contributions should be made in feature branches and merged into develop via pull requests.

### Branches

- **main**: The main branch contains the production-ready code.
- **develop**: The development branch contains the latest changes and is the default branch for active development.


## License

This project is licensed under the [MIT License](./LICENSE).
