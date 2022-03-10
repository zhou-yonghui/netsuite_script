/**
 *报价单控制
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */
 define(['N/error','N/search','N/format','N/currentRecord','N/currency','N/record','SuiteScripts/Common/FREIGHT_CALCULATION.js'],
 function(error,search,format,currentRecord,currencyRate,record,FREIGHT_CALCULATION) {
     function pageInit(context) {
        
     }
     function saveRecord(context) {
        var rec = context.currentRecord;
        
     }
     function validateField(context) {

     }
     function fieldChanged(context) {
        var rec = context.currentRecord;
        var fieldId = context.fieldId;
         var sublistId = context.sublistId;
        if(fieldId == 'entity'){
            if(rec.getValue('entity')){
                var cus_data = getCustomer(rec.getValue('entity'));
                log.debug('cus_data',cus_data);
                if(cus_data.length > 0){
                    var data = cus_data[0];
                    var str = "Country：" + data.country + '\n' + "Name：" +  data.attention + ' ' + data.addressee + '\n' + "Company：" +  data.companyname + '\n' + "Street：" +  data.addr1 + '\n' + "Street2：" + data.addr2 + '\n' + "City：" + data.city + '\n' + "Region：" + data.state + '\n' + "PostCode：" + data.zip + '\n';
                    //赋值
                    rec.setValue('custbody_sl_sozmmemo',str);
                    rec.setValue('custbody_sl_so_custdir',str);
                }
            }
        }
         //改变配送国家地区、运输类型计算参考运费
         if(fieldId == 'custbody_sl_sopeis' || fieldId == 'custbody_sl_spo_transway' || fieldId == 'custbody_sl_spo_zhozl'){
             if(rec.getValue('custbody_sl_sopeis') && rec.getValue('custbody_sl_spo_transway') && rec.getValue('custbody_sl_spo_zhozl')){
                 numericalCalculation.init(search,record);
                 ret = numericalCalculation.freightQuery({"custpage_transport_country":record.load({type:'customrecord_country_im',id:rec.getValue('custbody_sl_sopeis')}).getValue('custrecord_country_cn'),"custpage_transport_weight":rec.getValue('custbody_sl_spo_zhozl'),"custpage_remote_areas":rec.getValue('custbody_sl_so_pyf')});//FREIGHT_CALCULATION.js,
                 log.debug('调用函数返回值',ret);
                 if(ret){
                     for(var i = 0;i < ret.length;i++){
                         if(ret[i].shipping_type == rec.getValue('custbody_sl_spo_transway')){
                             rec.setValue('custbody_sl_so_yunfei',ret[i].res_fee);//参考运费
                         }
                         else{
                             rec.setValue('custbody_sl_so_yunfei',0);//参考运费
                         }
                     }
                 }
             }
         }
         var old_sub_data = {
             "qty_sum" : 0,
             "weight_sum" : 0,
             "y_amount" : 0,
             "r_amount" : 0,
             "bx_amount" : 0,
             "yf_amount" : 0,
             "other_amount" : 0,
         };
        //总重量
         if(fieldId == 'custcol_sl_spo_danjianzl' || fieldId == 'quantity'){
             doSublistZk(rec,sublistId,'weight',old_sub_data);
         }
         //赋值明细行折扣和单价、数量
         if(fieldId == 'custcol_sl_ydj' || fieldId == 'quantity' || fieldId == 'custcol_sl_so_zheko'){
             doSublistZk(rec,sublistId,'zk',old_sub_data);
         }
         //勾选清洁号产品
         if(fieldId == 'item'){
             doSublistZk(rec,sublistId,'zk',old_sub_data);
         }
     }
     function doSublistZk(rec,sublistId,flag,old_data) {
         var ret = new Array();
         var y_amount_sum = old_data.y_amount;
         var r_amount_sum = old_data.r_amount;
         var r_weight_sum = old_data.weight_sum;
         var bx_amount = old_data.bx_amount;
         var yf_amount = old_data.yf_amount;
         var other_amount = old_data.other_amount;
         var amount = rec.getCurrentSublistValue({
             sublistId:sublistId,
             fieldId:'amount'
         });
         var qty = rec.getCurrentSublistValue({
             sublistId:sublistId,
             fieldId:'quantity'
         });
         var rate = rec.getCurrentSublistValue({
             sublistId:sublistId,
             fieldId:'rate'
         });
         var y_rate = rec.getCurrentSublistValue({
             sublistId:sublistId,
             fieldId:'custcol_sl_ydj'
         })
         var each_weight = rec.getCurrentSublistValue({
             sublistId:sublistId,
             fieldId:'custcol_sl_spo_danjianzl'
         });
         var item = rec.getCurrentSublistValue({
             sublistId:'item',
             fieldId:'item'
         })
         if(flag == 'zk'){
             var item_flag = checkInventoryitem(item);
             log.debug('item_flag',item_flag);
             if(item_flag == 'N'){
                 rec.setValue('custbody_sl_spo_qitfeiyheji',Number(other_amount) + Number(rate) * Number(qty));//其他费用
             }
             else if(item_flag == 'N_134'){
                 rec.setValue('custbody_sl_spo_baoxheji',Number(bx_amount) + Number(qty) * Number(rate));//保险费
             }
             else if(item_flag == 'N_139'){
                 rec.setValue('custbody_sl_spo_yunfheji',Number(yf_amount) + Number(rate) * Number(qty));//运费
             }
             else if(item_flag == 'Y_1' || item_flag == 'Y_2'){
                 var zhekou = rec.getCurrentSublistValue({         //
                     sublistId:sublistId,
                     fieldId:'custcol_sl_so_zheko',  ///折扣
                 });
                 if(!zhekou || zhekou == null || zhekou == ''){
                     zhekou = 100;
                 }
                 log.debug('fieldChanged zhekou amount',zhekou + '---' + amount);
                 if(zhekou){
                     //当前货品行赋值
                     rec.setCurrentSublistValue({         //
                         sublistId:sublistId,
                         fieldId:'custcol_sl_so_zheko',  ///折扣
                         value:zhekou || 0.00,
                         ignoreFieldChange:true,
                     });
                     rec.setCurrentSublistValue({
                         sublistId:sublistId,
                         fieldId:'rate',  ///单价
                         value:y_rate * zhekou / 100 || 0.00,
                         ignoreFieldChange:true,
                     });
                     rec.setCurrentSublistValue({
                         sublistId:sublistId,
                         fieldId:'custcol_sl_zkje',  //折扣金额
                         value:(((100 - Number(zhekou)) / 100) * Number(qty) * Number(y_rate)).toFixed(4) || 0.00
                     })
                     rec.setCurrentSublistValue({
                         sublistId:sublistId,
                         fieldId:'custcol_sl_so_zheho',   ///折后价
                         value:(Number(qty) * Number(y_rate) * (Number(zhekou) / 100)).toFixed(4) || 0.00,
                         ignoreFieldChange:true,
                     });
                     rec.setCurrentSublistValue({
                         sublistId:sublistId,
                         fieldId:'amount',   ///不含税合计金额
                         value:(Number(qty) * Number(y_rate) * (Number(zhekou) / 100)).toFixed(4) || 0.00,
                         ignoreFieldChange:true,
                     });
                     rec.setCurrentSublistValue({
                         sublistId:sublistId,
                         fieldId:'grossamt',          //总金额
                         value:(Number(qty) * Number(y_rate) * (Number(zhekou) / 100)).toFixed(4) || 0.00,
                         ignoreFieldChange:true,
                     });
                     if(item_flag == 'Y_1'){
                         rec.setCurrentSublistValue({
                             sublistId:sublistId,
                             fieldId:'custcol_y_so_qjh',          //清洁号产品
                             value:false,
                             ignoreFieldChange:true,
                         });
                     }
                     else if(item_flag == 'Y_2'){
                         rec.setCurrentSublistValue({
                             sublistId:sublistId,
                             fieldId:'custcol_y_so_qjh',          //清洁号产品
                             value:true,
                             ignoreFieldChange:true,
                         });
                     }
                 }
             }
         }
         else if(flag == 'weight'){
             if(qty && each_weight){
                 log.debug('qty each_weight',qty + '---' + each_weight);
                 rec.setCurrentSublistValue({
                     sublistId:sublistId,
                     fieldId:'custcol_sl_spo_zhlxj',//重量合计
                     value:Number(qty) * Number(each_weight),
                     ignoreFieldChange:true,
                 });
             }
         }
     }
     function checkInventoryitem(item){
         if(item){
             var mysearch = search.create({
                 type:'inventoryitem',
                 filters:[
                     ['internalid','is',item]
                 ],
                 columns:[
                     'custitem3',
                 ]
             });
             var res = mysearch.run().getRange(0,100);
             if(res.length > 0){
                 var sx = res[0].getValue('custitem3');
                 log.debug('sx',sx);
                 var index = sx.indexOf('9');//9 清洁号
                 if(index == -1){
                     return 'Y_1';
                 }
                 else {
                     return 'Y_2';
                 }
             }
             else if(item == 134){
                 return 'N_134';
             }
             else if(item == 139){
                 return 'N_139'
             }
             else {
                 return 'N';
             }
         }
     }
     function getCustomer(customer_id) {
         var address_arr = new Array();
         if(customer_id){
             var rec = record.load({
                 type:'customer',
                 id:customer_id,
                 isDynamic:true
             });
             var companyname = rec.getValue('companyname');
             var defaultaddress = rec.getValue('defaultaddress');
             log.debug('defaultaddress',defaultaddress);
             var addressbook_count = rec.getLineCount('addressbook');
             for(var i = 0;i < addressbook_count;i++){
                 rec.selectLine('addressbook',i);
                 var defaultshipping = rec.getCurrentSublistValue({
                     sublistId:'addressbook',
                     fieldId:'defaultshipping',    //默认地址
                 });
                 if(defaultshipping == true){
                    var addr1 = rec.getCurrentSublistValue({
                        sublistId:'addressbook',
                        fieldId:'addr1_initialvalue'           //地址 1
                    });
                    var addr2 = rec.getCurrentSublistValue({
                       sublistId:'addressbook',
                       fieldId:'addr2_initialvalue'          //地址2
                   });
                   var addressee = rec.getCurrentSublistValue({
                       sublistId:'addressbook',
                       fieldId:'addressee_initialvalue'          //收件人
                   });
                   var attention = rec.getCurrentSublistValue({
                       sublistId:'addressbook',
                       fieldId:'attention_initialvalue'       //收件人
                   });
                   var city = rec.getCurrentSublistValue({
                       sublistId:'addressbook',
                       fieldId:'city_initialvalue'              //城市
                   });
                   var country = rec.getCurrentSublistValue({
                       sublistId:'addressbook',                 
                       fieldId:'country_initialvalue'               //国家
                   });
                   var state = rec.getCurrentSublistValue({
                       sublistId:'addressbook',
                       fieldId:'dropdownstate_initialvalue',   //省市区
                   });
                   var zip = rec.getCurrentSublistValue({
                       sublistId:'addressbook',
                       fieldId:'zip_initialvalue'               //zip
                   });
                   var phone = rec.getCurrentSublistValue({
                       sublistId:'addressbook',
                       fieldId:'phone_initialvalue',
                   });
                   address_arr.push({
                       "country":country,
                       "addressee":addressee,
                       "attention":attention,
                       "companyname":companyname,
                       "phone":phone,
                       "addr1":addr1,
                       "addr2":addr2,
                       "city":city,
                       "state":state,
                       "zip":zip,
                   })
                 }
             }
         }
         return address_arr;
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
     return {
        //  pageInit: pageInit,
         fieldChanged: fieldChanged,
         // postSourcing: postSourcing,
        //  sublistChanged: sublistChanged,
         // lineInit: lineInit,
         // validateField: validateField,
        //  validateLine: validateLine,
         // validateInsert: validateInsert,
         // validateDelete: validateDelete,
        //  saveRecord: saveRecord
     };
 });