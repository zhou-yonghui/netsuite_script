/**
 * so自动生成IR、发票和账单
 *
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
            try {
                var rec = record.load({type:'salesorder',id:context.newRecord.id,isDynamic:true});
                var nbCurrency = rec.getValue('custbody_internalcurrency');//内部交易币种
                if (context.type == 'create' || context.type == 'edit') {  //todo:测试加编辑条件触发脚本
                    var poData = getNbPo(rec.id);
                    log.debug('poData', poData);
                    var location;
                    if (poData != {}) {
                        if (poData.subsidiary == 12) {
                            // location = getLocation(rec.id);
                            location = rec.getValue('custbody_cs_sp_shck');//shipment收货仓库
                        } else if (poData.subsidiary == 13 || poData.subsidiary == 14) {
                            location = 931;   //香港中转仓
                        }
                        log.debug('location', location);
                        /***/
                        var shipment = rec.getValue('custbody_shipment_id');//
                        var shipmentData = getShipmentData(shipment);
                        var flag = 'flag';
                        if(shipmentData.length > 0){
                            var irRec = record.transform({
                                fromType: 'purchaseorder',
                                fromId: poData.poId,
                                toType: 'itemreceipt',
                                isDynamic: true
                            });
                            irRec.setValue('custbody_internalcurrency',nbCurrency);
                            var count2 = irRec.getLineCount({sublistId: 'item'});
                            if (count2 > 0) {
                                for (var j = 0; j < count2; j++) {
                                    irRec.selectLine({
                                        sublistId: 'item',
                                        line: j
                                    });
                                    var sku = irRec.getCurrentSublistValue({
                                        sublistId:'item',
                                        fieldId:'item'
                                    });
                                    for(var k = 0;k < shipmentData.length;k++){
                                        if(shipmentData[k].nsSku == sku){
                                            flag = Number(k);
                                        }
                                    }
                                    if(flag != 'flag'){
                                        irRec.setCurrentSublistValue({
                                            sublistId: 'item',
                                            fieldId: 'location',
                                            value: location
                                        });
                                        irRec.setCurrentSublistValue({
                                            sublistId:'item',
                                            fieldId:'quantity',
                                            value: shipmentData[flag].qty
                                        })
                                        irRec.commitLine({
                                            sublistId: 'item',
                                        });
                                    }
                                }
                            }
                            var irRecId = irRec.save();
                            log.debug('irRecId', irRecId);
                            if (irRecId) {
                                var invoiceRec = record.transform({
                                    fromType: 'salesorder',
                                    fromId: rec.id,
                                    toType: 'invoice',
                                    isDynamic: true
                                });
                                invoiceRec.setValue('custbody_internalcurrency',nbCurrency);
                                var invoiceRecId = invoiceRec.save();
                                log.debug('invoiceRecId', invoiceRecId);
                                if (invoiceRecId) {
                                    var vendorRec = record.transform({
                                        fromType: 'purchaseorder',
                                        fromId: poData.poId,
                                        toType: 'vendorbill',
                                        isDynamic: true
                                    });
                                    vendorRec.setValue('custbody_internalcurrency',nbCurrency);
                                    var vendorRecId = vendorRec.save();
                                    log.debug('vendorRecId', vendorRecId);
                                }
                            }
                        }
                    }
                }
            } catch (e) {
                log.debug("出错",e)
            }
        }
        function getShipmentData(shipment){
            var shipmentData = [];
            var mysearch = search.create({
                type:'customrecord_inbound_shipment_info',
                columns:['custrecord_shipment_status','internalid'],
                filters:[['custrecord_shipment_id','is',shipment]]
            });
            var res = mysearch.run().getRange({start: 0,end: 1});
            if(res.length > 0){
                var status = res[0].getValue('custrecord_shipment_status');
                if(status == 'CLOSED'){
                    var id = res[0].getValue('internalid');
                    var rec = record.load({type:'customrecord_inbound_shipment_info',id:id,isDynamic:true});
                    var count = rec.getLineCount('recmachcustrecord_item_shipment_id');
                    if(count > 0){
                        for(var i = 0;i < count;i++){
                            var ship = {};
                            var saleSku = rec.getSublistValue({sublistId:'recmachcustrecord_item_shipment_id',fieldId:'custrecord_shipment_item_seller_sku',line:i});//卖方sku
                            var fnSku = rec.getSublistValue({sublistId:'recmachcustrecord_item_shipment_id',fieldId:'custrecord_fulfillment_network_sku',line:i});//FNSku
                            var nsSku = rec.getSublistValue({sublistId:'recmachcustrecord_item_shipment_id',fieldId:'custrecord_shipment_item_oms_sku',line:i});//系统sku
                            var qty = rec.getSublistValue({sublistId:'recmachcustrecord_item_shipment_id',fieldId:'custrecord_quantity_received',line:i});//收货数量
                            ship.saleSku = saleSku;
                            ship.fnSku = fnSku;
                            ship.nsSku = nsSku;
                            ship.qty = qty;
                            shipmentData.push(ship);
                        }
                    }
                }
            }
            return shipmentData;
        }
        function getNbPo(soId){
            var poData = {};
            var mySearch = search.create({
                type:'purchaseorder',
                columns:['internalid','subsidiary'],
                filters:[['intercotransaction','anyof',soId]]
            });
            var res = mySearch.run().getRange({start:0,end:1});
            if(res.length > 0){
                var poId = res[0].getValue('internalid');
                var subsidiary = res[0].getValue('subsidiary');
                poData.poId = poId;
                poData.subsidiary = subsidiary;
            }
            return poData;
        }
        function getLocation(soId){
            var rec = record.load({type:'salesorder',id:soId});
            var status = rec.getValue('status');
            log.debug('销售订单状态',status);
            if(status == '待履行' || status == '待开票' || status == '待开票/部分完成'  || status == '部分完成'){
                var shipmentId = rec.getValue('custbody_shipment_id');
                var mysearch = search.create({
                    type:'customrecord_inbound_shipment_info',
                    columns:['custrecord_shipment_store_id'],
                    filters:[['custrecord_shipment_id','is',shipmentId]]
                });
                var res = mysearch.run().getRange({start: 0,end: 1});
                log.debug('shipment销售订单数量',res.length);
                var storeId = res[0].getValue('custrecord_shipment_store_id');
                log.debug('店铺id',storeId);
                if(res.length > 0 && storeId){
                    var storeRec = record.load({type:'customrecord_cseg_hx_fm_store',id:storeId});
                    var location = storeRec.getValue('custrecord_hx_md_warehouse');
                    log.debug('店铺仓库',location);
                    return location;
                }
            }
        }
        return {
            // beforeLoad: beforeLoad,
            // beforeSubmit: beforeSubmit,
            afterSubmit: afterSubmit
        };
    });
