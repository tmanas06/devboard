#!/bin/bash
# Environment-specific configuration module
# This module provides environment-specific resource configurations

# Initialize environment-specific configurations
init_env_config() {
    case "$ENVIRONMENT" in
        dev)
            # Development environment - minimal resources
            export TASK_CPU="256"
            export TASK_MEMORY="512"
            export DESIRED_COUNT="1"
            export NODE_ENV="development"
            export CORS_ORIGINS_DEFAULT="http://localhost:3000,http://localhost:3001"
            ;;
        test)
            # Test/Staging environment - moderate resources
            export TASK_CPU="256"
            export TASK_MEMORY="512"
            export DESIRED_COUNT="1"
            export NODE_ENV="test"
            export CORS_ORIGINS_DEFAULT="http://localhost:3000,http://localhost:3001,https://test.time-entry.example.com"
            ;;
        prod)
            # Production environment - higher resources for performance
            export TASK_CPU="256"
            export TASK_MEMORY="512"
            export DESIRED_COUNT="1"  # High availability with multiple tasks
            export NODE_ENV="production"
            export CORS_ORIGINS_DEFAULT="https://time-entry.example.com,https://www.time-entry.example.com"
            ;;
        *)
            log_warning "Unknown environment '$ENVIRONMENT', using dev defaults"
            export TASK_CPU="256"
            export TASK_MEMORY="512"
            export DESIRED_COUNT="1"
            export NODE_ENV="development"
            export CORS_ORIGINS_DEFAULT="http://localhost:3000"
            ;;
    esac
    
    log "Environment-specific configuration:"
    log "  CPU: $TASK_CPU"
    log "  Memory: $TASK_MEMORY MB"
    log "  Desired Count: $DESIRED_COUNT"
    log "  NODE_ENV: $NODE_ENV"
}

