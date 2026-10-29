sap.ui.define([], function () {
  "use strict";
  var iCounter = 91;
  /** MOCK. Replace with POST to your RAP service (control + items + deviations + audit log). */
  return {
    save: function (oSession) {
      return new Promise(function (resolve) {
        setTimeout(function () {
          resolve({
            controlNo: "GR-2026-" + String(iCounter++).padStart(4, "0"),
            hasDeviation: (oSession.deviations || []).length > 0
          });
        }, 800);
      });
    }
  };
});
