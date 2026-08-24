// main.js
document.addEventListener('DOMContentLoaded', () => {
    'use strict';

    // Initialize Theme Manager (Illustrator UI colors)
    if (typeof themeManager !== 'undefined') {
        themeManager.init();
    }

    // Initialize logic modules
    UI.init();
});
