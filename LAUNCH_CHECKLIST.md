# 🚀 Orbsurv Launch Checklist

Quick reference guide for launching the Orbsurv website to production.

## ✅ Pre-Launch Checklist

### 1. Environment Configuration (REQUIRED)

**Create `backend/.env` file:**
```bash
cp env.production.example backend/.env
```

**Update these critical values in `backend/.env`:**

- [ ] **JWT_SECRET_KEY** - Generate a strong 32+ character key
  - Use: https://generate-secret.vercel.app/32
  - Example: `JWT_SECRET_KEY=your-super-secret-key-here-at-least-32-characters-long`

- [ ] **DATABASE_URL** - Your production PostgreSQL connection
  - Format: `postgresql+asyncpg://username:password@host:5432/database`
  - Use SSL in production: `?sslmode=require`

- [ ] **CORS_ALLOW_ORIGINS** - Your production domain(s)
  - Remove `localhost` entries
  - Add your actual domain: `https://yourdomain.com,https://www.yourdomain.com`

- [ ] **ENV=production** - Set to production mode

- [ ] **DEV_MASTER_OTP** - Change from default "000000"
  - Generate a secure OTP for dev access

- [ ] **DOCS_URL=""** and **REDOC_URL=""** - Disable API docs in production

- [ ] **FRONTEND_BASE_URL** - Your production frontend URL
  - Example: `https://yourdomain.com`

### 2. Frontend API Configuration

**Set Production API Base URL:**

The frontend automatically detects the API base URL. For production, you have two options:

**Option A: Meta Tag (Recommended)**
Update the meta tag in all HTML pages:
```html
<meta name="orbsurv-api-base" content="https://api.yourdomain.com">
```

**Option B: Server-Side Injection**
If using a build process, inject the API URL via environment variable:
```html
<meta name="orbsurv-api-base" content="{{API_BASE_URL}}">
```

**Option C: Nginx Configuration**
Set via HTTP header (if using reverse proxy):
```nginx
add_header X-API-Base "https://api.yourdomain.com";
```

The frontend will automatically use the correct API URL based on:
1. Meta tag `orbsurv-api-base`
2. Window variable `window.ORBSURV_API_BASE`
3. Auto-detection from current domain
4. Fallback to `localhost:8000` (development only)

### 3. Database Setup

- [ ] PostgreSQL database created
- [ ] Database migrations run: `alembic upgrade head`
- [ ] Database backups configured
- [ ] Strong database password set

### 4. Security Checklist

- [ ] Strong JWT secret generated (32+ characters)
- [ ] Database uses strong password
- [ ] CORS origins updated (no wildcards)
- [ ] API docs disabled (`DOCS_URL=""`)
- [ ] Default OTP changed from "000000"
- [ ] SSL/HTTPS certificates obtained
- [ ] Security headers configured in nginx

### 5. Email Configuration (Recommended)

For password resets and order confirmations:

- [ ] **EMAIL_HOST** - SMTP server
- [ ] **EMAIL_PORT** - Usually 587
- [ ] **EMAIL_USER** - SMTP username
- [ ] **EMAIL_PASS** - SMTP password
- [ ] **EMAIL_FROM** - Sender address
- [ ] Test email delivery

### 6. Testing Before Launch

**Critical User Flows:**
- [ ] Homepage loads correctly
- [ ] User can sign up
- [ ] User can log in
- [ ] User can view pricing
- [ ] User can add items to cart
- [ ] User can complete checkout
- [ ] Order confirmation email received (if email configured)
- [ ] Password reset works (if email configured)
- [ ] Forms submit correctly
- [ ] API health check: `/api/v1/healthz`

**Mobile Testing:**
- [ ] Site is responsive on mobile
- [ ] Forms work on mobile
- [ ] Navigation works on mobile
- [ ] Hotspot interactions work on touch devices

### 7. Deployment Steps

**Quick Deploy:**
```bash
# Linux/Mac
chmod +x deploy.sh
./deploy.sh

# Windows
deploy.bat
```

**Manual Deploy:**
```bash
# 1. Build and start services
docker-compose up --build -d

# 2. Wait for services to be ready
docker-compose logs -f

# 3. Run database migrations
docker-compose exec api alembic upgrade head

# 4. Create admin user (if needed)
docker-compose exec api python create_admin.py
```

### 8. Post-Deployment Verification

- [ ] Frontend loads at your domain
- [ ] API health check returns 200: `curl https://yourdomain.com/api/v1/healthz`
- [ ] User registration works
- [ ] User login works
- [ ] Cart and checkout work
- [ ] No errors in browser console
- [ ] No errors in server logs
- [ ] SSL certificate valid
- [ ] All forms submit successfully

### 9. Monitoring Setup (Recommended)

- [ ] Error logging configured (Sentry or similar)
- [ ] Health check monitoring
- [ ] Database backup verification
- [ ] Log rotation configured
- [ ] Uptime monitoring

## 🔧 Quick Configuration Reference

### Setting Production API URL

**Method 1: Update Meta Tags**
Find and replace in all HTML files:
```html
<meta name="orbsurv-api-base" content="">
```
With:
```html
<meta name="orbsurv-api-base" content="https://api.yourdomain.com">
```

**Method 2: Build Script**
If using a build process, inject via template:
```html
<meta name="orbsurv-api-base" content="{{API_BASE_URL}}">
```

**Method 3: Nginx Header**
Add to nginx.conf:
```nginx
add_header X-API-Base "https://api.yourdomain.com" always;
```

### Environment Variables Quick Reference

```bash
# Required
JWT_SECRET_KEY=your-32-plus-character-secret-key
DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/db
CORS_ALLOW_ORIGINS=https://yourdomain.com
ENV=production
DEV_MASTER_OTP=your-secure-otp

# Recommended
EMAIL_HOST=smtp.your-provider.com
EMAIL_PORT=587
EMAIL_USER=your-email
EMAIL_PASS=your-password
EMAIL_FROM="Orbsurv" <noreply@yourdomain.com>
FRONTEND_BASE_URL=https://yourdomain.com

# Security
DOCS_URL=
REDOC_URL=
LOG_LEVEL=WARNING
```

## 🚨 Common Issues

### API Not Connecting
- Check `CORS_ALLOW_ORIGINS` includes your frontend domain
- Verify API base URL meta tag is set correctly
- Check browser console for CORS errors

### Database Connection Errors
- Verify `DATABASE_URL` is correct
- Check database is accessible from server
- Verify SSL mode if using SSL

### Forms Not Submitting
- Check API base URL configuration
- Verify CORS settings
- Check browser console for errors
- Verify captcha configuration (if enabled)

## 📞 Next Steps After Launch

1. Monitor error logs for first 24 hours
2. Test all critical user flows
3. Set up automated backups
4. Configure monitoring alerts
5. Review security logs
6. Plan for scaling if needed

---

**Last Updated:** 2024
**Version:** 1.0.0

