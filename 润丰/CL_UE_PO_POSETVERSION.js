/**
 *
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define(['N/record','N/search','N/format','N/runtime'],
    function(record,search,format,runtime) {
        function beforeLoad(context) {
        }
        function beforeSubmit(context) {
            try{
                if(context.type == 'create' || context.type == 'edit'){
                    var rec = context.newRecord;
                    var vendor = rec.getValue({ fieldId: 'entity' });
                    var subsidiary = rec.getValue('subsidiary');//
                    var vendorData = vendorBiao(vendor);
                    var count = rec.getLineCount('item');
                    log.debug('当前采购的货品行', count);
                    var po_item = new Array();
                    for (var i = 0; i < count; i++) {
                        var item = rec.getSublistValue({
                            sublistId: 'item',
                            fieldId: 'item',
                            line:i,
                        });
                        var qty = rec.getSublistValue({
                            sublistId: 'item',
                            fieldId: 'quantity',
                            line:i,
                        });
                        var prId = rec.getSublistValue({
                            sublistId: 'item',
                            fieldId: 'linkedorder',
                            line:i,
                        });
                        log.debug('请购单id in for', prId);
                        po_item.push({ "sku": item, "qty": qty });
                        //赋值单价
                        var itemColumns = search.lookupFields({
                            type: 'inventoryitem',
                            id: item,
                            columns: ['cost']
                        });
                        var itemPrice = itemColumns.cost;//采购价格
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
                                    log.debug('准备赋值',poPrice);
                                    rec.setSublistValue({ sublistId: 'item', fieldId: 'rate', line:i,value: poPrice.toFixed(2) });
                                }
                            }
                        }
                    }
                }
            }catch (e) {
                log.debug('befor error',e);
            }
        }
        function getRate(rate) {
            var r = rate.split('%')[0] / 100;
            return r;
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
        function afterSubmit(context) {
            var rec = record.load({type:'purchaseorder',id:context.newRecord.id,isDynamic:true});
            var customform = rec.getText('customform');
            log.debug('自定义表格样式',customform);
            if(context.type == 'edit' && customform == 'RP-采购订单'){
                var oldVersion = rec.getValue('custbody_rp_pm_changeversion');//老版本
                log.debug('oldVer',oldVersion);
                if(oldVersion){
                    var num = oldVersion.split('V')[1].split('.')[0];
                    var newNum = Number(num) + Number(1);
                    rec.setValue({fieldId:'custbody_rp_pm_changeversion',value:'V' + newNum + '.0'});
                    rec.setValue({fieldId: 'custbody_rp_pm_revised',value: true});
                    rec.save();
                }
                else {
                    rec.setValue({fieldId:'custbody_rp_pm_changeversion',value:'V1.0'});
                    rec.setValue({fieldId: 'custbody_rp_pm_revised',value: true});
                    rec.save();
                }
            }
        }
        return {
            // beforeLoad: beforeLoad,
            beforeSubmit: beforeSubmit,
            // afterSubmit: afterSubmit
        };
    });
