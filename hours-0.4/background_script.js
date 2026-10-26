const ALARM_NAME = "update-clock-hour";

const canvas = document.createElement("canvas");
canvas.width = 32;
canvas.height = 32;
const context = canvas.getContext("2d");

// Listen for messages from the companion add-on (Clock Minutes)
SharedSettings.init();

// Listen for messages from the popup/options page to trigger an immediate update.
// These also wake the background page if it has been suspended.
browser.runtime.onMessage.addListener((message) => {
    if (message.colorChanged || message.displayChanged || message.fontChanged) {
        updateClock();
    }
});

// Redraw on any settings change: local saves, the companion add-on, or Firefox Sync
browser.storage.onChanged.addListener((changes, area) => {
    if (area === "sync") updateClock();
});

// Redraw when the browser theme changes
browser.theme.onUpdated.addListener(() => updateClock());

// Update the clock icon. Fetches settings every time so it never draws stale values.
async function updateClock() {
    try {
        // 1. Get all settings from storage and the current theme at the same time
        const [settings, theme] = await Promise.all([
            browser.storage.sync.get({
                useCustomColor: false,
                customColor: "#ffffff",
                clockFont: ClockLayout.BUILTIN,
                use24HourFormat: false,
                showLeadingZero: false
            }),
            browser.theme.getCurrent().catch(() => ({}))
        ]);

        // 2. Determine the correct color to use
        const colorToUse = ClockLayout.pickColor(settings, theme);

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

        // 4. Draw the icon (same font and digit size in both add-ons; see clock-layout.js)
        await ClockLayout.setFont(settings.clockFont);
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = colorToUse;
        ClockLayout.drawHours(context, canvas.width, canvas.height, textToDraw);

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
