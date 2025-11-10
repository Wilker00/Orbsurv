@echo off
REM Orbsurv Production Deployment Script for Windows
REM This script sets up and deploys the Orbsurv application

setlocal enabledelayedexpansion

echo 🚀 Starting Orbsurv Production Deployment

REM Configuration
set PROJECT_NAME=orbsurv
set BACKEND_DIR=backend
set SITE_DIR=site
set ENV_FILE=backend\.env
set ENV_EXAMPLE=env.production.example

REM Check if Docker is installed
docker --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker is not installed. Please install Docker Desktop first.
    exit /b 1
)

docker-compose --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker Compose is not installed. Please install Docker Desktop first.
    exit /b 1
)

echo ✅ Docker and Docker Compose are installed

REM Check if environment file exists
if not exist "%ENV_FILE%" (
    echo ⚠️  Environment file %ENV_FILE% not found!
    if exist "%ENV_EXAMPLE%" (
        echo ✅ Creating %ENV_FILE% from %ENV_EXAMPLE% template...
        copy "%ENV_EXAMPLE%" "%ENV_FILE%" >nul
        echo ⚠️  Please update %ENV_FILE% with your production values before deploying!
        echo    Press any key to continue or Ctrl+C to abort...
        pause >nul
    ) else (
        echo ❌ Template file %ENV_EXAMPLE% not found!
        exit /b 1
    )
)

echo ✅ Environment file found

REM Generate JWT secret if not set
findstr /C:"your-super-secret-jwt-key-here" "%ENV_FILE%" >nul
if not errorlevel 1 (
    echo ⚠️  WARNING: JWT_SECRET_KEY still has default value!
    echo    Please update JWT_SECRET_KEY in %ENV_FILE% with a secure random string
    echo    You can generate one at: https://generate-secret.vercel.app/32
    echo    Press any key to continue anyway (NOT RECOMMENDED for production)...
    pause
)
findstr /C:"REPLACE_WITH_YOUR_PRODUCTION_JWT_SECRET_KEY" "%ENV_FILE%" >nul
if not errorlevel 1 (
    echo ⚠️  WARNING: JWT_SECRET_KEY still has placeholder value!
    echo    Please update JWT_SECRET_KEY in %ENV_FILE% with a secure random string
    echo    You can generate one at: https://generate-secret.vercel.app/32
    echo    Press any key to continue anyway (NOT RECOMMENDED for production)...
    pause
)

REM Build and start services
echo ✅ Building and starting services...

REM Stop any existing containers
docker-compose down 2>nul

REM Build and start services
docker-compose up --build -d

if errorlevel 1 (
    echo ❌ Failed to start services
    exit /b 1
)

echo ✅ Services started successfully

REM Wait for services to be ready
echo ✅ Waiting for services to be ready...

REM Wait for database
echo Waiting for database...
:wait_db
docker-compose exec -T db pg_isready -U postgres >nul 2>&1
if errorlevel 1 (
    timeout /t 2 >nul
    goto wait_db
)
echo ✅ Database is ready

REM Wait for API
echo Waiting for API...
:wait_api
curl -f http://localhost:8000/api/v1/healthz >nul 2>&1
if errorlevel 1 (
    timeout /t 2 >nul
    goto wait_api
)
echo ✅ API is ready

REM Wait for Nginx
echo Waiting for Nginx...
:wait_nginx
curl -f http://localhost >nul 2>&1
if errorlevel 1 (
    timeout /t 2 >nul
    goto wait_nginx
)
echo ✅ Nginx is ready

REM Run database migrations
echo ✅ Running database migrations...
docker-compose exec -T api alembic upgrade head
if errorlevel 1 (
    echo ❌ Database migrations failed
    exit /b 1
)
echo ✅ Database migrations completed

REM Test the deployment
echo ✅ Testing deployment...

REM Test API health
curl -f http://localhost:8000/api/v1/healthz >nul 2>&1
if errorlevel 1 (
    echo ❌ API health check failed
    exit /b 1
)
echo ✅ API health check passed

REM Test frontend
curl -f http://localhost >nul 2>&1
if errorlevel 1 (
    echo ❌ Frontend is not accessible
    exit /b 1
)
echo ✅ Frontend is accessible

REM Show deployment info
echo.
echo 🎉 Deployment Complete!
echo.
echo ✅ Your Orbsurv application is now running:
echo   Frontend: http://localhost
echo   API: http://localhost:8000
echo   API Docs: http://localhost:8000/api/v1/docs
echo   Admin Panel: http://localhost/admin.html
echo.
echo ⚠️  Next Steps:
echo   1. Update CORS_ALLOW_ORIGINS in %ENV_FILE% with your domain
echo   2. Generate a strong JWT_SECRET_KEY in %ENV_FILE%
echo   3. Configure SSL certificates for HTTPS
echo   4. Set up monitoring and logging
echo   5. Configure email settings for password resets
echo.
echo ⚠️  Useful Commands:
echo   View logs: docker-compose logs -f
echo   Stop services: docker-compose down
echo   Restart services: docker-compose restart
echo   Update deployment: deploy.bat
echo.

pause
