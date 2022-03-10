/**
 * @Author: zhouyh
 * @Date: 2021-12-31 10:07:28
 * @LastEditors: zhouyh
 * @LastEditTime: 2021-12-31 10:07:28
 * @Description: 新增价目表明细，将明细sku关联到供应商的供应商对应SKU字段
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 */
 define(['N/record','N/search','N/format','N/runtime'],
 function(record,search,format,runtime) {
     function beforeLoad(context) {
        
     }
     function beforeSubmit(context) {
         
     }
     function afterSubmit(context) {
         try{
            var old_rec = context.oldRecord;
            var old_sku = old_rec.getValue('custrecord_hl_bsq_sku'); 
            var rec = context.newRecord;
            var sku = rec.getValue('custrecord_hl_bsq_sku');
            log.debug('old new sku',old_sku + '--' + sku);
            var vendor_list_id = rec.getValue('custrecord_hl_price_list_details');
            if(vendor_list_id){
                var pl_rec = record.load({type:'customrecord_price_list',id:vendor_list_id,isDynamic:true});
                var vendor = pl_rec.getValue('custrecord_hl_supplier');//
                log.debug('vendor',vendor);
                if(vendor){
                    //向供应商提交sku
                    var v_rec = record.load({
                        type:'vendor',
                        id:vendor,
                        isDynamic:true,
                    });
                    var old_sku_arr = v_rec.getValue('custentity_sl_vendor_sku');//
                    log.debug('old_sku_arr',old_sku_arr);
                    if(context.type == 'create'){
                        old_sku_arr.push(sku);
                        v_rec.setValue('custentity_sl_vendor_sku',old_sku_arr);
                        v_rec.save();
                        log.debug('更新sku完成');
                    }
                    else if(context.type == 'delete'){
                        if(old_sku_arr.length > 0){
                            old_sku_arr = arrayDelete(old_sku_arr,sku);
                            log.debug('old_sku_arr out',old_sku_arr);
                            // old_sku_arr.push(sku);
                            v_rec.setValue('custentity_sl_vendor_sku',old_sku_arr);
                            v_rec.save();
                            log.debug('更新sku完成');
                        }
                    }
                    else if(context.type == 'edit' && sku != old_sku){
                        if(old_sku_arr.length > 0){
                            old_sku_arr = arrayDelete(old_sku_arr,old_sku);
                            log.debug('old_sku_arr out',old_sku_arr);
                            old_sku_arr.push(sku);
                            v_rec.setValue('custentity_sl_vendor_sku',old_sku_arr);
                            v_rec.save();
                            log.debug('更新sku完成');
                        }
                        else{
                            old_sku_arr.push(sku);
                            v_rec.setValue('custentity_sl_vendor_sku',old_sku_arr);
                            v_rec.save();
                            log.debug('更新sku完成');
                        }
                    }
                }
            }
         }catch(e){
             log.debug('错误',e);
         }
     }
     function arrayDelete(array_orgin,sku) {
        log.debug('array_orgin.length sku',array_orgin.length + '---' + sku);
        var out_arr = new Array();
        if(array_orgin.length > 0){
            for(var i = 0;i < array_orgin.length;i++){
                // log.debug('array_orgin[i]',array_orgin[i]);
                if(array_orgin[i] != sku){
                    log.debug('array_orgin[i]',array_orgin[i]);
                    out_arr.push(array_orgin[i]);
                }
            }
        }
        else{
            out_arr = array_orgin;
        }
        return out_arr;
     }
     return {
        //  beforeLoad: beforeLoad,
        //  beforeSubmit: beforeSubmit,
         afterSubmit: afterSubmit
     };
 });

