# Pre-TestFlight Readiness Checklist

Use this checklist to track Top Cut's readiness for its first iPhone device build and TestFlight upload.

## 1. Completed

- [x] Static export ready
- [x] Capacitor installed
- [x] iOS and Android projects generated
- [x] Native status bar configured
- [x] Native splash configured
- [x] Keyboard plugin configured
- [x] Portrait orientation configured
- [x] Settings, Legal, and Data page added
- [x] Export, import, and clear-data controls added
- [x] Disclaimer, support, and privacy copy added
- [x] In-app static Privacy Policy and Support routes added

## 2. Needs Manual Browser/Device QA

- [ ] Verify Settings visually on mobile and desktop
- [ ] Verify export file download behavior
- [ ] Verify the import file picker and a full export/import round trip
- [ ] Verify `mailto:` link behavior and graceful handling when no mail client is configured
- [ ] Clear all data, reload the app, and confirm it remains cleared and usable
- [ ] Verify swipe rows on a real touch device
- [ ] Verify sheets and modals while the keyboard is open
- [ ] Verify the Lottie intro handoff
- [ ] Verify safe-area spacing at the top and bottom
- [ ] Verify five-item bottom navigation spacing on supported screen sizes

## 3. Needs Native iPhone QA

- [ ] Verify a cold launch
- [ ] Verify the native splash-to-intro handoff
- [ ] Verify keyboard resize behavior and focused-input visibility
- [ ] Verify modal and sheet scrolling
- [ ] Verify local data persistence after force-closing the app
- [ ] Verify local data persistence after installing an app update
- [ ] Verify import and export inside WKWebView
- [ ] Verify status bar background and foreground appearance
- [ ] Verify portrait orientation lock
- [ ] Verify home-indicator spacing

## 4. Native Assets Remaining

- [x] Replace the placeholder iOS app icon
- [x] Replace the placeholder Android app icon
- [ ] Confirm the launch-screen background is `#0B0B0D` on physical devices
- [x] Generate and validate the opaque 1024×1024 App Store icon
- [ ] Confirm no unused generated splash placeholder is visible during launch

## 5. Apple/App Store Remaining

- [ ] Confirm access to an active Apple Developer account
- [ ] Create the App Store Connect app record
- [ ] Register the bundle ID `com.topcut.app`
- [ ] Configure the signing team in Xcode
- [ ] Confirm the release version and increment the build number as needed
- [ ] Deploy the static site and use public `/privacy/` and `/support/` URLs in App Store Connect
- [ ] Complete the App Store privacy questionnaire
- [ ] Capture required App Store screenshots
- [ ] Finalize the app description, subtitle, and keywords
- [ ] Create and assign a TestFlight internal testing group

## 6. Mac/Xcode Steps

- [ ] Pull the latest repository changes on the Mac
- [ ] Install the supported Node.js version and run `npm install`
- [ ] Run `npm run native:build`
- [ ] Open the iOS project in Xcode
- [ ] Allow Xcode to resolve Swift packages
- [ ] Select the Apple Developer team
- [ ] Configure and verify signing
- [ ] Build and run on a connected iPhone
- [ ] Create an archive
- [ ] Validate and upload the archive to App Store Connect

## 7. Known Limitations for V1

- Local-only storage
- No cloud backup
- No cross-device synchronization
- No native share sheet yet; data export uses a browser download fallback
- No crash analytics yet
- Deck photo import is a post-V1 experimental feature and is not included in
  beta/V1 launch readiness.
