/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */
define(['N/url', 'N/ui/dialog'], function (url, dialog) {

    function pageInit(context) {

    }

    function saveRecord(context) {

    }

    function validateField(context) {

    }

    function fieldChanged(context) {

    }

    function postSourcing(context) {

    }

    function lineInit(context) {

    }

    function validateDelete(context) {

    }

    function validateInsert(context) {

    }

    function validateLine(context) {

    }

    function sublistChanged(context) {

    }

    function printBills(bill_id) {
        var options = {
            title: '打印采购合同',
            message: '是否打印采购合同？'
        };

        function success(result) {
            if (result) {
                var output = url.resolveScript({
                    scriptId: 'customscript_cl_sl_po_print',
                    deploymentId: 'customdeploy_cl_sl_po_print'
                });
                window.open(output + '&bill_id=' + bill_id + '&bill_type=1');
            }
        }

        function failure(reason) { }
        dialog.confirm(options).then(success).catch(failure);
    }

    function printOrdBills(bill_id) {
        var options = {
            title: '打印订货合同',
            message: '是否打印订货合同？'
        };

        function success(result) {
            if (result) {
                var output = url.resolveScript({
                    scriptId: 'customscript_cl_sl_po_print',
                    deploymentId: 'customdeploy_cl_sl_po_print'
                });
                window.open(output + '&bill_id=' + bill_id + '&bill_type=2');
            }
        }

        function failure(reason) { }
        dialog.confirm(options).then(success).catch(failure);
    }

    return {
        pageInit: pageInit,
        // saveRecord: saveRecord,
        // validateField: validateField,
        // fieldChanged: fieldChanged,
        // postSourcing: postSourcing,
        // lineInit: lineInit,
        // validateDelete: validateDelete,
        // validateInsert: validateInsert,
        // validateLine: validateLine,
        // sublistChanged: sublistChanged,
        printBills: printBills,
        printOrdBills: printOrdBills
    }
});
