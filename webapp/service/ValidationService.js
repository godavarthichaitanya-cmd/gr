sap.ui.define([], function () {
  "use strict";

  function norm(s) { return String(s || "").trim().toUpperCase().replace(/\s+/g, " "); }
  function field(aOcr, sKey) {
    var f = (aOcr || []).find(function (o) { return o.key === sKey; });
    return f ? f.value : "";
  }
  function chk(sKey, bState, sLabelKey, sDetailKey, aArgs) {
    return { key: sKey, labelKey: sLabelKey, state: bState, textKey: bState === "Success" ? "stOk" : (bState === "Warning" ? "stWarn" : "stError"),
             detailKey: sDetailKey, detailArgs: aArgs || [] };
  }

  /**
   * MOCK of the server-side RAP action validateControl.
   * Returns translation KEYS (labelKey/textKey/detailKey); the controller translates them.
   */
  return {
    validate: function (oSession, mDeliveries) {
      var oDel = (mDeliveries || {})[oSession.delivery];
      if (!oDel) {
        return { checks: [chk("delivery", "Error", "chkDelivery", "detNotFound", [oSession.delivery || "-"])],
                 hasWarning: false, hasError: true, scanned: 0, expected: 0, uom: "EA", percent: 0, display: "0 / 0" };
      }

      var aPrior = (oSession.scans || []).filter(function (s) { return s.delivery === oSession.delivery; });
      var fPrior = aPrior.reduce(function (s, x) { return s + (parseFloat(x.quantity) || 0); }, 0);
      var fTotal = fPrior + (parseFloat(field(oSession.ocr, "quantity")) || 0);
      var fTol = oDel.quantity * (oDel.tolerancePct || 0) / 100;
      var iEntity = aPrior.length + 1;

      var bProduct = norm(field(oSession.ocr, "product")) === norm(oDel.product);
      var bBatch = norm(field(oSession.ocr, "batch")) === norm(oDel.batch);
      var bPo = norm(field(oSession.ocr, "po")) === norm(oDel.po);
      var sQty = fTotal > oDel.quantity + fTol ? "Error" : (fTotal < oDel.quantity - fTol ? "Warning" : "Success");
      var bEntity = iEntity <= oDel.pallets;

      var aChecks = [
        chk("product", bProduct ? "Success" : "Error", "chkProduct", bProduct ? "detMatches" : "detExpected", bProduct ? [] : [oDel.product]),
        chk("batch", bBatch ? "Success" : "Error", "chkBatch", bBatch ? "detMatches" : "detExpected", bBatch ? [] : [oDel.batch]),
        chk("po", bPo ? "Success" : "Error", "chkPo", bPo ? "detMatches" : "detExpected", bPo ? [] : [oDel.po]),
        chk("quantity", sQty, "chkQuantity", "detQty", [oDel.quantity, fTotal]),
        chk("entity", bEntity ? "Success" : "Error", "chkEntity", bEntity ? "detEntityOk" : "detEntityBad",
            bEntity ? [iEntity, oDel.pallets] : [oDel.pallets])
      ];

      return {
        checks: aChecks,
        hasError: aChecks.some(function (c) { return c.state === "Error"; }),
        hasWarning: aChecks.some(function (c) { return c.state === "Warning"; }),
        scanned: fTotal, expected: oDel.quantity, uom: oDel.uom || "EA",
        percent: Math.min(100, Math.round(fTotal / oDel.quantity * 100)),
        display: fTotal + " / " + oDel.quantity + " " + (oDel.uom || "EA")
      };
    }
  };
});
