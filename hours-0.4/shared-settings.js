// Shared settings service to sync settings between clock extensions
const SharedSettings = {
  // IDs of the companion extensions
  HOURS_EXTENSION_ID: "jccalhoun@gmail.com",
  MINUTES_EXTENSION_ID: "jccalhoun-minutes-extension-id@gmail.com",
  
  // Initialize by adding listeners for external messages
  init: function() {
    const currentExtensionId = browser.runtime.id;
    if (
      currentExtensionId !== this.HOURS_EXTENSION_ID &&
      currentExtensionId !== this.MINUTES_EXTENSION_ID
    ) {
      console.warn("SharedSettings: Current Extension ID does not match any known ID. Sync will fail.");
    }

    // Listen for messages from companion extension
    browser.runtime.onMessageExternal.addListener(
    this.handleExternalMessage.bind(this)
	);
    console.log("SharedSettings initialized - listening for external messages");
  },
  
  // Handle incoming message from the companion extension
  handleExternalMessage: function(message, sender) {
    console.log("Received external message from:", sender.id, message);
    
    // Verify the message comes from a trusted extension
    if (
      sender.id === SharedSettings.HOURS_EXTENSION_ID || 
      sender.id === SharedSettings.MINUTES_EXTENSION_ID
    ) {
      // Apply the received settings
      if (message.action === "syncSettings") {
        SharedSettings.applyReceivedSettings(message.settings);
		
		// Broadcast to all windows that settings have been updated
        browser.runtime.sendMessage({
          action: "settingsUpdated",
          settings: message.settings
        });
      }
    }
  },
  
  // Apply settings received from companion extension
  applyReceivedSettings: function(settings) {
    console.log("Applying received settings:", settings);
    
    // Store settings locally
    browser.storage.sync.set(settings).then(() => {
      console.log("Settings synchronized successfully");
      
    }).catch(error => {
      console.error("Error applying settings:", error);
    });
  },
  
  // Sync settings to the companion extension
  syncSettings: function(settings) {
    console.log("Syncing settings to companion extension:", settings);
    
    try {
		const currentExtensionId = browser.runtime.id;
		const targetExtensionId = currentExtensionId === this.HOURS_EXTENSION_ID ? 
                             this.MINUTES_EXTENSION_ID : this.HOURS_EXTENSION_ID;
    
		if (!browser.runtime.sendMessage) {
		  console.error("SYNC: browser.runtime.sendMessage is not available");
		  return;
        }
    
        console.log("SYNC: Sending message to:", targetExtensionId);
        browser.runtime.sendMessage(targetExtensionId, {
          action: "syncSettings",
          settings: settings
        }).catch(error => {
          console.error("SYNC: Error sending message:", error.message);
        });
    } catch (error) {
      console.error("SYNC: Error in syncSettings:", error);
    }
  }
};

// Initialize the shared settings service
SharedSettings.init();