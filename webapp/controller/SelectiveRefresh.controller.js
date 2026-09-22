
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
    "sap/m/BusyDialog"
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
    BusyDialog
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
        onGroupIdChange: function (oEvent) {

            var sGroupId = oEvent
                .getSource()
                .getSelectedKey();

            var oWizardModel =
                this.getView().getModel("wizard");

            oWizardModel.setProperty(
                "/groupId",
                sGroupId
            );
            this._clearResultTable();

            oWizardModel.setProperty("/copyAgain", false);
            oWizardModel.setProperty("/copyLoss", false);
            oWizardModel.setProperty("/copyAccount", false);

            // Also reset the switches themselves

            this.byId("copyAgainSwitch").setState(false);
            this.byId("copyLossSwitch").setState(false);
            this.byId("copyAccSwitch").setState(false);
            // =====================================================
            // SHOW / HIDE COPY OPTIONS BASED ON GROUP ID
            // =====================================================

            var oCopyLossField =
                this.byId("copyLossField");

            var oCopyAccountField =
                this.byId("copyAccountField");

            var oCopyAgainField =
                this.byId("copyAgainField");


            if (sGroupId === "B") {

                // Business Partner
                oCopyAgainField.setVisible(false);
                oCopyLossField.setVisible(false);
                oCopyAccountField.setVisible(false);

                // Reset values because these options are not applicable
                oWizardModel.setProperty(
                    "/copyLoss",
                    false
                );

                oWizardModel.setProperty(
                    "/copyAccount",
                    false
                );

                this.byId("copyLossSwitch")
                    .setState(false);

                this.byId("copyAccSwitch")
                    .setState(false);

            }

            else {

                // Treaty / other objects
                oCopyAgainField.setVisible(true);
                oCopyLossField.setVisible(true);
                oCopyAccountField.setVisible(true);

                // Initially disabled until a row with target is selected
                oWizardModel.setProperty("/copyAgain", false);
                oWizardModel.setProperty("/copyAgainEnabled", false);
            }

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

        var oResultModel = new JSONModel({
            results: []
        });

        this._oResultTable.setModel(
            oResultModel,
            "result"
        );

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

    var oView =
        this.getView();

    var oExecutionModel =
        oView.getModel("ZGS_SRT_SRV");

    var oWizardModel =
        oView.getModel("wizard");


    // -----------------------------------------------------
    // MODEL CHECK
    // -----------------------------------------------------

    if (!oExecutionModel) {

        MessageToast.show(
            "Execution service is not available."
        );

        console.error(
            "ZGS_SRT_SRV model not found."
        );

        return;
    }


    if (!oWizardModel) {

        MessageToast.show(
            "Wizard model is not available."
        );

        return;
    }


    // -----------------------------------------------------
    // READ VALUES
    // -----------------------------------------------------

    var sGroupId =
        oWizardModel.getProperty("/groupId");

    var sRfcDestination =
        oWizardModel.getProperty("/rfcDestination");

    var bCopyAgain =
        oWizardModel.getProperty("/copyAgain");

    var oSelectedResult =
        oWizardModel.getProperty("/selectedResult");


    // -----------------------------------------------------
    // BP ONLY FOR NOW
    // -----------------------------------------------------

    if (sGroupId !== "B") {

        MessageToast.show(
            "Execution is currently enabled only for Business Partner."
        );

        return;
    }


    if (!sRfcDestination) {

        MessageToast.show(
            "Please select RFC Destination."
        );

        return;
    }


    if (!oSelectedResult) {

        MessageToast.show(
            "Please select a Business Partner row."
        );

        return;
    }


    // -----------------------------------------------------
    // BUSINESS PARTNER KEY
    // -----------------------------------------------------

    var sBusinessPartner =
        oSelectedResult.bp_external;


    if (
        sBusinessPartner === null ||
        sBusinessPartner === undefined ||
        String(sBusinessPartner).trim() === ""
    ) {

        MessageToast.show(
            "Selected row does not contain a Business Partner."
        );

        console.error(
            "bp_external missing:",
            oSelectedResult
        );

        return;
    }


    sBusinessPartner =
        String(sBusinessPartner).trim();


    // -----------------------------------------------------
    // DEBUG
    // -----------------------------------------------------

    console.log(
        "========== BP EXECUTION =========="
    );

    console.log(
        "Group ID:",
        sGroupId
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
        "Business Partner:",
        sBusinessPartner
    );

    console.log(
        "Selected row:",
        oSelectedResult
    );

    console.log(
        "=================================="
    );


    // -----------------------------------------------------
    // BUILD SEGW FILTERS
    // -----------------------------------------------------

    var aFilters = [];


    aFilters.push(
        new Filter(
            "iv_grp_id",
            FilterOperator.EQ,
            "B"
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


    // Existing backend parameter name,
    // but BP number is passed here.
    aFilters.push(
        new Filter(
            "iv_rip_from",
            FilterOperator.EQ,
            sBusinessPartner
        )
    );


    // -----------------------------------------------------
    // CALL SEGW SERVICE
    // -----------------------------------------------------

    this._oBusyDialog.open();


    oExecutionModel.read(
        "/RIPSet",
        {

            filters: aFilters,


            success: function (oData) {

                this._oBusyDialog.close();

                console.log(
                    "========== BP EXECUTION SUCCESS =========="
                );

                console.log(
                    "Response:",
                    oData
                );

                console.log(
                    "=========================================="
                );

                MessageToast.show(
                    "Business Partner execution started successfully."
                );

            }.bind(this),


            error: function (oError) {

                this._oBusyDialog.close();

                console.error(
                    "========== BP EXECUTION ERROR =========="
                );

                console.error(
                    oError
                );

                console.error(
                    "========================================"
                );

                MessageToast.show(
                    "Error while executing Business Partner."
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

            console.log("========== BP GO CLICKED ==========");

            var oWizardModel = this.getView().getModel("wizard");

            var aFilters = [];

            var sBusinessPartner =
                oWizardModel.getProperty("/businessPartner");

            var sProcessRefId =
                oWizardModel.getProperty("/processRefId");

            var sTargetSystem =
                oWizardModel.getProperty("/targetSystem");

            console.log("Business Partner:", sBusinessPartner);
            console.log("Process Ref ID:", sProcessRefId);
            console.log("Target System:", sTargetSystem);

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
                this.getView().getModel("ZRI_S_BUSINESS_PARTNER");

            if (!oModel) {

                console.error(
                    "businessPartner model is NOT available"
                );

                MessageToast.show(
                    "Business Partner OData model is not available."
                );

                return;
            }

            console.log("Filters:", aFilters);
            console.log("Calling BP OData service...");
            this._oBusyDialog.open();
            oModel.read(
                "/ZRI_C_BUSINESS_PARTNER",
                {
                    filters: aFilters,

                    urlParameters: {
                        "$top": "5000"
                    },

                    success: function (oData) {

                        console.log(
                            "Returned records:",
                            oData.results.length
                        );

                        this._showResultTable(
                            oData.results
                        );
                        this._oBusyDialog.close();
                    }.bind(this),

                    error: function (oError) {

                        console.error(
                            "BP DATA ERROR:",
                            oError
                        );

                        MessageToast.show(
                            "Error while reading Business Partner data."
                        );

                    }.bind(this)
                }
            );
        },
       _showResultTable: function (aResults) {

    var oContainer = this.byId("resultTableContainer");

    if (!oContainer) {
        console.error("resultTableContainer was NOT found.");
        return;
    }

    // If table already exists, reuse it
    if (this._oResultTable) {

        this._configureResultTable(
            this._oResultTable,
            aResults
        );

        oContainer.setVisible(true);
        return;
    }

    // If fragment is currently loading, wait for it
    if (this._pResultTable) {

        this._pResultTable.then(function (oTable) {

            this._configureResultTable(
                oTable,
                aResults
            );

            oContainer.setVisible(true);

        }.bind(this));

        return;
    }

    // Load only once
    this._pResultTable = this.loadFragment({
        name: "srt.app.view.fragments.ResultTable",
        id: this.getView().getId() + "--resultTableFragment"
    }).then(function (oTable) {

        this._oResultTable = oTable;

        oContainer.removeAllItems();
        oContainer.addItem(oTable);

        this._configureResultTable(
            oTable,
            aResults
        );

        oContainer.setVisible(true);

        return oTable;

    }.bind(this)).catch(function (oError) {

        console.error(
            "Error loading result table:",
            oError
        );

        this._pResultTable = null;

        throw oError;

    }.bind(this));
},
        _configureResultTable: function (oTable, aResults) {

            var sGroupId = this.getView()
                .getModel("wizard")
                .getProperty("/groupId");

            var oConfig = this._getResultTableConfig(sGroupId);

            if (!oConfig) {
                console.error(
                    "No result table configuration for Group ID:",
                    sGroupId
                );
                return;
            }

            // Remove existing columns
            oTable.removeAllColumns();

            // Create columns dynamically
            oConfig.columns.forEach(function (oColumn) {

                oTable.addColumn(
                    new TableColumn({

                        label: new Label({
                            text: oColumn.label
                        }),

                        template: new Text({
                            text: "{result>" + oColumn.property + "}"
                        }),

                        width: "12rem"

                    })
                );

            });

            // Create result model
            var oResultModel = new JSONModel({
                results: aResults
            });

            // Set result model
            oTable.setModel(
                oResultModel,
                "result"
            );
            oTable.attachRowSelectionChange(
                this._onResultRowSelectionChange,
                this

            );

            // Bind rows
            oTable.bindRows(
                "result>/results"
            );

            console.log(
                "Result table configured for:",
                sGroupId
            );

            console.log(
                "Number of rows:",
                aResults.length
            );
        },

       _onResultRowSelectionChange: function (oEvent) {

    var oTable = oEvent.getSource();
    var oWizardModel = this.getView().getModel("wizard");

    var sGroupId =
        oWizardModel.getProperty("/groupId");

    var aSelectedIndices =
        oTable.getSelectedIndices();

    if (!aSelectedIndices || aSelectedIndices.length === 0) {

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

    var iIndex = aSelectedIndices[0];

    var oContext =
        oTable.getContextByIndex(iIndex);

    if (!oContext) {
        return;
    }

    var oSelectedObject =
        oContext.getObject();

    console.log(
        "========== SELECTED RESULT =========="
    );

    console.log(
        "Group ID:",
        sGroupId
    );

    console.log(
        "Selected row:",
        oSelectedObject
    );

    console.log(
        "====================================="
    );

    // Save selected row centrally
    oWizardModel.setProperty(
        "/selectedResult",
        oSelectedObject
    );

    // Existing copy-again logic
    this._updateCopyAgainState(
        oSelectedObject
    );
},
        _getResultTableConfig: function (sGroupId) {

            switch (sGroupId) {

                case "B":

                    return {
                        targetProperty: "TargetBpNum",
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
                        columns: [
                            // RIP columns will go here
                        ]
                    };
                case "T":
                    return {
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
                    sTargetProperty = "TargetRIP";
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

                this.byId("copyAgainSwitch")
                    .setState(false);
            }
        },

        //Treaty
        onTreatyGo: function () {

            var oWizardModel = this.getView().getModel("wizard");

            var aFilters = [];

            var sTreaty =
                oWizardModel.getProperty("/treaty");

            var sProcessRefId =
                oWizardModel.getProperty("/treatyProcessRefId");

            var sTargetSystem =
                oWizardModel.getProperty("/treatyTargetSystem");

            // Treaty Number
            if (sTreaty) {
                aFilters.push(
                    new Filter(
                        "vtgnr",
                        FilterOperator.EQ,
                        sTreaty
                    )
                );
            }

            // Process Ref ID
            if (sProcessRefId) {
                aFilters.push(
                    new Filter(
                        "processingID",
                        FilterOperator.EQ,
                        sProcessRefId
                    )
                );
            }

            // Target System
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
                this.getView().getModel("ZRI_S_TTY_DATA");

            if (!oModel) {

                MessageToast.show(
                    "Treaty service is not available."
                );

                return;
            }

            this._oBusyDialog.open();

            oModel.read("/Treaty", {

                filters: aFilters,

                urlParameters: {
                    "$top": "5000"
                },

                success: function (oData) {

                    this._oBusyDialog.close();

                    var aResults =
                        oData.results || [];

                    console.log(
                        "Treaty records:",
                        aResults.length
                    );

                    this._showResultTable(aResults);

                }.bind(this),

                error: function (oError) {

                    this._oBusyDialog.close();

                    console.error(
                        "Treaty read error:",
                        oError
                    );

                    MessageToast.show(
                        "Error while reading Treaty data."
                    );

                }.bind(this)
            });
        },

// =========================================================
// ACCOUNT SEARCH
// =========================================================
onAccountGo: function () {

    var oWizardModel =
        this.getView().getModel("wizard");

    var aFilters = [];

    // -----------------------------------------------------
    // Read Account filter values
    // -----------------------------------------------------

    var sAccountNumber =
        oWizardModel.getProperty("/accountNumber");

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


    console.log("========== ACCOUNT SEARCH ==========");
    console.log("Account Number:", sAccountNumber);
    console.log("FI Posting Date:", sFIPostingDate);
    console.log("Section Number:", sSectionNumber);
    console.log("UW Year:", sUWYear);
    console.log("Line of Business:", sLineOfBusiness);
    console.log("Class of Business:", sClassOfBusiness);
    console.log("Business Type:", sBusinessType);
    console.log("Period Start Date:", sStartPeriodDate);
    console.log("Period End Date:", sEndPeriodDate);
    console.log("Account Function:", sAccountFunction);
    console.log("Created By:", sCreatedBy);
    console.log("Creation Date:", sCreationDate);
    console.log("Process Ref ID:", sProcessRefId);
    console.log("====================================");


    // -----------------------------------------------------
    // Build filters
    // -----------------------------------------------------

    if (sAccountNumber) {

        aFilters.push(
            new Filter(
                "AccountNumber",
                FilterOperator.EQ,
                sAccountNumber
            )
        );
    }


    if (sFIPostingDate) {

        aFilters.push(
            new Filter(
                "FIpostingdate",
                FilterOperator.EQ,
                new Date(sFIPostingDate + "T00:00:00")
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
                new Date(sStartPeriodDate + "T00:00:00")
            )
        );
    }


    if (sEndPeriodDate) {

        aFilters.push(
            new Filter(
                "Endofaccperiod",
                FilterOperator.EQ,
                new Date(sEndPeriodDate + "T00:00:00")
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
                new Date(sCreationDate + "T00:00:00")
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


    // -----------------------------------------------------
    // ACCOUNT ODATA MODEL
    // -----------------------------------------------------

    /*
     * Replace the model name below with the actual Account
     * model name from manifest.json.
     */
    var oModel =
        this.getView().getModel("ZRI_SB_ACC_DATA");


    if (!oModel) {

        MessageToast.show(
            "Account service is not available."
        );

        console.error(
            "Account OData model is NOT available."
        );

        return;
    }


    // -----------------------------------------------------
    // Read Account data
    // -----------------------------------------------------

    
    // Build filters first...

if (aFilters.length === 0) {
    MessageToast.show(
        "Please enter at least one search criterion."
    );
    return;
}



oModel.read("/Account", {
    filters: aFilters,

    urlParameters: {
        "$top": "100"
    },

    success: function (oData) {
        this._oBusyDialog.close();

        this._showResultTable(
            oData.results || []
        );
    }.bind(this),

    error: function (oError) {
        this._oBusyDialog.close();

        console.error(
            "ACCOUNT DATA ERROR:",
            oError
        );

        MessageToast.show(
            "Error while reading Account data."
        );
    }.bind(this)
});
this._oBusyDialog.open();

    /*
     * Replace /YOUR_ACCOUNT_ENTITY_SET with the actual
     * Account EntitySet from metadata.
     *
     */
    oModel.read("/Account", {

        filters: aFilters,

        urlParameters: {
            "$top": "100"
        },

        success: function (oData) {

            console.log(
                "Account records:",
                oData.results.length
            );

            console.log(
                "Account result:",
                oData.results
            );

            this._showResultTable(
                oData.results
            );

            this._oBusyDialog.close();

        }.bind(this),

        error: function (oError) {

            console.error(
                "ACCOUNT DATA ERROR:",
                oError
            );

            MessageToast.show(
                "Error while reading Account data."
            );

            this._oBusyDialog.close();

        }.bind(this)
    });
},

    });

});

