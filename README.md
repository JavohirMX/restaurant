# 🍽️ Restaurant Management Platform

> A complete, reusable single-restaurant website solution with reservations, content management, and admin dashboard.

---

## 📋 Overview

The Restaurant Management Platform is a full-stack solution designed for individual restaurants seeking a professional web presence. Built with modern technologies, it provides everything needed to showcase your restaurant, manage reservations, and handle content—all in one elegant package.

This platform is **template-based** and designed to be **easily customizable** for any single restaurant, offering a perfect balance of power and simplicity.

---

## ✨ Key Features

### 🌐 Public Website
- **Beautiful Landing Page** - Hero section, featured menu items, testimonials
- **Full Menu Display** - Categorized with descriptions, prices, and dietary info
- **Photo Gallery** - Image processing with thumbnails and WebP optimization
- **Blog/News Section** - Share updates, events, and stories
- **About & Contact Pages** - Tell your story and make it easy to reach you
- **SEO Optimized** - Sitemap, robots.txt, JSON-LD structured data, meta tags

### 📅 Reservation System
- **Guest Booking** - Simple, intuitive reservation form
- **Per-Timeslot Capacity** - Prevent overbooking with configurable limits
- **Hybrid Approval** - Auto-approve or manual review based on your preference
- **Secure Token Management** - Guests can modify/cancel via secure links
- **Email Confirmations** - Automated booking confirmations and reminders

### 🎛️ Admin Dashboard
- **Content Management** - Edit all website content through an intuitive UI
- **Reservation Management** - View, approve, modify, and cancel bookings
- **Settings Control** - Restaurant hours, contact info, social links, SEO settings
- **Media Library** - Upload and manage images with automatic processing
- **Role-Based Access** - Admin, manager, host, and editor permissions

### 🔧 Technical Highlights
- **RESTful API** - Clean separation between frontend and backend
- **JWT Authentication** - Secure, stateless auth for admin users
- **Image Processing** - Automatic resize, compression, thumbnails, WebP conversion
- **Google Analytics 4** - Built-in tracking integration
- **Docker Ready** - One-command local development setup
- **Production Deployed** - Nginx reverse proxy, SSL-ready configuration

---

## 🛠️ Tech Stack

### Backend
- **Python 3.12+**
- **Django 5.0** - Robust web framework
- **Django REST Framework** - Powerful API toolkit
- **PostgreSQL 16** - Primary database
- **Redis** - Caching and session storage
- **JWT** (djangorestframework-simplejwt) - Authentication
- **Pillow** - Image processing
- **django-cors-headers** - CORS handling
- **django-ratelimit** - API rate limiting

### Frontend
- **Next.js 14.2.35** - React framework with SSR/SSG
- **React 18** - UI library
- **TypeScript** - Type safety
- **TailwindCSS** - Utility-first styling
- **React Query** - Server state management
- **Axios** - HTTP client
- **Zod** - Schema validation

### DevOps
- **Docker & Docker Compose** - Containerization
- **Nginx** - Reverse proxy and static file serving
- **PostgreSQL 16** - Database
- **Redis** - Cache layer

---

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Git
- Node.js 18+ (for local frontend dev)
- Python 3.12+ (for local backend dev)

### 1. Clone & Navigate
```bash
git clone <repository-url>
cd restaurant
```

### 2. Environment Setup
```bash
# Copy environment templates
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local

# Edit with your settings
nano backend/.env
nano frontend/.env.local
```

### 3. Start with Docker (Recommended)
```bash
docker-compose up --build
```

### 4. Access the Application
- **Public Website**: http://localhost:3000
- **Admin Dashboard**: http://localhost:3000/admin
- **API**: http://localhost:8000/api/
- **Django Admin**: http://localhost:8000/admin/

---

## 📁 Project Structure

```
restaurant/
├── 📂 backend/              # Django API-only backend
│   ├── 📂 restaurant/       # Core app
│   │   ├── models/          # Restaurant, Settings, Hours, Gallery, Testimonials, Blog
│   │   ├── views/           # API endpoints
│   │   └── serializers/     # DRF serializers
│   ├── 📂 reservations/     # Reservation system
│   │   ├── models.py        # Reservation, TimeSlot, Capacity models
│   │   └── views.py         # Booking endpoints
│   └── 📂 core/             # Base models and utilities
│       ├── models.py        # BaseTimestampModel
│       └── exceptions.py    # Custom exceptions
├── 📂 frontend/             # Next.js 14 frontend
│   ├── 📂 src/app/          # Next.js App Router
│   │   ├── (public)/        # Public website pages
│   │   ├── (admin)/         # Admin dashboard pages
│   │   └── api/             # API routes
│   ├── 📂 src/components/   # React components
│   └── 📂 src/lib/          # Utilities, hooks, types
├── 📂 docs/                 # Documentation
│   ├── 📄 DEPLOYMENT.md     # Production deployment guide
│   ├── 📄 DEVELOPMENT.md    # Development workflow
│   ├── 📄 ARCHITECTURE.md   # System architecture
│   └── 📂 API/
│       └── 📄 CONTRACT.md   # API documentation
├── 📂 nginx/                # Reverse proxy configuration
│   └── 📄 nginx.conf        # Nginx config template
└── 📂 scripts/              # Deployment & backup scripts
    ├── 📄 deploy.sh         # Production deployment
    └── 📄 backup.sh         # Database backup
```

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| 📖 **[API Contract](docs/API/CONTRACT.md)** | Complete API reference, endpoints, request/response formats |
| 🚀 **[Deployment Guide](docs/DEPLOYMENT.md)** | Production setup, SSL, domain configuration |
| 💻 **[Development Guide](docs/DEVELOPMENT.md)** | Local development, testing, debugging |
| 🏗️ **[Architecture](docs/ARCHITECTURE.md)** | System design, data flow, tech decisions |
| 🧪 **[Testing Guide](docs/TESTING.md)** | Test structure, running tests, coverage |
| ⚛️ **[Frontend Docs](docs/FRONTEND.md)** | React components, state management, API integration |
| 🗄️ **[Database Schema](docs/DATABASE.md)** | Entity relationships, table specifications |
| 🔧 **[Troubleshooting](docs/TROUBLESHOOTING.md)** | Common issues and solutions |

---

## ⚙️ Environment Setup

### Backend Environment Variables (`backend/.env`)
```bash
# Database
DATABASE_URL=postgres://user:password@db:5432/restaurant_db

# Django
DJANGO_SECRET_KEY=your-secret-key-here
DJANGO_DEBUG=True
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1

# Email
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password

# Redis
REDIS_URL=redis://redis:6379/0

# JWT
ACCESS_TOKEN_LIFETIME=15
REFRESH_TOKEN_LIFETIME=1440
```

### Frontend Environment Variables (`frontend/.env.local`)
```bash
# API
NEXT_PUBLIC_API_URL=http://localhost:8000/api
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000

# Auth
JWT_SECRET=your-jwt-secret

# Analytics
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🆘 Support

- 📧 **Email**: support@yourrestaurant.com
- 🐛 **Issues**: [GitHub Issues](https://github.com/yourusername/restaurant/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/yourusername/restaurant/discussions)

---

<div align="center">

**[⬆ Back to Top](#-restaurant-management-platform)**

Built with ❤️ for restaurants everywhere

</div>
