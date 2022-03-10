/**
 * 物流预录单删除帐单后更新执行状态
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
            var rec = record.load({type:'customrecord_cs_yldmx_c1',id:context.newRecord.id,isDynamic:true});
            var zhixing_status = rec.getValue('custrecord_cs_zxzt_c1');
            log.debug('执行状态',zhixing_status);
            var vb = rec.getValue('custrecord_cs_wuly_zd');
            if(!vb){
                rec.setValue('custrecord_cs_zxzt_c1',1);//未开始
            }else{
                rec.setValue('custrecord_cs_zxzt_c1',2);//执行成功
            }
            rec.save();
         }catch(e){
            log.debug('错误',e);
         }
     }
     return {
         // beforeLoad: beforeLoad,
         // beforeSubmit: beforeSubmit,
         afterSubmit: afterSubmit
     };
 });
