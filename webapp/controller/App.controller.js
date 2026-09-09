sap.ui.define([
    "sap/ui/core/mvc/Controller"
], function (Controller) {
    "use strict";

    return Controller.extend("srt.app.controller.App", {
        // The App view is only a shell (a sap.m.App control) that hosts
        // all other pages via routing. No logic is needed here.
        onInit: function () {}
    });
});
