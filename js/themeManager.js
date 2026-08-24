/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global window, document, CSInterface*/

var themeManager = (function () {
    'use strict';

    function toHex(color, delta) {
        function computeValue(value, delta) {
            var computedValue = !isNaN(delta) ? value + delta : value;
            if (computedValue < 0) {
                computedValue = 0;
            } else if (computedValue > 255) {
                computedValue = 255;
            }
            computedValue = Math.floor(computedValue);
            computedValue = computedValue.toString(16);
            return computedValue.length === 1 ? "0" + computedValue : computedValue;
        }

        var hex = "";
        if (color) {
            hex = computeValue(color.red, delta) + computeValue(color.green, delta) + computeValue(color.blue, delta);
        }
        return hex;
    }

    function addRule(stylesheetId, selector, rule) {
        var stylesheet = document.getElementById(stylesheetId);
        if (stylesheet) {
            stylesheet = stylesheet.sheet;
            if (stylesheet.addRule) {
                stylesheet.addRule(selector, rule);
            } else if (stylesheet.insertRule) {
                stylesheet.insertRule(selector + ' { ' + rule + ' }', stylesheet.cssRules.length);
            }
        }
    }

    function updateThemeWithAppSkinInfo(appSkinInfo) {
        if (!appSkinInfo || !appSkinInfo.panelBackgroundColor) return;

        var panelBgColor = appSkinInfo.panelBackgroundColor.color;
        var bgdColor = toHex(panelBgColor);
        var darkBgdColor = toHex(panelBgColor, 20);
        var lightBgdColor = toHex(panelBgColor, -100);

        var fontColor = "F0F0F0";
        if (panelBgColor.red > 122) {
            fontColor = "000000";
        }

        var styleId = "hostStyle";

        addRule(styleId, ".hostElt", "background-color:" + "#" + bgdColor + "; color:#" + fontColor + ";");
        addRule(styleId, ".hostBgd", "background-color:" + "#" + bgdColor);
        addRule(styleId, ".hostBgdDark", "background-color: " + "#" + darkBgdColor);
        addRule(styleId, ".hostBgdLight", "background-color: " + "#" + lightBgdColor);
        addRule(styleId, ".hostButton", "background-color:" + "#" + darkBgdColor + "; border-color: #" + lightBgdColor + "; color:#" + fontColor + ";");
        addRule(styleId, ".hostButton:hover", "background-color:" + "#" + bgdColor + ";");
        addRule(styleId, ".hostButton:active", "background-color:" + "#" + darkBgdColor + ";");
    }

    function onAppThemeColorChanged(event) {
        if (window.__adobe_cep__) {
            var skinInfo = JSON.parse(window.__adobe_cep__.getHostEnvironment()).appSkinInfo;
            updateThemeWithAppSkinInfo(skinInfo);
        }
    }

    function init() {
        if (typeof CSInterface === 'undefined') return;
        var csInterface = new CSInterface();
        if (csInterface.hostEnvironment && csInterface.hostEnvironment.appSkinInfo) {
            updateThemeWithAppSkinInfo(csInterface.hostEnvironment.appSkinInfo);
        }
        csInterface.addEventListener(CSInterface.THEME_COLOR_CHANGED_EVENT, onAppThemeColorChanged);
    }

    return {
        init: init
    };
}());
