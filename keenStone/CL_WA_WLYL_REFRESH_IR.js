/**
 * 刷新物流预录表时更新对应收据费用字段
 * @NApiVersion 2.x
 * @NScriptType WorkflowActionScript
 */
 define(['N/record', 'N/search'],
 function(record, search) {
     function onAction(context) {
         var rec = context.newRecord;
         var record_id = rec.getValue('custrecord_cs_dh_c1');//单号
         var baoguan = rec.getValue('custrecordcustrecord_cs_wlyf_bgf_c1');//报关费
         var qingguan = rec.getValue('custrecord_cs_qgf_c1');//清关费
         var guanshui = rec.getValue('custrecord_cs_gs_c1');//关税
         var yunfei = rec.getValue('custrecord_cs_yf_c1');//运费
         var ir_arr = getIr(record_id);
         for(var i = 0;i < ir_arr.length;i++){
             record.submitFields({
                 type:'itemreceipt',
                 id:ir_arr[i],
                 values:{
                    custbody_cs_bgf_hpsj:baoguan,
                    custbody_cs_qgf_hpsj:qingguan,
                    custbody_cs_gs_hpsj:guanshui,
                    custbody_cs_yf_hpsj:yunfei,
                 }
             });
         }

     }
     function getIr(record_id) {
         var ir_arr = new Array();
         if(record_id){
             var mysearch = search.create({
                 type:'itemreceipt',
                 filters:[
                     ['createdfrom','anyof',record_id],
                    //  'AND',
                 ]
             });
             var res = mysearch.run().getRange(0,10);
             if(res.length > 0){
                 for(var i = 0;i < res.length;i++){
                    ir_arr.push(res[i].id);
                 }
             }
         }
         return ir_arr;
     }
     return {
         onAction: onAction
     };
 });