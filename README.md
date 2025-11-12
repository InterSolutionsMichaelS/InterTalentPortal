# InterTalent Portal

A public-facing talent showcase platform for InterSolutions, allowing clients to browse and request top-tier professional talent across multiple industries.

## 🎯 Project Overview

**Client:** InterSolutions  
**Timeline:** 3 weeks (Nov 12 - Dec 2, 2025)  
**Type:** MVP Production Application

### Features

- 🔍 **Advanced Search** - Search by profession type, location, and keywords
- 📊 **Real-time Data Sync** - Automated updates from CSV exports every 2 hours
- 📧 **Request System** - Email routing to regional distribution lists
- ♿ **Accessible** - WCAG 2.1 AA compliant
- 📱 **Responsive** - Mobile-first design
- 📈 **Analytics** - Google Analytics 4 tracking

## 🛠️ Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS 4
- **Database:** PostgreSQL (Supabase)
- **Hosting:** Vercel
- **Email:** SendGrid
- **Analytics:** Google Analytics 4

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Git

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local
# Then fill in your values in .env.local

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

### Environment Variables

Required environment variables (see `.env.local`):

```bash
# Database
DATABASE_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Email
SENDGRID_API_KEY=
SENDGRID_FROM_EMAIL=

# Analytics
NEXT_PUBLIC_GA_MEASUREMENT_ID=

# CSV Data Source
CSV_SOURCE_TYPE=azure_blob
AZURE_STORAGE_CONNECTION_STRING=
```

## 📁 Project Structure

```
src/
├── app/                 # Next.js App Router pages
│   ├── api/            # API routes
│   └── ...
├── components/         # React components
│   ├── ui/            # Reusable UI components
│   └── layout/        # Layout components
├── lib/               # Business logic
│   ├── db/           # Database queries
│   ├── data/         # CSV parsing
│   ├── email/        # Email sending
│   └── sync/         # Data synchronization
├── types/            # TypeScript type definitions
└── utils/            # Helper functions
```

## 📝 Development Workflow

### Branches

- `main` - Production-ready code
- `develop` - Active development branch
- Feature branches as needed

### Daily Development

```bash
# Make sure you're on develop branch
git checkout develop

# Pull latest changes
git pull origin develop

# Create feature branch (optional)
git checkout -b feature/your-feature

# Make changes, commit frequently
git add .
git commit -m "Description of changes"

# Push at end of day
git push origin develop
```

## 🧪 Testing

```bash
# Run linter
npm run lint

# Type check
npx tsc --noEmit

# Format code
npx prettier --write .
```

## 📦 Build & Deploy

```bash
# Build for production
npm run build

# Start production server (local)
npm run start
```

**Deployment:** Automatic via Vercel on push to `main` branch.

## 📚 Additional Documentation

- [Technical Architecture](../project-Talent_Showcase_Tool/02-technical-design/ARCHITECTURE.md)
- [Development Plan](../project-Talent_Showcase_Tool/00-planning/MASTER_PLAN.md)
- [Daily Checklists](../project-Talent_Showcase_Tool/00-planning/daily-checklists/)

## 🤝 Contributing

This is a client project. All development follows the 21-day implementation plan.

## 📄 License

Proprietary - InterSolutions Client Project

---

**Last Updated:** November 12, 2025  
**Developer:** Ray Parker  
**Status:** In Development (Day 1)
