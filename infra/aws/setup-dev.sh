#!/bin/bash
# Deployment script for Development environment
# This script sets up infrastructure and deploys time-entry backend to dev environment

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Default values for dev environment
PROJECT_NAME="time-entry"
ENVIRONMENT="dev"
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
            echo "Deploy time-entry backend to DEV environment"
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

