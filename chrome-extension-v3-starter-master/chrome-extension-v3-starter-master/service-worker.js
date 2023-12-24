// This is the service worker script, which executes in its own context
// when the extension is installed or refreshed (or when you access its console).
// It would correspond to the background script in chrome extensions v2.
var fillColor = '#00FF00';  // Green
console.log("This prints to the console of the service worker (background script)")

// Importing and using functionality from external files is also possible.
importScripts('service-worker-utils.js')

// If you want to import a file that is deeper in the file hierarchy of your
// extension, simply do `importScripts('path/to/file.js')`.
// The path should be relative to the file `manifest.json`.
chrome.storage.sync.get(["favoriteColor"]).then((result) => {
    console.log("Value currently is " + result.favoriteColor);
    fillColor = result.favoriteColor;
    console.log (fillColor);
    //this isn't called until after the contextfillStyle below is called if the canvas stuff is outside this? I don't know why. this works if you reload the extension. so I need to figure out that. 
 
const canvas = new OffscreenCanvas(16, 16);
const context = canvas.getContext('2d');

context.clearRect(0, 0, 16, 16);
context.fillStyle = fillColor;
console.log (fillColor);
context.fillRect(0, 0, 16, 16);
const imageData = context.getImageData(0, 0, 16, 16);
chrome.action.setIcon({imageData: imageData}, () => { /* ... */ });
     });
