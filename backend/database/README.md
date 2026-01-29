# Database Setup

## Prerequisites

- PostgreSQL 14+ installed
- Node.js 18+ installed

## Setup Instructions

1. **Create Database:**
```bash
createdb ecoinvest_dnsh_evaluator
```

2. **Run Schema:**
```bash
psql -d ecoinvest_dnsh_evaluator -f schema.sql
```

3. **Environment Variables:**
Create a `.env` file in the backend directory:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/ecoinvest_dnsh_evaluator
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=ecoinvest_dnsh_evaluator
DATABASE_USER=your_user
DATABASE_PASSWORD=your_password
```

## Schema Overview

The database includes:
- **Users & Authentication**: User management, teams, refresh tokens
- **Clients & Operations**: Deal/operation management
- **Assets**: Asset information and attributes
- **DNSH Evaluations**: Complete evaluation data
- **Evidence Documents**: File management with versioning
- **Collaboration**: Comments, tasks, notifications
- **Workflow**: Approval workflows and states
- **Audit**: Complete audit trail

## Indexes

All foreign keys and frequently queried fields are indexed for performance.

## Triggers

Automatic `updated_at` timestamp updates on all relevant tables.
