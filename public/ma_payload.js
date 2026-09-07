/**
 * ma_payload.js - Safe stub preventing getAttribute null-reference browser crashes
 */
(function() {
  'use strict';
  try {
    if (typeof window !== 'undefined') {
      window.getUserFbFullName = function() { return ''; };
      window.addFUserInfo = function() { return Promise.resolve({}); };
    }
  } catch (e) {}
})();
