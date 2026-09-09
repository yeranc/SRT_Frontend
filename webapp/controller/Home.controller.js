sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ushell/Container"
], function (Controller, ) {
    "use strict";

    return Controller.extend("srt.app.controller.Home", {

        onInit: function () {
            // Nothing to load yet - Home page is fully static.
            this.byId("heroImage").setSrc(
        sap.ui.require.toUrl("srt/app/images/hero-background.png")
         );
        },

        /**
         * Generic handler for the 4 navigation cards.
         * Each CustomListItem carries a "route" custom data value
         * that matches a route name in manifest.json.
         */
        onCustomPress: function (oEvent) {
            // var sRoute = oEvent.getSource().data("route");
            // this.getOwnerComponent().getRouter().navTo(sRoute);
            var oCrossAppNavigator =
                sap.ushell.Container.getService("CrossApplicationNavigation");

                sap.ushell.Conta
            var sHash = (oCrossAppNavigator && oCrossAppNavigator.hrefForExternal({
                target: {
                    semanticObject: "ZSRT_SO_CUSTOMIZING",
                    action: "display"
                }
            })) || "";
            oCrossAppNavigator.toExternal({
                target: {
                    shellHash: sHash
                }
            });

            // oCrossAppNavigator.toExternal({
            //     target: {
            //         semanticObject: "ZSRT_SO_CUSTMIZING",
            //         action: "display"
            //     }
            // });

        },
        onCardPress: function (oEvent) {
            var sRoute = oEvent.getSource().data("route");
            this.getOwnerComponent().getRouter().navTo(sRoute);
            // var oCrossAppNavigator =
            //     sap.ushell.Container.getService("CrossApplicationNavigation");

            // oCrossAppNavigator.toExternal({
            //     target: {
            //         semanticObject: "ZSRT_SO_TCODES",
            //         action: "display"
            //     }
            // });

        },

        onNavToEvaluating: function () {
            this.getOwnerComponent().getRouter().navTo("evaluating");
        },

        onNavToEvaluatingUpload: function () {
            this.getOwnerComponent().getRouter().navTo("evaluatingUpload");
        }
    });
});
