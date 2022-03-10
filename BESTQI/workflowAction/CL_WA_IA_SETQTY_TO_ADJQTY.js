/**
 * 库存调整审批已核准状态时赋值计划调整数量至实际调整数量
 * @NApiVersion 2.x
 * @NScriptType WorkflowActionScript
 */
 define(['N/record'],
 function(record) {
     function onAction(context){
         try{
            var rec = context.newRecord;
            var approval_status = rec.getValue('custbody_hl_bsq_approval_status');//审批状态
            log.debug('审批状态',approval_status);
            if(approval_status == 2){//已核准
                var count = rec.getLineCount('inventory');
                for(var i = 0;i < count;i++){
                    rec.selectLine('inventory',i);
                    var jihua_qty = rec.getCurrentSublistValue({
                        sublistId:'inventory',
                        fieldId:'custcol_hl_bsq_plan_qty',
                        // line:i,
                    });
                    var shiji_qty = rec.getCurrentSublistValue({
                        sublistId:'inventory',
                        fieldId:'adjustqtyby',
                        line:i,
                    });
                    log.debug('jihua shiji',jihua_qty + '---' + shiji_qty);
                    if(jihua_qty != shiji_qty){
                        rec.setCurrentSublistValue({
                            sublistId:'inventory',
                            fieldId:'adjustqtyby',
                            value:jihua_qty,
                            // line:i,
                        });
                        rec.commitLine('inventory');
                    }
                }
                var rec_id = rec.save();
                log.debug('保存之后的库存调准',rec_id);
            }
         }catch(e){
            log.debug('赋值实际调整数量报错',e.message);
         }
     }
     return {
         onAction: onAction
     }
 });