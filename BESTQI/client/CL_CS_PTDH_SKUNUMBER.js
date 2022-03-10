/**
 * 2021/11/1,平台调货单控制调入调出数量
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */
 define(['N/error','N/search','N/format','N/currentRecord','N/currency','N/record'],
 function(error,search,format,currentRecord,currencyRate,record) {
     function pageInit(context) {
        
     }
     function saveRecord(context) {
        var rec = context.currentRecord;
        var order_do = rec.getValue('custrecord_hl_document_generation');
        if(order_do == false){
            var count = rec.getLineCount("recmachcustrecord_hl_association_header_record");
            log.debug('明细行数量',count);
            if(count > 0){
                for(var i = 0;i < count;i++){
                    var out_qty = rec.getSublistValue({
                        sublistId:'recmachcustrecord_hl_association_header_record',
                        fieldId:'custrecord_hl_transfer_out_quantity',
                        line:i,
                    });
                    var in_qty = rec.getSublistValue({
                        sublistId:'recmachcustrecord_hl_association_header_record',
                        fieldId:'custrecord_hl_transfer_in_quantity',
                        line:i,
                    });
                    if(!out_qty || !in_qty){
                        alert("请检查调入调出数量是否填写")
                    }
                    else if(out_qty != in_qty){
                        alert('调入调出数量不一致，请修改！！');
                        return false;
                        break;
                    }
                }
            }
            else{
                alert("请填写明细行！！");
                return false;
            }
        }
        else{
            alert('内部单据生成中，请等待！！');
            return false;
        }
        return true;
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
     return {
         // pageInit: pageInit,
         // fieldChanged: fieldChanged,
         // postSourcing: postSourcing,
         // sublistChanged: sublistChanged,
         // lineInit: lineInit,
         // validateField: validateField,
         // validateLine: validateLine,
         // validateInsert: validateInsert,
         // validateDelete: validateDelete,
         saveRecord: saveRecord
     };
 });