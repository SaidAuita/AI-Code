/**
 * QR Code Engine wrapper
 * Generates matrix and optimized vector rectangles for vector rendering.
 * Supports: Web Hyperlink, Plain Text, Text Message (SMS), Email, Business Card (vCard)
 * Supports: Center Logo Cutout (empty rectangular area in the center for custom logo placement)
 */
var QREngine = (function () {
    'use strict';

    /**
     * Formats structured data into standard QR payload string.
     */
    function formatPayload(type, data) {
        if (!data) return '';
        switch (type) {
            case 'url':
                var url = (data.url || '').trim();
                if (url && !/^https?:\/\//i.test(url) && !/^ftp:\/\//i.test(url)) {
                    url = 'https://' + url;
                }
                return url;

            case 'plain':
                return data.text || '';

            case 'sms':
                var phone = (data.phone || '').trim();
                var msg = data.message || '';
                return 'SMSTO:' + phone + ':' + msg;

            case 'email':
                var to = (data.to || '').trim();
                var sub = data.subject || '';
                var body = data.body || '';
                return 'MATMSG:TO:' + to + ';SUB:' + sub + ';BODY:' + body + ';;';

            case 'vcard':
                var lines = [
                    'BEGIN:VCARD',
                    'VERSION:3.0'
                ];
                var fn = ((data.firstName || '') + ' ' + (data.lastName || '')).trim();
                var n = (data.lastName || '') + ';' + (data.firstName || '') + ';;;';
                if (n !== ';;;;') lines.push('N:' + n);
                if (fn) lines.push('FN:' + fn);
                if (data.organization) lines.push('ORG:' + data.organization.trim());
                if (data.title) lines.push('TITLE:' + data.title.trim());
                if (data.cellPhone) lines.push('TEL;TYPE=CELL:' + data.cellPhone.trim());
                if (data.workPhone) lines.push('TEL;TYPE=WORK,VOICE:' + data.workPhone.trim());
                if (data.email) lines.push('EMAIL;TYPE=WORK,INTERNET:' + data.email.trim());
                if (data.website) lines.push('URL:' + data.website.trim());
                
                var hasAddr = data.street || data.city || data.state || data.zip || data.country;
                if (hasAddr) {
                    var adr = ';;' + (data.street || '') + ';' + (data.city || '') + ';' + (data.state || '') + ';' + (data.zip || '') + ';' + (data.country || '');
                    lines.push('ADR;TYPE=WORK:' + adr);
                }
                lines.push('END:VCARD');
                return lines.join('\n');

            default:
                return data.text || '';
        }
    }

    /**
     * Encodes string data into QR Matrix and merged vector rectangle runs.
     * 
     * @param {string} rawText - The payload string to encode
     * @param {string} ecc - Error Correction Level ('L', 'M', 'Q', 'H')
     * @param {number} quietZone - Margin in modules (0 - 10, default 4)
     * @param {number} logoCutoutPercent - Optional center logo cutout size in % of total width (0 - 30)
     * @returns {object} Encoding result
     */
    function encode(rawText, ecc, quietZone, logoCutoutPercent) {
        if (!rawText || typeof rawText !== 'string' || rawText.trim().length === 0) {
            return { valid: false, error: 'Enter content to encode' };
        }

        ecc = ecc || 'M';
        if (typeof quietZone !== 'number' || isNaN(quietZone) || quietZone < 0) {
            quietZone = 4;
        }

        logoCutoutPercent = parseFloat(logoCutoutPercent) || 0;
        if (logoCutoutPercent < 0) logoCutoutPercent = 0;
        if (logoCutoutPercent > 32) logoCutoutPercent = 32; // Limit to safe max recovery area

        try {
            var qr = qrcode(0, ecc);
            qr.addData(rawText, 'Byte');
            qr.make();

            var moduleCount = qr.getModuleCount();
            var totalModules = moduleCount + quietZone * 2;
            var matrix = [];
            var rects = []; // Merged horizontal runs for fast, clean vector drawing

            // Calculate center cutout box if enabled
            var cutoutInfo = null;
            var cMin = -1, cMax = -1;
            if (logoCutoutPercent > 0) {
                var cutoutSize = Math.max(3, Math.round(moduleCount * (logoCutoutPercent / 100)));
                // Symmetrical parity
                if (cutoutSize % 2 !== moduleCount % 2) {
                    cutoutSize++;
                }
                cMin = Math.floor((moduleCount - cutoutSize) / 2);
                cMax = cMin + cutoutSize - 1;

                cutoutInfo = {
                    x: cMin + quietZone,
                    y: cMin + quietZone,
                    size: cutoutSize
                };
            }

            for (var row = 0; row < moduleCount; row++) {
                var rowData = [];
                var runStart = -1;
                var runLength = 0;

                for (var col = 0; col < moduleCount; col++) {
                    var isDark = qr.isDark(row, col);

                    // Check if inside center logo cutout
                    if (cutoutInfo && row >= cMin && row <= cMax && col >= cMin && col <= cMax) {
                        isDark = false;
                    }

                    rowData.push(isDark);

                    if (isDark) {
                        if (runStart === -1) {
                            runStart = col;
                            runLength = 1;
                        } else {
                            runLength++;
                        }
                    } else {
                        if (runStart !== -1) {
                            rects.push({
                                x: runStart + quietZone,
                                y: row + quietZone,
                                width: runLength,
                                height: 1
                            });
                            runStart = -1;
                            runLength = 0;
                        }
                    }
                }
                if (runStart !== -1) {
                    rects.push({
                        x: runStart + quietZone,
                        y: row + quietZone,
                        width: runLength,
                        height: 1
                    });
                }
                matrix.push(rowData);
            }

            return {
                valid: true,
                text: rawText,
                ecc: ecc,
                quietZone: quietZone,
                logoCutoutPercent: logoCutoutPercent,
                cutoutInfo: cutoutInfo,
                moduleCount: moduleCount,
                totalModules: totalModules,
                matrix: matrix,
                rects: rects
            };
        } catch (e) {
            return {
                valid: false,
                error: 'Data too long for QR Code: ' + (e.message || e)
            };
        }
    }

    return {
        formatPayload: formatPayload,
        encode: encode
    };
})();
