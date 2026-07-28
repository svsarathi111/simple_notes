# Gradle Build Reference — Sticky Notes Android App

## 📋 What's Inside

```
notepad-app/
├── .github/workflows/
│   ├── build-apk.yml          ← Simple: builds debug APK on every push
│   └── build-release.yml      ← Advanced: builds signed APK on tags
├── android/
│   ├── app/build.gradle       ← App build configuration
│   ├── settings.gradle        ← Root gradle settings
│   ├── gradlew                ← Gradle wrapper (Linux/Mac)
│   ├── gradlew.bat            ← Gradle wrapper (Windows)
│   └── gradle/wrapper/
│       └── gradle-wrapper.properties
└── BUILD_GUIDE.md             ← Full build instructions (THIS FILE)
```

---

## ⚡ One-Line Build (All Platforms)

```bash
# Install deps, sync web code, build APK
npm install && npx capacitor sync android && cd android && ./gradlew assembleDebug
```

---

## 🎯 GitHub Actions Workflows Explained

### 1. `build-apk.yml` — Simple CI/CD (Every Push)

**Triggers:** Push to `main` or `develop`, or manual trigger

**What it does:**
- Installs Node.js + Android SDK
- Builds a debug APK
- Uploads as GitHub artifact (30 days retention)

**Use this if:** You want to test builds automatically

**Download APK:** Actions tab → Artifacts → `app-debug`

### 2. `build-release.yml` — Full Release Pipeline

**Triggers:** Push git tag (e.g., `git tag v1.0.0 && git push --tags`)

**What it does:**
1. **build-debug** → Debug APK (every push)
2. **build-release** → Unsigned release APK (tag only)
3. **build-aab** → App Bundle for Google Play (tag only)
4. Creates GitHub Release with downloads

**Use this if:** You're publishing to Google Play Store

**To trigger:**
```bash
git tag v1.0.0
git push --tags
# Wait for Actions → check Releases tab
```

---

## 🏗️ Gradle Build Commands

### Build APK

```bash
cd android

# Debug APK (for testing, default)
./gradlew assembleDebug
# Output: app/build/outputs/apk/debug/app-debug.apk

# Release APK (unsigned)
./gradlew assembleRelease
# Output: app/build/outputs/apk/release/app-release-unsigned.apk
```

### Build App Bundle (AAB) — for Google Play Store

```bash
cd android

# Release AAB (unsigned)
./gradlew bundleRelease
# Output: app/build/outputs/bundle/release/app-release.aab
```

### Build All Variants

```bash
cd android
./gradlew build  # Builds debug + release for both APK and AAB
```

### Clean & Rebuild

```bash
cd android
./gradlew clean
./gradlew assembleDebug --stacktrace  # Shows detailed errors
```

---

## 🖥️ Building in GitHub Codespaces

### Step-by-step:

1. **Open Codespaces**
   - GitHub repo → Code → Codespaces → Create codespace on main

2. **Setup (once per session)**
   ```bash
   npm install
   npx capacitor sync android
   cd android
   chmod +x gradlew
   ```

3. **Build APK**
   ```bash
   ./gradlew assembleDebug --stacktrace
   # Wait 5-10 minutes (first build is slow)
   ```

4. **Download APK**
   - Left sidebar: `android/app/build/outputs/apk/debug/app-debug.apk`
   - Right-click → Download

### Speed up Codespaces builds:
```bash
# Limit parallel workers (saves RAM)
./gradlew assembleDebug --max-workers=2

# Or add to ~/.gradle/gradle.properties
org.gradle.parallel=false
org.gradle.workers.max=2
```

---

## 🔧 Configuration Files

### `android/app/build.gradle`

Key settings:
```gradle
compileSdk 33              # Target API version
minSdk 21                  # Min Android version (5.0+)
targetSdk 33               # Highest tested version
versionCode 1              # Increment for each release
versionName "1.0.0"        # Version string
minifyEnabled true         # Enable ProGuard minification (release)
```

**To change version:**
```gradle
versionCode 2              // Increment for Play Store
versionName "1.0.1"        // User-facing version
```

### `android/gradle/wrapper/gradle-wrapper.properties`

Specifies Gradle version to use:
```properties
distributionUrl=https\://services.gradle.org/distributions/gradle-8.0-bin.zip
```

**To update Gradle:**
```bash
cd android
./gradlew wrapper --gradle-version 8.1  # Updates wrapper
```

---

## 🔐 Signing APK for Google Play

### Step 1: Generate Keystore (one-time)

