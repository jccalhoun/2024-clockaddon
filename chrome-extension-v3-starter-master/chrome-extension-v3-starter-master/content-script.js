function onError(result) {
    console.error(`Google Visited Link Color: Could not access LocalStorage. Falling back to Red. Result ${result}`);
    sheet.insertRule('a:visited {color: #ff0000 !important}');
}

function onSuccess(result) {
    var color = '#FF0000';
    if (result.color) {
        color = result.color;
        console.log(`Google Visited Link Color: Successfully got color from LocalStorage, setting color to: ${color}`);
    } else {
        console.warn('Google Visited Link Color: Could not get color from LocalStorage, have you set a color? Falling back to Red.');
    }
    sheet.insertRule(`a:visited {color: ${color} !important}`);
}

var sheet = (function() {
    var style = document.createElement('style');
    document.head.appendChild(style);
    return style.sheet;
})();

browser.storage.local.get(["color"]).then(onSuccess, onError);