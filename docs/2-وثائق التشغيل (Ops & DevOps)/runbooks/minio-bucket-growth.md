
# Runbook — MinIO Bucket Unexpected Growth

## Symptoms
- Disk fills quickly; MinIO bucket size ballooning.

## Triage
- List largest objects and prefixes.
- Check lifecycle rules; versioning may be enabled accidentally.

## Mitigation
- Apply lifecycle policy to expire old/tmp objects.
- Disable versioning if not needed.
- Add background cleanup for temp uploads.
