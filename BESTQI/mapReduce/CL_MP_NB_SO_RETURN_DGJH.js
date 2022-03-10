/**
 * 内部交易销售订单回写订柜计划明细
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
                    var nb_po = rec.getValue('intercotransaction');
                    var order_status = rec.getValue('orderstatus');
                    log.debug('nb_po',nb_po);
                    log.debug('orderstatus',order_status);
                    var so_location = record.load({type:'salesorder',id:soId,isDynamic:true}).getValue('location');//销售订单地点
                    if(nb_po && rec.getValue('custbody_document_generated') == false){
                        /***------------------------------------------内部订单生成相关单据----------------------------------------- */
                        //发货开票
                        if(order_status == 'B'){//待履行
                            try{
                                //发货
                                var ifRec = record.transform({fromType:'salesorder',fromId:soId,toType:'itemfulfillment',isDynamic: true});
                                ifRec.setValue({fieldId:'shipstatus',value:'C'});
                                var if_count = ifRec.getLineCount('item');
                                for(var f = 0;f < if_count;f++){
                                    ifRec.selectLine('item',f);
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
                                    // invoice_Rec.setValue('approvalstatus',2);//已核准
                                    invoice_Id = invoice_Rec.save();
                                    log.debug('发票id',invoice_Id);
                                }
                            }catch(e){
                                log.debug('履行单后生成发票报错',e);
                            }
                        }
                        else if(order_status == 'F'){//待开票
                            try{
                                //开票
                                var invoice_Rec = record.transform({fromType:'salesorder',fromId:soId,toType:'invoice',isDynamic: true});
                                // invoice_Rec.setValue('approvalstatus',2);//已核准
                                invoice_Id = invoice_Rec.save();
                                log.debug('发票id',invoice_Id);
                            }catch(e){
                                log.debug('直接生成发票报错',e);
                            }
                        }
                        //发货开票成功之后勾选内部so的单据已生成字段
                        if(order_status == 'B'){
                            if(if_id && invoice_Id){
                                record.submitFields({
                                    type: 'salesorder',
                                    id: soId,
                                    values: {
                                        custbody_document_generated:true
                                    },
                                    
                                });
                            }
                        }
                        else if(order_status == 'F'){
                            if(invoice_Id){
                                record.submitFields({
                                    type: 'salesorder',
                                    id: soId,
                                    values: {
                                        custbody_document_generated:true
                                    },
                                    
                                });
                            }
                        }
                        /***--------------- */
                        //收货开账单
                        var nb_po_rec = record.load({type:'purchaseorder',id:nb_po,isDynamic:true});
                        order_status = nb_po_rec.getValue('orderstatus');
                        log.debug('po订单状态',order_status);
                        if(order_status == 'B'){//待收货
                            try{
                                var ir_Rec = record.transform({
                                    fromType: 'purchaseorder',
                                    fromId: nb_po,
                                    toType: 'itemreceipt',
                                    isDynamic: true
                                });
                                ir_Id = ir_Rec.save();
                                log.debug('收货单id', ir_Id);
                            }catch(e){
                                log.debug('生成收货单报错',e);
                            }
                            try{
                                if(ir_Id){
                                    //账单
                                    var vendorbill_Rec = record.transform({fromType:'purchaseorder',fromId:nb_po,toType:'vendorbill',isDynamic: true});
                                    vendorbill_Rec.setValue('approvalstatus',2);//已核准
                                    // vendorbill_Rec.setValue({fieldId:'trandate',value:changeDate(trandate)});
                                    vendorbill_Id = vendorbill_Rec.save();
                                    log.debug('账单id',vendorbill_Id);
                                }
                            }catch(e){
                                log.debug('收货单后生成账单报错',e);
                            }
                        }
                        else if(order_status == 'F'){//待定账单
                            try{
                                //账单
                                var vendorbill_Rec = record.transform({fromType:'purchaseorder',fromId:nb_po,toType:'vendorbill',isDynamic: true});
                                vendorbill_Rec.setValue('approvalstatus',2);//已核准
                                // vendorbill_Rec.setValue({fieldId:'trandate',value:changeDate(trandate)});
                                vendorbill_Id = vendorbill_Rec.save();
                                log.debug('账单id',vendorbill_Id);
                            }catch(e){
                                log.debug('直接生成账单报错',e);
                            }
                        }
                        //发货开票成功之后勾选内部po的单据已生成字段
                        if(order_status == 'B'){
                            if(ir_Id && vendorbill_Id){
                                record.submitFields({
                                    type: 'purchaseorder',
                                    id: nb_po,
                                    values: {
                                        custbody_document_generated:true
                                    },
                                    
                                });
                            }
                        }
                        else if(order_status == 'F'){
                            if(vendorbill_Id){
                                record.submitFields({
                                    type: 'purchaseorder',
                                    id: nb_po,
                                    values: {
                                        custbody_document_generated:true
                                    },
                                    
                                });
                            }
                        }
                        /***------------------------------回写订柜计划单明细或者平台调货单-----------------------------------------*/
                        log.debug('soid ir if iv vb',soId + '---' +ir_Id + '--' + if_id + '--' + invoice_Id + '--' + vendorbill_Id);
                        var dgjh_detail_id = nb_po_rec.getValue('custbody_dingguijihuamingxi');//订柜计划明细id
                        var ptdh_detail_id = nb_po_rec.getValue('custbody_hl_transfer_order');//平台调货单明细id
                        log.debug('dgjh_detail_id ptdh_detail_id',dgjh_detail_id + '---' + ptdh_detail_id);
                        //回写订柜计划明细
                        if(dgjh_detail_id){
                            var save_flag = 'N';
                            var dgjh_detail_rec = record.load({
                                type:'customrecord_sl_dg_detail',
                                id:dgjh_detail_id,
                                isDynamic:true,
                            });
                            var ir_one_date = dgjh_detail_rec.getValue('custrecord_first_warehousing_date');
                            log.debug('ir_one_date',ir_one_date);
                            var if_one_date = dgjh_detail_rec.getValue('custrecord_out_of_warehouse_time');
                            log.debug('if_one_date',if_one_date);
                            if(soId){
                                record.submitFields({
                                    type:'customrecord_sl_dg_detail',
                                    id:dgjh_detail_id,
                                    values:{
                                        custrecord_sl_dg_gsj_so:getArray('custrecord_sl_dg_gsj_so',dgjh_detail_rec,soId),
                                    }
                                });
                            }
                            if(ir_Id){
                                if(!ir_one_date){
                                    record.submitFields({
                                        type:'customrecord_sl_dg_detail',
                                        id:dgjh_detail_id,
                                        values:{
                                            custrecord_po_receive1:getArray('custrecord_po_receive1',dgjh_detail_rec,ir_Id),
                                            custrecord_first_warehousing_date:format.parse({value:new Date(new Date().getTime()+(parseInt(new Date().getTimezoneOffset()/60) + 8)*3600*1000),type:format.Type.DATE}),
                                        }
                                    });
                                }else{
                                    record.submitFields({
                                        type:'customrecord_sl_dg_detail',
                                        id:dgjh_detail_id,
                                        values:{
                                            custrecord_po_receive1:getArray('custrecord_po_receive1',dgjh_detail_rec,ir_Id),
                                        }
                                    });
                                }
                            }
                            if(vendorbill_Id){
                                record.submitFields({
                                    type:'customrecord_sl_dg_detail',
                                    id:dgjh_detail_id,
                                    values:{
                                        custrecord_po_bill1:getArray('custrecord_po_bill1',dgjh_detail_rec,vendorbill_Id),
                                    }
                                });
                            }
                            if(if_id){
                                if(!if_one_date){
                                    record.submitFields({
                                        type:'customrecord_sl_dg_detail',
                                        id:dgjh_detail_id,
                                        values:{
                                            custrecord_so_fullfillment1:getArray('custrecord_so_fullfillment1',dgjh_detail_rec,if_id),
                                            custrecord_out_of_warehouse_time:format.parse({value:new Date(new Date().getTime()+(parseInt(new Date().getTimezoneOffset()/60) + 8)*3600*1000),type:format.Type.DATE}),
                                        }
                                    });
                                }
                                else {
                                    record.submitFields({
                                        type:'customrecord_sl_dg_detail',
                                        id:dgjh_detail_id,
                                        values:{
                                            custrecord_so_fullfillment1:getArray('custrecord_so_fullfillment1',dgjh_detail_rec,if_id),
                                        }
                                    });
                                }
                            }
                            if(invoice_Id){
                                record.submitFields({
                                    type:'customrecord_sl_dg_detail',
                                    id:dgjh_detail_id,
                                    values:{
                                        custrecord_so_invoice1:getArray('custrecord_so_invoice1',dgjh_detail_rec,invoice_Id),
                                    }
                                });
                            }
                            if(ir_Id &&  vendorbill_Id && if_id &&  invoice_Id){
                                record.submitFields({
                                    type:'customrecord_sl_dg_detail',
                                    id:dgjh_detail_id,
                                    values:{
                                        custrecord_internal_transactions:true,   //公司间交易是否完结
                                    }
                                });
                            }

                            /*****---------------------------------------------- */
                            // var dgjh_detail_rec = record.load({
                            //     type:'customrecord_sl_dg_detail',
                            //     id:dgjh_detail_id,
                            //     isDynamic:true,
                            // });
                            // var one_nb_po_arr = dgjh_detail_rec.getValue('custrecord_sl_dg_gsj_po');//一级内部po
                            // var two_nb_po_arr = dgjh_detail_rec.getValue('custrecord_sl_dg_gsj_po2');//二级内部po
                            // log.debug('one_nb_po_arr',one_nb_po_arr);
                            // log.debug('two_nb_po_arr',two_nb_po_arr);
                            // if(one_nb_po_arr.length > 0){
                            //     var one_ret_flag = matchPo(one_nb_po_arr,nb_po);
                            //     log.debug('one_ret_flag',one_ret_flag);
                            //     if(one_ret_flag == 'Y'){//一级内部交易
                            //         if(soId){
                            //             dgjh_detail_rec.setValue('custrecord_sl_dg_gsj_so',getArray('custrecord_sl_dg_gsj_so',dgjh_detail_rec,soId));//一级so
                            //         }
                            //         if(ir_Id){
                            //             dgjh_detail_rec.setValue('custrecord_po_receive1',getArray('custrecord_po_receive1',dgjh_detail_rec,ir_Id));//一级收据
                            //         }
                            //         if(vendorbill_Id){
                            //             dgjh_detail_rec.setValue('custrecord_po_bill1',getArray('custrecord_po_bill1',dgjh_detail_rec,vendorbill_Id));//一级账单
                            //         }
                            //         if(if_id){
                            //             dgjh_detail_rec.setValue('custrecord_so_fullfillment1',getArray('custrecord_so_fullfillment1',dgjh_detail_rec,if_id));//一级实施单
                            //         }
                            //         if(invoice_Id){
                            //             dgjh_detail_rec.setValue('custrecord_so_invoice1',getArray('custrecord_so_invoice1',dgjh_detail_rec,invoice_Id));//一级发票
                            //         }
                            //         save_flag = 'Y';
                            //         if(ir_Id &&  vendorbill_Id && if_id &&  invoice_Id){
                            //             dgjh_detail_rec.setValue('custrecord_internal_transactions',true);//公司间交易是否完结
                            //         }
                            //     }
                            //     else{
                            //         if(two_nb_po_arr.length > 0){
                            //             var two_ret_flag = matchPo(two_nb_po_arr,nb_po);
                            //             log.debug('two_ret_flag',two_ret_flag);
                            //             if(two_ret_flag == 'Y'){
                            //                 if(soId){
                            //                     dgjh_detail_rec.setValue('custrecord_sl_dg_gsj_so2',getArray('custrecord_sl_dg_gsj_so2',dgjh_detail_rec,soId));//二级so
                            //                 }
                            //                 if(ir_Id){
                            //                     dgjh_detail_rec.setValue('custrecord_po_receive2',getArray('custrecord_po_receive2',dgjh_detail_rec,ir_Id));//二级收据  
                            //                 }
                            //                 if(vendorbill_Id){
                            //                     dgjh_detail_rec.setValue('custrecord_po_bill2',getArray('custrecord_po_bill2',dgjh_detail_rec,vendorbill_Id));//二级账单
                            //                 }
                            //                 if(if_id){
                            //                     dgjh_detail_rec.setValue('custrecord_so_fullfillment2',getArray('custrecord_so_fullfillment2',dgjh_detail_rec,if_id));//二级实施单  
                            //                 }
                            //                 if(invoice_Id){
                            //                     dgjh_detail_rec.setValue('custrecord_so_invoice2',getArray('custrecord_so_invoice2',dgjh_detail_rec,invoice_Id));//二级发票  
                            //                 }
                            //                 save_flag = 'Y';
                            //                 if(ir_Id &&  vendorbill_Id && if_id &&  invoice_Id){
                            //                     dgjh_detail_rec.setValue('custrecord_internal_transactions',true);//公司间交易是否完结
                            //                 }
                            //             }
                            //         }
                            //     }
                                
                            // }
                            // if(save_flag == 'Y'){
                            //     dgjh_detail_rec.save();
                            // }
                        }
                        //回写平台调货明细
                        else if(ptdh_detail_id){
                            var ptdh_detail_rec = record.load({
                                type:'customrecord_hl_platform_transfer_detail',
                                id:ptdh_detail_id,
                                isDynamic:true,
                            });
                            var detail_po = ptdh_detail_rec.getValue('custrecord_hl_seasoning_condiments_po');//调货单公司间po
                            if(detail_po == nb_po){
                                ptdh_detail_rec.setValue('custrecord_hl_seasoning_condiments_so',soId);//调货单公司间so

                                ptdh_detail_rec.save();
                            }
                        }
                    }
                }catch(e){
                    log.debug('执行错误',e);
                }
            }
        }
        function getArray(fieldId,dgjh_detail_rec,order_id) {
            var s01_arr_1 = new Array();
            var ir1_arr_1 = new Array();
            var vb1_arr_1 = new Array();
            var if1_arr_1 = new Array();
            var iv1_arr_1 = new Array();
            var s01_arr_2 = new Array();
            var ir1_arr_2 = new Array();
            var vb1_arr_2 = new Array();
            var if1_arr_2 = new Array();
            var iv1_arr_2 = new Array();
            if(fieldId){
               if(fieldId == 'custrecord_sl_dg_gsj_so'){
                   var so1_arr = dgjh_detail_rec.getValue('custrecord_sl_dg_gsj_so');
                   if(so1_arr.length > 0){
                       s01_arr_1 = arrayAdd(so1_arr,s01_arr_1);
                       s01_arr_1.push(order_id);
                   }else{
                       s01_arr_1.push(order_id);
                   }
                   return s01_arr_1;
               }
               else if(fieldId == 'custrecord_po_receive1'){
                   var ir1_arr = dgjh_detail_rec.getValue('custrecord_po_receive1');
                   if(ir1_arr.length > 0){
                       ir1_arr_1 = arrayAdd(ir1_arr,ir1_arr_1);
                       ir1_arr_1.push(order_id);
                   }else{
                       ir1_arr_1.push(order_id);
                   }
                   return ir1_arr_1;
               }
               else if(fieldId == 'custrecord_po_bill1'){
                   var vb1_arr = dgjh_detail_rec.getValue('custrecord_po_bill1');
                   if(vb1_arr.length > 0){
                       vb1_arr_1 = arrayAdd(vb1_arr,vb1_arr_1);
                       vb1_arr_1.push(order_id);
                   }else{
                       vb1_arr_1.push(order_id);
                   }
                   return vb1_arr_1;
               }
               else if(fieldId == 'custrecord_so_fullfillment1'){
                   var if1_arr = dgjh_detail_rec.getValue('custrecord_so_fullfillment1');
                   if(if1_arr.length > 0){
                       if1_arr_1 = arrayAdd(if1_arr,if1_arr_1);
                       if1_arr_1.push(order_id);
                   }else{
                       if1_arr_1.push(order_id);
                   }
                   return if1_arr_1;
               }
               else if(fieldId == 'custrecord_so_invoice1'){
                   var iv1_arr = dgjh_detail_rec.getValue('custrecord_so_invoice1');
                   if(iv1_arr.length > 0){
                       iv1_arr_1 = arrayAdd(iv1_arr,iv1_arr_1);
                       iv1_arr_1.push(order_id);
                   }else{
                       iv1_arr_1.push(order_id);
                   }
                   return iv1_arr_1;
               }
               else if(fieldId == 'custrecord_sl_dg_gsj_so2'){
                   var so2_arr = dgjh_detail_rec.getValue('custrecord_sl_dg_gsj_so2');
                   if(so2_arr.length > 0){
                       s01_arr_2 = arrayAdd(so2_arr,s01_arr_2);
                       s01_arr_2.push(order_id);
                   }else{
                       s01_arr_2.push(order_id);
                   }
                   return s01_arr_2;
               }
               else if(fieldId == 'custrecord_po_receive2'){
                   var ir2_arr = dgjh_detail_rec.getValue('custrecord_po_receive2');
                   if(ir2_arr.length > 0){
                       ir1_arr_2 = arrayAdd(ir2_arr,ir1_arr_2);
                       ir1_arr_2.push(order_id);
                   }else{
                       ir1_arr_2.push(order_id);
                   }
                   return ir1_arr_2;
               }
               else if(fieldId == 'custrecord_po_bill2'){
                   var vb2_arr = dgjh_detail_rec.getValue('custrecord_po_bill2');
                   if(vb2_arr.length > 0){
                       vb1_arr_2 = arrayAdd(vb2_arr,vb1_arr_2);
                       vb1_arr_2.push(order_id);
                   }else{
                       vb1_arr_2.push(order_id);
                   }
                   return vb1_arr_2;
               }
               else if(fieldId == 'custrecord_so_fullfillment2'){
                   var if2_arr = dgjh_detail_rec.getValue('custrecord_so_fullfillment2');
                   if(if2_arr.length > 0){
                       if1_arr_2 = arrayAdd(if2_arr,if1_arr_2);
                       if1_arr_2.push(order_id);
                   }else{
                       if1_arr_2.push(order_id);
                   }
                   return if1_arr_2;
               }
               else if(fieldId == 'custrecord_so_invoice2'){
                   var iv2_arr = dgjh_detail_rec.getValue('custrecord_so_invoice2');
                   if(iv2_arr.length > 0){
                       iv1_arr_2 = arrayAdd(iv2_arr,iv1_arr_2);
                       iv1_arr_2.push(order_id);
                   }else{
                       iv1_arr_2.push(order_id);
                   }
                   return iv1_arr_2;
               }
   
            }
        }
        function arrayAdd(array_orgin,array_out) {
            if(array_orgin.length > 0){
                for(var i = 0;i < array_orgin.length;i++){
                    array_out.push(array_orgin[i]);
                }
                return array_out;
            }
        }
         function matchPo(in_arr,po_id) {
             var ret_flag = 'N';
             for(var i = 0;i < in_arr.length;i++){
                if(in_arr[i] == po_id){
                    ret_flag = 'Y';
                }
             }
             log.debug('ret_flag',ret_flag);
             return ret_flag;
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
            // var searchId = runtime.getCurrentScript().getParameter({name:'custscript_savesearch'});//脚本呢部署上的参数中保存搜素的id
            // log.debug('searchId',JSON.stringify(searchId));
            // var mySearch = search.load({id:searchId});
            var mySearch = search.create({
                type:'salesorder',
                filters:[
                    ['intercotransaction','noneof',["@NONE@"]],
                    'AND',['custbody_document_generated','is',false],
                    'AND',['mainline','is',true],
                ]
            });
            return mySearch;
        }
        return {
            getInputData: getInputData,
            map: map,
            reduce: reduce,
            summarize: summarize
        };
    });