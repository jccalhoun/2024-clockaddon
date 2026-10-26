const ALARM_NAME = "update-clock-hour";

// The widest text this icon ever draws. Fitting the font to this (rather than to the
// current hour) keeps the digits the same size all day instead of shrinking at 10:00.
const SIZING_TEXT = "00:";

const canvas = document.createElement("canvas");
canvas.width = 32;
canvas.height = 32;
const context = canvas.getContext("2d");

let cachedFontSize = null;

// Listen for messages from the companion add-on (Clock Minutes)
SharedSettings.init();

// Listen for messages from the popup/options page to trigger an immediate update.
// These also wake the background page if it has been suspended.
browser.runtime.onMessage.addListener((message) => {
    if (message.colorChanged || message.displayChanged) {
        updateClock();
    }
});

// Redraw on any settings change: local saves, the companion add-on, or Firefox Sync
browser.storage.onChanged.addListener((changes, area) => {
    if (area === "sync") updateClock();
});

// Redraw when the browser theme changes
browser.theme.onUpdated.addListener(() => updateClock());

/**
 * Picks the color for the digits: the custom color if one is set, otherwise the
 * theme's toolbar text color, otherwise a light/dark default matching the system.
 */
function pickColor(settings, theme) {
    if (settings.useCustomColor && settings.customColor) {
        return settings.customColor;
    }
    const c = (theme && theme.colors) || {};
    const themed = c.toolbar_text || c.bookmark_text || c.tab_background_text;
    if (themed) {
        // Theme colors can be given as [r, g, b] arrays
        return Array.isArray(themed) ? `rgb(${themed.join(",")})` : themed;
    }
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "#fbfbfe" : "#15141a";
}

/**
 * Finds the largest bold Arial size at which SIZING_TEXT fits the icon with a 1px margin.
 */
function getFontSize() {
    if (cachedFontSize) return cachedFontSize;
    let bestFontSize = 1;
    for (let currentSize = canvas.height - 2; currentSize >= 1; currentSize--) {
        context.font = `bold ${currentSize}px Arial`;
        if (context.measureText(SIZING_TEXT).width <= canvas.width - 2) {
            bestFontSize = currentSize;
            break;
        }
    }
    cachedFontSize = bestFontSize;
    return bestFontSize;
}

// Update the clock icon. Fetches settings every time so it never draws stale values.
async function updateClock() {
    try {
        // 1. Get all settings from storage and the current theme at the same time
        const [settings, theme] = await Promise.all([
            browser.storage.sync.get({
                useCustomColor: false,
                customColor: "#ffffff",
                use24HourFormat: false,
                showLeadingZero: false
            }),
            browser.theme.getCurrent().catch(() => ({}))
        ]);

        // 2. Determine the correct color to use
        const colorToUse = pickColor(settings, theme);

        // 3. Format the text to draw based on settings
        const date = new Date();
        let hours = date.getHours();

        if (!settings.use24HourFormat) {
            hours = hours % 12 || 12; // 0 o'clock becomes 12
        }

        let textToDraw = String(hours);
        if (settings.showLeadingZero) {
            textToDraw = textToDraw.padStart(2, "0");
        }
        textToDraw += ":";

        // 4. Draw the icon
        const fontSize = getFontSize();
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillStyle = colorToUse;
        context.font = `bold ${fontSize}px Arial`;
        context.fillText(textToDraw, canvas.width / 2, canvas.height / 2);

        // 5. Update the browser action icon and title
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        browser.action.setIcon({ imageData });
        browser.action.setTitle({ title: date.toLocaleTimeString([], { hour12: !settings.use24HourFormat }) });

    } catch (error) {
        console.error("Error updating clock:", error);
    }
}

// --- Alarms and Initialization ---

function scheduleNextUpdate() {
    const nextMinute = new Date();
    nextMinute.setSeconds(0, 0);
    nextMinute.setMinutes(nextMinute.getMinutes() + 1);
    browser.alarms.create(ALARM_NAME, { when: nextMinute.getTime() });
}

browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === ALARM_NAME) {
        updateClock();
        scheduleNextUpdate();
    }
});

function initializeExtension() {
    console.log("Clock Hours Initializing...");
    updateClock();
    scheduleNextUpdate();
}

browser.runtime.onInstalled.addListener((details) => {
    initializeExtension();
    if (details.reason === "install") {
        SharedSettings.requestSettingsFromCompanion();
    }
});
browser.runtime.onStartup.addListener(initializeExtension);

// Runs every time the background page loads. Restarts the clock if the alarm is gone
// (e.g. after the add-on is disabled and re-enabled); does nothing extra on a normal
// wake from an alarm.
browser.alarms.get(ALARM_NAME).then((alarm) => {
    if (!alarm) initializeExtension();
});
