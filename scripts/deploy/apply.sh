#!/usr/bin/env bash
# Build a release already copied to /opt/atlas/releases/<sha> and switch the live symlink.
set -euo pipefail

sha="${1:?release sha is required}"
if [[ ! "$sha" =~ ^[0-9a-f]{40}$ ]]; then
  echo "invalid release SHA" >&2
  exit 1
fi

release="/opt/atlas/releases/${sha}"
current_link="/opt/atlas/current"
env_file="/opt/atlas/shared/.env"

if [[ ! -d "$release" ]]; then
  echo "missing release directory" >&2
  exit 1
fi
if [[ ! -f "$env_file" ]]; then
  echo "missing ${env_file}" >&2
  exit 1
fi

previous=""
if [[ -L "$current_link" ]]; then
  previous="$(readlink -f "$current_link" || true)"
fi

rollback() {
  if [[ -n "$previous" && "$previous" != "$release" && -d "$previous" ]]; then
    ln -sfn "$previous" "$current_link"
    systemctl restart atlas.service || true
  fi
}

cd "$release"
corepack enable
corepack prepare pnpm@10.20.0 --activate
pnpm install --frozen-lockfile
pnpm build
chmod -R a+rX "$release"
rm -f "$release/.env"

ln -sfn "$release" "$current_link"
systemctl restart atlas.service

healthy=0
for _ in $(seq 1 30); do
  if curl -fsS http://127.0.0.1:3103/api/health | grep -q '"ok":true'; then
    healthy=1
    break
  fi
  sleep 1
done

if [[ "$healthy" != 1 ]]; then
  echo "health check failed" >&2
  rollback
  exit 1
fi

kept=0
while IFS= read -r dir; do
  [[ -d "$dir" ]] || continue
  if [[ "$(readlink -f "$dir")" == "$(readlink -f "$current_link")" ]]; then
    continue
  fi
  kept=$((kept + 1))
  if [[ "$kept" -gt 4 ]]; then
    rm -rf "$dir"
  fi
done < <(ls -1dt /opt/atlas/releases/*)

echo "deployed ${sha}"
