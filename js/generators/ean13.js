/**
 * EAN-13 Barcode Generator
 * GS1 / ISO/IEC 15420 Standard compliant encoder
 */
var EAN13 = (function () {
    'use strict';

    var L_CODE = [
        '0001101', '0011001', '0010011', '0111101', '0100011',
        '0110001', '0101111', '0111011', '0110111', '0001011'
    ];

    var G_CODE = [
        '0100111', '0110011', '0011011', '0100001', '0011101',
        '0111001', '0000101', '0010001', '0001001', '0010111'
    ];

    var R_CODE = [
        '1110010', '1100110', '1101100', '1000010', '1011100',
        '1001110', '1010000', '1000100', '1001000', '1110100'
    ];

    var PARITY_MAP = [
        ['L', 'L', 'L', 'L', 'L', 'L'], // 0
        ['L', 'L', 'G', 'L', 'G', 'G'], // 1
        ['L', 'L', 'G', 'G', 'L', 'G'], // 2
        ['L', 'L', 'G', 'G', 'G', 'L'], // 3
        ['L', 'G', 'L', 'L', 'G', 'G'], // 4
        ['L', 'G', 'G', 'L', 'L', 'G'], // 5
        ['L', 'G', 'G', 'G', 'L', 'L'], // 6
        ['L', 'G', 'L', 'G', 'L', 'G'], // 7
        ['L', 'G', 'L', 'G', 'G', 'L'], // 8
        ['L', 'G', 'G', 'L', 'G', 'L']  // 9
    ];

    /**
     * Calculates the 13th check digit for a 12-digit string using Modulo-10 algorithm.
     */
    function calculateChecksum(digits12) {
        var str = String(digits12).replace(/\D/g, '');
        if (str.length < 12) return null;
        var sum = 0;
        for (var i = 0; i < 12; i++) {
            var n = parseInt(str.charAt(i), 10);
            sum += (i % 2 === 0) ? n : n * 3;
        }
        var remainder = sum % 10;
        return remainder === 0 ? 0 : 10 - remainder;
    }

    /**
     * Validates input and returns clean 13-digit string or error.
     */
    function validate(rawInput) {
        var clean = String(rawInput || '').replace(/\s+/g, '').replace(/-/g, '');
        if (!/^\d+$/.test(clean)) {
            return { valid: false, error: 'Digits only (0-9)', code: '' };
        }
        if (clean.length === 12) {
            var chk = calculateChecksum(clean);
            return { valid: true, code: clean + chk, calculatedChecksum: true };
        }
        if (clean.length === 13) {
            var expectedChk = calculateChecksum(clean.slice(0, 12));
            var actualChk = parseInt(clean.charAt(12), 10);
            if (expectedChk !== actualChk) {
                return {
                    valid: false,
                    error: 'Invalid checksum! Expected ' + expectedChk + ', got ' + actualChk,
                    code: clean,
                    suggestedCode: clean.slice(0, 12) + expectedChk
                };
            }
            return { valid: true, code: clean, calculatedChecksum: false };
        }
        return { valid: false, error: 'Must be 12 or 13 digits (got ' + clean.length + ')', code: clean };
    }

    /**
     * Encodes 13 digits into 95-module binary sequence with guard metadata.
     * Returns bars array with position, width, and guard flag.
     */
    function encode(rawInput) {
        var valResult = validate(rawInput);
        if (!valResult.valid) {
            return {
                valid: false,
                error: valResult.error,
                suggestedCode: valResult.suggestedCode
            };
        }

        var code = valResult.code;
        var firstDigit = parseInt(code.charAt(0), 10);
        var parity = PARITY_MAP[firstDigit];

        // 95 modules total:
        // 3 Start (101) + 42 Left (6*7) + 5 Center (01010) + 42 Right (6*7) + 3 End (101)
        var modules = []; // array of { isBar: bool, isGuard: bool }

        // Start Guard (101)
        modules.push({ isBar: true, isGuard: true });
        modules.push({ isBar: false, isGuard: true });
        modules.push({ isBar: true, isGuard: true });

        // Left 6 Digits (digits 2 to 7)
        for (var i = 1; i <= 6; i++) {
            var digit = parseInt(code.charAt(i), 10);
            var encType = parity[i - 1];
            var pattern = (encType === 'L') ? L_CODE[digit] : G_CODE[digit];
            for (var p = 0; p < 7; p++) {
                modules.push({ isBar: pattern.charAt(p) === '1', isGuard: false });
            }
        }

        // Center Guard (01010)
        modules.push({ isBar: false, isGuard: true });
        modules.push({ isBar: true, isGuard: true });
        modules.push({ isBar: false, isGuard: true });
        modules.push({ isBar: true, isGuard: true });
        modules.push({ isBar: false, isGuard: true });

        // Right 6 Digits (digits 8 to 13)
        for (var j = 7; j <= 12; j++) {
            var rDigit = parseInt(code.charAt(j), 10);
            var rPattern = R_CODE[rDigit];
            for (var rp = 0; rp < 7; rp++) {
                modules.push({ isBar: rPattern.charAt(rp) === '1', isGuard: false });
            }
        }

        // End Guard (101)
        modules.push({ isBar: true, isGuard: true });
        modules.push({ isBar: false, isGuard: true });
        modules.push({ isBar: true, isGuard: true });

        // Merge contiguous bars into rectangles with module start and span
        var bars = [];
        var currBar = null;

        for (var m = 0; m < modules.length; m++) {
            var item = modules[m];
            if (item.isBar) {
                if (currBar && currBar.isGuard === item.isGuard) {
                    currBar.widthModules += 1;
                } else {
                    if (currBar) bars.push(currBar);
                    currBar = {
                        startModule: m,
                        widthModules: 1,
                        isGuard: item.isGuard
                    };
                }
            } else {
                if (currBar) {
                    bars.push(currBar);
                    currBar = null;
                }
            }
        }
        if (currBar) bars.push(currBar);

        return {
            valid: true,
            code: code,
            firstDigit: code.charAt(0),
            leftText: code.substring(1, 7),
            rightText: code.substring(7, 13),
            totalModules: 95,
            quietZoneLeft: 11,
            quietZoneRight: 7,
            totalWidthModules: 11 + 95 + 7, // 113 modules total width with quiet zones
            modules: modules,
            bars: bars
        };
    }

    /**
     * Generates a random valid 13-digit EAN code for testing
     */
    function generateRandom() {
        var prefix = '460'; // Standard EAN prefix (e.g. 460-469)
        var rest = '';
        for (var i = 0; i < 9; i++) {
            rest += Math.floor(Math.random() * 10);
        }
        var code12 = prefix + rest;
        return code12 + calculateChecksum(code12);
    }

    return {
        calculateChecksum: calculateChecksum,
        validate: validate,
        encode: encode,
        generateRandom: generateRandom
    };
})();
