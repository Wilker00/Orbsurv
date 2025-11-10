#!/bin/bash

# Orbsurv Production Deployment Script
# This script sets up and deploys the Orbsurv application

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="orbsurv"
BACKEND_DIR="backend"
SITE_DIR="site"
ENV_FILE="backend/.env"
ENV_EXAMPLE="env.production.example"

echo -e "${BLUE}🚀 Starting Orbsurv Production Deployment${NC}"

# Function to print status
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if Docker is installed
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    print_status "Docker and Docker Compose are installed"
}

# Check if environment file exists
check_env() {
    if [ ! -f "$ENV_FILE" ]; then
        print_warning "Environment file $ENV_FILE not found!"
        if [ -f "$ENV_EXAMPLE" ]; then
            print_status "Creating $ENV_FILE from $ENV_EXAMPLE template..."
            cp "$ENV_EXAMPLE" "$ENV_FILE"
            print_warning "Please update $ENV_FILE with your production values before deploying!"
            print_warning "Press Enter to continue or Ctrl+C to abort..."
            read -r
        else
            print_error "Template file $ENV_EXAMPLE not found!"
            exit 1
        fi
    fi
    
    print_status "Environment file found"
}

# Generate JWT secret if not set
generate_jwt_secret() {
    if grep -q "your-super-secret-jwt-key-here" "$ENV_FILE"; then
        print_warning "Generating new JWT secret key..."
        JWT_SECRET=$(openssl rand -base64 32)
        sed -i.bak "s/your-super-secret-jwt-key-here-make-it-long-and-random-at-least-32-characters/$JWT_SECRET/" "$ENV_FILE"
        print_status "JWT secret key generated"
    fi
}

# Build and start services
deploy_services() {
    print_status "Building and starting services..."
    
    # Stop any existing containers
    docker-compose down 2>/dev/null || true
    
    # Build and start services
    docker-compose up --build -d
    
    print_status "Services started successfully"
}

# Wait for services to be ready
wait_for_services() {
    print_status "Waiting for services to be ready..."
    
    # Wait for database
    echo "Waiting for database..."
    timeout 60 bash -c 'until docker-compose exec -T db pg_isready -U postgres; do sleep 2; done'
    print_status "Database is ready"
    
    # Wait for API
    echo "Waiting for API..."
    timeout 60 bash -c 'until curl -f http://localhost:8000/api/v1/healthz >/dev/null 2>&1; do sleep 2; done'
    print_status "API is ready"
    
    # Wait for Nginx
    echo "Waiting for Nginx..."
    timeout 30 bash -c 'until curl -f http://localhost >/dev/null 2>&1; do sleep 2; done'
    print_status "Nginx is ready"
}

# Run database migrations
run_migrations() {
    print_status "Running database migrations..."
    docker-compose exec -T api alembic upgrade head
    print_status "Database migrations completed"
}

# Test the deployment
test_deployment() {
    print_status "Testing deployment..."
    
    # Test API health
    if curl -f http://localhost:8000/api/v1/healthz >/dev/null 2>&1; then
        print_status "API health check passed"
    else
        print_error "API health check failed"
        return 1
    fi
    
    # Test frontend
    if curl -f http://localhost >/dev/null 2>&1; then
        print_status "Frontend is accessible"
    else
        print_error "Frontend is not accessible"
        return 1
    fi
    
    # Test form submission
    if curl -X POST http://localhost:8000/api/v1/waitlist \
        -H "Content-Type: application/json" \
        -d '{"email":"test@example.com"}' >/dev/null 2>&1; then
        print_status "Form submission test passed"
    else
        print_warning "Form submission test failed (this might be expected)"
    fi
}

# Show deployment info
show_info() {
    echo ""
    echo -e "${BLUE}🎉 Deployment Complete!${NC}"
    echo ""
    echo -e "${GREEN}Your Orbsurv application is now running:${NC}"
    echo -e "  Frontend: ${BLUE}http://localhost${NC}"
    echo -e "  API: ${BLUE}http://localhost:8000${NC}"
    echo -e "  API Docs: ${BLUE}http://localhost:8000/api/v1/docs${NC}"
    echo -e "  Admin Panel: ${BLUE}http://localhost/admin.html${NC}"
    echo ""
    echo -e "${YELLOW}Next Steps:${NC}"
    echo "  1. Update CORS_ALLOW_ORIGINS in $ENV_FILE with your domain"
    echo "  2. Generate a strong JWT_SECRET_KEY in $ENV_FILE"
    echo "  3. Configure SSL certificates for HTTPS"
    echo "  4. Set up monitoring and logging"
    echo "  5. Configure email settings for password resets"
    echo ""
    echo -e "${YELLOW}Useful Commands:${NC}"
    echo "  View logs: docker-compose logs -f"
    echo "  Stop services: docker-compose down"
    echo "  Restart services: docker-compose restart"
    echo "  Update deployment: ./deploy.sh"
}

# Main deployment function
main() {
    check_docker
    check_env
    generate_jwt_secret
    deploy_services
    wait_for_services
    run_migrations
    test_deployment
    show_info
}

# Run main function
main "$@"
