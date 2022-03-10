/**
 * 内部采购赋值未税单价
 *外部采购赋值含税单价、未税单价
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
 define(['N/record','N/search','N/format','N/runtime','N/currency'],
 function(record,search,format,runtime,currencyRate) {
     function beforeLoad(context) {
     }
     function beforeSubmit(context) {
         try{
             //context.type == 'create' ||
             if(context.type == 'create' || context.type == 'edit'){
                 //if(context.type == 'create'){
                 //if(context.type == 'edit'){
                 var rec = context.newRecord;
                 var order_status = rec.getValue('orderstatus');//订单状态
                 var approval_status = rec.getValue('approvalstatus');//审批状态
                 log.debug('审批状态',approval_status);
                 log.debug('订单状态',order_status);
                 if(order_status == 'B' || order_status == 'A'){
                    var vendor = rec.getValue('entity');
                    var currency = rec.getValue('currency');//采购币种
                    var nbcurrency = rec.getValue('custbody_internalcurrency');//内部交易币种
                    var retVen = getVendor(vendor);
                    var jjl;
                    var itemlistArr = [];
                    if(retVen.isNb == 'Y'){
                        var gsjjjSearch = search.create({
                            type: "customrecord_cs_gsjjj_record",
                            columns: ['custrecord_cs_jjl_record', 'custrecord_cs_sfsx_record_c1'],
                            filters: [
                                ['custrecord_cs_cgzt_record', 'anyof', retVen.sub],
                                'AND',
                                ['custrecord_cs_xszt_record', 'anyof', retVen.repSub],
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
                        /**对采购订单货品行单价*/
                        var count = rec.getLineCount('item');
                        log.debug('当前采购货品行数',count);
                        if(count > 0){
                            for(var i = 0;i < count;i++){
                                var itemText = rec.getSublistValue({
                                    sublistId:'item',
                                    fieldId:'item_display',
                                    line:i,
                                });
                                log.debug('itemText',itemText);
                                var qty = rec.getSublistValue({
                                    sublistId:'item',
                                    fieldId:'quantity',
                                    line:i,
                                });
                                /**获取货品仓库数量加权价格*/
                                var averagecost = getInventoryOrAssemblyItem(itemText,retVen.repSubText);
                                log.debug('averagecost',averagecost);
                                if(averagecost > 0){
                                    var rate = getChangeRate(retVen.venCurrency,currency);
                                    var nbRate = getChangeRate(retVen.venCurrency,nbcurrency);
                                    log.debug('货币汇率',rate + '---nbrate:' + nbRate);
                                    var price = Number(Number(averagecost)*(1+jjl)*rate);
                                    log.debug('price',price.toFixed(2));
                                    var nbPrice = Number(Number(averagecost)*(1+jjl)*nbRate);
                                    rec.setSublistValue({
                                        sublistId: 'item',
                                        fieldId: 'rate',
                                        value:price.toFixed(2),         //未税单价
                                        line:i,
                                    });
                                    rec.setSublistValue({
                                        sublistId:'item',
                                        fieldId:'custcol_cs_hsdj1_c1',
                                        value: '0.00',
                                        line:i,
                                    });
                                    rec.setSublistValue({
                                        sublistId:'item',
                                        fieldId:'custcol_cs_nbjyj_line',                                //内部交易价格
                                        value:nbPrice.toFixed(2),
                                        line:i,
                                    });
                                    rec.setSublistValue({
                                        sublistId:'item',
                                        fieldId:'custcol_cs_nbjybz_line',                               //内部交易币种
                                        value:nbcurrency,
                                        line:i,
                                    });
                                }
                                else {
                                    rec.setSublistValue({
                                        sublistId: 'item',
                                        fieldId: 'rate',
                                        value:'0.00',         //未税单价
                                        line:i,
                                    });
                                    rec.setSublistValue({
                                        sublistId:'item',
                                        fieldId:'custcol_cs_hsdj1_c1',
                                        value: '0.00',
                                        line:i,
                                    });
                                  rec.setSublistValue({
                                        sublistId:'item',
                                        fieldId:'custcol_cs_nbjyj_line',                                //内部交易价格
                                        value:'0.00',
                                        line:i,
                                    });
                                }
                            }
                        }
                    }
                    else {
                        var count2 = rec.getLineCount('item');
                        if(count2 > 0 && approval_status == 1){//审批状态为等待核准
                            for(var m = 0;m < count2;m++){
                                var item2 = rec.getSublistValue({
                                    sublistId:'item',
                                    fieldId:'item',
                                    line:m,
                                });
                                /**获取采购价目表未税单价*/
                                var priceBiao = getPoPriceList(vendor,item2);
                                log.debug('priceBiao',priceBiao);
                                if(priceBiao.hsPrice || priceBiao.wsPrice){
                                    if(priceBiao.hsPrice){
                                        rec.setSublistValue({
                                            sublistId:'item',
                                            fieldId:'custcol_cs_hsdj1_c1',
                                            value: priceBiao.hsPrice,
                                            line:m,
                                        });
                                    }
                                    if(priceBiao.wsPrice){
                                        rec.setSublistValue({
                                            sublistId: 'item',
                                            fieldId: 'rate',
                                            value:priceBiao.wsPrice,         //未税单价
                                            line:m,
                                        });
                                    }
                                }
                                else {
                                    rec.setSublistValue({
                                        sublistId:'item',
                                        fieldId:'custcol_cs_hsdj1_c1',
                                        value: '0.00',
                                        line:m,
                                    });
                                    rec.setSublistValue({
                                        sublistId: 'item',
                                        fieldId: 'rate',
                                        value:'0.00',         //未税单价
                                        line:m,
                                    });
                                }
                            }
                        }
                    }
                 }
             }
         } catch (e) {
             log.debug("出错单号："+context.newRecord.id,e)
         }
     }
     function afterSubmit(context) {

     }
     function getChangeRate(sourceCur,targetCur){
         if(sourceCur && targetCur){
             var rateAll = currencyRate.exchangeRate({
                 source: sourceCur,
                 target: targetCur,
                 date: new Date()
             });
             return rateAll;
         }
     }
     function getPoPriceList(vendor,item){
         var mysearch = search.create({
             type:'customrecord_cs_pricelist_record',
             columns:['custrecord_cs_hsj_c1','custrecord_hrkpo_pricelist_price','custrecord_cs_sfsx_sku'],
             filters:[['custrecord_cspo_pricelist_supplier','anyof',vendor],'and',['custrecord_cspo_pricelist_goods','anyof',item],
                 'AND',['isinactive','is',false]],
         });
         var res = mysearch.run().getRange({start: 0,end: 10});
         log.debug('价目表条数',res.length + '---价目表信息:' + JSON.stringify(res));
         if(res.length > 0){
             if(res[0].getValue('custrecord_cs_sfsx_sku') == false){
                 var hsPrice = res[0].getValue('custrecord_cs_hsj_c1');
                 log.debug('含税单价',hsPrice);
                 var wsPrice = res[0].getValue('custrecord_hrkpo_pricelist_price');
                 log.debug('未税单价',wsPrice);
                 if(hsPrice > 0 || wsPrice > 0){
                     return {"hsPrice":hsPrice,"wsPrice":wsPrice};
                 }
                 else {
                     return {"hsPrice":'0.00',"wsPrice":'0.00'};
                 }
             }
         }
         else {
             return {"hsPrice":'0.00',"wsPrice":'0.00'};
         }
     }
     function getInventoryOrAssemblyItem(itemText,repSub){
         var sumCost = Number(0);
         var sumNum = Number(0);
         var cost;
         /**-------------------------------------------*/
             // var mysearch = search.load({id:'customsearch_cl_locationprice_2'});//货品地点平均成本搜索
         var mysearch = search.create({
                 type:'item',
                 filters:[
                     // ['subsidiary','inventorylocation','anyof',repSub],
                     ['locationaveragecost','greaterthan','0.00'],
                     'AND',['quantityavailable','greaterthan',0],
                     'AND',['name','haskeywords',itemText]
                 ],
                 columns:[{
                     name:'subsidiary',
                     join:'inventoryLocation',
                     type:'multiselect'
                 },{
                     name:'inventorylocation',
                     type:'select'
                 },{
                     name:'itemid',
                     type:'text',
                 },{
                     name:'locationaveragecost',
                     type:'currency2'
                 },{
                     name:'locationquantityavailable',
                     type:'float'
                 }]
             });
         /**--------------------------------------------**/
         // var col = mysearch.run();
         // log.debug('col',JSON.stringify(col));
         // mysearch.run().each(function (res){
         //     var item = res.getValue('itemid');
         //     var sub = res.getValue('subsidiary');
         //     if(sub != null){
         //         log.debug('sub repsub',sub + '---' + repSub);
         //     }
         //     // log.debug('item itemText',item + '---' + itemText);
         //     if(item == itemText && repSub == sub){
         //         var locationAverageCost = res.getValue('locationaveragecost');
         //         var locationNumber = res.getValue('locationquantityavailable');
         //         log.debug('locationAverageCost locationNumber',locationAverageCost + '----' + locationNumber);
         //         if(locationNumber){
         //             sumCost += Number(locationAverageCost) * Number(locationNumber);
         //             sumNum += Number(locationNumber);
         //         }
         //     }
         //     return true;
         // });
         /**----------------------------------*/
         var col = mysearch.columns;
         var res = mysearch.run().getRange({start:0,end:1000});
         log.debug('res',JSON.stringify(res));
         for(var i = 0;i < res.length;i++){
             var item = res[i].getValue(col[2]);
             var sub = res[i].getValue(col[0]);
             // log.debug('sub repsub',sub + '---' + repSub);
             // log.debug('item itemText',item + '---' + itemText);
             if(item == itemText && repSub == sub){
                 var locationAverageCost = res[i].getValue(col[3]);
                 var locationNumber = res[i].getValue(col[4]);
                 log.debug('locationAverageCost locationNumber',locationAverageCost + '----' + locationNumber);
                 if(locationNumber){
                     sumCost += Number(locationAverageCost) * Number(locationNumber);
                     sumNum += Number(locationNumber);
                 }
             }
         }
         /*******---------------搜索结果分页----------------***/
         // var myPagedData = mysearch.runPaged({
         //     pageSize:500
         // });
         // myPagedData.pageRanges.forEach(function(pageRange){
         //     var myPage = myPagedData.fetch({index: pageRange.index});
         //     myPage.data.forEach(function(result){
         //         // var entity = result.getValue({
         //         //     name: 'entity'
         //         // });
         //         var subsidiary = result.getValue({
         //             name: 'subsidiary'
         //         });
         //         log.debug('sub',subsidiary);
         //     });
         // });

         log.debug('sumCost sumNum',sumCost + '---' + sumNum);
         cost = sumCost/sumNum;
         return cost;
     }
     function getVendor(vendor){
         var rec = record.load({
             type:'vendor',
             id:vendor,
             isDynamic:true,
         });
         var sub = rec.getValue('subsidiary');
         var repSub = rec.getValue('representingsubsidiary');
         var repSubText = rec.getText('representingsubsidiary');
         if(sub && repSub){
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
             return {"sub":sub,"repSub":repSub,"repSubText":repSubText,"isNb":'Y',"venCurrency":cur};
         }
         else {
             return {"isNb":"N"};
         }
     }


     return {
         // beforeLoad: beforeLoad,
         beforeSubmit: beforeSubmit,
         // afterSubmit: afterSubmit
     };
 });
