/**
 * 供应商预付款赋值银行字段
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */
define(['N/error','N/search','N/format','N/currentRecord','N/currency','N/record'],
    function(error,search,format,currentRecord,currencyRate,record) {
        function pageInit(context) {

        }
        function saveRecord(context) {

        }
        function validateField(context) {

        }
        function fieldChanged(context) {
            var rec = context.currentRecord;
            var fieldId = context.fieldId;
            log.debug('fieldId',fieldId);
            var entity = rec.getValue('entity');//收款人
            var accountIdOut;
            if(entity && fieldId == 'subsidiary'){
                var subsidiary = rec.getValue('subsidiary');//收款公司
                if(subsidiary){
                    var accountSearch = search.create({
                        type:'account',
                        filters:[['subsidiary','anyof',subsidiary]],
                        columns:['internalid']
                    });
                    var res = accountSearch.run().getRange({start:0,end:1});
                    log.debug('科目数量',res.length);
                    if(res.length > 0){
                        var accountId = res[0].getValue('internalid');
                        log.debug('accountId',accountId);
                        accountIdOut = accountId;
                        if(accountId){
                            rec.setValue({
                                fieldId:'account',
                                value:accountId,
                                ignoreFieldChange: true,
                                forceSyncSourcing: true
                            });
                        }
                    }
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
        function sublistChanged(context) {

        }
        return {
            // pageInit: pageInit,
            fieldChanged: fieldChanged,
            // postSourcing: postSourcing,
            // sublistChanged: sublistChanged,
            // lineInit: lineInit,
            // validateField: validateField,
            // validateLine: validateLine,
            // validateInsert: validateInsert,
            // validateDelete: validateDelete,
            // saveRecord: saveRecord
        };
    });