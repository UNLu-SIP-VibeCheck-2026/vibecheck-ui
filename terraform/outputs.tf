# =============================================================================
# Outputs - vibecheck-ui Terraform Configuration
# =============================================================================

output "service_url" {
  description = "The URL of the deployed Cloud Run service."
  value       = google_cloud_run_v2_service.vibecheck_ui.uri
}

output "service_name" {
  description = "The name of the Cloud Run service."
  value       = google_cloud_run_v2_service.vibecheck_ui.name
}

output "artifact_registry_repository" {
  description = "The full path of the Artifact Registry repository."
  value       = google_artifact_registry_repository.vibecheck_ui.id
}

output "image_uri" {
  description = "The full URI of the container image to build and push."
  value       = local.image_uri
}

output "docker_push_command" {
  description = "The command to build and push the Docker image to Artifact Registry."
  value       = <<-EOT
    # 1. Configure Docker to authenticate with Artifact Registry:
    gcloud auth configure-docker ${var.region}-docker.pkg.dev

    # 2. Build the image (from the project root, NOT the terraform/ folder):
    docker build -t ${local.image_uri} --target prod ..

    # 3. Push the image:
    docker push ${local.image_uri}
  EOT
}
