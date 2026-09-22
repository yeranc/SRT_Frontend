
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

                this._oResultTable.destroy();

                this._oResultTable = null;
            }

            oContainer.removeAllItems();

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

                    success: function (oData) {
                        console.log("========== BACKEND SUCCESS ==========");
                        console.log("Status Code: 200"); console.log("Service URL:", oRIPModel.sServiceUrl);
                        console.log("Full Response:", oData); console.log("Results:", oData.results);
                        if (oData.results && oData.results.length > 0) {
                            console.log("========== BACKEND RESULT VALUES ==========");
                            console.log("iv_grp_id:", oData.results[0].iv_grp_id);
                            console.log("iv_rfc:", oData.results[0].iv_rfc);
                            console.log("iv_copy_again:", oData.results[0].iv_copy_again);
                            console.log("iv_rip_from:", oData.results[0].iv_rip_from);
                            console.log("iv_rip_to:", oData.results[0].iv_rip_to);
                            console.log("==========================================");

                        } MessageToast.show("RIP execution started successfully.");
                    },


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
                console.error(
                    "resultTableContainer was NOT found."
                );
                return;
            }

            // Destroy previous result table
            if (this._oResultTable) {
                this._oResultTable.destroy();
                this._oResultTable = null;
            }

            oContainer.removeAllItems();

            this.loadFragment({
                name: "srt.app.view.fragments.ResultTable",
                id: this.getView().getId() + "--resultTableFragment"
            }).then(function (oTable) {

                this._oResultTable = oTable;

                oContainer.addItem(oTable);

                this._configureResultTable(
                    oTable,
                    aResults
                );

                oContainer.setVisible(true);

            }.bind(this)).catch(function (oError) {

                console.error(
                    "Error loading result table:",
                    oError
                );

            });
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

            var sGroupId = oWizardModel.getProperty("/groupId");

            var aSelectedIndices = oTable.getSelectedIndices();

            // No row selected
            if (!aSelectedIndices || aSelectedIndices.length === 0) {

                oWizardModel.setProperty("/copyAgainEnabled", false);
                oWizardModel.setProperty("/copyAgain", false);

                this.byId("copyAgainSwitch").setState(false);

                return;
            }

            // For now Copy Again logic is only required for Treaty
            if (sGroupId !== "T" && sGroupId !== "A") {
                return;
            }

            // Get selected Treaty row
            var iIndex = aSelectedIndices[0];

            var oContext = oTable.getContextByIndex(iIndex);

            if (!oContext) {
                oWizardModel.setProperty("/copyAgainEnabled", false);
                oWizardModel.setProperty("/copyAgain", false);
                return;
            }

            var oSelectedObject = oContext.getObject();

            console.log("========== SELECTED TREATY ==========");
            console.log("Selected row:", oSelectedObject);
            console.log("CreatedTreaty:", oSelectedObject.CreatedTreaty);
            console.log("=====================================");
            if (sGroupId === "T") {
                console.log("CreatedTreaty:", oSelectedObject.CreatedTreaty);
            }

            if (sGroupId === "A") {
                console.log("CreatedAcc:", oSelectedObject.CreatedAcc);
            }

            // Update Copy Again based on target Treaty
            this._updateCopyAgainState(oSelectedObject);
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

    this._oBusyDialog.open();

    /*
     * Replace /YOUR_ACCOUNT_ENTITY_SET with the actual
     * Account EntitySet from metadata.
     */
    oModel.read("/Account", {

        filters: aFilters,

        urlParameters: {
            "$top": "5000"
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

