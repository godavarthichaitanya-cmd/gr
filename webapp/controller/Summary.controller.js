sap.ui.define([
  "./BaseController",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageBox",
  "sap/m/MessageToast",
  "../service/SubmissionService"
], function (BaseController, JSONModel, MessageBox, MessageToast, SubmissionService) {
  "use strict";

  return BaseController.extend("zgr.controls.controller.Summary", {

    onInit: function () {
      this.setModel(new JSONModel({ busy: false }), "view");
      this.getRouter().getRoute("summary").attachPatternMatched(this._onMatched, this);
    },

    _onMatched: function () {
      if (!this.requireSession()) { return; }
      var oS = this.getModel("session").getData();
      if (!oS.scans.length) { this.getRouter().navTo("inspect", {}, true); return; }

      var mDeliveries = this.getModel().getProperty("/deliveries") || {};
      var aTypes = this.getModel().getProperty("/deviationTypes") || [];

      /* Scanned items */
      var aItems = oS.scans.map(function (sc) {
        var bBad = sc.condition === "Bad";
        return {
          title: this.getText("itemTitle", [sc.batch, sc.quantity, sc.uom]),
          description: this.getText("itemDesc", [sc.carton, sc.pcs]),
          info: this.getText(bBad ? "bad" : "good"),
          state: bBad ? "Warning" : "Success"
        };
      }, this);

      /* Aggregation per delivery */
      var fTotal = oS.scans.reduce(function (s, sc) { return s + (parseFloat(sc.quantity) || 0); }, 0);
      var aDeliveries = oS.scans.map(function (sc) { return sc.delivery; })
        .filter(function (d, i, a) { return a.indexOf(d) === i; });
      var fExpected = aDeliveries.reduce(function (s, d) { return s + ((mDeliveries[d] || {}).quantity || 0); }, 0);
      var sUom = oS.scans[0].uom || "EA";
      var sDisplay = fTotal + " / " + fExpected + " " + sUom;

      var sNote = "";
      if (fExpected && fTotal < fExpected) { sNote = this.getText("sumPartial", [sDisplay]); }
      if (fExpected && fTotal > fExpected) { sNote = this.getText("sumOver", [sDisplay]); }

      /* Checklist */
      var aWith = oS.scans.filter(function (sc) { return sc.checklist; });
      var sChecklist = this.getText("sumNoChecklist");
      if (aWith.length) {
        var sum = function (k) { return aWith.reduce(function (s, sc) { return s + sc.checklist[k]; }, 0); };
        sChecklist = this.getText("sumChecklist", [sum("answered"), sum("total"), sum("flagged")]);
      }

      /* Deviations: "1 • Damaged Goods • Manager signature required" */
      var sDeviation = this.getText("sumNone");
      if (oS.deviations.length) {
        var aNames = oS.deviations.map(function (d) {
          var oT = aTypes.find(function (t) { return t.key === d.type; });
          return oT ? this.getText(oT.textKey) : d.type;
        }, this).filter(function (n, i, a) { return a.indexOf(n) === i; });
        var aParts = [oS.deviations.length, aNames.join(", ")];
        if (oS.deviations.some(function (d) { return d.signature; })) { aParts.push(this.getText("sigRequired")); }
        sDeviation = aParts.join(" \u2022 ");
      }

      this.getModel("view").setData({
        busy: false,
        ctx1: this.getText("ctx1", [oS.truck, oS.scans[0].po]),
        ctx2: this.getText("ctx2", [oS.seal, oS.warehouse, oS.delivery]),
        itemsHeader: this.getText("secItems", [oS.scans.length]),
        items: aItems,
        percent: fExpected ? Math.min(100, Math.round(fTotal / fExpected * 100)) : 0,
        display: sDisplay,
        progressState: sNote ? "Warning" : "Success",
        qtyNote: sNote,
        checklistText: sChecklist,
        deviationText: sDeviation
      });
    },

    onSubmit: function () {
      var oSession = this.getModel("session");
      var oView = this.getModel("view");
      oView.setProperty("/busy", true);

      // Replace with the real save (RAP create: control + items + deviations + corrections audit log)
      SubmissionService.save(oSession.getData()).then(function (oRes) {
        oView.setProperty("/busy", false);
        var sStatus = this.getText(oRes.hasDeviation ? "statusCompletedDev" : "statusCompleted");
        MessageBox.success(
          this.getText("controlSaved", [oRes.controlNo]) + "\n" + this.getText("statusText", [sStatus]),
          {
            actions: [this.getText("newControl")],
            emphasizedAction: this.getText("newControl"),
            onClose: function () {
              this.getOwnerComponent().resetSession();
              this.getRouter().navTo("openControl", {}, true);
            }.bind(this)
          });
      }.bind(this)).catch(function () {
        oView.setProperty("/busy", false);
        MessageToast.show(this.getText("submitFailed"));
      }.bind(this));
    }
  });
});