```bash
keytool -genkey -v -keystore release.keystore \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias sticky-notes-key

# You'll be prompted for:
# - Password (remember this!)
# - Name, organization, etc.
# - Alias password
```

This creates `release.keystore` in your project. **Keep it safe!**

### Step 2: Configure Build

Create `android/app/build.gradle.local` (or edit build.gradle):

```gradle
android {
    signingConfigs {
        release {
            storeFile file("../release.keystore")
            storePassword "YOUR_KEYSTORE_PASSWORD"
            keyAlias "sticky-notes-key"
            keyPassword "YOUR_KEY_PASSWORD"
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
        }
    }
}
```

### Step 3: Build Signed APK

```bash
cd android
./gradlew assembleRelease
# Output: app/build/outputs/apk/release/app-release.apk (SIGNED)
```

### Step 4: Verify Signature

```bash
jarsigner -verify -verbose -certs \
  app/build/outputs/apk/release/app-release.apk
```

---

## 📤 Upload to Google Play Store

### Requirements
- Google Play Developer account ($25 one-time)
- Signed APK or AAB file
- App screenshots, description, etc.

### Process
1. Go to [Google Play Console](https://play.google.com/console)
2. Click **Create app**
3. Fill in app details (name, category, rating, etc.)
4. Go to **Release** → **Production** (or **Internal testing** first)
5. Click **Create release**
6. Upload your signed APK or AAB:
   - APK: `app/build/outputs/apk/release/app-release.apk`
   - AAB: `app/build/outputs/bundle/release/app-release.aab` (preferred)
7. Review changelog, price (free), and submit
8. Review usually takes 2-4 hours, sometimes 24 hours

---

## 🐛 Troubleshooting

### "Build fails: SDK not installed"
```bash
# Install/update Android SDK in Android Studio, then:
export ANDROID_HOME=/path/to/android/sdk
# Or set in ~/.gradle/gradle.properties:
# sdk.dir=/path/to/android/sdk
```

### "Build fails: gradlew not found"
```bash
cd android
chmod +x gradlew
./gradlew assembleDebug
```

### "Build fails: Java version mismatch"
```bash
# Check Java version
java -version  # Should be 11+

# Install Java 11
# macOS:
brew install openjdk@11
export JAVA_HOME=$(/usr/libexec/java_home -v11)

# Linux:
sudo apt-get install openjdk-11-jdk
export JAVA_HOME=/usr/lib/jvm/java-11-openjdk-amd64
```

### "Build hangs or times out"
```bash
# Limit parallel compilation
./gradlew assembleDebug --max-workers=1

# Or increase timeout in Codespaces (via workflow file)
timeout-minutes: 30
```

### "APK file is too large"
```gradle
// Enable minification in android/app/build.gradle
buildTypes {
    release {
        minifyEnabled true
        proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
    }
}
```

### "App crashes on startup"
1. Check logcat:
   ```bash
   adb logcat | grep -i "error\|crash"
   ```
2. Verify `www/index.html` is copied to assets
3. Check browser console (Chrome DevTools on Android)

---

## 📊 Build Output Sizes

After successful build:

```
Debug APK:              ~50 MB (includes debug info)
Release APK (unsigned): ~40 MB
App Bundle (AAB):       ~30 MB (optimized for Play Store)
```

Sizes reduce further with ProGuard minification enabled.

---

## 🚀 GitHub Actions Status

Check build status:

1. Go to your GitHub repo
2. Click **Actions** tab
3. Select the workflow run
4. View logs in real-time
5. Download artifacts when done

**Common issues in CI:**
- **Timeout:** Increase `timeout-minutes` in workflow
- **Out of memory:** Reduce `--max-workers=1`
- **SDK not found:** Actions auto-installs, but may need version update

---

## 📚 Gradle Resources

- Official Gradle docs: https://gradle.org/
- Android Gradle Plugin: https://developer.android.com/build
- Capacitor Android: https://capacitorjs.com/docs/android
- Gradle Wrapper: https://docs.gradle.org/current/userguide/gradle_wrapper.html

---

## ✅ Quick Checklist

- [ ] `npm install`
- [ ] `npx capacitor sync android`
- [ ] `cd android && ./gradlew assembleDebug`
- [ ] APK created at `app/build/outputs/apk/debug/app-debug.apk`
- [ ] Test on device with `adb install app-debug.apk`
- [ ] Ready to publish? Build with `./gradlew assembleRelease` or use CI/CD

---

**Happy building! 🚀**
