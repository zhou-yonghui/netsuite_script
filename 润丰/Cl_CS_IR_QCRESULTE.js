/**
 * 采购创建货品收据验证是否质检和收货数量
 * 内部交易不验证
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */
 define(['N/error','N/search','N/format','N/currentRecord','N/currency','N/record'],
 function(error,search,format,currentRecord,currencyRate,record) {
     function pageInit(context) {

     }
     function saveRecord(context) {
         var rec = context.currentRecord;
         var vendor = rec.getValue('entity');
         var createdfrom = rec.getValue('createdfrom');
         log.debug('创建自文本',rec.getText('createdfrom')); 
         var createdformText = rec.getText('createdfrom');
         if(createdformText.indexOf("TO") == -1 && createdformText.indexOf("RA") == -1){
             var sumQty = getPcResulte(createdfrom);
             log.debug('sumQty',sumQty);
             var flag = vendorBiao(vendor);
             log.debug('flag',flag);
             //log.debug('vendorvalue',vendor);
             var ir_sum_qty = Number(0);
             if(flag == 'waibu'){
                 //获取相关记录，判断是否已经生成的货品收据
                 var link_count = rec.getLineCount('links');
                 for(var k = 0;k < link_count;k++){
                     rec.selectLine('links',k);
                     var links_type = rec.getCurrentSublistValue({
                         sublistId:'links',
                         fieldId:'type'
                     });
                     if(links_type == '货品收据'){
                         var links_ir_id = rec.getCurrentSublistValue({
                             sublistId:'links',
                             fieldId:'id'
                         });
                         log.debug('links_ir_id',links_ir_id);
                         var ir_rec = record.load({type:'itemreceipt',id:links_ir_id,isDynamic:true});
                         var ir_count = ir_rec.getLineCount('item');
                         for(var l = 0;l < ir_count;l++){
                             ir_rec.selectLine('item',l);
                             var ir_qty = ir_rec.getCurrentSublistValue({
                                 sublistId:'item',
                                 fieldId:'quantity',
                             });
                             ir_sum_qty += Number(ir_qty);
                         }
                     }
                 }
                 log.debug('ir_sum_qty',ir_sum_qty);
                 //判断质检单数量和收货数量
                 var count = rec.getLineCount('item');
                 log.debug('货品收据货品行数',count);
                 var irQty = Number(0);
                 for(var j = 0;j < count;j++){
                     rec.selectLine('item',j);
                     var qty = rec.getCurrentSublistValue({
                         sublistId:'item',
                         fieldId:'quantity'
                     });
                     irQty += Number(qty);
                 }
                 log.debug('irQty',irQty);
                 // sumQty = 1000;
                 if(irQty > sumQty - ir_sum_qty){
                     alert('采购订单没有质检单或者收货数量大于质检数量，请检查！！');
                     return false;
                 }
             }
         }
         return true;
     }
     // function getPo(poId){
     //     var rec = rec.load({
     //         type:'purchaseorder',
     //         id:poId,
     //         isDynamic:true
     //     });
     //     var vendor = rec.getValue('entity');//供应商
     //     var ret = vendorBiao(vendor);
     //     if(ret.flag == 1){
     //         return 'nenibu';
     //     }
     //     else {
     //         return 'waibu';
     //     }
     // }
     function vendorBiao(vendor){
         log.debug('vendor',vendor);
         var vendorData = {};
         var flag = 'waibu';
         if(vendor){
             // var columns = search.lookupFields({
             //     type:'vendor',
             //     id:vendor,
             //     columns:['isautogeneratedrepresentingentity']
             // });
             // var mysearch = search.create({
             //     type:'vendor',
             //     filters:[['internalid','is',vendor]],
             //     columns:['isautogeneratedrepresentingentity'],
             // });
             // var res = mysearch.run().getRange({start: 0,end:1});
             // log.debug('是否内部供应商',JSON.stringify(res));
             // if(res[0].getValue('isautogeneratedrepresentingentity') == true){
             //     flag = 'neibu';
             //     return flag;
             // }
             if(vendor == '2179' || vendor =='2181'){//IC睿凡国际股份有限公司
                 flag = 'neibu';
             }
         }
         return flag;
     }
     function getPcResulte(poId){
         var sumQty = Number(0);
         var pcSearch = search.create({
             type:'customrecord_po_qc_result',
             filters:[['custrecord_po_qc_po','anyof',poId],'and',['custrecord_po_qc_rel','is','质检通过']],
             columns:['custrecord_po_qc_qty']
         });
         var res = pcSearch.run().getRange({start:0,end:100});
         log.debug('关联质检单数量',res.length);
         if(res.length > 0){
             for(var i = 0;i < res.length;i++){
                 var qty = res[i].getValue('custrecord_po_qc_qty');
                 sumQty += Number(qty);
             }
         }
         return sumQty;
     }
     function validateField(context) {

     }
     function fieldChanged(context) {

     }
     function postSourcing(context) {

     }
     function lineInit(context) {

     }
     function validateDelete(context) {

     }
     function validateInsert(context) {

     }
     function validateLine(context) {

     }
     function sublistChanged(context) {

     }
     return {
         // pageInit: pageInit,
         // fieldChanged: fieldChanged,
         // postSourcing: postSourcing,
         // sublistChanged: sublistChanged,
         // lineInit: lineInit,
         // validateField: validateField,
         // validateLine: validateLine,
         // validateInsert: validateInsert,
         // validateDelete: validateDelete,
         saveRecord: saveRecord
     };
 });