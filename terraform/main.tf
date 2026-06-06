# =============================================================================
# Main - vibecheck-ui Google Cloud Deployment
# =============================================================================
#
# This Terraform configuration deploys the vibecheck-ui Angular application
# to Google Cloud using:
#   - Artifact Registry  → stores the Docker image
#   - Cloud Run          → serves the containerized Nginx + Angular build
#
# Prerequisites:
#   1. A GCP project with billing enabled
#   2. Terraform >= 1.5 installed
#   3. gcloud CLI authenticated (gcloud auth application-default login)
#   4. Docker installed locally for building/pushing images
#
# Usage:
#   cd terraform/
#   terraform init
#   terraform plan  -var="project_id=my-gcp-project"
#   terraform apply -var="project_id=my-gcp-project"
# =============================================================================

terraform {
  required_version = ">= 1.5"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

# -----------------------------------------------------------------------------
# Provider
# -----------------------------------------------------------------------------
provider "google" {
  project = var.project_id
  region  = var.region
}

# -----------------------------------------------------------------------------
# Enable Required APIs
# -----------------------------------------------------------------------------
resource "google_project_service" "run_api" {
  service            = "run.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "artifactregistry_api" {
  service            = "artifactregistry.googleapis.com"
  disable_on_destroy = false
}

# -----------------------------------------------------------------------------
# Artifact Registry Repository
# -----------------------------------------------------------------------------
resource "google_artifact_registry_repository" "vibecheck_ui" {
  location      = var.region
  repository_id = "${var.service_name}-repo"
  description   = "Docker repository for the vibecheck-ui Angular frontend"
  format        = "DOCKER"

  depends_on = [google_project_service.artifactregistry_api]
}

# -----------------------------------------------------------------------------
# Local values
# -----------------------------------------------------------------------------
locals {
  # Full image path in Artifact Registry
  image_uri = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.vibecheck_ui.repository_id}/${var.service_name}:${var.image_tag}"
}

# -----------------------------------------------------------------------------
# Cloud Run Service
# -----------------------------------------------------------------------------
resource "google_cloud_run_v2_service" "vibecheck_ui" {
  name     = var.service_name
  location = var.region

  deletion_protection = false

  template {
    scaling {
      min_instance_count = var.min_instance_count
      max_instance_count = var.max_instance_count
    }

    containers {
      image = local.image_uri

      ports {
        container_port = var.container_port
      }

      resources {
        limits = {
          cpu    = var.cpu
          memory = var.memory
        }
      }

      # Health check — Nginx responds on /
      startup_probe {
        http_get {
          path = "/"
          port = var.container_port
        }
        initial_delay_seconds = 5
        period_seconds        = 10
        failure_threshold     = 3
      }

      liveness_probe {
        http_get {
          path = "/"
          port = var.container_port
        }
        period_seconds = 30
      }
    }
  }

  depends_on = [google_project_service.run_api]
}

# -----------------------------------------------------------------------------
# IAM — Allow unauthenticated (public) access
# -----------------------------------------------------------------------------
resource "google_cloud_run_v2_service_iam_member" "public_access" {
  project  = google_cloud_run_v2_service.vibecheck_ui.project
  location = google_cloud_run_v2_service.vibecheck_ui.location
  name     = google_cloud_run_v2_service.vibecheck_ui.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# -----------------------------------------------------------------------------
# Custom Domain Mapping (optional)
# -----------------------------------------------------------------------------
resource "google_cloud_run_domain_mapping" "custom_domain" {
  count    = var.domain != "" ? 1 : 0
  location = var.region
  name     = var.domain

  metadata {
    namespace = var.project_id
  }

  spec {
    route_name = google_cloud_run_v2_service.vibecheck_ui.name
  }
}
