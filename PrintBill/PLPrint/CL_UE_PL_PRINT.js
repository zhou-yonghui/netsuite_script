/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define([], function () {

    function beforeLoad(context) {
        try {
            if (context.type == 'view') {
                var newRecord = context.newRecord;
                var form = context.form;
                form.clientScriptModulePath = './CL_CS_PL_PRINT.js';
                form.addButton({
                    id: 'custpage_printpl',
                    label: '导出PL单',
                    functionName: 'printPL("' + newRecord.id + '")',
                });
            }
        } catch (e) {
            log.debug('e', e);
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
