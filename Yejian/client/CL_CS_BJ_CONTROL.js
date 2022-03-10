/**
 * @LastEditors: zhouyh
 * @LastEditTime: 2022-01-17 18:29:21
 * @Description: 报价打印单
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */
define(['N/error','N/search','N/format','N/currentRecord','N/currency','N/record','SuiteScripts/Common/FREIGHT_CALCULATION.js'],
    function(error,search,format,currentRecord,currencyRate,record,FREIGHT_CALCULATION) {
        function pageInit(context) {

        }
        function saveRecord(context) {
            var rec = context.currentRecord;

        }
        function validateField(context) {

        }
        function fieldChanged(context) {
            var rec = context.currentRecord;
            var fieldId = context.fieldId;
            if(fieldId == 'custrecord_sl_hpdj1' || fieldId == 'custrecord_sl_cpsl'){
                setSub(rec);
            }
        }
        function setSub(rec){
            var count = rec.getLineCount('recmachcustrecord17');
            for(var i = 0;i < count;i++){
                var rate = rec.getCurrentSublistValue({
                    sublistId:'recmachcustrecord17',
                    fieldId:'custrecord_sl_hpdj1',
                });
                var qty = rec.getCurrentSublistValue({
                    sublistId:'recmachcustrecord17',
                    fieldId:'custrecord_sl_cpsl',
                });
                if(rate && qty){
                    rec.setCurrentSublistValue({
                        sublistId:'recmachcustrecord17',
                        fieldId:'custrecord_sl_hpxj',
                        value: Number(rate) * Number(qty),
                    });
                }
            }
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
            // saveRecord: saveRecord
        };
    });