
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/TableSelectDialog",
    "sap/m/Column",
    "sap/m/ColumnListItem",
    "sap/m/Text",
    "sap/m/Label",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (
    Controller,
    JSONModel,
    MessageToast,
    TableSelectDialog,
    Column,
    ColumnListItem,
    Text,
    Label,
    Filter,
    FilterOperator
) {
    "use strict";

    var RIP_ENTITY_SET = "ZRI_I_RIPNO_VH";

    return Controller.extend("srt.app.controller.SelectiveRefresh", {

        onInit: function () {

            this.getView().setModel(
                new JSONModel({
                    groupId: "",
                    rfcDestination: "T30CLNT700",
                    copyAgain: false,
                    copyLoss: false,
                    copyAccount: false,
                    ranges: [
                        {
                            from: "",
                            to: ""
                        }
                    ]
                }),
                "wizard"
            );

            /*
             * Debug OData requests from ZGS_SRT_SRV.
             * This is only for debugging and can be removed later.
             */
            var oRIPModel = this.getOwnerComponent().getModel("ZGS_SRT_SRV");

            if (oRIPModel) {

                oRIPModel.attachRequestSent(function (oEvent) {

                    console.log("========== UI5 REQUEST SENT ==========");
                    console.log(
                        "Method:",
                        oEvent.getParameter("method")
                    );

                    console.log(
                        "URL:",
                        oEvent.getParameter("url")
                    );

                    console.log("======================================");

                });

                oRIPModel.attachRequestCompleted(function (oEvent) {

                    console.log("========== UI5 REQUEST COMPLETED ==========");

                    console.log(
                        "Method:",
                        oEvent.getParameter("method")
                    );

                    console.log(
                        "URL:",
                        oEvent.getParameter("url")
                    );

                    console.log("============================================");

                });

            } else {

                console.error(
                    "ZGS_SRT_SRV model is NOT available during onInit."
                );

            }
        },


        _clearForm: function () {

            var oModel = this.getView().getModel("wizard");

            oModel.setData({
                groupId: "",
                rfcDestination: "T30CLNT700",
                copyAgain: false,
                copyLoss: false,
                copyAccount: false,
                ranges: [
                    {
                        from: "",
                        to: ""
                    }
                ]
            });

            this.byId("groupIdSelect").setSelectedKey("");

            this.byId("rfcDestinationSelect")
                .setSelectedKey("T30CLNT700");

            this.byId("copyAgainSwitch")
                .setState(false);

            this.byId("copyLossSwitch")
                .setState(false);

            this.byId("copyAccSwitch")
                .setState(false);

            this.byId("rangeFromInput")
                .setValue("");

            this.byId("rangeToInput")
                .setValue("");
        },


        onNavBack: function () {

            this._clearForm();

            this.getOwnerComponent()
                .getRouter()
                .navTo("home");
        },


        onCancel: function () {

            this._clearForm();
        },


        onNext: function () {

            var oView = this.getView();

            /*
             * IMPORTANT:
             * This is the OData model used only for RIP execution.
             */
            var oRIPModel = oView.getModel("ZGS_SRT_SRV");

            /*
             * This is the local UI wizard model.
             */
            var oWizardModel = oView.getModel("wizard");


            if (!oRIPModel) {

                MessageToast.show(
                    "ZGS_SRT_SRV model is not available."
                );

                console.error(
                    "ZGS_SRT_SRV model NOT found."
                );

                return;
            }


            if (!oWizardModel) {

                MessageToast.show(
                    "Wizard model is not available."
                );

                console.error(
                    "wizard model NOT found."
                );

                return;
            }


            /*
             * Read values entered/selected by the user.
             */
            var sGroupId =
                oWizardModel.getProperty("/groupId");

            var sRfcDestination =
                oWizardModel.getProperty("/rfcDestination");

            var bCopyAgain =
                oWizardModel.getProperty("/copyAgain");

            var sRangeFrom =
                oWizardModel.getProperty("/ranges/0/from");

            var sRangeTo =
                oWizardModel.getProperty("/ranges/0/to");


            console.log("========== RIP INPUT ==========");
            console.log("Group ID:", sGroupId);
            console.log("RFC:", sRfcDestination);
            console.log("Copy Again:", bCopyAgain);
            console.log("RIP From:", sRangeFrom);
            console.log("RIP To:", sRangeTo);
            console.log("===============================");


            /*
             * Basic validation.
             */
            if (!sGroupId) {

                MessageToast.show(
                    "Please select Group Id."
                );

                return;
            }


            if (!sRfcDestination) {

                MessageToast.show(
                    "Please select RFC Destination."
                );

                return;
            }


            if (!sRangeFrom) {

                MessageToast.show(
                    "Please enter the From value."
                );

                return;
            }


            /*
             * Build OData filters.
             *
             * IMPORTANT:
             * Process ID is NOT sent from UI5.
             *
             * ABAP generates Process ID internally.
             */
            var aFilters = [];


            aFilters.push(
                new Filter(
                    "iv_grp_id",
                    FilterOperator.EQ,
                    sGroupId
                )
            );


            aFilters.push(
                new Filter(
                    "iv_rfc",
                    FilterOperator.EQ,
                    sRfcDestination
                )
            );


            aFilters.push(
                new Filter(
                    "iv_copy_again",
                    FilterOperator.EQ,
                    bCopyAgain
                )
            );


            aFilters.push(
                new Filter(
                    "iv_rip_from",
                    FilterOperator.EQ,
                    sRangeFrom
                )
            );


            /*
             * Send RIP To only when supplied.
             */
            if (sRangeTo) {

                aFilters.push(
                    new Filter(
                        "iv_rip_to",
                        FilterOperator.EQ,
                        sRangeTo
                    )
                );
            }


            console.log("========== RIP FILTERS ==========");

            aFilters.forEach(function (oFilter, iIndex) {

                console.log(
                    "Filter " + iIndex + ":",
                    oFilter
                );

            });

            console.log("=================================");


            /*
             * Call:
             *
             * /sap/opu/odata/sap/ZGS_SRT_SRV/RIPSet
             *
             * The backend RIPSET_GET_ENTITYSET method will:
             *
             * 1. Read these filters
             * 2. Generate Process ID
             * 3. Build the range
             * 4. Call ZRI_FM_SRT_ORCHESTRATOR
             */
            oRIPModel.read(
                "/RIPSet",
                { 

                    filters: aFilters,

                    success: function (oData) { console.log("========== BACKEND SUCCESS ==========");
                         console.log("Status Code: 200"); console.log("Service URL:", oRIPModel.sServiceUrl); 
                         console.log("Full Response:", oData); console.log("Results:", oData.results); 
                         if (oData.results && oData.results.length > 0) 
                            { console.log("========== BACKEND RESULT VALUES ==========");
                                 console.log("iv_grp_id:", oData.results[0].iv_grp_id);
                                  console.log("iv_rfc:", oData.results[0].iv_rfc); 
                                  console.log("iv_copy_again:", oData.results[0].iv_copy_again);
                                   console.log("iv_rip_from:", oData.results[0].iv_rip_from); 
                                   console.log("iv_rip_to:", oData.results[0].iv_rip_to); 
                                   console.log("==========================================");

                     } MessageToast.show("RIP execution started successfully."); },


                    error: function (oError) {

                        console.error(
                            "========== BACKEND ERROR =========="
                        );

                        console.error(
                            "Status Code:",
                            oError.statusCode
                        );

                        console.error(
                            "Status Text:",
                            oError.statusText
                        );

                        console.error(
                            "Response Text:",
                            oError.responseText
                        );

                        console.error(
                            "Response:",
                            oError
                        );

                        console.error(
                            "==================================="
                        );


                        MessageToast.show(
                            "Error while executing RIP."
                        );
                    }

                }
            );
        },


        onSaveAsVariant: function () {

            MessageToast.show(
                "Variant saved."
            );
        },


        onAddRange: function () {

            var oModel =
                this.getView().getModel("wizard");

            var aRanges =
                oModel.getProperty("/ranges") || [];

            aRanges.push({
                from: "",
                to: ""
            });

            oModel.setProperty(
                "/ranges",
                aRanges
            );
        },


        onClearRanges: function () {

            this.getView()
                .getModel("wizard")
                .setProperty(
                    "/ranges",
                    [
                        {
                            from: "",
                            to: ""
                        }
                    ]
                );
        },


        onRangeFromValueHelp: function () {

            this._openRIPValueHelp("from");
        },


        onRangeToValueHelp: function () {

            this._openRIPValueHelp("to");
        },


        _openRIPValueHelp: function (sField) {

            var oView = this.getView();

            var oWizardModel =
                oView.getModel("wizard");

            var sGroupId =
                oWizardModel.getProperty("/groupId");


            /*
             * Existing value help logic remains unchanged.
             *
             * It uses the DEFAULT OData MODEL.
             */
            if (sGroupId !== "RIP") {

                MessageToast.show(
                    "Value help is currently only available for Group Id 'RIP'."
                );

                return;
            }


            this._sRangeField = sField;


            /*
             * IMPORTANT:
             *
             * Value help continues to use the
             * existing/default OData service.
             */
            var oODataModel =
                oView.getModel();

            var oMetaModel =
                oODataModel.getMetaModel();


            oMetaModel.loaded().then(
                function () {

                    var oEntitySetDef =
                        oMetaModel.getODataEntitySet(
                            RIP_ENTITY_SET
                        );


                    if (!oEntitySetDef) {

                        MessageToast.show(
                            "Entity set '" +
                            RIP_ENTITY_SET +
                            "' not found in metadata."
                        );

                        return;
                    }


                    var oEntityType =
                        oMetaModel.getODataEntityType(
                            oEntitySetDef.entityType
                        );


                    var sKeyField =
                        oEntityType
                            .key
                            .propertyRef[0]
                            .name;


                    this._buildAndOpenDialog(
                        oEntityType,
                        sKeyField
                    );

                }.bind(this)
            );
        },


        _buildAndOpenDialog: function (
            oEntityType,
            sKeyField
        ) {

            var oView = this.getView();

            var aColumns = [];

            var aCells = [];


            oEntityType.property.forEach(
                function (oProp) {

                    if (
                        oProp["sap:visible"] === "false"
                    ) {
                        return;
                    }


                    aColumns.push(
                        new Column({
                            header: new Label({
                                text:
                                    oProp["sap:label"] ||
                                    oProp.name
                            })
                        })
                    );


                    if (
                        oProp.type ===
                        "Edm.DateTime"
                    ) {

                        aCells.push(
                            new Text({

                                text: {

                                    path: oProp.name,

                                    formatter:
                                        function (oDate) {

                                            if (!oDate) {
                                                return "";
                                            }


                                            var oDateObject =
                                                new Date(oDate);


                                            if (
                                                isNaN(
                                                    oDateObject.getTime()
                                                )
                                            ) {
                                                return "";
                                            }


                                            return oDateObject
                                                .toLocaleDateString(
                                                    "en-US",
                                                    {
                                                        month: "short",
                                                        day: "2-digit",
                                                        year: "numeric"
                                                    }
                                                );
                                        }
                                }
                            })
                        );

                    } else {

                        aCells.push(
                            new Text({
                                text:
                                    "{" +
                                    oProp.name +
                                    "}"
                            })
                        );
                    }

                }
            );


            var oDialog =
                new TableSelectDialog({

                    title: "Select RIP",

                    multiSelect: false,

                    noDataText: "No RIPs found",

                    columns: aColumns,


                    search: function (oEvent) {

                        var sValue =
                            oEvent.getParameter(
                                "value"
                            );

                        var oBinding =
                            oEvent
                                .getSource()
                                .getBinding(
                                    "items"
                                );


                        var oFilter =
                            sValue
                                ? new Filter(
                                    sKeyField,
                                    FilterOperator.Contains,
                                    sValue
                                )
                                : null;


                        if (oBinding) {

                            oBinding.filter(
                                oFilter
                                    ? [oFilter]
                                    : []
                            );
                        }

                    },


                    confirm:
                        this._onValueHelpConfirm
                            .bind(
                                this,
                                sKeyField
                            ),


                    cancel: function () {

                        oDialog.destroy();

                    }

                });


            /*
             * Value help continues to use DEFAULT MODEL.
             */
            oDialog.bindAggregation(
                "items",
                {

                    path:
                        "/" +
                        RIP_ENTITY_SET,

                    template:
                        new ColumnListItem({
                            cells: aCells
                        })

                }
            );


            oDialog.setModel(
                oView.getModel()
            );


            oView.addDependent(
                oDialog
            );


            oDialog.open();
        },


        _onValueHelpConfirm: function (
            sKeyField,
            oEvent
        ) {

            var aSelectedItems =
                oEvent.getParameter(
                    "selectedItems"
                ) || [];


            if (!aSelectedItems.length) {
                return;
            }


            var oModel =
                this.getView()
                    .getModel("wizard");


            var aRanges =
                oModel.getProperty("/ranges") ||
                [
                    {
                        from: "",
                        to: ""
                    }
                ];


            var aValues =
                aSelectedItems
                    .map(
                        function (oItem) {

                            var oContext =
                                oItem.getBindingContext();


                            return oContext
                                ? oContext
                                    .getObject()[
                                        sKeyField
                                    ]
                                : null;

                        }
                    )
                    .filter(Boolean);


            if (!aValues.length) {
                return;
            }


            aRanges[0] =
                aRanges[0] ||
                {
                    from: "",
                    to: ""
                };


            aRanges[0][
                this._sRangeField
            ] = aValues[0];


            for (
                var i = 1;
                i < aValues.length;
                i++
            ) {

                aRanges.push({
                    from: aValues[i],
                    to: aValues[i]
                });

            }


            oModel.setProperty(
                "/ranges",
                aRanges
            );


            oEvent
                .getSource()
                .destroy();
        }

    });
});

