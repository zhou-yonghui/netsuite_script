/**
 * 账单点击已开增值税发票按钮生成日记账
 * @NApiVersion 2.x
 * @NScriptType WorkflowActionScript
 */
define(['N/record', 'N/search'],
    function(record, search) {
        function onAction(context) {
            log.debug({
                title: 'context',
                details: JSON.stringify(context)
            });
            var rec = context.newRecord;
            var isVatInvoice = rec.getValue('custbody_vatinvoice');//是否开具增值税发票
            if(isVatInvoice == true){

            }
        }
        return {
            onAction: onAction
        };
    });