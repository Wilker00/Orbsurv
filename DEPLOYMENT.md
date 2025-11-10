# 🚀 Orbsurv Production Deployment - Quick Start Guide

## Prerequisites
- Docker and Docker Compose installed
- Basic command line knowledge
- Domain name (for production)

## 🏃‍♂️ Quick Start (5 minutes)

### 1. Clone and Setup
```bash
# If you haven't already
git clone <your-repo-url>
cd Orbsurv

# Copy environment template
cp env.example backend/.env
```

### 2. Configure Environment
Edit `backend/.env` and update these critical values:
```bash
# Generate a secure JWT secret (32+ characters)
JWT_SECRET_KEY=your-super-secret-jwt-key-here-make-it-long-and-random

# Update with your domain (for production)
CORS_ALLOW_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Configure SMTP so password reset + contact acknowledgements work
EMAIL_HOST=smtp.your-provider.com
EMAIL_PORT=587
EMAIL_USER=your-smtp-username
EMAIL_PASS=your-smtp-password
EMAIL_FROM="Orbsurv" <noreply@yourdomain.com>
```

### 3. Deploy
```bash
# Linux/Mac
chmod +x deploy.sh
./deploy.sh

# Windows
deploy.bat
```

### 4. Access Your Application
- **Frontend**: http://localhost
- **API**: http://localhost:8000
- **API Docs**: http://localhost:8000/api/v1/docs
- **Admin Panel**: http://localhost/admin.html

## 🔧 Manual Deployment

If you prefer manual setup:

```bash
# 1. Start services
docker-compose up --build -d

# 2. Wait for services to be ready
docker-compose logs -f

# 3. Run database migrations
docker-compose exec api alembic upgrade head

# 4. Test the deployment
curl http://localhost:8000/api/v1/healthz
curl http://localhost
```

## 🌐 Production Deployment

### Option A: Cloud Platform (Recommended)
1. **Backend**: Deploy to Railway, Render, or DigitalOcean App Platform
2. **Database**: Use managed PostgreSQL (Railway, Supabase, AWS RDS)
3. **Frontend**: Deploy static files to Vercel, Netlify, or Cloudflare Pages
4. **Redis**: Use managed Redis (Redis Cloud, AWS ElastiCache)

### Option B: VPS Deployment
1. **Server**: Ubuntu 20.04+ VPS
2. **Install**: Docker, Docker Compose, Nginx
3. **Configure**: SSL certificates, domain, firewall
4. **Deploy**: Use the provided scripts

### Option C: Docker Compose (Current Setup)
1. **Update**: `env.production.example` → `backend/.env`
2. **Configure**: Production database, Redis, domain
3. **Deploy**: Run deployment script
4. **SSL**: Configure Let's Encrypt certificates

## 🔒 Security Checklist

- [ ] Strong JWT secret key (32+ characters)
- [ ] Production database with SSL
- [ ] CORS origins updated to your domain
- [ ] SSL certificates installed
- [ ] Firewall configured (ports 80, 443 only)
- [ ] Regular security updates
- [ ] Monitoring and logging enabled

## 📊 Monitoring

### Health Checks
- API: `http://yourdomain.com/api/v1/healthz`
- Database: `docker-compose exec db pg_isready -U postgres`
- Redis: `docker-compose exec redis redis-cli ping`

### Logs
```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f api
docker-compose logs -f nginx
```

## 🛠️ Troubleshooting

### Common Issues

**1. Services won't start**
```bash
# Check logs
docker-compose logs

# Restart services
docker-compose restart
```

**2. Database connection errors**
```bash
# Check database status
docker-compose exec db pg_isready -U postgres

# Reset database
docker-compose down
docker volume rm orbsurv_postgres_data
docker-compose up --build -d
```

**3. API not responding**
```bash
# Check API health
curl http://localhost:8000/api/v1/healthz

# Check API logs
docker-compose logs api
```

**4. Frontend not loading**
```bash
# Check Nginx logs
docker-compose logs nginx

# Verify static files
ls -la site/
```

### Performance Optimization

**1. Enable Gzip Compression** (Already configured in nginx.conf)
**2. Set up CDN** for static assets
**3. Configure Redis caching**
**4. Enable database connection pooling**

## 📞 Support

If you encounter issues:
1. Check the logs: `docker-compose logs -f`
2. Verify environment variables in `backend/.env`
3. Ensure all services are running: `docker-compose ps`
4. Test individual components: API, database, frontend

## 🎯 Next Steps

1. **Configure Email**: Set up SMTP so password resets and public form acknowledgements send reliably
2. **Set up Monitoring**: Add application monitoring
3. **Backup Strategy**: Configure database backups
4. **Scaling**: Plan for horizontal scaling if needed
5. **Security**: Regular security audits and updates

---

**Your Orbsurv application is now production-ready! 🎉**
