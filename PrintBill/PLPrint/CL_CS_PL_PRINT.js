/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */
define(['N/url', 'N/https', '../../utils/commonTool', 'N/ui/dialog', 'N/record'], function (url, https, commonTool, dialog, record) {

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

    function printPL(bill_id) {
        var options = { title: '导出PL单', message: '是否进行导出？' };
        function success(result) {
            if (result) {
                commonTool.startMask('导出PL单中，请耐心等待');
                var link = url.resolveScript({
                    scriptId: 'customscript_cl_sl_pl_print',
                    deploymentId: 'customdeploy_cl_sl_pl_print'
                });

                var header = {
                    'Content-Type': 'application/json;charset=utf-8',
                    'Accept': 'application/json'
                }
                var body = {
                    id: bill_id
                }
                https.post.promise({
                    url: link,
                    body: body,
                    headers: header
                }).then(function (resp) {
                    var resultData = JSON.parse(resp.body);
                    if (resultData) {
                        commonTool.endMask();
                        dialog.alert({ title: '提示', message: resultData.data }).then(function () {
                            record.submitFields({
                                type: 'customrecord_bsq_pl',
                                id: bill_id,
                                values: {
                                    custrecord_sl_pl_print_fj: resultData.file_id
                                }
                            });
                            window.location.reload();
                        });
                    }
                });
            }
        }
        function failure(reason) { }
        dialog.confirm(options).then(success).catch(failure);
    }

    return {
        // pageInit: pageInit,
        // saveRecord: saveRecord,
        // validateField: validateField,
        fieldChanged: fieldChanged,
        // postSourcing: postSourcing,
        // lineInit: lineInit,
        // validateDelete: validateDelete,
        // validateInsert: validateInsert,
        // validateLine: validateLine,
        // sublistChanged: sublistChanged,
        printPL: printPL
    }
});
