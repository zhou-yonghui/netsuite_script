/**
 *到款认领
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */
 define(['N/error','N/search','N/format','N/currentRecord','N/currency','N/record','SuiteScripts/Common/FREIGHT_CALCULATION.js'],
 function(error,search,format,currentRecord,currencyRate,record,FREIGHT_CALCULATION) {
     function pageInit(context) {
        
     }
     function saveRecord(context) {
        var rec = context.currentRecord;
        var so_id = rec.getValue('custrecord_sl_xsddh');
        var xyyz = rec.getValue('custrecord_sl_khdxyztg');//信用验证
        var xy_memo = rec.getValue('custrecord_sl_khyzdxbz');//信用备注
        var dd_status = rec.getValue('custrecord_sl_dd');//待定
        var order_info = rec.getValue('custrecord_sl_order_info');//订单情况
        if(!so_id && !dd_status){
            alert('请选销售订单或者勾选待定按钮');
            return false;
        }
        else if(so_id && dd_status){
            alert('选择勾选待定之后不能选择销售订单');
            return false;
        }
        else if(dd_status == true && !order_info){
            alert('勾选待定之后必须填写订单情况');
            return false;
        }
        else if(so_id){
            var so_data = getSo(so_id);
            log.debug('so_data save',so_data);
            if(so_data.fkfs == false && xyyz == true && xy_memo){
                return true;
            }
            else if(so_data.fkfs == true){
                return true
            }
            else {
                alert('请检查客户信用验证是否通过，是否填写备注或者付款方式是否是卖家保护');
                return false;
            }
        }
        else{
            return true;
        }
     }
     function validateField(context) {

     }
     function fieldChanged(context) {
        var rec = context.currentRecord;
        var fieldId = context.fieldId;
        var so_id = rec.getValue('custrecord_sl_xsddh');
        var dd = rec.getValue('custrecord_sl_dd');
        if(fieldId == 'custrecord_sl_xsddh'){
            if(so_id && dd){
                alert('选择勾选待定之后不能选择销售订单');
            }
            else{
                var so_data = getSo(so_id);
                log.debug('so_data change',so_data);
                //赋值网单号
                rec.setValue('custrecord_sl_wdhm',so_data.wdh ? so_data.wdh : '');//TODO：赋值特别写法
            }
        }
        if(fieldId == 'custrecord_sl_dd'){
            if(so_id && dd){
                alert('选择勾选待定之后不能选择销售订单');
            }
        }
     }
     function getSo(so_id){
        if(so_id){
            var so_col = search.lookupFields({
                type:'salesorder',
                id:so_id,
                columns:['custbody_sl_so_innumber','custbody_sl_sopayway']
            });
            log.debug('so_col',so_col);
            var tzrl_col = search.lookupFields({
                type:'customrecord_sl_glfkfs',
                id:so_col.custbody_sl_sopayway[0].value,
                columns:['custrecord_sl_sfmjbh']
            });
            return {
                "wdh":so_col.custbody_sl_so_innumber,
                "fkfs":tzrl_col.custrecord_sl_sfmjbh
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