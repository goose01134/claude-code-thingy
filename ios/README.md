# Margin for iPhone

The iPhone version of Margin. It reuses the Android app's screens (`../web`, the HTML, CSS and
JavaScript from the APK) and adds Swift code for the parts only native code can do on iPhone.

You don't need a Mac. GitHub's Mac machines build the app (see `.github/workflows/ios.yml`).

## How it fits together

| Folder | What it is |
|---|---|
| `../web` | The shared UI. Same files as the Android app's `assets` folder, with small iPhone-only additions (search for `ios`). They don't change anything on Android, so you can copy the folder back into the Android project. |
| `Margin/` | The app: shows the web UI, connects it to Swift (`WebBridge.swift`), and draws the native **Applications** and **Statistics** tabs. |
| `MarginMonitor/` | Wakes up when you cross a time limit, at the reset time, and when focus schedules start or end. Decides what to block. |
| `MarginShield/` | Margin's look for Apple's block screen. |
| `MarginShieldAction/` | The block screen's buttons, including emergency access (tap twice). |
| `MarginReport/` | Draws the Statistics tab from Screen Time's usage data. |
| `Shared/` | Settings, usage log, blocking and scheduling logic used by all of the above. |
| `project.yml` | The project definition. `xcodegen generate` turns it into `Margin.xcodeproj`. |

## Differences from Android

Apple only allows screen-time apps to use its **Screen Time** system, which keeps your app choices
private. So on iPhone:

- You choose apps in **Apple's app picker**. Margin can limit them but never learns their names. Only
  Apple-drawn views can show them, so the Applications and Statistics tabs are native screens.
- When time's up, iPhone shows **Apple's block screen** in Margin's colours and wording, not the
  web lock screen. Emergency access is a button on it: tap it twice to open your apps for a few minutes.
- Home shows today's total in steps of 5–15 minutes. Screen Time reports usage to Margin only
  as limits are crossed; exact numbers appear on the Statistics tab.
- Opening an app from Margin isn't possible on iPhone.

## Building

Every push that changes `ios/`, `web/` or the workflow builds the app for the iPhone simulator and
saves screenshots to `docs/screenshots`. That needs no Apple account.

To build on a Mac yourself: `brew install xcodegen`, then `cd ios && xcodegen generate`, then open
`Margin.xcodeproj`.

## Putting it on your iPhone and the App Store

This needs the paid Apple Developer Program ($99/year). Screen Time apps can't run on a real phone
with a free Apple ID.

1. Join the Apple Developer Program.
2. Request the **Family Controls (Distribution)** entitlement from Apple for each of the 5 bundle IDs
   (`app.margin.wellbeing` and its `.monitor`, `.shield`, `.shieldaction` and `.report` extensions).
   Approval can take a while, so request it early.
3. Create the App Group `group.app.margin.wellbeing` in your developer account. If any ID is taken,
   change `APP_BUNDLE_ID` and `APP_GROUP_ID` in `project.yml`.
4. Add a signing and TestFlight upload job to the workflow (App Store Connect API key stored as
   GitHub secrets). Then install from TestFlight to test on your phone, and submit to the App Store
   from App Store Connect.
