# Terraform — Deploy vibecheck-ui to Google Cloud

This directory contains the Terraform configuration to deploy the **vibecheck-ui** Angular frontend to **Google Cloud Run** using **Artifact Registry** for container image storage.

## Architecture

```
┌────────────────────┐       ┌──────────────────────┐
│  Artifact Registry │       │     Cloud Run         │
│  (Docker images)   │──────▶│  Nginx + Angular SPA  │──▶ Public URL
└────────────────────┘       └──────────────────────┘
```

The existing multi-stage `Dockerfile` is used as-is:
1. **Build stage** — installs dependencies and compiles the Angular app for production
2. **Serve stage** — copies the build output into an Nginx image with SPA fallback routing

## Prerequisites

| Tool | Minimum version |
|------|----------------|
| Terraform | >= 1.5 |
| gcloud CLI | Latest |
| Docker | Latest |

You also need:
- A GCP project with **billing enabled**
- Authenticated gcloud session: `gcloud auth application-default login`

## Quick Start

```bash
# 1. Navigate to the terraform directory
cd terraform/

# 2. Create your variables file
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your GCP project ID

# 3. Initialize Terraform
terraform init

# 4. Preview the plan
terraform plan

# 5. Apply the infrastructure
terraform apply

# 6. Build and push the Docker image (from the project root)
cd ..
gcloud auth configure-docker <REGION>-docker.pkg.dev
docker build -t <IMAGE_URI from terraform output> --target prod .
docker push <IMAGE_URI from terraform output>

# 7. Deploy the new image to Cloud Run
cd terraform/
terraform apply
```

> **Tip:** After the first `terraform apply`, run `terraform output docker_push_command` to get the exact build & push commands with your image URI filled in.

## Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `project_id` | GCP project ID | *(required)* |
| `region` | GCP region | `us-central1` |
| `service_name` | Cloud Run service name | `vibecheck-ui` |
| `image_tag` | Docker image tag | `latest` |
| `api_backend_url` | Backend API URL | `https://vibecheck-core.up.railway.app` |
| `container_port` | Nginx listen port | `80` |
| `min_instance_count` | Min autoscale instances | `0` |
| `max_instance_count` | Max autoscale instances | `3` |
| `cpu` | CPU per instance | `1` |
| `memory` | Memory per instance | `256Mi` |
| `domain` | Custom domain (optional) | `""` |

## Outputs

| Output | Description |
|--------|-------------|
| `service_url` | Public URL of the deployed Cloud Run service |
| `image_uri` | Full container image URI for docker build/push |
| `docker_push_command` | Ready-to-use build & push commands |

## Destroying Resources

```bash
terraform destroy -var="project_id=my-gcp-project"
```
