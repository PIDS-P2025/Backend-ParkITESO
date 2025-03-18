#!/bin/bash
# setup.sh - Installs dependencies for all service directories

echo "Starting installation for all services"

# List of all service directories
SERVICES=("Example" "OAuth" "parking_zones" "userLocation" "userProfile")

# Loop through each service and install dependencies
for service in "${SERVICES[@]}"; do
  echo "Installing dependencies for $service"
  cd $service && npm install && cd ..
  
  # Check if installation was successful
  if [ $? -ne 0 ]; then
    echo "Failed to install dependencies for $service"
    exit 1
  fi
done

echo "All dependencies installed successfully"
