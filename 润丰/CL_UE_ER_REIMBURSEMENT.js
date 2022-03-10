/**
 * 费用报告
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
            if(context.type == 'edit'){
                var rec = record.load({type:'expensereport',id:context.newRecord.id,isDynamic:true});
                var exCount = rec.getLineCount('expense');
                var sumAmount = Number(0);
                for(var i = 0;i < exCount;i++){
                    rec.selectLine({sublistId:'expense',line:i});
                    var amount = rec.getCurrentSublistValue({
                        sublistId: 'expense',
                        fieldId: 'amount'
                    });
                    sumAmount += Number(amount);
                }
                log.debug('sumAmount',sumAmount);

            }
        }
        return {
            // beforeLoad: beforeLoad,
            // beforeSubmit: beforeSubmit,
            afterSubmit: afterSubmit
        };
    });
