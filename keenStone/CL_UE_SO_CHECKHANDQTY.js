/**
 *生成内部销售订单验证库存数量
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
 define(['N/record','N/search','N/https','N/ui/serverWidget','N/format'],
 function(record,search,https,ui,format) {
     function beforeLoad(context) {

     }
     function beforeSubmit(context) {
         if(context.type == 'create' || context.type == 'edit'){
             var rec = context.newRecord;
             var intercotransaction = rec.getValue('intercotransaction');//公司间交易
             log.debug('内部po号',intercotransaction);
             intercotransaction = 1167995;//po725
             if(intercotransaction){
                 var count = rec.getLineCount('item');
                 if(count > 0){
                     for(var i = 0;i < count;i++){
                         var orderQty = rec.getSublistValue({
                             sublistId: 'item',
                             fieldId: 'quantity',
                             line:i,
                         });
                         var item = rec.getSublistValue({
                             sublistId: 'item',
                             fieldId: 'item',
                             line:i
                         });
                         var  onhandQty = getOnhand(intercotransaction,item);
                         log.debug('订单数量',orderQty);
                         log.debug('现有量',onhandQty);
                         if(Number(orderQty) - Number(onhandQty) > 0){
                             throw '此销售订单没有库存，请查看！！';
                         }
                     }
                 }
             }
         }
     }
     function getOnhand(poId,item){
         var rec = record.load({
             type:'purchaseorder',
             id:poId,
             isDynamic:true,
         });
         var vendor = rec.getValue('entity');
         var subId = record.load({type:'vendor',id:vendor,isDynamic:true}).getValue('representingsubsidiary');
         var subText = record.load({type:'vendor',id:vendor,isDynamic:true}).getText('representingsubsidiary');
         log.debug('subId subtext item',subId + '---' + subText + '---' + item);
         var mySearch = search.create({
             type:'item',
             filters:[['quantityavailable','greaterthan',0],'AND',['internalid','is',item]],
             columns:[
                 {name:'quantityavailable',type:'float',label:'可用'},
                 {name:'subsidiarynohierarchy',type:'select'},
                 {name:'locationquantityavailable',type:'float',label:'可用地点'},   //库存地点可用
             ]
         });
         var col = mySearch.columns;
         var res = mySearch.run().getRange({start:0,end:1000});
         log.debug('可用量查询数量',res.length);
         var onhandQty = 0;
         if(res.length > 0){
             for(var i = 0;i < res.length;i++){
                 var subSearchText = res[i].getValue(col[1]);
                 log.debug('可用数量',res[i].getValue(col[0]));
                 if(subId == subSearchText){
                     onhandQty = res[i].getValue(col[0]);
                 }
             }
         }
         return onhandQty;
     }
     function afterSubmit(context) {

     }
     return {
         // beforeLoad: beforeLoad,
         beforeSubmit: beforeSubmit,
         // afterSubmit: afterSubmit
     };
 });
