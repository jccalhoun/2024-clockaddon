// =================================================================
// CLOCK ICON LAYOUT (shared by Clock Hours and Clock Minutes)
// =================================================================
// Both add-ons draw their digits at the same font size so the two icons
// read as one clock. The size is the largest at which the widest hours
// icon (two digits plus a colon) fits, and Clock Minutes uses that same size.
//
// Glyph edges are measured by drawing the text on a scratch canvas and
// scanning its pixels, so the layout is tight regardless of font metrics.

const ClockLayout = {
    FONT_FAMILY: "Arial, Helvetica, sans-serif",
    MARGIN: 0,      // empty pixels kept at each edge (toolbar buttons have their own padding)
    COLON_GAP: 2,   // pixels between the hour digits and the colon

    // Overridable for testing outside a browser
    createCanvas: function(w, h) {
        const c = document.createElement("canvas");
        c.width = w;
        c.height = h;
        return c;
    },

    _sizeCache: {},
    _inkCache: {},

    font: function(size) {
        return `bold ${size}px ${this.FONT_FAMILY}`;
    },

    // Horizontal ink extent of `text` relative to its left-aligned origin:
    // { left, right } in pixels (right is exclusive)
    ink: function(text, size) {
        const key = size + "|" + text;
        if (this._inkCache[key]) return this._inkCache[key];

        const w = size * 4, h = size * 2, originX = size;
        const c = this.createCanvas(w, h);
        const ctx = c.getContext("2d");
        ctx.font = this.font(size);
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#000";
        ctx.fillText(text, originX, h / 2);

        const data = ctx.getImageData(0, 0, w, h).data;
        let minX = w, maxX = -1;
        for (let x = 0; x < w; x++) {
            for (let y = 0; y < h; y++) {
                if (data[(y * w + x) * 4 + 3] > 40) {
                    if (x < minX) minX = x;
                    maxX = x;
                    break;
                }
            }
        }
        const result = maxX < 0
            ? { left: 0, right: 0 }
            : { left: minX - originX, right: maxX + 1 - originX };
        this._inkCache[key] = result;
        return result;
    },

    inkWidth: function(text, size) {
        const i = this.ink(text, size);
        return i.right - i.left;
    },

    // Largest font size at which every two-digit hour plus the colon fits
    fontSize: function(width, height) {
        const key = width + "x" + height;
        if (this._sizeCache[key]) return this._sizeCache[key];

        const hours = [];
        for (let h = 0; h < 24; h++) hours.push(String(h).padStart(2, "0"));

        const maxInk = width - 2 * this.MARGIN;
        let size = 1;
        for (let s = height - 2 * this.MARGIN; s >= 1; s--) {
            const widest = Math.max(...hours.map(t => this.inkWidth(t, s)));
            if (widest + this.COLON_GAP + this.inkWidth(":", s) <= maxInk) {
                size = s;
                break;
            }
        }
        this._sizeCache[key] = size;
        return size;
    },

    // Clock Minutes: digits centered
    drawMinutes: function(context, width, height, text) {
        const size = this.fontSize(width, height);
        const ink = this.ink(text, size);
        context.font = this.font(size);
        context.textAlign = "left";
        context.textBaseline = "middle";
        context.fillText(text, (width - (ink.right - ink.left)) / 2 - ink.left, height / 2);
    },

    // Clock Hours: colon against the right edge (next to the minutes icon),
    // digits just before it
    drawHours: function(context, width, height, digits) {
        const size = this.fontSize(width, height);
        context.font = this.font(size);
        context.textAlign = "left";
        context.textBaseline = "middle";

        const colon = this.ink(":", size);
        const colonX = width - this.MARGIN - colon.right;
        context.fillText(":", colonX, height / 2);

        const d = this.ink(digits, size);
        const digitsX = colonX + colon.left - this.COLON_GAP - d.right;
        context.fillText(digits, digitsX, height / 2);
    }
};
