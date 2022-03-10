/**
 * 采购订单赋值单价对于内部交易的供应商单价做加成比例处理
 * 货品数量不嫩大于请购单货品数量
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */
define(['N/error', 'N/search', 'N/format', 'N/currentRecord', 'N/currency', 'N/record', 'N/runtime'],
    function (error, search, format, currentRecord, currencyRate, record, runtime) {
        function pageInit(context) {
            jQuery('#grossamt' + '_formattedValue').attr("disabled", "true");
            jQuery('#amount' + '_formattedValue').attr("disabled", "true");
        }
        function saveRecord(context) {
            // if(context.type == 'create' || context.type == 'edit'){
                var rec = context.currentRecord;
                var vendor = rec.getValue({ fieldId: 'entity' });
                var subsidiary = rec.getValue('subsidiary');//
                var vendorData = vendorBiao(vendor);

                var count = rec.getLineCount('item');
                log.debug('当前采购的货品行', count);
                var flag = 0;
                var error_flag = 'n';
                var pr_id;
                var po_item = new Array();
                var pr_flag;
                if (count > 0) {
                    for (var i = 0; i < count; i++) {
                        rec.selectLine('item', i);
                        var item = rec.getCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'item',
                        });
                        var qty = rec.getCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'quantity'
                        });
                        var prId = rec.getCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'linkedorder'
                        });
                        log.debug('请购单id in for', prId);
                        if (prId) {
                            pr_id = prId;
                        }
                        po_item.push({ "sku": item, "qty": qty });
                        //赋值单价
                        // var itemColumns = search.lookupFields({
                        //     type: 'inventoryitem',
                        //     id: item,
                        //     columns: ['cost']
                        // });
                        // var itemPrice = itemColumns.cost;//采购价格
                        // log.debug('货品采购价格', itemPrice);
                        // if (itemPrice) {
                        //     var mysearch = search.create({
                        //         type: 'customrecord639',
                        //         columns: ['custrecord203'],
                        //         filters: [['custrecord202', 'anyof', subsidiary], 'and', ['isinactive', 'is', false]]
                        //     });
                        //     var res = mysearch.run().getRange({ start: 0, end: 1 });
                        //     log.debug('length', res.length);
                        //     if (res.length > 0) {
                        //         var rate = res[0].getValue('custrecord203');//加成比例
                        //         log.debug('价格相关参数', 'itemPrice:' + itemPrice + '--rate:' + getRate(rate));
                        //         var poPrice = itemPrice * (1 + getRate(rate));
                        //         if (poPrice) {
                        //             log.debug('准备赋值',poPrice);
                        //             rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: poPrice.toFixed(2) });
                        //         }
                        //     }
                        // }
                    }
                    log.debug('pr_flag', pr_flag);
                    log.debug('po_item', po_item);
                    log.debug('pr_id', pr_id);
                     // if(pr_flag){
                     //    alert('错误：货品行第' + pr_flag + '行上的货品没有和请购单相关联，请检查！！');
                     //    return false;
                     // }else
                    if (pr_id) {
                        var pr_item = getPurchaserequisition(pr_id);
                        log.debug('pr_item', pr_item);
                        if (pr_item == 'nopr') {
                            alert('错误：此采购没有请购单');
                            return false;
                        } else {
                            var pr_item_sum = sortItemArray(pr_item);
                            log.debug('pr_item_sum', pr_item_sum);
                            var po_item_sum = sortItemArray(po_item);
                            log.debug('po_item_sum', po_item_sum);
                            if (pr_item_sum && po_item_sum) {
                                for (var r = 0; r < pr_item_sum.length; r++) {
                                    for (var p = 0; p < po_item_sum.length; p++) {
                                        if (pr_item_sum[r].sku != po_item_sum[p].sku) {
                                            error_flag = 'y';
                                        } else {
                                            error_flag = 'n';
                                        }
                                        if (pr_item_sum[r].sku == po_item_sum[p].sku && po_item_sum[p].sumQty > pr_item_sum[r].sumQty) {
                                            error_flag = 'y';
                                        }
                                    }
                                }
                                log.debug('error_flag', error_flag);
                                if (error_flag == 'y') {
                                    alert('错误：采购货品数量不能大于请购单上数量！！')
                                    return false;
                                }
                            }
                        }
                    }
                }
            // }
            return true;
        }
        function getPurchaserequisition(prId) {
            var items = [];
            var mysearch = search.create({
                type: 'purchaserequisition',
                columns: [{
                    name: 'item',
                    type: 'select',
                }, {
                    name: 'quantity',
                    type: 'float',
                }],
                filters: [['internalid', 'is', prId], 'AND', ['mainline', 'is', 'F']]
            });
            var res = mysearch.run().getRange({ start: 0, end: 100 });
            var col = mysearch.columns;
            log.debug('请购单货品行数', res.length);
            if (res.length > 0) {
                for (var i = 0; i < res.length; i++) {
                    var sku = res[i].getValue(col[0]);
                    var qty = res[i].getValue(col[1]);
                    log.debug('sku', sku);
                    items.push({ "sku": sku, "qty": qty });
                }
                return items;
            } else {
                return 'nopr';
            }
        }

        function sortItemArray(itemArray) {   //itemArray是一个[{"sku":'',"qty":''}]格式的数组
            var sumQty_one = Number(0);
            var sumSku_one;
            var sumQty_two = Number(0);
            var sumSku_two;
            var sumQty_thr = Number(0);
            var sumSku_thr;
            var sum_arr = new Array();
            var splice_index_array = new Array();
            if (itemArray) {
                for (var j = 0; j < itemArray.length; j++) {
                    if (itemArray[0].sku == itemArray[j].sku) {
                        sumSku_one = itemArray[0].sku;
                        sumQty_one += Number(itemArray[j].qty);
                        // itemArray.splice(j,1);   //TODO:arr.splice(a,b),a代表列表下标，b代表要从a下标起要删除的元素个数
                        splice_index_array.push(j);
                    }
                }
                sum_arr.push({ "sku": sumSku_one, "sumQty": sumQty_one });
                itemArray = spliceArray(itemArray, splice_index_array);
                log.debug('index_array', splice_index_array);
                log.debug('sum_arr 1', sum_arr);
                log.debug('删除相同元素之后的数组1', JSON.stringify(itemArray) + itemArray.length);
                if (itemArray.length > 1) {
                    for (var m = 0; m < itemArray.length; m++) {
                        if (itemArray[0].sku == itemArray[m].sku) {
                            sumSku_two = itemArray[0].sku;
                            sumQty_two += Number(itemArray[m].qty);
                            // itemArray.splice(m,1);   //删除相同的元素
                            splice_index_array.push(m);
                        }
                    }
                    sum_arr.push({ "sku": sumSku_two, "sumQty": sumQty_two });
                    itemArray = spliceArray(itemArray, splice_index_array);
                    log.debug('sum_arr 2', sum_arr);
                    log.debug('删除相同元素之后的数组2', JSON.stringify(itemArray) + itemArray.length);
                    if (itemArray.length > 1) {
                        for (var n = 0; n < itemArray.length; n++) {
                            if (itemArray[0].sku == itemArray[n].sku) {
                                sumSku_thr = itemArray[0].sku;
                                sumQty_thr += Number(itemArray[n].qty);
                                // itemArray.splice(n,1);   //删除相同的元素
                                splice_index_array.push(n);
                            }
                        }
                        sum_arr.push({ "sku": sumSku_thr, "sumQty": sumQty_thr });
                        itemArray = spliceArray(itemArray, splice_index_array);
                        log.debug('sum_arr 3', sum_arr);
                        log.debug('删除相同元素之后的数组3', JSON.stringify(itemArray) + itemArray.length);
                    } else if (itemArray.length == 1) {  //如果剩余一个数组则将其拼接
                        itemArray[0].sumQty = itemArray[0].qty;
                        sum_arr.push(itemArray[0]);
                    }
                } else if (itemArray.length == 1) {  //如果剩余一个数组则将其拼接
                    itemArray[0].sumQty = itemArray[0].qty;
                    sum_arr.push(itemArray[0]);
                }
            }
            return sum_arr;
        }
        function spliceArray(itemArray, indexArray) {
            if (itemArray && indexArray) {
                for (var i = indexArray.length - 1; i >= 0; i--) {         //TODO:当数组按下标使用splice删除数组元素，应使用倒叙删除
                    itemArray.splice(indexArray[i], 1);
                }
                log.debug('splice item after', itemArray);
                return itemArray;
            }
        }
        function validateField(context) {

        }

        function fieldChanged(context) {
            var currentRec = context.currentRecord;
            var now_fieldid = context.fieldId;
            if (now_fieldid == 'rate') {
                var rate_num = currentRec.getCurrentSublistValue({ sublistId: 'item', fieldId: 'rate' });
                var item_id = currentRec.getCurrentSublistValue({ sublistId: 'item', fieldId: 'item' });
                if (item_id && runtime.getCurrentUser().role != 3) {
                    var rec_data = search.lookupFields({ type: 'item', id: item_id, columns: ['cost'] });
                    var rec_rate = rec_data.cost;
                    if (Number(rate_num) > Number(rec_rate)) {
                        alert('输入价格不能大于货品维护的采购价格:' + rec_rate + '，请重新输入价格！');
                        currentRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: '', ignoreFieldChange: true });
                        currentRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'grossamt', value: '', ignoreFieldChange: true });
                        currentRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'amount', value: '', ignoreFieldChange: true });
                    }
                }
            }
        }

        function postSourcing(context) {
            var currentRec = context.currentRecord;
            var sublistName = context.sublistId;
            var sublistFieldName = context.fieldId;
            var vendor = currentRec.getValue({ fieldId: 'entity' });
            var subsidiary = currentRec.getValue('subsidiary');//
            var vendorData = vendorBiao(vendor);
            log.debug('vendorData', vendorData);
            /***/
            if (vendorData.flag == 1) {
                if (sublistFieldName == 'item') {
                    var itemId = currentRec.getCurrentSublistValue({
                        sublistId: sublistName,
                        fieldId: sublistFieldName
                    });
                    log.debug('itemId', itemId);
                    if (itemId) {
                        var item = search.lookupFields({
                            type: 'inventoryitem',
                            id: itemId,
                            columns: ['cost']
                        });
                        var itemPrice = item.cost;//采购价格
                        log.debug('货品采购价格', itemPrice);
                        if (itemPrice) {
                            var mysearch = search.create({
                                type: 'customrecord639',
                                columns: ['custrecord203'],
                                filters: [['custrecord202', 'anyof', subsidiary], 'and', ['isinactive', 'is', false]]
                            });
                            var res = mysearch.run().getRange({ start: 0, end: 1 });
                            log.debug('length', res.length);
                            if (res.length > 0) {
                                var rate = res[0].getValue('custrecord203');//加成比例
                                log.debug('价格相关参数', 'itemPrice:' + itemPrice + '--rate:' + getRate(rate));
                                var poPrice = itemPrice * (1 + getRate(rate));
                                if (poPrice) {
                                    log.debug('准备赋值');
                                    currentRec.setCurrentSublistText({ sublistId: 'item', fieldId: 'rate', text: poPrice });
                                }
                            }
                            else {
                                // currentRec.setCurrentSublistText({sublistId:'item',fieldId:'rate',text:'0.00'});
                                // alert('该货品暂时没有价格加成比例，请维护');
                            }
                        }
                    }
                }
            }
        }

        function vendorBiao(vendor) {
            log.debug('vendor', vendor);
            var vendorData = {};
            var flag = 0;
            if (vendor) {
                var mysearch = search.create({
                    type: 'vendor',
                    columns: ['subsidiary', 'representingsubsidiary'],
                    filters: [['internalid', 'is', vendor]
                    ]
                });
                if (mysearch.run().getRange({ start: 0, end: 1 }).length > 0) {
                    var repSub = mysearch.run().getRange({ start: 0, end: 1 })[0].getValue('representingsubsidiary');
                    log.debug('内部供应商代表附属公司', repSub);
                    if (repSub) {
                        flag = 1;
                        var vendorSub = mysearch.run().getRange({ start: 0, end: 1 })[0].getValue('subsidiary');
                        vendorData.flag = flag;
                        vendorData.vendorSub = vendorSub;
                    }
                }
            }
            return vendorData;
        }
        function getRate(rate) {
            var r = rate.split('%')[0] / 100;
            return r;
        }
        function changeStringTime(stringTime) {
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