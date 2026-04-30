#!/bin/bash
set -e

echo "Starting FreightMatch Monitoring Stack..."

# Create directories if they don't exist
mkdir -p provisioning/dashboards provisioning/datasources

# Start Prometheus and Grafana
docker-compose up -d

echo ""
echo "========================================"
echo "Monitoring stack started!"
echo "========================================"
echo ""
echo "Grafana:     http://localhost:3000"
echo "Prometheus:  http://localhost:9090"
echo ""
echo "Default login:"
echo "  Username: admin"
echo "  Password: admin123"
echo ""
echo "To stop: docker-compose down"
echo "To view logs: docker-compose logs -f"
