<p align="center">
  <img src="public/srm-logo.png" alt="SRM Concrete Logo" width="120" />
</p>

<h1 align="center">SRM Tools</h1>

<p align="center">
  <img src="https://github.com/bradley-t-t/smyrnatools-com/actions/workflows/ci.yml/badge.svg?branch=core" alt="CI Status" />
</p>

<p align="center">
  <strong>Fleet Management & Operations Platform for SRM Concrete</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19.1-61DAFB?logo=react" alt="React" />
  <img src="https://img.shields.io/badge/Supabase-Backend-3ECF8E?logo=supabase" alt="Supabase" />
  <img src="https://img.shields.io/badge/Tailwind-3.4-06B6D4?logo=tailwindcss" alt="Tailwind" />
</p>

---

## Overview

SRM Tools is a comprehensive fleet management and operations platform built for SRM Concrete. It provides real-time
tracking, verification workflows, reporting, and AI-powered insights across the entire ready-mix concrete operation
spanning **24 states** and **100+ plants**.

---

## Core Features

### Fleet Management

| Module            | Description                                                         |
|-------------------|---------------------------------------------------------------------|
| **Mixers**        | Track mixer trucks, assignments, service dates, cleanliness ratings |
| **Tractors**      | Manage tractor fleet with operator assignments and verification     |
| **Trailers**      | Cement and end dump trailer inventory management                    |
| **Equipment**     | Heavy equipment tracking (loaders, excavators, forklifts, etc.)     |
| **Pickup Trucks** | Company vehicle fleet management                                    |

### Personnel Management

| Module                  | Description                                                  |
|-------------------------|--------------------------------------------------------------|
| **Operators**           | Driver roster with training status, ratings, and assignments |
| **Managers**            | Plant, district, and regional manager directory              |
| **Roles & Permissions** | Granular permission system with role-based access            |

### Operations

| Module           | Description                                                             |
|------------------|-------------------------------------------------------------------------|
| **Dashboard**    | Real-time plant metrics, AI insights, and notifications                 |
| **Reports**      | Weekly efficiency reports (Plant Manager, District Manager, Safety, GM) |
| **Leaderboards** | Plant efficiency rankings with YPH, cleanliness, and safety metrics     |
| **Task List**    | Plant maintenance and task management system                            |
| **Calculators**  | Concrete calculators (slump adjust, W/C ratio, set time, overweight)    |

### Intelligence

| Feature                 | Description                                                   |
|-------------------------|---------------------------------------------------------------|
| **AI Insights**         | Grok-powered analysis for plants, assets, and reports         |
| **Smart Notifications** | Context-aware alerts for verifications, issues, and deadlines |
| **History Tracking**    | Complete audit trail with AI-generated summaries              |

---

## Tech Stack

```
Frontend        React 19 + React Router 7
Styling         Tailwind CSS 3.4
Backend         Supabase (PostgreSQL + Auth + Realtime)
AI              xAI Grok API
Icons           FontAwesome 7
Excel Export    ExcelJS
```

---

## Project Structure

```
src/
├── app/              # App shell, context providers
├── components/       # Reusable UI components
│   ├── common/       # Navigation, modals, overlays
│   └── sections/     # Page sections (TopSection, ListView, etc.)
├── hooks/            # Custom React hooks
├── models/           # Data models
├── notifications/    # Notification handlers
├── services/         # API & business logic services
├── utils/            # Utility functions
└── views/            # Page components
    ├── dashboard/
    ├── mixers/
    ├── tractors/
    ├── operators/
    ├── reports/
    └── ...
```

---

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run build
```

---

## Environment

Requires Supabase project configuration with:

- PostgreSQL database
- Row Level Security policies
- Realtime subscriptions
- Edge functions (optional)

---

## Scripts

| Command                             | Description           |
|-------------------------------------|-----------------------|
| `npm start`                         | Start dev server      |
| `npm run build`                     | Production build      |
| `npm run supabase:start`            | Start local Supabase  |
| `npm run supabase:functions:deploy` | Deploy edge functions |

---

<p align="center">
  <sub>Built for SRM Concrete by Trenton Taylor</sub>
</p>
