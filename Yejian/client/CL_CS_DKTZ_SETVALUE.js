/**
 *到款通知
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */
 define(['N/error','N/search','N/format','N/currentRecord','N/currency','N/record','SuiteScripts/Common/FREIGHT_CALCULATION.js','N/runtime'],
 function(error,search,format,currentRecord,currencyRate,record,FREIGHT_CALCULATION,runtime) {
     function pageInit(context) {
        
     }
     function saveRecord(context) {
        var rec = context.currentRecord;
        // var dd_status = rec.getValue('custrecord_sl_daid');
        // var order_qk = rec.getValue('custrecord_sl_ddsm');
        // var so = rec.getValue('custrecord_sl_xsdd');//销售订单
        // if(dd_status == true && !order_qk){
        //     alert('勾选待定字段后必须填写订单情况');
        //     return false;
        // }
        // else if(dd_status == false && order_qk){
        //     alert('未勾选待定不需要填写订单情况');
        //     return false;
        // }
        return true;
     }
     function validateField(context) {

     }
     function fieldChanged(context) {
        var rec = context.currentRecord;
        var fieldId = context.fieldId;
        if(fieldId == 'custrecord_sl_xsdd'){
            var so_id = rec.getValue('custrecord_sl_xsdd');//销售订单
            if(so_id){
                var so_data = getSo(so_id);
                rec.setValue('custrecord_sl_kh',so_data.customer);//客户
                rec.setValue('custrecord_sl_wdh',so_data.innumber);//网单号
                // rec.setValue('custrecord_sl_rlr',runtime.getCurrentUser().id);//认领人
            }
        }
     }
     function getSo(so_id){
         if(so_id){
             var so_rec = record.load({
                 type:'salesorder',
                 id:so_id,
                 isDynamic:true,
             });
             return {
                 "customer":so_rec.getValue('entity'),
                 "innumber":so_rec.getValue('custbody_sl_so_innumber'),
                 "employe":so_rec.getValue('custbody_sl_spo_yyy'),
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
         saveRecord: saveRecord
     };
 });