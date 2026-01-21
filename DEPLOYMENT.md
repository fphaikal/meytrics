# Deploying MEYTRICS to Docker Hub

This guide explains how to build and push the MEYTRICS Docker image to Docker Hub.

## 1. Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running.
- A [Docker Hub](https://hub.docker.com/) account.

## 2. Login to Docker Hub

Open your terminal or command prompt and run:

```bash
docker login
```

Enter your Docker Hub username and password when prompted.

## 3. Build the Image

Run the following command to build the image. Replace `your-username` with your actual Docker Hub username.

```bash
# Template: docker build -t <username>/<repository>:<tag> .
docker build -t your-username/meytrics:latest .
```

*Example:*
`docker build -t fahreza/meytrics:latest .`

## 4. Push to Docker Hub

Once the build is complete, upload the image to Docker Hub:

```bash
docker push your-username/meytrics:latest
```

## Method 2: GitHub Actions (Recommended - No Docker Desktop required)

If you don't want to install Docker Desktop, you can let GitHub build the image for you.

1.  **Push your code** to a GitHub repository.
2.  Go to your repository **Settings** > **Secrets and variables** > **Actions**.
3.  Add two **New repository secrets**:
    -   `DOCKERHUB_USERNAME`: Your Docker Hub username.
    -   `DOCKERHUB_TOKEN`: Your Docker Hub Access Token (Get it from Docker Hub Account Settings > Security).
4.  Once set, every time you push to the `main` branch, GitHub will automatically build and push your image to Docker Hub!

## Method 3: Official Release (Advanced)

To create a proper release (e.g., v1.0.0) with changelogs and publish to both Docker Hub and GitHub Container Registry:

1.  **Update Version**: `npm version patch` (or minor/major).
2.  **Push Tags**: `git push --follow-tags`
3.  **Result**:
    -   A new **Release** will be created on GitHub with automatic release notes.
    -   Images will be pushed to Docker Hub and GHCR with the specific version tag (e.g., `v1.0.0`) and `latest`.

## Sharing with Others

Users can now pull and run your application using only `docker-compose.yml` (without needing the source code).

**Create a `docker-compose.yml` for users:**

```yaml
services:
  meytrics:
    image: your-username/meytrics:latest  # <--- CHANGED from 'build: .'
    container_name: meytrics
    restart: unless-stopped
    ports:
      - "3000:3000"
    volumes:
      - meytrics-data:/data
    environment:
      - NODE_ENV=production
      - UPLOAD_LIMIT_MB=5
      # Change this!
      - JWT_SECRET=change-this-secret-in-production
      # Optional: SMTP Settings
      # - SMTP_HOST=smtp.gmail.com
      # - SMTP_PORT=587
      # - SMTP_USER=your@email.com
      # - SMTP_PASS=app-password

volumes:
  meytrics-data:
    driver: local
```
