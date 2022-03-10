/**
 * 费用报告报销后金额回写员工预借款
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define(['N/record','N/search','N/format','N/runtime'],
    function(record,search,format,runtime) {
        function beforeLoad(context) {
        }
        function beforeSubmit(context) {
        }
        function afterSubmit(context) {
            var rec = record.load({type:'expensereport',id:context.newRecord.id,isDynamic:true});
            var exCount = rec.getLineCount('expense');
            var sumAmount = Number(0);
            for(var i = 0;i < exCount;i++){
                rec.selectLine('expense',i);
                var amount = rec.getCurrentSublistValue({
                    sublistId:'expense',
                    fieldId:'amount'
                });
               sumAmount += Number(amount);
            }
            log.debug('核销金额',sumAmount);
        }

        return {
            // beforeLoad: beforeLoad,
            // beforeSubmit: beforeSubmit,
            afterSubmit: afterSubmit
        };
    });
