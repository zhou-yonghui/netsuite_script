/**
 *货品收据货品明细费用分摊
 * 创建账单
 * 9/15    根据到岸成本生成账单，货品为对应的运费、关税、报关费，数量为分摊的金额，单价为1
 * 10/11   添加报关费
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
 define(['N/record','N/search','N/https','N/ui/serverWidget','N/format'],
 function(record,search,https,ui,format) {
     function beforeLoad(context) {
         if(context.type == 'create'){
             var rec = context.newRecord;
             var createdfromText = rec.getText('createdfrom');//来源单据
             log.debug('来源单据',createdfromText);
             log.debug('匹配',createdfromText.indexOf('PO') + '---To:' + createdfromText.indexOf('TO'));
             var searchFlag;
             if(createdfromText.indexOf('PO') != -1 || createdfromText.indexOf('TO') != -1){
                 searchFlag = 'POTO';
                 var createdfrom = rec.getValue('createdfrom');
                 var ret = getYuLu(createdfrom,searchFlag);
                 log.debug('ret',ret);
                 if(ret){
                     rec.setValue('custbody_wuliu',ret.wl);
                     rec.setValue('custbody_cs_gs_hpsj',ret.gs);
                     rec.setValue('custbody_cs_qgf_hpsj',ret.qgf);
                     rec.setValue('custbody_cs_yf_hpsj',ret.yf);
                     rec.setValue('custbody_cs_bgf_hpsj',ret.bg);
                 }
             }
             // else if(){
             //
             // }
         }
     }
     function getYuLu(createdfrom,flag){
         var mySearch;
         var wl;
         var gs;
         var qgf;
         var yf;
         var bg;
         var yl_id;
         if(flag == 'POTO'){
             mySearch = search.create({
                 type:'customrecord_cs_yldmx_c1',
                 columns:['custrecord_cs_wlgys_c1','custrecord_cs_gs_c1','custrecord_cs_qgf_c1','custrecord_cs_yf_c1','custrecordcustrecord_cs_wlyf_bgf_c1'],
                 filters:[
                     ['custrecord_cs_dh_c1','anyof',createdfrom],
                     'AND',['custrecord_cs_dj_type_1','noneof',["@NONE@"]],
                     'AND',['custrecord_cs_lydj_status_c1','contains','待收货']
                 ]
             });
         }
         var res = mySearch.run().getRange({start:0,end:1});
         log.debug('res.length',res.length + '---JSON:' + JSON.stringify(res));
         if(res.length > 0){
             if(flag == 'POTO'){
                 wl = getWuliuId(res[0].getText('custrecord_cs_wlgys_c1'));
                 gs = res[0].getValue('custrecord_cs_gs_c1');
                 qgf = res[0].getValue('custrecord_cs_qgf_c1');
                 yf = res[0].getValue('custrecord_cs_yf_c1');
                 bg = res[0].getValue('custrecordcustrecord_cs_wlyf_bgf_c1');
                 yl_id = res[0].id;
             }
             return {"wl":wl,"gs":gs,"qgf":qgf,"yf":yf,"bg":bg,"id":yl_id};
         }
     }
     function getWuliuId(code) {
         var wuliu_search = search.create({
             type:'customrecord230',
             filters:[['name','is',code]]
         });
         var res = wuliu_search.run().getRange(0,1);
         if(res.length > 0){
             return res[0].id;
         }
     }
     function beforeSubmit(context) {
     }
     function afterSubmit(context) {
         try{
             var rec = record.load({type:record.Type.ITEM_RECEIPT,id:context.newRecord.id,isDynamic: true});
             var createdfromText = rec.getText('createdfrom');//来源单据
             var poto_flag = 'NO';
             if(createdfromText.indexOf('PO') != -1 || createdfromText.indexOf('TO') != -1){
                poto_flag = 'POTO';
             }
             /**当采购公司为：Keenstone Limited、Keenstone Corp、SmareWare, INC时，采购收货之后，自动开账单。*/
             if(context.type == 'create' || context.type == 'edit'){
                 var createdfrom = rec.getValue('createdfrom');//创建自po
                 log.debug('createfrom',createdfrom);
                 var createdformText = rec.getText('createdfrom');
                 log.debug('创建自文本',createdformText);
                 var trandate = rec.getValue('trandate');//日期
                 var ret;
                 /**收据来源采购才需要账单*/
                 if(createdformText.indexOf("PO") != -1){
                     ret = getPo(createdfrom);
                 }
                 log.debug('ret',ret);
                 if(ret == 'yes'){
                     var vbRec = record.transform({
                         fromType:'purchaseorder',
                         fromId:createdfrom,
                         toType:'vendorbill',
                         isDynamic:true,
                     });
                     vbRec.setValue({
                         fieldId:'trandate',
                         value:format.parse({value:trandate,type:format.Type.DATE}),
                     });
                     vbRec.setValue({
                         fieldId:'custbodycustbody_444',  //TODO:测试环境id
                         value:createdfrom
                     });
                     vbRec.setValue({
                         fieldId:'approvalstatus',
                         value:2,               //已核准
                     });
                     var vbRecId = vbRec.save();
                     log.debug('自动生成的账单',vbRecId);
                 }
             }

             /**到岸成本分摊*/
             if(context.type == 'create' || context.type == 'edit'){
                 var venderbill_data = [];
                 var flagCount = Number(0);
                 var flag = {};
                 var itemData = [];
                 var landedcostamount2 = rec.getValue('custbody_cs_yf_hpsj');//运费
                 var landedcostamount3 = rec.getValue('custbody_cs_gs_hpsj');//关税
                 var landedcostamount4 = rec.getValue('custbody_cs_qgf_hpsj');//清关费
                 var landedcostamount5 = rec.getValue('custbody_cs_bgf_hpsj');//报关费 
                 // var landedcostamount2 = 100;
                 // var landedcostamount3 = 200;
                 // var landedcostamount4 = 300;
                 if(Number(landedcostamount2) > 0){
                     flagCount += 1;
                     flag.yunfei = landedcostamount2;
                 }
                 if(Number(landedcostamount3) > 0){
                     flagCount += 1;
                     flag.guanshui = landedcostamount3;
                 }
                 if(Number(landedcostamount4) > 0){
                     flagCount += 1;
                     flag.qingguan = landedcostamount4;
                 }
                 if(Number(landedcostamount5) > 0){
                     flagCount += 1;
                     flag.baoguan = landedcostamount5;
                 }
                 log.debug('flag',flag);
                 var count = rec.getLineCount({sublistId:'item'});
                 log.debug('count',count);
                 if(count > 0 &&(flag.yunfei > 0 || flag.guanshui > 0 || flag.qingguan > 0 || flag.baoguan > 0)){
                     var allWeight = Number(0);
                     var allQty = Number(0);
                     var one = 0;
                     for(var i = 0;i < count;i++){
                         var itemList = {};
                         var sku = rec.getSublistValue({sublistId:'item',fieldId:'item',line:i});
                         var qty = rec.getSublistValue({sublistId:'item',fieldId:'quantity',line:i});
                         itemList.sku = sku;
                         itemList.qty = qty;
                         var weight = getSkuWeight(sku);
                         log.debug('sku单个毛重 数量',weight + '---' + qty);
                         itemList.weight = Number(weight) * Number(qty);
                         itemData.push(itemList);
                         allWeight += Number(weight) * Number(qty);
                         allQty += Number(qty);
                         if(!weight){
                             one = 1;
                         }
                     }
                     log.debug('allWeight',allWeight);
                     log.debug('allQty',allQty);
                     log.debug('itemData',itemData);
                     var costYun;
                     var costGuan;
                     var costQing;
                     var costBao;
                     var sumYun = Number(0);
                     var sumGuan = Number(0);
                     var sumQing = Number(0);
                     var sumBao = Number(0);
                     /***/
                     for(var k = 0;k < itemData.length;k++){
                         if(one == 0){  //按重量来分配
                             if(k < itemData.length - 1){
                                 if(flag.yunfei){
                                     costYun = flag.yunfei*(itemData[k].weight/allWeight).toFixed(4);
                                     sumYun += costYun;
                                 }else{
                                    costYun = Number(0);
                                    sumYun = Number(0); 
                                 }
                                 if(flag.guanshui){
                                     costGuan = flag.guanshui*(itemData[k].weight/allWeight).toFixed(4);
                                     sumGuan += costGuan;
                                 }else {
                                     costGuan = Number(0);
                                     sumGuan = Number(0);
                                 }
                                 if(flag.qingguan){
                                     costQing = flag.qingguan*(itemData[k].weight/allWeight).toFixed(4);
                                     sumQing += costQing;
                                 }else{
                                    costQing = Number(0);
                                    sumQing = Number(0);
                                 }
                                 if(flag.baoguan){
                                    costBao = flag.baoguan*(itemData[k].weight/allWeight).toFixed(4);
                                    sumBao += costBao;
                                 }else{
                                    costBao = Number(0);
                                    sumBao = Number(0);
                                 }
                             }
                             else {
                                 if(flag.yunfei){
                                     costYun = flag.yunfei - sumYun;
                                 }else{
                                     costYun = Number(0);
                                 }
                                 if(flag.guanshui){
                                     costGuan = flag.guanshui - sumGuan;
                                 }else {
                                     costGuan = Number(0);
                                 }
                                 if(flag.qingguan){
                                     costQing = flag.qingguan - sumQing;
                                 }else{
                                     costQing = Number(0);
                                 }
                                 if(flag.baoguan){
                                     costBao = flag.baoguan - sumBao;
                                 }else{
                                     costBao = Number(0);
                                 }
                             }
                         }
                         else {  //按数量来分配
                             if(k < itemData.length -1){
                                 if(flag.yunfei){
                                     costYun = flag.yunfei*(itemData[k].qty/allQty).toFixed(4);
                                     sumYun += costYun;
                                 }else{
                                    costYun = Number(0);
                                    sumYun = Number(0); 
                                 }
                                 if(flag.guanshui){
                                     costGuan = flag.guanshui*(itemData[k].qty/allQty).toFixed(4);
                                     sumGuan += costGuan;
                                 }else {
                                    costGuan = Number(0);
                                    sumGuan = Number(0);
                                }
                                 if(flag.qingguan){
                                     costQing = flag.qingguan*(itemData[k].qty/allQty).toFixed(4);
                                     sumQing += costQing;
                                 }else{
                                    costQing = Number(0);
                                    sumQing = Number(0);
                                 }
                                 if(flag.baoguan){
                                    costBao = flag.baoguan*(itemData[k].qty/allQty).toFixed(4);
                                    sumBao += costBao;
                                }else{
                                   costBao = Number(0);
                                   sumBao = Number(0);
                                }
                             }
                             else {
                                 if(flag.yunfei){
                                     costYun = flag.yunfei - sumYun;
                                 }else{
                                    costYun = Number(0);
                                }
                                 if(flag.guanshui){
                                     costGuan = flag.guanshui - sumGuan;
                                 }else {
                                    costGuan = Number(0);
                                }
                                 if(flag.qingguan){
                                     costQing = flag.qingguan - sumQing;
                                 }else{
                                    costQing = Number(0);
                                }
                                if(flag.baoguan){
                                    costBao = flag.baoguan - sumBao;
                                }else{
                                   costBao = Number(0);
                               }
                             }
                         }
                         log.debug('costYun costGuan costQing costBao',costYun + '---' + costGuan + '---' + costQing + '----' + costBao);
                         venderbill_data.push({"costYun":costYun,"costGuan":costGuan,"costQing":costQing,"costBao":costBao});//TODO：到岸成本生成账单的数据
                         rec.selectLine({
                             sublistId: 'item',
                             line: k
                         });
                         try{
                             rec.removeCurrentSublistSubrecord({
                                 sublistId: 'item',
                                 fieldId: 'landedcost',
                                 line: k
                             });
                         }catch(e){
                             log.debug({
                                 title: 'delLandedcostdata',
                                 details: '删除到岸成本异常'
                             })
                         }
                         /**对到岸成本记录赋值*/
                         var landedCost = rec.getCurrentSublistSubrecord({  //TODO:到岸成本子记录
                             sublistId: 'item',
                             fieldId: 'landedcost',
                             line: k
                         });
                         log.debug('flagCount',flagCount);
                         var nowIndex = Number(0);
                         for(var j = 0;j < 4;j++){
                             landedCost.selectNewLine({
                                 sublistId: 'landedcostdata'
                             });
                             if(j == 0 && Number(flag.yunfei) > 0){
                                 nowIndex += Number(1);
                                 log.debug('nowIndex yun',nowIndex);
                                 landedCost.setCurrentSublistText({
                                     sublistId: 'landedcostdata',
                                     fieldId: 'costcategory',
                                     text: '运费',          //运费
                                     line: nowIndex - Number(1)
                                 });
                                 landedCost.setCurrentSublistValue({
                                     sublistId: 'landedcostdata',
                                     fieldId: 'amount',
                                     value: costYun,
                                     line: nowIndex - Number(1)
                                 });
                                 landedCost.commitLine({
                                     sublistId: 'landedcostdata'
                                 });
                             }
                             else if( j == 1 && Number(flag.guanshui) > 0){
                                 nowIndex += Number(1);
                                 log.debug('nowIndex guan',nowIndex);
                                 landedCost.setCurrentSublistText({
                                     sublistId: 'landedcostdata',
                                     fieldId: 'costcategory',
                                     text: '关税',    //关税
                                     line: nowIndex - 1
                                 });
                                 landedCost.setCurrentSublistValue({
                                     sublistId: 'landedcostdata',
                                     fieldId: 'amount',
                                     value: costGuan,
                                     line: nowIndex - 1
                                 });
                                 landedCost.commitLine({
                                     sublistId: 'landedcostdata'
                                 });
                             }
                             else if( j == 2 && Number(flag.qingguan) > 0){
                                 nowIndex += Number(1);
                                 log.debug('nowIndex qing',nowIndex);
                                 landedCost.setCurrentSublistText({
                                     sublistId: 'landedcostdata',
                                     fieldId: 'costcategory',
                                     text: '清关费',    //清关费
                                     line: nowIndex - 1
                                 });
                                 landedCost.setCurrentSublistValue({
                                     sublistId: 'landedcostdata',
                                     fieldId: 'amount',
                                     value: costQing,
                                     line: nowIndex - 1
                                 });
                                 landedCost.commitLine({
                                     sublistId: 'landedcostdata'
                                 });
                             }
                             else if( j == 3 && Number(flag.baoguan) > 0){
                                nowIndex += Number(1);
                                log.debug('nowIndex bao',nowIndex);
                                landedCost.setCurrentSublistText({
                                    sublistId: 'landedcostdata',
                                    fieldId: 'costcategory',
                                    text: '报关费',    //报关费
                                    line: nowIndex - 1
                                });
                                landedCost.setCurrentSublistValue({
                                    sublistId: 'landedcostdata',
                                    fieldId: 'amount',
                                    value: costBao,
                                    line: nowIndex - 1
                                });
                                landedCost.commitLine({
                                    sublistId: 'landedcostdata'
                                });
                            }
                         }
                         rec.commitLine({
                             sublistId: 'item',
                             line: k
                         });
                     }
                     var recId = rec.save();
                     log.debug({
                         title: 'recId',
                         details: recId
                     });
                     if(recId){
                         //回写物流费用预录
                         var ret = getYuLu(rec.getValue('createdfrom'),poto_flag);
                         var yl_id = ret.id;
                         var yl_rec = record.load({type:'customrecord_cs_yldmx_c1',id:yl_id,isDynamic:true});
                         yl_rec.setValue('custrecord_cs_zxzt_c1',2);//执行状态，执行成功
                         var now_id = yl_rec.save();
                         log.debug('更改执行状态后的预录单',now_id);
                     }
                 }
                //根据每条到岸成本生成账单
                log.debug('vendorbill_data',venderbill_data);
                var matchVendorbill = getVendorbill(context.newRecord.id);
                log.debug('是否已生成账单',matchVendorbill);
                matchVendorbill = 'test';//TODO:测试不生成账单
                if(venderbill_data.length > 0 && matchVendorbill == 'novb'){
                    var wuliushang_id = rec.getValue('custbody_wuliu');//物流供应商
                    var vendor_to_bill = getWuliuShang(wuliushang_id);
                    for(var m = 0;m < venderbill_data.length;m++){
                        var vendorbill_rec = record.create({
                            type:'vendorbill',
                            isDynamic:true,
                        });
                        vendorbill_rec.setValue('entity',vendor_to_bill);//供应商
                        vendorbill_rec.setValue('custbody_cs_relatedir',context.newRecord.id);//TODO:正式环境id修改,关联货品收据
                        vendorbill_rec.setValue('approvalstatus',2);//已核准
                        for(var n = 0;n < 3;n++){
                            vendorbill_rec.selectNewLine('item');//"costYun":costYun,"costGuan":costGuan,"costQing":costQing
                            if(n == 0 && venderbill_data[m].costYun > 0){
                                vendorbill_rec.setCurrentSublistValue({
                                    sublistId:'item',
                                    fieldId:'item',
                                    // value:'8887',             //TODO：运费,测试id
                                    value:'9009'
                                });
                                vendorbill_rec.setCurrentSublistValue({
                                    sublistId:'item',
                                    fieldId:'quantity',
                                    value:venderbill_data[m].costYun,
                                });
                                vendorbill_rec.setCurrentSublistValue({
                                    sublistId:'item',
                                    fieldId:'rate',
                                    value:'1'
                                });
                                vendorbill_rec.setCurrentSublistValue({
                                    sublistId:'item',
                                    fieldId:'taxcode',
                                    value:'8',          //VAT_CN:VAT_0%
                                });
                            }else if(n == 1 && venderbill_data[m].costGuan > 0){
                                vendorbill_rec.setCurrentSublistValue({
                                    sublistId:'item',
                                    fieldId:'item',
                                    // value:'8888',             //TODO:关税,测试id
                                    value:'9008',
                                });
                                vendorbill_rec.setCurrentSublistValue({
                                    sublistId:'item',
                                    fieldId:'quantity',
                                    value:venderbill_data[m].costGuan,
                                });
                                vendorbill_rec.setCurrentSublistValue({
                                    sublistId:'item',
                                    fieldId:'rate',
                                    value:'1'
                                });
                                vendorbill_rec.setCurrentSublistValue({
                                    sublistId:'item',
                                    fieldId:'taxcode',
                                    value:'8',          //VAT_CN:VAT_0%
                                });
                            }else if(n == 2 && venderbill_data[m].costQing > 0){
                                vendorbill_rec.setCurrentSublistValue({
                                    sublistId:'item',
                                    fieldId:'item',
                                    // value:'8891',             //TODO：清关费,测试id
                                    value:9007
                                });
                                vendorbill_rec.setCurrentSublistValue({
                                    sublistId:'item',
                                    fieldId:'quantity',
                                    value:venderbill_data[m].costQing,
                                });
                                vendorbill_rec.setCurrentSublistValue({
                                    sublistId:'item',
                                    fieldId:'rate',
                                    value:'1'
                                });
                                vendorbill_rec.setCurrentSublistValue({
                                    sublistId:'item',
                                    fieldId:'taxcode',
                                    value:'8',          //VAT_CN:VAT_0%
                                });
                            }
                            vendorbill_rec.commitLine('item');
                        }
                        var vendorbill_rec_id = vendorbill_rec.save({
                            ignoreMandatoryFields: true,
                        });
                        log.debug({
                            title: '账单id',
                            details: vendorbill_rec_id
                        });
                        if(vendorbill_rec_id){
                            record.submitFields({
                                type: record.Type.ITEM_RECEIPT,
                                id: context.newRecord.id,
                                values: {
                                    custbody_cs_relatedbill:vendorbill_rec_id,
                                }    
                            });    
                        }
                    }
                }
             }
         }
         catch (e){
             log.debug('费用分摊出错或者生成账单出错',e);
         }
     }
     function getWuliuShang(code) {
         if(code){
             var vendor_columns = search.lookupFields({
                 type: 'customrecord230',         //TODO：物流供应商id测试环境，正式环境需要修改
                 id: code,
                 columns: ['custrecord6'],            //TODO:正式环境需要修改
             });
             log.debug('vendor columns',vendor_columns);
             return vendor_columns.custrecord6[0].value;
         }
     }
     function getVendorbill(irId) {
         if(irId){
             var mysearch = search.create({
                 type:'vendorbill',
                 filters:[['custbody_cs_relatedir','anyof',irId]], //TODO:关联收据字段
             });
             var res = mysearch.run().getRange(0,1);
             if(res.length == 1){
                 return 'isvb';
             }
         }
         return 'novb';
     }
     function getPo(poId){
         var isVb;
         if(poId){
             var rec = record.load({
                 type:'purchaseorder',
                 id:poId,
                 isDynamic:true,
             });
             /**判断破是否已开账单*/
             var linksCount = rec.getLineCount('links');
             if(linksCount > 0){
                 for(var j = 0;j < linksCount;j++){
                     rec.selectLine('links',j);
                     var type = rec.getCurrentSublistValue({
                         sublistId:'links',
                         fieldId:'type'
                     });
                     log.debug('po关联记录类型',type);
                     if(type == '账单'){
                         isVb = 'isVb';
                     }
                 }
             }
             var flag = 'no';
             if(isVb != 'isVb'){
                 var subsidiary = rec.getValue('subsidiary');//附属公司
                 var subArr = ['31','32','33'];//Keenstone Limited、Keenstone Corp、SmareWare, INC
                 for(var i = 0;i < subArr.length;i++){
                     log.debug('采购公司 香港和美国公司',subsidiary + '--' + subArr[i]);
                     if(subsidiary == subArr[i]){
                         flag = 'yes';
                         break;
                     }
                 }
             }
             return flag;
         }
     }
     function getTo(toId){
         if(toId){
             log.debug('to');
             var rec = record.load({
                 type:'transferorder',
                 id:toId,
                 isDynamic:true,
             });
             var subsidiary = rec.getValue('subsidiary');//附属公司
             var subArr = ['31','32','33'];//Keenstone Limited、Keenstone Corp、SmareWare, INC
             var flag = 'no';
             for(var i = 0;i < subArr.length;i++){
                 log.debug('采购公司 香港和美国公司',subsidiary + '--' + subArr[i]);
                 if(subsidiary == subArr[i]){
                     flag = 'yes';
                     break;
                 }
             }
             return flag;
         }
     }
     function getSkuWeight(skuId){
         var item = search.lookupFields({
             type: 'inventoryitem',
             id: skuId,
             columns:['weight']   //货品重量
         });
         return item.weight;
     }
     return {
         beforeLoad: beforeLoad,
         // beforeSubmit: beforeSubmit,
         afterSubmit: afterSubmit
     };
 });
