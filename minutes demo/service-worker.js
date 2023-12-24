// This is the service worker script, which executes in its own context
// when the extension is installed or refreshed (or when you access its console).
// It would correspond to the background script in chrome extensions v2.

console.log("This prints to the console of the service worker (background script)")

// Importing and using functionality from external files is also possible.
importScripts('service-worker-utils.js')
var textColor = "white";
// If you want to import a file that is deeper in the file hierarchy of your
// extension, simply do `importScripts('path/to/file.js')`.
// The path should be relative to the file `manifest.json`.
//https://developer.chrome.com/docs/extensions/reference/api/action 
//https://www.w3schools.com/jsref/api_canvas.asp
  function updateClock() {
		var date = new Date();
		/*var hours = date.getHours();
     if (hours > 12) {
            hours -= 12;
        } else if (hours === 0) {
            hours = 12;
        };*/
       //above is for hours. below is for minutes. 
     // var minutes=  date.getMinutes();
      var minutes=  date.getSeconds();
const canvas = new OffscreenCanvas(128, 128);

  const context = canvas.getContext("2d");
context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#00FF00';
  context.font = "bold 26px sans-serif";
  //context.fillText(hours +":", 0, 25);
  //above is for hours. below is for minutes.
       context.fillText((minutes<10? "0": "") + minutes, 0, 25);

  const imageData = context.getImageData(0, 0, 26, 26);

  chrome.action.setIcon({imageData: imageData});
      setInterval(updateClock, 1000);
  }
updateClock();