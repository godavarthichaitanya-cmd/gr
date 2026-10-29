sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/core/routing/History",
  "sap/base/strings/formatMessage",
  "../model/formatter"
], function (Controller, History, formatMessage, formatter) {
  "use strict";

  return Controller.extend("zgr.controls.controller.BaseController", {
    formatter: formatter,

    getRouter: function () { return this.getOwnerComponent().getRouter(); },
    getModel: function (sName) { return this.getView().getModel(sName); },
    setModel: function (oModel, sName) { return this.getView().setModel(oModel, sName); },
    getText: function (sKey, aArgs) {
      return this.getOwnerComponent().getModel("i18n").getResourceBundle().getText(sKey, aArgs);
    },

    /** "{0} ... {1}" formatter usable from XML: parts: ['i18n>key', 'a', 'b'] */
    formatText: function (sPattern) {
      return formatMessage(sPattern, Array.prototype.slice.call(arguments, 1));
    },

    /** Browser refresh / deep link protection: screen 1 data is mandatory. */
    requireSession: function () {
      var oS = this.getOwnerComponent().getModel("session");
      if (!oS.getProperty("/truck") || !oS.getProperty("/seal") || !oS.getProperty("/warehouse")) {
        this.getRouter().navTo("openControl", {}, true);
        return false;
      }
      return true;
    },

    onNavBack: function () {
      if (History.getInstance().getPreviousHash() !== undefined) {
        window.history.go(-1);
      } else {
        this.getRouter().navTo("openControl", {}, true);
      }
    }
  });
});
