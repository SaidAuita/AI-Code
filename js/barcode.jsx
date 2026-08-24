/**
 * AI Code - ExtendScript Backend (ES3 Compatible)
 * Creates vector EAN-13 barcodes and QR Codes in Adobe Illustrator.
 */
//@target illustrator

var AICodeBackend = (function () {
    'use strict';

    var PT_TO_MM = 2.834645668;
    var MM_TO_PT = 0.352777778;

    // Pure black CMYK color (100% K)
    function makePureBlackCMYK() {
        var col = new CMYKColor();
        col.cyan = 0;
        col.magenta = 0;
        col.yellow = 0;
        col.black = 100;
        return col;
    }

    // Pure black RGB color (0, 0, 0)
    function makePureBlackRGB() {
        var col = new RGBColor();
        col.red = 0;
        col.green = 0;
        col.blue = 0;
        return col;
    }

    // Pure white CMYK color (0% CMYK)
    function makePureWhiteCMYK() {
        var col = new CMYKColor();
        col.cyan = 0;
        col.magenta = 0;
        col.yellow = 0;
        col.black = 0;
        return col;
    }

    // Pure white RGB color (255, 255, 255)
    function makePureWhiteRGB() {
        var col = new RGBColor();
        col.red = 255;
        col.green = 255;
        col.blue = 255;
        return col;
    }

    function getPureBlack(doc) {
        if (doc && doc.documentColorSpace === DocumentColorSpace.RGB) {
            return makePureBlackRGB();
        }
        return makePureBlackCMYK();
    }

    function getPureWhite(doc) {
        if (doc && doc.documentColorSpace === DocumentColorSpace.RGB) {
            return makePureWhiteRGB();
        }
        return makePureWhiteCMYK();
    }

    function getTargetLayer(doc, addLay, layName) {
        if (!addLay || !layName || layName.length === 0) {
            return doc.activeLayer;
        }
        try {
            return doc.layers.getByName(layName);
        } catch (e) {
            var newLayer = doc.layers.add();
            newLayer.name = layName;
            return newLayer;
        }
    }

    /**
     * Returns a sorted list of all unique font family names installed in Illustrator.
     */
    function getInstalledFontFamilies() {
        var fontMap = {};
        var families = [];
        try {
            var total = app.textFonts.length;
            for (var i = 0; i < total; i++) {
                var f = app.textFonts[i];
                var fam = f.family;
                if (fam && !fontMap[fam]) {
                    fontMap[fam] = true;
                    families.push(fam);
                }
            }
            families.sort();
        } catch (e) {}
        return JSON.stringify(families);
    }

    function findPreferredFont(fontNames) {
        if (!fontNames || fontNames.length === 0) return null;
        for (var i = 0; i < fontNames.length; i++) {
            try {
                var f = textFonts.getByName(fontNames[i]);
                if (f) return f;
            } catch (e) {}
        }
        return null;
    }

    /**
     * Finds installed font by Family Name and Weight (light, normal, bold)
     */
    function getFontByFamilyAndWeight(family, weight) {
        if (!family || family === 'default' || family === 'Arial / Helvetica (Default)') {
            family = 'Arial';
        }

        var weightTerms = [];
        if (weight === 'bold') {
            weightTerms = ['Bold', 'Black', 'Heavy', 'Semibold', 'Medium'];
        } else if (weight === 'light') {
            weightTerms = ['Light', 'Thin', 'UltraLight', 'ExtraLight', 'Book'];
        } else {
            weightTerms = ['Regular', 'Roman', 'Normal', 'Book', 'Plain'];
        }

        var fallbackFamilyFont = null;
        var total = app.textFonts.length;
        var famLower = family.toLowerCase();

        // 1. Search in app.textFonts matching family and weight style
        for (var i = 0; i < total; i++) {
            try {
                var f = app.textFonts[i];
                if (f.family && f.family.toLowerCase() === famLower) {
                    if (!fallbackFamilyFont) fallbackFamilyFont = f;
                    var style = f.style || '';
                    for (var w = 0; w < weightTerms.length; w++) {
                        if (style.toLowerCase().indexOf(weightTerms[w].toLowerCase()) !== -1) {
                            return f;
                        }
                    }
                }
            } catch (e1) {}
        }

        if (fallbackFamilyFont) return fallbackFamilyFont;

        // 2. Direct PostScript name lookup
        try {
            return textFonts.getByName(family);
        } catch (e2) {}

        // 3. Fallbacks: Arial, Helvetica, Myriad Pro
        var fallbackList = ['ArialMT', 'Arial-Regular', 'Helvetica', 'Helvetica-Regular', 'MyriadPro-Regular'];
        if (weight === 'bold') {
            fallbackList = ['Arial-BoldMT', 'Arial-Bold', 'Helvetica-Bold', 'MyriadPro-Bold'].concat(fallbackList);
        } else if (weight === 'light') {
            fallbackList = ['Arial-LightMT', 'Helvetica-Light', 'MyriadPro-Light'].concat(fallbackList);
        }

        var res = findPreferredFont(fallbackList);
        if (res) return res;

        try {
            return app.textFonts[0];
        } catch (e3) {
            return null;
        }
    }

    function getTargetPosition(doc, posMode) {
        var ab = doc.artboards[doc.artboards.getActiveArtboardIndex()];
        var abRect = ab.artboardRect; // [left, top, right, bottom]
        var abCenterX = (abRect[0] + abRect[2]) / 2;
        var abCenterY = (abRect[1] + abRect[3]) / 2;

        if (posMode === 'selection_center' && doc.selection && doc.selection.length > 0) {
            var sLeft = Infinity, sTop = -Infinity, sRight = -Infinity, sBottom = Infinity;
            for (var i = 0; i < doc.selection.length; i++) {
                var b = doc.selection[i].geometricBounds;
                if (b[0] < sLeft) sLeft = b[0];
                if (b[1] > sTop) sTop = b[1];
                if (b[2] > sRight) sRight = b[2];
                if (b[3] < sBottom) sBottom = b[3];
            }
            if (sLeft !== Infinity) {
                return {
                    x: (sLeft + sRight) / 2,
                    y: (sTop + sBottom) / 2
                };
            }
        }

        return {
            x: abCenterX,
            y: abCenterY
        };
    }

    /**
     * Generates EAN-13 Vector Barcode
     */
    function renderEAN13(opts) {
        if (app.documents.length === 0) {
            return JSON.stringify({ success: false, error: 'No active document in Illustrator' });
        }

        var doc = app.activeDocument;
        var layer = getTargetLayer(doc, opts.addLay, opts.layName);
        var fgColor = getPureBlack(doc);
        var targetPos = getTargetPosition(doc, opts.positionMode);

        var moduleW = opts.moduleWidth || (0.33 * PT_TO_MM);
        var barH = opts.barHeight || (22.85 * PT_TO_MM);
        var guardExt = opts.guardExtension || (1.65 * PT_TO_MM);
        var bwr = opts.bwr || 0; // Bar Width Reduction in pt
        var quietLeft = opts.quietZoneLeft || 11;
        var quietRight = opts.quietZoneRight || 7;
        var totalModules = opts.totalModules || 95;
        var totalWidthModules = quietLeft + totalModules + quietRight;
        var totalWidthPt = totalWidthModules * moduleW;

        // Create main container group
        var mainGroup = layer.groupItems.add();
        mainGroup.name = 'EAN13_' + (opts.code || 'Barcode');

        // Digits Font & Placement Calculation (Standard GS1 Layout)
        var font = getFontByFamilyAndWeight(opts.fontFamily, opts.fontWeight || 'normal');
        var fSize = opts.fontSize || 10; // in pt
        if (fSize < 4) fSize = 4;

        // Top of digits is placed directly underneath the shorter data bars (at y = -barH)
        var textTop = -barH - (0.25 * PT_TO_MM);

        // Optional Background Box
        if (opts.addBg) {
            var bgCol = getPureWhite(doc);
            var totalContentH = opts.showText ? (barH + (fSize * 1.15)) : (barH + guardExt);
            var bgHeight = totalContentH + (2.5 * PT_TO_MM);
            var bgTop = (1.5 * PT_TO_MM);
            var bgLeft = 0;
            var bgRect = mainGroup.pathItems.rectangle(bgTop, bgLeft, totalWidthPt, bgHeight);
            bgRect.stroked = false;
            bgRect.filled = true;
            bgRect.fillColor = bgCol;
            bgRect.name = 'Background';
        }

        // Bars Group
        var barsGroup = mainGroup.groupItems.add();
        barsGroup.name = 'Bars';

        var bars = opts.bars || [];
        for (var i = 0; i < bars.length; i++) {
            var bar = bars[i];
            var barW = (bar.widthModules * moduleW) - bwr;
            if (barW < 0.1) barW = 0.1;

            var barL = (quietLeft + bar.startModule) * moduleW + (bwr / 2);
            var barT = 0;
            var currentBarH = bar.isGuard ? (barH + guardExt) : barH;

            var p = barsGroup.pathItems.rectangle(barT, barL, barW, currentBarH);
            p.stroked = false;
            p.filled = true;
            p.fillColor = fgColor;
        }

        // Digits Text (Snug against data bars with guard bars extending alongside)
        if (opts.showText) {
            // Text Group
            var textGroup = mainGroup.groupItems.add();
            textGroup.name = 'Digits';

            // 1. First digit (placed outside left guard)
            if (opts.firstDigit) {
                var tfFirst = textGroup.textFrames.add();
                tfFirst.contents = opts.firstDigit;
                tfFirst.top = textTop;
                tfFirst.left = (quietLeft * moduleW) - (fSize * 0.72);
                var trFirst = tfFirst.textRange;
                trFirst.characterAttributes.size = fSize;
                if (font) trFirst.characterAttributes.textFont = font;
                trFirst.characterAttributes.fillColor = fgColor;
            }

            // 2. Left 6 digits (modules 3 to 45, width = 42 modules)
            if (opts.leftText) {
                var tfLeft = textGroup.textFrames.add();
                tfLeft.contents = opts.leftText;
                var leftBlockStart = (quietLeft + 3) * moduleW;
                tfLeft.top = textTop;
                tfLeft.left = leftBlockStart + (moduleW * 0.8);
                var trLeft = tfLeft.textRange;
                trLeft.characterAttributes.size = fSize;
                trLeft.characterAttributes.tracking = 65;
                if (font) trLeft.characterAttributes.textFont = font;
                trLeft.characterAttributes.fillColor = fgColor;
            }

            // 3. Right 6 digits (modules 50 to 92, width = 42 modules)
            if (opts.rightText) {
                var tfRight = textGroup.textFrames.add();
                tfRight.contents = opts.rightText;
                var rightBlockStart = (quietLeft + 50) * moduleW;
                tfRight.top = textTop;
                tfRight.left = rightBlockStart + (moduleW * 0.8);
                var trRight = tfRight.textRange;
                trRight.characterAttributes.size = fSize;
                trRight.characterAttributes.tracking = 65;
                if (font) trRight.characterAttributes.textFont = font;
                trRight.characterAttributes.fillColor = fgColor;
            }

            // Optional: convert text to vector outlines
            if (opts.outlineText) {
                try {
                    for (var t = textGroup.textFrames.length - 1; t >= 0; t--) {
                        textGroup.textFrames[t].createOutline();
                    }
                } catch (eTextOutline) {}
            }
        }

        // Center on target position
        var groupBounds = mainGroup.geometricBounds; // [left, top, right, bottom]
        var curCenterX = (groupBounds[0] + groupBounds[2]) / 2;
        var curCenterY = (groupBounds[1] + groupBounds[3]) / 2;

        mainGroup.left += (targetPos.x - curCenterX);
        mainGroup.top += (targetPos.y - curCenterY);

        doc.selection = [mainGroup];
        app.redraw();

        return JSON.stringify({ success: true, name: mainGroup.name });
    }

    /**
     * Generates QR Code Vector Matrix
     */
    function renderQRCode(opts) {
        if (app.documents.length === 0) {
            return JSON.stringify({ success: false, error: 'No active document in Illustrator' });
        }

        var doc = app.activeDocument;
        var layer = getTargetLayer(doc, opts.addLay, opts.layName);
        var fgColor = getPureBlack(doc);
        var targetPos = getTargetPosition(doc, opts.positionMode);

        var moduleSize = opts.moduleSize || (1 * PT_TO_MM);
        var totalModules = opts.totalModules || 29;
        var totalSizePt = totalModules * moduleSize;

        var mainGroup = layer.groupItems.add();
        mainGroup.name = 'QRCode_' + (opts.text ? opts.text.substring(0, 15).replace(/[\r\n]+/g, ' ') : 'Code');

        // Optional Background Box
        if (opts.addBg) {
            var bgCol = getPureWhite(doc);
            var bgRect = mainGroup.pathItems.rectangle(0, 0, totalSizePt, totalSizePt);
            bgRect.stroked = false;
            bgRect.filled = true;
            bgRect.fillColor = bgCol;
            bgRect.name = 'Background';
        }

        // Modules Group
        var modulesGroup = mainGroup.groupItems.add();
        modulesGroup.name = 'Modules';

        var rects = opts.rects || [];
        var compound = null;
        if (opts.asCompoundPath) {
            compound = modulesGroup.compoundPathItems.add();
        }

        for (var i = 0; i < rects.length; i++) {
            var r = rects[i];
            var rL = r.x * moduleSize;
            var rT = -(r.y * moduleSize);
            var rW = r.width * moduleSize;
            var rH = r.height * moduleSize;

            var path;
            if (compound) {
                path = compound.pathItems.rectangle(rT, rL, rW, rH);
            } else {
                path = modulesGroup.pathItems.rectangle(rT, rL, rW, rH);
            }
            path.stroked = false;
            path.filled = true;
            path.fillColor = fgColor;
        }

        if (compound) {
            compound.stroked = false;
            compound.filled = true;
            compound.fillColor = fgColor;
        }

        // Center on target position
        var groupBounds = mainGroup.geometricBounds; // [left, top, right, bottom]
        var curCenterX = (groupBounds[0] + groupBounds[2]) / 2;
        var curCenterY = (groupBounds[1] + groupBounds[3]) / 2;

        mainGroup.left += (targetPos.x - curCenterX);
        mainGroup.top += (targetPos.y - curCenterY);

        doc.selection = [mainGroup];
        app.redraw();

        return JSON.stringify({ success: true, name: mainGroup.name });
    }

    return {
        getInstalledFontFamilies: getInstalledFontFamilies,
        renderEAN13: renderEAN13,
        renderQRCode: renderQRCode
    };
})();

// Global dispatch wrappers for CSInterface.evalScript
function getInstalledFontFamilies() {
    return AICodeBackend.getInstalledFontFamilies();
}

function generateEAN13(optsJson) {
    try {
        var opts = (typeof optsJson === 'string') ? JSON.parse(optsJson) : optsJson;
        return AICodeBackend.renderEAN13(opts);
    } catch (e) {
        return JSON.stringify({ success: false, error: e.message || String(e) });
    }
}

function generateQRCode(optsJson) {
    try {
        var opts = (typeof optsJson === 'string') ? JSON.parse(optsJson) : optsJson;
        return AICodeBackend.renderQRCode(opts);
    } catch (e) {
        return JSON.stringify({ success: false, error: e.message || String(e) });
    }
}
