/**
 * 2021/11/16：供应商价目表赋值未税单价和版本号
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
             if(context.type == 'create' || context.type == 'edit'){
                 var rec = record.load({type:'customrecord_price_list',id:context.newRecord.id,isDynamic:true});
                 var vendor = rec.getValue('custrecord_hl_supplier');//供应商
                 var count = rec.getLineCount('recmachcustrecord_hl_price_list_details');
                 var item_list = new Array();
                 for(var i = 0;i < count;i++ ){
                     var item_obj = new Object();
                     rec.selectLine('recmachcustrecord_hl_price_list_details',i);
                     var sku = rec.getCurrentSublistValue({
                         sublistId:'recmachcustrecord_hl_price_list_details',
                         fieldId:'custrecord_hl_bsq_sku',
                     });
                     var currency = rec.getCurrentSublistValue({
                         sublistId:'recmachcustrecord_hl_price_list_details',
                         fieldId:'custrecord_hl_bsq_currency',
                     });
                     var tax_rate = rec.getCurrentSublistValue({
                         sublistId:'recmachcustrecord_hl_price_list_details',
                         fieldId:'custrecord_hl_tax_rate',
                     });
                     var tax_included_price = rec.getCurrentSublistValue({
                         sublistId:'recmachcustrecord_hl_price_list_details',
                         fieldId:'custrecord_hl_bsq_tax_included_price',
                     });
                     var version_number = rec.getCurrentSublistValue({
                         sublistId:'recmachcustrecord_hl_price_list_details',
                         fieldId:'custrecord_hl_version_number',
                     });
                     var untaxed_price = rec.getCurrentSublistValue({
                         sublistId:'recmachcustrecord_hl_price_list_details',
                         fieldId:'custrecord_hl_bsq_untaxed_price',
                     });
                     var detail_id = rec.getCurrentSublistValue({
                         sublistId:'recmachcustrecord_hl_price_list_details',
                         fieldId:'id',
                     });
                     if(!version_number){
                         item_obj.vendor = vendor;
                         item_obj.sku = sku;
                         item_obj.currency = currency;
                         item_obj.version_number = version_number;
                         item_obj.detail_id = detail_id;
                         item_list.push(item_obj);
                     }
                     if(!untaxed_price){
                         //赋值未税单价
                         if(tax_rate && tax_included_price){
                             var no_tax_price = tax_included_price/(1 + getTaxCode(tax_rate));
                             log.debug('no_tax_price',no_tax_price);
                             rec.setCurrentSublistValue({
                                 sublistId:'recmachcustrecord_hl_price_list_details',
                                 fieldId:'custrecord_hl_bsq_untaxed_price',
                                 value:no_tax_price.toFixed(4),
                             });
                         }
                     }
                     rec.commitLine('recmachcustrecord_hl_price_list_details');
                 }
                 rec.save();
                 //赋值版本号
                 log.debug('item_list',item_list);
                 var version = getBanben(item_list);
                 log.debug('version',version);
                 if(version){
                     rec.setCurrentSublistValue({
                         sublistId:'recmachcustrecord_hl_price_list_details',
                         fieldId:'custrecord_hl_version_number',
                         value:version,
                     });
                 }
             }   
         }catch (e){
             log.debug('after',e);
         }
     }
     // function setSupplierPriceList(item_list){
     //     if(item_list.length > 0){
     //         var rec = record.load({
     //             type:'customrecord_supplier_price_list',
     //             id:
     //         })
     //     }
     // }
     function getBanben(vendor,sku,currency,version_number,detail_id) {
         var version;
         if(vendor){
             var detail_search = search.create({
                 type:'customrecord_supplier_price_list',
                 filters:[
                     ['custrecord_hl_price_list_details.custrecord_hl_supplier','anyof',vendor],
                     'AND',['custrecord_hl_bsq_sku','is',sku],
                     'AND',['custrecord_hl_bsq_currency','is',currency],
                     'AND',['internalid','noneof',detail_id],
                 ],
                 columns:[
                     {name:'custrecord_hl_version_number'},
                     {name:'internalid',sort:search.Sort.ASC},
                 ]
             });
             var detail_res = detail_search.run().getRange(0,1000);
             log.debug('搜索结果',detail_res.length + '---' + JSON.stringify(detail_res));
             if(detail_res.length > 0){
                 var old_version = detail_res[detail_res.length - 1].getValue('custrecord_hl_version_number');
                 log.debug('old_version',old_version);
                 if(old_version){
                     version = Number(old_version.split('V')[1].split('.')[0]) + 1;
                     version = 'V' + version + '.0';
                 }else{
                     version = 'V1.0';
                 }
             }else{
                 if(version_number){
                     version = Number(version_number.split('V')[1].split('.')[0]) + 1;
                     version = 'V' + version + '.0';
                 }else{
                     version = 'V1.0';
                 }
             }

             return version;
         }
     }
     function getTaxCode(tax_id) {
         if(tax_id){
             var rec = record.load({type:'salestaxitem',id:tax_id});
             var tax = rec.getValue('rate');
             log.debug('tax',tax);

             return Number(tax)/100;
         }
     }
     return {
         //  beforeLoad: beforeLoad,
         //  beforeSubmit: beforeSubmit,
         afterSubmit: afterSubmit
     };
 });
