sap.ui.define([
  "./BaseController",
  "sap/ui/model/json/JSONModel",
  "sap/ui/model/Filter",
  "sap/ui/model/FilterOperator",
  "sap/m/SelectDialog",
  "sap/m/StandardListItem",
  "sap/m/MessageToast"
], function (BaseController, JSONModel, Filter, FilterOperator, SelectDialog, StandardListItem, MessageToast) {
  "use strict";

  return BaseController.extend("zgr.controls.controller.OpenControl", {

    onInit: function () {
      this.setModel(new JSONModel({ truckLocked: false }), "view");
    },

    /* ---------- GI / GR ---------- */
    onModeSelect: function (oEvent) {
      var oSession = this.getModel("session");
      oSession.setProperty("/mode", oEvent.getParameter("selectedIndex") === 1 ? "GR" : "GI");
      oSession.setProperty("/truck", "");           // truck list differs per mode
      this.getModel("view").setProperty("/truckLocked", false);
    },

    /* ---------- Language (E / S) ---------- */
    onLanguageChange: function (oEvent) {
      var sKey = oEvent.getParameter("selectedItem").getKey();
      this.getModel("session").setProperty("/language", sKey);
      this.getOwnerComponent().setLanguage(sKey);
    },

    /* ---------- Truck No ---------- */
    onTruckChange: function (oEvent) {
      this.getModel("session").setProperty("/truck", oEvent.getParameter("value").trim().toUpperCase());
      this.getModel("view").setProperty("/truckLocked", false);
    },

    onEditTruck: function () {
      this.getModel("view").setProperty("/truckLocked", false);
      setTimeout(function () { this.byId("truckInput").focus(); }.bind(this), 0);
    },

    onTruckValueHelp: function () {
      if (!this._oDialog) {
        this._oDialog = new SelectDialog({
          items: {
            path: "/trucks",
            template: new StandardListItem({ title: "{truck}", description: "{type}" })
          },
          search: function (oEvt) {
            oEvt.getSource().getBinding("items").filter(this._filters(oEvt.getParameter("value")));
          }.bind(this),
          confirm: function (oEvt) {
            var oItem = oEvt.getParameter("selectedItem");
            if (oItem) {
              this.getModel("session").setProperty("/truck", oItem.getTitle());
              this.getModel("view").setProperty("/truckLocked", true);   // system-derived -> pencil to override
              this.byId("truckInput").setValueState("None");
            }
          }.bind(this)
        });
        this.getView().addDependent(this._oDialog);
      }
      this._oDialog.setTitle(this.getText("selectTruck"));
      this._oDialog.getBinding("items").filter(this._filters(""));
      this._oDialog.open();
    },

    _filters: function (sValue) {
      var a = [new Filter("type", FilterOperator.EQ, this.getModel("session").getProperty("/mode"))];
      if (sValue) { a.push(new Filter("truck", FilterOperator.Contains, sValue)); }
      return a;
    },

    /* ---------- Seal scan ---------- */
    onScanSuccess: function (oEvent) {
      if (oEvent.getParameter("cancelled")) { return; }
      this.getModel("session").setProperty("/seal", (oEvent.getParameter("text") || "").trim());
      this.byId("sealInput").setValueState("None");
    },
    onScanFail: function () { MessageToast.show(this.getText("scanFailed")); },

    onInputLiveChange: function (oEvent) { oEvent.getSource().setValueState("None"); },

    /* ---------- Continue ---------- */
    onContinue: function () {
      var oSession = this.getModel("session");
      var bValid = true;
      [["truckInput", "/truck"], ["sealInput", "/seal"], ["warehouseInput", "/warehouse"]].forEach(function (a) {
        var bEmpty = !String(oSession.getProperty(a[1])).trim();
        this.byId(a[0]).setValueState(bEmpty ? "Error" : "None");
        bValid = bValid && !bEmpty;
      }, this);

      if (!bValid) { MessageToast.show(this.getText("fillRequired")); return; }
      this.getRouter().navTo("inspect");
    }
  });
});
