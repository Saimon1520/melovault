#!/usr/bin/env bash
# Setup Android development environment on CachyOS/Arch Linux
# Run once: bash scripts/setup-android-dev.sh
set -e

ANDROID_HOME="$HOME/Android/Sdk"
CMDLINE_TOOLS_VERSION="11076708"
CMDLINE_TOOLS_URL="https://dl.google.com/android/repository/commandlinetools-linux-${CMDLINE_TOOLS_VERSION}_latest.zip"

echo "==> [1/5] Installing android-tools (adb) and JDK 17..."
sudo pacman -S --noconfirm --needed android-tools jdk17-openjdk

echo "==> [2/5] Setting JAVA_HOME to JDK 17..."
sudo archlinux-java set java-17-openjdk

echo "==> [3/5] Downloading Android SDK command-line tools..."
mkdir -p "$ANDROID_HOME/cmdline-tools"
TMP=$(mktemp -d)
curl -L "$CMDLINE_TOOLS_URL" -o "$TMP/cmdline-tools.zip"
unzip -q "$TMP/cmdline-tools.zip" -d "$TMP"
mv "$TMP/cmdline-tools" "$ANDROID_HOME/cmdline-tools/latest"
rm -rf "$TMP"

echo "==> [4/5] Installing required SDK components..."
yes | "$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager" --licenses > /dev/null 2>&1 || true
"$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager" \
  "platform-tools" \
  "build-tools;35.0.0" \
  "platforms;android-35" \
  "platforms;android-34"

echo "==> [5/5] Adding env vars to fish config..."
FISH_CONFIG="$HOME/.config/fish/config.fish"

# Remove old Android lines if present
grep -v "ANDROID_HOME\|JAVA_HOME.*openjdk" "$FISH_CONFIG" > /tmp/fish_config_clean.fish 2>/dev/null && mv /tmp/fish_config_clean.fish "$FISH_CONFIG" || true

cat >> "$FISH_CONFIG" << 'FISH'

# Android SDK — added by MeloVault setup
set -x ANDROID_HOME $HOME/Android/Sdk
set -x JAVA_HOME /usr/lib/jvm/java-17-openjdk
set -x PATH $PATH $ANDROID_HOME/platform-tools $ANDROID_HOME/cmdline-tools/latest/bin $ANDROID_HOME/build-tools/35.0.0
FISH

echo ""
echo "✓ Setup complete! Apply env vars with:"
echo "  source ~/.config/fish/config.fish"
echo ""
echo "Then connect your Honor Magic 7 Lite via USB and run:"
echo "  adb devices"
echo "  pnpm android"
