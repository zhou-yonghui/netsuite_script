/**
 * 创建地点更新至客户
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
         if(context.type == 'create' || context.type == 'edit'){
            var rec = context.newRecord;
            var store_customer = rec.getValue('custrecord_store_list');//店铺，店铺是客户
            log.debug('store_customer',store_customer + '---' + store_customer.length);
            if(store_customer.length > 0){
                for(var i = 0;i < store_customer.length;i++){
                    var customer_rec = record.load({
                        type:'customer',
                        id:store_customer[i],
                        isDynamic:true,
                    });
                    if(!customer_rec.getValue('custentity_store_warehouse') || customer_rec.getValue('custentity_store_warehouse') != rec.id){
                        customer_rec.setValue('custentity_store_warehouse',rec.id);
                        customer_rec.save();
                    }
                }
            }
         }
     }
     return {
        //  beforeLoad: beforeLoad,
        //  beforeSubmit: beforeSubmit,
         afterSubmit: afterSubmit
     };
 });
