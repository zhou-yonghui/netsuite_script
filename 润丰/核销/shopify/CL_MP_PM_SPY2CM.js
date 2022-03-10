/**
 * shopify生成单据：1、销售订单币种与payment币种相同，如果已有退货授权根据退货授权生成贷项单，没有则根据销售订单整单生成退货授权，再根据payment生成贷项通知单
 *                2、销售订单币种与payment币种不同，直接根据销售订单整单生成退货授权，再根据payment生成贷项通知单
 *
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 */
 define(
    ['N/search', 'N/record','N/task','N/file'],
    function(search, record, task,file) {
        function getInputData(){
            var alls = [];
            var mySearch = initSearch();
            mySearch.run().each(function(result){
                // var results = result.getValue({name:'internalid'});
                //    log.debug('result',results);
                var tmp = new Object();
                tmp.id = result.id;
                alls[alls.length] = tmp;

                return true;
            });

            log.debug({
                title: 'alls',
                details: JSON.stringify(alls.length)
            });
            return alls;
        }

        function map(context) {
            log.debug({
                title: 'context map',
                details: context
            });
            var value = JSON.parse(context.value);
            doRecord(value.id);
            context.write({
                key:'shopifypaymentId',
                value: value.id,
            });
        }
        function reduce(context) {
            log.debug({
                title: 'context reduce',
                details: context
            });
        }
        function summarize(summary) {
            log.debug({
                title: 'summary',
                details: summary
            });
        }
        function doRecord(id){
            var value = {};
            value.id = id;
            try{
                var itemColumns = search.lookupFields({
                    type: 'customrecord_hx_pay_spf_payment',
                    id: value.id,
                    columns:['custrecord_hx_pay_spf_source_order_id','custrecord_hx_pay_spf_store','custrecord_hx_pay_spf_source_type','custrecord_hx_pay_spf_currency','custrecord_hx_salesordercurrency',
                        'custrecord_hx_pay_spf_fee','custrecord_hx_pay_spf_customer','custrecord_hx_salesorderamount','custrecord_hx_pay_spf_totalamount','custrecord_hx_pay_spf_cmnumber']
                });
                if(itemColumns.custrecord_hx_pay_spf_source_order_id[0].value){
                    var soData = getSoData(itemColumns.custrecord_hx_pay_spf_source_order_id[0].value);
                    log.debug('soData',soData);
                    // log.debug('soData.raIdArr.length',soData.raIdArr.length);
                    // if(soData.raIdArr.length > 0){//存在退货授权直接生成贷项通知单
                    //     if(soData.raIdArr[0] != '未核准退货授权'){
                    //         //根据payment生成贷项通知单
                    //         var cmId = createCreditMemo(soData,itemColumns,value,soData.raIdArr[0]);
                    //         log.debug('有退货授权pay生成贷项通知单',cmId);
                    //         record.submitFields({
                    //             type: 'customrecord_hx_pay_spf_payment',
                    //             id: value.id,
                    //             values: {
                    //                 custrecord_hx_pay_spf_cmnumber:cmId
                    //             },
                    //         });
                    //     }
                    // }else {//没有退货授权，先生成退货授权再生成贷项通知单
                    //     var so2RaRec = record.transform({
                    //         fromType:'salesorder',
                    //         fromId:itemColumns.custrecord_hx_pay_spf_source_order_id[0].value,
                    //         toType:'returnauthorization',
                    //         isDynamic: true
                    //     });
                    //     // so2RaRec.setValue('status','等待收货');
                    //     var so2RaId = so2RaRec.save();
                    //     log.debug('销售订单转退货授权',so2RaId);
                    //     if(so2RaId){
                    //         //根据payment生成贷项通知单
                    //         var cmRecOneId = createCreditMemo(soData,itemColumns,value,so2RaId)
                    //         log.debug('无退货授权pay生成贷项通知单',cmRecOneId);
                    //         record.submitFields({
                    //             type: 'customrecord_hx_pay_spf_payment',
                    //             id: value.id,
                    //             values: {
                    //                 custrecord_hx_pay_spf_cmnumber:cmRecOneId
                    //             },
                    //         });
                    //     }
                    // }
                    /*****直接生成退货授权和贷项****/
                    if(itemColumns.custrecord_hx_pay_spf_totalamount){
                        var raRec = record.create({
                            type:'returnauthorization',
                            isDynamic:true
                        });
                        raRec.setValue('entity',itemColumns.custrecord_hx_pay_spf_customer[0].value);//客户
                        raRec.setText('currency',itemColumns.custrecord_hx_pay_spf_currency[0].text);//币种
                        raRec.setValue('custbody_sales_number',itemColumns.custrecord_hx_pay_spf_source_order_id[0].value);//销售订单号
                        raRec.setValue('custbody_ly_shopify_payment',value.id);//来源shopify
                        raRec.setValue('cseg_hx_fm_platfm',soData.shop_plat);//平台
                        raRec.setValue('cseg_hx_fm_store',soData.shop_store);//店铺
                        raRec.setValue('location',soData.location);//地点
                        raRec.setValue('custbody_store_id',soData.shop_order);//店铺单号
                        var itemList = soData.itemList;
                        for(var i = 0;i < itemList.length;i++){
                            raRec.selectNewLine('item');
                            raRec.setCurrentSublistValue({
                                sublistId:'item',
                                fieldId:'item',
                                value:itemList[i].item,
                            });
                            raRec.setCurrentSublistValue({
                                sublistId:'item',
                                fieldId:'rate',
                                value:Number(-itemColumns.custrecord_hx_pay_spf_totalamount)/Number(itemList[0].qty)
                            });
                            raRec.setCurrentSublistValue({
                                sublistId:'item',
                                fieldId:'quantity',
                                value:Number(itemList[0].qty),
                            });
                            raRec.setCurrentSublistValue({
                                sublistId:'item',
                                fieldId:'amount',
                                value:Number(-itemColumns.custrecord_hx_pay_spf_totalamount),
                            });
                            raRec.commitLine('item');
                        }
                        var ra_rec_id = raRec.save({ignoreMandatoryFields:true});//跳过创建人必填项
                        log.debug('生成的退货授权单',ra_rec_id);
                        if(ra_rec_id){
                            var cmRecOne;
                            cmRecOne = record.transform({
                                fromType:'returnauthorization',
                                fromId:ra_rec_id,
                                toType:'creditmemo',
                                isDynamic: true
                            });
                            cmRecOne.setValue('custbody_ly_shopify_payment',value.id);//关联shopify
                            cmRecOne.setValue('discountrate','0.00');//折扣单价
                            var cmRecOneId = cmRecOne.save({ignoreMandatoryFields:true});//跳过创建人必填项
                            record.submitFields({
                                type: 'customrecord_hx_pay_spf_payment',
                                id: value.id,
                                values: {
                                    custrecord_hx_pay_spf_cmnumber:cmRecOneId
                                },
                            });
                        }
                    }
                }
            }
            catch (e){
                log.debug('生成单据错误',e);
            }
        }
        function createCreditMemo(soData,itemColumns,value,raId){
            var cmRecOne;
            cmRecOne = record.transform({
                fromType:'returnauthorization',
                fromId:raId,
                toType:'creditmemo',
                isDynamic: true
            });
            cmRecOne.setValue('entity',itemColumns.custrecord_hx_pay_spf_customer[0].value);//客户：项目
            cmRecOne.setValue('location',soData.location);
            cmRecOne.setValue('custbody_ly_shopify_payment',value.id);//关联shopify
            cmRecOne.setValue('discountrate','0.00');//折扣单价
            log.debug('币种',itemColumns.custrecord_hx_pay_spf_currency[0].text);
            // cmRecOne.setText('currency',itemColumns.custrecord_hx_pay_spf_currency[0].text);
            for(var i = 0;i < 1;i++){
                cmRecOne.selectLine('item',i);
                cmRecOne.setCurrentSublistValue({
                    sublistId:'item',
                    fieldId:'item',
                    value:soData.itemList[0].item,
                });
                cmRecOne.setCurrentSublistValue({
                    sublistId:'item',
                    fieldId:'quantity',
                    value:Number(soData.itemList[0].qty),
                });
                if(itemColumns.custrecord_hx_pay_spf_totalamount){
                    log.debug('总金额 数量',Number(-itemColumns.custrecord_hx_pay_spf_totalamount) + '----' + Number(soData.itemList[0].qty));
                    cmRecOne.setCurrentSublistValue({
                        sublistId:'item',
                        fieldId:'rate',
                        value:Number(-itemColumns.custrecord_hx_pay_spf_totalamount)/Number(soData.itemList[0].qty)
                    })
                    cmRecOne.setCurrentSublistValue({
                        sublistId:'item',
                        fieldId:'amount',
                        value:Number(-itemColumns.custrecord_hx_pay_spf_totalamount),
                    });
                    cmRecOne.setCurrentSublistValue({
                        sublistId:'item',
                        fieldId:'taxcode',
                        value:5,              //VAT_HK:UNDEF-HK
                    })
                }
                cmRecOne.commitLine('item');
            }
            var cmRecOneId = cmRecOne.save({ignoreMandatoryFields:true});//跳过创建人必填项
            return cmRecOneId;
        }
        function getSoData(soId){
            var rec = record.load({type:'salesorder',id:soId,isDynamic:true});
            var location = rec.getValue('location');
            var shop_plat = rec.getValue('cseg_hx_fm_platfm');//销售平台
            var shop_order = rec.getValue('custbody_hx_so_shoporder');//店铺单号
            var shop_store = rec.getValue('cseg_hx_fm_store');//销售店铺
            var countLinks = rec.getLineCount('links');
            var raIdArr = [];
            var itemList = [];
            // if(countLinks > 0){
            //     for(var i = 0;i < countLinks;i++){
            //         rec.selectLine('links',i);
            //         var type = rec.getCurrentSublistValue({
            //             sublistId:'links',
            //             fieldId:'type',
            //         });
            //         var status = rec.getCurrentSublistValue({
            //             sublistId:'links',
            //             fieldId:'status',
            //         });
            //         log.debug('type status',type + '---' + status);
            //         if((type == '退货授权' || type == 'Return Authorization') && (status != '等待核准' || status != 'Pending Approval')){
            //             var raId = rec.getCurrentSublistValue({
            //                 sublistId:'links',
            //                 fieldId:'id'
            //             });
            //             raIdArr.push(raId);
            //         }else if((type == '退货授权' || type == 'Return Authorization') && (status == '等待核准' || status == 'Pending Approval')){
            //             raIdArr.push('未核准退货授权');
            //         }
            //     }
            // }
            var itemCount = rec.getLineCount('item');
            if(itemCount > 0){
                rec.selectLine('item',0);
               var item = rec.getCurrentSublistValue({
                    sublistId:'item',
                    fieldId:'item'
                });
               var qty = rec.getCurrentSublistValue({
                    sublistId:'item',
                    fieldId:'quantity'
                });
                itemList.push({"item":item,"qty":qty});
            }
            return {"location":location,"shop_plat":shop_plat,"shop_store":shop_store,"shop_order":shop_order,"raIdArr":raIdArr,"itemList":itemList};
        }
        function getSku(storeSku){
            var mySearch = search.create({
                type:'customrecord_hx_record_skucorrelation',
                columns:['custrecord_hx_field_item'],
                filters:[['custrecord_hx_field_item_shopsku','is',storeSku]]
            });
            log.debug('nssku.length',mySearch.length);
            var res = mySearch.run().getRange({start: 0,end: 1});
            for(var i = 0;i < res.length;i++){
                var nsSku = res[i].getValue('custrecord_hx_field_item');
                return nsSku;
            }
        }
        function initSearch() {
            var mySearch = search.load({id:'customsearch_shopify_creditmemo'});
            log.debug({
                title: 'mySearch',
                details: mySearch
            })
            return mySearch;
        }
        return {
            getInputData: getInputData,
            map: map,
            reduce: reduce,
            summarize: summarize
        };
    });