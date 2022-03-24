/**
 * 销售订单发货
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 */
 define(
    ['N/search', 'N/record', 'N/task','N/file','N/currency','N/format','N/runtime'],
    function(search, record, task,file,currencyRate,format,runtime) {
        function getInputData() {
            var mySearch = initSearch();
            var results = mySearch.run().getRange({
                start: 0,
                end: 1000
            });
            var alls = [];
            var j = 1;
            log.debug({
                title: 'results.length',
                details: results.length
            });
            while (results.length > 0 && j < 10) {
                for (var i = 0; i < results.length; i++) {
                    var result = results[i];
                    var tmp = new Object();
                    tmp.id = result.id;
                    tmp.searchType = mySearch.searchType;
                    alls[alls.length] = tmp;
                }
                results = mySearch.run().getRange({
                    start: 0 + j * 1000,
                    end: 1000 + j * 1000
                });
                j++;
            }
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
            if(value.id){
                var rec = record.load({type:'salesorder',id:value.id,isDynamic:true});
                var soId = value.id;
                var if_id;
                var ir_Id;
                var invoice_Id;
                var vendorbill_Id;
                try{
                    var order_status = rec.getValue('orderstatus');
                    log.debug('orderstatus',order_status);
                    var so_location = rec.getValue('location');//销售订单地点
                    var so_trandate = rec.getValue('trandate');//日期
                    /***------------------------------------------内部订单生成相关单据----------------------------------------- */
                    //发货开票
                    if(order_status == 'B'){//待履行
                        try{
                            log.debug('trandate',so_trandate);
                            //发货
                            var ifRec = record.transform({fromType:'salesorder',fromId:soId,toType:'itemfulfillment',isDynamic: true});
                            ifRec.setValue({fieldId:'trandate',value:format.parse({value:so_trandate,type:format.Type.DATE})});
                            ifRec.setValue({fieldId:'shipstatus',value:'C'});
                            var if_count = ifRec.getLineCount('item');
                            log.debug({
                                title: 'if_count',
                                details: if_count,
                            });
                            for(var f = 0;f < if_count;f++){
                                ifRec.selectLine('item',f);
                                var qty = ifRec.getCurrentSublistValue({
                                    sublistId:'item',
                                    fieldId:'quantity',
                                });
                                log.debug('qty',qty);
                                ifRec.setCurrentSublistValue({
                                    sublistId:'item',
                                    fieldId:'location',
                                    value:so_location,
                                });
                                ifRec.setCurrentSublistValue({
                                    sublistId:'item',
                                    fieldId:'itemreceive',
                                    value:true
                                });
                                ifRec.commitLine('item');
                            }
                            if_id = ifRec.save();
                            log.debug('履行单id',if_id);
                        }catch(e){
                            log.debug('生成履行单报错',e);
                        }
                        try{
                            if(if_id){
                                //开票
                                var invoice_Rec = record.transform({fromType:'salesorder',fromId:soId,toType:'invoice',isDynamic: true});
                                invoice_Rec.setValue({fieldId:'trandate',value:format.parse({value:so_trandate,type:format.Type.DATE})});
                                invoice_Rec.setValue('approvalstatus',2);//已核准
                                invoice_Id = invoice_Rec.save();
                                log.debug('发票id',invoice_Id);
                            }
                        }catch(e){
                            log.debug('履行单后生成发票报错',e);
                        }
                    }
                    // else if(order_status == 'F'){//待开票
                    //     try{
                    //         //开票
                    //         var invoice_Rec = record.transform({fromType:'salesorder',fromId:soId,toType:'invoice',isDynamic: true});
                    //         // invoice_Rec.setValue('approvalstatus',2);//已核准
                    //         invoice_Id = invoice_Rec.save();
                    //         log.debug('发票id',invoice_Id);
                    //     }catch(e){
                    //         log.debug('直接生成发票报错',e);
                    //     }
                    // }
                    /***--------------- */
                    //收货开账单
                    // var nb_po_rec = record.load({type:'purchaseorder',id:nb_po,isDynamic:true});
                    // order_status = nb_po_rec.getValue('orderstatus');
                    // log.debug('po订单状态',order_status);
                    // if(order_status == 'B'){//待收货
                    //     try{
                    //         var ir_Rec = record.transform({
                    //             fromType: 'purchaseorder',
                    //             fromId: nb_po,
                    //             toType: 'itemreceipt',
                    //             isDynamic: true
                    //         });
                    //         ir_Id = ir_Rec.save();
                    //         log.debug('收货单id', ir_Id);
                    //     }catch(e){
                    //         log.debug('生成收货单报错',e);
                    //     }
                    //     try{
                    //         if(ir_Id){
                    //             //账单
                    //             var vendorbill_Rec = record.transform({fromType:'purchaseorder',fromId:nb_po,toType:'vendorbill',isDynamic: true});
                    //             vendorbill_Rec.setValue('approvalstatus',2);//已核准
                    //             // vendorbill_Rec.setValue({fieldId:'trandate',value:changeDate(trandate)});
                    //             vendorbill_Id = vendorbill_Rec.save();
                    //             log.debug('账单id',vendorbill_Id);
                    //         }
                    //     }catch(e){
                    //         log.debug('收货单后生成账单报错',e);
                    //     }
                    // }
                    // else if(order_status == 'F'){//待定账单
                    //     try{
                    //         //账单
                    //         var vendorbill_Rec = record.transform({fromType:'purchaseorder',fromId:nb_po,toType:'vendorbill',isDynamic: true});
                    //         vendorbill_Rec.setValue('approvalstatus',2);//已核准
                    //         // vendorbill_Rec.setValue({fieldId:'trandate',value:changeDate(trandate)});
                    //         vendorbill_Id = vendorbill_Rec.save();
                    //         log.debug('账单id',vendorbill_Id);
                    //     }catch(e){
                    //         log.debug('直接生成账单报错',e);
                    //     }
                    // }
                }catch(e){
                    log.debug('执行错误',e);
                }
            }
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

        function initSearch() {
            var mySearch = search.load('customsearch_cs_so_createdif');
            return mySearch;
        }
        return {
            getInputData: getInputData,
            map: map,
            reduce: reduce,
            summarize: summarize
        };
    });