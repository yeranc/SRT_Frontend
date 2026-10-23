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
    "sap/ui/comp/filterbar/FilterBar",
    "sap/ui/comp/valuehelpdialog/ValueHelpDialog",
    "sap/m/Token",
    "sap/m/SearchField",
    "sap/ui/core/format/DateFormat"
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
    FilterBar,
    ValueHelpDialog,
    Token,
    SearchField,
    DateFormat
) {
    "use strict";

    // =========================================================
    // CONSTANTS (created once, not on every call)
    // =========================================================
    var RIP_ENTITY_SET = "ZRI_I_RIPNO_VH";
    var DEFAULT_RFC = "T30CLNT700";
    var EXEC_POLL_INTERVAL_MS = 500;
    var EXEC_POLL_TIMEOUT_MS = 50000;
    var SELECTION_FRAGMENTS = {
        B: "srt.app.view.fragments.Partner",
        T: "srt.app.view.fragments.Treaty",
        A: "srt.app.view.fragments.Account",
        RIP: "srt.app.view.fragments.Rip",
        TCR: "srt.app.view.fragments.Tcr",
        RAM: "srt.app.view.fragments.Ram",
        L: "srt.app.view.fragments.Loss",
        LRM: "srt.app.view.fragments.Lrm"
    };

    // Dependent objects sent with the execution call: [wizard flag, backend parameter]
    var DEPENDENT_FLAGS = {
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

    var PROCESS_LOG_GROUPS = ["A", "T", "TCR", "RIP", "B", "L"];

    var TOKEN_INPUT_IDS = [
        "treatyInput", "accountNumberInput", "ripNumberInput",
        "tcrNumberInput", "LossInput"
    ];

    var DATE_PROPERTIES = {
        FIpostingdate: true,
        Startofaccperiod: true,
        Endofaccperiod: true,
        CreationDate: true,
        Createdon: true,
        PeriodStartDate: true,
        CreatedDate: true
    };

    // One formatter instance for all cells / dialogs
    var oDateFormat = DateFormat.getDateInstance({
        pattern: "dd.MM.yyyy",
        UTC: true
    });

    function formatDate(vValue) {
        if (!vValue) {
            return "";
        }
        var oDate = vValue instanceof Date ? vValue : new Date(vValue);
        return isNaN(oDate.getTime()) ? String(vValue) : oDateFormat.format(oDate);
    }

    function hasValue(oObject, sProperty) {
        return !!oObject &&
            oObject[sProperty] !== null &&
            oObject[sProperty] !== undefined &&
            String(oObject[sProperty]).trim() !== "";
    }

    // Selection / copy-button state. ALWAYS reset through this one definition.
    function createSelectionState() {
        return {
            selectedResults: [],
            selectedResult: null,
            copyAgain: false,
            copyAgainEnabled: false,
            copyLossEventAgain: false,
            copyLossEventAgainEnabled: false,
            copyLossAgain: false,
            copyLossAgainEnabled: false
        };
    }

    // Single source of truth for the wizard model (onInit AND _clearForm)
    function createWizardData() {

        var mData = {
            groupId: "",
            rfcDestination: DEFAULT_RFC,
            copyLoss: false,
            copyAccount: false,
            copyRip: false,
            copyTcr: false,
            accountNumbers: [],
            ranges: [{ from: "", to: "" }],

            // "Copy account with" dialog
            copyWithRfcDestination: "",
            copyWithTreatyFrom: "",
            copyWithTreatyTo: "",
            copyWithCopyAgain: false
        };

        // All search fields used by the selection fragments
        [
            "businessPartner", "processRefId", "targetSystem",
            "treatyPeriodStartDate", "treatyLineOfBusiness", "treatyClassOfBusiness",
            "treatyArea", "treatyCreatedBy", "treatyCreationDate",
            "treatyProcessRefId", "treatyTargetSystem",
            "accountFIPostingDate", "accountSectionNumber", "accountUWYear",
            "accountLineOfBusiness", "accountClassOfBusiness", "accountBusinessType",
            "accountStartPeriodDate", "accountEndPeriodDate", "accountFunction",
            "accountCreatedBy", "accountCreationDate", "accountProcessRefId",
            "ripCreatedBy", "ripCreationDate", "ripProcessRefId", "ripTargetSystem",
            "tcrCreatedBy", "tcrCreationDate", "tcrProcessRefId",
            "lossProcessRefId", "lossTargetSystem",
            "lrmPolicyId", "lrmIdentId", "lrmLifeId", "lrmPolicyNumber",
            "lrmProcessRefId", "lrmCedent", "lrmCompanyCode", "lrmTreatyNumber",
            // RAM
            "ramExternalSystemId", "ramExternalId", "ramProcessRefId",
            "ramTargetRam", "ramTargetSystem"
        ].forEach(function (sName) {
            mData[sName] = "";
        });

        var mSelection = createSelectionState();
        Object.keys(mSelection).forEach(function (sKey) {
            mData[sKey] = mSelection[sKey];
        });

        return mData;
    }

    var ACCOUNT_VH_COLUMNS = [
        { label: "Account Number", property: "Abrnr" },
        { label: "Account Name", property: "Abrbez" },
        { label: "Module", property: "Baustein" },
        { label: "Treaty Number", property: "Vtgnr" },
        { label: "Company Code", property: "Bukrs" }
    ];

    var ACCOUNT_VH_FILTER_FIELDS = [
        ["accountVHNumber", "Abrnr", FilterOperator.EQ],
        ["accountVHName", "Abrbez", FilterOperator.Contains],
        ["accountVHModule", "Baustein", FilterOperator.EQ],
        ["accountVHTreaty", "Vtgnr", FilterOperator.EQ],
        ["accountVHCompany", "Bukrs", FilterOperator.EQ]
    ];

    /*
     * sourceProperty  = key sent to the backend
     * targetProperty  = field that tells whether the object was already copied
     * processProperty = field holding the Process Ref ID (used for polling)
     */
    var RESULT_TABLE_CONFIG = {
        B: {
            sourceProperty: "bp_external",
            targetProperty: "TargetBpNum",
            processProperty: "Process_id",
            columns: [
                { label: "Business Partner", property: "bp_external" },
                { label: "Process Ref ID", property: "Process_id" },
                { label: "Target System", property: "destination" },
                { label: "BP Type", property: "type" },
                { label: "External BP Number", property: "bpext" },
                { label: "Target Business Partner", property: "TargetBpNum" }
            ]
        },
        A: {
            sourceProperty: "AccountNumber",
            targetProperty: "CreatedAcc",
            processProperty: "processingID",
            columns: [
                { label: "Account Number", property: "AccountNumber" },
                { label: "FI Posting Date", property: "FIpostingdate" },
                { label: "Section Number", property: "SectionNumber" },
                { label: "UW Year", property: "UWyear" },
                { label: "Line of Business", property: "Lineofbusiness" },
                { label: "Class of Business", property: "Classofbusiness" },
                { label: "Business Type", property: "Businesstype" },
                { label: "Period Start Date", property: "Startofaccperiod" },
                { label: "Period End Date", property: "Endofaccperiod" },
                { label: "Account Function", property: "AccFunction" },
                { label: "Created By", property: "CreatedBy" },
                { label: "Creation Date", property: "CreationDate" },
                { label: "Process Ref ID", property: "processingID" },
                { label: "Target Account Number", property: "CreatedAcc" }
            ]
        },
        RIP: {
            sourceProperty: "RIPNumber",
            targetProperty: "CreatedRIP",
            processProperty: "ProcessingID",
            columns: [
                { label: "RIP Number", property: "RIPNumber" },
                { label: "RIP Name", property: "RIPName" },
                { label: "Cedent", property: "Cedent" },
                { label: "Process Ref ID", property: "ProcessingID" },
                { label: "Target System", property: "Syst" },
                { label: "Target RIP", property: "CreatedRIP" },
                { label: "Created By", property: "CreatedBy" },
                { label: "Creation Date", property: "Createdon" }
            ]
        },
        T: {
            sourceProperty: "vtgnr",
            targetProperty: "CreatedTreaty",
            processProperty: "processingID",
            columns: [
                { label: "Treaty Number", property: "vtgnr" },
                { label: "Period Start Date", property: "PeriodStartDate" },
                { label: "Process Ref ID", property: "processingID" },
                { label: "Target System", property: "syst" },
                { label: "Target Treaty Number", property: "CreatedTreaty" },
                { label: "Line of Business", property: "LineOfBusiness" },
                { label: "Class of Business", property: "ClassOfBusiness" },
                { label: "Business Type", property: "BusinessTypeNumber" },
                { label: "Area", property: "Area" }
            ]
        },
        L: {
            sourceProperty: "schadnr",
            targetProperty: "target_number",
            processProperty: "process_id",
            columns: [
                { label: "Loss", property: "schadnr" },
                { label: "Loss Name", property: "schadbez" },
                { label: "Loss Event", property: "g_schadkz" },
                { label: "Process Ref ID", property: "process_id" },
                { label: "Target System", property: "systemm" },
                { label: "Target Loss", property: "target_number" }
            ]
        },
        RAM: {
            sourceProperty: "IrInternalId",
            targetProperty: "CreatedTreaty",
            processProperty: "ProcessingId",
            columns: [
                { label: "Internal ID", property: "IrInternalId" },
                { label: "External System ID", property: "ExternalsystemId" },
                { label: "External ID", property: "ExternalId" },
                { label: "Process Ref ID", property: "ProcessingId" },
                { label: "Target RAM", property: "CreatedTreaty" },
                { label: "Target System", property: "Syst" }
            ]
        },
        TCR: {
            sourceProperty: "vtgrrnr",
            targetProperty: "CreatedTCR",
            processProperty: "processingID",
            columns: [
                { label: "TCR Number", property: "vtgrrnr" },
                { label: "Rank", property: "Rank" },
                { label: "Field Name", property: "FieldName" },
                { label: "Field Value", property: "Value" },
                { label: "Company Code", property: "CompanyCode" },
                { label: "Process Ref ID", property: "processingID" },
                { label: "Target System", property: "syst" },
                { label: "Target TCR Number", property: "CreatedTCR" },
                { label: "Created By", property: "CreatedBy" },
                { label: "Creation Date", property: "CreatedDate" }
            ]
        },
        LRM: {
            sourceProperty: "Polno",
            targetProperty: "TargetNumber",
            processProperty: "ProcessingId",
            columns: [
                { label: "Policy ID", property: "Polid" },
                { label: "Policy Number", property: "Polno" },
                { label: "Process Ref ID", property: "ProcessingId" },
                { label: "Cedent", property: "Cedent" },
                { label: "Company Code", property: "CompanyCode" },
                { label: "Policy Company ID", property: "Polcompid" },
                { label: "Treaty Number", property: "TtyNo" },
                { label: "Ident ID", property: "Identid" },
                { label: "Life ID", property: "Lifeid" },
                { label: "Target LRM", property: "TargetNumber" }
            ]
        }
    };

    return Controller.extend("srt.app.controller.SelectiveRefresh", {

        // =========================================================
        // LIFECYCLE
        // =========================================================
        onInit: function () {

            this._iFragmentRequest = 0;

            this.getView().setModel(
                new JSONModel(createWizardData()),
                "wizard"
            );

            this._oBusyDialog = new BusyDialog();
            this._oBusyDialog.addStyleClass("srtBusyDialog");
            this.getView().addDependent(this._oBusyDialog);

            this._loadGroupIds();
        },

        onExit: function () {
            // stops a running poll loop
            this._bDestroyed = true;
        },

        // =========================================================
        // SMALL HELPERS
        // =========================================================
        _getWizardModel: function () {
            return this.getView().getModel("wizard");
        },

        /** Sets several wizard properties at once */
        _setWizardProps: function (mProps) {
            var oModel = this._getWizardModel();
            Object.keys(mProps).forEach(function (sKey) {
                oModel.setProperty("/" + sKey, mProps[sKey]);
            });
        },

        _resetSelectionState: function () {
            this._setWizardProps(createSelectionState());
        },

        _getResultTableConfig: function (sGroupId) {
            return RESULT_TABLE_CONFIG[sGroupId] || null;
        },

        _openBusy: function (sText) {
            this._oBusyDialog.setText(sText || "");
            this._oBusyDialog.open();
        },

        _getErrorText: function (oError) {
            try {
                var o = JSON.parse(oError.responseText);
                return (o.error && o.error.message &&
                    (o.error.message.value || o.error.message)) || "";
            } catch (e) {
                return (oError && (oError.message || oError.statusText)) || "";
            }
        },

        // =========================================================
        // GROUP IDS
        // =========================================================
        _loadGroupIds: function () {

            var oODataModel = this.getOwnerComponent().getModel();

            if (!oODataModel) {
                MessageToast.show("OData model is not available.");
                return;
            }

            var oGroupModel = new JSONModel({ items: [] });
            this.getView().setModel(oGroupModel, "groupIds");

            oODataModel.read("/ZRI_GRPID_VH", {
                filters: [
                    new Filter({
                        filters: [
                            new Filter("GrpId", FilterOperator.NE, "CD"),
                            new Filter("GrpId", FilterOperator.NE, "INSOBJ")
                        ],
                        and: true
                    })
                ],
                success: function (oData) {

                    var aItems = (oData.results || []).map(function (oItem) {
                        return {
                            GrpId: oItem.GrpId,
                            text: oItem.GrpId + " - " + (oItem.Description || "")
                        };
                    });

                    // LRM exists only in the frontend
                    if (!aItems.some(function (oItem) { return oItem.GrpId === "LRM"; })) {
                        aItems.push({ GrpId: "LRM", text: "LRM" });
                    }

                    oGroupModel.setProperty("/items", aItems);
                },
                error: function () {
                    MessageToast.show("Unable to load Group IDs.");
                }
            });
        },

        // =========================================================
        // NAVIGATION / RESET
        // =========================================================
        _clearForm: function () {
            this._destroySelectionFragment();
            this._clearResultTable();
            this._getWizardModel().setData(createWizardData());
        },

        onCancel: function () {
            this._clearForm();
        },

        onNavBack: function () {
            this._clearForm();
            this.getOwnerComponent().getRouter().navTo("home");
        },

        onGroupIdChange: function (oEvent) {

            var sGroupId = oEvent.getSource().getSelectedKey();

            // Clears table + selection + ALL copy flags (incl. the "enabled" ones)
            this._clearResultTable();

            this._setWizardProps({
                groupId: sGroupId,
                copyLoss: false,
                copyAccount: false,
                copyRip: false,
                copyTcr: false
            });

            this._showSelectionFragment(sGroupId);
        },

        // =========================================================
        // SELECTION FRAGMENT
        // =========================================================
        _destroySelectionFragment: function () {

            // invalidates any fragment that is still loading
            this._iFragmentRequest++;

            if (this._oSelectionFragment) {
                this._oSelectionFragment.destroy();
                this._oSelectionFragment = null;
            }
        },

        _showSelectionFragment: function (sGroupId) {

            this._destroySelectionFragment();

            var sFragmentName = SELECTION_FRAGMENTS[sGroupId];

            if (!sFragmentName) {
                return;
            }

            var oContainer = this.byId("selectionCriteriaContainer");
            var iRequest = this._iFragmentRequest;

            this.loadFragment({
                name: sFragmentName
            }).then(function (oFragment) {

                // user switched group again while this one was loading
                if (iRequest !== this._iFragmentRequest) {
                    oFragment.destroy();
                    return;
                }

                this._oSelectionFragment = oFragment;
                oContainer.addItem(oFragment);
                this._attachTokenValidators();

            }.bind(this)).catch(function (oError) {
                console.error("Error loading selection fragment:", oError);
            });
        },

        // =========================================================
        // RESULT TABLE
        // =========================================================
        _getResultTable: function () {

            if (!this._pResultTable) {

                this._pResultTable = this.loadFragment({
                    name: "srt.app.view.fragments.ResultTable",
                    id: this.getView().getId() + "--resultTableFragment"
                }).then(function (oTable) {

                    var oContainer = this.byId("resultTableContainer");

                    this._oResultTable = oTable;

                    oContainer.removeAllItems();
                    oContainer.addItem(oTable);

                    // attached ONCE (was detached/attached on every Go before)
                    oTable.attachRowSelectionChange(
                        this._onResultRowSelectionChange,
                        this
                    );

                    return oTable;

                }.bind(this));
            }

            return this._pResultTable;
        },

        _clearResultTable: function () {

            if (this._oResultTable) {
                this._oResultTable.unbindRows();
                this._oResultTable.clearSelection();
            }

            var oContainer = this.byId("resultTableContainer");
            if (oContainer) {
                oContainer.setVisible(false);
            }

            // clearSelection() does not reliably fire the selection event,
            // so the state is reset explicitly
            this._resetSelectionState();
        },

        _showResultTable: function (oModel, sPath, aFilters) {

            var oContainer = this.byId("resultTableContainer");
            var sGroupId = this._getWizardModel().getProperty("/groupId");

            if (!oContainer) {
                return;
            }

            this._getResultTable().then(function (oTable) {

                // group changed while the table fragment was loading
                if (this._getWizardModel().getProperty("/groupId") !== sGroupId) {
                    return;
                }

                this._configureResultTable(oTable, oModel, sPath, aFilters);
                oContainer.setVisible(true);

            }.bind(this));
        },

        _buildResultColumn: function (oColumn) {

            var oTemplate = DATE_PROPERTIES[oColumn.property]
                ? new Text({
                    text: {
                        path: "result>" + oColumn.property,
                        formatter: formatDate
                    }
                })
                : new Text({
                    text: "{result>" + oColumn.property + "}"
                });

            return new TableColumn({
                label: new Label({ text: oColumn.label }),
                template: oTemplate,
                width: "11rem"
            });
        },

        _configureResultTable: function (oTable, oModel, sPath, aFilters) {

            var sGroupId = this._getWizardModel().getProperty("/groupId");
            var oConfig = this._getResultTableConfig(sGroupId);

            if (!oConfig) {
                return;
            }

            // previous object's binding + selection
            oTable.unbindRows();
            oTable.clearSelection();
            this._resetSelectionState();

            // Columns are rebuilt ONLY when the object type changed
            // (old columns are destroyed, not just removed -> no leak)
            if (this._sTableGroupId !== sGroupId) {

                oTable.destroyColumns();

                oConfig.columns.forEach(function (oColumn) {
                    oTable.addColumn(this._buildResultColumn(oColumn));
                }, this);

                oTable.setWidth((oConfig.columns.length * 11) + "rem");

                this._sTableGroupId = sGroupId;
            }

            oTable.setModel(oModel, "result");

            oTable.bindRows({
                path: "result>" + sPath,
                filters: aFilters,
                parameters: { countMode: "Inline" }
            });
        },

        /** Re-reads the current table binding. Resolves after the data arrived. */
        _refreshResultTable: function () {

            var oTable = this._oResultTable;
            var oBinding = oTable && oTable.getBinding("rows");

            if (!oBinding) {
                return Promise.resolve();
            }

            return new Promise(function (resolve) {
                oBinding.attachEventOnce("dataReceived", resolve);
                oBinding.refresh(true);
            }).then(function () {
                // fresh data -> old selection / copy flags are stale
                oTable.clearSelection();
                this._resetSelectionState();
            }.bind(this));
        },

        // =========================================================
        // SELECTION -> COPY BUTTON STATE (one place)
        // =========================================================
        _onResultRowSelectionChange: function (oEvent) {

            var oTable = oEvent.getSource();
            var sGroupId = this._getWizardModel().getProperty("/groupId");
            var aSelected = [];

            oTable.getSelectedIndices().forEach(function (iIndex) {
                var oContext = oTable.getContextByIndex(iIndex);
                if (oContext) {
                    aSelected.push(oContext.getObject());
                }
            });

            this._setWizardProps({
                selectedResults: aSelected,
                selectedResult: aSelected[0] || null
            });

            this._updateCopyState(aSelected, sGroupId);
        },

        /**
         * Enables the "copy again" options based on ALL selected rows
         * (before: only the first row was looked at) and always un-ticks
         * an option that gets disabled.
         */
        _updateCopyState: function (aSelected, sGroupId) {

            var oConfig = this._getResultTableConfig(sGroupId);
            var bCopyAgain = false;
            var bLossEventAgain = false;
            var bLossAgain = false;

            if (oConfig && aSelected.length) {

                if (sGroupId === "L") {

                    bLossEventAgain = aSelected.some(function (o) {
                        return hasValue(o, "g_schadkz") && hasValue(o, "target_number");
                    });

                    bLossAgain = aSelected.some(function (o) {
                        return !hasValue(o, "g_schadkz") && hasValue(o, "target_number");
                    });

                } else {

                    bCopyAgain = aSelected.some(function (o) {
                        return hasValue(o, oConfig.targetProperty);
                    });
                }
            }

            var oModel = this._getWizardModel();
            var mProps = {
                copyAgainEnabled: bCopyAgain,
                copyLossEventAgainEnabled: bLossEventAgain,
                copyLossAgainEnabled: bLossAgain
            };

            if (!bCopyAgain) { mProps.copyAgain = false; }
            if (!bLossEventAgain) { mProps.copyLossEventAgain = false; }
            if (!bLossAgain) { mProps.copyLossAgain = false; }

            this._setWizardProps(mProps);
        },

        // =========================================================
        // EXECUTION
        // =========================================================
        _buildExecFilters: function (mParams) {
            return Object.keys(mParams).map(function (sKey) {
                return new Filter(sKey, FilterOperator.EQ, mParams[sKey]);
            });
        },

        onNext: function () {

            var oView = this.getView();
            var oExecutionModel = oView.getModel("ZGS_SRT_SRV");
            var oWizardModel = this._getWizardModel();

            if (!oExecutionModel) {
                MessageToast.show("Execution service is not available.");
                return;
            }

            var sGroupId = oWizardModel.getProperty("/groupId");
            var sRfcDestination = oWizardModel.getProperty("/rfcDestination");
            var aSelectedResults = oWizardModel.getProperty("/selectedResults") || [];

            if (!sGroupId) {
                MessageToast.show("Please select an object.");
                return;
            }

            if (!sRfcDestination) {
                MessageToast.show("Please select RFC Destination.");
                return;
            }

            if (!aSelectedResults.length) {
                MessageToast.show("Please select at least one row before executing.");
                return;
            }

            var oConfig = this._getResultTableConfig(sGroupId);

            if (!oConfig) {
                MessageToast.show("Source key is not configured for this object.");
                return;
            }

            // unique, trimmed, non-empty keys
            var aObjectKeys = [];
            aSelectedResults.forEach(function (oItem) {
                var sKey = hasValue(oItem, oConfig.sourceProperty)
                    ? String(oItem[oConfig.sourceProperty]).trim()
                    : "";
                if (sKey && aObjectKeys.indexOf(sKey) === -1) {
                    aObjectKeys.push(sKey);
                }
            });

            // validate BEFORE the busy dialog is opened
            if (!aObjectKeys.length) {
                MessageToast.show("No valid objects selected.");
                return;
            }

            // For losses the two loss specific options also mean "copy again"
            var bCopyAgain = !!(
                oWizardModel.getProperty("/copyAgain") ||
                oWizardModel.getProperty("/copyLossEventAgain") ||
                oWizardModel.getProperty("/copyLossAgain")
            );

            var mParams = {
                iv_grp_id: sGroupId,
                iv_rfc: sRfcDestination,
                iv_copy_again: bCopyAgain,
                iv_rip_from: aObjectKeys.join(",")
            };

            (DEPENDENT_FLAGS[sGroupId] || []).forEach(function (aMap) {
                if (oWizardModel.getProperty("/" + aMap[0])) {
                    mParams[aMap[1]] = true;
                }
            });

            this._openBusy("Processing objects...");

            oExecutionModel.read("/RIPSet", {
                filters: this._buildExecFilters(mParams),

                success: function (oData) {

                    var sProcessId = oData.results && oData.results.length
                        ? oData.results[0].process_id
                        : "";

                    (sProcessId
                        ? this._waitForExecution(sGroupId, aObjectKeys, sProcessId)
                        : Promise.resolve(false)
                    )
                        .then(function (bDone) {
                            return this._refreshResultTable().then(function () {
                                return bDone;
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

                    this._oBusyDialog.close();

                    MessageToast.show(
                        "Execution failed. " + this._getErrorText(oError)
                    );

                }.bind(this)
            });
        },

        /**
         * Polls until every key shows the new Process ID, or the timeout hits.
         * Only the 2 needed columns are requested ($select).
         */
        _waitForExecution: function (sGroupId, aKeys, sProcessId) {

            var oConfig = this._getResultTableConfig(sGroupId);
            var oBinding = this._oResultTable && this._oResultTable.getBinding("rows");

            if (!oConfig || !oBinding) {
                return Promise.resolve(false);
            }

            var oModel = oBinding.getModel();
            var sPath = oBinding.getPath();
            var sSource = oConfig.sourceProperty;
            var sProcess = oConfig.processProperty;
            var iStart = Date.now();

            var oKeyFilter = new Filter({
                filters: aKeys.map(function (sKey) {
                    return new Filter(sSource, FilterOperator.EQ, sKey);
                }),
                and: false
            });

            return new Promise(function (resolve, reject) {

                var poll = function () {

                    if (this._bDestroyed) {
                        resolve(false);
                        return;
                    }

                    oModel.read(sPath, {
                        filters: [oKeyFilter],
                        urlParameters: { "$select": sSource + "," + sProcess },
                        success: function (oData) {

                            var bDone = aKeys.every(function (sKey) {
                                return oData.results.some(function (oRow) {
                                    return String(oRow[sSource]).trim() === sKey &&
                                        String(oRow[sProcess] || "").trim() === sProcessId;
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

                }.bind(this);

                poll();

            }.bind(this));
        },

        onSaveAsVariant: function () {
            MessageToast.show("Variant saved.");
        },

        // =========================================================
        // RANGES (RIP from / to)
        // =========================================================
        onAddRange: function () {

            var oModel = this._getWizardModel();
            var aRanges = (oModel.getProperty("/ranges") || []).concat([{ from: "", to: "" }]);

            oModel.setProperty("/ranges", aRanges);
        },

        onClearRanges: function () {
            this._getWizardModel().setProperty("/ranges", [{ from: "", to: "" }]);
        },

        onRangeFromValueHelp: function () {
            this._openRIPValueHelp("from");
        },

        onRangeToValueHelp: function () {
            this._openRIPValueHelp("to");
        },

        _openRIPValueHelp: function (sField) {

            var oODataModel = this.getView().getModel();

            if (this._getWizardModel().getProperty("/groupId") !== "RIP") {
                MessageToast.show("Value help is currently only available for Group Id 'RIP'.");
                return;
            }

            this._sRangeField = sField;

            var oMetaModel = oODataModel.getMetaModel();

            oMetaModel.loaded().then(function () {

                var oEntitySetDef = oMetaModel.getODataEntitySet(RIP_ENTITY_SET);

                if (!oEntitySetDef) {
                    MessageToast.show("Entity set '" + RIP_ENTITY_SET + "' not found in metadata.");
                    return;
                }

                var oEntityType = oMetaModel.getODataEntityType(oEntitySetDef.entityType);
                var sKeyField = oEntityType.key.propertyRef[0].name;

                this._buildAndOpenDialog(oEntityType, sKeyField);

            }.bind(this));
        },

        _buildAndOpenDialog: function (oEntityType, sKeyField) {

            var oView = this.getView();
            var aColumns = [];
            var aCells = [];

            oEntityType.property.forEach(function (oProp) {

                if (oProp["sap:visible"] === "false") {
                    return;
                }

                aColumns.push(new Column({
                    header: new Label({ text: oProp["sap:label"] || oProp.name })
                }));

                aCells.push(
                    oProp.type === "Edm.DateTime"
                        ? new Text({ text: { path: oProp.name, formatter: formatDate } })
                        : new Text({ text: "{" + oProp.name + "}" })
                );
            });

            var oDialog = new TableSelectDialog({
                title: "Select RIP",
                multiSelect: false,
                noDataText: "No RIPs found",
                columns: aColumns,

                search: function (oEvent) {

                    var sValue = oEvent.getParameter("value");
                    var oBinding = oEvent.getSource().getBinding("items");

                    if (oBinding) {
                        oBinding.filter(
                            sValue
                                ? [new Filter(sKeyField, FilterOperator.Contains, sValue)]
                                : []
                        );
                    }
                },

                confirm: this._onValueHelpConfirm.bind(this, sKeyField),

                cancel: function () {
                    oDialog.destroy();
                }
            });

            oDialog.bindAggregation("items", {
                path: "/" + RIP_ENTITY_SET,
                template: new ColumnListItem({ cells: aCells })
            });

            oDialog.setModel(oView.getModel());
            oView.addDependent(oDialog);
            oDialog.open();
        },

        _onValueHelpConfirm: function (sKeyField, oEvent) {

            var oDialog = oEvent.getSource();
            var aSelectedItems = oEvent.getParameter("selectedItems") || [];

            var aValues = aSelectedItems
                .map(function (oItem) {
                    var oContext = oItem.getBindingContext();
                    return oContext ? oContext.getObject()[sKeyField] : null;
                })
                .filter(Boolean);

            if (aValues.length) {

                var oModel = this._getWizardModel();
                var aRanges = (oModel.getProperty("/ranges") || []).slice();

                aRanges[0] = aRanges[0] || { from: "", to: "" };
                aRanges[0][this._sRangeField] = aValues[0];

                for (var i = 1; i < aValues.length; i++) {
                    aRanges.push({ from: aValues[i], to: aValues[i] });
                }

                oModel.setProperty("/ranges", aRanges);
            }

            // destroyed on every path (was leaking when nothing was selected)
            oDialog.destroy();
        },

        // =========================================================
        // GENERIC "GO" HANDLING
        // =========================================================
        _runGo: function (mCfg) {

            if (mCfg.requireCriteria && !mCfg.filters.length) {
                MessageToast.show("Please enter at least one search criterion.");
                return;
            }

            var oModel = this.getView().getModel(mCfg.model);

            if (!oModel) {
                MessageToast.show(mCfg.label + " service is not available.");
                return;
            }

            this._showResultTable(oModel, mCfg.path, mCfg.filters);
        },

        onBPGo: function () {

            var oWizard = this._getWizardModel();
            var aFilters = [];

            this._addEqFilter(aFilters, "bp_external", oWizard.getProperty("/businessPartner"));
            this._addEqFilter(aFilters, "Process_id", oWizard.getProperty("/processRefId"));
            this._addEqFilter(aFilters, "destination", oWizard.getProperty("/targetSystem"));

            this._runGo({
                model: "ZRI_S_BUSINESS_PARTNER",
                path: "/ZRI_C_BUSINESS_PARTNER",
                label: "Business Partner",
                filters: aFilters
            });
        },

        onTreatyGo: function () {

            var oWizard = this._getWizardModel();
            var aFilters = [];

            var fTreaty = this._getTokenFilter("treatyInput", "vtgnr");
            if (fTreaty) { aFilters.push(fTreaty); }

            this._addDateFilter(aFilters, "PeriodStartDate", oWizard.getProperty("/treatyPeriodStartDate"));
            this._addEqFilter(aFilters, "LineOfBusiness", oWizard.getProperty("/treatyLineOfBusiness"), true);
            this._addEqFilter(aFilters, "ClassOfBusiness", oWizard.getProperty("/treatyClassOfBusiness"), true);
            this._addEqFilter(aFilters, "Area", oWizard.getProperty("/treatyArea"), true);
            this._addEqFilter(aFilters, "CreatedBy", oWizard.getProperty("/treatyCreatedBy"), true);
            this._addDateFilter(aFilters, "CreationDate", oWizard.getProperty("/treatyCreationDate"));
            this._addEqFilter(aFilters, "processingID", oWizard.getProperty("/treatyProcessRefId"));
            this._addEqFilter(aFilters, "syst", oWizard.getProperty("/treatyTargetSystem"));

            this._runGo({
                model: "ZRI_S_TTY_DATA",
                path: "/Treaty",
                label: "Treaty",
                filters: aFilters
            });
        },

        onAccountGo: function () {

            var oWizard = this._getWizardModel();
            var aFilters = [];

            var fAcc = this._getTokenFilter("accountNumberInput", "AccountNumber");
            if (fAcc) { aFilters.push(fAcc); }

            this._addDateFilter(aFilters, "FIpostingdate", oWizard.getProperty("/accountFIPostingDate"));
            this._addEqFilter(aFilters, "SectionNumber", oWizard.getProperty("/accountSectionNumber"), true);
            this._addEqFilter(aFilters, "UWyear", oWizard.getProperty("/accountUWYear"));
            this._addEqFilter(aFilters, "Lineofbusiness", oWizard.getProperty("/accountLineOfBusiness"), true);
            this._addEqFilter(aFilters, "Classofbusiness", oWizard.getProperty("/accountClassOfBusiness"), true);
            this._addEqFilter(aFilters, "Businesstype", oWizard.getProperty("/accountBusinessType"), true);
            this._addDateFilter(aFilters, "Startofaccperiod", oWizard.getProperty("/accountStartPeriodDate"));
            this._addDateFilter(aFilters, "Endofaccperiod", oWizard.getProperty("/accountEndPeriodDate"));
            this._addEqFilter(aFilters, "AccFunction", oWizard.getProperty("/accountFunction"), true);
            this._addEqFilter(aFilters, "CreatedBy", oWizard.getProperty("/accountCreatedBy"), true);
            this._addDateFilter(aFilters, "CreationDate", oWizard.getProperty("/accountCreationDate"));
            this._addEqFilter(aFilters, "processingID", oWizard.getProperty("/accountProcessRefId"));

            this._runGo({
                model: "ZRI_SB_ACC_DATA",
                path: "/Account",
                label: "Account",
                filters: aFilters,
                requireCriteria: true // accounts: never load the full table
            });
        },

        onRIPGo: function () {

            var oWizard = this._getWizardModel();
            var aFilters = [];

            var fRip = this._getTokenFilter("ripNumberInput", "RIPNumber");
            if (fRip) { aFilters.push(fRip); }

            this._addEqFilter(aFilters, "CreatedBy", oWizard.getProperty("/ripCreatedBy"), true);
            this._addDateFilter(aFilters, "Createdon", oWizard.getProperty("/ripCreationDate"));
            this._addEqFilter(aFilters, "ProcessingID", oWizard.getProperty("/ripProcessRefId"));
            this._addEqFilter(aFilters, "Syst", oWizard.getProperty("/ripTargetSystem"));

            this._runGo({
                model: "ZRI_SB_RIP_DATA",
                path: "/RIP",
                label: "RIP",
                filters: aFilters
            });
        },

        onTCRGo: function () {

            var oWizard = this._getWizardModel();
            var aFilters = [];

            var fTcr = this._getTokenFilter("tcrNumberInput", "vtgrrnr");
            if (fTcr) { aFilters.push(fTcr); }

            this._addEqFilter(aFilters, "CreatedBy", oWizard.getProperty("/tcrCreatedBy"), true);
            this._addDateFilter(aFilters, "CreatedDate", oWizard.getProperty("/tcrCreationDate"));
            this._addEqFilter(aFilters, "processingID", oWizard.getProperty("/tcrProcessRefId"));

            this._runGo({
                model: "ZRI_SB_TCR_DATA",
                path: "/TCR",
                label: "TCR",
                filters: aFilters
            });
        },

        onLossGo: function () {

            var oWizard = this._getWizardModel();
            var aFilters = [];

            var fLoss = this._getTokenFilter("LossInput", "schadnr");
            if (fLoss) { aFilters.push(fLoss); }

            this._addEqFilter(aFilters, "process_id", oWizard.getProperty("/lossProcessRefId"));
            this._addEqFilter(aFilters, "systemm", oWizard.getProperty("/lossTargetSystem"));

            this._runGo({
                model: "ZRI_SB_CLM_PROC",
                path: "/Claims",
                label: "Loss",
                filters: aFilters
            });
        },

        onLRMGo: function () {

            var oWizard = this._getWizardModel();
            var aFilters = [];

            // GUID fields: accept with or without hyphens / braces
            var aGuids = [
                ["Polid", "/lrmPolicyId", "Policy ID"],
                ["Identid", "/lrmIdentId", "Ident ID"],
                ["Lifeid", "/lrmLifeId", "Life ID"]
            ];

            for (var i = 0; i < aGuids.length; i++) {

                var sHex = String(oWizard.getProperty(aGuids[i][1]) || "")
                    .trim()
                    .replace(/[{}-]/g, "");

                if (!sHex) { continue; }

                if (!/^[0-9a-fA-F]{32}$/.test(sHex)) {
                    MessageToast.show(aGuids[i][2] + " is not a valid GUID.");
                    return;
                }

                aFilters.push(new Filter(
                    aGuids[i][0],
                    FilterOperator.EQ,
                    (sHex.substr(0, 8) + "-" + sHex.substr(8, 4) + "-" +
                        sHex.substr(12, 4) + "-" + sHex.substr(16, 4) + "-" +
                        sHex.substr(20)).toLowerCase()
                ));
            }

            this._addEqFilter(aFilters, "Polno", oWizard.getProperty("/lrmPolicyNumber"), true);
            this._addEqFilter(aFilters, "ProcessingId", oWizard.getProperty("/lrmProcessRefId"));
            this._addEqFilter(aFilters, "Cedent", oWizard.getProperty("/lrmCedent"), true);
            this._addEqFilter(aFilters, "CompanyCode", oWizard.getProperty("/lrmCompanyCode"), true);
            this._addEqFilter(aFilters, "TtyNo", oWizard.getProperty("/lrmTreatyNumber"), true);

            this._runGo({
                model: "ZRI_S_LRM_DATA",
                path: "/ZRI_C_LRM_DATA",
                label: "LRM",
                filters: aFilters
            });
        },

        onRAMGo: function () {

            var oWizard = this._getWizardModel();
            var aFilters = [];

            this._addEqFilter(aFilters, "ExternalsystemId", oWizard.getProperty("/ramExternalSystemId"));
            this._addEqFilter(aFilters, "ExternalId", oWizard.getProperty("/ramExternalId"));
            this._addEqFilter(aFilters, "ProcessingId", oWizard.getProperty("/ramProcessRefId"));
            this._addEqFilter(aFilters, "CreatedTreaty", oWizard.getProperty("/ramTargetRam"));
            this._addEqFilter(aFilters, "Syst", oWizard.getProperty("/ramTargetSystem"));

            this._runGo({
                model: "ZRI_S_RAM_DATA_V2",
                path: "/ZRI_C_RAM_DATA",
                label: "RAM",
                filters: aFilters
            });
        },

        // =========================================================
        // BUSINESS PARTNER VALUE HELP
        // =========================================================
        onBusinessPartnerValueHelp: function () {

            var oView = this.getView();
            var oBPModel = oView.getModel("ZRI_S_BUSINESS_PARTNER");

            if (!oBPModel) {
                MessageToast.show("Business Partner service is not available.");
                return;
            }

            var oDialog = new TableSelectDialog({
                title: "Select Business Partner",
                contentWidth: "60%",
                contentHeight: "55%",
                multiSelect: false,
                noDataText: "No Business Partners found",

                columns: [
                    new Column({ header: new Label({ text: "Business Partner" }) }),
                    new Column({ header: new Label({ text: "External BP Number" }) }),
                    new Column({ header: new Label({ text: "BP Type" }) })
                ],

                search: function (oEvent) {

                    var sValue = oEvent.getParameter("value");
                    var oBinding = oEvent.getSource().getBinding("items");

                    oBinding.filter(
                        sValue
                            ? [new Filter({
                                filters: [
                                    new Filter("bp_external", FilterOperator.Contains, sValue),
                                    new Filter("bpext", FilterOperator.Contains, sValue)
                                ],
                                and: false
                            })]
                            : []
                    );
                },

                confirm: function (oEvent) {

                    var oSelectedItem = oEvent.getParameter("selectedItem");
                    var oContext = oSelectedItem && oSelectedItem.getBindingContext("bp");

                    if (oContext) {
                        this._getWizardModel().setProperty(
                            "/businessPartner",
                            oContext.getObject().bp_external
                        );
                    }

                    oDialog.destroy();

                }.bind(this),

                cancel: function () {
                    oDialog.destroy();
                }
            });

            oDialog.setModel(oBPModel, "bp");

            oDialog.bindAggregation("items", {
                path: "bp>/ZRI_C_BUSINESS_PARTNER",
                template: new ColumnListItem({
                    cells: [
                        new Text({ text: "{bp>bp_external}" }),
                        new Text({ text: "{bp>bpext}" }),
                        new Text({ text: "{bp>type}" })
                    ]
                })
            });

            oView.addDependent(oDialog);
            oDialog.open();
        },

        // =========================================================
        // FILTER / TOKEN HELPERS
        // =========================================================

        /**
         * "yyyy-MM-dd" -> Date at 00:00 UTC.
         * OData V2 serialises Edm.DateTime filters with the UTC fields, so a
         * local-midnight Date would shift the day.
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

        /** Text typed by the user -> range descriptor (1...5, >=1, <5, !=1, *x*, x*, *x) */
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
            TOKEN_INPUT_IDS.forEach(function (sId) {
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
                switch (sOp) {
                    case "EQ": return new Filter(sProperty, FO.NE, v1);
                    case "BT": return new Filter(sProperty, FO.NB, v1, v2);
                    // inverse comparison operators
                    case "GT": return new Filter(sProperty, FO.LE, v1);
                    case "GE": return new Filter(sProperty, FO.LT, v1);
                    case "LT": return new Filter(sProperty, FO.GE, v1);
                    case "LE": return new Filter(sProperty, FO.GT, v1);
                    default:
                        return FO["Not" + sOp]
                            ? new Filter(sProperty, FO["Not" + sOp], v1)
                            : null;
                }
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
         * ONE filter from all tokens of a token input
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

        // =========================================================
        // ACCOUNT VALUE HELP (fragment is loaded + prepared ONCE)
        // =========================================================
        _getAccountVHD: function () {

            if (!this._pAccountVHD) {

                var oModel = this.getView().getModel("ZRI_SB_ACC_DATA");

                this._pAccountVHD = this.loadFragment({
                    name: "srt.app.view.fragments.AccountValueHelp"
                }).then(function (oVHD) {

                    return oVHD.getTableAsync().then(function (oTable) {

                        oTable.setModel(oModel, "ZRI_SB_ACC_DATA");

                        // sap.ui.table.Table
                        if (oTable.bindRows) {

                            ACCOUNT_VH_COLUMNS.forEach(function (c) {
                                oTable.addColumn(new TableColumn({
                                    label: new Label({ text: c.label }),
                                    template: new Text({
                                        text: "{ZRI_SB_ACC_DATA>" + c.property + "}"
                                    })
                                }));
                            });

                            oTable.bindRows({ path: "ZRI_SB_ACC_DATA>/ZRI_I_ABRNR_VH" });
                        }

                        oVHD.update();

                        return oVHD;
                    });
                });
            }

            return this._pAccountVHD;
        },

        onAccountValHelp: function () {
            this._getAccountVHD().then(function (oVHD) {
                oVHD.open();
            });
        },

        onAccountVHSearch: function () {

            var aFilters = [];

            ACCOUNT_VH_FILTER_FIELDS.forEach(function (aField) {
                var oInput = this.byId(aField[0]);
                var sValue = oInput ? oInput.getValue().trim() : "";
                if (sValue) {
                    aFilters.push(new Filter(aField[1], aField[2], sValue));
                }
            }, this);

            this._getAccountVHD().then(function (oVHD) {

                oVHD.getTableAsync().then(function (oTable) {

                    var oBinding = oTable.getBinding("rows") || oTable.getBinding("items");

                    if (oBinding) {
                        oBinding.filter(aFilters);
                    }

                    oVHD.update();
                });
            });
        },

        onAccountVHOk: function (oEvent) {

            var aTokens = oEvent.getParameter("tokens") || [];
            var oMultiInput = this.byId("accountNumberInput");

            if (oMultiInput) {
                oMultiInput.setTokens(aTokens);
            }

            this._getWizardModel().setProperty(
                "/accountNumbers",
                aTokens
                    .filter(function (t) { return !t.data("range"); })
                    .map(function (t) { return t.getKey(); })
            );

            oEvent.getSource().close();
        },

        onAccountVHCancel: function (oEvent) {
            oEvent.getSource().close();
        },

        // =========================================================
        // ACCOUNT "COPY WITH" DIALOG
        // =========================================================
        _getAccountCopyDialog: function () {

            if (!this._pAccountCopyWithDialog) {
                this._pAccountCopyWithDialog = this.loadFragment({
                    name: "srt.app.view.fragments.AccountCopyWith"
                });
            }

            return this._pAccountCopyWithDialog;
        },

        onAccountCopyWithOpen: function () {
            this._getAccountCopyDialog().then(function (oDialog) {
                oDialog.open();
            });
        },

        onCopyAccountWithCancel: function () {

            this._setWizardProps({
                copyWithTreatyFrom: "",
                copyWithTreatyTo: "",
                copyWithCopyAgain: false
            });

            this._getAccountCopyDialog().then(function (oDialog) {
                oDialog.close();
            });
        },

        onCopyAccountWithExecute: function () {

            var oWizard = this._getWizardModel();
            var oExecutionModel = this.getView().getModel("ZGS_SRT_SRV");

            if (!oExecutionModel) {
                MessageToast.show("Execution service is not available.");
                return;
            }

            // Target system defaults to the one selected on the main screen
            var sRfc = oWizard.getProperty("/copyWithRfcDestination") ||
                oWizard.getProperty("/rfcDestination");
            var sTreatyFrom = oWizard.getProperty("/copyWithTreatyFrom");
            var sTreatyTo = oWizard.getProperty("/copyWithTreatyTo");

            if (!sRfc) {
                MessageToast.show("Please select RFC Destination.");
                return;
            }

            if (!sTreatyFrom) {
                MessageToast.show("Please enter Treaty From.");
                return;
            }

            var aFilters = this._buildExecFilters({
                iv_grp_id: "A",
                iv_rfc: sRfc,
                iv_copy_again: !!oWizard.getProperty("/copyWithCopyAgain"),
                iv_rip_from: sTreatyFrom,
                iv_copy_with: true,
                // Nullable="false" in the service -> always send something
                iv_rip_to: sTreatyTo || ""
            });

            this._openBusy();

            oExecutionModel.read("/RIPSet", {
                filters: aFilters,

                success: function (oData) {

                    this._oBusyDialog.close();

                    var sProcessId = oData.results && oData.results.length
                        ? oData.results[0].process_id
                        : "";

                    if (sProcessId) {
                        oWizard.setProperty("/accountProcessRefId", sProcessId);
                    }

                    MessageToast.show(
                        "Execution started successfully. Process ID: " + sProcessId
                    );

                    this._getAccountCopyDialog().then(function (oDialog) {
                        oDialog.close();
                    });

                }.bind(this),

                error: function (oError) {

                    this._oBusyDialog.close();

                    MessageToast.show(
                        "Account copy failed. " + this._getErrorText(oError)
                    );

                }.bind(this)
            });
        },

        // =========================================================
        // PROCESS LOG
        // =========================================================
        onProcessLogPress: function () {

            var oWizard = this._getWizardModel();
            var sGroupId = oWizard.getProperty("/groupId");
            var aSelectedRows = oWizard.getProperty("/selectedResults") || [];

            if (!aSelectedRows.length) {
                MessageToast.show("Please select at least one row.");
                return;
            }

            var oConfig = this._getResultTableConfig(sGroupId);

            if (!oConfig || PROCESS_LOG_GROUPS.indexOf(sGroupId) === -1) {
                MessageToast.show("Process Log not configured for this object.");
                return;
            }

            // unique root numbers
            var aRoots = [];
            aSelectedRows.forEach(function (oRow) {
                var sRoot = hasValue(oRow, oConfig.sourceProperty)
                    ? String(oRow[oConfig.sourceProperty])
                    : "";
                if (sRoot && aRoots.indexOf(sRoot) === -1) {
                    aRoots.push(sRoot);
                }
            });

            if (!aRoots.length) {
                MessageToast.show("No source object found.");
                return;
            }

            var oModel = this.getView().getModel("ZGS_SRT_SRV");

            if (!oModel) {
                MessageToast.show("Process Log service is not available.");
                return;
            }

            // No ObjectType restriction: dependent objects (loss, account, ...)
            // are logged under their own object type with the same root number.
            var oRootFilter = new Filter({
                filters: aRoots.map(function (sRoot) {
                    return new Filter("RootSourceNumber", FilterOperator.EQ, sRoot);
                }),
                and: false
            });

            this._openBusy();

            oModel.read("/ProcessLogSet", {
                filters: [oRootFilter],

                success: function (oData) {
                    this._oBusyDialog.close();
                    this._openProcessLogDialog("Process Log", oData.results || []);
                }.bind(this),

                error: function () {
                    this._oBusyDialog.close();
                    MessageToast.show("Unable to load Process Log.");
                }.bind(this)
            });
        },

        _openProcessLogDialog: function (sTitle, aLogs) {

            if (!this._oProcessLogModel) {
                this._oProcessLogModel = new JSONModel({ logs: [] });
            }

            this._oProcessLogModel.setData({ logs: aLogs });

            if (!this._pProcessLogDialog) {
                this._pProcessLogDialog = this.loadFragment({
                    name: "srt.app.view.fragments.ProcessLog"
                });
            }

            this._pProcessLogDialog.then(function (oDialog) {
                oDialog.setModel(this._oProcessLogModel, "processLog");
                oDialog.setTitle(sTitle);
                oDialog.open();
            }.bind(this));
        },

        onProcessLogClose: function () {
            if (this._pProcessLogDialog) {
                this._pProcessLogDialog.then(function (oDialog) {
                    oDialog.close();
                });
            }
        },

        // =========================================================
        // OBJECT DETAILS
        // =========================================================
        onRowSelectionChange: function (oEvent) {

            var oTable = oEvent.getSource();
            var iIndex = oEvent.getParameter("rowIndex");

            if (iIndex < 0) {
                return;
            }

            // rowIndex is the ABSOLUTE index -> read it from the binding,
            // not from oTable.getRows() (which only holds the visible rows)
            var oContext = oTable.getContextByIndex(iIndex);

            if (!oContext) {
                return;
            }

            this.getView().setModel(new JSONModel(oContext.getObject()), "detail");
            this.getOwnerComponent().getRouter().navTo("objectDetails");
        },

        onOpenObjectDetails: function (oEvent) {

            var oRow = oEvent.getSource().getParent();
            var oContext = oRow.getBindingContext("result") || oRow.getBindingContext();

            if (!oContext) {
                return;
            }

            this.getOwnerComponent().setModel(
                new JSONModel({
                    groupId: this._getWizardModel().getProperty("/groupId"),
                    data: oContext.getObject()
                }),
                "selectedObject"
            );

            this.getOwnerComponent().getRouter().navTo("objectDetails");
        }

    });
});