#!/bin/sh
# Copy this commit onto the production host and run the host apply script.
set -eu

expected_repo="zengwenliang416/atlas-architecture-study"
release_root="/opt/atlas"
sha="${CI_COMMIT_SHA:?CI_COMMIT_SHA is required}"

if [ "${CI_REPO:-}" != "$expected_repo" ]; then
  echo "unexpected repository: ${CI_REPO:-missing}" >&2
  exit 1
fi
if ! printf '%s' "$sha" | grep -Eq '^[0-9a-f]{40}$'; then
  echo "invalid release SHA" >&2
  exit 1
fi
if [ "${CI_PIPELINE_EVENT:-}" = "pull_request" ]; then
  echo "refusing to deploy a pull request" >&2
  exit 1
fi

release="${release_root}/releases/${sha}"
mkdir -p "${release_root}/releases" "${release_root}/shared"
rm -rf "$release"
mkdir -p "$release"
tar \
  --exclude .git \
  --exclude node_modules \
  --exclude dist \
  --exclude dist-test \
  --exclude .env \
  --exclude coverage \
  -cf - . | tar -C "$release" -xf -
chmod -R a+rX "$release"
rm -f "$release/.env"

docker run --rm --privileged --pid host \
  -v /opt/atlas:/opt/atlas \
  alpine:3.22 \
  sh -c "apk add --no-cache util-linux >/dev/null && nsenter -t 1 -m -u -i -n -- /bin/bash /opt/atlas/releases/${sha}/scripts/deploy/apply.sh ${sha}"
