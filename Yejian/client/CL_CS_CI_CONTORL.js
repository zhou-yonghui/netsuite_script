/**
 * @LastEditors: zhouyh
 * @LastEditTime: 2021-12-31 11:31:22
 * @Description: 模板打印单控制
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */
define(['N/error','N/search','N/format','N/currentRecord','N/currency','N/record'],
    function(error,search,format,currentRecord,currencyRate,record) {
        function pageInit(context) {

        }
        function saveRecord(context) {
            var rec = context.currentRecord;

            return true;
        }
        function validateField(context) {

        }
        function fieldChanged(context) {
            var rec = context.currentRecord;
            var fieldId = context.fieldId;
            log.debug('fieldId',fieldId);
            if(fieldId == 'custrecord_sl_qu_danjj' || fieldId == 'custrecord_sl_qu_shul' || fieldId == 'custrecord_sl_hpdj1' || fieldId == 'custrecord_sl_cpsl'){
                var pro_sum = doProSublist(fieldId,rec);
                var fy_sum = doFySublist(fieldId,rec);
                // log.debug('pro_sum fy_sum',pro_sum + '---' + fy_sum);
                //amount
                // rec.setValue('custrecord_sl_qu_amount',Number(pro_sum) + Number(fy_sum));
            }
        }
        function doProSublist(fieldId,rec){
            var pro_sum = Number(0);
            // if(fieldId == 'custrecord_sl_qu_danjj' || fieldId == 'custrecord_sl_qu_shul') {
                var product_count = rec.getLineCount('recmachcustrecord_sl_qu_sub');
                for (var i = 0; i < product_count; i++) {
                    var rate = rec.getCurrentSublistValue({
                        sublistId: 'recmachcustrecord_sl_qu_sub',
                        fieldId: 'custrecord_sl_qu_danjj',
                    });
                    var qty = rec.getCurrentSublistValue({
                        sublistId: 'recmachcustrecord_sl_qu_sub',
                        fieldId: 'custrecord_sl_qu_shul',
                    });
                    log.debug('rate qty', rate + '---' + qty);
                    if(fieldId == 'custrecord_sl_qu_danjj' || fieldId == 'custrecord_sl_qu_shul') {
                        rec.setCurrentSublistValue({
                            sublistId: 'recmachcustrecord_sl_qu_sub',
                            fieldId: 'custrecord_sl_qu_total',
                            value: Number(rate) * Number(qty),
                        });
                    }
                    pro_sum += Number(rate) * Number(qty);
                }
            // }
            return pro_sum;
        }
        function doFySublist(fieldId,rec){
            var fy_sum = Number(0);
            // if(fieldId == 'custrecord_sl_hpdj1' || fieldId == 'custrecord_sl_cpsl') {
                var fy_count = rec.getLineCount('recmachcustrecord_cl_match');
                for(var j = 0;j < fy_count;j++){
                    var fy_rate = rec.getCurrentSublistValue({
                        sublistId:'recmachcustrecord_cl_match',
                        fieldId:'custrecord_sl_hpdj1',
                    });
                    var fy_qty = rec.getCurrentSublistValue({
                        sublistId:'recmachcustrecord_cl_match',
                        fieldId:'custrecord_sl_cpsl',
                    });
                    log.debug('fy_rate fy_qty',fy_rate + '---' +fy_qty);
                    if(fieldId == 'custrecord_sl_hpdj1' || fieldId == 'custrecord_sl_cpsl') {
                        rec.setCurrentSublistValue({
                            sublistId: 'recmachcustrecord_cl_match',
                            fieldId: 'custrecord_sl_hpxj',
                            value: Number(fy_rate) * Number(fy_qty),
                        });
                    }
                    fy_sum += Number(fy_rate) * Number(fy_qty);
                }
            // }
            return fy_sum;
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
        return {
            //  pageInit: pageInit,
            fieldChanged: fieldChanged,
            // postSourcing: postSourcing,
            //  sublistChanged: sublistChanged,
            // lineInit: lineInit,
            // validateField: validateField,
            //  validateLine: validateLine,
            // validateInsert: validateInsert,
            // validateDelete: validateDelete,
            saveRecord: saveRecord
        };
    });