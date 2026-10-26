// Shared settings service to sync settings between the two clock extensions.
// Each extension has its own storage, so settings are copied across by messaging.
// The background script calls SharedSettings.init(); the popup and options page
// only use syncSettings().
const SharedSettings = {
  // IDs of the companion extensions (must match browser_specific_settings.gecko.id
  // in each manifest.json)
  HOURS_EXTENSION_ID: "clock-hours@jccalhoun",
  MINUTES_EXTENSION_ID: "clock-minutes@jccalhoun",

  // Settings that are copied to a newly installed companion
  SYNCED_KEYS: ["useCustomColor", "customColor", "recentColors", "use24HourFormat", "showLeadingZero", "clockFont", "clockFontSize"],

  // Returns the ID of the other extension
  getCompanionId: function() {
    return browser.runtime.id === this.HOURS_EXTENSION_ID
      ? this.MINUTES_EXTENSION_ID
      : this.HOURS_EXTENSION_ID;
  },

  // Start listening for messages from the companion extension (background page only)
  init: function() {
    const currentExtensionId = browser.runtime.id;
    if (
      currentExtensionId !== this.HOURS_EXTENSION_ID &&
      currentExtensionId !== this.MINUTES_EXTENSION_ID
    ) {
      console.warn("SharedSettings: Current Extension ID does not match any known ID. Sync will fail.");
    }

    browser.runtime.onMessageExternal.addListener(this.handleExternalMessage.bind(this));
  },

  // Handle an incoming message from the companion extension
  handleExternalMessage: function(message, sender) {
    // Only accept messages from the two clock extensions
    if (sender.id !== this.HOURS_EXTENSION_ID && sender.id !== this.MINUTES_EXTENSION_ID) {
      return;
    }

    if (message.action === "syncSettings") {
      // The background script's storage.onChanged listener redraws the icon
      return browser.storage.sync.set(message.settings);
    }

    if (message.action === "requestSettings") {
      // The companion was just installed and wants our current settings
      return browser.storage.sync.get(this.SYNCED_KEYS);
    }
  },

  // Send changed settings to the companion extension
  syncSettings: function(settings) {
    return browser.runtime.sendMessage(this.getCompanionId(), {
      action: "syncSettings",
      settings: settings
    }).catch(error => {
      // Expected when the companion isn't installed
      console.info("SharedSettings: companion not reachable:", error.message);
    });
  },

  // On first install, copy the companion's existing settings (if it's installed)
  requestSettingsFromCompanion: function() {
    return browser.runtime.sendMessage(this.getCompanionId(), { action: "requestSettings" })
      .then(settings => {
        if (settings && Object.keys(settings).length) {
          return browser.storage.sync.set(settings);
        }
      })
      .catch(() => {
        // Companion not installed; keep the defaults
      });
  }
};
