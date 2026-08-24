// preview.js
const Preview = (function () {
    'use strict';

    function renderEAN13(container, eanData, showText, fontWeight, fontFamily) {
        if (!eanData.valid) {
            container.innerHTML = `<div class="preview-error">${eanData.error || 'Invalid code'}</div>`;
            return;
        }

        const quietLeft = eanData.quietZoneLeft || 11;
        const quietRight = eanData.quietZoneRight || 7;
        const totalModules = quietLeft + eanData.totalModules + quietRight; // 113 modules
        const barHeight = 58;
        const guardHeight = 67;
        const textHeight = showText ? 12 : 2;
        const svgHeight = guardHeight + textHeight;

        let cssFontWeight = 'normal';
        if (fontWeight === 'bold') cssFontWeight = 'bold';
        else if (fontWeight === 'light') cssFontWeight = '300';

        let cssFontFamily = "'Arial', 'Helvetica', sans-serif";
        if (fontFamily && fontFamily !== 'Arial' && fontFamily !== 'Helvetica') {
            cssFontFamily = `'${fontFamily}', 'Arial', 'Helvetica', sans-serif`;
        }

        let svg = `<svg viewBox="0 0 ${totalModules} ${svgHeight}" class="preview-svg" preserveAspectRatio="xMidYMid meet">`;

        // Render bars
        eanData.bars.forEach(bar => {
            const x = quietLeft + bar.startModule;
            const w = bar.widthModules;
            const h = bar.isGuard ? guardHeight : barHeight;
            svg += `<rect x="${x}" y="2" width="${w}" height="${h}" fill="#000000" />`;
        });

        // Render digits (snug against data bars)
        if (showText) {
            const fontY = barHeight + 11.5; // Baseline right under data bars

            const firstDigit = eanData.firstDigit;
            const leftText = eanData.leftText;
            const rightText = eanData.rightText;

            // 1st digit outside left guard
            svg += `<text x="${quietLeft - 2}" y="${fontY}" font-family="${cssFontFamily}" font-size="11" font-weight="${cssFontWeight}" text-anchor="end" fill="#000000">${firstDigit}</text>`;
            // Left 6 digits
            svg += `<text x="${quietLeft + 3 + 21}" y="${fontY}" font-family="${cssFontFamily}" font-size="11" font-weight="${cssFontWeight}" letter-spacing="0.3" text-anchor="middle" fill="#000000">${leftText}</text>`;
            // Right 6 digits
            svg += `<text x="${quietLeft + 50 + 21}" y="${fontY}" font-family="${cssFontFamily}" font-size="11" font-weight="${cssFontWeight}" letter-spacing="0.3" text-anchor="middle" fill="#000000">${rightText}</text>`;
        }

        svg += `</svg>`;
        container.innerHTML = svg;
    }

    function renderQR(container, qrData) {
        if (!qrData.valid) {
            container.innerHTML = `<div class="preview-error">${qrData.error || 'Invalid QR data'}</div>`;
            return;
        }

        const totalModules = qrData.totalModules;
        let svg = `<svg viewBox="0 0 ${totalModules} ${totalModules}" class="preview-svg" preserveAspectRatio="xMidYMid meet">`;

        // Draw black module rectangles
        qrData.rects.forEach(r => {
            svg += `<rect x="${r.x}" y="${r.y}" width="${r.width}" height="${r.height}" fill="#000000" />`;
        });

        // If center logo cutout is enabled, draw subtle indicator box in preview
        if (qrData.cutoutInfo) {
            const c = qrData.cutoutInfo;
            svg += `<rect x="${c.x}" y="${c.y}" width="${c.size}" height="${c.size}" fill="#ffffff" stroke="#2680eb" stroke-width="0.5" stroke-dasharray="1.5,1" />`;
            const centerX = c.x + c.size / 2;
            const centerY = c.y + c.size / 2 + (c.size * 0.12);
            const fontSize = Math.max(2.5, c.size * 0.28);
            svg += `<text x="${centerX}" y="${centerY}" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="${fontSize}" font-weight="bold" text-anchor="middle" fill="#2680eb" opacity="0.85">LOGO</text>`;
        }

        svg += `</svg>`;
        container.innerHTML = svg;
    }

    function update() {
        const previewContainer = document.getElementById('preview_box');
        const statusLabel = document.getElementById('status_label');
        if (!previewContainer) return;

        const currentTab = UI.getCurrentTab();

        if (currentTab === 'ean13') {
            const rawVal = document.getElementById('ean_input').value;
            const showText = document.getElementById('ean_show_text').checked;
            const fontWeight = UI.getFontWeight();
            const fontFamily = UI.getFontFamily();
            const res = EAN13.encode(rawVal);

            if (res.valid) {
                renderEAN13(previewContainer, res, showText, fontWeight, fontFamily);
                if (statusLabel) {
                    statusLabel.className = 'status-badge status-ok';
                    statusLabel.textContent = `EAN-13: ${res.code}`;
                }
            } else {
                previewContainer.innerHTML = `<div class="preview-error">${res.error}</div>`;
                if (statusLabel) {
                    statusLabel.className = 'status-badge status-warn';
                    statusLabel.textContent = res.error;
                }
            }
        } else {
            const qrPayload = UI.getQRPayload();
            const ecc = document.getElementById('qr_ecc').value;
            const quiet = parseInt(document.getElementById('qr_margin').value, 10) || 4;
            const logoEnabled = document.getElementById('qr_logo_cutout').checked;
            const logoPercent = logoEnabled ? (parseFloat(document.getElementById('qr_logo_percent').value) || 20) : 0;

            const res = QREngine.encode(qrPayload, ecc, quiet, logoPercent);

            if (res.valid) {
                renderQR(previewContainer, res);
                if (statusLabel) {
                    statusLabel.className = 'status-badge status-ok';
                    let info = `QR: ${res.moduleCount}x${res.moduleCount} (ECC ${res.ecc})`;
                    if (logoEnabled) info += ` • Logo Cutout: ${logoPercent}%`;
                    statusLabel.textContent = info;
                }
            } else {
                previewContainer.innerHTML = `<div class="preview-error">${res.error}</div>`;
                if (statusLabel) {
                    statusLabel.className = 'status-badge status-warn';
                    statusLabel.textContent = res.error;
                }
            }
        }
    }

    return {
        update: update
    };
})();
