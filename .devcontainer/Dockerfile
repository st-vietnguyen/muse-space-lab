FROM mcr.microsoft.com/devcontainers/base:ubuntu
# gitleaks for the pre-commit hook (lefthook.yml), copied from the official image (multi-arch index digest).
COPY --from=ghcr.io/gitleaks/gitleaks:v8.30.1@sha256:c00b6bd0aeb3071cbcb79009cb16a60dd9e0a7c60e2be9ab65d25e6bc8abbb7f /usr/bin/gitleaks /usr/local/bin/gitleaks
# The agent never needs root after the build; the owner can still use `docker exec -u root`.
RUN rm /etc/sudoers.d/vscode
