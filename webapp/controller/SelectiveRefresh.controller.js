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
    "sap/ui/model/FilterOperator",
    "sap/ui/table/Column",
    "sap/m/BusyDialog",
    "sap/m/Input",
    "sap/ui/comp/filterbar/FilterBar",
    "sap/ui/comp/filterbar/FilterGroupItem",
    "sap/ui/comp/valuehelpdialog/ValueHelpDialog",
    "sap/m/Token",
    "sap/m/SearchField",
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
    FilterOperator,
    TableColumn,
    BusyDialog,
    Input,
    FilterBar,
    FilterGroupItem,
    ValueHelpDialog,
    Token,
    SearchField
) {
    "use strict";

    var RIP_ENTITY_SET = "ZRI_I_RIPNO_VH";
    var EXEC_POLL_INTERVAL_MS = 500;
    var EXEC_POLL_TIMEOUT_MS = 50000;

    return Controller.extend("srt.app.controller.SelectiveRefresh", {

        onInit: function () {

            this.getView().setModel(
                new JSONModel({
                    groupId: "",
                    rfcDestination: "T30CLNT700",
                    copy: false,
                    copyAgain: false,
                    copyLoss: false,
                    copyAccount: false,
                    copyAgainEnabled: false,
                    copyLossEventAgain: false,
                    copyLossEventAgainEnabled: false,
                    copyLossAgain: false,
                    copyLossAgainEnabled: false,
                    selectedResults: [],
                    accountNumbers: [],
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
            this._oBusyDialog = new BusyDialog({

                // text: "Please wait while the data is being fetched..."

            });

            this._oBusyDialog.addStyleClass("srtBusyDialog");

            this.getView().addDependent(this._oBusyDialog);
        },


        _clearForm: function () {

            var oModel = this.getView().getModel("wizard");

            oModel.setData({
                groupId: "",
                rfcDestination: "T30CLNT700",
                copyAgain: false,
                copyLoss: false,
                copyAccount: false,
                selectedResult: null,
                selectedResults: [],
                accountNumbers: [],
                ranges: [
                    {
                        from: "",
                        to: ""
                    }
                ]
            });

            [
                "treatyInput", "accountNumberInput", "ripNumberInput",
                "tcrNumberInput", "LossInput"
            ].forEach(function (sId) {
                var oInp = this.byId(sId);
                if (oInp && oInp.removeAllTokens) {
                    oInp.removeAllTokens();
                    oInp.setValue("");
                }
            }, this);
            this._clearResultTable();
        },


        onNavBack: function () {

            this._clearForm();
            this._clearResultTable();

            var oContainer = this.byId("selectionCriteriaContainer");

            if (this._oSelectionFragment) {
                this._oSelectionFragment.destroy();
                this._oSelectionFragment = null;
            }

            oContainer.removeAllItems();

            this.getOwnerComponent()
                .getRouter()
                .navTo("home");
        },
        onGroupIdChange: function (oEvent) {

            var sGroupId = oEvent
                .getSource()
                .getSelectedKey();

            var oWizardModel =
                this.getView().getModel("wizard");
            oWizardModel.setProperty(
                "/selectedResult",
                null
            );
            oWizardModel.setProperty(

                "/groupId",
                sGroupId
            );
            this._clearResultTable();

            oWizardModel.setProperty("/copyAgain", false);
            oWizardModel.setProperty("/copyLoss", false);
            oWizardModel.setProperty("/copyAccount", false);
            oWizardModel.setProperty("/copyRip", false);
            oWizardModel.setProperty("/copyTcr", false);

            // Also reset the switches themselves

            // this.byId("copyAgainSwitch").setSelected(false);
            // this.byId("copyLossSwitch").setSelected(false);
            // this.byId("copyAccSwitch").setSelected(false);
            // // =====================================================
            // SHOW / HIDE COPY OPTIONS BASED ON GROUP ID
            // =====================================================

            // var oCopyLossField =
            //     this.byId("copyLossSwitch");

            // var oCopyAccountField =
            //     this.byId("copyAccSwitch");

            // var oCopyAgainField =
            //     this.byId("copyAgainSwitch");

            // var oCopyTcrField =
            //     this.byId("copyTcrSwitch");

            // var oCopyRipField =
            //     this.byId("copyRipSwitch");

            // if (sGroupId === "B") {

            //     // Business Partner
            //     oCopyAgainField.setVisible(false);
            //     oCopyLossField.setVisible(false);
            //     oCopyAccountField.setVisible(false);
            //     oCopyRipField.setVisible(false);
            //     oCopyTcrField.setVisible(false);


            // Reset values because these options are not applicable
            //     oWizardModel.setProperty(
            //         "/copyLoss",
            //         false
            //     );

            //     oWizardModel.setProperty(
            //         "/copyAccount",
            //         false
            //     );

            //     // this.byId("copyLossSwitch")
            //     //     .setState(false);

            //     // this.byId("copyAccSwitch")
            //     //     .setState(false);

            // }
            // else if (sGroupId === "A") {
            //     oCopyAgainField.setVisible(false);
            //     oCopyLossField.setVisible(false);
            //     oCopyAccountField.setVisible(false);
            //     oCopyRipField.setVisible(false);
            //     oCopyTcrField.setVisible(false);

            // }

            // else if (sGroupId === "RIP") {
            //     oCopyAgainField.setVisible(true);
            //     oCopyLossField.setVisible(true);
            //     oCopyAccountField.setVisible(true);
            //     oCopyRipField.setVisible(false);
            //     oCopyTcrField.setVisible(false);

            // }

            // else {

            //     // Treaty / other objects
            //     oCopyAgainField.setVisible(true);
            //     oCopyLossField.setVisible(true);
            //     oCopyAccountField.setVisible(true);
            //     oCopyRipField.setVisible(true);
            //     oCopyTcrField.setVisible(true);


            //     // Initially disabled until a row with target is selected
            //     oWizardModel.setProperty("/copyAgain", false);
            //     oWizardModel.setProperty("/copyAgainEnabled", false);
            // }

            // Clear previous result table
            this._clearResultTable();

            // Load filters for selected object
            this._showSelectionFragment(sGroupId);
        },
        _clearResultTable: function () {

            var oContainer =
                this.byId("resultTableContainer");

            if (!oContainer) {
                return;
            }

            if (this._oResultTable) {

                // IMPORTANT: remove old OData binding
                this._oResultTable.unbindRows();

                this._oResultTable.clearSelection();
            }

            oContainer.setVisible(false);
        },
        _showSelectionFragment: function (sGroupId) {

            var oContainer = this.byId("selectionCriteriaContainer");

            // Destroy previously loaded fragment
            if (this._oSelectionFragment) {
                this._oSelectionFragment.destroy();
                this._oSelectionFragment = null;
            }

            // Remove anything still inside the container
            oContainer.removeAllItems();

            var sFragmentName = "";

            if (sGroupId === "B") {
                sFragmentName = "srt.app.view.fragments.Partner";
            } else if (sGroupId === "T") {
                sFragmentName = "srt.app.view.fragments.Treaty";
            } else if (sGroupId === "A") {
                sFragmentName = "srt.app.view.fragments.Account";
            } else if (sGroupId === "RIP") {
                sFragmentName = "srt.app.view.fragments.Rip";
            } else if (sGroupId === "TCR") {
                sFragmentName = "srt.app.view.fragments.Tcr";
            } else if (sGroupId === "RAM") {
                sFragmentName = "srt.app.view.fragments.Ram";
            } else if (sGroupId === "L") {
                sFragmentName = "srt.app.view.fragments.Loss";
            } else {
                console.log("No selection fragment configured for:", sGroupId);
                return;
            }

            console.log("Loading selection fragment:", sFragmentName);

            this.loadFragment({
                name: sFragmentName
            }).then(function (oFragment) {

                console.log("Selection fragment loaded:", oFragment);

                this._oSelectionFragment = oFragment;

                oContainer.addItem(oFragment);

                this._attachTokenValidators();

            }.bind(this)).catch(function (oError) {

                console.error("Error loading selection fragment:", oError);

            }.bind(this));
        },

        onCancel: function () {

            this._clearForm();
        },


        onNext: function () {

            var oView = this.getView();

            var oExecutionModel =
                oView.getModel("ZGS_SRT_SRV");

            var oWizardModel =
                oView.getModel("wizard");


            if (!oExecutionModel) {
                MessageToast.show(
                    "Execution service is not available."
                );
                return;
            }


            if (!oWizardModel) {
                MessageToast.show(
                    "Wizard model is not available."
                );
                return;
            }


            var sGroupId =
                oWizardModel.getProperty("/groupId");

            var sRfcDestination =
                oWizardModel.getProperty("/rfcDestination");

            var bCopyAgain =
                oWizardModel.getProperty("/copyAgain");

            var aSelectedResults =
                oWizardModel.getProperty("/selectedResults") || [];


            if (!sGroupId) {
                MessageToast.show(
                    "Please select an object."
                );
                return;
            }


            if (!sRfcDestination) {
                MessageToast.show(
                    "Please select RFC Destination."
                );
                return;
            }


            if (!aSelectedResults.length) {
                MessageToast.show(
                    "Please select at least one row before executing."
                );
                return;
            }


            var oConfig =
                this._getResultTableConfig(sGroupId);


            if (!oConfig || !oConfig.sourceProperty) {

                MessageToast.show(
                    "Source key is not configured for this object."
                );

                console.error(
                    "Missing sourceProperty for:",
                    sGroupId
                );

                return;
            }

            var iSuccess = 0;
            var iFailed = 0;


            console.log(
                "TOTAL SELECTED:",
                aSelectedResults.length,
                aSelectedResults
            );


            // ==========================================
            // COLLECT ALL SELECTED OBJECT KEYS
            // ==========================================
            var aObjectKeys = aSelectedResults
                .map(function (oItem) {
                    return oItem[oConfig.sourceProperty];
                })
                .filter(function (vKey) {
                    return vKey !== null &&
                        vKey !== undefined &&
                        String(vKey).trim() !== "";
                })
                .map(function (vKey) {
                    return String(vKey).trim();
                });
            this._oBusyDialog.setText(
                "Processing objects..."
            );

            this._oBusyDialog.open();

            console.log("Busy dialog opened");

            // ==========================================
            // VALIDATE
            // ==========================================
            if (!aObjectKeys.length) {

                this._oBusyDialog.close();

                MessageToast.show(
                    "No valid objects selected."
                );

                return;
            }


            console.log(
                "ALL OBJECT KEYS:",
                aObjectKeys
            );


            // ==========================================
            // SEND ALL OBJECTS IN ONE RIPSet REQUEST
            // ==========================================
            var sObjectKeys = aObjectKeys.join(",");

            console.log(
                "OBJECT KEYS SENT TO RIPSet:",
                sObjectKeys
            );

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
                    sObjectKeys
                )
            );

            // ==========================================
            // DEPENDENT OBJECTS (Treaty / RIP)
            // Sent only for the checkboxes the user ticked
            // ==========================================
            var mDependents = {
                T: [
                    ["copyLoss", "iv_is_loss_req"],
                    ["copyAccount", "iv_is_acc_req"],
                    ["copyRip", "iv_is_rip_req"],
                    ["copyTcr", "iv_is_tcr_req"]
                ],
                RIP: [
                    ["copyLoss", "iv_is_loss_req"],
                    ["copyAccount", "iv_is_acc_req"]
                ]
            };

            (mDependents[sGroupId] || []).forEach(function (aMap) {

                if (oWizardModel.getProperty("/" + aMap[0])) {

                    aFilters.push(
                        new Filter(
                            aMap[1],
                            FilterOperator.EQ,
                            true
                        )
                    );
                }
            });


            // ==========================================
            // ONE RIPSet CALL ONLY
            // ==========================================
            oExecutionModel.read(
                "/RIPSet",
                {
                    filters: aFilters,

                    success: function (oData) {

                        var sProcessId =
                            oData.results && oData.results.length > 0
                                ? oData.results[0].process_id
                                : "";

                        // this._oBusyDialog.setText(
                        //     "..."
                        // );

                        (sProcessId
                            ? this._waitForExecution(sGroupId, aObjectKeys, sProcessId)
                            : Promise.resolve(false)
                        )
                            .then(function (bDone) {

                                // Reload the table with the same filters as the last Go
                                var oBinding = this._oResultTable.getBinding("rows");

                                return new Promise(function (resolve) {
                                    oBinding.attachEventOnce("dataReceived", function () {
                                        resolve(bDone);
                                    });
                                    oBinding.refresh(true);
                                });

                            }.bind(this))

                            .then(function (bDone) {

                                this._oBusyDialog.close();

                                MessageToast.show(
                                    bDone
                                        ? aObjectKeys.length + " object(s) replicated. Processing ID: " + sProcessId
                                        : aObjectKeys.length + " object(s) submitted. Not confirmed yet - press Go again to refresh."
                                );

                            }.bind(this))

                            .catch(function (oError) {

                                this._oBusyDialog.close();

                                MessageToast.show(
                                    "Refresh failed. " + this._getErrorText(oError)
                                );

                            }.bind(this));

                    }.bind(this),

                    error: function (oError) {

                        console.error(
                            "RIPSet FAILED:",
                            oError
                        );


                        this._oBusyDialog.close();


                        MessageToast.show(
                            "Execution failed. " +
                            this._getErrorText(oError)
                        );

                    }.bind(this)
                }
            );
        },


        onSaveAsVariant: function () {

            MessageToast.show(
                "Variant saved."
            );
        },
        _waitForExecution: function (sGroupId, aKeys, sProcessId) {

            var oConfig = this._getResultTableConfig(sGroupId);
            var oBinding = this._oResultTable.getBinding("rows");
            var sProcessProperty = oConfig.columns.filter(function (oColumn) {
                return oColumn.label === "Process Ref ID";
            })[0].property;
            var iStart = Date.now();

            return new Promise(function (resolve, reject) {

                (function poll() {

                    oBinding.getModel().read(oBinding.getPath(), {
                        filters: [new Filter({
                            filters: aKeys.map(function (sKey) {
                                return new Filter(oConfig.sourceProperty, FilterOperator.EQ, sKey);
                            }),
                            and: false
                        })],
                        success: function (oData) {

                            var bDone = aKeys.every(function (sKey) {
                                return oData.results.some(function (oRow) {
                                    return String(oRow[oConfig.sourceProperty]).trim() === sKey &&
                                        String(oRow[sProcessProperty] || "").trim() === sProcessId;
                                });
                            });

                            if (bDone || Date.now() - iStart >= EXEC_POLL_TIMEOUT_MS) {
                                resolve(bDone);
                            } else {
                                setTimeout(poll, EXEC_POLL_INTERVAL_MS);
                            }
                        },
                        error: reject
                    });

                })();
            });
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
                                                        year: "numeric",
                                                        timeZone: "UTC"
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
        },

        onBPGo: function () {

            var oWizardModel =
                this.getView().getModel("wizard");

            var aFilters = [];

            var sBusinessPartner =
                oWizardModel.getProperty("/businessPartner");

            var sProcessRefId =
                oWizardModel.getProperty("/processRefId");

            var sTargetSystem =
                oWizardModel.getProperty("/targetSystem");


            if (sBusinessPartner) {

                aFilters.push(
                    new Filter(
                        "bp_external",
                        FilterOperator.EQ,
                        sBusinessPartner
                    )
                );
            }

            if (sProcessRefId) {

                aFilters.push(
                    new Filter(
                        "Process_id",
                        FilterOperator.EQ,
                        sProcessRefId
                    )
                );
            }

            if (sTargetSystem) {

                aFilters.push(
                    new Filter(
                        "destination",
                        FilterOperator.EQ,
                        sTargetSystem
                    )
                );
            }


            var oModel =
                this.getView()
                    .getModel("ZRI_S_BUSINESS_PARTNER");

            if (!oModel) {

                MessageToast.show(
                    "Business Partner service is not available."
                );

                return;
            }


            this._showResultTable(
                oModel,
                "/ZRI_C_BUSINESS_PARTNER",
                aFilters
            );
        },
        onBusinessPartnerValueHelp: function () {

            var oView = this.getView();

            var oBPModel =
                oView.getModel("ZRI_S_BUSINESS_PARTNER");

            if (!oBPModel) {
                MessageToast.show(
                    "Business Partner service is not available."
                );
                return;
            }

            var oDialog = new TableSelectDialog({

                title: "Select Business Partner",
                contentWidth: "60%",
                contentHeight: "55%",

                multiSelect: false,

                noDataText: "No Business Partners found",

                columns: [
                    new Column({
                        header: new Label({
                            text: "Business Partner"
                        })
                    }),

                    new Column({
                        header: new Label({
                            text: "External BP Number"
                        })
                    }),

                    new Column({
                        header: new Label({
                            text: "BP Type"
                        })
                    }),


                ],

                search: function (oEvent) {

                    var sValue =
                        oEvent.getParameter("value");

                    var oBinding =
                        oEvent.getSource()
                            .getBinding("items");

                    var aFilters = [];

                    if (sValue) {

                        aFilters.push(
                            new Filter({
                                filters: [

                                    new Filter(
                                        "bp_external",
                                        FilterOperator.Contains,
                                        sValue
                                    ),

                                    new Filter(
                                        "bpext",
                                        FilterOperator.Contains,
                                        sValue
                                    )

                                ],

                                and: false
                            })
                        );
                    }

                    oBinding.filter(aFilters);
                },

                confirm: function (oEvent) {

                    var oSelectedItem =
                        oEvent.getParameter(
                            "selectedItem"
                        );

                    if (!oSelectedItem) {
                        return;
                    }

                    var oContext =
                        oSelectedItem.getBindingContext(
                            "bp"
                        );

                    if (!oContext) {
                        return;
                    }

                    var oSelectedBP =
                        oContext.getObject();

                    oView.getModel("wizard")
                        .setProperty(
                            "/businessPartner",
                            oSelectedBP.bp_external
                        );

                    oDialog.destroy();
                },

                cancel: function () {
                    oDialog.destroy();
                }

            });


            oDialog.setModel(
                oBPModel,
                "bp"
            );


            oDialog.bindAggregation(
                "items",
                {
                    path: "bp>/ZRI_C_BUSINESS_PARTNER",

                    template: new ColumnListItem({

                        cells: [

                            new Text({
                                text: "{bp>bp_external}"
                            }),

                            new Text({
                                text: "{bp>bpext}"
                            }),

                            new Text({
                                text: "{bp>type}"
                            }),


                        ]

                    })
                }
            );


            oView.addDependent(oDialog);

            oDialog.open();
        },
        _showResultTable: function (oModel, sPath, aFilters) {

            var oContainer =
                this.byId("resultTableContainer");

            if (!oContainer) {
                return;
            }

            if (this._oResultTable) {

                this._configureResultTable(
                    this._oResultTable,
                    oModel,
                    sPath,
                    aFilters
                );

                oContainer.setVisible(true);
                return;
            }

            if (this._pResultTable) {

                this._pResultTable.then(function (oTable) {

                    this._configureResultTable(
                        oTable,
                        oModel,
                        sPath,
                        aFilters
                    );

                    oContainer.setVisible(true);

                }.bind(this));

                return;
            }

            this._pResultTable = this.loadFragment({
                name: "srt.app.view.fragments.ResultTable",
                id: this.getView().getId() + "--resultTableFragment"
            }).then(function (oTable) {

                this._oResultTable = oTable;

                oContainer.removeAllItems();
                oContainer.addItem(oTable);

                this._configureResultTable(
                    oTable,
                    oModel,
                    sPath,
                    aFilters
                );

                oContainer.setVisible(true);

                return oTable;

            }.bind(this));
        },
        _configureResultTable: function (
            oTable,
            oModel,
            sPath,
            aFilters
        ) {

            var sGroupId =
                this.getView()
                    .getModel("wizard")
                    .getProperty("/groupId");

            var oConfig =
                this._getResultTableConfig(sGroupId);

            if (!oConfig) {
                return;
            }

            // Remove previous object's binding FIRST
            oTable.unbindRows();

            oTable.removeAllColumns();

            oConfig.columns.forEach(function (oColumn) {

                var oTemplate;

                var aDateProperties = [
                    "FIpostingdate",
                    "Startofaccperiod",
                    "Endofaccperiod",
                    "CreationDate",
                    "Createdon",
                    "PeriodStartDate",
                    "CreatedDate"
                ];

                if (aDateProperties.indexOf(oColumn.property) !== -1) {

                    oTemplate = new Text({
                        text: {
                            path: "result>" + oColumn.property,
                            formatter: function (vValue) {

                                if (!vValue) {
                                    return "";
                                }

                                var oDate = vValue instanceof Date
                                    ? vValue
                                    : new Date(vValue);

                                if (isNaN(oDate.getTime())) {
                                    return String(vValue);
                                }

                                return sap.ui.core.format.DateFormat
                                    .getDateInstance({
                                        pattern: "dd.MM.yyyy",
                                        UTC: true
                                    })
                                    .format(oDate);
                            }
                        }
                    });

                } else {

                    oTemplate = new Text({
                        text: "{result>" + oColumn.property + "}"
                    });
                }

                oTable.addColumn(
                    new TableColumn({
                        label: new Label({
                            text: oColumn.label
                        }),
                        template: oTemplate,
                        width: "11rem"
                    })
                );
            });
            oTable.setWidth(
                (oConfig.columns.length * 11) + "rem"
            );

            // Now set the correct object's model
            oTable.setModel(
                oModel,
                "result"
            );

            oTable.detachRowSelectionChange(
                this._onResultRowSelectionChange,
                this
            );

            oTable.attachRowSelectionChange(
                this._onResultRowSelectionChange,
                this
            );

            // Now bind the new entity
            oTable.bindRows({
                path: "result>" + sPath,
                filters: aFilters,
                parameters: { countMode: "Inline" }
            });

        },

        _onResultRowSelectionChange: function (oEvent) {

            var oTable = oEvent.getSource();

            var oWizardModel =
                this.getView().getModel("wizard");

            var sGroupId =
                oWizardModel.getProperty("/groupId");

            var aSelectedIndices =
                oTable.getSelectedIndices();


            // =========================================================
            // NO ROW SELECTED
            // =========================================================

            if (
                !aSelectedIndices ||
                aSelectedIndices.length === 0
            ) {

                oWizardModel.setProperty(
                    "/selectedResults",
                    []
                );

                oWizardModel.setProperty(
                    "/selectedResult",
                    null
                );

                // Generic Copy Again
                oWizardModel.setProperty(
                    "/copyAgainEnabled",
                    false
                );

                oWizardModel.setProperty(
                    "/copyAgain",
                    false
                );

                // Loss Event
                oWizardModel.setProperty(
                    "/copyLossEventAgainEnabled",
                    false
                );

                oWizardModel.setProperty(
                    "/copyLossEventAgain",
                    false
                );

                // Loss
                oWizardModel.setProperty(
                    "/copyLossAgainEnabled",
                    false
                );

                oWizardModel.setProperty(
                    "/copyLossAgain",
                    false
                );

                return;
            }


            // =========================================================
            // GET SELECTED OBJECTS
            // =========================================================

            var aSelectedObjects = [];

            aSelectedIndices.forEach(function (iIndex) {

                var oContext =
                    oTable.getContextByIndex(iIndex);

                if (oContext) {

                    aSelectedObjects.push(
                        oContext.getObject()
                    );

                }

            });


            console.log(
                "SELECTED OBJECTS:",
                aSelectedObjects
            );


            // =========================================================
            // SAVE SELECTED OBJECTS
            // =========================================================

            oWizardModel.setProperty(
                "/selectedResults",
                aSelectedObjects
            );

            oWizardModel.setProperty(
                "/selectedResult",
                aSelectedObjects[0]
            );


            var oSelectedObject =
                aSelectedObjects[0];


            // =========================================================
            // LOSS
            // =========================================================

            if (sGroupId === "L") {

                var bHasLossEvent =
                    oSelectedObject &&
                    oSelectedObject.g_schadkz !== null &&
                    oSelectedObject.g_schadkz !== undefined &&
                    String(oSelectedObject.g_schadkz).trim() !== "";

                var bHasTargetLoss =
                    oSelectedObject &&
                    oSelectedObject.target_number !== null &&
                    oSelectedObject.target_number !== undefined &&
                    String(oSelectedObject.target_number).trim() !== "";

                // -------------------------------------------------
                // COPY LOSS EVENT AGAIN
                // Enabled ONLY when:
                // Loss Event exists AND Target Loss exists
                // -------------------------------------------------
                var bCanCopyLossEventAgain =
                    bHasLossEvent &&
                    bHasTargetLoss;

                oWizardModel.setProperty(
                    "/copyLossEventAgainEnabled",
                    bCanCopyLossEventAgain
                );

                if (!bCanCopyLossEventAgain) {
                    oWizardModel.setProperty(
                        "/copyLossEventAgain",
                        false
                    );
                }

                // -------------------------------------------------
                // COPY LOSS AGAIN
                // Enabled ONLY when:
                // Target Loss exists AND Loss Event does NOT exist
                // -------------------------------------------------
                var bCanCopyLossAgain =
                    bHasTargetLoss &&
                    !bHasLossEvent;

                oWizardModel.setProperty(
                    "/copyLossAgainEnabled",
                    bCanCopyLossAgain
                );

                if (!bCanCopyLossAgain) {
                    oWizardModel.setProperty(
                        "/copyLossAgain",
                        false
                    );
                }

                console.log("========== LOSS COPY STATE ==========");
                console.log("Loss:", oSelectedObject.schadnr);
                console.log("Loss Event:", oSelectedObject.g_schadkz);
                console.log("Target Loss:", oSelectedObject.target_number);

                console.log("Has Loss Event:", bHasLossEvent);
                console.log("Has Target Loss:", bHasTargetLoss);

                console.log(
                    "Copy Loss Event Again Enabled:",
                    bCanCopyLossEventAgain
                );

                console.log(
                    "Copy Loss Again Enabled:",
                    bCanCopyLossAgain
                );

                console.log("=====================================");

                return;
            }


            // =========================================================
            // OTHER GROUPS
            // =========================================================

            var sTargetProperty = null;

            switch (sGroupId) {

                case "B":
                    sTargetProperty = "TargetBpNum";
                    break;

                case "A":
                    sTargetProperty = "CreatedAcc";
                    break;

                case "RIP":
                    sTargetProperty = "CreatedRIP";
                    break;

                case "TCR":
                    sTargetProperty = "CreatedTCR";
                    break;

                case "T":
                    sTargetProperty = "CreatedTreaty";
                    break;

                default:
                    break;
            }


            // =========================================================
            // CHECK TARGET FOR OTHER GROUPS
            // =========================================================

            var bHasTarget = false;

            if (
                sTargetProperty &&
                oSelectedObject &&
                oSelectedObject[sTargetProperty] !== null &&
                oSelectedObject[sTargetProperty] !== undefined &&
                String(
                    oSelectedObject[sTargetProperty]
                ).trim() !== ""
            ) {

                bHasTarget = true;

            }


            oWizardModel.setProperty(
                "/copyAgainEnabled",
                bHasTarget
            );


            if (!bHasTarget) {

                oWizardModel.setProperty(
                    "/copyAgain",
                    false
                );

            }


            console.log(
                "Selected Group:",
                sGroupId
            );

            console.log(
                "Target Property:",
                sTargetProperty
            );

            console.log(
                "Copy Again Enabled:",
                bHasTarget
            );
        },
        _getResultTableConfig: function (sGroupId) {

            switch (sGroupId) {

                case "B":

                    return {
                        targetProperty: "TargetBpNum",
                        sourceProperty: "bp_external",
                        copyEnabledWhenNoTarget: true,
                        columns: [
                            {
                                label: "Business Partner",
                                property: "bp_external"
                            },
                            {
                                label: "Process Ref ID",
                                property: "Process_id"
                            },
                            {
                                label: "Target System",
                                property: "destination"
                            },
                            {
                                label: "BP Type",
                                property: "type"
                            },
                            {
                                label: "External BP Number",
                                property: "bpext"
                            },
                            {
                                label: "Target Business Partner",
                                property: "TargetBpNum"
                            }
                        ]
                    };

                case "A":

                    return {
                        sourceProperty: "AccountNumber",
                        targetProperty: "CreatedAcc",

                        columns: [
                            {
                                label: "Account Number",
                                property: "AccountNumber"
                            },
                            {
                                label: "FI Posting Date",
                                property: "FIpostingdate"
                            },
                            {
                                label: "Section Number",
                                property: "SectionNumber"
                            },
                            {
                                label: "UW Year",
                                property: "UWyear"
                            },
                            {
                                label: "Line of Business",
                                property: "Lineofbusiness"
                            },
                            {
                                label: "Class of Business",
                                property: "Classofbusiness"
                            },
                            {
                                label: "Business Type",
                                property: "Businesstype"
                            },
                            {
                                label: "Period Start Date",
                                property: "Startofaccperiod"
                            },
                            {
                                label: "Period End Date",
                                property: "Endofaccperiod"
                            },
                            {
                                label: "Account Function",
                                property: "AccFunction"
                            },
                            {
                                label: "Created By",
                                property: "CreatedBy"
                            },
                            {
                                label: "Creation Date",
                                property: "CreationDate"
                            },
                            {
                                label: "Process Ref ID",
                                property: "processingID"
                            },
                            {
                                label: "Target Account Number",
                                property: "CreatedAcc"
                            }
                        ]
                    };

                case "RIP":

                    return {
                        sourceProperty: "RIPNumber",
                        targetProperty: "CreatedRIP",

                        columns: [
                            {
                                label: "RIP Number",
                                property: "RIPNumber"
                            },
                            {
                                label: "RIP Name",
                                property: "RIPName"
                            },
                            {
                                label: "Cedent",
                                property: "Cedent"
                            },
                            {
                                label: "Process Ref ID",
                                property: "ProcessingID"
                            },
                            {
                                label: "Target System",
                                property: "Syst"
                            },
                            {
                                label: "Target RIP",
                                property: "CreatedRIP"
                            },
                            {
                                label: "Created By",
                                property: "CreatedBy"
                            },
                            {
                                label: "Creation Date",
                                property: "Createdon"
                            }
                        ]
                    };
                case "T":
                    return {
                        sourceProperty: "vtgnr",
                        targetProperty: "CreatedTreaty",

                        columns: [
                            {
                                label: "Treaty Number",
                                property: "vtgnr"
                            },
                            {
                                label: "Period Start Date",
                                property: "PeriodStartDate"
                            },
                            {
                                label: "Process Ref ID",
                                property: "processingID"
                            },
                            {
                                label: "Target System",
                                property: "syst"
                            },
                            {
                                label: "Target Treaty Number",
                                property: "CreatedTreaty"
                            },
                            {
                                label: "Line of Business",
                                property: "LineOfBusiness"
                            },
                            {
                                label: "Class of Business",
                                property: "ClassOfBusiness"
                            },
                            {
                                label: "Business Type",
                                property: "BusinessTypeNumber"
                            },
                            {
                                label: "Area",
                                property: "Area"
                            }
                        ]
                    };
                case "L":

                    return {
                        sourceProperty: "schadnr",
                        targetProperty: "target_number",

                        columns: [
                            {
                                label: "Loss",
                                property: "schadnr"
                            },
                            {
                                label: "Loss Name",
                                property: "schadbez"
                            },
                            {
                                label: "Loss Event",
                                property: "g_schadkz"
                            },
                            {
                                label: "Process Ref ID",
                                property: "process_id"
                            },
                            {
                                label: "Target System",
                                property: "systemm"
                            },
                            {
                                label: "Target Loss",
                                property: "target_number"
                            }
                        ]
                    };

                case "TCR":

                    return {
                        sourceProperty: "vtgrrnr",
                        targetProperty: "CreatedTCR",

                        columns: [
                            {
                                label: "TCR Number",
                                property: "vtgrrnr"
                            },
                            {
                                label: "Rank",
                                property: "Rank"
                            },
                            {
                                label: "Field Name",
                                property: "FieldName"
                            },
                            {
                                label: "Field Value",
                                property: "Value"
                            },
                            {
                                label: "Company Code",
                                property: "CompanyCode"
                            },
                            {
                                label: "Process Ref ID",
                                property: "processingID"
                            },
                            {
                                label: "Target System",
                                property: "syst"
                            },
                            {
                                label: "Target TCR Number",
                                property: "CreatedTCR"
                            },
                            {
                                label: "Created By",
                                property: "CreatedBy"
                            },
                            {
                                label: "Creation Date",
                                property: "CreatedDate"
                            }
                        ]
                    };

                default:
                    return null;
            }
        },
        _updateCopyAgainState: function (oSelectedObject) {

            var oWizardModel =
                this.getView().getModel("wizard");

            var sGroupId =
                oWizardModel.getProperty("/groupId");

            var sTargetProperty = null;

            switch (sGroupId) {

                case "B":
                    sTargetProperty = "TargetBpNum";
                    break;

                case "A":
                    sTargetProperty = "CreatedAcc";
                    break;

                case "RIP":
                    sTargetProperty = "CreatedRIP";
                    break;

                case "TCR":
                    sTargetProperty = "CreatedTCR";
                    break;

                case "T":
                    sTargetProperty = "CreatedTreaty"
                    break;

                case "L":
                    sTargetProperty = "target_number";
                    break;

                default:
                    break;
            }

            var bHasTarget = false;

            if (
                sTargetProperty &&
                oSelectedObject &&
                oSelectedObject[sTargetProperty] !== null &&
                oSelectedObject[sTargetProperty] !== undefined &&
                String(oSelectedObject[sTargetProperty]).trim() !== ""
            ) {
                bHasTarget = true;
            }

            oWizardModel.setProperty(
                "/copyAgainEnabled",
                bHasTarget
            );

            // Always reset Copy Again when target does not exist
            if (!bHasTarget) {

                oWizardModel.setProperty(
                    "/copyAgain",
                    false
                );

                // this.byId("copyAgainSwitch")
                //     .setState(false);
            }
        },

        //Treaty

        // =========================================================
        // GENERIC HELPERS (filters / dates / tokens)
        // =========================================================

        /**
         * "yyyy-MM-dd" -> Date at 00:00 UTC.
         * OData V2 serialises Edm.DateTime filters using the UTC fields, so a
         * local-midnight Date shifts the day in any timezone east/west of UTC.
         */
        _toUTCDate: function (sYmd) {
            if (!sYmd) { return null; }
            var a = String(sYmd).split("-");
            if (a.length !== 3) { return null; }
            return new Date(Date.UTC(+a[0], +a[1] - 1, +a[2]));
        },

        _addEqFilter: function (aFilters, sProperty, vValue, bUpper) {
            if (vValue === undefined || vValue === null) { return; }
            var s = String(vValue).trim();
            if (!s) { return; }
            aFilters.push(new Filter(
                sProperty, FilterOperator.EQ, bUpper ? s.toUpperCase() : s
            ));
        },

        _addDateFilter: function (aFilters, sProperty, sYmd) {
            var oDate = this._toUTCDate(sYmd);
            if (oDate) {
                aFilters.push(new Filter(sProperty, FilterOperator.EQ, oDate));
            }
        },

        /** Text typed by the user -> range descriptor (supports 1...5, >=1, <5, !=1, *x*, x*, *x) */
        _parseRangeText: function (sText) {
            var s = (sText || "").trim();
            var m;
            if (!s) { return null; }

            if ((m = s.match(/^(.+?)\.\.\.(.+)$/))) {
                return {
                    operation: "BT",
                    value1: m[1].trim().toUpperCase(),
                    value2: m[2].trim().toUpperCase()
                };
            }
            if ((m = s.match(/^(>=|<=|<>|!=|>|<|=|!)\s*(.+)$/))) {
                var mOps = {
                    ">=": "GE", "<=": "LE", ">": "GT", "<": "LT",
                    "=": "EQ", "<>": "EQ", "!=": "EQ", "!": "EQ"
                };
                return {
                    operation: mOps[m[1]],
                    value1: m[2].trim().toUpperCase(),
                    exclude: ["<>", "!=", "!"].indexOf(m[1]) !== -1
                };
            }
            if ((m = s.match(/^\*(.+)\*$/))) {
                return { operation: "Contains", value1: m[1].toUpperCase() };
            }
            if ((m = s.match(/^(.+)\*$/))) {
                return { operation: "StartsWith", value1: m[1].toUpperCase() };
            }
            if ((m = s.match(/^\*(.+)$/))) {
                return { operation: "EndsWith", value1: m[1].toUpperCase() };
            }
            return { operation: "EQ", value1: s.toUpperCase() };
        },

        _rangeText: function (o) {
            var t;
            switch (o.operation) {
                case "BT": t = o.value1 + "..." + o.value2; break;
                case "GE": t = ">=" + o.value1; break;
                case "LE": t = "<=" + o.value1; break;
                case "GT": t = ">" + o.value1; break;
                case "LT": t = "<" + o.value1; break;
                case "Contains": t = "*" + o.value1 + "*"; break;
                case "StartsWith": t = o.value1 + "*"; break;
                case "EndsWith": t = "*" + o.value1; break;
                default: t = o.value1;
            }
            return o.exclude ? "!(" + t + ")" : t;
        },

        _tokenValidator: function (oArgs) {
            var oRange = this._parseRangeText(oArgs.text);
            if (!oRange) { return null; }
            var sText = this._rangeText(oRange);
            var oToken = new Token({ key: sText, text: sText });
            oToken.data("range", {
                exclude: !!oRange.exclude,
                operation: oRange.operation,
                keyField: "key",
                value1: oRange.value1,
                value2: oRange.value2
            });
            return oToken;
        },

        /** Enables typing "100", "100...200", ">=100" + Enter in the token inputs */
        _attachTokenValidators: function () {
            [
                "treatyInput", "accountNumberInput", "ripNumberInput",
                "tcrNumberInput", "LossInput"
            ].forEach(function (sId) {
                var oInput = this.byId(sId);
                if (oInput && oInput.addValidator && !oInput.data("srtValidator")) {
                    oInput.addValidator(this._tokenValidator.bind(this));
                    oInput.data("srtValidator", true);
                }
            }, this);
        },

        _rangeToFilter: function (sProperty, sOp, v1, v2, bExclude) {
            var FO = FilterOperator;
            if (bExclude) {
                if (sOp === "EQ") { return new Filter(sProperty, FO.NE, v1); }
                if (sOp === "BT") {
                    return FO.NB
                        ? new Filter(sProperty, FO.NB, v1, v2)
                        : new Filter({
                            filters: [
                                new Filter(sProperty, FO.LT, v1),
                                new Filter(sProperty, FO.GT, v2)
                            ],
                            and: false
                        });
                }
                var sNot = "Not" + sOp;
                return FO[sNot] ? new Filter(sProperty, FO[sNot], v1) : null;
            }
            switch (sOp) {
                case "BT": return new Filter(sProperty, FO.BT, v1, v2);
                case "EQ": case "GT": case "GE": case "LT": case "LE":
                case "Contains": case "StartsWith": case "EndsWith":
                    return new Filter(sProperty, FO[sOp], v1);
                default: return null;
            }
        },

        /**
         * Builds ONE filter from all tokens of a token input
         * (includes OR-ed, excludes AND-ed, both AND-ed together).
         */
        _getTokenFilter: function (sInputId, sProperty) {
            var oInput = this.byId(sInputId);
            if (!oInput || !oInput.getTokens) { return null; }

            // "Enter" fires submit BEFORE the typed text becomes a token
            var sPending = (oInput.getValue() || "").trim();
            if (sPending) {
                var oTok = this._tokenValidator({ text: sPending });
                if (oTok) { oInput.addToken(oTok); }
                oInput.setValue("");
            }

            var aInc = [], aExc = [];
            oInput.getTokens().forEach(function (oToken) {
                var oR = oToken.data("range");
                var sOp = "EQ", v1 = oToken.getKey(), v2, bExc = false;
                if (oR) {
                    sOp = oR.operation; v1 = oR.value1;
                    v2 = oR.value2; bExc = !!oR.exclude;
                }
                var oF = this._rangeToFilter(sProperty, sOp, v1, v2, bExc);
                if (oF) { (bExc ? aExc : aInc).push(oF); }
            }, this);

            var aAll = [];
            if (aInc.length === 1) { aAll.push(aInc[0]); }
            else if (aInc.length > 1) { aAll.push(new Filter({ filters: aInc, and: false })); }
            aAll = aAll.concat(aExc);

            if (!aAll.length) { return null; }
            return aAll.length === 1 ? aAll[0] : new Filter({ filters: aAll, and: true });
        },

        _getErrorText: function (oError) {
            try {
                var o = JSON.parse(oError.responseText);
                return (o.error && o.error.message && (o.error.message.value || o.error.message)) || "";
            } catch (e) {
                return (oError && (oError.message || oError.statusText)) || "";
            }
        },

        // =========================================================
        // F4 WITH RANGES (between / greater than / less than ...)
        // =========================================================
        _openRangeValueHelp: function (mCfg) {

            var oView = this.getView();
            var oInput = this.byId(mCfg.inputId);
            var oModel = oView.getModel(mCfg.model);

            if (!oInput || !oModel) {
                MessageToast.show("Value help is not available.");
                return;
            }

            var oVHD = new ValueHelpDialog({
                title: mCfg.title,
                supportMultiselect: true,
                supportRanges: true,
                supportRangesOnly: false,
                key: mCfg.key,
                descriptionKey: mCfg.descriptionKey,
                ok: function (oEvent) {
                    oInput.setTokens(oEvent.getParameter("tokens"));
                    oVHD.close();
                },
                cancel: function () { oVHD.close(); },
                afterClose: function () { oVHD.destroy(); }
            });

            oVHD.setRangeKeyFields([{
                label: mCfg.title,
                key: mCfg.key,
                type: "string"
            }]);

            oVHD.setTokens(oInput.getTokens().map(function (t) { return t.clone(); }));

            var oSearch = new SearchField({ placeholder: "Search" });
            var oFB = new FilterBar({
                advancedMode: true,
                search: function () {
                    oVHD.getTableAsync().then(function (oTable) {
                        var sV = (oSearch.getValue() || "").trim();
                        var oB = oTable.getBinding("rows");
                        if (!oB) { return; }
                        oB.filter(sV ? [new Filter({
                            filters: [
                                new Filter(mCfg.key, FilterOperator.Contains, sV.toUpperCase()),
                                new Filter(mCfg.descriptionKey, FilterOperator.Contains, sV)
                            ],
                            and: false
                        })] : []);
                    });
                }
            });
            oSearch.attachSearch(function () { oFB.search(); });
            oFB.setBasicSearch(oSearch);
            oVHD.setFilterBar(oFB);

            oVHD.getTableAsync().then(function (oTable) {
                oTable.setModel(oModel);
                mCfg.columns.forEach(function (c) {
                    oTable.addColumn(new TableColumn({
                        label: new Label({ text: c.label }),
                        template: new Text({ text: "{" + c.property + "}" })
                    }));
                });
                oTable.bindRows({ path: "/" + mCfg.entitySet });
                oVHD.update();
            });

            oView.addDependent(oVHD);
            oVHD.open();
        },

        onTtyValueHelp: function () {
            this._openRangeValueHelp({
                inputId: "treatyInput", title: "Treaty Number",
                model: "ZRI_S_TTY_DATA", entitySet: "ZRI_I_VTGNR_VH",
                key: "vtgnr", descriptionKey: "Vtgbez",
                columns: [
                    { label: "Treaty Number", property: "vtgnr" },
                    { label: "Treaty Name", property: "Vtgbez" },
                    { label: "Company Code", property: "Bukrs" }
                ]
            });
        },

        onTCRValueHelp: function () {
            this._openRangeValueHelp({
                inputId: "tcrNumberInput", title: "TCR Number",
                model: "ZRI_SB_TCR_DATA", entitySet: "ZRI_I_TCRNO_VH",
                key: "vtgrrnr", descriptionKey: "Vtgrrbez",
                columns: [
                    { label: "TCR Number", property: "vtgrrnr" },
                    { label: "TCR Name", property: "Vtgrrbez" },
                    { label: "Company Code", property: "Bukrs" }
                ]
            });
        },

        onLossValueHelp: function () {
            this._openRangeValueHelp({
                inputId: "LossInput", title: "Loss",
                model: "ZRI_SB_CLM_PROC", entitySet: "Claims",
                key: "schadnr", descriptionKey: "schadbez",
                columns: [
                    { label: "Loss", property: "schadnr" },
                    { label: "Loss Name", property: "schadbez" },
                    { label: "Loss Event", property: "g_schadkz" }
                ]
            });
        },

        onTreatyGo: function () {

            var oWizardModel = this.getView().getModel("wizard");
            var aFilters = [];

            var fTreaty = this._getTokenFilter("treatyInput", "vtgnr");
            if (fTreaty) { aFilters.push(fTreaty); }

            this._addDateFilter(aFilters, "PeriodStartDate", oWizardModel.getProperty("/treatyPeriodStartDate"));
            this._addEqFilter(aFilters, "LineOfBusiness", oWizardModel.getProperty("/treatyLineOfBusiness"), true);
            this._addEqFilter(aFilters, "ClassOfBusiness", oWizardModel.getProperty("/treatyClassOfBusiness"), true);
            this._addEqFilter(aFilters, "Area", oWizardModel.getProperty("/treatyArea"), true);
            this._addEqFilter(aFilters, "CreatedBy", oWizardModel.getProperty("/treatyCreatedBy"), true);
            this._addDateFilter(aFilters, "CreationDate", oWizardModel.getProperty("/treatyCreationDate"));
            this._addEqFilter(aFilters, "processingID", oWizardModel.getProperty("/treatyProcessRefId"));
            this._addEqFilter(aFilters, "syst", oWizardModel.getProperty("/treatyTargetSystem"));

            var oModel = this.getView().getModel("ZRI_S_TTY_DATA");
            if (!oModel) {
                MessageToast.show("Treaty service is not available.");
                return;
            }

            this._showResultTable(oModel, "/Treaty", aFilters);
        },




        // =========================================================
        // ACCOUNT SEARCH
        // =========================================================
        onAccountGo: function () {

            var oWizardModel = this.getView().getModel("wizard");
            var aFilters = [];

            var fAcc = this._getTokenFilter("accountNumberInput", "AccountNumber");
            if (fAcc) { aFilters.push(fAcc); }

            this._addDateFilter(aFilters, "FIpostingdate", oWizardModel.getProperty("/accountFIPostingDate"));
            this._addEqFilter(aFilters, "SectionNumber", oWizardModel.getProperty("/accountSectionNumber"), true);
            this._addEqFilter(aFilters, "UWyear", oWizardModel.getProperty("/accountUWYear"));
            this._addEqFilter(aFilters, "Lineofbusiness", oWizardModel.getProperty("/accountLineOfBusiness"), true);
            this._addEqFilter(aFilters, "Classofbusiness", oWizardModel.getProperty("/accountClassOfBusiness"), true);
            this._addEqFilter(aFilters, "Businesstype", oWizardModel.getProperty("/accountBusinessType"), true);
            this._addDateFilter(aFilters, "Startofaccperiod", oWizardModel.getProperty("/accountStartPeriodDate"));
            this._addDateFilter(aFilters, "Endofaccperiod", oWizardModel.getProperty("/accountEndPeriodDate"));
            this._addEqFilter(aFilters, "AccFunction", oWizardModel.getProperty("/accountFunction"), true);
            this._addEqFilter(aFilters, "CreatedBy", oWizardModel.getProperty("/accountCreatedBy"), true);
            this._addDateFilter(aFilters, "CreationDate", oWizardModel.getProperty("/accountCreationDate"));
            this._addEqFilter(aFilters, "processingID", oWizardModel.getProperty("/accountProcessRefId"));

            if (aFilters.length === 0) {
                MessageToast.show("Please enter at least one search criterion.");
                return;
            }

            var oModel = this.getView().getModel("ZRI_SB_ACC_DATA");
            if (!oModel) {
                MessageToast.show("Account service is not available.");
                return;
            }

            this._showResultTable(oModel, "/Account", aFilters);
        },

        onAccountValHelp: function () {

            var oView = this.getView();

            if (!this._oAccountVHD) {

                this._oAccountVHD = sap.ui.xmlfragment(
                    oView.getId(),
                    "srt.app.view.fragments.AccountValueHelp",
                    this
                );

                oView.addDependent(this._oAccountVHD);

                this._prepareAccountValueHelpTable();
            }

            this._oAccountVHD.open();
        },
        _prepareAccountValueHelpTable: function () {

            var oModel =
                this.getView().getModel("ZRI_SB_ACC_DATA");

            this._oAccountVHD
                .getTableAsync()
                .then(function (oTable) {

                    oTable.setModel(
                        oModel,
                        "ZRI_SB_ACC_DATA"
                    );

                    // sap.ui.table.Table
                    if (oTable.bindRows) {

                        oTable.addColumn(
                            new TableColumn({
                                label: new Label({
                                    text: "Account Number"
                                }),
                                template: new Text({
                                    text: "{ZRI_SB_ACC_DATA>Abrnr}"
                                })
                            })
                        );

                        oTable.addColumn(
                            new TableColumn({
                                label: new Label({
                                    text: "Account Name"
                                }),
                                template: new Text({
                                    text: "{ZRI_SB_ACC_DATA>Abrbez}"
                                })
                            })
                        );

                        oTable.addColumn(
                            new TableColumn({
                                label: new Label({
                                    text: "Module"
                                }),
                                template: new Text({
                                    text: "{ZRI_SB_ACC_DATA>Baustein}"
                                })
                            })
                        );

                        oTable.addColumn(
                            new TableColumn({
                                label: new Label({
                                    text: "Treaty Number"
                                }),
                                template: new Text({
                                    text: "{ZRI_SB_ACC_DATA>Vtgnr}"
                                })
                            })
                        );

                        oTable.addColumn(
                            new TableColumn({
                                label: new Label({
                                    text: "Company Code"
                                }),
                                template: new Text({
                                    text: "{ZRI_SB_ACC_DATA>Bukrs}"
                                })
                            })
                        );

                        oTable.bindRows({
                            path:
                                "ZRI_SB_ACC_DATA>/ZRI_I_ABRNR_VH"
                        });
                    }

                    this._oAccountVHD.update();

                }.bind(this));
        },

        // error: function (oError) {

        //                     console.error(
        //                         "ACCOUNT DATA ERROR:",
        //                         oError
        //                     );

        //                     MessageToast.show(
        //                         "Error while reading Account data."
        //                     );

        //                     this._oBusyDialog.close();

        //                 }.bind(this)
        //             });
        //         },

        onRIPGo: function () {
            var oWizardModel = this.getView().getModel("wizard");
            var aFilters = [];

            var fRip = this._getTokenFilter("ripNumberInput", "RIPNumber");
            if (fRip) {
                aFilters.push(fRip);
            }

            this._addEqFilter(
                aFilters,
                "CreatedBy",
                oWizardModel.getProperty("/ripCreatedBy"),
                true
            );

            this._addDateFilter(
                aFilters,
                "Createdon",
                oWizardModel.getProperty("/ripCreationDate")
            );
            console.log(
                "Latest RIP Process ID:",
                oWizardModel.getProperty("/ripProcessRefId")
            );

            // Filter using the latest execution process ID
            this._addEqFilter(
                aFilters,
                "ProcessingID",
                oWizardModel.getProperty("/ripProcessRefId")
            );

            // Filter using the selected target system
            this._addEqFilter(
                aFilters,
                "Syst",
                oWizardModel.getProperty("/ripTargetSystem")
            );

            var oModel = this.getView().getModel("ZRI_SB_RIP_DATA");

            if (!oModel) {
                MessageToast.show("RIP service is not available.");
                return;
            }

            this._showResultTable(oModel, "/RIP", aFilters);
        },


        onAccountVHSearch: function () {

            var sPrefix =
                this.getView().getId();

            var oAccNo =
                sap.ui.getCore().byId(
                    sPrefix + "--accountVHNumber"
                );

            var oAccName =
                sap.ui.getCore().byId(
                    sPrefix + "--accountVHName"
                );

            var oModule =
                sap.ui.getCore().byId(
                    sPrefix + "--accountVHModule"
                );

            var oTreaty =
                sap.ui.getCore().byId(
                    sPrefix + "--accountVHTreaty"
                );

            var oCompany =
                sap.ui.getCore().byId(
                    sPrefix + "--accountVHCompany"
                );


            var sAbrnr =
                oAccNo ? oAccNo.getValue().trim() : "";

            var sAbrbez =
                oAccName ? oAccName.getValue().trim() : "";

            var sBaustein =
                oModule ? oModule.getValue().trim() : "";

            var sVtgnr =
                oTreaty ? oTreaty.getValue().trim() : "";

            var sBukrs =
                oCompany ? oCompany.getValue().trim() : "";


            var aFilters = [];


            if (sAbrnr) {
                aFilters.push(
                    new Filter(
                        "Abrnr",
                        FilterOperator.EQ,
                        sAbrnr
                    )
                );
            }

            if (sAbrbez) {
                aFilters.push(
                    new Filter(
                        "Abrbez",
                        FilterOperator.Contains,
                        sAbrbez
                    )
                );
            }

            if (sBaustein) {
                aFilters.push(
                    new Filter(
                        "Baustein",
                        FilterOperator.EQ,
                        sBaustein
                    )
                );
            }

            if (sVtgnr) {
                aFilters.push(
                    new Filter(
                        "Vtgnr",
                        FilterOperator.EQ,
                        sVtgnr
                    )
                );
            }

            if (sBukrs) {
                aFilters.push(
                    new Filter(
                        "Bukrs",
                        FilterOperator.EQ,
                        sBukrs
                    )
                );
            }


            console.log(
                "ACCOUNT VH FILTERS:",
                aFilters
            );


            this._oAccountVHD
                .getTableAsync()
                .then(function (oTable) {

                    var oBinding =
                        oTable.getBinding("rows") ||
                        oTable.getBinding("items");

                    if (oBinding) {
                        oBinding.filter(aFilters);
                    }

                    this._oAccountVHD.update();

                }.bind(this));
        },
        onAccountVHOk: function (oEvent) {

            var aTokens = oEvent.getParameter("tokens") || [];
            var oMultiInput = this.byId("accountNumberInput");

            if (oMultiInput) {
                oMultiInput.setTokens(aTokens);
            }

            this.getView()
                .getModel("wizard")
                .setProperty(
                    "/accountNumbers",
                    aTokens
                        .filter(function (t) { return !t.data("range"); })
                        .map(function (t) { return t.getKey(); })
                );

            this._oAccountVHD.close();
        },



        onAccountVHCancel: function () {

            this._oAccountVHD.close();
        },
        onRIPValueHelp: function () {
            this._openRangeValueHelp({
                inputId: "ripNumberInput", title: "RIP Number",
                model: "ZRI_SB_RIP_DATA", entitySet: "ZRI_I_RIPNO_VH",
                key: "Rvonr", descriptionKey: "Rvonrbez",
                columns: [
                    { label: "RIP Number", property: "Rvonr" },
                    { label: "RIP Name", property: "Rvonrbez" },
                    { label: "Created By", property: "Ernam" }
                ]
            });
        },
        onAccountCopyWithOpen: function () {

            var oWizardModel =
                this.getView().getModel("wizard");

            var aSelectedResults =
                oWizardModel.getProperty("/selectedResults") || [];

            // if (!aSelectedResults.length) {

            //     MessageToast.show(
            //         "Please select at least one account."
            //     );

            //     return;
            // }


            if (!this._pAccountCopyWithDialog) {

                this._pAccountCopyWithDialog =
                    this.loadFragment({
                        name:
                            "srt.app.view.fragments.AccountCopyWith"
                    });
            }


            this._pAccountCopyWithDialog
                .then(function (oDialog) {

                    oDialog.open();

                });
        },
        onCopyAccountWithExecute: function () {

            var oView =
                this.getView();

            var oModel =
                oView.getModel("wizard");

            var oExecutionModel =
                oView.getModel("ZGS_SRT_SRV");


            // Target system is the one already selected on the main screen
            var sRfc =
                oModel.getProperty("/copyWithRfcDestination") ||
                oModel.getProperty("/rfcDestination");

            var sTreatyFrom =
                oModel.getProperty(
                    "/copyWithTreatyFrom"
                );

            var sTreatyTo =
                oModel.getProperty(
                    "/copyWithTreatyTo"
                );

            var bCopyAgain =
                !!oModel.getProperty(
                    "/copyWithCopyAgain"
                );


            if (!sRfc) {
                MessageToast.show(
                    "Please select RFC Destination."
                );
                return;
            }


            if (!sTreatyFrom) {
                MessageToast.show(
                    "Please enter Treaty From."
                );
                return;
            }


            var aFilters = [];


            aFilters.push(
                new Filter(
                    "iv_grp_id",
                    FilterOperator.EQ,
                    "A"
                )
            );


            aFilters.push(
                new Filter(
                    "iv_rfc",
                    FilterOperator.EQ,
                    sRfc
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
                    sTreatyFrom
                )
            );

            aFilters.push(
                new Filter(
                    "iv_copy_with",
                    FilterOperator.EQ,
                    true
                )
            );

            // IMPORTANT:
            // iv_rip_to is Nullable="false"
            // so always send something
            aFilters.push(
                new Filter(
                    "iv_rip_to",
                    FilterOperator.EQ,
                    sTreatyTo || ""
                )
            );


            console.log(
                "COPY ACCOUNT WITH FILTERS:",
                aFilters
            );


            this._oBusyDialog.open();


            oExecutionModel.read(
                "/RIPSet",
                {


                    filters: aFilters,

                    success: function (oData) {

                        this._oBusyDialog.close();

                        var sProcessId = "";

                        if (
                            oData.results &&
                            oData.results.length > 0
                        ) {
                            sProcessId =
                                oData.results[0].process_id;
                        }

                        if (sProcessId) {

                            oModel.setProperty(
                                "/accountProcessRefId",
                                sProcessId
                            );

                        }

                        MessageToast.show(
                            "Execution started successfully. Process ID: " +
                            sProcessId
                        );
                        if (this._pAccountCopyWithDialog) {
                            this._pAccountCopyWithDialog.then(function (oDialog) {
                                oDialog.close();
                            });
                        }

                    }.bind(this),


                    error: function (oError) {

                        this._oBusyDialog.close();

                        console.error(
                            "COPY ACCOUNT WITH ERROR:",
                            oError
                        );

                        MessageToast.show(
                            "Account copy failed. " +
                            this._getErrorText(oError)
                        );

                    }.bind(this)
                }
            );
        },
        onCopyAccountWithCancel: function () {

            var oModel =
                this.getView().getModel("wizard");

            oModel.setProperty(
                "/copyWithTreatyFrom",
                ""
            );

            oModel.setProperty(
                "/copyWithTreatyTo",
                ""
            );

            oModel.setProperty(
                "/copyWithCopyAgain",
                false
            );

            this._pAccountCopyWithDialog
                .then(function (oDialog) {

                    oDialog.close();

                });
        },
        onTCRGo: function () {

            var oWizardModel = this.getView().getModel("wizard");
            var aFilters = [];

            var fTcr = this._getTokenFilter("tcrNumberInput", "vtgrrnr");
            if (fTcr) { aFilters.push(fTcr); }

            this._addEqFilter(aFilters, "CreatedBy", oWizardModel.getProperty("/tcrCreatedBy"), true);
            this._addDateFilter(aFilters, "CreatedDate", oWizardModel.getProperty("/tcrCreationDate"));
            this._addEqFilter(aFilters, "processingID", oWizardModel.getProperty("/tcrProcessRefId"));

            var oModel = this.getView().getModel("ZRI_SB_TCR_DATA");
            if (!oModel) {
                MessageToast.show("TCR service is not available.");
                return;
            }

            this._showResultTable(oModel, "/TCR", aFilters);
        },

        //  onTreatyProcessLog: function () {

        //     var oWizardModel =
        //         this.getView().getModel("wizard");

        //     var aSelectedResults =
        //         oWizardModel.getProperty("/selectedResults") || [];

        //     if (!aSelectedResults.length) {

        //         MessageToast.show(
        //             "Please select at least one Treaty row."
        //         );

        //         return;
        //     }


        //     // ==========================================
        //     // GET UNIQUE PROCESS IDS FROM SELECTED ROWS
        //     // ==========================================
        //     var aProcessIds = [];

        //     aSelectedResults.forEach(function (oRow) {

        //         var sProcessId =
        //             oRow.processingID;

        //         if (
        //             sProcessId &&
        //             aProcessIds.indexOf(sProcessId) === -1
        //         ) {
        //             aProcessIds.push(sProcessId);
        //         }

        //     });


        //     if (!aProcessIds.length) {

        //         MessageToast.show(
        //             "No Process Ref ID available for the selected rows."
        //         );

        //         return;
        //     }


        //     console.log(
        //         "SELECTED PROCESS IDS:",
        //         aProcessIds
        //     );


        //     var oModel =
        //         this.getView()
        //             .getModel("ZRI_S_TTY_DATA");


        //     if (!oModel) {

        //         MessageToast.show(
        //             "Treaty service is not available."
        //         );

        //         return;
        //     }


        //     // ==========================================
        //     // CREATE OR FILTER:
        //     //
        //     // ProcessingId = X
        //     // OR
        //     // ProcessingId = Y
        //     // OR
        //     // ProcessingId = Z
        //     // ==========================================
        //     var aProcessFilters =
        //         aProcessIds.map(function (sProcessId) {

        //             return new Filter(
        //                 "ProcessingId",
        //                 FilterOperator.EQ,
        //                 sProcessId
        //             );

        //         });


        //     var oProcessFilter =
        //         new Filter({
        //             filters: aProcessFilters,
        //             and: false
        //         });


        //     this._oBusyDialog.open();


        //     oModel.read(
        //         "/ProcessLog",
        //         {
        //             filters: [oProcessFilter],

        //             success: function (oData) {

        //                 this._oBusyDialog.close();

        //                 console.log(
        //                     "TREATY PROCESS LOG:",
        //                     oData.results
        //                 );

        //                 this._openTreatyProcessLogDialog(
        //                     oData.results || []
        //                 );

        //             }.bind(this),

        //             error: function (oError) {

        //                 this._oBusyDialog.close();

        //                 console.error(
        //                     "PROCESS LOG ERROR:",
        //                     oError
        //                 );

        //                 MessageToast.show(
        //                     "Unable to load Process Log."
        //                 );

        //             }.bind(this)
        //         }
        //     );
        // },
        // _openTreatyProcessLogDialog: function (aLogs) {

        //     var oLogModel =
        //         new JSONModel({
        //             logs: aLogs
        //         });


        //     if (!this._oTreatyProcessLogDialog) {

        //         this._oTreatyProcessLogDialog =
        //             new sap.m.Dialog({

        //                 title: "Treaty Process Log",

        //                 contentWidth: "70rem",

        //                 contentHeight: "30rem",

        //                 content: [

        //                     new sap.m.Table({

        //                         columns: [

        //                             new sap.m.Column({
        //                                 header:
        //                                     new sap.m.Text({
        //                                         text: "Process Ref ID"
        //                                     })
        //                             }),

        //                             new sap.m.Column({
        //                                 header:
        //                                     new sap.m.Text({
        //                                         text: "Message Type"
        //                                     })
        //                             }),

        //                             new sap.m.Column({
        //                                 header:
        //                                     new sap.m.Text({
        //                                         text: "Message"
        //                                     })
        //                             }),

        //                             new sap.m.Column({
        //                                 header:
        //                                     new sap.m.Text({
        //                                         text: "Source Number"
        //                                     })
        //                             }),

        //                             new sap.m.Column({
        //                                 header:
        //                                     new sap.m.Text({
        //                                         text: "Target Number"
        //                                     })
        //                             }),

        //                             new sap.m.Column({
        //                                 header:
        //                                     new sap.m.Text({
        //                                         text: "System"
        //                                     })
        //                             })

        //                         ],

        //                         items: {
        //                             path: "log>/logs",

        //                             template:
        //                                 new sap.m.ColumnListItem({

        //                                     cells: [

        //                                         new sap.m.Text({
        //                                             text:
        //                                                 "{log>ProcessingId}"
        //                                         }),

        //                                         new sap.m.Text({
        //                                             text:
        //                                                 "{log>Type}"
        //                                         }),

        //                                         new sap.m.Text({
        //                                             text:
        //                                                 "{log>Message}"
        //                                         }),

        //                                         new sap.m.Text({
        //                                             text:
        //                                                 "{log>SourceNumber}"
        //                                         }),

        //                                         new sap.m.Text({
        //                                             text:
        //                                                 "{log>TargetNumber}"
        //                                         }),

        //                                         new sap.m.Text({
        //                                             text:
        //                                                 "{log>Systemm}"
        //                                         })

        //                                     ]
        //                                 })
        //                         }

        //                     })

        //                 ],

        //                 endButton:
        //                     new sap.m.Button({

        //                         text: "Close",

        //                         press: function () {
        //                             this._oTreatyProcessLogDialog.close();
        //                         }.bind(this)

        //                     })

        //             });


        //         this.getView()
        //             .addDependent(
        //                 this._oTreatyProcessLogDialog
        //             );
        //     }


        //     this._oTreatyProcessLogDialog
        //         .setModel(
        //             oLogModel,
        //             "log"
        //         );


        //     this._oTreatyProcessLogDialog.open();
        // },
        // onRIPProcessLog: function () {

        //     var oWizardModel =
        //         this.getView().getModel("wizard");

        //     var aSelectedResults =
        //         oWizardModel.getProperty("/selectedResults") || [];

        //     if (!aSelectedResults.length) {

        //         MessageToast.show(
        //             "Please select at least one RIP row."
        //         );

        //         return;
        //     }


        //     // ==========================================
        //     // GET UNIQUE PROCESS IDS FROM SELECTED ROWS
        //     // ==========================================
        //     var aProcessIds = [];

        //     aSelectedResults.forEach(function (oRow) {

        //         var sProcessId =
        //             oRow.processingID;

        //         if (
        //             sProcessId &&
        //             aProcessIds.indexOf(sProcessId) === -1
        //         ) {
        //             aProcessIds.push(sProcessId);
        //         }

        //     });


        //     if (!aProcessIds.length) {

        //         MessageToast.show(
        //             "No Process Ref ID available for the selected rows."
        //         );

        //         return;
        //     }


        //     console.log(
        //         "SELECTED PROCESS IDS:",
        //         aProcessIds
        //     );


        //     var oModel =
        //         this.getView()
        //             .getModel("ZRI_SB_RIP_DATA");


        //     if (!oModel) {

        //         MessageToast.show(
        //             "RIP service is not available."
        //         );

        //         return;
        //     }


        //     // ==========================================
        //     // CREATE OR FILTER:
        //     //
        //     // ProcessingId = X
        //     // OR
        //     // ProcessingId = Y
        //     // OR
        //     // ProcessingId = Z
        //     // ==========================================
        //     var aProcessFilters =
        //         aProcessIds.map(function (sProcessId) {

        //             return new Filter(
        //                 "ProcessingId",
        //                 FilterOperator.EQ,
        //                 sProcessId
        //             );

        //         });


        //     var oProcessFilter =
        //         new Filter({
        //             filters: aProcessFilters,
        //             and: false
        //         });


        //     this._oBusyDialog.open();


        //     oModel.read(
        //         "/ProcessLog",
        //         {
        //             filters: [oProcessFilter],

        //             success: function (oData) {

        //                 this._oBusyDialog.close();

        //                 console.log(
        //                     "RIP PROCESS LOG:",
        //                     oData.results
        //                 );

        //                 this._openRIPProcessLogDialog(
        //                     oData.results || []
        //                 );

        //             }.bind(this),

        //             error: function (oError) {

        //                 this._oBusyDialog.close();

        //                 console.error(
        //                     "PROCESS LOG ERROR:",
        //                     oError
        //                 );

        //                 MessageToast.show(
        //                     "Unable to load Process Log."
        //                 );

        //             }.bind(this)
        //         }
        //     );
        // },
        // _openRIPProcessLogDialog: function (aLogs) {

        //     var oLogModel =
        //         new JSONModel({
        //             logs: aLogs
        //         });


        //     if (!this._oRIPProcessLogDialog) {

        //         this._oRIPProcessLogDialog =
        //             new sap.m.Dialog({

        //                 title: "RIP Process Log",

        //                 contentWidth: "70rem",

        //                 contentHeight: "30rem",

        //                 content: [

        //                     new sap.m.Table({

        //                         columns: [

        //                             new sap.m.Column({
        //                                 header:
        //                                     new sap.m.Text({
        //                                         text: "Process Ref ID"
        //                                     })
        //                             }),

        //                             new sap.m.Column({
        //                                 header:
        //                                     new sap.m.Text({
        //                                         text: "Message Type"
        //                                     })
        //                             }),

        //                             new sap.m.Column({
        //                                 header:
        //                                     new sap.m.Text({
        //                                         text: "Message"
        //                                     })
        //                             }),

        //                             new sap.m.Column({
        //                                 header:
        //                                     new sap.m.Text({
        //                                         text: "Source Number"
        //                                     })
        //                             }),

        //                             new sap.m.Column({
        //                                 header:
        //                                     new sap.m.Text({
        //                                         text: "Target Number"
        //                                     })
        //                             }),

        //                             new sap.m.Column({
        //                                 header:
        //                                     new sap.m.Text({
        //                                         text: "System"
        //                                     })
        //                             })

        //                         ],

        //                         items: {
        //                             path: "log>/logs",

        //                             template:
        //                                 new sap.m.ColumnListItem({

        //                                     cells: [

        //                                         new sap.m.Text({
        //                                             text:
        //                                                 "{log>ProcessingId}"
        //                                         }),

        //                                         new sap.m.Text({
        //                                             text:
        //                                                 "{log>Type}"
        //                                         }),

        //                                         new sap.m.Text({
        //                                             text:
        //                                                 "{log>Message}"
        //                                         }),

        //                                         new sap.m.Text({
        //                                             text:
        //                                                 "{log>SourceNumber}"
        //                                         }),

        //                                         new sap.m.Text({
        //                                             text:
        //                                                 "{log>TargetNumber}"
        //                                         }),

        //                                         new sap.m.Text({
        //                                             text:
        //                                                 "{log>Systemm}"
        //                                         })

        //                                     ]
        //                                 })
        //                         }

        //                     })

        //                 ],

        //                 endButton:
        //                     new sap.m.Button({

        //                         text: "Close",

        //                         press: function () {
        //                             this._oRIPProcessLogDialog.close();
        //                         }.bind(this)

        //                     })

        //             });


        //         this.getView()
        //             .addDependent(
        //                 this._oRIPProcessLogDialog
        //             );
        //     }


        //     this._oRIPProcessLogDialog
        //         .setModel(
        //             oLogModel,
        //             "log"
        //         );


        //     this._oRIPProcessLogDialog.open();
        // },
        onProcessLogPress: function () {

            var oWizardModel =
                this.getView().getModel("wizard");

            var sGroupId =
                oWizardModel.getProperty("/groupId");

            var aSelectedRows =
                oWizardModel.getProperty("/selectedResults") || [];

            if (!aSelectedRows.length) {
                MessageToast.show(
                    "Please select at least one row."
                );
                return;
            }

            var oResultConfig =
                this._getResultTableConfig(sGroupId);

            if (!oResultConfig) {
                MessageToast.show(
                    "Process Log configuration not found."
                );
                return;
            }

            var sObjectType = "";

            switch (sGroupId) {

                case "A":
                    sObjectType = "ACCOUNT";
                    break;

                case "T":
                    sObjectType = "TREATY";
                    break;

                case "TCR":
                    sObjectType = "TCR";
                    break;

                case "RIP":
                    sObjectType = "RIP";
                    break;

                case "B":
                    sObjectType = "BP";
                    break;

                case "L":
                    sObjectType = "LOSS";
                    break;

                default:
                    MessageToast.show(
                        "Process Log not configured for this object."
                    );
                    return;
            }


            // =============================================
            // Build RootSourceNumber filters
            // =============================================
            var aRootFilters = [];

            aSelectedRows.forEach(function (oRow) {

                var sRoot =
                    oRow[oResultConfig.sourceProperty];

                if (sRoot) {

                    aRootFilters.push(
                        new Filter(
                            "RootSourceNumber",
                            FilterOperator.EQ,
                            String(sRoot)
                        )
                    );
                }

            });


            if (!aRootFilters.length) {
                MessageToast.show(
                    "No source object found."
                );
                return;
            }


            // =============================================
            // Object type filter
            // =============================================
            var oObjectTypeFilter =
                new Filter(
                    "ObjectType",
                    FilterOperator.EQ,
                    sObjectType
                );


            // =============================================
            // Root 1 OR Root 2 OR Root 3
            // =============================================
            var oRootFilter =
                new Filter({
                    filters: aRootFilters,
                    and: false
                });


            // =============================================
            // Final:
            // ObjectType AND (Root1 OR Root2 OR Root3)
            // =============================================
            // No ObjectType restriction: dependent objects (loss, account, ...)
            // are logged under their own object type, same root number.
            var oFinalFilter = oRootFilter;


            var oModel =
                this.getView().getModel(
                    "ZGS_SRT_SRV"
                );


            if (!oModel) {
                MessageToast.show(
                    "Process Log service is not available."
                );
                return;
            }


            this._oBusyDialog.open();


            oModel.read(
                "/ProcessLogSet",
                {
                    filters: [
                        oFinalFilter
                    ],

                    success: function (oData) {

                        this._oBusyDialog.close();

                        console.log(
                            "PROCESS LOG RESULT:",
                            oData.results
                        );

                        this._openProcessLogDialog(
                            "Process Log",
                            oData.results || []
                        );

                    }.bind(this),

                    error: function (oError) {

                        this._oBusyDialog.close();

                        console.error(
                            "PROCESS LOG ERROR:",
                            oError
                        );

                        MessageToast.show(
                            "Unable to load Process Log."
                        );

                    }.bind(this)
                }
            );
        },
        _openProcessLogDialog: function (sTitle, aLogs) {

            if (!this._pProcessLogDialog) {

                this._pProcessLogDialog =
                    this.loadFragment({
                        name: "srt.app.view.fragments.ProcessLog"
                    });
            }

            this._pProcessLogDialog.then(function (oDialog) {

                var oLogModel = new JSONModel({
                    logs: aLogs
                });

                oDialog.setModel(
                    oLogModel,
                    "processLog"
                );

                oDialog.setTitle(sTitle);

                oDialog.open();

            });
        },
        onProcessLogClose: function () {

            if (this._pProcessLogDialog) {

                this._pProcessLogDialog.then(function (oDialog) {
                    oDialog.close();
                });

            }
        },
        onLossGo: function () {

            var oWizardModel = this.getView().getModel("wizard");
            var aFilters = [];

            var fLoss = this._getTokenFilter("LossInput", "schadnr");
            if (fLoss) { aFilters.push(fLoss); }

            this._addEqFilter(aFilters, "process_id", oWizardModel.getProperty("/lossProcessRefId"));
            this._addEqFilter(aFilters, "systemm", oWizardModel.getProperty("/lossTargetSystem"));

            var oModel = this.getView().getModel("ZRI_SB_CLM_PROC");
            if (!oModel) {
                MessageToast.show("Loss service is not available.");
                return;
            }

            this._showResultTable(oModel, "/Claims", aFilters);
        },
        onRowSelectionChange: function (oEvent) {
    var oTable = oEvent.getSource();
    var iIndex = oEvent.getParameter("rowIndex");

    if (iIndex < 0) {
        return;
    }

    var oRow = oTable.getRows()[iIndex];
    var oContext = oRow && oRow.getBindingContext();

    if (!oContext) {
        return;
    }

    var oSelectedObject = oContext.getObject();

    // Keep the selected object's data available for the details page.
    var oDetailModel = new sap.ui.model.json.JSONModel(
        oSelectedObject
    );

    this.getView().setModel(oDetailModel, "detail");

    // Navigate to your reusable details route.
    this.getOwnerComponent().getRouter().navTo("objectDetails");
},

onOpenObjectDetails: function (oEvent) {
    var oRow = oEvent.getSource().getParent();
    var oContext = oRow.getBindingContext("result");

    if (!oContext) {
        oContext = oRow.getBindingContext();
    }

    if (!oContext) {
        return;
    }

    var oSelectedObject = oContext.getObject();

    var oModel = new sap.ui.model.json.JSONModel({
        groupId: this.getView()
            .getModel("wizard")
            .getProperty("/groupId"),
        data: oSelectedObject
    });

    this.getOwnerComponent().setModel(
        oModel,
        "selectedObject"
    );

    this.getOwnerComponent()
        .getRouter()
        .navTo("objectDetails");
},



    });

});