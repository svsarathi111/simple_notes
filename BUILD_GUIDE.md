# Building APK with Gradle — Local & CI/CD Guide

## 🚀 Quick Build (Local Machine)

### Prerequisites
- Node.js 16+
- Java 11+ (JDK)
- Android SDK 31+ installed

### Build APK locally

```bash
# 1. Install dependencies
npm install

# 2. Sync web assets to Android
npx capacitor sync android

# 3. Build APK
cd android
./gradlew assembleDebug    # Debug APK (for testing)
# or
./gradlew assembleRelease  # Release APK (for Play Store)

# Output:
# Debug:   android/app/build/outputs/apk/debug/app-debug.apk
# Release: android/app/build/outputs/apk/release/app-release-unsigned.apk
```

### Build App Bundle (AAB) for Google Play
```bash
cd android
./gradlew bundleRelease
# Output: android/app/build/outputs/bundle/release/app-release.aab
```

---

## 🔧 GitHub Codespaces Build

### Step 1: Open Codespaces
1. Go to your GitHub repository
2. Click **Code** → **Codespaces** → **Create codespace on main**
3. Wait for the container to start (2-3 minutes)

### Step 2: Build in Codespaces

```bash
# Install deps
npm install

# Sync to Android
npx capacitor sync android

# Build APK
cd android
./gradlew assembleDebug --stacktrace

# Wait 5-10 minutes for the build to complete
```

### Step 3: Download APK from Codespaces
1. In the file explorer (left sidebar), navigate to:
   ```
   android/app/build/outputs/apk/debug/app-debug.apk
   ```
2. Right-click → **Download**

---

## ⚙️ GitHub Actions CI/CD

### Option A: Simple Debug Build (Every Push)

**File:** `.github/workflows/build-apk.yml`

This workflow:
- Builds a debug APK on every push
- Uploads it as an artifact (available for 30 days)
- No signing keys needed

**To use:**
1. Copy `.github/workflows/build-apk.yml` to your repo
2. Push to GitHub
3. Go to **Actions** tab → click the workflow run
4. Download the APK from **Artifacts**

### Option B: Advanced Release Build

**File:** `.github/workflows/build-release.yml`

This workflow triggers on **git tags** (e.g., `git tag v1.0.0 && git push --tags`):

- **Debug APK** → On every push
- **Release APK (unsigned)** → On version tags
- **App Bundle (AAB)** → On version tags (for Play Store)
- Automatically creates a GitHub Release with download links

**To use:**
1. Copy `.github/workflows/build-release.yml` to your repo
2. Tag a commit:
   ```bash
   git tag v1.0.0
   git push --tags
   ```
3. Go to **Actions** → wait for workflow to complete
4. Go to **Releases** → download APK or AAB

---

## 📱 How to Test the APK

### On an Android Phone

#### Option 1: USB Cable (fastest)
```bash
# Enable Developer Mode on phone (tap Build Number 7 times in Settings)
# Enable USB Debugging in Developer Options

# Connect phone via USB
adb devices  # Verify connection

# Install APK
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

#### Option 2: Email / WhatsApp
1. Transfer APK file to your phone
2. Tap the file to install
3. Approve installation prompt

#### Option 3: Android Emulator
```bash
# Launch emulator in Android Studio
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 🔐 Signing the APK for Play Store

### Generate Signing Key (one-time)

```bash
keytool -genkey -v -keystore release.keystore \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias sticky-notes-key
```

This creates `release.keystore` — **keep it safe!**

### Build Signed APK

Create `android/local.properties`:
```properties
storeFile=/path/to/release.keystore
storePassword=yourPassword
keyAlias=sticky-notes-key
keyPassword=yourKeyPassword
```

Then build:
```bash
cd android
./gradlew assembleRelease
# Output: android/app/build/outputs/apk/release/app-release.apk (signed)
```

Or build AAB (preferred for Play Store):
```bash
./gradlew bundleRelease
# Output: android/app/build/outputs/bundle/release/app-release.aab
```

---

## 📤 Upload to Google Play

### Requirements
- Google Play Developer account ($25 one-time)
- Signed APK or AAB file

### Steps
1. Go to [Google Play Console](https://play.google.com/console)
2. Create an app listing (name, description, screenshots, etc.)
3. Go to **Release** → **Internal testing** (or **Production**)
4. Upload your signed APK/AAB
5. Review app details and submit for review

**Review time:** Usually 2-4 hours, sometimes up to 24 hours.

---

## 🔍 Troubleshooting

### Build fails: "SDK version not found"
```bash
# Update/download SDK in Android Studio, then:
export ANDROID_HOME=$HOME/Library/Android/Sdk  # macOS
# or
export ANDROID_HOME=/home/user/Android/Sdk     # Linux
```

### Build fails: "gradlew not found"
```bash
chmod +x android/gradlew
./gradlew assembleDebug
```

### Build fails: "Java version mismatch"
```bash
# Install Java 11
# macOS:
brew install openjdk@11
export JAVA_HOME=$(/usr/libexec/java_home -v11)

# Linux:
sudo apt-get install openjdk-11-jdk
export JAVA_HOME=/usr/lib/jvm/java-11-openjdk-amd64

# Windows:
# Download from adoptopenjdk.net, add to PATH
```

### APK size too large?
```bash
# Enable ProGuard minification in android/app/build.gradle
minifyEnabled true
```

### Build hangs in Codespaces?
- Increase timeout: `./gradlew assembleDebug --max-workers=2`
- Or just wait 15-20 minutes (first build is slow)

---

## 📊 Build Artifacts

After a successful build, you'll find:

**Debug:**
```
android/app/build/outputs/apk/debug/app-debug.apk  (~50 MB)
```

**Release (unsigned):**
```
android/app/build/outputs/apk/release/app-release-unsigned.apk  (~40 MB)
```

**App Bundle (for Play Store):**
```
android/app/build/outputs/bundle/release/app-release.aab  (~30 MB)
```

---

## 🎯 Gradle Commands Cheat Sheet

```bash
./gradlew clean                  # Clean build cache
./gradlew assembleDebug          # Build debug APK
./gradlew assembleRelease        # Build release APK (unsigned)
./gradlew bundleRelease          # Build App Bundle for Play Store
./gradlew connectedAndroidTest   # Run tests on connected device
./gradlew build                  # Full build (all variants)
./gradlew tasks                  # List all available tasks
```

---

## ✅ Next Steps

1. **Local build:** Follow "Quick Build" above
2. **GitHub CI/CD:** Copy `.github/workflows/build-apk.yml`
3. **Google Play:** Sign the APK and upload
4. **Done!** Your app is live 🎉

For more: https://gradle.org/install/ and https://developer.android.com/build
