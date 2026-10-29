sap.ui.define([], function () {
  "use strict";
  return {
    confidenceState: function (f) { return f >= 0.85 ? "Success" : (f >= 0.7 ? "Warning" : "Error"); },
    panelState: function (sStatus) { return sStatus === "done" ? "Success" : (sStatus === "active" ? "Information" : "None"); }
  };
});
