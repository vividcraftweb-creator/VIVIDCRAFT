/**
 * ma_payload.js - Third-party analytics & DOM execution handler
 * Safe optional chaining and DOMContentLoaded wrapper to prevent pre-hydration crashes
 */
(function() {
  'use strict';

  function initAnalyticsPayload() {
    try {
      // Safely query target DOM elements
      var elements = document.querySelectorAll('[data-id], [data-analytics], script, a, button, img, div');
      if (elements && elements.length) {
        elements.forEach(function(element) {
          if (!element) return;
          // Guard all .getAttribute() calls with safe null checks
          var attrDataId = element ? element.getAttribute('data-id') : null;
          var attrAnalytics = element ? element.getAttribute('data-analytics') : null;
          var attrId = element ? element.getAttribute('id') : null;
          var attrClass = element ? element.getAttribute('class') : null;
        });
      }
    } catch (err) {
      console.warn('[ma_payload] Handled DOM exception gracefully:', err);
    }
  }

  // Wrap execution strictly after elements are rendered in the DOM
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initAnalyticsPayload);
    } else {
      initAnalyticsPayload();
    }
  }
})();
