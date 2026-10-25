# Masjid Display Settings - Android TV app

A Kotlin Android app that shows the settings screens in a full-screen WebView.
The screens live in app/src/main/assets/index.html (16:9, remote-friendly).

## Build the APK
1. Add gradle/wrapper/gradle-wrapper.jar (see below), then open this folder in Android Studio (Koala or newer). Let Gradle sync finish.
2. Build > Build Bundle(s) / APK(s) > Build APK(s).
3. The file is at app/build/outputs/apk/debug/app-debug.apk

## Install on the TV
- Enable Developer options and USB/Network debugging on the TV.
- adb connect <TV-IP>:5555
- adb install -r app/build/outputs/apk/debug/app-debug.apk
- Open "Masjid Display Settings" from the TV's app row.

## Remote
Arrows move, OK selects, Left/Right on a time or number changes it,
Back goes to the sidebar (Back again on the sidebar exits).

## Updating the screens
Replace app/src/main/assets/index.html and rebuild.

## gradle-wrapper.jar
gradlew downloads Gradle itself if gradle-wrapper.jar is missing (needs curl or wget).
