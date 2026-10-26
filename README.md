# Clock Add-ons for Firefox

Two small companion Firefox extensions that put a clock in your toolbar. **Clock Hours** shows the current hour and **Clock Minutes** shows the current minute. Place their buttons side by side and together they read like a digital clock (`3:` `07`).

Each add-on draws its number onto its toolbar icon and redraws it at the top of every minute. Hovering over either icon shows the full current time as a tooltip.

## The add-ons

| Folder | Add-on | Shows | Version |
|---|---|---|---|
| `hours-0.4/` | Clock Hours | The hour, followed by a colon (e.g. `3:`) | 0.4.0 |
| `minutes-0.4/` | Clock Minutes | The minutes, always two digits (e.g. `07`) | 0.4.0 |

Each folder holds the unpacked source plus a zipped copy (`hours-0.4.zip`, `minutes-0.4.zip`) ready to load or submit.

The add-ons work independently, but they are designed to be installed together.

## Features

- **Live toolbar clock.** The icon updates on the minute using the `alarms` API, so it stays accurate without polling.
- **Matches your theme.** By default the digits use your Firefox theme's toolbar text color, falling back to white if the theme doesn't set one.
- **Custom color.** Pick any color with a hue/brightness spectrum, RGB sliders, or a hex code (`#RRGGBB`).
- **Preset colors.** One-click presets: Default (black), Dark Mode (white), Ocean Blue, Forest Green and Sunset Orange. *(Presets appear on the full options page.)*
- **Recently used colors.** The last five custom colors are kept as swatches.
- **12- or 24-hour time** (Clock Hours only).
- **Optional leading zero** on the hour, e.g. `03:` instead of `3:` (Clock Hours only).
- **Shared settings.** Changing the color in one add-on applies it to the other, so the two halves of the clock always match.

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

- Submit each zip to [addons.mozilla.org](https://addons.mozilla.org/developers/) for signing (it can be listed publicly or self-distributed), or
- Use Firefox Developer Edition, Nightly or ESR, set `xpinstall.signatures.required` to `false` in `about:config`, and install each zip from `about:addons` → gear icon → **Install Add-on From File…**.

### Arrange the toolbar

After installing both, right-click the toolbar and choose **Customize Toolbar…**. Drag the Clock Hours button immediately to the left of Clock Minutes so the clock reads correctly.

## Usage

- **Click either icon** to open a popup with the color controls (and, on Clock Hours, the display toggles). Choose a color and click **Use Custom Color**, or click **Reset to Default** to go back to following your theme.
- **Full options page:** open it from the link in the Clock Hours popup, or from `about:addons` → the add-on → **Preferences**. It has the same controls plus the preset color buttons.
- **12h / 24h and leading zero** are set from Clock Hours.

## How settings sync works

Firefox gives each extension its own separate storage, so the two add-ons can't read each other's settings directly. Instead, whenever you save a setting in one, it sends a `syncSettings` message to the other via `runtime.sendMessage`. The receiver:

1. accepts the message only if it comes from one of the two known add-on IDs,
2. writes the settings to its own `storage.sync`, and
3. tells its background script to redraw the icon immediately.

The IDs are fixed in each `manifest.json` (`browser_specific_settings.gecko.id`) and in `shared-settings.js`:

| Add-on | Extension ID |
|---|---|
| Clock Hours | `jccalhoun@gmail.com` |
| Clock Minutes | `jccalhoun-minutes-extension-id@gmail.com` |

**If you fork this and change either ID, change it in all three places** (both manifests and `shared-settings.js` in both folders), or syncing will silently stop. The add-on logs a console warning if its own ID doesn't match either known ID.

Because settings are stored with `storage.sync`, they also follow you to other computers if you use Firefox Sync.

## Project structure

Both folders share the same layout:

```
hours-0.4/
├── manifest.json          Extension manifest (MV3, Firefox)
├── background.html        Background page; loads the two scripts below
├── background_script.js   Draws the number on the icon and schedules minute updates
├── shared-settings.js     Sends/receives settings to and from the companion add-on
├── popup.html             Toolbar popup
├── options.html           Full options page (adds preset colors)
├── color-picker-main.js   Color picker UI and event handling
├── color-picker-state.js  Load/save settings, recent colors, reset
├── color-utils.js         Hex/RGB/HSV conversion and validation
├── styles.css             Shared styles for popup and options page
├── icon16.png, icon32.png Placeholder icons (replaced at runtime by the drawn clock)
└── hours-0.4.zip          Packaged copy of the above
```

`shared-settings.js`, `color-utils.js` and `styles.css` are identical in both add-ons; if you edit one, copy it to the other folder.

### Rendering details

`background_script.js` draws the text on a 32×32 canvas in bold Arial, starting at 32 px and shrinking until the text fits with a 1 px margin, then sets it with `action.setIcon({ imageData })`. After each update it schedules a one-shot alarm for the start of the next minute.

## Permissions

| Permission | Why it's needed |
|---|---|
| `storage` | Save your color and display settings |
| `theme` | Read the current theme's toolbar text color for the default digit color |
| `alarms` | Wake up at the start of each minute to redraw the icon |

Both add-ons declare that they collect no data (`data_collection_permissions: none`). Nothing is sent anywhere except the settings message between the two add-ons.

## Building a package

From inside an add-on folder, zip the files (not the folder itself), leaving out the old zip:

```bash
cd hours-0.4
zip -r ../hours-0.4.zip . -x "*.zip"
```

Mozilla's [`web-ext`](https://github.com/mozilla/web-ext) tool also works: `web-ext build` to package and `web-ext lint` to check before submitting.

## License

GNU Lesser General Public License v2.1. See [LICENSE](LICENSE).
