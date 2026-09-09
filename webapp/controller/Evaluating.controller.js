sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (Controller, JSONModel, Filter, FilterOperator) {
    "use strict";

    return Controller.extend("srt.app.controller.Evaluating", {

        onInit: function () {
            // ------------------------------------------------------------------
            // Sample data for now.
            // TODO: Replace this JSONModel with data loaded from the SAP
            // backend, e.g. an OData V2/V4 model bound directly to the table,
            // or a manual read via oModel.read("/EvaluationSet", {...}).
            // ------------------------------------------------------------------
            var oData = {
                items: [
                    { object: "MATERIAL_001", status: "Completed", statusState: "Success", date: "2026-08-01", message: "Evaluation finished successfully." },
                    { object: "CUSTOMER_014", status: "In Progress", statusState: "Warning", date: "2026-08-05", message: "Evaluation running." },
                    { object: "VENDOR_022", status: "Error", statusState: "Error", date: "2026-08-06", message: "Missing master data." },
                    { object: "SALESORDER_305", status: "Completed", statusState: "Success", date: "2026-08-10", message: "Evaluation finished successfully." },
                    { object: "MATERIAL_045", status: "Pending", statusState: "None", date: "2026-08-12", message: "Waiting to be processed." }
                ]
            };

            var oModel = new JSONModel(oData);
            this.getView().setModel(oModel, "evaluating");
        },

        onNavBack: function () {
            this.getOwnerComponent().getRouter().navTo("home");
        },

        onSearch: function (oEvent) {
            var sQuery = oEvent.getParameter("newValue");
            var oTable = this.byId("evaluatingTable");
            var oBinding = oTable.getBinding("items");

            if (!sQuery) {
                oBinding.filter([]);
                return;
            }

            var oFilter = new Filter({
                filters: [
                    new Filter("object", FilterOperator.Contains, sQuery),
                    new Filter("status", FilterOperator.Contains, sQuery)
                ],
                and: false
            });

            oBinding.filter([oFilter]);
        }
    });
});
