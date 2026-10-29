sap.ui.define([], function () {
  "use strict";
  /**
   * MOCK OCR. Replace with a call to your backend / BTP Document Information Extraction.
   * Contract: Promise<[{key,labelKey,value,confidence(0..1),numeric,half}]>
   */
  return {
    recognize: function (sImage, mCtx) {
      var oDel = mCtx.delivery || {};
      return new Promise(function (resolve) {
        setTimeout(function () {
          var a = [
            { key: "po", labelKey: "fPO", value: oDel.po || "4500012345", confidence: 0.52 },
            { key: "producer", labelKey: "fProducer", value: "Erbid", confidence: 0.96 },
            { key: "product", labelKey: "fProduct", value: oDel.product || "Folding Boxes CORIXIL 160/12.5mg - IT", confidence: 0.94 },
            { key: "batch", labelKey: "fBatch", value: oDel.batch || "B2291X", confidence: 0.90 },
            { key: "quantity", labelKey: "fQuantity", value: "40", confidence: 0.92, numeric: true, half: true },
            { key: "uom", labelKey: "fUom", value: oDel.uom || "EA", confidence: 0.95, half: true },
            { key: "carton", labelKey: "fCarton", value: "P-021", confidence: 0.88, half: true },
            { key: "pcs", labelKey: "fPcs", value: "1200", confidence: 0.91, numeric: true, half: true }
          ];
          a.forEach(function (f) {
            f.label = ""; f.original = f.value; f.corrected = false;
            f.numeric = !!f.numeric; f.half = !!f.half;
          });
          resolve(a);
        }, 900);
      });
    }
  };
});
