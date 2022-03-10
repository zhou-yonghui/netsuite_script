/**
 *采购订单赋值单价
 * 对于内部交易的供应商单价做加成比例处理
 * 外部采购赋值含税单价
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */
 define(['N/error','N/search','N/format','N/currentRecord','N/currency','N/record'],
 function(error,search,format,currentRecord,currencyRate,record) {
     function pageInit(context) {

     }
     function saveRecord(context) {

     }
     function validateField(context) {

     }
     function fieldChanged(context) {

     }
     function postSourcing(context) {
         var sublistName = context.sublistId;
         var sublistFieldName = context.fieldId;
         log.debug('field',sublistFieldName);
         if(sublistName == 'item' && context.currentRecord.getValue('orderstatus') == 'A') {
             try{
                 var oldRate = context.currentRecord.getCurrentSublistValue({
                     sublistId: 'item',
                     fieldId: 'rate',
                 });
                 log.debug('oldRate',oldRate);
                 if(oldRate <= 0 && sublistFieldName == 'item'){
                     var vendor = context.currentRecord.getValue('entity');//供应商
                     var isCsv = context.currentRecord.getValue('custbody_cs_po_csvdr');//是否csv导入
                     var vendorRec = record.load({
                         type:record.Type.VENDOR,
                         id:vendor
                     });
                     var subsidiary = vendorRec.getValue("subsidiary");
                     var representingsubsidiary = vendorRec.getValue("representingsubsidiary");
                     log.debug("subsidiary:representingsubsidiary",subsidiary+":"+representingsubsidiary);
                     log.debug('isCSV',isCsv);
                     var jjl;
                     var sfsxFlag;
                     /**csv导入的采购不需要赋值 */
                     /***内部交易取货品平均价格乘以加成比例 */
                     if(representingsubsidiary && subsidiary && isCsv == false){
                         try {
                             var gsjjjSearch = search.create({
                                 type: "customrecord_cs_gsjjj_record",
                                 columns: ['custrecord_cs_jjl_record', 'custrecord_cs_sfsx_record_c1'],
                                 filters: [
                                     ['custrecord_cs_cgzt_record', 'anyof', subsidiary],
                                     'AND',
                                     ['custrecord_cs_xszt_record', 'anyof', representingsubsidiary],
                                     'AND',
                                     ['custrecord_cs_sfsx_record_c1', 'is', true]
                                 ]
                             });
                             var res = gsjjjSearch.run().getRange({start:0,end:1});
                             log.debug({
                                 title: "加价表个数",
                                 details: res.length
                             });
                             if(res.length > 0){
                                 var jjl_record = res[0].getValue("custrecord_cs_jjl_record");
                                 log.debug('jjl_record',jjl_record);
                                 jjl_record = jjl_record.split('%');
                                 jjl =  Number(jjl_record[0])/100;
                             }
                         } catch (e) {
                             log.debug({
                                 title: "未找到公司间加价",
                                 details: e.message
                             })
                         }
                         var gsjFlag = false; // 是否公司间供应商
                         if(subsidiary != null && subsidiary != '' && representingsubsidiary != null && representingsubsidiary != ''){
                             gsjFlag = true
                         }
                         log.debug("是否公司间供应商",gsjFlag)
                         if(gsjFlag){ // 两字段非空（公司间供应商）且
                             // for (var i = 0; i < count; i++) {
                             var itemId = context.currentRecord.getCurrentSublistValue({
                                 sublistId: 'item',
                                 fieldId: 'item'
                             });
                             log.debug("itemId",itemId);
                             if(itemId){
                                 var averagecost = getInventoryOrAssemblyItem(itemId);
                                 log.debug('库存货品或者配件平均价格',averagecost);
                                 if(averagecost){
                                     var retVen = getVendor(vendor);
                                     log.debug('retVen',retVen);
                                     var rate = currencyRate.exchangeRate({
                                         source: retVen.venCurrency,
                                         target: context.currentRecord.getValue('currency'),
                                         date: new Date()
                                     });
                                     log.debug('货币汇率',rate);
                                     log.debug("jjl",jjl);
                                     log.debug("averagecost*(1+jjl)",Number(averagecost*(1+jjl)*rate).toFixed(2));
                                     if(averagecost*(1+jjl)){
                                         context.currentRecord.setCurrentSublistValue({
                                             sublistId: 'item',
                                             fieldId: 'rate',
                                             value: Number(averagecost*(1+jjl)*rate).toFixed(2)
                                         });
                                         context.currentRecord.setCurrentSublistValue({
                                             sublistId:'item',
                                             fieldId:'custcol_cs_hsdj1_c1',        //含税单价
                                             value:Number(0),
                                         });
                                         context.currentRecord.setCurrentSublistValue({
                                             sublistId:'item',
                                             fieldId:'grossamt',        
                                             value:Number(0),
                                         });
                                     }
                                 }
                                 else {
                                     context.currentRecord.setCurrentSublistValue({
                                         sublistId: 'item',
                                         fieldId: 'rate',
                                         value: '0.00'
                                     });
                                     context.currentRecord.setCurrentSublistValue({
                                         sublistId:'item',
                                         fieldId:'custcol_cs_hsdj1_c1',        //含税单价
                                         value:Number(0),
                                     });
                                 }
                             }
                             // }
                         }
                     }
                     /**外部交易取价目表单价 */
                     else if(subsidiary && isCsv == false){
                         var mysearch = search.create({
                             type:'customrecord_cs_pricelist_record',
                             columns:['custrecord_hrkpo_pricelist_price','custrecord_cs_hsj_c1'],
                             filters:[
                                 ['custrecord_cspo_pricelist_supplier','anyof',vendor],
                                 'and',
                                 ['custrecord_cspo_pricelist_goods','anyof',context.currentRecord.getCurrentSublistValue({
                                     sublistId: 'item',
                                     fieldId: 'item',
                                 })]
                             ]
                         });
                         var price;
                         var isprice;
                         mysearch.run().each(function(result) {
                             log.debug({
                                 title : "result",
                                 details : result
                             })
                             price = Number(result.getValue("custrecord_hrkpo_pricelist_price")).toFixed(2);
                             isprice = Number(result.getValue("custrecord_cs_hsj_c1")).toFixed(2);
                         });
                         log.debug('price isprice',price + '===' + isprice);
                         if(isprice){
                             context.currentRecord.setCurrentSublistValue({
                                 sublistId:'item',
                                 fieldId:'custcol_cs_hsdj1_c1',          ///含税单价
                                 value:isprice
                             });
                         }else{
                             alert("未找到相关价目表");

                             context.currentRecord.setCurrentSublistValue({
                                 sublistId:'item',
                                 fieldId:'custcol_cs_hsdj1_c1',          ///含税单价
                                 value:'0.00'
                             });
                         }
                     }
                 }
             }catch (e){
                 log.debug({
                     title : "出错",
                     details : e
                 });
             }
         }
     }
     function getVendor(vendor){
         var rec = record.load({
             type:'vendor',
             id:vendor,
             isDynamic:true,
         });
         var repSub = rec.getValue('representingsubsidiary');
         var mysearch = search.create({
             type:search.Type.SUBSIDIARY,
             filters:[['internalid','is',repSub]],
             columns:['currency']
         });
         var res = mysearch.run().getRange({start:0,end:1});
         var cur;
         if(res.length > 0){
             var curText = res[0].getText('currency');
             log.debug('供应商币种文本',curText);
             cur = res[0].getValue('currency');
         }
         return {"venCurrency":cur};
     }
     function getInventoryOrAssemblyItem(item){
         // var inventory = search.lookupFields({
         //     type: search.Type.INVENTORY_ITEM,
         //     id: item,
         //     columns: ['averagecost']
         // });
         // var cost = inventory.averagecost;
         var invSearch = search.create({
             type:'inventoryitem',
             columns:['averagecost'],
             filters:[['internalid','is',item]]
         });
         var res = invSearch.run().getRange({start:0,end:1});
         log.debug('是库存货品',res.length);
         var cost;
         if(res.length > 0){
             cost = res[0].getValue('averagecost');
         }
         else {
             var assSearch = search.create({
                 type:'assemblyitem',
                 columns:['averagecost'],
                 filters:[['initernalid','is',item]]
             });
             var resAss = assSearch.run().getRange({start:0,end:1});
             log.debug('是装配件',resAss.length);
             if(resAss.length > 0){
                 cost = resAss[0].getValue('averagecost');
             }
         }
         return cost;
     }
     function changeStringTime(stringTime){
         // log.debug('stringTime',stringTime + '==' + typeof(stringTime));
         var date = {};
         var year = stringTime.split('/')[2];
         var month = stringTime.split('/')[1];
         var day = stringTime.split('/')[0];

         date.str = year + '/' + month + '/' + day;

         return date;

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
         postSourcing: postSourcing,
         // sublistChanged: sublistChanged,
         // lineInit: lineInit,
         // validateField: validateField,
         // validateLine: validateLine,
         // validateInsert: validateInsert,
         // validateDelete: validateDelete,
         // saveRecord: saveRecord
     };
 });