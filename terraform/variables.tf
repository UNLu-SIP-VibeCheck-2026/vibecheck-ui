# =============================================================================
# Variables - vibecheck-ui Terraform Configuration
# =============================================================================

variable "project_id" {
  description = "The GCP project ID where resources will be created."
  type        = string
}

variable "region" {
  description = "The GCP region for deploying resources."
  type        = string
  default     = "us-central1"
}

variable "service_name" {
  description = "The name of the Cloud Run service."
  type        = string
  default     = "vibecheck-ui"
}

variable "image_tag" {
  description = "The tag for the container image (e.g. 'latest', 'v1.0.0', a commit SHA)."
  type        = string
  default     = "latest"
}

variable "api_backend_url" {
  description = "The full URL of the vibecheck-core backend API (e.g. https://vibecheck-core-xxxxx.run.app)."
  type        = string
  default     = "https://vibecheck-core.up.railway.app"
}

variable "container_port" {
  description = "The port the Nginx container listens on."
  type        = number
  default     = 80
}

variable "max_instance_count" {
  description = "Maximum number of Cloud Run instances for autoscaling."
  type        = number
  default     = 3
}

variable "min_instance_count" {
  description = "Minimum number of Cloud Run instances (0 allows scale-to-zero)."
  type        = number
  default     = 0
}

variable "cpu" {
  description = "CPU allocation per Cloud Run instance (e.g. '1', '2')."
  type        = string
  default     = "1"
}

variable "memory" {
  description = "Memory allocation per Cloud Run instance (e.g. '256Mi', '512Mi')."
  type        = string
  default     = "256Mi"
}

variable "domain" {
  description = "Optional custom domain to map to the Cloud Run service. Leave empty to skip domain mapping."
  type        = string
  default     = ""
}
