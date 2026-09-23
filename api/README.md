# FieldSync API Backend

The main backend server for FieldSync, built with Express and PostgreSQL (`pg`).

## Prerequisites

- Node.js (v18+)
- PostgreSQL (v14+) running locally or on a remote server

## Database Setup

1. **Create the PostgreSQL Database:**
   ```bash
   createdb -U postgres fieldsync_db
   ```
   Or via `psql`:
   ```sql
   CREATE DATABASE fieldsync_db;
   ```

2. **Initialize Schema:**
   Apply the initial database schema located in `schema.sql`:
   ```bash
   psql -U postgres -d fieldsync_db -f schema.sql
   ```

3. **Configure Environment Variables:**
   Copy `.env.example` to `.env` and verify your credentials:
   ```env
   PORT=5000
   DB_USER=postgres
   DB_PASSWORD=your_password
   DB_NAME=fieldsync_db
   DB_HOST=localhost
   DB_PORT=5432
   ```

## Running the API

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the API server:**
   ```bash
   node server.js
   ```
   The API server will listen on `http://localhost:5000`.

3. **Health Check:**
   Visit `http://localhost:5000/api/health` to confirm the server and PostgreSQL database connection are active and healthy.
