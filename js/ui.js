// ui.js
const UI = (function () {
    'use strict';

    const csInterface = new CSInterface();
    const PT_TO_MM = 2.834645668;
    const MM_TO_PT = 0.352777778;
    const STORAGE_KEY = 'ai_code_ui_settings_v5';

    let currentTab = 'ean13'; // 'ean13' or 'qrcode'
    let currentFontWeight = 'normal'; // 'light', 'normal', 'bold'
    let currentQRType = 'url'; // 'url', 'plain', 'sms', 'email', 'vcard'
    let currentFontFamily = 'Arial'; // Default Arial (or Helvetica on Mac)

    function getCurrentTab() {
        return currentTab;
    }

    function getFontWeight() {
        return currentFontWeight;
    }

    function getFontFamily() {
        const select = document.getElementById('font_family_select');
        return select ? select.value : currentFontFamily;
    }

    function getQRType() {
        return currentQRType;
    }

    function evalScriptPromise(script) {
        return new Promise(resolve => {
            csInterface.evalScript(script, result => resolve(result));
        });
    }

    function switchTab(tabName) {
        currentTab = tabName;
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName);
        });
        document.getElementById('tab_content_ean').style.display = (tabName === 'ean13') ? 'block' : 'none';
        document.getElementById('tab_content_qr').style.display = (tabName === 'qrcode') ? 'block' : 'none';

        Preview.update();
        saveSettings();
    }

    function setFontWeight(weight) {
        currentFontWeight = weight;
        document.querySelectorAll('.font-weight-btn').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-weight') === weight);
        });
        Preview.update();
        saveSettings();
    }

    function applyQRSample(type, sample) {
        if (!sample) return;
        switch (type) {
            case 'url':
                document.getElementById('qr_url_input').value = sample.url || '';
                break;
            case 'plain':
                document.getElementById('qr_plain_input').value = sample.text || '';
                break;
            case 'sms':
                document.getElementById('qr_sms_phone').value = sample.phone || '';
                document.getElementById('qr_sms_msg').value = sample.message || '';
                break;
            case 'email':
                document.getElementById('qr_email_to').value = sample.to || '';
                document.getElementById('qr_email_sub').value = sample.subject || '';
                document.getElementById('qr_email_body').value = sample.body || '';
                break;
            case 'vcard':
                document.getElementById('vcard_fn').value = sample.firstName || '';
                document.getElementById('vcard_ln').value = sample.lastName || '';
                document.getElementById('vcard_title').value = sample.title || '';
                document.getElementById('vcard_org').value = sample.organization || '';
                document.getElementById('vcard_cell').value = sample.cellPhone || '';
                document.getElementById('vcard_work').value = sample.workPhone || '';
                document.getElementById('vcard_email').value = sample.email || '';
                document.getElementById('vcard_url').value = sample.website || '';
                document.getElementById('vcard_street').value = sample.street || '';
                document.getElementById('vcard_city').value = sample.city || '';
                document.getElementById('vcard_country').value = sample.country || '';
                break;
        }
    }

    function isQRFieldsEmpty(type) {
        switch (type) {
            case 'url': return !document.getElementById('qr_url_input').value;
            case 'plain': return !document.getElementById('qr_plain_input').value;
            case 'sms': return !document.getElementById('qr_sms_phone').value && !document.getElementById('qr_sms_msg').value;
            case 'email': return !document.getElementById('qr_email_to').value && !document.getElementById('qr_email_body').value;
            case 'vcard': return !document.getElementById('vcard_fn').value && !document.getElementById('vcard_ln').value;
            default: return true;
        }
    }

    function switchQRType(type) {
        currentQRType = type;
        document.querySelectorAll('.qr-type-section').forEach(sec => {
            sec.style.display = 'none';
        });
        const activeSec = document.getElementById(`qr_fields_${type}`);
        if (activeSec) {
            activeSec.style.display = 'block';
        }

        // Auto-fill with realistic default template if fields are currently empty
        if (isQRFieldsEmpty(type) && typeof SampleData !== 'undefined') {
            applyQRSample(type, SampleData.getDefaultQR(type));
        }

        Preview.update();
        saveSettings();
    }

    function getQRPayload() {
        let data = {};
        switch (currentQRType) {
            case 'url':
                data.url = document.getElementById('qr_url_input').value;
                break;
            case 'plain':
                data.text = document.getElementById('qr_plain_input').value;
                break;
            case 'sms':
                data.phone = document.getElementById('qr_sms_phone').value;
                data.message = document.getElementById('qr_sms_msg').value;
                break;
            case 'email':
                data.to = document.getElementById('qr_email_to').value;
                data.subject = document.getElementById('qr_email_sub').value;
                data.body = document.getElementById('qr_email_body').value;
                break;
            case 'vcard':
                data.firstName = document.getElementById('vcard_fn').value;
                data.lastName = document.getElementById('vcard_ln').value;
                data.title = document.getElementById('vcard_title').value;
                data.organization = document.getElementById('vcard_org').value;
                data.cellPhone = document.getElementById('vcard_cell').value;
                data.workPhone = document.getElementById('vcard_work').value;
                data.email = document.getElementById('vcard_email').value;
                data.website = document.getElementById('vcard_url').value;
                data.street = document.getElementById('vcard_street').value;
                data.city = document.getElementById('vcard_city').value;
                data.state = document.getElementById('vcard_state').value;
                data.zip = document.getElementById('vcard_zip').value;
                data.country = document.getElementById('vcard_country').value;
                break;
            default:
                data.text = '';
        }
        return QREngine.formatPayload(currentQRType, data);
    }

    async function loadInstalledFonts() {
        const select = document.getElementById('font_family_select');
        if (!select) return;

        const isMac = (navigator.platform && navigator.platform.indexOf('Mac') !== -1) ||
                      (csInterface.getOSInformation && csInterface.getOSInformation().indexOf('Mac') !== -1);
        const defaultFont = isMac ? 'Helvetica' : 'Arial';

        try {
            const result = await evalScriptPromise('getInstalledFontFamilies()');
            if (result && result !== 'undefined') {
                const families = JSON.parse(result);
                if (families && families.length > 0) {
                    const savedFont = currentFontFamily || defaultFont;
                    select.innerHTML = '';

                    // Default Option
                    const defOpt = document.createElement('option');
                    defOpt.value = defaultFont;
                    defOpt.textContent = `${defaultFont} (Default)`;
                    select.appendChild(defOpt);

                    // Popular/Common Fonts Group
                    const popGroup = document.createElement('optgroup');
                    popGroup.label = 'Standard / Popular';
                    const popular = ['Arial', 'Helvetica', 'OCR-B', 'OCRB', 'Myriad Pro', 'Calibri', 'Segoe UI', 'Roboto', 'Verdana'];
                    popular.forEach(fam => {
                        if (fam !== defaultFont && families.indexOf(fam) !== -1) {
                            const opt = document.createElement('option');
                            opt.value = fam;
                            opt.textContent = fam;
                            popGroup.appendChild(opt);
                        }
                    });
                    if (popGroup.children.length > 0) {
                        select.appendChild(popGroup);
                    }

                    // All Installed Fonts Group
                    const allGroup = document.createElement('optgroup');
                    allGroup.label = 'All Installed Fonts';
                    families.forEach(fam => {
                        const opt = document.createElement('option');
                        opt.value = fam;
                        opt.textContent = fam;
                        allGroup.appendChild(opt);
                    });
                    select.appendChild(allGroup);

                    // Restore selected
                    select.value = savedFont;
                    if (!select.value && families.length > 0) {
                        select.value = families[0];
                    }
                }
            }
        } catch (e) {
            console.error('Error loading installed fonts', e);
        }
    }

    async function generate() {
        const addLayer = document.getElementById('add_layer').checked;
        const layName = document.getElementById('layer_name_text').value || 'Barcodes';
        const posMode = document.getElementById('pos_mode').value;
        const addBg = document.getElementById('add_bg').checked;

        if (currentTab === 'ean13') {
            const rawVal = document.getElementById('ean_input').value;
            const res = EAN13.encode(rawVal);
            if (!res.valid) {
                alert('EAN-13 Error: ' + res.error);
                return;
            }

            const moduleW_mm = parseFloat(document.getElementById('ean_module_w').value) || 0.33;
            const barH_mm = parseFloat(document.getElementById('ean_bar_h').value) || 22.85;
            const guardExt_mm = parseFloat(document.getElementById('ean_guard_ext').value) || 1.65;
            const bwr_um = parseFloat(document.getElementById('ean_bwr').value) || 0; // microns
            const showText = document.getElementById('ean_show_text').checked;
            const outlineText = document.getElementById('ean_outline_text').checked;
            const fontSizePt = parseFloat(document.getElementById('ean_font_size').value) || 10;
            const fontFamily = getFontFamily();

            const opts = {
                codeType: 'ean13',
                code: res.code,
                firstDigit: res.firstDigit,
                leftText: res.leftText,
                rightText: res.rightText,
                bars: res.bars,
                totalModules: res.totalModules,
                quietZoneLeft: res.quietZoneLeft,
                quietZoneRight: res.quietZoneRight,
                moduleWidth: moduleW_mm * PT_TO_MM,
                barHeight: barH_mm * PT_TO_MM,
                guardExtension: guardExt_mm * PT_TO_MM,
                bwr: (bwr_um / 1000) * PT_TO_MM,
                showText: showText,
                outlineText: outlineText,
                fontSize: fontSizePt,
                fontFamily: fontFamily,
                fontWeight: currentFontWeight,
                addBg: addBg,
                addLay: addLayer,
                layName: layName,
                positionMode: posMode
            };

            const script = `generateEAN13(${JSON.stringify(opts)})`;
            const out = await evalScriptPromise(script);
            handleResult(out);
        } else {
            const qrPayload = getQRPayload();
            const ecc = document.getElementById('qr_ecc').value;
            const margin = parseInt(document.getElementById('qr_margin').value, 10) || 4;
            const logoEnabled = document.getElementById('qr_logo_cutout').checked;
            const logoPercent = logoEnabled ? (parseFloat(document.getElementById('qr_logo_percent').value) || 20) : 0;

            const res = QREngine.encode(qrPayload, ecc, margin, logoPercent);

            if (!res.valid) {
                alert('QR Error: ' + res.error);
                return;
            }

            const qrSizeMm = parseFloat(document.getElementById('qr_total_size').value) || 25;
            const qrSizePt = qrSizeMm * PT_TO_MM;
            const moduleSizePt = qrSizePt / res.totalModules;
            const asCompound = document.getElementById('qr_compound').checked;

            const opts = {
                codeType: 'qrcode',
                text: qrPayload,
                rects: res.rects,
                totalModules: res.totalModules,
                moduleSize: moduleSizePt,
                asCompoundPath: asCompound,
                addBg: addBg,
                addLay: addLayer,
                layName: layName,
                positionMode: posMode
            };

            const script = `generateQRCode(${JSON.stringify(opts)})`;
            const out = await evalScriptPromise(script);
            handleResult(out);
        }
    }

    function handleResult(outJson) {
        if (!outJson || outJson === 'undefined') return;
        try {
            const res = JSON.parse(outJson);
            if (!res.success) {
                alert('Illustrator error: ' + (res.error || 'Unknown error'));
            }
        } catch (e) {
            console.error('Error parsing backend response', e);
        }
    }

    function applyEANPreset(preset) {
        let scale = 1.0;
        if (preset === 'sc0') scale = 0.8;
        if (preset === 'sc2') scale = 1.0;
        if (preset === 'sc5') scale = 1.2;

        document.getElementById('ean_module_w').value = (0.33 * scale).toFixed(3);
        document.getElementById('ean_bar_h').value = (22.85 * scale).toFixed(2);
        document.getElementById('ean_guard_ext').value = (1.65 * scale).toFixed(2);
        document.getElementById('ean_font_size').value = Math.round(10 * scale);
        Preview.update();
        saveSettings();
    }

    function applyQRPreset(sizeMm) {
        document.getElementById('qr_total_size').value = sizeMm;
        Preview.update();
        saveSettings();
    }

    function saveSettings() {
        const chkSave = document.getElementById('chk_save');
        if (!chkSave || !chkSave.checked) return;

        const data = {
            currentTab: currentTab,
            currentFontWeight: currentFontWeight,
            currentFontFamily: getFontFamily(),
            currentQRType: currentQRType,
            eanInput: document.getElementById('ean_input').value,
            eanModuleW: document.getElementById('ean_module_w').value,
            eanBarH: document.getElementById('ean_bar_h').value,
            eanGuardExt: document.getElementById('ean_guard_ext').value,
            eanBwr: document.getElementById('ean_bwr').value,
            eanShowText: document.getElementById('ean_show_text').checked,
            eanOutlineText: document.getElementById('ean_outline_text').checked,
            eanFontSize: document.getElementById('ean_font_size').value,
            qrUrl: document.getElementById('qr_url_input').value,
            qrPlain: document.getElementById('qr_plain_input').value,
            qrSmsPhone: document.getElementById('qr_sms_phone').value,
            qrSmsMsg: document.getElementById('qr_sms_msg').value,
            qrEmailTo: document.getElementById('qr_email_to').value,
            qrEmailSub: document.getElementById('qr_email_sub').value,
            qrEmailBody: document.getElementById('qr_email_body').value,
            vcardFn: document.getElementById('vcard_fn').value,
            vcardLn: document.getElementById('vcard_ln').value,
            vcardTitle: document.getElementById('vcard_title').value,
            vcardOrg: document.getElementById('vcard_org').value,
            vcardCell: document.getElementById('vcard_cell').value,
            vcardWork: document.getElementById('vcard_work').value,
            vcardEmail: document.getElementById('vcard_email').value,
            vcardUrl: document.getElementById('vcard_url').value,
            vcardStreet: document.getElementById('vcard_street').value,
            vcardCity: document.getElementById('vcard_city').value,
            vcardState: document.getElementById('vcard_state').value,
            vcardZip: document.getElementById('vcard_zip').value,
            vcardCountry: document.getElementById('vcard_country').value,
            qrEcc: document.getElementById('qr_ecc').value,
            qrMargin: document.getElementById('qr_margin').value,
            qrLogoCutout: document.getElementById('qr_logo_cutout').checked,
            qrLogoPercent: document.getElementById('qr_logo_percent').value,
            qrTotalSize: document.getElementById('qr_total_size').value,
            qrCompound: document.getElementById('qr_compound').checked,
            addLayer: document.getElementById('add_layer').checked,
            layerName: document.getElementById('layer_name_text').value,
            addBg: document.getElementById('add_bg').checked,
            posMode: document.getElementById('pos_mode').value,
            saveChecked: true
        };
        Storage.set(STORAGE_KEY, data);
    }

    function loadSettings() {
        const data = Storage.get(STORAGE_KEY);
        if (!data) return;

        if (data.currentTab) switchTab(data.currentTab);
        if (data.currentFontWeight) setFontWeight(data.currentFontWeight);
        if (data.currentFontFamily) {
            currentFontFamily = data.currentFontFamily;
            const select = document.getElementById('font_family_select');
            if (select) select.value = data.currentFontFamily;
        }
        if (data.currentQRType) {
            document.getElementById('qr_type').value = data.currentQRType;
            switchQRType(data.currentQRType);
        }

        if (data.eanInput !== undefined) document.getElementById('ean_input').value = data.eanInput;
        if (data.eanModuleW !== undefined) document.getElementById('ean_module_w').value = data.eanModuleW;
        if (data.eanBarH !== undefined) document.getElementById('ean_bar_h').value = data.eanBarH;
        if (data.eanGuardExt !== undefined) document.getElementById('ean_guard_ext').value = data.eanGuardExt;
        if (data.eanBwr !== undefined) document.getElementById('ean_bwr').value = data.eanBwr;
        if (data.eanShowText !== undefined) document.getElementById('ean_show_text').checked = data.eanShowText;
        if (data.eanOutlineText !== undefined) document.getElementById('ean_outline_text').checked = data.eanOutlineText;
        if (data.eanFontSize !== undefined) document.getElementById('ean_font_size').value = data.eanFontSize;

        if (data.qrUrl !== undefined) document.getElementById('qr_url_input').value = data.qrUrl;
        if (data.qrPlain !== undefined) document.getElementById('qr_plain_input').value = data.qrPlain;
        if (data.qrSmsPhone !== undefined) document.getElementById('qr_sms_phone').value = data.qrSmsPhone;
        if (data.qrSmsMsg !== undefined) document.getElementById('qr_sms_msg').value = data.qrSmsMsg;
        if (data.qrEmailTo !== undefined) document.getElementById('qr_email_to').value = data.qrEmailTo;
        if (data.qrEmailSub !== undefined) document.getElementById('qr_email_sub').value = data.qrEmailSub;
        if (data.qrEmailBody !== undefined) document.getElementById('qr_email_body').value = data.qrEmailBody;

        if (data.vcardFn !== undefined) document.getElementById('vcard_fn').value = data.vcardFn;
        if (data.vcardLn !== undefined) document.getElementById('vcard_ln').value = data.vcardLn;
        if (data.vcardTitle !== undefined) document.getElementById('vcard_title').value = data.vcardTitle;
        if (data.vcardOrg !== undefined) document.getElementById('vcard_org').value = data.vcardOrg;
        if (data.vcardCell !== undefined) document.getElementById('vcard_cell').value = data.vcardCell;
        if (data.vcardWork !== undefined) document.getElementById('vcard_work').value = data.vcardWork;
        if (data.vcardEmail !== undefined) document.getElementById('vcard_email').value = data.vcardEmail;
        if (data.vcardUrl !== undefined) document.getElementById('vcard_url').value = data.vcardUrl;
        if (data.vcardStreet !== undefined) document.getElementById('vcard_street').value = data.vcardStreet;
        if (data.vcardCity !== undefined) document.getElementById('vcard_city').value = data.vcardCity;
        if (data.vcardState !== undefined) document.getElementById('vcard_state').value = data.vcardState;
        if (data.vcardZip !== undefined) document.getElementById('vcard_zip').value = data.vcardZip;
        if (data.vcardCountry !== undefined) document.getElementById('vcard_country').value = data.vcardCountry;

        if (data.qrEcc !== undefined) document.getElementById('qr_ecc').value = data.qrEcc;
        if (data.qrMargin !== undefined) document.getElementById('qr_margin').value = data.qrMargin;
        if (data.qrLogoCutout !== undefined) document.getElementById('qr_logo_cutout').checked = data.qrLogoCutout;
        if (data.qrLogoPercent !== undefined) document.getElementById('qr_logo_percent').value = data.qrLogoPercent;
        if (data.qrTotalSize !== undefined) document.getElementById('qr_total_size').value = data.qrTotalSize;
        if (data.qrCompound !== undefined) document.getElementById('qr_compound').checked = data.qrCompound;
        if (data.addLayer !== undefined) document.getElementById('add_layer').checked = data.addLayer;
        if (data.layerName !== undefined) document.getElementById('layer_name_text').value = data.layerName;
        if (data.addBg !== undefined) document.getElementById('add_bg').checked = data.addBg;
        if (data.posMode !== undefined) document.getElementById('pos_mode').value = data.posMode;
        if (data.saveChecked !== undefined) document.getElementById('chk_save').checked = data.saveChecked;
    }

    function resetDefaults() {
        document.getElementById('ean_input').value = '4601234567893';
        document.getElementById('ean_module_w').value = '0.33';
        document.getElementById('ean_bar_h').value = '22.85';
        document.getElementById('ean_guard_ext').value = '1.65';
        document.getElementById('ean_bwr').value = '0';
        document.getElementById('ean_show_text').checked = true;
        document.getElementById('ean_outline_text').checked = false;
        document.getElementById('ean_font_size').value = '10';

        const isMac = navigator.platform && navigator.platform.indexOf('Mac') !== -1;
        const defaultFont = isMac ? 'Helvetica' : 'Arial';
        currentFontFamily = defaultFont;
        const fontSelect = document.getElementById('font_family_select');
        if (fontSelect) fontSelect.value = defaultFont;

        setFontWeight('normal');

        document.getElementById('qr_type').value = 'url';
        switchQRType('url');
        if (typeof SampleData !== 'undefined') {
            applyQRSample('url', SampleData.getDefaultQR('url'));
            applyQRSample('plain', SampleData.getDefaultQR('plain'));
            applyQRSample('sms', SampleData.getDefaultQR('sms'));
            applyQRSample('email', SampleData.getDefaultQR('email'));
            applyQRSample('vcard', SampleData.getDefaultQR('vcard'));
        }

        document.getElementById('qr_ecc').value = 'M';
        document.getElementById('qr_margin').value = '4';
        document.getElementById('qr_logo_cutout').checked = false;
        document.getElementById('qr_logo_percent').value = '20';
        document.getElementById('qr_total_size').value = '25';
        document.getElementById('qr_compound').checked = true;

        document.getElementById('add_layer').checked = true;
        document.getElementById('layer_name_text').value = 'Barcodes';
        document.getElementById('add_bg').checked = false;
        document.getElementById('pos_mode').value = 'artboard_center';

        Preview.update();
        saveSettings();
    }

    function init() {
        // Tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                switchTab(btn.getAttribute('data-tab'));
            });
        });

        // Font weight buttons
        document.querySelectorAll('.font-weight-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                setFontWeight(btn.getAttribute('data-weight'));
            });
        });

        // Font family select change
        const fontSelect = document.getElementById('font_family_select');
        if (fontSelect) {
            fontSelect.addEventListener('change', (e) => {
                currentFontFamily = e.target.value;
                Preview.update();
                saveSettings();
            });
        }

        // QR Type selector
        document.getElementById('qr_type').addEventListener('change', (e) => {
            switchQRType(e.target.value);
        });

        // Logo cutout toggle
        const logoCutoutEl = document.getElementById('qr_logo_cutout');
        if (logoCutoutEl) {
            logoCutoutEl.addEventListener('change', () => {
                if (logoCutoutEl.checked) {
                    const eccEl = document.getElementById('qr_ecc');
                    if (eccEl && (eccEl.value === 'L' || eccEl.value === 'M')) {
                        eccEl.value = 'H'; // Switch to High ECC (30% recovery) for logo safety
                    }
                }
                Preview.update();
                saveSettings();
            });
        }

        // Live inputs for preview
        const liveInputs = [
            'ean_input', 'ean_module_w', 'ean_bar_h', 'ean_guard_ext', 'ean_bwr',
            'ean_show_text', 'ean_outline_text', 'ean_font_size', 'font_family_select',
            'qr_url_input', 'qr_plain_input', 'qr_sms_phone', 'qr_sms_msg',
            'qr_email_to', 'qr_email_sub', 'qr_email_body',
            'vcard_fn', 'vcard_ln', 'vcard_title', 'vcard_org', 'vcard_cell', 'vcard_work',
            'vcard_email', 'vcard_url', 'vcard_street', 'vcard_city', 'vcard_state', 'vcard_zip', 'vcard_country',
            'qr_ecc', 'qr_margin', 'qr_logo_cutout', 'qr_logo_percent', 'qr_total_size', 'qr_compound', 'add_bg'
        ];

        liveInputs.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('input', () => {
                    Preview.update();
                    saveSettings();
                });
                el.addEventListener('change', () => {
                    Preview.update();
                    saveSettings();
                });
            }
        });

        // EAN Helper Buttons
        document.getElementById('btn_ean_calc_chk').addEventListener('click', () => {
            const raw = document.getElementById('ean_input').value.replace(/\D/g, '');
            if (raw.length >= 12) {
                const code12 = raw.substring(0, 12);
                const chk = EAN13.calculateChecksum(code12);
                document.getElementById('ean_input').value = code12 + chk;
                Preview.update();
                saveSettings();
            } else {
                alert('Enter at least 12 digits to calculate checksum');
            }
        });

        // Random Generator Buttons
        document.getElementById('btn_ean_random').addEventListener('click', () => {
            if (typeof SampleData !== 'undefined') {
                document.getElementById('ean_input').value = SampleData.getRandomEAN13();
            } else {
                document.getElementById('ean_input').value = EAN13.generateRandom();
            }
            Preview.update();
            saveSettings();
        });

        const qrRndBtn = document.getElementById('btn_qr_random');
        if (qrRndBtn) {
            qrRndBtn.addEventListener('click', () => {
                if (typeof SampleData !== 'undefined') {
                    const sample = SampleData.getRandomQR(currentQRType);
                    applyQRSample(currentQRType, sample);
                    Preview.update();
                    saveSettings();
                }
            });
        }

        // Preset Buttons
        document.getElementById('btn_preset_sc0').addEventListener('click', () => applyEANPreset('sc0'));
        document.getElementById('btn_preset_sc2').addEventListener('click', () => applyEANPreset('sc2'));
        document.getElementById('btn_preset_sc5').addEventListener('click', () => applyEANPreset('sc5'));

        document.getElementById('btn_qr_15mm').addEventListener('click', () => applyQRPreset(15));
        document.getElementById('btn_qr_25mm').addEventListener('click', () => applyQRPreset(25));
        document.getElementById('btn_qr_40mm').addEventListener('click', () => applyQRPreset(40));

        // Action Buttons
        document.getElementById('btn_generate').addEventListener('click', generate);
        document.getElementById('btn_default').addEventListener('click', resetDefaults);

        // Footer Links
        function openURL(url) {
            try {
                if (typeof csInterface !== 'undefined' && csInterface.openURLInDefaultBrowser) {
                    csInterface.openURLInDefaultBrowser(url);
                } else if (window.cep && window.cep.util && window.cep.util.openURLInDefaultBrowser) {
                    window.cep.util.openURLInDefaultBrowser(url);
                } else {
                    window.open(url, '_blank');
                }
            } catch (e) {
                window.open(url, '_blank');
            }
        }

        const linkGithub = document.getElementById('link_github');
        if (linkGithub) {
            linkGithub.addEventListener('click', (e) => {
                e.preventDefault();
                openURL('https://github.com/SaidAuita/AI-Code');
            });
        }

        const linkTools = document.getElementById('link_tools');
        if (linkTools) {
            linkTools.addEventListener('click', (e) => {
                e.preventDefault();
                openURL('https://ph-cu-s.com/tools');
            });
        }

        // Load fonts from Illustrator and restore settings
        loadInstalledFonts().then(() => {
            loadSettings();
            // If new session and QR is empty, fill default template
            if (isQRFieldsEmpty(currentQRType) && typeof SampleData !== 'undefined') {
                applyQRSample(currentQRType, SampleData.getDefaultQR(currentQRType));
            }
            Preview.update();
        });
    }

    return {
        init,
        getCurrentTab,
        getFontWeight,
        getFontFamily,
        getQRType,
        getQRPayload,
        saveSettings
    };
})();
