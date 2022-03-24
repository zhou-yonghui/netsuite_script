/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define([], function () {

    function beforeLoad(context) {
        var newRecord = context.newRecord;
        if (context.type == 'view') {
            var form = context.form;
            form.clientScriptModulePath = './CL_CS_PO_PRINT.js';
            form.addButton({
                id: 'custpage_bills',
                label: '打印采购合同',
                functionName: 'printBills("' + newRecord.id + '")'
            });

            form.addButton({
                id: 'custpage_ord_bills',
                label: '打印订货合同',
                functionName: 'printOrdBills("' + newRecord.id + '")'
            });
        }
    }

    function beforeSubmit(context) {

    }

    function afterSubmit(context) {

    }

    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    }
});
