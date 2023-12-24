// Copyright 2021 Google LLC
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file or at
// https://developers.google.com/open-source/licenses/bsd

// Initialize the demo on install
chrome.runtime.onInstalled.addListener(({
    reason
}) => {
    if (reason !== chrome.runtime.OnInstalledReason.INSTALL) {
        return;
    }

    openDemoTab();

    // Create an alarm so we have something to look at in the demo
    chrome.alarms.create('demo-default-alarm', {
        delayInMinutes: 1,
        periodInMinutes: 1
    });
});

chrome.action.onClicked.addListener(openDemoTab);

function openDemoTab() {
    chrome.tabs.create({
        url: 'index.html'
    });
}


//below is my stuff
var textColor = "white";

function updateClock() {
    console.log('update clock was called');
    var date = new Date();
    /*var hours = date.getHours();
     if (hours > 12) {
            hours -= 12;
        } else if (hours === 0) {
            hours = 12;
        };*/
    //above is for hours. below is for minutes. 
    // var minutes=  date.getMinutes();
    var minutes = date.getSeconds();
    const canvas = new OffscreenCanvas(128, 128);

    const context = canvas.getContext("2d");
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#00FF00';
    context.font = "bold 26px sans-serif";
    //context.fillText(hours +":", 0, 25);
    //above is for hours. below is for minutes.
    context.fillText((minutes < 10 ? "0" : "") + minutes, 0, 25);

    const imageData = context.getImageData(0, 0, 26, 26);

    chrome.action.setIcon({
        imageData: imageData
    });
    setInterval(updateClock, 1000);
};
chrome.alarms.create("myAlarm", {
    periodInMinutes: 0.5
});
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "myAlarm") {
               updateClock();
    }
});
