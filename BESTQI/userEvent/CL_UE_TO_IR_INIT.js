/**
 * @LastEditors: zhouyh
 * @LastEditTime: 2022-01-24 16:38:03
 * @Description: 期初to转单
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define(['N/record','N/search','N/format','N/runtime'],
    function(record,search,format,runtime) {
        function beforeLoad(context) {

        }
        function beforeSubmit(context) {

        }
        function toTransferIrIF(to_Id,items) {
            var ifir_flag = 'N';
            if(to_Id){
                //发货
                try{
                    var to_if_rec = record.transform({
                        fromType: "transferorder",
                        fromId: to_Id,
                        toType: 'itemfulfillment',
                        isDynamic: true,
                    });
                    // to_if_rec.setText('shipstatus','已付运');
                    to_if_rec.setText('customform','BSQ_货品履行(内部交易)');//自定义表格
                    to_if_rec.setValue({fieldId:'shipstatus',value:'C'});
                    to_if_rec.setValue('approvalstatus',2);//已核准
                    var if_count = to_if_rec.getLineCount('item');
                    log.debug('if_count',if_count);
                    if(if_count > 0){
                        for(var i = 0;i < if_count;i++){
                            to_if_rec.selectLine('item',i);
                            var if_sku = to_if_rec.getCurrentSublistValue({
                                sublistId:'item',
                                fieldId:'item',
                            });
                            log.debug('if_sku',if_sku);
                            for(var m = 0;m < items.length;m++){
                                if(if_sku == items[m].sku){
                                    // to_if_rec.setCurrentSublistValue({
                                    //     sublistId:'item',
                                    //     fieldId:'location',
                                    //     value:start_location
                                    // });
                                    to_if_rec.setCurrentSublistValue({
                                        sublistId:'item',
                                        fieldId:'quantity',
                                        value:items[m].qty
                                    });
                                    to_if_rec.setCurrentSublistValue({
                                        sublistId:'item',
                                        fieldId:'itemreceive',
                                        value:true
                                    });
                                    to_if_rec.commitLine('item');
                                    log.debug('end');
                                }
                            }
                        }
                        var to_if_id = to_if_rec.save();
                        log.debug('to_if_id',to_if_id);
                        ifir_flag = 'Y_if';
                        if(to_if_id){
                            //收货
                            try{
                                var to_ir_rec = record.transform({
                                    fromType: "transferorder",
                                    fromId: to_Id,
                                    toType: 'itemreceipt',
                                    isDynamic: true,
                                });
                                var to_ir_id = to_ir_rec.save();
                                log.debug('to_ir_id',to_ir_id);
                                ifir_flag = 'Y_ifir';
                            }catch(e){
                                log.debug('to转收货单报错',e);
                            }
                        }
                    }
                }catch(e){
                    log.debug('to转发货单报错',e);
                }
            }
            return ifir_flag;
        }
        function afterSubmit(context) {
            try{
                var items = new Array();
                var rec = record.load({type:'transferorder',id:context.newRecord.id,isDynamic:true});
                if(rec.getValue('custbody_transfer_qc_deal') == true){
                    var count = rec.getLineCount('item');
                    for(var i = 0;i < count;i++){
                        rec.selectLine('item',i);
                        var sku = rec.getCurrentSublistValue({
                            sublistId:'item',
                            fieldId:'item',
                        });
                        var qty = rec.getCurrentSublistValue({
                            sublistId:'item',
                            fieldId:'quantity',
                        });
                        items.push({
                            "sku":sku,
                            "qty":qty,
                        });
                    }
                    // var start_location = rec.getValue('location');//发货仓
                    log.debug('items',items);
                    if(items.length > 0){
                        toTransferIrIF(rec.id,items);
                    }
                }
            }catch(e){
                log.debug('错误',e);
            }
        }

        return {
            //  beforeLoad: beforeLoad,
            // beforeSubmit: beforeSubmit,
            afterSubmit: afterSubmit
        };
    });

