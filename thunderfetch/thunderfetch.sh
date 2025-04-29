#!/bin/sh
thunderstore="https://gcdn.thunderstore.io/live/repository/packages"
mod_zip=/mnt/mods/$package

# check if package env var is set
if [ -z "$package" ]; then
  echo "Package name not set. Please set the package environment variable."
  exit 1
fi
echo $package
# Check if the mod package and version are already present
if [ ! -f $mod_zip ]; then
  wget $thunderstore/$package -O $mod_zip
  if [ $? -ne 0 ]; then
    echo "Failed to download $package"
    exit 1
  fi
fi
echo $mod_zip
# extract the mod zip to /mnt/mods
unzip -o $mod_zip -d /mnt/ "mods/*"
if [ $? -ne 0 ]; then
  echo "Failed to extract $mod_zip"
  exit 1
fi