/**
 * so自动生成IF和IR
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
            try{
                var rec = context.newRecord;
                if(context.type == 'create'){   //todo:测试编辑状态
                    var poId = getNbPo(rec.id);
                    log.debug('poId',poId);
                    if(poId){
                        /** */
                        //货品履行
                        try{
                            var ifRec = record.transform({fromType:'salesorder',fromId:rec.id,toType:'itemfulfillment',isDynamic: true});
                            ifRec.setValue({fieldId:'shipstatus',value:'C'});
                            var ifCount = ifRec.getLineCount('item');
                            for(var i = 0;i < ifCount;i++){
                                ifRec.selectLine('item',i);
                                ifRec.setCurrentSublistValue({
                                    sublistId:'item',
                                    fieldId:'itemreceive',//货品接收
                                    value:true,
                                });
                                ifRec.commitLine('item');
                            }
                            ifRec.setValue('approvalstatus',2);//已核准
                            var ifRecId = ifRec.save();
                            log.debug('ifRecId',ifRecId);
                        }catch(e){
                            log.debug('生成发货单报错',e);
                        }
                        //货品收据
                        try{
                            var irRec = record.transform({fromType:'purchaseorder',fromId:poId,toType:'itemreceipt',isDynamic: true});
                            var irCount = ifRec.getLineCount('item');
                            for(var j = 0;j < irCount;j++){
                                ifRec.selectLine('item',j);
                                ifRec.setCurrentSublistValue({
                                    sublistId:'item',
                                    fieldId:'itemreceive',//货品接收
                                    value:true,
                                });
                                ifRec.commitLine('item');
                            };
                            irRec.setValue('approvalstatus',2);//已核准
                            var irRecId = irRec.save();
                            log.debug('irRecId',irRecId);
                        }catch(e){
                            log.debug('生成货品收据报错',e);
                        }
                        //发票
                        try{
                            var invoiceRec = record.transform({fromType:'salesorder',fromId:rec.id,toType:'invoice',isDynamic: true});
                            var invoiceRecId = invoiceRec.save();
                            log.debug('invoiceRecId',invoiceRecId);
                        }catch(e){
                            log.debug('生成发票报错',e);
                        }
                        //账单
                        try{
                            var vendorRec = record.transform({fromType:'purchaseorder',fromId:poId,toType:'vendorbill',isDynamic: true});
                            vendorRec.setValue('approvalstatus',2);//已核准
                            var vendorRecId = vendorRec.save({ignoreMandatoryFields:true});
                            log.debug('vendorRecId',vendorRecId);
                        }catch(e){
                            log.debug('生成账单报错',e);
                        }
                        /**----------------------------------------- */
                        // var ifRec = record.transform({fromType:'salesorder',fromId:rec.id,toType:'itemfulfillment',isDynamic: true});
                        // ifRec.setValue({fieldId:'shipstatus',value:'C'});
                        // var ifCount = ifRec.getLineCount('item');
                        // for(var i = 0;i < ifCount;i++){
                        //     ifRec.selectLine('item',i);
                        //     ifRec.setCurrentSublistValue({
                        //         sublistId:'item',
                        //         fieldId:'itemreceive',//货品接收
                        //         value:true,
                        //     });
                        //     ifRec.commitLine('item');
                        // }
                        // ifRec.setValue('approvalstatus',2);//已核准
                        // var ifRecId = ifRec.save();
                        // log.debug('ifRecId',ifRecId);
                        // if(ifRecId){
                        //     var irRec = record.transform({fromType:'purchaseorder',fromId:poId,toType:'itemreceipt',isDynamic: true});
                        //     var irCount = ifRec.getLineCount('item');
                        //     for(var j = 0;j < irCount;j++){
                        //         ifRec.selectLine('item',j);
                        //         ifRec.setCurrentSublistValue({
                        //             sublistId:'item',
                        //             fieldId:'itemreceive',//货品接收
                        //             value:true,
                        //         });
                        //         ifRec.commitLine('item');
                        //     };
                        //     irRec.setValue('approvalstatus',2);//已核准
                        //     var irRecId = irRec.save();
                        //     log.debug('irRecId',irRecId);
                        //     if(irRecId){
                        //         var invoiceRec = record.transform({fromType:'salesorder',fromId:rec.id,toType:'invoice',isDynamic: true});
                        //         var invoiceRecId = invoiceRec.save();
                        //         log.debug('invoiceRecId',invoiceRecId);
                        //         if(invoiceRecId){
                        //             var vendorRec = record.transform({fromType:'purchaseorder',fromId:poId,toType:'vendorbill',isDynamic: true});
                        //             vendorRec.setValue('approvalstatus',2);//已核准
                        //             var vendorRecId = vendorRec.save();
                        //             log.debug('vendorRecId',vendorRecId);
                        //         }
                        //     }
                        // }
                    }
                }
            }
            catch (e){
                log.debug('内部交易销售订单生成相关单据报错',e);
            }
        }
        function getNbPo(soId){
            var mySearch = search.create({
                type:'purchaseorder',
                columns:['internalid'],
                filters:[['intercotransaction','anyof',soId]]
            });
            var res = mySearch.run().getRange({start:0,end:1});
            if(res.length > 0){
                var poId = res[0].getValue('internalid');
                return poId;
            }
        }
        return {
            // beforeLoad: beforeLoad,
            // beforeSubmit: beforeSubmit,
            afterSubmit: afterSubmit
        };
    });
