/**
 * 采购订单点击创建质检跳转到CS质检结果记录
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define(['N/record', 'N/http', 'N/search'],
    function(record, http, search) {
        function beforeLoad(context) {
            try {
                if (context.type == 'create') {
                    var itemList = [];
                    var recZj = context.newRecord;
                    var poId = context.request.parameters.poId;
                    if (poId) {
                        var rec = record.load({
                            type: record.Type.PURCHASE_ORDER,
                            id: poId
                        });
                        var vendor = rec.getValue('entity');//供应商
                        var count = rec.getLineCount({sublistId:'item'});
                        if(count > 0){
                            var itemdata = {};
                            for(var i = 0;i < count;i++){
                                var item = rec.getSublistValue({sublistId: 'item',fieldId:'item',line:i});
                                var qty = rec.getSublistValue({sublistId:'item',fieldId: 'quantity',line:i});
                                var units = rec.getSublistValue({sublistId:'item',fieldId:'unit_display',line:i});
                                var line = rec.getSublistValue({sublistId:'item',fieldId:'line',line:i});
                                itemdata.item = item;
                                itemdata.qty = qty;
                                itemdata.units =units;
                                itemdata.line = line;
                                itemList.push(itemdata);
                            }
                            log.debug('itemList',itemList);
                            log.debug('poId',poId);
                            recZj.setValue('custrecord_cs_gddh_record', poId);
                            recZj.setValue({fieldId:'custrecord_cs_po_vendor',value: vendor});
                            for(var j = 0;j < itemList.length;j++){
                                var zjDetailRec = record.create({
                                    type:'customrecord_cs_zj_detail',
                                });
                                zjDetailRec.setValue({fieldId:'custrecord_cs_hxh_entity',value:itemList[j].line});
                                zjDetailRec.setValue({fieldId:'custrecord_cs_cgdd_record',value: poId});
                                zjDetailRec.setValue({fieldId:'custrecord_cs_gys_record',value: vendor});
                                zjDetailRec.setValue({fieldId:'custrecord205',value:itemList[j].item});
                                zjDetailRec.setValue({fieldId:'custrecord_cs_ddsl_number',value:itemList[j].qty});
                                var detailId = zjDetailRec.save();
                                log.debug('detailId',detailId);
                            }
                        }

                    }
                }
            } catch (error) {
                log.debug('ERROR', error);
            }
        }
        return {
            beforeLoad: beforeLoad
        };
    });