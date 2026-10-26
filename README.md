# Clock Add-ons for Firefox

Two small companion Firefox extensions that put a clock in your toolbar. **Clock Hours** shows the current hour and **Clock Minutes** shows the current minute. Place their buttons side by side and together they read like a digital clock (`3:` `07`).

Each add-on draws its number onto its toolbar icon and redraws it at the top of every minute. Hovering over either icon shows the full current time as a tooltip.

## The add-ons

| Folder | Add-on | Shows | Version |
|---|---|---|---|
| `hours-0.4/` | Clock Hours | The hour, followed by a colon (e.g. `3:`) | 0.4.1 |
| `minutes-0.4/` | Clock Minutes | The minutes, always two digits (e.g. `07`) | 0.4.1 |

Each folder holds the unpacked source. Packaged zips, ready to load or submit, are in `dist/` (see [Building packages](#building-packages)).

The add-ons work independently, but they are designed to be installed together.

## Features

- **Live toolbar clock.** The icon updates on the minute using the `alarms` API, so it stays accurate without polling.
- **Matches your theme.** By default the digits use your Firefox theme's toolbar text color. If the theme doesn't set one (as with the built-in System theme), they're dark or light to match your system's light/dark mode. The icon redraws as soon as you switch themes.
- **Custom color.** Pick any color with a hue/brightness spectrum, RGB sliders, or a hex code (`#RRGGBB`).
- **Preset colors.** One-click presets: Default (black), Dark Mode (white), Ocean Blue, Forest Green and Sunset Orange. *(Presets appear on the full options page.)*
- **Recently used colors.** The last five custom colors are kept as swatches.
- **12- or 24-hour time** (Clock Hours only).
- **Optional leading zero** on the hour, e.g. `03:` instead of `3:` (Clock Hours only).
- **Shared settings.** Changing the color in one add-on applies it to the other right away, so the two halves of the clock always match. A newly installed add-on also picks up the other's existing settings.

## Requirements

- **Firefox 140 or later.** Both manifests set `strict_min_version` to 140.0.
- Firefox only. The add-ons use the `browser.*` namespace, a Manifest V3 background *page*, and the `theme` API, so they won't load in Chrome or other Chromium browsers as-is.

## Installation

### Try it out (temporary)

1. Open `about:debugging#/runtime/this-firefox` in Firefox.
2. Click **Load Temporary Add-on…**.
3. Select `hours-0.4/manifest.json`.
4. Repeat for `minutes-0.4/manifest.json`.

Temporary add-ons are removed when Firefox restarts.

### Permanent install

Release Firefox only installs add-ons signed by Mozilla. To install permanently, either:

- Submit each zip from `dist/` to [addons.mozilla.org](https://addons.mozilla.org/developers/) for signing (it can be listed publicly or self-distributed), or
- Use Firefox Developer Edition, Nightly or ESR, set `xpinstall.signatures.required` to `false` in `about:config`, and install each zip from `about:addons` → gear icon → **Install Add-on From File…**.

### Arrange the toolbar

Both buttons are placed on the toolbar when first installed. If Clock Minutes ends up to the left of Clock Hours (or they aren't next to each other), right-click the toolbar, choose **Customize Toolbar…**, and drag Clock Hours immediately to the left of Clock Minutes.

## Usage

- **Click either icon** to open a popup with the color controls (and, on Clock Hours, the display toggles). Choose a color and click **Use Custom Color**, or click **Reset to Default** to go back to following your theme.
- **Full options page:** open it from the link in the Clock Hours popup, or from `about:addons` → the add-on → **Preferences**. It has the same controls plus the preset color buttons.
- **12h / 24h and leading zero** are set from Clock Hours.

## How settings sync works

Firefox gives each extension its own separate storage, so the two add-ons can't read each other's settings directly. Instead, whenever you save a setting in one, it sends a `syncSettings` message to the other via `runtime.sendMessage`. The receiver:

1. accepts the message only if it comes from one of the two known add-on IDs, and
2. writes the settings to its own `storage.sync`.

Each background script listens for `storage.onChanged` and redraws its icon whenever its settings change, whether the change came from its own popup, from the companion add-on, or from Firefox Sync.

When an add-on is first installed, it sends a `requestSettings` message to the companion (if installed) and copies its current settings, so a newly added half of the clock matches the existing one.

The IDs are fixed in each `manifest.json` (`browser_specific_settings.gecko.id`) and in `shared-settings.js`:

| Add-on | Extension ID |
|---|---|
| Clock Hours | `jccalhoun@gmail.com` |
| Clock Minutes | `jccalhoun-minutes-extension-id@gmail.com` |

**If you fork this and change either ID, change it in all three places** (both manifests and `shared/shared-settings.js`, then run `./build.sh`), or syncing will silently stop. The add-on logs a console warning if its own ID doesn't match either known ID.

Because settings are stored with `storage.sync`, they also follow you to other computers if you use Firefox Sync.

## Project structure

```
shared/                    Source of truth for files used by both add-ons
├── shared-settings.js     Sends/receives settings to and from the companion add-on
├── color-utils.js         Hex/RGB/HSV conversion, validation and normalization
└── styles.css             Styles for the popup and options page
hours-0.4/, minutes-0.4/   One folder per add-on, same layout:
├── manifest.json          Extension manifest (MV3, Firefox)
├── background.html        Background page; loads shared-settings.js and background_script.js
├── background_script.js   Draws the number on the icon and schedules minute updates
├── popup.html             Toolbar popup
├── options.html           Full options page (adds preset colors)
├── color-picker-main.js   Color picker UI and event handling
├── color-picker-state.js  Load/save settings, recent colors, reset
├── icon16.png, icon32.png Placeholder toolbar icons (replaced at runtime by the drawn clock)
├── icon48.png, icon96.png Add-on icons shown in about:addons
└── (copies of the shared/ files)
build.sh                   Copies shared/ into both folders and builds dist/*.zip
dist/                      Packaged add-ons
```

Edit the shared files in `shared/` only. The copies inside each add-on folder are kept so you can load an add-on straight from a fresh clone, but `build.sh` overwrites them.

### Rendering details

`background_script.js` draws the text on a 32×32 canvas in bold Arial and sets it with `action.setIcon({ imageData })`. The font size is fit once to the widest possible text (`00:` for hours, `00` for minutes), so the digits stay the same size as the time changes. After each update it schedules a one-shot alarm for the start of the next minute. Each time the background page loads it also checks that the alarm exists, so the clock restarts after the add-on is disabled and re-enabled.

## Permissions

| Permission | Why it's needed |
|---|---|
| `storage` | Save your color and display settings |
| `theme` | Read the current theme's toolbar text color for the default digit color |
| `alarms` | Wake up at the start of each minute to redraw the icon |

Both add-ons declare that they collect no data (`data_collection_permissions: none`). Nothing is sent anywhere except the settings message between the two add-ons.

## Building packages

From the repository root:

```bash
./build.sh
```

This copies the files in `shared/` into both add-on folders and writes `dist/hours-<version>.zip` and `dist/minutes-<version>.zip`, using the version in each `manifest.json`. Run it after any change, so the zips don't fall behind the source.

To check an add-on before submitting it, run Mozilla's [`web-ext`](https://github.com/mozilla/web-ext) linter:

```bash
npx web-ext lint --source-dir hours-0.4
```

## License

GNU Lesser General Public License v2.1. See [LICENSE](LICENSE).
