
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast"
], function (Controller, JSONModel, MessageToast) {
    "use strict";

    return Controller.extend(
        "srt.app.controller.ObjectDetails",
        {
            onInit: function () {
                this.getView().setModel(
                    new JSONModel({
                        pageTitle: "Object Details",
                        objectTitle: "",
                        groupLabel: "",
                        properties: []
                    }),
                    "details"
                );

                this.getOwnerComponent()
                    .getRouter()
                    .getRoute("objectDetails")
                    .attachPatternMatched(
                        this._onRouteMatched,
                        this
                    );
            },

            _onRouteMatched: function () {
                var oComponent = this.getOwnerComponent();

                // Data is shared by the details page and source page.
                var oSelectedModel =
                    oComponent.getModel("selectedObject");

                if (!oSelectedModel) {
                    MessageToast.show(
                        "No object details are available."
                    );

                    this.onNavBack();
                    return;
                }

                var oData = oSelectedModel.getData();
                var oDetailsModel =
                    this.getView().getModel("details");

                var aProperties = Object.keys(oData)
                    .filter(function (sKey) {
                        return oData[sKey] !== null &&
                            oData[sKey] !== undefined &&
                            typeof oData[sKey] !== "object";
                    })
                    .map(function (sKey) {
                        return {
                            label: this._formatLabel(sKey),
                            value: String(oData[sKey])
                        };
                    }, this);

                oDetailsModel.setData({
                    pageTitle: "Object Details",
                    objectTitle: this._getObjectTitle(
                        oData,
                        oSelectedModel.getProperty("/groupId")
                    ),
                    groupLabel:
                        "Group: " +
                        (oSelectedModel.getProperty("/groupId") || ""),
                    properties: aProperties
                });
            },

            _getObjectTitle: function (oData, sGroupId) {
                var mTitleProperties = {
                    B: "bp_external",
                    A: "AccountNumber",
                    T: "vtgnr",
                    RIP: "RIPNumber",
                    TCR: "vtgrrnr",
                    L: "schadnr"
                };

                var sProperty = mTitleProperties[sGroupId];
                return sProperty && oData[sProperty] !== undefined
                    ? String(oData[sProperty])
                    : "Selected Object";
            },

            _formatLabel: function (sKey) {
                return sKey
                    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
                    .replace(/_/g, " ")
                    .replace(/^./, function (s) {
                        return s.toUpperCase();
                    });
            },

            onNavBack: function () {
                this.getOwnerComponent()
                    .getRouter()
                    .navTo("selectiveRefresh");
            }
        }
    );
});
