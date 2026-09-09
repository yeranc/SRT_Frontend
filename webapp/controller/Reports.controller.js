sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast"
], function (Controller, JSONModel, MessageToast) {
    "use strict";

    return Controller.extend("srt.app.controller.Reports", {

        onInit: function () {
            this._loadSampleData();
        },

        onNavBack: function () {
            this.getOwnerComponent().getRouter().navTo("home");
        },

        onSearchReports: function () {
            var oDateFrom = this.byId("dateFrom").getDateValue();
            var oDateTo = this.byId("dateTo").getDateValue();

            // ------------------------------------------------------------------
            // TODO: Replace sample logic with actual backend call, e.g.:
            //
            //   var oModel = this.getOwnerComponent().getModel("backend");
            //   oModel.read("/ReportSet", {
            //       filters: [
            //           new Filter("CreatedOn", FilterOperator.BT, oDateFrom, oDateTo)
            //       ],
            //       success: function (oData) { ... },
            //       error: function () { ... }
            //   });
            // ------------------------------------------------------------------

            MessageToast.show("Search executed (sample data only)");
        },

        onRefreshReports: function () {
            // TODO: Replace with a re-read of the backend OData service.
            this._loadSampleData();
            MessageToast.show("Reports refreshed");
        },

        _loadSampleData: function () {
            var oData = {
                items: [
                    { report: "Monthly Refresh Summary", status: "Completed", statusState: "Success", createdOn: "2026-08-01", records: 128 },
                    { report: "Evaluation Overview", status: "Completed", statusState: "Success", createdOn: "2026-08-05", records: 64 },
                    { report: "Upload Error Log", status: "Warning", statusState: "Warning", createdOn: "2026-08-10", records: 7 },
                    { report: "Object Change History", status: "Completed", statusState: "Success", createdOn: "2026-08-14", records: 342 }
                ]
            };

            var oModel = new JSONModel(oData);
            this.getView().setModel(oModel, "reports");
        }
    });
});
