sap.ui.define([], function () {
  "use strict";
  return {
    /** Derive deviation reasons + suggested type from validation errors and flagged checklist answers. */
    evaluate: function (oSession, fnText) {
      var aReasons = [], sType = "", iFlagged = 0;

      ((oSession.validation || {}).checks || []).forEach(function (c) {
        if (c.state === "Error") {
          aReasons.push(c.label + ": " + c.detail);
          if (!sType) { sType = c.key === "quantity" ? "QTY" : "OTHER"; }
        }
      });
      ((oSession.checklist || {}).questions || []).forEach(function (q) {
        if (q.visible && q.deviationOn && q.answer === q.deviationOn) {
          iFlagged++;
          aReasons.push(q.text + " \u2192 " + fnText(String(q.answer).toLowerCase()));
          if (!sType && q.deviationType) { sType = q.deviationType; }
        }
      });
      return { reasons: aReasons, type: sType, flagged: iFlagged };
    },

    /** Writes reasons / suggested type into the session. Returns true when a deviation is required. */
    apply: function (oSessionModel, fnText) {
      var oRes = this.evaluate(oSessionModel.getData(), fnText);
      oSessionModel.setProperty("/deviationDraft/reasons", oRes.reasons);
      oSessionModel.setProperty("/checklist/flagged", oRes.flagged);
      if (!oSessionModel.getProperty("/deviationDraft/type") && oRes.type) {
        oSessionModel.setProperty("/deviationDraft/type", oRes.type);
      }
      return oRes.reasons.length > 0;
    }
  };
});
