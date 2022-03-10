/**
 *收货之后自动生成账单
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
 define(['N/record','N/search','N/https'],
 function(record,search,https) {
     function beforeLoad(context) {

     }
     function beforeSubmit(context) {
         
     }
     function afterSubmit(context) {
         try{
            var ir_detail_arr = new Array(); 
            if(context.type == 'create' || context.type == 'edit'){
                var rec = record.load({
                    type:'itemreceipt',
                    id:context.newRecord.id,
                    isDynamic:true,
                });
                var approval_status = rec.getValue('custbody_cs_spzt1_body');//审批状态
                var vb_ir = rec.getValue('custbody_cs_vendorbill');//关联账单
                log.debug('vb_ir approval_status',vb_ir + '---' + approval_status);
                if(approval_status == 3 && !vb_ir){     //审批通过
                    var createdfrom = rec.getValue('createdfrom');//创建自po
                    //获取收据明细信息
                    var ir_count = rec.getLineCount('item');
                    for(var i = 0;i < ir_count;i++){
                        rec.selectLine('item',i);
                        var item = rec.getCurrentSublistValue({
                            sublistId:'item',
                            fieldId:'item',
                        });
                        var qty = rec.getCurrentSublistValue({
                            sublistId:'item',
                            fieldId:'quantity',
                        });
                        ir_detail_arr.push({
                            "item":item,
                            "qty":qty,
                        })
                    }
                    log.debug('ir_detail_arr',ir_detail_arr);
                    //创建账单
                    var vb_rec = record.transform({
                        fromType: 'purchaseorder',
                        fromId: createdfrom,
                        toType: 'vendorbill',
                        isDynamic: true,
                    });
                    var vb_count = vb_rec.getLineCount('item');
                    for(var j = 0;j < vb_count;j++){
                        vb_rec.selectLine('item',i);
                        var item_vb = vb_rec.getCurrentSublistValue({
                            sublistId:'item',
                            fieldId:'item',
                        });
                        for(var m = 0;m < ir_detail_arr.length;m++){
                            if(item_vb == ir_detail_arr[m].item){
                                vb_rec.setCurrentSublistValue({
                                    sublistId:'item',
                                    fieldId:'quantity',
                                    value:ir_detail_arr[m].qty,
                                });
                                vb_rec.commitLine('item');
                            }
                        }
                    }
                    var vb_id = vb_rec.save();
                    log.debug('账单id',vb_id);
                    if(vb_id){
                        //收据回写账单
                        rec.setValue('custbody_cs_vendorbill',vb_id);
                        rec.save();
                    }
                }
            }
         }catch(e){
             log.debug('生成账单错误',e);
         }
     }
     return {
         // beforeLoad: beforeLoad,
        //  beforeSubmit: beforeSubmit,
         afterSubmit: afterSubmit
     };
 });
