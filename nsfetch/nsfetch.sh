#!/bin/sh
reg="ghcr.io"
img="nsres/titanfall"
tag="2.0.11.0-dedicated-mp-vpkoptim.430d3bb"
tok="Bearer QQ=="

trap "rm -f *.part" EXIT
wget -q -O - "https://$reg/v2/$img/manifests/$tag" --header "Accept: application/vnd.oci.image.manifest.v1+json" --header "Authorization: $tok" |
jq -r '.layers[] | [ .digest, .annotations."org.opencontainers.image.title", "@"+(.annotations."org.opencontainers.image.created" | fromdateiso8601 | tostring) ] | @tsv' |
while IFS=$(printf "\t") read -r digest path timestamp; do
  echo "$path"
  if [ -z "${digest}" ] || [ "${digest#sha256:}" = "$digest" ] || [ -z "$path" ] || [ -z "$timestamp" ]; then
    echo "wtf" >&2
    exit 1
  fi
  if [ ! -f "$path" ] || [ "$(sha256sum "$path" | head -c 64)" != "${digest#sha256:}" ]; then
    if [ "$(wget -q -O - "https://$reg/v2/$img/blobs/$digest" --header "Authorization: $tok" | tee "$digest.part" | sha256sum | head -c 64)" != "${digest#sha256:}" ]; then
      echo "checksum mismatch" >&2
      exit 1
    fi
    mkdir -p "$(dirname "./$path")" -m 755
    mv -f "$digest.part" "$path"
  fi
  touch -c -m "$path" -d "$timestamp"
  chmod 444 "$path"
done