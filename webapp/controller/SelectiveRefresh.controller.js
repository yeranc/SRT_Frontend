
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
    Token
) {
    "use strict";

    var RIP_ENTITY_SET = "ZRI_I_RIPNO_VH";

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

                text: "Please wait while the data is being fetched..."

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

            var oAccountInput =
                this.byId("accountNumberInput");

            if (oAccountInput) {
                oAccountInput.removeAllTokens();
            }
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


            var iIndex = 0;
            var iSuccess = 0;
            var iFailed = 0;


            console.log(
                "TOTAL SELECTED:",
                aSelectedResults.length,
                aSelectedResults
            );


            this._oBusyDialog.open();


            var fnExecuteNext = function () {

                // ==========================================
                // ALL SELECTED OBJECTS FINISHED
                // ==========================================
                if (iIndex >= aSelectedResults.length) {

                    this._oBusyDialog.close();

                    MessageToast.show(
                        iSuccess +
                        " succeeded, " +
                        iFailed +
                        " failed."
                    );


                    // ==========================================
                    // REFRESH RESULT TABLE ONLY ONCE
                    // ==========================================
                    if (sGroupId === "B") {

                        this.onBPGo();

                    }
                    else if (sGroupId === "A") {

                        this.onAccountGo();

                    }
                    else if (sGroupId === "T") {

                        this.onTreatyGo();

                    }
                    else if (sGroupId === "TCR") {

                        this.onTCRGo();

                    }
                    else if (sGroupId === "RIP") {

                        var oRipModel =
                            this.getView()
                                .getModel("ZRI_SB_RIP_DATA");

                        if (oRipModel) {
                            oRipModel.refresh(true);
                        }

                        this.onRIPGo();
                    }

                    return;
                }


                // ==========================================
                // CURRENT SELECTED ROW
                // ==========================================
                var oSelectedResult =
                    aSelectedResults[iIndex];


                var vObjectKey =
                    oSelectedResult[
                    oConfig.sourceProperty
                    ];


                // ==========================================
                // VALIDATE OBJECT KEY
                // ==========================================
                if (
                    vObjectKey === null ||
                    vObjectKey === undefined ||
                    String(vObjectKey).trim() === ""
                ) {

                    console.error(
                        "Invalid object key:",
                        {
                            groupId: sGroupId,
                            sourceProperty:
                                oConfig.sourceProperty,
                            selectedResult:
                                oSelectedResult
                        }
                    );

                    iFailed++;
                    iIndex++;

                    fnExecuteNext.call(this);

                    return;
                }


                var sObjectKey =
                    String(vObjectKey).trim();


                console.log(
                    "====================================="
                );

                console.log(
                    "Executing " +
                    (iIndex + 1) +
                    " of " +
                    aSelectedResults.length
                );

                console.log(
                    "Group ID:",
                    sGroupId
                );

                console.log(
                    "Source Property:",
                    oConfig.sourceProperty
                );

                console.log(
                    "Object Key:",
                    sObjectKey
                );

                console.log(
                    "RFC:",
                    sRfcDestination
                );

                console.log(
                    "Copy Again:",
                    bCopyAgain
                );

                console.log(
                    "Selected Row:",
                    oSelectedResult
                );

                console.log(
                    "====================================="
                );


                // ==========================================
                // BUILD FILTERS FOR CURRENT OBJECT
                // ==========================================
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
                        sObjectKey
                    )
                );


                // ==========================================
                // EXECUTE CURRENT OBJECT
                // ==========================================
                oExecutionModel.read(
                    "/RIPSet",
                    {
                        filters: aFilters,

                        success: function (oData) {

                            console.log(
                                "SUCCESS:",
                                sObjectKey,
                                oData
                            );

                            iSuccess++;
                            iIndex++;


                            // ==========================================
                            // WAIT BEFORE NEXT EXECUTION
                            // Treaty backend may still be processing
                            // ==========================================
                            var iDelay = 1000;

                            if (sGroupId === "T") {
                                iDelay = 1500;
                            }
                            else if (sGroupId === "TCR") {
                                iDelay = 3500;
                            }


                            setTimeout(function () {

                                fnExecuteNext.call(this);

                            }.bind(this), iDelay);

                        }.bind(this),


                        error: function (oError) {

                            console.error(
                                "FAILED:",
                                sObjectKey,
                                oError
                            );

                            iFailed++;
                            iIndex++;


                            // Continue with next selected object
                            setTimeout(function () {

                                fnExecuteNext.call(this);

                            }.bind(this), 2000);

                        }.bind(this)
                    }
                );

            }.bind(this);


            // ==========================================
            // START FIRST SELECTED OBJECT
            // ==========================================
            fnExecuteNext();

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

                oTable.addColumn(
                    new TableColumn({
                        label: new Label({
                            text: oColumn.label
                        }),

                        template: new Text({
                            text:
                                "{result>" +
                                oColumn.property +
                                "}"
                        }),

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
                filters: aFilters
            });

        },

        _onResultRowSelectionChange: function (oEvent) {

            var oTable = oEvent.getSource();

            var oWizardModel =
                this.getView().getModel("wizard");

            var aSelectedIndices =
                oTable.getSelectedIndices();

            if (!aSelectedIndices ||
                aSelectedIndices.length === 0) {

                oWizardModel.setProperty(
                    "/selectedResults",
                    []
                );

                oWizardModel.setProperty(
                    "/selectedResult",
                    null
                );

                oWizardModel.setProperty(
                    "/copyAgainEnabled",
                    false
                );

                oWizardModel.setProperty(
                    "/copyAgain",
                    false
                );

                return;
            }

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

            oWizardModel.setProperty(
                "/selectedResults",
                aSelectedObjects
            );

            // kept for copy-again logic
            oWizardModel.setProperty(
                "/selectedResult",
                aSelectedObjects[0]
            );

            this._updateCopyAgainState(
                aSelectedObjects[0]
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
                    sTargetProperty = "TargetLoss";
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
        onTreatyGo: function () {

            var oWizardModel =
                this.getView().getModel("wizard");

            var aFilters = [];

            var sTreaty =
                oWizardModel.getProperty("/treaty");

            var sProcessRefId =
                oWizardModel.getProperty(
                    "/treatyProcessRefId"
                );

            var sTargetSystem =
                oWizardModel.getProperty(
                    "/treatyTargetSystem"
                );


            if (sTreaty) {

                aFilters.push(
                    new Filter(
                        "vtgnr",
                        FilterOperator.EQ,
                        sTreaty
                    )
                );
            }

            if (sProcessRefId) {

                aFilters.push(
                    new Filter(
                        "processingID",
                        FilterOperator.EQ,
                        sProcessRefId
                    )
                );
            }

            if (sTargetSystem) {

                aFilters.push(
                    new Filter(
                        "syst",
                        FilterOperator.EQ,
                        sTargetSystem
                    )
                );
            }


            var oModel =
                this.getView()
                    .getModel("ZRI_S_TTY_DATA");

            if (!oModel) {

                MessageToast.show(
                    "Treaty service is not available."
                );

                return;
            }


            // if (aFilters.length === 0) {

            //     MessageToast.show(
            //         "Please enter at least one search criterion."
            //     );

            //     return;
            // }


            this._showResultTable(
                oModel,
                "/Treaty",
                aFilters
            );
        },



        // =========================================================
        // ACCOUNT SEARCH
        // =========================================================
        onAccountGo: function () {

            var oWizardModel =
                this.getView().getModel("wizard");

            var aFilters = [];

            var aAccountNumbers =
                oWizardModel.getProperty("/accountNumbers") || [];

            var sFIPostingDate =
                oWizardModel.getProperty("/accountFIPostingDate");

            var sSectionNumber =
                oWizardModel.getProperty("/accountSectionNumber");

            var sUWYear =
                oWizardModel.getProperty("/accountUWYear");

            var sLineOfBusiness =
                oWizardModel.getProperty("/accountLineOfBusiness");

            var sClassOfBusiness =
                oWizardModel.getProperty("/accountClassOfBusiness");

            var sBusinessType =
                oWizardModel.getProperty("/accountBusinessType");

            var sStartPeriodDate =
                oWizardModel.getProperty("/accountStartPeriodDate");

            var sEndPeriodDate =
                oWizardModel.getProperty("/accountEndPeriodDate");

            var sAccountFunction =
                oWizardModel.getProperty("/accountFunction");

            var sCreatedBy =
                oWizardModel.getProperty("/accountCreatedBy");

            var sCreationDate =
                oWizardModel.getProperty("/accountCreationDate");

            var sProcessRefId =
                oWizardModel.getProperty("/accountProcessRefId");


            if (aAccountNumbers.length > 0) {

                var aAccountNumberFilters =
                    aAccountNumbers.map(function (sAccountNumber) {

                        return new Filter(
                            "AccountNumber",
                            FilterOperator.EQ,
                            sAccountNumber
                        );

                    });

                aFilters.push(
                    new Filter({
                        filters: aAccountNumberFilters,
                        and: false
                    })
                );
            }


            if (sFIPostingDate) {

                aFilters.push(
                    new Filter(
                        "FIpostingdate",
                        FilterOperator.EQ,
                        new Date(
                            sFIPostingDate +
                            "T00:00:00"
                        )
                    )
                );
            }


            if (sSectionNumber) {

                aFilters.push(
                    new Filter(
                        "SectionNumber",
                        FilterOperator.EQ,
                        sSectionNumber
                    )
                );
            }


            if (sUWYear) {

                aFilters.push(
                    new Filter(
                        "UWyear",
                        FilterOperator.EQ,
                        sUWYear
                    )
                );
            }


            if (sLineOfBusiness) {

                aFilters.push(
                    new Filter(
                        "Lineofbusiness",
                        FilterOperator.EQ,
                        sLineOfBusiness
                    )
                );
            }


            if (sClassOfBusiness) {

                aFilters.push(
                    new Filter(
                        "Classofbusiness",
                        FilterOperator.EQ,
                        sClassOfBusiness
                    )
                );
            }


            if (sBusinessType) {

                aFilters.push(
                    new Filter(
                        "Businesstype",
                        FilterOperator.EQ,
                        sBusinessType
                    )
                );
            }


            if (sStartPeriodDate) {

                aFilters.push(
                    new Filter(
                        "Startofaccperiod",
                        FilterOperator.EQ,
                        new Date(
                            sStartPeriodDate +
                            "T00:00:00"
                        )
                    )
                );
            }


            if (sEndPeriodDate) {

                aFilters.push(
                    new Filter(
                        "Endofaccperiod",
                        FilterOperator.EQ,
                        new Date(
                            sEndPeriodDate +
                            "T00:00:00"
                        )
                    )
                );
            }


            if (sAccountFunction) {

                aFilters.push(
                    new Filter(
                        "AccFunction",
                        FilterOperator.EQ,
                        sAccountFunction
                    )
                );
            }


            if (sCreatedBy) {

                aFilters.push(
                    new Filter(
                        "CreatedBy",
                        FilterOperator.EQ,
                        sCreatedBy
                    )
                );
            }


            if (sCreationDate) {

                aFilters.push(
                    new Filter(
                        "CreationDate",
                        FilterOperator.EQ,
                        new Date(
                            sCreationDate +
                            "T00:00:00"
                        )
                    )
                );
            }


            if (sProcessRefId) {

                aFilters.push(
                    new Filter(
                        "processingID",
                        FilterOperator.EQ,
                        sProcessRefId
                    )
                );
            }


            if (aFilters.length === 0) {

                MessageToast.show(
                    "Please enter at least one search criterion."
                );

                return;
            }


            var oModel =
                this.getView()
                    .getModel("ZRI_SB_ACC_DATA");


            if (!oModel) {

                MessageToast.show(
                    "Account service is not available."
                );

                return;
            }


            this._showResultTable(
                oModel,
                "/Account",
                aFilters
            );
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

            var oWizardModel =
                this.getView().getModel("wizard");

            var aFilters = [];

            var sRIPNumber =
                oWizardModel.getProperty("/ripNumber");

            var sCreatedBy =
                oWizardModel.getProperty("/ripCreatedBy");

            var sCreationDate =
                oWizardModel.getProperty("/ripCreationDate");

            var sProcessRefId =
                oWizardModel.getProperty("/ripProcessRefId");


            if (sRIPNumber) {
                aFilters.push(
                    new Filter(
                        "RIPNumber",
                        FilterOperator.EQ,
                        sRIPNumber
                    )
                );
            }

            if (sCreatedBy) {
                aFilters.push(
                    new Filter(
                        "CreatedBy",
                        FilterOperator.EQ,
                        sCreatedBy
                    )
                );
            }

            if (sCreationDate) {
                aFilters.push(
                    new Filter(
                        "Createdon",
                        FilterOperator.EQ,
                        new Date(
                            sCreationDate + "T00:00:00"
                        )
                    )
                );
            }

            if (sProcessRefId) {
                aFilters.push(
                    new Filter(
                        "ProcessingID",
                        FilterOperator.EQ,
                        sProcessRefId
                    )
                );
            }


            var oModel =
                this.getView()
                    .getModel("ZRI_SB_RIP_DATA");

            if (!oModel) {

                MessageToast.show(
                    "RIP service is not available."
                );

                return;
            }


            this._showResultTable(
                oModel,
                "/RIP",
                aFilters
            );
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

            var aTokens =
                oEvent.getParameter("tokens") || [];

            var oMultiInput =
                this.byId("accountNumberInput");

            var aAccountNumbers =
                aTokens.map(function (oToken) {
                    return oToken.getKey();
                });


            if (oMultiInput) {

                oMultiInput.removeAllTokens();

                aAccountNumbers.forEach(function (sAccountNumber) {

                    oMultiInput.addToken(
                        new Token({
                            key: sAccountNumber,
                            text: sAccountNumber
                        })
                    );

                });
            }


            this.getView()
                .getModel("wizard")
                .setProperty(
                    "/accountNumbers",
                    aAccountNumbers
                );


            this._oAccountVHD.close();
        },


        onAccountVHCancel: function () {

            this._oAccountVHD.close();
        },
        onRIPValueHelp: function () {
            console.log("RIP Value help");
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


            var sRfc =
                oModel.getProperty(
                    "/copyWithRfcDestination"
                );

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
                            "Account copy failed."
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

            var oWizardModel =
                this.getView().getModel("wizard");

            var aFilters = [];


            var sTCRNumber =
                oWizardModel.getProperty(
                    "/tcrNumber"
                );

            var sCreatedBy =
                oWizardModel.getProperty(
                    "/tcrCreatedBy"
                );

            var sCreationDate =
                oWizardModel.getProperty(
                    "/tcrCreationDate"
                );

            var sProcessRefId =
                oWizardModel.getProperty(
                    "/tcrProcessRefId"
                );


            if (sTCRNumber) {

                aFilters.push(
                    new Filter(
                        "vtgrrnr",
                        FilterOperator.EQ,
                        sTCRNumber
                    )
                );
            }


            if (sCreatedBy) {

                aFilters.push(
                    new Filter(
                        "CreatedBy",
                        FilterOperator.EQ,
                        sCreatedBy
                    )
                );
            }


            if (sCreationDate) {

                aFilters.push(
                    new Filter(
                        "CreatedDate",
                        FilterOperator.EQ,
                        new Date(
                            sCreationDate +
                            "T00:00:00"
                        )
                    )
                );
            }


            if (sProcessRefId) {

                aFilters.push(
                    new Filter(
                        "processingID",
                        FilterOperator.EQ,
                        sProcessRefId
                    )
                );
            }


            var oModel =
                this.getView()
                    .getModel("ZRI_SB_TCR_DATA");


            if (!oModel) {

                MessageToast.show(
                    "TCR service is not available."
                );

                return;
            }


            this._showResultTable(
                oModel,
                "/TCR",
                aFilters
            );
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
    var oFinalFilter =
        new Filter({
            filters: [
                oObjectTypeFilter,
                oRootFilter
            ],
            and: true
        });


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
}

    });

});

