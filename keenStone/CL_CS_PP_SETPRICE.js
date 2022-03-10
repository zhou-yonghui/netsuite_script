/**
 *采购价目表赋值未含税单价
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
            log.debug('当前编辑的字段',fieldId);
            if(fieldId == 'custrecord_cs_hsj_c1'){
                var hsdj = rec.getValue('custrecord_cs_hsj_c1');//含税单价
                var tax = rec.getText('custrecord_cs_sl_c1');//税率
                var taxNumber;
                if(hsdj > 0){
                    if(tax == 'VAT_13%'){
                        taxNumber = Number(0.13);
                    }
                    else{
                        taxNumber = Number(0);
                    }
                    log.debug('taxNumber',taxNumber);
                    rec.setValue({
                        fieldId:'custrecord_hrkpo_pricelist_price',
                        value:(hsdj / (1 + taxNumber)).toFixed(2),
                        ignoreFieldChange:true,
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
        function sublistChanged(context) {

        }
        return {
            // pageInit: pageInit,
            fieldChanged: fieldChanged,
            //postSourcing: postSourcing,
            // sublistChanged: sublistChanged,
            // lineInit: lineInit,
            // validateField: validateField,
            // validateLine: validateLine,
            // validateInsert: validateInsert,
            // validateDelete: validateDelete,
            // saveRecord: saveRecord
        };
    });