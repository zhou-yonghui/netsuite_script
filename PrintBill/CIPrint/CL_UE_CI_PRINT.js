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
                form.clientScriptModulePath = './CL_CS_CI_PRINT.js';
                form.addButton({
                    id: 'custpage_printci',
                    label: '导出CI单',
                    functionName: 'printCI("' + newRecord.id + '")',
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
