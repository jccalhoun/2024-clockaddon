const ALARM_NAME = "update-clock-minute";

// Listen for messages from the options page to trigger an immediate update
browser.runtime.onMessage.addListener((message) => {
    if (message.colorChanged) {
        console.log("Settings changed, forcing immediate update.");
        updateClock();
    }
});

// Update the clock icon. This function is now self-contained and fetches settings every time.
async function updateClock() {
    try {
        // 1. Get all settings from storage and the current theme at the same time
        const [settings, theme] = await Promise.all([
            browser.storage.sync.get({
                useCustomColor: false,
                customColor: "#ffffff"
            }),
            browser.theme.getCurrent().catch(() => ({})) // Add catch for safety
        ]);

        // 2. Determine the correct color to use
        let colorToUse;
        if (settings.useCustomColor) {
            colorToUse = settings.customColor;
        } else if (theme.colors && theme.colors.toolbar_text) {
            colorToUse = theme.colors.toolbar_text;
        } else {
            colorToUse = "white"; // Fallback default
        }
        
        // 3. Format the text to draw
        const date = new Date();
        const minutes = date.getMinutes();
        const textToDraw = String(minutes).padStart(2, '0');

        // 4. Create a canvas and draw the icon
        const canvas = document.createElement("canvas");
        canvas.width = 32;
        canvas.height = 32;
        const context = canvas.getContext("2d");
        context.clearRect(0, 0, canvas.width, canvas.height);

        // Dynamically find the best font size
        let bestFontSize = canvas.height;
        context.textAlign = "center";
        context.textBaseline = "middle";

        for (let currentSize = canvas.height; currentSize >= 1; currentSize--) {
            context.font = `bold ${currentSize}px Arial`;
            let metrics = context.measureText(textToDraw);
            if (metrics.width <= canvas.width - 2 && currentSize <= canvas.height - 2) {
                bestFontSize = currentSize;
                break;
            }
        }
        
        context.fillStyle = colorToUse;
        context.font = `bold ${bestFontSize}px Arial`;
        context.fillText(textToDraw, canvas.width / 2, canvas.height / 2);

        // 5. Update the browser action icon and title
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        browser.action.setIcon({ imageData });
        browser.action.setTitle({ title: date.toLocaleTimeString() });

    } catch (error) {
        console.error("Error updating clock:", error);
    }
}

// --- Alarms and Initialization ---

function scheduleNextUpdate() {
    const now = new Date();
    // Schedule alarm for the start of the next minute
    const delayInMinutes = (60 - now.getSeconds()) / 60;
    browser.alarms.create(ALARM_NAME, { delayInMinutes });
}

browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === ALARM_NAME) {
        updateClock();
        scheduleNextUpdate();
    }
});

// Initial setup when the extension is installed or the browser starts
function initializeExtension() {
    console.log("Clock Minutes Initializing...");
    updateClock();
    scheduleNextUpdate();
}

browser.runtime.onInstalled.addListener(initializeExtension);
browser.runtime.onStartup.addListener(initializeExtension);