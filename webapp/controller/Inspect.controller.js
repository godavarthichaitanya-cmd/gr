sap.ui.define([
  "./BaseController",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageToast",
  "../util/Camera",
  "../util/Session",
  "../util/DeviationRules",
  "../service/OcrService",
  "../service/ValidationService"
], function (BaseController, JSONModel, MessageToast, Camera, Session, DeviationRules, OcrService, ValidationService) {
  "use strict";
  var MAX_PHOTOS = 5;
  var STATUS_KEY = { locked: "statusLocked", active: "statusActive", done: "statusDone" };

  return BaseController.extend("zgr.controls.controller.Inspect", {

    /* =============== lifecycle =============== */
    onInit: function () {
      this.setModel(new JSONModel({
        busy: false, condition: "", showValidation: false, sensorLocked: false,
        scanCount: 0, entity: "-", reasonText: "", deviationTypes: [],
        p1Status: "active", p1Expanded: true,
        p2Status: "locked", p2Active: false, p2Expanded: false,
        p3Status: "locked", p3Active: false, p3Expanded: false
      }), "view");
      this.getRouter().getRoute("inspect").attachPatternMatched(this._onMatched, this);
    },

    _onMatched: function () {
      if (!this.requireSession()) { return; }
      this._retranslate();
      this._updateCounts();
      this._updateEntity();
    },

    /* Language can change on screen 1 -> refresh texts that were copied into the models */
    _retranslate: function () {
      var oSession = this.getModel("session");
      oSession.getProperty("/ocr").forEach(function (f, i) {
        oSession.setProperty("/ocr/" + i + "/label", this.getText(f.labelKey));
      }, this);
      oSession.getProperty("/checklist/questions").forEach(function (q, i) {
        oSession.setProperty("/checklist/questions/" + i + "/text", this.getText(q.textKey));
      }, this);
      this.getModel("view").setProperty("/deviationTypes",
        (this.getModel().getProperty("/deviationTypes") || []).map(function (t) {
          return { key: t.key, text: this.getText(t.textKey) };
        }, this));
    },

    _updateCounts: function () {
      this.getModel("view").setProperty("/scanCount", this.getModel("session").getProperty("/scans").length);
    },

    _updateEntity: function () {
      var oCarton = this.getModel("session").getProperty("/ocr").find(function (f) { return f.key === "carton"; });
      this.getModel("view").setProperty("/entity", oCarton ? this.getText("entityPallet", [oCarton.value]) : "-");
    },

    /* =============== formatters (need controller + i18n) =============== */
    formatStatusText: function (sStatus) { return this.getText(STATUS_KEY[sStatus] || "statusLocked"); },
    confidenceText: function (f) { return this.getText(f >= 0.85 ? "confHigh" : (f >= 0.7 ? "confMedium" : "confLow")); },

    /* =============== panel state machine =============== */
    /** sStatus: "locked" (header only) | "active" (open) | "done" (collapsed, re-openable) */
    _setPanel: function (iPanel, sStatus) {
      var oView = this.getModel("view");
      var sP = "/p" + iPanel;
      oView.setProperty(sP + "Status", sStatus);
      oView.setProperty(sP + "Expanded", sStatus === "active");
      if (iPanel > 1) { oView.setProperty(sP + "Active", sStatus !== "locked"); }
    },

    _scrollTo: function (sPanelId) {
      setTimeout(function () {
        var oPanel = this.byId(sPanelId);
        if (oPanel) { this.byId("page").scrollToElement(oPanel, 300); }
      }.bind(this), 150);
    },

    _resetPanels: function () {
      this._setPanel(1, "active");
      this._setPanel(2, "locked");
      this._setPanel(3, "locked");
      this._scrollTo("panel1");
    },

    /* =============== PANEL 1: scan & verify =============== */
    onCapture: function () {
      Camera.capture().then(function (sImage) {
        if (!sImage) { return; }
        this.getModel("session").setProperty("/photo", sImage);
        this._runOcr(sImage);
      }.bind(this)).catch(function () { MessageToast.show(this.getText("ocrFailed")); }.bind(this));
    },

    _runOcr: function (sImage) {
      var oSession = this.getModel("session");
      var oView = this.getModel("view");
      var oDelivery = (this.getModel().getProperty("/deliveries") || {})[oSession.getProperty("/delivery")];

      oView.setProperty("/busy", true);
      OcrService.recognize(sImage, { delivery: oDelivery }).then(function (aFields) {
        aFields.forEach(function (f) { f.label = this.getText(f.labelKey); }, this);
        oSession.setProperty("/ocr", aFields);
        oView.setProperty("/showValidation", false);
        this._updateEntity();
      }.bind(this)).catch(function () {
        MessageToast.show(this.getText("ocrFailed"));
      }.bind(this)).finally(function () { oView.setProperty("/busy", false); });
    },

    onScanSuccess: function (oEvent) {
      if (oEvent.getParameter("cancelled")) { return; }
      var sField = oEvent.getSource().data("field");
      var sText = (oEvent.getParameter("text") || "").trim();
      this.getModel("session").setProperty("/" + sField, sText);
      if (sField === "delivery") { this.byId("deliveryInput").setValueState("None"); }
      if (sField === "sensor") { this.getModel("view").setProperty("/sensorLocked", true); }
    },
    onScanFail: function () { MessageToast.show(this.getText("scanFailed")); },

    onEditSensor: function () {
      this.getModel("view").setProperty("/sensorLocked", false);
      setTimeout(function () { this.byId("sensorInput").focus(); }.bind(this), 0);
    },

    onInputLiveChange: function (oEvent) { oEvent.getSource().setValueState("None"); },

    onCondition: function (oEvent) {
      this.getModel("view").setProperty("/condition", oEvent.getSource().data("value"));
    },

    /** Keep OCR fields editable; log every manual correction (audit trail). */
    onFieldChange: function (oEvent) {
      var oSession = this.getModel("session");
      var oCtx = oEvent.getSource().getBindingContext("session");
      var oField = oCtx.getObject();
      var bCorrected = oField.value !== oField.original;
      var iScan = oSession.getProperty("/scans").length;

      oSession.setProperty(oCtx.getPath() + "/corrected", bCorrected);
      var aLog = oSession.getProperty("/corrections").filter(function (c) {
        return !(c.key === oField.key && c.scan === iScan);
      });
      if (bCorrected) {
        aLog.push({ key: oField.key, label: oField.label, from: oField.original, to: oField.value,
                    scan: iScan, at: new Date().toISOString() });
      }
      oSession.setProperty("/corrections", aLog);
      if (oField.key === "carton") { this._updateEntity(); }
    },

    onConfirm: function () {
      var oSession = this.getModel("session");
      var oView = this.getModel("view");
      var aOcr = oSession.getProperty("/ocr");

      if (!aOcr.length) { MessageToast.show(this.getText("scanFirst")); return; }
      if (!String(oSession.getProperty("/delivery")).trim()) {
        this.byId("deliveryInput").setValueState("Error");
        MessageToast.show(this.getText("deliveryFirst"));
        return;
      }
      if (aOcr.some(function (f) { return !String(f.value).trim(); })) { MessageToast.show(this.getText("fillAll")); return; }
      if (!oView.getProperty("/condition")) { MessageToast.show(this.getText("conditionFirst")); return; }

      // Business rules belong server-side (RAP action validateControl); mock here.
      var oRes = ValidationService.validate(oSession.getData(), this.getModel().getProperty("/deliveries"));
      oRes.checks.forEach(function (c) {
        c.label = this.getText(c.labelKey);
        c.text = this.getText(c.textKey);
        c.detail = this.getText(c.detailKey, c.detailArgs);
      }, this);
      oSession.setProperty("/validation", oRes);
      oView.setProperty("/showValidation", true);

      if (oView.getProperty("/condition") === "Bad") {
        this._goChecklist();
      } else if (oRes.hasError) {
        this._goDeviation(false);
      } else {
        this._commit(false);
      }
    },

    /* =============== PANEL 2: checklist =============== */
    _goChecklist: function () {
      var oSession = this.getModel("session");
      if (!oSession.getProperty("/checklist/questions").length) {
        var aQ = (this.getModel().getProperty("/checklistConfig") || []).map(function (q) {
          return Object.assign({}, q, { text: this.getText(q.textKey), answer: "", visible: !q.parent, error: false });
        }, this);
        oSession.setProperty("/checklist/questions", aQ);
      }
      this._refreshChecklist();
      this._setPanel(1, "done");
      this._setPanel(2, "active");
      this._setPanel(3, "locked");
      this._scrollTo("panel2");
    },

    onChoice: function (oEvent) {
      var oCtx = oEvent.getSource().getBindingContext("session");
      this.getModel("session").setProperty(oCtx.getPath() + "/answer", oEvent.getParameter("item").getKey());
      this._refreshChecklist();
    },

    onTextChange: function () { this._refreshChecklist(); },

    /** Show/hide conditional child questions + progress (mandatory questions only). */
    _refreshChecklist: function () {
      var oSession = this.getModel("session");
      var aQ = oSession.getProperty("/checklist/questions");
      var iTotal = 0, iAnswered = 0;

      aQ.forEach(function (q, i) {
        var sPath = "/checklist/questions/" + i;
        if (q.parent) {
          var oParent = aQ.find(function (p) { return p.id === q.parent; });
          var bVisible = !!oParent && oParent.visible && oParent.answer === q.condition;
          q.visible = bVisible;
          oSession.setProperty(sPath + "/visible", bVisible);
          if (!bVisible && q.answer) { q.answer = ""; oSession.setProperty(sPath + "/answer", ""); }
        }
        if (q.visible && q.mandatory) {
          iTotal++;
          if (String(q.answer || "").trim()) { iAnswered++; }
        }
      });
      oSession.setProperty("/checklist/percent", iTotal ? Math.round(iAnswered / iTotal * 100) : 0);
      oSession.setProperty("/checklist/display", this.getText("checklistProgress", [iAnswered, iTotal]));
      oSession.setProperty("/checklist/answered", iAnswered);
      oSession.setProperty("/checklist/total", iTotal);
    },

    onChecklistBack: function () {
      this._setPanel(2, "locked");
      this._setPanel(1, "active");
      this._scrollTo("panel1");
    },

    onChecklistNext: function () {
      var oSession = this.getModel("session");
      var bOk = true;

      oSession.getProperty("/checklist/questions").forEach(function (q, i) {
        var bMissing = q.visible && q.mandatory && !String(q.answer || "").trim();
        oSession.setProperty("/checklist/questions/" + i + "/error", bMissing);
        bOk = bOk && !bMissing;
      });
      if (!bOk) { MessageToast.show(this.getText("answerRequired")); return; }

      // Flagged answers or validation errors -> deviation is mandatory
      if (DeviationRules.apply(oSession, this.getText.bind(this))) {
        this._goDeviation(true);
      } else {
        this._commit(true);
      }
    },

    /* =============== PANEL 3: deviation =============== */
    _goDeviation: function (bFromChecklist) {
      var oSession = this.getModel("session");
      DeviationRules.apply(oSession, this.getText.bind(this));
      this.getModel("view").setProperty("/reasonText", oSession.getProperty("/deviationDraft/reasons").join(" | "));
      this.byId("typeSelect").setValueState("None");
      this.byId("justification").setValueState("None");

      this._setPanel(1, "done");
      this._setPanel(2, bFromChecklist ? "done" : "locked");
      this._setPanel(3, "active");
      this._scrollTo("panel3");
    },

    onClearState: function (oEvent) { oEvent.getSource().setValueState("None"); },

    onAddPhoto: function () {
      var oSession = this.getModel("session");
      var aPhotos = oSession.getProperty("/deviationDraft/photos");
      if (aPhotos.length >= MAX_PHOTOS) { MessageToast.show(this.getText("maxPhotos")); return; }
      Camera.capture().then(function (sImage) {
        if (sImage) { oSession.setProperty("/deviationDraft/photos", aPhotos.concat([{ src: sImage }])); }
      }).catch(function () {});
    },

    onRemovePhoto: function (oEvent) {
      var oSession = this.getModel("session");
      var iIdx = parseInt(oEvent.getSource().getBindingContext("session").getPath().split("/").pop(), 10);
      var aPhotos = oSession.getProperty("/deviationDraft/photos").slice();
      aPhotos.splice(iIdx, 1);
      oSession.setProperty("/deviationDraft/photos", aPhotos);
    },

    onSaveDeviation: function () {
      var oSession = this.getModel("session");
      var bType = !!oSession.getProperty("/deviationDraft/type");
      var bText = !!String(oSession.getProperty("/deviationDraft/justification")).trim();

      this.byId("typeSelect").setValueState(bType ? "None" : "Error");
      this.byId("justification").setValueState(bText ? "None" : "Error");
      if (!bType || !bText) { MessageToast.show(this.getText("deviationInvalid")); return; }

      this._commit(oSession.getProperty("/checklist/questions").length > 0, true);
    },

    /* =============== commit one item, start next =============== */
    _commit: function (bWithChecklist, bWithDeviation) {
      var oSession = this.getModel("session");
      var oData = oSession.getData();
      var get = function (sKey) {
        var f = oData.ocr.find(function (o) { return o.key === sKey; });
        return f ? f.value : "";
      };
      var aScans = oData.scans.slice();
      var aDev = oData.deviations.slice();
      var oScan = {
        delivery: oData.delivery, po: get("po"), batch: get("batch"), quantity: get("quantity"), uom: get("uom"),
        carton: get("carton"), pcs: get("pcs"), condition: this.getModel("view").getProperty("/condition"),
        checklist: bWithChecklist ? { answered: oData.checklist.answered || 0, total: oData.checklist.total || 0, flagged: oData.checklist.flagged || 0 } : null,
        deviationIndex: -1
      };

      if (bWithDeviation) {
        var oType = (this.getModel().getProperty("/deviationTypes") || []).find(function (t) { return t.key === oData.deviationDraft.type; });
        oScan.deviationIndex = aDev.length;
        aDev.push({
          type: oData.deviationDraft.type, justification: oData.deviationDraft.justification,
          photos: oData.deviationDraft.photos, reasons: oData.deviationDraft.reasons,
          scanIndex: aScans.length, signature: !!(oType && oType.signature)
        });
      }
      aScans.push(oScan);
      oSession.setProperty("/scans", aScans);
      oSession.setProperty("/deviations", aDev);

      // reset the "current item"; keep delivery + sensor (same truck / same device)
      oSession.setProperty("/ocr", []);
      oSession.setProperty("/photo", "");
      oSession.setProperty("/validation", Session.emptyValidation());
      oSession.setProperty("/checklist", { questions: [], percent: 0, display: "", flagged: 0 });
      oSession.setProperty("/deviationDraft", Session.emptyDraft());

      var oView = this.getModel("view");
      oView.setProperty("/condition", "");
      oView.setProperty("/showValidation", false);
      oView.setProperty("/reasonText", "");
      oView.setProperty("/entity", "-");
      this._updateCounts();
      this._resetPanels();
      MessageToast.show(this.getText("itemAdded"));
    },

    onReview: function () {
      if (this.getModel("session").getProperty("/ocr").length) {
        MessageToast.show(this.getText("itemPending"));
        return;
      }
      this.getRouter().navTo("summary");
    }
  });
});
