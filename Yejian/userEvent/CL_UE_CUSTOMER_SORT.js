/**
 * 创建客户时自动创建客户排名统计表
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
         try{
            if(context.type == 'create'){
                var sort_rec = record.create({
                    type:'customrecord_sl_customer_all',
                    isDynamic:true,
                });
                sort_rec.setValue('custrecord_sl_customer',context.newRecord.id);
                sort_rec.setValue('custrecord_sl_customer_num',getCustomerCode());
                sort_rec.setText('custrecord_sl_currency','USD');

                sort_rec.save();
                log.debug('创建客户排名统计表成功');
            }
         }
         catch(e){
             log.debug('创建客户排名统计表报错',e);
         }
     }
     function getCustomerCode(){
         var code = Number(0);
         var mysearch = search.load('customsearch_cl_comters_code');//客户编号
         var res = mysearch.run().getRange(0,1000);
         if(res.length < 10){
            code = '00000' + res.length;
         }
         else if(res.length < 100){
            code = '0000' + res.length;
         }
         else if(res.length < 1000){
            code = '000' + res.length;
         }
         else if(res.length < 10000){
            code = '00' + res.length;
         }
         else if(res.length < 100000){
            code = '0' + res.length;
         }
         else if(res.length < 1000000){
            code = res.length;
         }
         return code;
     }
     return {
        //  beforeLoad: beforeLoad,
        //  beforeSubmit: beforeSubmit,
         afterSubmit: afterSubmit
     };
 });
