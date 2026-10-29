sap.ui.define([
  "sap/ui/core/UIComponent",
  "sap/ui/Device",
  "sap/ui/model/json/JSONModel",
  "sap/ui/model/resource/ResourceModel",
  "sap/base/i18n/Localization",
  "./util/Session"
], function (UIComponent, Device, JSONModel, ResourceModel, Localization, Session) {
  "use strict";

  return UIComponent.extend("zgr.controls.Component", {
    metadata: { manifest: "json", interfaces: ["sap.ui.core.IAsyncContentCreation"] },

    init: function () {
      UIComponent.prototype.init.apply(this, arguments);

      var oDevice = new JSONModel(Device);
      oDevice.setDefaultBindingMode("OneWay");
      this.setModel(oDevice, "device");

      this.setModel(new JSONModel(Session.create("GR", "E")), "session");
      this.setLanguage("E");

      this.getRouter().initialize();
    },

    /** Language dropdown: E = English, S = Slovenian. Swaps the i18n model at runtime. */
    setLanguage: function (sKey) {
      var sLocale = sKey === "S" ? "sl" : "en";
      Localization.setLanguage(sLocale);               // also localises UI5's own texts (MessageBox, dialogs...)
      this.setModel(new ResourceModel({
        bundleName: "zgr.controls.i18n.i18n",
        bundleLocale: sLocale,
        supportedLocales: ["en", "sl"],
        fallbackLocale: "en"
      }), "i18n");
    },

    /** Fresh session after Submit, keeping the chosen language. */
    resetSession: function () {
      var oSession = this.getModel("session");
      oSession.setData(Session.create(oSession.getProperty("/mode"), oSession.getProperty("/language")));
    },

    getContentDensityClass: function () {
      return Device.support.touch ? "sapUiSizeCozy" : "sapUiSizeCompact";
    }
  });
});
