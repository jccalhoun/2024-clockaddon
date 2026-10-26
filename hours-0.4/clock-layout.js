// =================================================================
// CLOCK ICON LAYOUT (shared by Clock Hours and Clock Minutes)
// =================================================================
// Both add-ons draw their digits in the same font and at the same size so the
// two icons read as one clock. The size is the largest at which every
// two-digit hour plus the colon fits the icon's width and the digits fit its
// height; Clock Minutes uses that same size.
//
// The font is a setting ("clockFont"): "builtin" uses the bundled Bebas Neue,
// anything else is the name of a font installed on the computer.
//
// Glyph edges are measured by drawing on a scratch canvas and scanning its
// pixels, so the layout is tight whatever the font's metrics.

const ClockLayout = {
    BUILTIN: "builtin",
    BUILTIN_FAMILY: "Clock Bebas Neue",
    BUILTIN_LABEL: "Bebas Neue (built-in)",
    BUILTIN_URL: "fonts/BebasNeue-Clock.woff2",

    MIN_SIZE: 8,    // range for a user-chosen font size, in pixels
    MAX_SIZE: 64,
    MARGIN: 0,      // empty pixels kept at each edge (toolbar buttons have their own padding)
    COLON_GAP: 2,   // pixels between the hour digits and the colon

    _fontKey: null,
    _sizeOverride: 0,   // 0 = use the recommended size
    _family: null,
    _weight: "normal",
    _builtinReady: null,
    _sizeCache: {},
    _inkCache: {},

    // --- Fonts ----------------------------------------------------------------

    // Keeps only characters that are safe inside a quoted CSS font-family name
    cleanFontName: function(name) {
        return String(name || "").replace(/[^\p{L}\p{N} ._-]/gu, "").trim().slice(0, 64);
    },

    // Loads the bundled font once (overridable for testing outside a browser)
    loadBuiltinFont: function() {
        if (!this._builtinReady) {
            const face = new FontFace(this.BUILTIN_FAMILY, `url(${this.BUILTIN_URL})`);
            this._builtinReady = face.load()
                .then(loaded => { document.fonts.add(loaded); })
                .catch(error => { console.error("ClockLayout: could not load built-in font:", error); });
        }
        return this._builtinReady;
    },

    // Selects the font to draw with. Resolves once it is ready to use.
    // A system font that isn't installed is drawn in the built-in font instead.
    setFont: async function(clockFont) {
        await this.loadBuiltinFont();
        const name = clockFont === this.BUILTIN ? "" : this.cleanFontName(clockFont);
        const key = name || this.BUILTIN;
        if (key === this._fontKey) return;

        this._fontKey = key;
        if (name && this.isFontInstalled(name)) {
            this._family = `"${name}", "${this.BUILTIN_FAMILY}"`;
            this._weight = "bold";
        } else {
            this._family = `"${this.BUILTIN_FAMILY}"`;
            this._weight = "normal";   // Bebas Neue is already heavy
        }
        this._sizeCache = {};
        this._inkCache = {};
    },

    font: function(size) {
        return `${this._weight} ${size}px ${this._family || '"' + this.BUILTIN_FAMILY + '"'}`;
    },

    // True if `name` is installed: text drawn in it differs in width from every
    // generic fallback. (Firefox has no API that lists installed fonts.)
    isFontInstalled: function(name) {
        const clean = this.cleanFontName(name);
        if (!clean) return false;
        const ctx = this.createCanvas(10, 10).getContext("2d");
        const sample = "0123456789:mmmwwwlli";
        return ["monospace", "serif", "sans-serif"].some(base => {
            ctx.font = `72px ${base}`;
            const baseWidth = ctx.measureText(sample).width;
            ctx.font = `72px "${clean}", ${base}`;
            return ctx.measureText(sample).width !== baseWidth;
        });
    },

    // --- Measuring ------------------------------------------------------------

    // Overridable for testing outside a browser
    createCanvas: function(w, h) {
        const c = document.createElement("canvas");
        c.width = w;
        c.height = h;
        return c;
    },

    // Ink extent of `text` drawn at `size` with textAlign "left" and
    // textBaseline "middle", relative to the drawing origin:
    // { left, right, top, bottom } in pixels (right and bottom exclusive)
    ink: function(text, size) {
        const key = size + "|" + text;
        if (this._inkCache[key]) return this._inkCache[key];

        const w = size * 4, h = size * 3, ox = size, oy = Math.round(h / 2);
        const ctx = this.createCanvas(w, h).getContext("2d");
        ctx.font = this.font(size);
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#000";
        ctx.fillText(text, ox, oy);

        const data = ctx.getImageData(0, 0, w, h).data;
        let minX = w, maxX = -1, minY = h, maxY = -1;
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                if (data[(y * w + x) * 4 + 3] > 40) {
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    maxY = y;
                }
            }
        }
        const result = maxX < 0
            ? { left: 0, right: 0, top: 0, bottom: 0 }
            : { left: minX - ox, right: maxX + 1 - ox, top: minY - oy, bottom: maxY + 1 - oy };
        this._inkCache[key] = result;
        return result;
    },

    _fits: function(size, width, height) {
        let widest = 0;
        for (let h = 0; h < 24; h++) {
            const i = this.ink(String(h).padStart(2, "0"), size);
            widest = Math.max(widest, i.right - i.left);
        }
        const colon = this.ink(":", size);
        const digits = this.ink("0123456789", size);
        return widest + this.COLON_GAP + (colon.right - colon.left) <= width - 2 * this.MARGIN &&
               digits.bottom - digits.top <= height - 2 * this.MARGIN;
    },

    // Uses a fixed font size instead of the recommended one; 0 (or anything
    // invalid) goes back to the recommended size.
    setSize: function(size) {
        const n = Math.round(Number(size));
        this._sizeOverride = Number.isFinite(n) && n >= this.MIN_SIZE
            ? Math.min(n, this.MAX_SIZE)
            : 0;
    },

    // The size to draw at: the user's chosen size, or the recommended one
    fontSize: function(width, height) {
        return this._sizeOverride || this.recommendedSize(width, height);
    },

    // Largest font size that fits (binary search; width and height grow with size)
    recommendedSize: function(width, height) {
        const key = width + "x" + height;
        if (this._sizeCache[key]) return this._sizeCache[key];
        let lo = 4, hi = height * 2;
        while (lo < hi) {
            const mid = Math.ceil((lo + hi) / 2);
            if (this._fits(mid, width, height)) lo = mid; else hi = mid - 1;
        }
        this._sizeCache[key] = lo;
        return lo;
    },

    // Y position that vertically centers the digits' ink in the icon
    _baselineY: function(size, height) {
        const d = this.ink("0123456789", size);
        return height / 2 - (d.top + d.bottom) / 2;
    },

    // --- Drawing --------------------------------------------------------------

    // Clock Minutes: digits centered
    drawMinutes: function(context, width, height, text) {
        const size = this.fontSize(width, height);
        const ink = this.ink(text, size);
        context.font = this.font(size);
        context.textAlign = "left";
        context.textBaseline = "middle";
        context.fillText(text, (width - (ink.right - ink.left)) / 2 - ink.left, this._baselineY(size, height));
    },

    // Clock Hours: colon against the right edge (next to the minutes icon),
    // digits just before it
    drawHours: function(context, width, height, digits) {
        const size = this.fontSize(width, height);
        const y = this._baselineY(size, height);
        context.font = this.font(size);
        context.textAlign = "left";
        context.textBaseline = "middle";

        const colon = this.ink(":", size);
        const colonX = width - this.MARGIN - colon.right;
        context.fillText(":", colonX, y);

        const d = this.ink(digits, size);
        context.fillText(digits, colonX + colon.left - this.COLON_GAP - d.right, y);
    },

    // --- Color ----------------------------------------------------------------

    // The digit color: the custom color if one is set, otherwise the theme's
    // toolbar text color, otherwise dark or light to match the system.
    pickColor: function(settings, theme) {
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
};
