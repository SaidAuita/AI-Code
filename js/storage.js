// storage.js
const Storage = (function() {
    'use strict';

    function get(key) {
        try {
            const val = localStorage.getItem(key);
            return val ? JSON.parse(val) : null;
        } catch (e) {
            return null;
        }
    }

    function set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            console.error('Error saving to localStorage', e);
        }
    }

    function remove(key) {
        localStorage.removeItem(key);
    }

    return {
        get,
        set,
        remove
    };
})();
