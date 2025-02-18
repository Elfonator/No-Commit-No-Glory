# SciSubmit Project

SciSubmit is a project management system for conference submissions and reviews. It allows users to submit papers, manage conferences, assign reviews, and much more. Built using **Vue.js**, **Node.js (Express)**, and **MongoDB**, this project leverages Docker for containerization.

## Table of Contents

- [Project Overview](#project-overview)
- [Technologies Used](#technologies-used)
- [Installation](#installation)
- [Development Workflow](#development-workflow)
- [Environment Setup](#environment-setup)
- [Branches](#branches)

## Project Overview

SciSubmit is a web application designed to streamline the process of submitting papers to academic conferences and managing the review process. Admins can create conferences, assign reviewers, and manage paper submissions, while students can submit their work for review.

## Technologies Used

- **Frontend**: Vue 3 (with TypeScript)
- **Backend**: Express.js (Node.js) with TypeScript
- **Database**: MongoDB (Mongoose ORM)
- **Containerization**: Docker
- **Version Control**: Git and GitHub
- **Other Tools**: Docker Compose, Vuetify, ESLint, Prettier

## Installation

To get a local copy up and running, follow these steps:

### Prerequisites

- **Node.js**
- **Docker** (with Docker Compose)

### Clone the Repository

```bash
git clone https://github.com/Elfonator/No-Commit-No-Glory.git
cd SciSubmit
```

### Backend Setup

```bash
cd backend
npm install
```

### Frontend Setup

1. Install dependencies

```bash
cd frontend
npm install
```

2. Run the Development Server

```bash
npm run dev
```

### Start Docker Containers

```bash
#In project root folder run
docker-compose up --build
```

### Database Seeder

```bash
cd backend/src
npx ts-node seed.ts
```

## Development Workflow

We are following the Git Flow methodology, so contributions should be made in feature branches and merged into develop via pull requests.

### Branches

- **main**: The main branch contains the production-ready code.
- **develop**: The development branch contains the latest changes and is the default branch for active development.

## Environment Setup

- **Backend**: Copy the .env.example file to .env and set the necessary environment variables.
- **Frontend**: Copy the .env.example file in the frontend folder to .env and configure it.

```bash
#backend .env file
MONGO_URI=mongodb://mongo:27017/scisubmit
PORT=5000
```

```bash
#frontend .env file
VITE_API_URL=http://localhost:5000/api
VITE_APP_TITLE=SciSubmit
```

## License

This project is licensed under the [MIT License](./LICENSE).