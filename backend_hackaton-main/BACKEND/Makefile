# BloomWatch Backend - NASA Space Apps Challenge 2025
# Makefile for common development tasks

.PHONY: help install run test clean setup-db setup-gee docker-build docker-up docker-down

# Default target
help:
	@echo "🌸 BloomWatch Backend - NASA Space Apps Challenge 2025"
	@echo "=================================================="
	@echo ""
	@echo "Available commands:"
	@echo "  install      Install Python dependencies"
	@echo "  setup-db     Set up PostgreSQL database"
	@echo "  setup-gee    Set up Google Earth Engine authentication"
	@echo "  run          Run the development server"
	@echo "  test         Run API tests"
	@echo "  clean        Clean up temporary files"
	@echo "  docker-build Build Docker image"
	@echo "  docker-up    Start services with Docker Compose"
	@echo "  docker-down  Stop Docker services"
	@echo ""

# Install dependencies
install:
	@echo "📦 Installing Python dependencies..."
	pip install --upgrade pip
	pip install -r requirements.txt
	@echo "✅ Dependencies installed"

# Set up database
setup-db:
	@echo "🗄️  Setting up PostgreSQL database..."
	@echo "Please ensure PostgreSQL is running and create the database:"
	@echo "createdb bloomwatch_db"
	@echo "✅ Database setup instructions provided"

# Set up Google Earth Engine
setup-gee:
	@echo "🛰️  Setting up Google Earth Engine..."
	python scripts/setup_gee.py
	@echo "✅ Google Earth Engine setup completed"

# Run development server
run:
	@echo "🚀 Starting BloomWatch API server..."
	python run.py

# Run tests
test:
	@echo "🧪 Running API tests..."
	python scripts/test_api.py

# Clean up
clean:
	@echo "🧹 Cleaning up temporary files..."
	find . -type f -name "*.pyc" -delete
	find . -type d -name "__pycache__" -delete
	find . -type d -name "*.egg-info" -exec rm -rf {} +
	rm -rf build/
	rm -rf dist/
	rm -rf .pytest_cache/
	@echo "✅ Cleanup completed"

# Docker commands
docker-build:
	@echo "🐳 Building Docker image..."
	docker build -t bloomwatch-api .

docker-up:
	@echo "🐳 Starting services with Docker Compose..."
	docker-compose up -d
	@echo "✅ Services started. API available at http://localhost:8000"

docker-down:
	@echo "🐳 Stopping Docker services..."
	docker-compose down
	@echo "✅ Services stopped"

# Development setup
dev-setup: install setup-gee
	@echo "🔧 Development environment setup completed"
	@echo "Run 'make run' to start the server"

# Production setup
prod-setup: docker-build
	@echo "🚀 Production environment ready"
	@echo "Run 'make docker-up' to start services"
