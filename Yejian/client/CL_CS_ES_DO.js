/**
 *报价单字段控制
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
        if(fieldId == 'custrecord_sl_xsdd'){
            
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
         saveRecord: saveRecord
     };
 });