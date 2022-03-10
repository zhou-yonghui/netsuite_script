/**
 * 创建案例自动关联至客户
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
                var rec = context.newRecord;
                var email = rec.getValue('email');//邮箱
                var customer_id = getEmailCustomer(email);
                if(customer_id){
                    var out_arr = new Array();
                    out_arr.push(rec.id);
                    log.debug('out_arr',out_arr);
                    //标记邮件
                    record.submitFields({
                        type:'supportcase',
                        id:rec.id,
                        values:{
                            custevent_sl_is_customer:true,
                        }
                    });
                    //赋值客户
                    var customer_rec = record.load({
                        type:'customer',
                        id:customer_id,
                        isDynamic:true
                    });
                    var match_case = customer_rec.getValue('custentity_sl_match_email');
                    if(match_case.length > 0){
                        out_arr = arrayAdd(match_case,out_arr);
                        log.debug('out_arr',out_arr);
                        customer_rec.setValue('custentity_sl_match_email',out_arr);
                    }
                    else{
                        customer_rec.setValue('custentity_sl_match_email',rec.id); 
                    }
                    customer_rec.save();
                    log.debug('保存成功','succusse');
                }
            }
         }catch(e){
             log.debug('关联客户出错',e);
         }
     }
     function arrayAdd(array_orgin,array_out) {//TODO:数组添加元素
        if(array_orgin.length > 0){
            for(var i = 0;i < array_orgin.length;i++){
                array_out.push(array_orgin[i]);
            }
            return array_out;
        }
    }
     function getEmailCustomer(email){
         if(email){
             var mysearch = search.create({
                 type:'customer',
                 filters:[
                     ['email','is',email]
                 ],
                 columns:[
                    'entityid',
                 ]
             });
             var res = mysearch.run().getRange(0,10);
             log.debug('客户合集',JSON.stringify(res));
             if(res.length == 1){
                 return res[0].id;
             }
         }
     }
     return {
        //  beforeLoad: beforeLoad,
        //  beforeSubmit: beforeSubmit,
         afterSubmit: afterSubmit
     };
 });
