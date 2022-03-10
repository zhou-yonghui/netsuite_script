/**
 * 库存转移单带出po单信息
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */
define(['N/error', 'N/search', 'N/format', 'N/currentRecord', 'N/currency', 'N/record'],
    function(error, search, format, currentRecord, currencyRate, record) {
        function pageInit(context) {
            var rec = context.currentRecord;
            rec.setValue({
                fieldId: 'subsidiary',
                value: 7, //
            });
        }

        function saveRecord(context) {
            var rec = context.currentRecord;
            var count = rec.getLineCount('item');
            var nowLine = 0;
            var flag = 0;
            if(count > 0){
                for(var i = 0;i < count;i++){
                    rec.selectLine('item',i);
                    var fnsku = rec.getCurrentSublistValue({
                        sublistId:'item',
                        fieldId:'custcol_hx_field_inv_o_fnsku',
                    });
                    log.debug('fnsku',fnsku);
                    if(!fnsku){
                        flag = 1;
                        nowLine = i;
                        break;
                    }
                }
                log.debug('nowline',nowLine);
                if(flag == 1){
                    var line = nowLine + 1;
                    alert('货品行第'+ line +'行FNSku不能为空');
                    return false;
                }
            }
            return true;
        }

        function validateField(context) {

        }

        function fieldChanged(context) {
            var rec = context.currentRecord;
            var fieldId = context.fieldId;
            log.debug('fieldId change', fieldId);
            if (fieldId == 'custbody_to_purchase_no') {
                var poId = rec.getValue(fieldId);
                log.debug('poId', poId);
                if (poId.indexOf('PO') == -1 || poId.indexOf('po') == -1 || poId.indexOf('PO0') == -1 || poId.indexOf(
                    'po0') == -1 || poId.indexOf('Po0') == -1 || poId.indexOf('pO0') == -1) {
                    var poData = getPo(poId);
                    log.debug('podata', poData);
                    rec.setValue({
                        fieldId: 'subsidiary',
                        value: poData.subsidiary,
                        ignoreFieldChange: true,
                    })
                    rec.setText({
                        fieldId: 'custbody_hx_field_inv_order_type',
                        text: '调拨至平台仓',
                        ignoreFieldChange: true,
                    });
                    rec.setValue({
                        fieldId: 'location',
                        value: poData.location, //todo：附属公司带不出仓库
                        // ignoreFieldChange: true,
                    });
                    if (poData.saleStore) {
                        rec.setValue({
                            fieldId: 'cseg_hx_fm_store',
                            value: poData.saleStore,
                            ignoreFieldChange: true,
                        });
                    }
                    if (poData.yunying) {
                        rec.setValue({
                            fieldId: 'custbodycust_transfer_operator',
                            value: poData.yunying.yunying,
                            ignoreFieldChange: true,
                        });
                    }
                    // /**先删除行*/
                    var oldCount = rec.getLineCount('item');
                    log.debug('已存在的货品明细行', oldCount);
                    if (oldCount > 0) {
                        for (var j = 0; j < oldCount; j++) {
                            rec.removeLine({
                                sublistId: 'item',
                                line: j,
                                ignoreRecalc: true,
                            })
                        }
                    }
                    if (poData.itemlist.length > 0) {
                        for (var i = 0; i < poData.itemlist.length; i++) {
                            rec.selectNewLine('item');
                            rec.setCurrentSublistValue({ //todo:选好至子公司才能对货品赋值
                                sublistId: 'item',
                                fieldId: 'item',
                                value: poData.itemlist[i].sku,
                                ignoreFieldChange: true
                            });
                            rec.setCurrentSublistValue({
                                sublistId: 'item',
                                fieldId: 'quantity',
                                value: poData.itemlist[i].qty,
                                ignoreFieldChange: true
                            });
                            rec.setCurrentSublistValue({
                                sublistId: 'item',
                                fieldId: 'amount',
                                value: poData.itemlist[i].amount,
                                ignoreFieldChange: true
                            });
                            if (poData.fnsku) {
                                rec.setCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'custcol_hx_field_inv_o_fnsku',
                                    value: poData.fnsku,
                                    ignoreFieldChange: true
                                });
                            }
                            rec.commitLine('item');
                        }
                    }
                }
            }
            /**改变货品数量对金额赋值*/
            else if (fieldId == 'quantity') {
                var cou = rec.getLineCount('item');
                log.debug('cou', cou);
                var itemId = rec.getCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'item'
                });
                log.debug('itemid', itemId);
                if (itemId) {
                    var itemPrice = getInventoryitem(itemId);
                    log.debug('itemprice', itemPrice);
                    if (itemPrice) {
                        var qty = rec.getCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'quantity'
                        });
                        log.debug('数量', qty);
                        rec.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'amount',
                            value: itemPrice * qty
                        });
                    } else {
                        rec.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'amount',
                            value: '0.00'
                        });
                    }
                }
            }
            else if(fieldId == 'item'){
                var storeId = rec.getValue('cseg_hx_fm_store');
                var itemid = rec.getCurrentSublistValue({
                    sublistId:'item',
                    fieldId:'item',
                });
                var ret = getSkuCorrelation(storeId,itemid);
                log.debug('sku映射',ret);
                if(ret.fnsku){
                    rec.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_hx_field_inv_o_fnsku',
                        value:ret.fnsku,
                        ignoreFieldChange: true
                    });
                }
            }
        }

        function getPo(poId) {
            // var poRec = record.load({
            //     type: 'purchaseorder',
            //     id: poId,
            //     isDynamic: true
            // });
            // var location = poRec.getValue('location'); //地点
            // var subsidiary = poRec.getValue('subsidiary'); //子公司
            // var saleStore = poRec.getValue('cseg_hx_fm_store'); //销售店铺
            // var count = poRec.getLineCount('item');
            // var itemList = [];
            // for (var i = 0; i < count; i++) {
            //     var items = {};
            //     poRec.selectLine('item', i);
            //     var sku = poRec.getCurrentSublistValue({
            //         sublistId: 'item',
            //         fieldId: 'item'
            //     });
            //     var qty = poRec.getCurrentSublistValue({
            //         sublistId: 'item',
            //         fieldId: 'quantity'
            //     });
            //     var amount = poRec.getCurrentSublistValue({
            //         sublistId: 'item',
            //         fieldId: 'amount',
            //     })
            //     items.sku = sku;
            //     items.qty = qty;
            //     items.amount = amount;
            //     itemList.push(items);
            // }
            var mysearch = search.create({
                type:'purchaseorder',
                columns:[{
                    name:'location',
                },{
                    name:'subsidiary',
                },{
                    name:'cseg_hx_fm_store'
                },{
                    name:'internalid',
                    join:'item',
                },{
                    name:'quantity',
                    type:'float',
                },{
                    name:'amount',
                    type:'currency',
                }],
                filters:[['internalid','is',poId],'and',['mainline','is','F'],'and',['taxline','is','F']],
            });
            var mysearchBody = search.create({
                type:'purchaseorder',
                columns:['location','subsidiary','cseg_hx_fm_store'],
                filters:[['internalid','is',poId],'and',['mainline','is','T']]
            });
            var resBody = mysearchBody.run().getRange({start:0,end:1});
            var res = mysearch.run().getRange({start: 0,end:1});
            log.debug('可用采购',res.length);
            var itemList = [];
            var items = {};
            if(res.length > 0){
                var col = mysearch.columns;
                var colBody = mysearchBody.columns;
                var location = resBody[0].getValue(colBody[0]); //地点
                var subsidiary = resBody[0].getValue(colBody[1]); //子公司
                var saleStore = resBody[0].getValue(colBody[2]); //销售店铺
                var sku = res[0].getValue(col[3]);
                var qty = res[0].getValue(col[4]);
                var amount = res[0].getValue(col[5]);
                log.debug('poPara location sub store sku qty amount',location + '---sub:' + subsidiary + '--store:' + saleStore + '---sku:' + sku + '---qty:' + qty + '---amount:' + amount);
                /**通过sku和销售店铺找到sku映射表*/
                var yunying = getSkuCorrelation(saleStore, sku);
                if (!yunying.yunying) {
                    yunying = "";
                }
                items.sku = sku;
                items.qty = qty;
                items.amount = amount;
                itemList.push(items);
            }
            return {
                "yunying": yunying,
                "fnsku": yunying.fnsku,
                "saleStore": saleStore,
                "location": location,
                "subsidiary": subsidiary,
                "itemlist": itemList
            };
        }

        function getSkuCorrelation(storeId, sku) {
            log.debug('skuStore para', storeId + '===' + sku);
            var yunying;
            var fnsku;
            if (storeId) {
                var mySearch = search.create({
                    type: 'customrecord_hx_record_skucorrelation',
                    filters: [['custrecord_hx_field_item_store', 'anyof', storeId], 'and', [
                        'custrecord_hx_field_item', 'anyof', sku]],
                    columns: ['custrecord_hx_field_item_saler', 'custrecord_hx_field_item_shopsku']
                });
                var res = mySearch.run().getRange({
                    start: 0,
                    end: 1
                });
                log.debug('sku映射表数量', res.length);
                if (res.length > 0) {
                    yunying = res[0].getValue('custrecord_hx_field_item_saler');
                    fnsku = res[0].getValue('custrecord_hx_field_item_shopsku');
                }
            }
            return {
                "yunying": yunying,
                "fnsku": fnsku
            };
        }

        function postSourcing(context) {
            var currentRec = context.currentRecord;
            var sublistName = context.sublistId;
            var fieldName = context.fieldId;
            log.debug('fieldName', fieldName);
            if (fieldName == 'item') {
                var itemId = currentRec.getCurrentSublistValue({
                    sublistId: sublistName,
                    fieldId: fieldName,
                });
                log.debug('itemId', itemId);
                if (itemId) {
                    var itemPrice = getInventoryitem(itemId);
                    log.debug('itemprice', itemPrice);
                    if (itemPrice) {
                        var qty = currentRec.getCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'quantity'
                        });
                        log.debug('数量', qty);
                        currentRec.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'amount',
                            value: itemPrice * qty
                        });
                    } else {
                        currentRec.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'amount',
                            value: '0.00'
                        });
                    }
                }
            }
            if (fieldName == 'quantity') {
                var qty = currentRec.getCurrentSublistValue({
                    sublistId: sublistName,
                    fieldId: fieldName,
                });
                log.debug('qty', qty);
            }
        }

        function getInventoryitem(sku) {
            var rec = record.load({
                type: 'inventoryitem',
                id: sku,
                isDynamic: true,
            });
            var price = rec.getValue('cost'); //采购价格
            return price;
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
            pageInit: pageInit,
            fieldChanged: fieldChanged,
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