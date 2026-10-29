sap.ui.define([], function () {
  "use strict";
  var MAX_SIDE = 1280;

  function compress(oFile) {
    return new Promise(function (resolve, reject) {
      var oReader = new FileReader();
      oReader.onerror = reject;
      oReader.onload = function () {
        var oImg = new Image();
        oImg.onerror = reject;
        oImg.onload = function () {
          var fScale = Math.min(1, MAX_SIDE / Math.max(oImg.width, oImg.height));
          var oCanvas = document.createElement("canvas");
          oCanvas.width = Math.round(oImg.width * fScale);
          oCanvas.height = Math.round(oImg.height * fScale);
          oCanvas.getContext("2d").drawImage(oImg, 0, 0, oCanvas.width, oCanvas.height);
          resolve(oCanvas.toDataURL("image/jpeg", 0.8));
        };
        oImg.src = oReader.result;
      };
      oReader.readAsDataURL(oFile);
    });
  }

  return {
    /** Opens camera (file picker on desktop). Resolves with a data URL, or null if cancelled. */
    capture: function () {
      return new Promise(function (resolve, reject) {
        var oInput = document.createElement("input");
        oInput.type = "file";
        oInput.accept = "image/*";
        oInput.setAttribute("capture", "environment");
        oInput.style.display = "none";
        var fnClean = function () { if (oInput.parentNode) { oInput.parentNode.removeChild(oInput); } };
        oInput.addEventListener("change", function () {
          var oFile = oInput.files && oInput.files[0];
          fnClean();
          if (!oFile) { resolve(null); return; }
          compress(oFile).then(resolve, reject);
        });
        oInput.addEventListener("cancel", function () { fnClean(); resolve(null); });
        document.body.appendChild(oInput);
        oInput.click();
      });
    }
  };
});
