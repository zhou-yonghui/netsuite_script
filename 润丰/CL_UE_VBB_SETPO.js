/**
 * 账单保存时赋值账单号到相关质检单上关联字段
 * 赋值账单赋值货品行预付款金额字段
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
 define(['N/record','N/search','N/format','N/runtime'],
 function(record,search,format,runtime) {
     function beforeLoad(context) {
         // var rec = context.newRecord;
         // var countLink = rec.getLineCount('links');
         // var countPo = rec.getLineCount('purchaseorders');
         // var countItem = rec.getLineCount('item');
         // var linksTotal = Number(0);
         // var poQtyTotal = Number(0);
         // rec.setValue('custbody_rp_field_pm_yanshoubiaozhun','测试赋值');
         // /**获取po信息*/
         // if(countPo > 0){
         //     for(var j = 0;j < countPo;j++){
         //         // rec.selectLine('purchaseorders',j);
         //         var poId = rec.getSublistValue({
         //             sublistId:'purchaseorders',
         //             fieldId:'id',
         //             line:j
         //         });
         //         log.debug('poId',poId);
         //         var poRec = record.load({
         //             type:'purchaseorder',
         //             id:poId,
         //             isDynamic:true,
         //         });
         //         var countPoItem = poRec.getLineCount('item');
         //         for(var n = 0;n < countPoItem;n++){
         //             poRec.selectLine('item',n);
         //             var poQty = poRec.getCurrentSublistValue({
         //                 sublistId:'item',
         //                 fieldId:'quantity'
         //             });
         //             poQtyTotal += Number(poQty);
         //         }
         //     }
         // }
         // log.debug('poQtyTotal',poQtyTotal);
         // /**获取账单预付款信息*/
         // if(countLink){
         //     for(var i = 0;i < countLink;i++){
         //         // rec.selectLine('links',i);
         //         var linksType = rec.getSublistValue({
         //             sublistId:'links',
         //             fieldId:'type',
         //             line:i
         //         });
         //         log.debug('linksType',linksType);
         //         if(linksType == '总计'){
         //             linksTotal = rec.getSublistValue({
         //                 sublistId:'links',
         //                 fieldId:'total',
         //                 line:i
         //             });
         //         }
         //     }
         //     log.debug('linksTotal',linksTotal);
         //     /**当前账单货品行信息*/
         //     if(countItem){
         //         for(var m = 0;m < countItem;m++){
         //             // rec.selectLine('item',m);
         //             var qty = rec.getSublistValue({
         //                 sublistId:'item',
         //                 fieldId:'quantity',
         //                 line:m
         //             });
         //             var amount = rec.getSublistValue({
         //                 sublistId:'item',
         //                 fieldId:'quantity',
         //                 line:m,
         //             });
         //             log.debug('yufu',linksTotal * (qty / poQtyTotal));
         //             rec.setSublistValue({
         //                 sublistId:'item',
         //                 fieldId:'custcol_hl_yufukuanjine',             //预付款
         //                 value:linksTotal * (qty / poQtyTotal),
         //                 line:m
         //             });
         //             rec.setSublistValue({
         //                 sublistId:'item',
         //                 fieldId:'custcol_hl_qingkuanjine',            //请款金额
         //                 value: amount - linksTotal * (qty / poQtyTotal),
         //                 line:m
         //             });
         //         }
         //     }
         // }
     }
     function beforeSubmit(context) {

     }
     function afterSubmit(context) {
         try{
             var rec = record.load({
                 type:'vendorbill',
                 id:context.newRecord.id,
                 isDynamic:true,
             });
             if(context.type == 'create'){
                 var count = rec.getLineCount('purchaseorders');
                 var poIdArr = [];
                 if(count > 0){
                     for(var i = 0;i < count;i++){
                         rec.selectLine('purchaseorders',i);
                         var poId = rec.getCurrentSublistValue({
                             sublistId:'purchaseorders',
                             fieldId:'id'
                         });
                         poIdArr.push(poId);
                     }
                     log.debug('poIdArr',poIdArr);
                     var idArr = getPcResulte(poIdArr[0],context.newRecord.id);
                     log.debug('质检单id集合',idArr);
                 }
             }
             /**对预付款字段赋值*/
             if(context.type == 'edit' || context.type == 'create'){
                 var countLink = rec.getLineCount('links');
                 var countPo = rec.getLineCount('purchaseorders');
                 var countItem = rec.getLineCount('item');
                 var linksTotal = Number(0);
                 var poQtyTotal = Number(0);
                 var poLinksTotalAll = Number(0);
                 /**获取po信息*/
                 if(countPo > 0){
                     for(var j = 0;j < countPo;j++){
                         rec.selectLine('purchaseorders',j);
                         var poId = rec.getCurrentSublistValue({
                             sublistId:'purchaseorders',
                             fieldId:'id',
                         });
                         log.debug('poId',poId);
                         var poRec = record.load({
                             type:'purchaseorder',
                             id:poId,
                             isDynamic:true,
                         });
                         var countPoItem = poRec.getLineCount('item');
                         var countPoLinks = poRec.getLineCount('links');
                         for(var n = 0;n < countPoItem;n++){
                             poRec.selectLine('item',n);
                             var poAmount = poRec.getCurrentSublistValue({
                                 sublistId:'item',
                                 fieldId:'amount',
                             });
                             if(poAmount > 0) {
                                 var poQty = poRec.getCurrentSublistValue({
                                     sublistId:'item',
                                     fieldId:'quantity'
                                 });
                                 poQtyTotal += Number(poQty);
                             }
                         }
                         for(var s = 0;s < countPoLinks;s++){
                             poRec.selectLine('links',s);
                             var poLinsType = poRec.getCurrentSublistValue({
                                 sublistId:'links',
                                 fieldId:'type',
                             });
                             if(poLinsType == '供应商预付款'){
                                //  var poLinksTotal = poRec.getCurrentSublistValue({
                                //      sublistId:'links',
                                //      fieldId:'total'
                                //  });
                                //  poLinksTotalAll += Number(poLinksTotal);
                                var yufu_id = poRec.getCurrentSublistValue({
                                    sublistId:'links',
                                    fieldId:'id'
                                });
                                log.debug('yufu_id',yufu_id);
                                var yufu_rec = record.load({type:'vendorprepayment',id:yufu_id,isDynamic:true});
                                poLinksTotalAll += Number(yufu_rec.getValue('payment'));
                             }
                         }
                     }
                 }
                 log.debug('poLinksTotalAll',poLinksTotalAll);
                 log.debug('poQtyTotal',poQtyTotal);
                 /**获取账单预付款信息*/
                 var totalSum = Number(0);
                 if(countLink){
                     log.debug('带预付款信息');
                     for(var i = 0;i < countLink;i++){
                         rec.selectLine('links',i);
                         var linksType = rec.getCurrentSublistValue({
                             sublistId:'links',
                             fieldId:'type',
                         });
                         log.debug('linksType',linksType);
                         if(linksType == '供应商预付款申请'){
                             linksTotal = rec.getCurrentSublistValue({
                                 sublistId:'links',
                                 fieldId:'total',
                             });
                             totalSum += linksTotal;
                            // var yufu_id = rec.getCurrentSublistValue({
                            //     sublistId:'links',
                            //     fieldId:'id'
                            // });
                            // var yufu_rec = record.load('vendorprepayment',yufu_id,true);
                            // totalSum += Number(yufu_rec.getValue('payment'));
                         }
                     }
                     log.debug('totalSum',totalSum);
                     /**当前账单货品行信息*/
                     if(countItem == -1){
                         for(var m = 0;m < countItem;m++){
                             rec.selectLine('item',m);
                             var qty = rec.getCurrentSublistValue({
                                 sublistId:'item',
                                 fieldId:'quantity',
                             });
                             var amount = rec.getCurrentSublistValue({
                                 sublistId:'item',
                                 fieldId:'amount',
                             });
                             log.debug('amount',amount);
                             var yufu = totalSum * (qty / poQtyTotal);
                             log.debug('yufu',yufu);
                             if(yufu > 0 && amount > 0){
                                 rec.setCurrentSublistValue({
                                     sublistId:'item',
                                     fieldId:'custcol_hl_yufukuanjine',             //预付款
                                     value:yufu.toFixed(2),
                                 });
                                 rec.setCurrentSublistValue({
                                     sublistId:'item',
                                     fieldId:'custcol_hl_qingkuanjine',            //请款金额
                                     value: (amount - yufu).toFixed(2),
                                 });
                             }
                             else {
                                 rec.setCurrentSublistValue({
                                     sublistId:'item',
                                     fieldId:'custcol_hl_yufukuanjine',             //预付款
                                     value:'0.00',
                                 });
                                 rec.setCurrentSublistValue({
                                     sublistId:'item',
                                     fieldId:'custcol_hl_qingkuanjine',            //请款金额
                                     value: '0.00',
                                 });
                             }
                             rec.commitLine('item');
                         }
                         rec.save({ ignoreMandatoryFields: true });
                     }
                 }
                 else {
                     log.debug('不带预付款信息');
                     if(countItem && poLinksTotalAll <= 0){
                         for(var m = 0;m < countItem;m++){
                             rec.selectLine('item',m);
                             var amount2 = rec.getCurrentSublistValue({
                                 sublistId:'item',
                                 fieldId:'amount',
                             });
                             rec.setCurrentSublistValue({
                                 sublistId:'item',
                                 fieldId:'custcol_hl_yufukuanjine',             //预付款
                                 value:'0.00',
                             });
                             rec.setCurrentSublistValue({
                                 sublistId:'item',
                                 fieldId:'custcol_hl_qingkuanjine',            //请款金额
                                 value: amount2,
                             });
                             rec.commitLine('item');
                         }
                         rec.save({ ignoreMandatoryFields: true });
                     }
                     else if(countItem && poLinksTotalAll > 0){
                         var zenQty = Number(0);
                         log.debug('zenQty',zenQty);
                         for(var m = 0;m < countItem;m++){
                             rec.selectLine('item',m);
                             var qty = rec.getCurrentSublistValue({
                                 sublistId:'item',
                                 fieldId:'quantity',
                             });
                             var amount = rec.getCurrentSublistValue({
                                 sublistId:'item',
                                 fieldId:'amount',
                             });
                             log.debug('amount',amount);
                             if(amount <= 0){
                                 zenQty += Number(qty);
                             }
                             // var yufu = poLinksTotalAll * ((qty + zenQty) / poQtyTotal);
                             var yufu = poLinksTotalAll * (qty / poQtyTotal);
                             log.debug('yufu',yufu);
                             if(yufu > 0 && amount > 0){
                                 rec.setCurrentSublistValue({
                                     sublistId:'item',
                                     fieldId:'custcol_hl_yufukuanjine',             //预付款
                                     value:yufu.toFixed(2),
                                 });
                                 rec.setCurrentSublistValue({
                                     sublistId:'item',
                                     fieldId:'custcol_hl_qingkuanjine',            //请款金额
                                     value: (amount - yufu).toFixed(2),
                                 });
                             }
                             else {
                                 rec.setCurrentSublistValue({
                                     sublistId:'item',
                                     fieldId:'custcol_hl_yufukuanjine',             //预付款
                                     value:'0.00',
                                 });
                                 rec.setCurrentSublistValue({
                                     sublistId:'item',
                                     fieldId:'custcol_hl_qingkuanjine',            //请款金额
                                     value: '0.00',
                                 });
                             }
                             rec.commitLine('item');
                         }
                         rec.save({ ignoreMandatoryFields: true });
                     }
                 }
             }
         }
         catch (e){
             log.debug('账单脚本操作错误',e);
         }
     }
     function getPcResulte(poId,vbId){
         var idArr = [];
         if(poId){
             var pcSearch = search.create({
                 type:'customrecord_po_qc_result',
                 filters:[['custrecord_po_qc_po','anyof',poId],'and',['custrecord_po_qc_rel','is','质检通过']],
             });
             var res = pcSearch.run().getRange({start:0,end:100});
             log.debug('关联质检单数量',res.length);
             if(res.length > 0){
                 for(var i = 0;i < res.length;i++){
                     /**质检单赋值账单字段*/
                     var rec = record.load({
                         type:'customrecord_po_qc_result',
                         id:res[i].id,
                         isDynamic:true
                     });
                     rec.setValue('custrecord_bill',vbId);
                     var vbbId = rec.save();
                     idArr.push(vbbId);
                 }
             }
         }
         return idArr;
     }
     return {
         // beforeLoad: beforeLoad,
         // beforeSubmit: beforeSubmit,
         afterSubmit: afterSubmit
     };
 });
