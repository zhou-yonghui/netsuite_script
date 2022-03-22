/*
 * @Author: zhouyh
 * @Date: 2022-03-10 17:26:22
 * @LastEditors: zhouyh
 * @LastEditTime: 2022-03-22 14:44:41
 * @Description: 请填写简介
 */
/**
 * 到款通知取消到款、审批拒绝
 * @NApiVersion 2.x
 * @NScriptType WorkflowActionScript
 */
 define(['N/record'],
 function(record) {
     function onAction(context){
         var rec = context.newRecord;
         var approval_status = rec.getValue('custrecord_sl_dkzt');//状态
         log.debug('状态',approval_status);
         //2待认领  4 已认领  5 已取消 6 已审核?
         if(approval_status == 5){
             var customer_des = rec.getValue('custrecord_customer_deposit_slip');//客户存款
             var gh = rec.getValue('custrecord_purchase_settlement');//购汇单
             if(customer_des || gh){
                 throw "取消到款之前请先删除到款通知单的购汇单和客户存款";
             }else {
                 try{
                     var soId = rec.getValue('custrecord_sl_xsdd');
                     var dkJusd = rec.getValue('custrecord_sl_dkmj');//
                     var soRec = record.load({
                         type:'salesorder',
                         id:soId,
                         isDynamic:true,
                     });
                     var hkAmount = soRec.getValue('custbody_sl_soamm');//回款金额
                     if(hkAmount){
                         soRec.setValue('custbody_sl_soamm',(Number(hkAmount) - Number(dkJusd)).toFixed(2));
                     }
                     else {
                         soRec.setValue('custbody_sl_soamm',-Number(dkJusd).toFixed(2));
                     }
                     //取消到款通知关联
                     var dk_arr = soRec.getValue('custbody_source_arrival_notice');
                     for(var d = 0;d < dk_arr.length;d++){
                         if(rec.id == dk_arr[d]){
                             dk_arr.splice(d,1);
                         }
                     }
                     log.debug('dk_arr',dk_arr);
                     //提交信息至销售订单
                    //  record.submitFields({
                    //      type: 'salesorder',
                    //      id: soId,
                    //      values: {
                    //         custbody_source_arrival_notice : dk_arr,
                    //         custbody_oiin_so_claimed : false,
                    //      }
                         
                    //  });
                     soRec.setValue('custbody_source_arrival_notice',dk_arr);
                     soRec.setValue('custbody_oiin_so_claimed',false);//到款已认领
                     var soSave = soRec.save();
                     log.debug('销售订单',soSave);
                     //取消已认领
                     if(soSave){
                         rec.setValue('custrecord_sl_yrl',false);//已认领
                         rec.setValue('custrecord_sl_daid',false);//待定
                         //rec.save();//工作流脚本不需要save()
                     }
                 }catch(e){
                     log.debug('错误',e.message);
                 }
             }
         }
     }
     return {
         onAction: onAction
     }
 });