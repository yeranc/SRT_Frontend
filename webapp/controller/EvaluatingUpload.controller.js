sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast"
], function (Controller, MessageToast) {
    "use strict";

    return Controller.extend("srt.app.controller.EvaluatingUpload", {

        onInit: function () {
            this._sFileName = null;
        },

        onNavBack: function () {
            this.getOwnerComponent().getRouter().navTo("home");
        },

        onFileChange: function (oEvent) {
            var oFile = oEvent.getParameter("files") && oEvent.getParameter("files")[0];
            this._sFileName = oFile ? oFile.name : null;
        },

        onUpload: function () {
            var oStatusText = this.byId("uploadStatusText");

            if (!this._sFileName) {
                MessageToast.show(this._getText("uploadStatusError"));
                return;
            }

            // ------------------------------------------------------------------
            // TODO: Connect this upload to the SAP backend.
            //
            // Example using the FileUploader control against an OData V2
            // media entity / upload endpoint:
            //
            //   var oFileUploader = this.byId("fileUploader");
            //   oFileUploader.setUploadUrl(
            //       "/sap/opu/odata/sap/ZSRT_UPLOAD_SRV/FileSet"
            //   );
            //   oFileUploader.upload();
            //
            // Or, for a simple REST/OData V4 upload, use fetch()/XHR with
            // the file selected in onFileChange().
            // ------------------------------------------------------------------

            MessageToast.show("File '" + this._sFileName + "' upload submitted");
            oStatusText.setText(this._getText("uploadStatusDone"));
        },

        _getText: function (sKey) {
            return this.getView().getModel("i18n").getResourceBundle().getText(sKey);
        }
    });
});
