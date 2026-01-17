# Docker Bake configuration for multi-platform builds
# Usage: docker buildx bake [target]

variable "REGISTRY" {
  default = "{{DOCKER_REGISTRY}}"
}

variable "IMAGE_NAME" {
  default = "{{APP_NAME}}"
}

variable "TAG" {
  default = "latest"
}

variable "PLATFORMS" {
  default = ["linux/amd64", "linux/arm64"]
}

# Common settings for all targets
group "default" {
  targets = ["bot", "api", "dashboard"]
}

group "all" {
  targets = ["base", "bot", "api", "dashboard"]
}

# Base image with commons
target "base" {
  dockerfile = "Dockerfile.base"
  context    = "."
  tags       = ["${REGISTRY}/${IMAGE_NAME}-base:${TAG}"]
  platforms  = PLATFORMS
  cache-from = ["type=registry,ref=${REGISTRY}/${IMAGE_NAME}-base:cache"]
  cache-to   = ["type=registry,ref=${REGISTRY}/${IMAGE_NAME}-base:cache,mode=max"]
}

# Discord bot service
target "bot" {
  dockerfile = "Dockerfile"
  context    = "."
  tags       = [
    "${REGISTRY}/${IMAGE_NAME}:${TAG}",
    "${REGISTRY}/${IMAGE_NAME}-bot:${TAG}"
  ]
  platforms  = PLATFORMS
  cache-from = ["type=registry,ref=${REGISTRY}/${IMAGE_NAME}:cache"]
  cache-to   = ["type=registry,ref=${REGISTRY}/${IMAGE_NAME}:cache,mode=max"]
}

# API service
target "api" {
  dockerfile = "api-service/Dockerfile"
  context    = "."
  tags       = ["${REGISTRY}/${IMAGE_NAME}-api:${TAG}"]
  platforms  = PLATFORMS
  cache-from = ["type=registry,ref=${REGISTRY}/${IMAGE_NAME}-api:cache"]
  cache-to   = ["type=registry,ref=${REGISTRY}/${IMAGE_NAME}-api:cache,mode=max"]
}

# Dashboard
target "dashboard" {
  dockerfile = "dashboard/Dockerfile"
  context    = "."
  tags       = ["${REGISTRY}/${IMAGE_NAME}-dashboard:${TAG}"]
  platforms  = PLATFORMS
  cache-from = ["type=registry,ref=${REGISTRY}/${IMAGE_NAME}-dashboard:cache"]
  cache-to   = ["type=registry,ref=${REGISTRY}/${IMAGE_NAME}-dashboard:cache,mode=max"]
}

# Local development builds (single platform)
target "bot-local" {
  inherits  = ["bot"]
  platforms = []
  tags      = ["${IMAGE_NAME}:local"]
  output    = ["type=docker"]
}

target "api-local" {
  inherits  = ["api"]
  platforms = []
  tags      = ["${IMAGE_NAME}-api:local"]
  output    = ["type=docker"]
}

target "dashboard-local" {
  inherits  = ["dashboard"]
  platforms = []
  tags      = ["${IMAGE_NAME}-dashboard:local"]
  output    = ["type=docker"]
}