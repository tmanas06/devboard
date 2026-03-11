#!/bin/bash
# Deployment script for Production environment
# This script sets up infrastructure and deploys time-entry backend to production environment

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Default values for prod environment
PROJECT_NAME="time-entry"
ENVIRONMENT="prod"
PROFILE="${AWS_PROFILE:-namaste}"
REGION="${AWS_REGION:-us-west-2}"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --profile)
            PROFILE="$2"
            shift 2
            ;;
        --region)
            REGION="$2"
            shift 2
            ;;
        --env-file)
            ENV_FILE="$2"
            shift 2
            ;;
        --skip-common)
            SKIP_COMMON=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Deploy time-entry backend to PRODUCTION environment"
            echo ""
            echo "⚠️  WARNING: This will deploy to PRODUCTION!"
            echo ""
            echo "Options:"
            echo "  --profile PROFILE    AWS profile (default: namaste)"
            echo "  --region REGION      AWS region (default: us-west-2)"
            echo "  --env-file FILE     Path to environment variables file"
            echo "  --skip-common       Skip common setup (IAM, VPC, Security Groups)"
            echo "  --dry-run           Show what would be created without creating"
            echo "  --help              Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Safety check for production deployments
if [ "${DRY_RUN:-false}" != "true" ]; then
    echo "⚠️  WARNING: You are about to deploy to PRODUCTION!"
    echo "Environment: $ENVIRONMENT"
    echo "Profile: $PROFILE"
    echo "Region: $REGION"
    echo ""
    read -p "Are you sure you want to continue? (type 'yes' to confirm): " CONFIRM
    if [ "$CONFIRM" != "yes" ]; then
        echo "Deployment cancelled."
        exit 1
    fi
fi

export PROJECT_NAME ENVIRONMENT PROFILE REGION

# Run the setup script
"$SCRIPT_DIR/setup-environment.sh" \
    --project-name "$PROJECT_NAME" \
    --environment "$ENVIRONMENT" \
    --profile "$PROFILE" \
    --region "$REGION" \
    ${ENV_FILE:+--env-file "$ENV_FILE"} \
    ${SKIP_COMMON:+--skip-common} \
    ${DRY_RUN:+--dry-run}

