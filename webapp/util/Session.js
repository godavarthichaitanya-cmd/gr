sap.ui.define([], function () {
  "use strict";
  /** Per-control session. Committed to backend only on Submit (screen 3). */
  var oApi = {
    emptyValidation: function () {
      return { checks: [], hasWarning: false, hasError: false, scanned: 0, expected: 0, uom: "EA", percent: 0, display: "" };
    },
    emptyDraft: function () {
      return { type: "", justification: "", photos: [], reasons: [] };
    },
    create: function (sMode, sLanguage) {
      return {
        mode: sMode || "GR", language: sLanguage || "E",
        truck: "", seal: "", warehouse: "",          // screen 1
        delivery: "", sensor: "", photo: "",         // current item (screen 2)
        ocr: [], corrections: [],
        validation: oApi.emptyValidation(),
        checklist: { questions: [], percent: 0, display: "", flagged: 0 },
        deviationDraft: oApi.emptyDraft(),
        scans: [], deviations: [],                   // committed items
        closeBatch: false,
        result: { controlNo: "" }
      };
    }
  };
  return oApi;
});
