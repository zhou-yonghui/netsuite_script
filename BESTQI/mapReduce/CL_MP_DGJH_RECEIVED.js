/**
 * 订柜计划生成内部采购订单，库存转移订单等
 * button_falg: 1 外部采购收货  2 发运  3 收货   4  发货   5 接口接入
 * 接口接入：供应商直发FBA,供应商直发海外仓,国内直发FBA,国内直发海外仓只会收货，其他三种收发都有
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 */
define(
    ['N/search', 'N/record', 'N/task','N/file','N/currency','N/format','N/runtime'],
    function(search, record, task,file,exchangeRate,format,runtime) {
        function getInputData() {
            var scriptObj = runtime.getCurrentScript();
            //主skuId
            var dgId = scriptObj.getParameter({name:'custscript_cl_dgid_received'});
            var button_flag = scriptObj.getParameter({name:'custscript_cl_button_flag_received'});
            // log.debug('订柜计划单id 按钮标记',dgId + '--' + button_flag);
            //操作内部交易
            doSomething(dgId,button_flag);

            return {"dgId":dgId,"button_flag":button_flag};
        }
        function doSomething(dgId,button_flag) {
            //button_falg: 1 外部采购收货  2 发运  3 收货   4  发货  5  网站接口
            log.debug('dgId button_flag',dgId + '---' + button_flag);
            if(dgId && button_flag){
                //先勾选单据生成中字段
                setToF('true',dgId);
                //再进行其余操作
                var del_it_arr_one = new Array();
                var del_it_arr_two = new Array();
                var del_po_arr_one = new Array();
                var del_po_arr_two = new Array();
                var save_flag_arr = new Array();
                var log_rec_obj = new Object();
                var dg_rec = record.load({
                    type:'customrecord_hl_bsq_reservation_plan',
                    id:dgId,
                    isDynamic: true,
                });
                ///// try{
                var it_one_flag = 'Y';
                var it_two_flag = 'Y';
                var it_to_flag = 'Y';
                var po_one_flag = 'Y';
                var po_two_flag = 'Y';
                var wb_po_flag = 'Y';
                var to_flag = 'Y';
                var nb_po_id;
                var nb_po_id_one;
                var nb_po_id_two;
                var all_save_flag = "F";
                var all_signing_time_flag = 'N';
                var save_flag = "F";
                var signing_time_flag = 'N';
                // var it_id_one;
                // var it_id_two;
                var do_save = 'N';
                var wb_po_arr = new Array();//用来收集所有行的外部po数据
                var document_status = dg_rec.getValue('custrecord_document_status');//单据状态，已发运：2,已完结 ：6,部分发运 ： 11
                var signing_time = dg_rec.getValue('custrecord_signing_time');//签收时间,
                if(document_status != 1){   //判断状态
                    var dg_count = dg_rec.getLineCount('recmachcustrecord_sl_rp_body');
                    log.debug("订柜计划明细行条数",dg_count);
                    for(var i = 0;i < dg_count;i++){
                        log.debug('现在是第' + i + '行');
                        // var save_flag = "F";
                        // var signing_time_flag = 'N';
                        var po_arr = new Array();
                        var po_arr_t = new Array();
                        var it_arr = new Array();
                        var it_arr_t = new Array();
                        var it_arr_to = new Array();
                        var to_arr = new Array();
                        var wb_po_ir_arr= new Array();
                        var wb_po_vb_arr = new Array();
                        var it_id_one = 0;
                        var it_id_two = 0;
                        var it_id_to = 0;
                        var nb_to_id = 0;
                        var wb_po_obj = new Object();

                        dg_rec.selectLine('recmachcustrecord_sl_rp_body',i);
                        var sku = dg_rec.getCurrentSublistValue({
                            sublistId:'recmachcustrecord_sl_rp_body',
                            fieldId:'custrecord_sl_dg_detail',
                        })
                        var start_location = dg_rec.getCurrentSublistValue({
                            sublistId:'recmachcustrecord_sl_rp_body',
                            fieldId:'custrecord_sl_dc_start_location',
                        });
                        var on_location = dg_rec.getCurrentSublistValue({
                            sublistId:'recmachcustrecord_sl_rp_body',
                            fieldId:'custrecord_sl_zz_location',
                        });
                        var end_location = dg_rec.getCurrentSublistValue({
                            sublistId:'recmachcustrecord_sl_rp_body',
                            fieldId:'custrecord_sl_dg_md_location',
                        });
                        var ns_type =  dg_rec.getCurrentSublistValue({
                            sublistId:'recmachcustrecord_sl_rp_body',
                            fieldId:'custrecord_ns_type',     //单据处理类型
                        });
                        var actual_qty = dg_rec.getCurrentSublistValue({
                            sublistId:'recmachcustrecord_sl_rp_body',
                            fieldId:'custrecord_sl_dg_sku_qty2',             //qty(实际)
                        });
                        var actual_shipment_quantity = dg_rec.getCurrentSublistValue({
                            sublistId:'recmachcustrecord_sl_rp_body',
                            fieldId:'custrecord_actual_shipment_quantity',//实际发货数量
                        });
                        var actual_receipt_quantity = dg_rec.getCurrentSublistValue({
                            sublistId:'recmachcustrecord_sl_rp_body',
                            fieldId:'custrecord_actual_receipt_quantity',//实际收货数量
                        });
                        var cumulative_quantity_received = dg_rec.getCurrentSublistValue({
                            sublistId:'recmachcustrecord_sl_rp_body',
                            fieldId:'custrecord_cumulative_quantity_received',//收货累计数量
                        });
                        var cumulative_shipment_quantity = dg_rec.getCurrentSublistValue({
                            sublistId:'recmachcustrecord_sl_rp_body',
                            fieldId:'custrecord_cumulative_shipment_quantity',//发货累计数量
                        });
                        var zj_qty = dg_rec.getCurrentSublistValue({
                            sublistId:'recmachcustrecord_sl_rp_body',
                            fieldId:'custrecord_sl_dg_pass_amount',       //质检数量
                        })
                        var tag_status_t = dg_rec.getCurrentSublistText({
                            sublistId:'recmachcustrecord_sl_rp_body',
                            fieldId:'custrecord_tag_status',//标签状态
                        });
                        var po_id = dg_rec.getCurrentSublistValue({
                            sublistId:'recmachcustrecord_sl_rp_body',
                            fieldId:'custrecord_sl_dg_po_number',
                        });
                        var shipment_item_type_t = dg_rec.getCurrentSublistText({
                            sublistId:'recmachcustrecord_sl_rp_body',
                            fieldId:'custrecord_sl_ch_type1',        //出货计划类型
                        });
                        var dgjh_detail_id = dg_rec.getCurrentSublistValue({
                            sublistId:'recmachcustrecord_sl_rp_body',
                            fieldId:'id',        //订柜计划明细id
                        });
                        var wb_po_ir = dg_rec.getCurrentSublistValue({
                            sublistId:'recmachcustrecord_sl_rp_body',
                            fieldId:'custrecord_sl_dg_po_inbound', //外部po收货单
                        });
                        var wb_po_vb = dg_rec.getCurrentSublistValue({
                            sublistId:'recmachcustrecord_sl_rp_body',
                            fieldId:'custrecord_purchase_bill',//外部po账单
                        });
                        var one_nb_po = dg_rec.getCurrentSublistValue({
                            sublistId:'recmachcustrecord_sl_rp_body',
                            fieldId:'custrecord_sl_dg_gsj_po',        //一级内部交易po
                        });
                        var two_nb_po = dg_rec.getCurrentSublistValue({
                            sublistId:'recmachcustrecord_sl_rp_body',
                            fieldId:'custrecord_sl_dg_gsj_po2',        //二级内部交易po
                        });
                        var one_nb_it = dg_rec.getCurrentSublistValue({
                            sublistId:'recmachcustrecord_sl_rp_body',
                            fieldId:'custrecord_company_it_order1',        //公司内it1
                        });
                        var two_nb_it = dg_rec.getCurrentSublistValue({
                            sublistId:'recmachcustrecord_sl_rp_body',
                            fieldId:'custrecord_company_it_order22',        //公司内it2
                        });
                        var three_nb_it = dg_rec.getCurrentSublistValue({
                            sublistId:'recmachcustrecord_sl_rp_body',
                            fieldId:'custrecord_company_it_order3',        //公司内it3
                        });
                        var nb_to = dg_rec.getCurrentSublistValue({
                            sublistId:'recmachcustrecord_sl_rp_body',
                            fieldId:'custrecord_company_it_order',        //公司间TO
                        });
                        var po_error = dg_rec.getCurrentSublistValue({
                            sublistId:'recmachcustrecord_sl_rp_body',
                            fieldId:'custrecord_error',        //公司间交易报错
                        });
                        var ir_one_date = dg_rec.getCurrentSublistValue({
                            sublistId:'recmachcustrecord_sl_rp_body',
                            fieldId:'custrecord_first_warehousing_date',        //第一次入库时间
                        });
                        var nb_orgin_price_one = dg_rec.getCurrentSublistValue({
                            sublistId:'recmachcustrecord_sl_rp_body',
                            fieldId:'custrecord_origin1',              //一级基价
                        });
                        var nb_add_price_one = dg_rec.getCurrentSublistValue({
                            sublistId:'recmachcustrecord_sl_rp_body',
                            fieldId:'custrecord_add1',        //一级加价
                        });
                        var nb_tran_price_one = dg_rec.getCurrentSublistValue({
                            sublistId:'recmachcustrecord_sl_rp_body',
                            fieldId:'custrecord_internal_transaction_price',        //一级交易价
                        });
                        var nb_orgin_price_two = dg_rec.getCurrentSublistValue({
                            sublistId:'recmachcustrecord_sl_rp_body',
                            fieldId:'custrecord_origin2',              //二级基价
                        });
                        var nb_add_price_two = dg_rec.getCurrentSublistValue({
                            sublistId:'recmachcustrecord_sl_rp_body',
                            fieldId:'custrecord_add2',        //二级加价
                        });
                        var nb_tran_price_two = dg_rec.getCurrentSublistValue({
                            sublistId:'recmachcustrecord_sl_rp_body',
                            fieldId:'custrecord_internal_transaction_price2',        //二级交易价
                        });
                        var is_wb_po = dg_rec.getCurrentSublistValue({
                            sublistId:'recmachcustrecord_sl_rp_body',
                            fieldId:'custrecord_sl_purchase_receipt',        //外部采购收货勾选
                        });
                        var line_key = dg_rec.getCurrentSublistValue({
                            sublistId:'recmachcustrecord_sl_rp_body',
                            fieldId:'custrecord_hl_row_only_key',        ///采购订单行唯一键
                        });
                        var ship_type_status = dg_rec.getCurrentSublistValue({
                            sublistId:'recmachcustrecord_sl_rp_body',
                            fieldId:'custrecord_sl_document_status1',     //发运状态
                        });
                        var ship_diff = Number(actual_qty) - Number(cumulative_shipment_quantity);
                        //首先判断出货计划类型
                        var shipment_type_flag = checkShipmentType(shipment_item_type_t);
                        log.debug('出货计划类型flag init',shipment_type_flag);
                        if(shipment_type_flag == 'outsea' && ship_type_status != 2 && Number(actual_shipment_quantity) <= Number(actual_qty) - Number(cumulative_shipment_quantity)){
                            save_flag = 'F';
                            if(button_flag == 2 || button_flag == 4 || button_flag == 5){
                                //发货，创建内部交易po
                                if(actual_shipment_quantity > 0 && ns_type != 4){
                                    //
                                    log.debug("一级内部PO",one_nb_po + ',length:' + one_nb_po.length);
                                    log.debug('二级内部PO',two_nb_po + ',length:' + two_nb_po.length);
                                    //创建内部po关联单据
                                    save_flag = createNbPo(dg_rec,save_flag,ns_type,one_nb_po,po_arr,nb_po_id,del_po_arr_one,two_nb_po,nb_po_id_one,po_arr_t,del_po_arr_two,nb_po_id_two,cumulative_shipment_quantity,actual_shipment_quantity,po_id,start_location,on_location,end_location,sku,shipment_item_type_t,dgjh_detail_id,nb_orgin_price_one,nb_tran_price_one,nb_orgin_price_two,nb_tran_price_two,nb_add_price_one,nb_add_price_two);
                                    save_flag_arr.push(save_flag);
                                }
                                //发货，生成内部to单
                                else if(actual_shipment_quantity > 0 && ns_type == 4){
                                    log.debug('创建内部to关联单据');
                                    //创建内部to关联单据
                                    save_flag = createNbTo(ns_type,dg_rec,nb_to,to_arr,nb_to_id,shipment_item_type_t,actual_shipment_quantity,cumulative_shipment_quantity,start_location,end_location,sku,to_flag,save_flag,dgjh_detail_id);
                                    // //赋值第一次收货时间
                                    // if(save_flag == 'Y' && !ir_one_date){
                                    //     dg_rec.setCurrentSublistValue({
                                    //         sublistId:'recmachcustrecord_sl_rp_body',
                                    //         fieldId:'custrecord_first_warehousing_date',        //第一次入库时间
                                    //         value:format.parse({value:new Date(new Date().getTime()+(parseInt(new Date().getTimezoneOffset()/60) + 8)*3600*1000),type:format.Type.DATE}),
                                    //     });
                                    // }
                                    save_flag_arr.push(save_flag);
                                }
                            }
                        }
                        else{
                            //qty（实际）有数量且订单状态为已发运,外部采购收货开帐
                            if(actual_qty > 0){
                                /**此类情况只生成一次，qty(实际)不可更改,只发一次货，可收货**/
                                log.debug('one_nb_po nb_to wb_po_ir',one_nb_po + '---' + nb_to + '---' + wb_po_ir);
                                save_flag = 'F';
                                //没有po单，国内直发FBA和国内发海外
                                if(shipment_type_flag == 'gnout' && ship_type_status != 2){
                                    if(button_flag == 2 || button_flag == 5){
                                        if(actual_qty > 0 && ns_type != 4 && one_nb_po.length == 0){
                                            //创建内部po关联单据
                                            save_flag = createNbPo(dg_rec,save_flag,ns_type,one_nb_po,po_arr,nb_po_id,del_po_arr_one,two_nb_po,nb_po_id_one,po_arr_t,del_po_arr_two,nb_po_id_two,cumulative_shipment_quantity,actual_qty,po_id,start_location,on_location,end_location,sku,shipment_item_type_t,dgjh_detail_id,nb_orgin_price_one,nb_tran_price_one,nb_orgin_price_two,nb_tran_price_two,nb_add_price_one,nb_add_price_two);
                                            save_flag_arr.push(save_flag);
                                        }
                                        else if(actual_qty > 0 && ns_type == 4 && nb_to.length == 0){
                                            //创建内部to关联单据
                                            save_flag = createNbTo(ns_type,dg_rec,nb_to,to_arr,nb_to_id,shipment_item_type_t,actual_qty,cumulative_shipment_quantity,start_location,end_location,sku,to_flag,save_flag,dgjh_detail_id);
                                            //赋值第一次收货时间
                                            // if(save_flag == 'Y' && !ir_one_date){
                                            //     dg_rec.setCurrentSublistValue({
                                            //         sublistId:'recmachcustrecord_sl_rp_body',
                                            //         fieldId:'custrecord_first_warehousing_date',        //第一次入库时间
                                            //         value:format.parse({value:new Date(new Date().getTime()+(parseInt(new Date().getTimezoneOffset()/60) + 8)*3600*1000),type:format.Type.DATE}),
                                            //     });
                                            // }
                                            save_flag_arr.push(save_flag);
                                        }
                                    }
                                }
                                //有po单，供应商直发FBA和供应商发海外
                                else if(shipment_type_flag == 'vendor' && po_id && ship_type_status != 2){ //不能为已发运
                                    log.debug('vendor button',button_flag);
                                    actual_qty = zj_qty;//TODO:供应商类型，外部采购收货、发运用质检数量
                                    log.debug('质检数量',actual_qty);
                                    if(wb_po_ir.length == 0 && wb_po_vb.length == 0){
                                        if(button_flag == 1 || (button_flag == 2 && is_wb_po == false)){
                                            //外部po收货
                                            var do_po_data = wbPoToiriv(po_id,actual_qty,wb_po_arr,sku,line_key);
                                            log.debug('外部po自动收货开单数据',do_po_data);
                                            if(do_po_data.ir_error != 'n' && do_po_data.vb_error != "n"){
                                                dg_rec.setCurrentSublistValue({
                                                    sublistId:'recmachcustrecord_sl_rp_body',
                                                    fieldId:'custrecord_receiving_error',        //采购收货报错
                                                    value:'外部po生成收货单报错：' + do_po_data.ir_error,
                                                });
                                                dg_rec.setCurrentSublistValue({
                                                    sublistId:'recmachcustrecord_sl_rp_body',
                                                    fieldId:'custrecord_statement_error',        //采购账单报错
                                                    value:'外部po生成帐单报错：' + do_po_data.vb_error,
                                                });
                                                wb_po_flag = do_po_data.ir_error + '；' +do_po_data.vb_error;
                                                save_flag = 'Y';
                                                save_flag_arr.push(save_flag);
                                            }
                                            else{
                                                if(do_po_data.ir_id){
                                                    dg_rec.setCurrentSublistValue({
                                                        sublistId:'recmachcustrecord_sl_rp_body',
                                                        fieldId:'custrecord_sl_dg_po_inbound',        //采购收货单
                                                        value:do_po_data.ir_id,
                                                    });
                                                    dg_rec.setCurrentSublistValue({
                                                        sublistId:'recmachcustrecord_sl_rp_body',
                                                        fieldId:'custrecord_receiving_error',        //采购收货报错
                                                        value:'',
                                                    });
                                                    dg_rec.setCurrentSublistValue({
                                                        sublistId:'recmachcustrecord_sl_rp_body',
                                                        fieldId:'custrecord_sl_purchase_receipt',        //外部采购收货勾选
                                                        value:true,
                                                    });
                                                    save_flag = 'Y';
                                                    wb_po_obj.ir_id = do_po_data.ir_id;
                                                    save_flag_arr.push(save_flag);
                                                }
                                                if(do_po_data.vendorbill_Id){
                                                    dg_rec.setCurrentSublistValue({
                                                        sublistId:'recmachcustrecord_sl_rp_body',
                                                        fieldId:'custrecord_purchase_bill',        //采购账单
                                                        value:do_po_data.vendorbill_Id,
                                                    });
                                                    dg_rec.setCurrentSublistValue({
                                                        sublistId:'recmachcustrecord_sl_rp_body',
                                                        fieldId:'custrecord_statement_error',        //采购账单报错
                                                        value:'',
                                                    });
                                                    wb_po_obj.vb_id = do_po_data.vendorbill_Id;
                                                    save_flag = 'Y';
                                                    save_flag_arr.push(save_flag);
                                                }
                                                if(do_po_data.ir_error != 'n'){
                                                    dg_rec.setCurrentSublistValue({
                                                        sublistId:'recmachcustrecord_sl_rp_body',
                                                        fieldId:'custrecord_receiving_error',        //采购收货报错
                                                        value:'外部po生成收货单报错：' + do_po_data.ir_error,
                                                    });
                                                    wb_po_flag = do_po_data.ir_error;
                                                    save_flag = 'Y';
                                                    save_flag_arr.push(save_flag);
                                                }
                                                if(do_po_data.vb_error != 'n'){
                                                    dg_rec.setCurrentSublistValue({
                                                        sublistId:'recmachcustrecord_sl_rp_body',
                                                        fieldId:'custrecord_statement_error',        //采购账单报错
                                                        value:'外部po生成帐单报错：' + do_po_data.vb_error,
                                                    });
                                                    wb_po_flag = do_po_data.vb_error;
                                                    save_flag = 'Y';
                                                    save_flag_arr.push(save_flag);
                                                }
                                                if(do_po_data.ir_id || do_po_data.vendorbill_Id){
                                                    wb_po_obj.wb_po = po_id;
                                                    wb_po_arr.push(wb_po_obj);
                                                }
                                            }
                                            //业务处理类型为：供应商直发FBA、供应商直发海外仓时
                                            log.debug('出货计划类型flag',shipment_type_flag);
                                            if(shipment_type_flag == 'vendor'){
                                                if(button_flag == 2 || button_flag == 5){
                                                    save_flag = 'F';
                                                    if(actual_qty > 0 && ns_type != 4){
                                                        //创建内部po关联单据
                                                        save_flag = createNbPo(dg_rec,save_flag,ns_type,one_nb_po,po_arr,nb_po_id,del_po_arr_one,two_nb_po,nb_po_id_one,po_arr_t,del_po_arr_two,nb_po_id_two,cumulative_shipment_quantity,actual_qty,po_id,start_location,on_location,end_location,sku,shipment_item_type_t,dgjh_detail_id,nb_orgin_price_one,nb_tran_price_one,nb_orgin_price_two,nb_tran_price_two,nb_add_price_one,nb_add_price_two);
                                                        save_flag_arr.push(save_flag);
                                                    }
                                                    else if(actual_qty > 0 && ns_type == 4){
                                                        //创建内部to关联单据
                                                        save_flag = createNbTo(ns_type,dg_rec,nb_to,to_arr,nb_to_id,shipment_item_type_t,actual_qty,cumulative_shipment_quantity,start_location,end_location,sku,to_flag,save_flag,dgjh_detail_id);
                                                        save_flag_arr.push(save_flag);
                                                    }
                                                }
                                            }
                                        }
                                    }
                                    else if(one_nb_po.length == 0){
                                        //业务处理类型为：供应商直发FBA、供应商直发海外仓时
                                        log.debug('出货计划类型flag',shipment_type_flag);
                                        if(shipment_type_flag == 'vendor'){
                                            if(button_flag == 2 || button_flag == 5){
                                                save_flag = 'F';
                                                if(actual_qty > 0 && ns_type != 4){
                                                    //创建内部po关联单据
                                                    save_flag = createNbPo(dg_rec,save_flag,ns_type,one_nb_po,po_arr,nb_po_id,del_po_arr_one,two_nb_po,nb_po_id_one,po_arr_t,del_po_arr_two,nb_po_id_two,cumulative_shipment_quantity,actual_qty,po_id,start_location,on_location,end_location,sku,shipment_item_type_t,dgjh_detail_id,nb_orgin_price_one,nb_tran_price_one,nb_orgin_price_two,nb_tran_price_two,nb_add_price_one,nb_add_price_two);
                                                    save_flag_arr.push(save_flag);
                                                }
                                                else if(actual_qty > 0 && ns_type == 4){
                                                    //创建内部to关联单据
                                                    save_flag = createNbTo(ns_type,dg_rec,nb_to,to_arr,nb_to_id,shipment_item_type_t,actual_qty,cumulative_shipment_quantity,start_location,end_location,sku,to_flag,save_flag,dgjh_detail_id);
                                                    save_flag_arr.push(save_flag);
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        //收货，生成IT单
                        if(actual_receipt_quantity > 0 && (ship_type_status == 2 || ship_type_status == 11)){//部分发运、发运状态都可收货
                            if(button_flag == 3){
                                save_flag = 'F';
                                log.debug("一级内部it",one_nb_it + ',length:' + one_nb_it.length);
                                log.debug('二级内部it',two_nb_it + ',length:' + two_nb_it.length);
                                log.debug('to的it',three_nb_it + ',length:' + three_nb_it.length);
                                //生成内部IT关联单据
                                var save_data = createNbIt(dg_rec,save_flag,ns_type,it_one_flag,it_id_to,it_arr_to,it_arr_t,cumulative_quantity_received,three_nb_it,it_two_flag,two_nb_it,del_it_arr_two,del_it_arr_one,one_nb_it,it_arr,it_id_one,start_location,on_location,end_location,shipment_item_type_t,dgjh_detail_id,sku,actual_receipt_quantity,dgId,it_to_flag);
                                log.debug('it save_data',save_data);
                                signing_time_flag = save_data.signing_time_flag;
                                save_flag = save_data.save_flag;
                                save_flag_arr.push(save_flag);
                            }
                        }
                        //在计算剩余入库或者差异数量时获取最新的累计收货数量
                        cumulative_quantity_received = dg_rec.getCurrentSublistValue({
                            sublistId:'recmachcustrecord_sl_rp_body',
                            fieldId:'custrecord_cumulative_quantity_received',//收货累计数量
                        });
                        cumulative_shipment_quantity = dg_rec.getCurrentSublistValue({
                            sublistId:'recmachcustrecord_sl_rp_body',
                            fieldId:'custrecord_cumulative_shipment_quantity',//发货累计数量
                        });
                        log.debug('save_flag actual_qty',save_flag + actual_qty);
                        //提交行数据
                        if(save_flag == "Y"){
                            /**发货累计数量=多次实际发货数量累加数值
                             收货累计数量=多次实际收货数量累加数值
                             剩余入库数量=QTY实际-收货累计数量
                             差异数量：QTY实际-收货累计数量 */
                            if(actual_qty){
                                if(cumulative_quantity_received == null || cumulative_quantity_received == ''){
                                    cumulative_quantity_received = 0;
                                }
                                if(cumulative_shipment_quantity == null || cumulative_shipment_quantity == ''){
                                    cumulative_shipment_quantity = 0;
                                }
                                log.debug('cumulative_quantity_received',cumulative_quantity_received);
                                log.debug('tag_status_t',tag_status_t);
                                // if(tag_status_t == 'CLOSED'){
                                dg_rec.setCurrentSublistValue({
                                    sublistId:'recmachcustrecord_sl_rp_body',
                                    fieldId:'custrecord_variance_quantity',        //差异数量
                                    value:Number(actual_qty) - Number(cumulative_quantity_received),
                                });
                                // }
                                dg_rec.setCurrentSublistValue({
                                    sublistId:'recmachcustrecord_sl_rp_body',
                                    fieldId:'custrecord_remaining_receipt_quantity',        //剩余入库数量
                                    value:Number(actual_qty) - Number(cumulative_quantity_received),
                                });
                                /**
                                 * 发货状态
                                 * 订柜计划单明细行【单据状态】修改
                                 * 当出货计划类型=供应商直发FBA，供应商直发海外仓时
                                 * 1、0＜【发货累计数量】＜【质检合格数量】，【发运状态】修改为（部分发运）；
                                 * 2、0＜【发货累计数量】=【质检合格数量】，【发运状态】修改为（已发运）；
                                 * 当出货计划类型=国内直发FBA，国内直发海外仓，海外仓转平台仓，海外仓转海外仓，FBA转海外仓时
                                 * 1、0＜【发货累计数量】＜【QTY（实际）】，【发运状态】修改为（部分发运）；
                                 * 2、0＜【发货累计数量】=【QTY（实际）】，【发运状态】修改为（已发运）；
                                 * 收货状态
                                 * 3、0＜【收货累计数量】＜【发货累计数量】，【收货状态】修改为（部分收货）；
                                 * 4、0＜【收货累计数量】≥【发货累计数量】，【收货状态】修改为（已收货）；*/
                                if(shipment_type_flag == 'outsea' || shipment_type_flag == 'gnout'){
                                    if(actual_qty > cumulative_shipment_quantity && cumulative_shipment_quantity > 0){
                                        dg_rec.setCurrentSublistValue({
                                            sublistId:'recmachcustrecord_sl_rp_body',
                                            fieldId:'custrecord_sl_document_status1',        //发运状态
                                            value:11,                         //部分发运
                                        });
                                    }
                                    else if(actual_qty == cumulative_shipment_quantity && cumulative_shipment_quantity > 0){
                                        dg_rec.setCurrentSublistValue({
                                            sublistId:'recmachcustrecord_sl_rp_body',
                                            fieldId:'custrecord_sl_document_status1',        //发运状态
                                            value:2,                         //已发运
                                        });
                                    }
                                }
                                else if(shipment_type_flag == 'vendor'){
                                    if(zj_qty){
                                        if(zj_qty > cumulative_shipment_quantity && cumulative_shipment_quantity > 0){
                                            dg_rec.setCurrentSublistValue({
                                                sublistId:'recmachcustrecord_sl_rp_body',
                                                fieldId:'custrecord_sl_document_status1',        //发运状态
                                                value:11,                         //部分发运
                                            });
                                        }
                                        else if(zj_qty == cumulative_shipment_quantity && cumulative_shipment_quantity > 0){
                                            dg_rec.setCurrentSublistValue({
                                                sublistId:'recmachcustrecord_sl_rp_body',
                                                fieldId:'custrecord_sl_document_status1',        //发运状态
                                                value:2,                         //已发运
                                            });
                                        }
                                    }
                                }
                                if(cumulative_quantity_received < cumulative_shipment_quantity && cumulative_quantity_received > 0){
                                    dg_rec.setCurrentSublistValue({
                                        sublistId:'recmachcustrecord_sl_rp_body',
                                        fieldId:'custrecord_sl_document_status2',        //收货状态
                                        value:5,                         //部分收货
                                    });
                                }
                                else if(cumulative_quantity_received >= cumulative_shipment_quantity && cumulative_shipment_quantity > 0){
                                    dg_rec.setCurrentSublistValue({
                                        sublistId:'recmachcustrecord_sl_rp_body',
                                        fieldId:'custrecord_sl_document_status2',        //收货状态
                                        value:13,                         //已收货
                                    });
                                }
                            }
                            //赋值第一次发货时间发货
                            if(button_flag == 2 && !ir_one_date){
                                dg_rec.setCurrentSublistValue({
                                    sublistId:'recmachcustrecord_sl_rp_body',
                                    fieldId:'custrecord_out_of_warehouse_time',        //
                                    value:format.parse({value:new Date(new Date().getTime()+(parseInt(new Date().getTimezoneOffset()/60) + 8)*3600*1000),type:format.Type.DATE}),
                                });
                            }
                            else if(button_flag == 4 && shipment_type_flag == 'outsea'){
                                dg_rec.setCurrentSublistValue({
                                    sublistId:'recmachcustrecord_sl_rp_body',
                                    fieldId:'custrecord_out_of_warehouse_time',        //
                                    value:format.parse({value:new Date(new Date().getTime()+(parseInt(new Date().getTimezoneOffset()/60) + 8)*3600*1000),type:format.Type.DATE}),
                                });
                            }

                            dg_rec.commitLine("recmachcustrecord_sl_rp_body");
                        }
                    }
                    log.debug('save_flag_arr',save_flag_arr);
                    for(var p = 0;p < save_flag_arr.length;p++){
                        if(save_flag_arr[p] == 'Y'){
                            do_save = 'Y';
                        }
                    }
                    log.debug('do_save',do_save);
                    if(do_save == 'Y'){
                        // log.debug('it_one_flag',it_one_flag);
                        // log.debug('it_two_flag',it_two_flag);
                        // log.debug('it_to_flag',it_to_flag);
                        // log.debug('to_flag',to_flag);
                        // log.debug('wb_po_flag',wb_po_flag);
                        if(it_one_flag != 'Y'){
                            dg_rec.setValue("custrecord_cl_error_message",'生成一级内部it报错：' + it_one_flag);//填充报错信息
                            dg_rec.setValue("custrecord_document_generation",true);
                            log_rec_obj.success = 'false';
                            log_rec_obj.info = '生成一级内部it报错：' + it_one_flag;
                        }else if(it_two_flag != 'Y'){
                            dg_rec.setValue("custrecord_cl_error_message",'生成二级内部it报错：' + it_two_flag);//填充报错信息
                            dg_rec.setValue("custrecord_document_generation",true);
                            log_rec_obj.success = 'false';
                            log_rec_obj.info = '生成二级内部it报错：' + it_two_flag;
                        }
                        else if(to_flag != 'Y'){
                            dg_rec.setValue("custrecord_cl_error_message",'生成内部to报错：' + to_flag);//填充报错信息
                            dg_rec.setValue("custrecord_document_generation",true);
                            log_rec_obj.success = 'false';
                            log_rec_obj.info = '生成内部to报错：' + to_flag;
                        }
                        else if(it_to_flag != 'Y'){
                            dg_rec.setValue("custrecord_cl_error_message",'生成内部to的it报错：' + it_to_flag);//填充报错信息
                            dg_rec.setValue("custrecord_document_generation",true);
                            log_rec_obj.success = 'false';
                            log_rec_obj.info = '生成内部to的it报错：' + it_to_flag;
                        }
                        else if(wb_po_flag != 'Y'){
                            dg_rec.setValue("custrecord_cl_error_message",'生成外部po报错：' + wb_po_flag);//填充报错信息
                            dg_rec.setValue("custrecord_document_generation",true);
                            log_rec_obj.success = 'false';
                            log_rec_obj.info = '生成外部po报错：' + wb_po_flag;
                        }
                        else{
                            dg_rec.setValue("custrecord_cl_error_message","");//刷新生成单据信息字段
                            log_rec_obj.success = 'true';
                            log_rec_obj.info = '脚本执行成功';
                            //
                        }
                        //赋值签收时间，取第一次收货时间
                        log.debug('signing_time',signing_time);
                        if(!signing_time && signing_time_flag == 'Y' && button_flag == 3){
                            var beijingDate = new Date(new Date().getTime()+(parseInt(new Date().getTimezoneOffset()/60) + 8)*3600*1000);//TODO:获取当前北京时间
                            dg_rec.setValue('custrecord_signing_time',format.parse({value:beijingDate,type:format.Type.DATE}));//签收时间
                        }
                        if(button_flag == 2){
                            log.debug('更改单据状态已发运,bu_flag 2');
                            dg_rec.setValue('custrecord_document_status',2);//单据状态,已发运 2
                        }
                        else if(button_flag == 4 && shipment_type_flag == 'outsea') {
                            log.debug('更改单据状态已发运,bu_flag 4');
                            dg_rec.setValue('custrecord_document_status',2);//单据状态,已发运 2
                        }
                        else if(button_flag == 5){
                            log.debug('入库/出库回写 button_flag 5');
                            dg_rec.setValue('custrecord_sl_out_hx',false);//出库回写
                        }
                        var dg_id = dg_rec.save();
                        log.debug("回写订柜计划成功",dg_id);
                        //取消勾选
                        setToF('false',dgId);
                    }
                        // else if(save_flag == 'Y_1'){

                    // }
                    else{
                        //取消勾选
                        setToF('false',dgId);
                        log_rec_obj.success = 'false';
                        log_rec_obj.info = '';
                    }
                    //更新脚本记录信息
                    setMpLogRecord(dgId,log_rec_obj);
                }
            }
        }
        function setMpLogRecord(dg_id,log_rec_obj) {
            if(dg_id){
                var mysearch = search.create({
                    type:'customrecord_sl_dg_sc_re',
                    filters:[
                        ['custrecord_sl_dg_number','anyof',dg_id],
                        'AND',['custrecord_sl_zx_result','is',2],        //执行中
                    ]
                });
                var res = mysearch.run().getRange(0,1000);
                if(res.length > 0){
                    record.submitFields({
                        type:'customrecord_sl_dg_sc_re',
                        id:res[0].id,
                        values:{
                            custrecord_sl_zx_result:1,       //执行完毕
                            custrecord_zx_fh_inf:log_rec_obj.info
                        }
                    })
                }
            }
        }
        function setToF(flag,dgId) {
            log.debug('flag dgId',flag + dgId);
            if(flag){
                if(flag == 'true'){
                    flag = true;
                }else if(flag == 'false'){
                    flag = false;
                }
                //先将单据生成中字段勾选
                record.submitFields({
                    type:'customrecord_hl_bsq_reservation_plan',
                    id:dgId,
                    values:{
                        custrecord_document_generation:flag,
                    }
                });
            }
        }
        function createNbIt(dg_rec,save_flag,ns_type,it_one_flag,it_id_to,it_arr_to,it_arr_t,cumulative_quantity_received,three_nb_it,it_two_flag,two_nb_it,del_it_arr_two,del_it_arr_one,one_nb_it,it_arr,it_id_one,start_location,on_location,end_location,shipment_item_type_t,dgjh_detail_id,sku,actual_receipt_quantity,dgId,it_to_flag) {
            var shouhuo_flag = 'N';
            var signing_time_flag = 'N';
            /***--------------------------一级it单 ----------------------------------*/
            if(ns_type == 1){
                if(one_nb_it.length > 0){
                    it_arr = arrayAdd(one_nb_it,it_arr);
                    try{
                        it_id_one = createIt(start_location,on_location,end_location,shipment_item_type_t,dgjh_detail_id,sku,actual_receipt_quantity,dgId,'ONE');
                    }catch(e){
                        log.debug('生成一级it出错',e);
                        it_one_flag = e.message;
                    }

                    if(it_id_one != 0){
                        it_arr.push(it_id_one);

                        del_it_arr_one.push(it_id_one);//TODO:用作异常删除数组
                    }
                }
                else {
                    try{
                        it_id_one = createIt(start_location,on_location,end_location,shipment_item_type_t,dgjh_detail_id,sku,actual_receipt_quantity,dgId,'ONE');
                    }catch(e){
                        log.debug('生成一级it出错',e);
                        it_one_flag = e.message;
                    }

                    if(it_id_one != 0){
                        it_arr.push(it_id_one);

                        del_it_arr_one.push(it_id_one);//TODO:用作异常删除数组
                    }
                }
            }
            /***-----------------------------二级it单--------------------------------- */
            else if(ns_type == 2){
                if(one_nb_it.length > 0 || two_nb_it.length > 0){
                    if(one_nb_it.length > 0){
                        it_arr = arrayAdd(one_nb_it,it_arr);
                        try{
                            it_id_one = createIt(start_location,on_location,end_location,shipment_item_type_t,dgjh_detail_id,sku,actual_receipt_quantity,dgId,'TWO1');
                        }catch(e){
                            log.debug('生成一级it出错',e);
                            it_one_flag = e.message;
                        }

                        if(it_id_one != 0){
                            it_arr.push(it_id_one);

                            del_it_arr_one.push(it_id_one);//TODO:用作异常删除数组
                        }
                    }
                    if(two_nb_it.length > 0){
                        it_arr_t = arrayAdd(two_nb_it,it_arr_t);
                        try{
                            it_id_two = createIt(start_location,on_location,end_location,shipment_item_type_t,dgjh_detail_id,sku,actual_receipt_quantity,dgId,'TWO2');
                        }catch(e){
                            log.debug('生成二级it出错',e);
                            it_two_flag = e.message;
                        }

                        if(it_id_two != 0){
                            it_arr_t.push(it_id_two);

                            del_it_arr_two.push(it_id_two);//TODO:用作异常删除数组
                        }
                    }
                }else {
                    try{
                        //中转it
                        it_id_one = createIt(start_location,on_location,end_location,shipment_item_type_t,dgjh_detail_id,sku,actual_receipt_quantity,dgId,'TWO1');
                    }catch(e){
                        log.debug('生成一级it出错',e);
                        it_one_flag = e.message;
                    }
                    log.debug('it_id_one',it_id_one);
                    if(it_id_one != 0){
                        it_arr.push(it_id_one);

                        del_it_arr_one.push(it_id_one);//TODO:用作异常删除数组
                        try{
                            //目的it
                            it_id_two = createIt(start_location,on_location,end_location,shipment_item_type_t,dgjh_detail_id,sku,actual_receipt_quantity,dgId,'TWO2');
                        }catch(e){
                            log.debug('生成二级it出错',e);
                            it_two_flag = e.message;
                        }
                        if(it_id_two != 0){
                            it_arr_t.push(it_id_two);

                            del_it_arr_two.push(it_id_two);//TODO:用作异常删除数组
                        }
                    }
                }
            }
            else if(ns_type == 4){
                if(three_nb_it.length > 0){
                    it_arr_to = arrayAdd(three_nb_it,it_arr_to);
                    try{
                        it_id_to = createIt(start_location,on_location,end_location,shipment_item_type_t,dgjh_detail_id,sku,actual_receipt_quantity,dgId,'ONE');
                    }catch(e){
                        log.debug('生成TO的it出错',e);
                        it_two_flag = e.message;
                    }

                    if(it_id_to != 0){
                        it_arr_to.push(it_id_to);

                        del_it_arr_one.push(it_id_to);//TODO:用作异常删除数组
                    }
                }
                else {
                    try{
                        it_id_to = createIt(start_location,on_location,end_location,shipment_item_type_t,dgjh_detail_id,sku,actual_receipt_quantity,dgId,'ONE');
                    }catch(e){
                        log.debug('生成TO的it出错',e);
                        it_two_flag = e.message;
                    }

                    if(it_id_to != 0){
                        it_arr_to.push(it_id_to);

                        del_it_arr_one.push(it_id_to);//TODO:用作异常删除数组
                    }
                }
            }
            //回写订柜计划明细,清空实际收货数量
            if(it_arr.length > 0){
                log.debug("一级it合集",it_arr);
                dg_rec.setCurrentSublistValue({
                    sublistId:'recmachcustrecord_sl_rp_body',
                    fieldId:'custrecord_company_it_order1',        //公司内it1
                    value:it_arr
                });
                if(it_one_flag == 'Y'){
                    dg_rec.setCurrentSublistValue({
                        sublistId:'recmachcustrecord_sl_rp_body',
                        fieldId:'custrecord_actual_receipt_quantity',//实际收货数量
                        value:0
                    });
                    dg_rec.setCurrentSublistValue({
                        sublistId:'recmachcustrecord_sl_rp_body',
                        fieldId:'custrecord_error',        //公司间交易报错
                        value:''
                    });
                }
                else if(it_one_flag != 'Y'){
                    dg_rec.setCurrentSublistValue({
                        sublistId:'recmachcustrecord_sl_rp_body',
                        fieldId:'custrecord_error',        //公司间交易报错
                        value:'生成一级内部it报错：' + it_one_flag,
                    });
                }
                shouhuo_flag = 'Y';
                save_flag = "Y";
            }else if(it_one_flag != 'Y'){
                dg_rec.setCurrentSublistValue({
                    sublistId:'recmachcustrecord_sl_rp_body',
                    fieldId:'custrecord_error',        //公司间交易报错
                    value:'生成一级内部it报错：' + it_one_flag
                });
                shouhuo_flag = 'N';
                save_flag = 'Y';
            }
            if(it_arr_t.length > 0){
                log.debug("二级it合集",it_arr_t);
                dg_rec.setCurrentSublistValue({
                    sublistId:'recmachcustrecord_sl_rp_body',
                    fieldId:'custrecord_company_it_order22',        //公司内it2
                    value:it_arr_t
                });
                if(it_two_flag == 'Y'){
                    dg_rec.setCurrentSublistValue({
                        sublistId:'recmachcustrecord_sl_rp_body',
                        fieldId:'custrecord_actual_receipt_quantity',//实际收货数量
                        value:0
                    });
                    dg_rec.setCurrentSublistValue({
                        sublistId:'recmachcustrecord_sl_rp_body',
                        fieldId:'custrecord_error',        //公司间交易报错
                        value:''
                    });
                }
                else if(it_two_flag != 'Y'){
                    dg_rec.setCurrentSublistValue({
                        sublistId:'recmachcustrecord_sl_rp_body',
                        fieldId:'custrecord_error',        //公司间交易报错
                        value:'生成二级内部it报错：' + it_two_flag,
                    });
                }
                shouhuo_flag = 'Y';
                save_flag = "Y";
            }
            else if(it_two_flag != 'Y'){
                dg_rec.setCurrentSublistValue({
                    sublistId:'recmachcustrecord_sl_rp_body',
                    fieldId:'custrecord_error',        //公司间交易报错
                    value:'生成二级内部it报错：' + it_two_flag,
                });
                shouhuo_flag = 'N';
                save_flag = 'Y';
            }
            if(it_arr_to.length > 0){
                log.debug("内部TO单it合集",it_arr_to);
                dg_rec.setCurrentSublistValue({
                    sublistId:'recmachcustrecord_sl_rp_body',
                    fieldId:'custrecord_company_it_order3',        //公司内it3
                    value:it_arr_to
                });
                if(it_to_flag == 'Y'){
                    dg_rec.setCurrentSublistValue({
                        sublistId:'recmachcustrecord_sl_rp_body',
                        fieldId:'custrecord_actual_receipt_quantity',//实际收货数量
                        value:0
                    });
                    dg_rec.setCurrentSublistValue({
                        sublistId:'recmachcustrecord_sl_rp_body',
                        fieldId:'custrecord_error',        //公司间交易报错
                        value:''
                    });
                }
                else if(it_to_flag != 'Y'){
                    dg_rec.setCurrentSublistValue({
                        sublistId:'recmachcustrecord_sl_rp_body',
                        fieldId:'custrecord_error',        //公司间交易报错
                        value:'生成内部TO的it报错：' + it_to_flag,
                    });
                }
                shouhuo_flag = 'Y';
                save_flag = "Y";
            }else if(it_to_flag != 'Y'){
                dg_rec.setCurrentSublistValue({
                    sublistId:'recmachcustrecord_sl_rp_body',
                    fieldId:'custrecord_error',        //公司间交易报错
                    value:'生成内部TO的it报错：' + it_to_flag
                });
                shouhuo_flag = 'N';
                save_flag = 'Y';
            }
            if(shouhuo_flag == 'Y'){
                if(cumulative_quantity_received){
                    dg_rec.setCurrentSublistValue({
                        sublistId:'recmachcustrecord_sl_rp_body',
                        fieldId:'custrecord_cumulative_quantity_received',//收货累计数量
                        value:Number(cumulative_quantity_received) + Number(actual_receipt_quantity),
                    });
                }else{
                    dg_rec.setCurrentSublistValue({
                        sublistId:'recmachcustrecord_sl_rp_body',
                        fieldId:'custrecord_cumulative_quantity_received',//收货累计数量
                        value:Number(actual_receipt_quantity),
                    });
                }
                signing_time_flag = 'Y';
            }
            return {"save_flag":save_flag,"signing_time_flag":signing_time_flag};
        }
        function createNbPo(dg_rec,save_flag,ns_type,one_nb_po,po_arr,nb_po_id,del_po_arr_one,two_nb_po,nb_po_id_one,po_arr_t,del_po_arr_two,nb_po_id_two,cumulative_shipment_quantity,actual_shipment_quantity,po_id,start_location,on_location,end_location,sku,shipment_item_type_t,dgjh_detail_id,nb_orgin_price_one,nb_tran_price_one,nb_orgin_price_two,nb_tran_price_two,nb_add_price_one,nb_add_price_two) {
            /**_---------------------一级内部交易po----------------------------**/
            if(ns_type == 1){
                if(one_nb_po.length > 0){
                    //将之前生成的po号加入数组
                    po_arr = arrayAdd(one_nb_po,po_arr);
                    //判断生成单据信息是否有错误，有错才重新生成内部po
                    // if(dg_rec.getValue("custrecord_cl_error_message") == 'create po error'){
                    nb_po_id = createPo(po_id,start_location,on_location,end_location,sku,actual_shipment_quantity,shipment_item_type_t,dgjh_detail_id,"ONE",nb_orgin_price_one,nb_tran_price_one,nb_orgin_price_two,nb_tran_price_two,nb_add_price_one,nb_add_price_two);
                    if(nb_po_id){
                        po_arr.push(nb_po_id);

                        //   del_po_arr_one.push(nb_po_id);
                        if(po_id){
                            setNbPoToWbPo(po_id,nb_po_id,'one');
                        }
                    }
                    // }
                }else{
                    // log.debug("一级交易起始仓",start_location);
                    //生成内部采购
                    nb_po_id = createPo(po_id,start_location,on_location,end_location,sku,actual_shipment_quantity,shipment_item_type_t,dgjh_detail_id,"ONE",nb_orgin_price_one,nb_tran_price_one,nb_orgin_price_two,nb_tran_price_two,nb_add_price_one,nb_add_price_two);
                    if(nb_po_id){
                        po_arr.push(nb_po_id);

                        //   del_po_arr_one.push(nb_po_id);
                        if(po_id){
                            setNbPoToWbPo(po_id,nb_po_id,'one');
                        }
                    }
                }
            }
            /**-----------------------二级内部交易po-----------------------------***/
            else if(ns_type == 2){
                if(one_nb_po.length > 0 || two_nb_po.length > 0){
                    if(one_nb_po.length > 0){
                        po_arr = arrayAdd(one_nb_po,po_arr);
                        //中转po
                        nb_po_id_one = createPo(po_id,start_location,on_location,end_location,sku,actual_shipment_quantity,shipment_item_type_t,dgjh_detail_id,"TWO1",nb_orgin_price_one,nb_tran_price_one,nb_orgin_price_two,nb_tran_price_two,nb_add_price_one,nb_add_price_two);
                        if(nb_po_id_one){
                            po_arr.push(nb_po_id_one);

                            //   del_po_arr_one.push(nb_po_id_one);
                            if(po_id){
                                setNbPoToWbPo(po_id,nb_po_id_one,'one');
                            }
                        }
                    }
                    if(two_nb_po.length > 0){
                        po_arr_t = arrayAdd(two_nb_po,po_arr_t);
                        //目的po
                        nb_po_id_two = createPo(po_id,start_location,on_location,end_location,sku,actual_shipment_quantity,shipment_item_type_t,dgjh_detail_id,"TWO2",nb_orgin_price_one,nb_tran_price_one,nb_orgin_price_two,nb_tran_price_two,nb_add_price_one,nb_add_price_two);
                        if(nb_po_id_two){
                            po_arr_t.push(nb_po_id_two);

                            //   del_po_arr_two.push(nb_po_id_two);
                            if(po_id){
                                setNbPoToWbPo(po_id,nb_po_id_two,'two');
                            }
                        }
                    }
                }
                else{
                    //中转po
                    nb_po_id_one = createPo(po_id,start_location,on_location,end_location,sku,actual_shipment_quantity,shipment_item_type_t,dgjh_detail_id,"TWO1",nb_orgin_price_one,nb_tran_price_one,nb_orgin_price_two,nb_tran_price_two,nb_add_price_one,nb_add_price_two);
                    //目的po
                    nb_po_id_two = createPo(po_id,start_location,on_location,end_location,sku,actual_shipment_quantity,shipment_item_type_t,dgjh_detail_id,"TWO2",nb_orgin_price_one,nb_tran_price_one,nb_orgin_price_two,nb_tran_price_two,nb_add_price_one,nb_add_price_two);
                    if(nb_po_id_one){
                        po_arr.push(nb_po_id_one);

                        //   del_po_arr_one.push(nb_po_id_one);
                        if(po_id){
                            setNbPoToWbPo(po_id,nb_po_id_one,'one');
                        }
                    }
                    if(nb_po_id_two){
                        po_arr_t.push(nb_po_id_two);

                        //   del_po_arr_two.push(nb_po_id_two);
                        if(po_id){
                            setNbPoToWbPo(po_id,nb_po_id_two,'two');
                        }
                    }
                }
            }
            // log.debug("新建内部采购id",nb_po_id);
            //回写订柜计划,实际发货数量清零
            if(po_arr.length > 0){
                log.debug("一级po合集",po_arr);
                dg_rec.setCurrentSublistValue({
                    sublistId:'recmachcustrecord_sl_rp_body',
                    fieldId:'custrecord_sl_dg_gsj_po',        //一级内部交易po
                    value:po_arr
                });
                dg_rec.setCurrentSublistValue({
                    sublistId:'recmachcustrecord_sl_rp_body',
                    fieldId:'custrecord_actual_shipment_quantity',//实际发货数量
                    value:0
                });
                save_flag = "Y";
            }
            if(po_arr_t.length > 0){
                log.debug("二级po合集",po_arr_t);
                dg_rec.setCurrentSublistValue({
                    sublistId:'recmachcustrecord_sl_rp_body',
                    fieldId:'custrecord_sl_dg_gsj_po2',        //二级内部交易po
                    value:po_arr_t
                });
                dg_rec.setCurrentSublistValue({
                    sublistId:'recmachcustrecord_sl_rp_body',
                    fieldId:'custrecord_actual_shipment_quantity',//实际发货数量
                    value:0
                });
                save_flag = "Y";
            }
            //发货累计
            if(save_flag == 'Y'){
                if(cumulative_shipment_quantity){
                    dg_rec.setCurrentSublistValue({
                        sublistId:'recmachcustrecord_sl_rp_body',
                        fieldId:'custrecord_cumulative_shipment_quantity',//发货累计数量
                        value:Number(cumulative_shipment_quantity) + Number(actual_shipment_quantity),
                    });
                }else{
                    dg_rec.setCurrentSublistValue({
                        sublistId:'recmachcustrecord_sl_rp_body',
                        fieldId:'custrecord_cumulative_shipment_quantity',//发货累计数量
                        value:Number(actual_shipment_quantity),
                    });
                }
                dg_rec.setCurrentSublistValue({
                    sublistId:'recmachcustrecord_sl_rp_body',
                    fieldId:'custrecord_internal_transactions',//公司间交易是否完成
                    value:false,
                });
            }
            return save_flag;
        }
        function setNbPoToWbPo(po_id,nb_po_id,flag) {
            if(po_id){
                if(flag == 'one'){
                    record.submitFields({
                        type:'purchaseorder',
                        id:po_id,
                        values:{
                            custbody_internal_po:nb_po_id,       //关联的一级内部采购单
                        }
                    });
                }
                else if(flag == 'two'){
                    record.submitFields({
                        type:'purchaseorder',
                        id:po_id,
                        values:{
                            custbody_second_internal_po:nb_po_id,//关联二级颞部采购单
                        }
                    });
                }
            }
        }
        function createNbTo(ns_type,dg_rec,nb_to,to_arr,nb_to_id,shipment_item_type_t,actual_shipment_quantity,cumulative_shipment_quantity,start_location,end_location,sku,to_flag,save_flag,dgjh_detail_id) {
            var ifir_flag = 'N';
            if(ns_type == 4){
                if(nb_to.length > 0){
                    to_arr = arrayAdd(nb_to,to_arr);
                    try{
                        nb_to_id = createTo(shipment_item_type_t,actual_shipment_quantity,start_location,end_location,sku,dgjh_detail_id);
                    }catch(e){
                        log.debug('生成公司间TO出错',e);
                        to_flag = e.message;
                    }
                    if(nb_to_id != 0){
                        to_arr.push(nb_to_id);
                        //to自动收发货
                        ifir_flag = toTransferIrIF(nb_to_id,actual_shipment_quantity,sku,start_location);
                    }
                }
                else{
                    try{
                        nb_to_id = createTo(shipment_item_type_t,actual_shipment_quantity,start_location,end_location,sku,dgjh_detail_id);
                    }catch(e){
                        log.debug('生成公司间TO出错',e);
                        to_flag = e.message;
                    }
                    if(nb_to_id != 0){
                        to_arr.push(nb_to_id);
                        //to自动收发货
                        ifir_flag = toTransferIrIF(nb_to_id,actual_shipment_quantity,sku,start_location);
                    }
                }
                if(to_arr.length > 0){
                    log.debug('to合集',to_arr);
                    dg_rec.setCurrentSublistValue({
                        sublistId:'recmachcustrecord_sl_rp_body',
                        fieldId:'custrecord_company_it_order',        //公司内TO
                        value:to_arr
                    });
                    log.debug('ifir_flag',ifir_flag);
                    if(ifir_flag == 'Y_if'){
                        dg_rec.setCurrentSublistValue({
                            sublistId:'recmachcustrecord_sl_rp_body',
                            fieldId:'custrecord_out_of_warehouse_time',        //发运时间
                            value:format.parse({value:new Date(new Date().getTime()+(parseInt(new Date().getTimezoneOffset()/60) + 8)*3600*1000),type:format.Type.DATE}),
                        });
                    }
                    log.debug('to_flag',to_flag);
                    if(to_flag == 'Y'){
                        dg_rec.setCurrentSublistValue({
                            sublistId:'recmachcustrecord_sl_rp_body',
                            fieldId:'custrecord_actual_shipment_quantity',//实际发货数量
                            value:0
                        });
                        dg_rec.setCurrentSublistValue({
                            sublistId:'recmachcustrecord_sl_rp_body',
                            fieldId:'custrecord_error',        //公司间交易报错
                            value:''
                        });
                        //发货累计
                        if(cumulative_shipment_quantity){
                            dg_rec.setCurrentSublistValue({
                                sublistId:'recmachcustrecord_sl_rp_body',
                                fieldId:'custrecord_cumulative_shipment_quantity',//发货累计数量
                                value:Number(cumulative_shipment_quantity) + Number(actual_shipment_quantity),
                            });
                        }else{
                            dg_rec.setCurrentSublistValue({
                                sublistId:'recmachcustrecord_sl_rp_body',
                                fieldId:'custrecord_cumulative_shipment_quantity',//发货累计数量
                                value:Number(actual_shipment_quantity),
                            });
                        }
                    }else{
                        dg_rec.setCurrentSublistValue({
                            sublistId:'recmachcustrecord_sl_rp_body',
                            fieldId:'custrecord_error',        //公司间交易报错
                            value:'公司间TO报错：' + to_flag
                        });
                    }
                    save_flag = 'Y';
                }
                else{
                    dg_rec.setCurrentSublistValue({
                        sublistId:'recmachcustrecord_sl_rp_body',
                        fieldId:'custrecord_error',        //公司间交易报错
                        value:'公司间TO报错：' + to_flag
                    });
                    save_flag = 'Y';
                }
            }
            log.debug('to save_flag',save_flag);
            return save_flag;
        }
        function arrayAdd(array_orgin,array_out) {//TODO:数组添加元素
            if(array_orgin.length > 0){
                for(var i = 0;i < array_orgin.length;i++){
                    array_out.push(array_orgin[i]);
                }
                return array_out;
            }
        }
        function checkShipmentType(shipment_item_type_t) {
            var flag = 'init';
            if(shipment_item_type_t){
                if(shipment_item_type_t.indexOf("供应商直发平台仓") != -1 || shipment_item_type_t.indexOf("供应商直发海外仓") != -1){
                    flag = 'vendor';
                }
                else if(shipment_item_type_t.indexOf("国内仓直发平台仓") != -1 || shipment_item_type_t.indexOf("国内仓直发海外仓") != -1){
                    flag = 'gnout'
                }
                else if(shipment_item_type_t.indexOf("海外仓转平台仓") != -1 || shipment_item_type_t.indexOf("海外仓转海外仓") != -1 || shipment_item_type_t.indexOf("平台仓转海外仓") != -1){
                    flag = 'outsea';
                }
            }
            return flag;
        }
        function wbPoToiriv(po_id,actual_qty,wb_po_arr,line_sku,line_key) {
            var do_flag = 'Y';
            var ir_Id;
            var vendorbill_Id;
            var ir_error = 'n';
            var vb_error = 'n';
            log.debug('外部po生成单据的数量',actual_qty);
            if(po_id){
                //首先判断是否有相同的外部po已经收货
                log.debug('wb_po_arr',wb_po_arr);
                if(wb_po_arr.length > 0){
                    for(var p = 0;p < wb_po_arr.length;p++){
                        if(po_id == wb_po_arr[p].wb_po) {
                            ir_Id = wb_po_arr[p].ir_id
                            vendorbill_Id = wb_po_arr[p].vb_id;
                            do_flag = 'N';
                            break;
                        }
                    }
                }
                log.debug('do_flag',do_flag);
                do_flag = 'Y';
                if(do_flag == 'Y'){
                    //收货开账单
                    var wb_po_rec = record.load({type:'purchaseorder',id:po_id,isDynamic:true});
                    order_status = wb_po_rec.getValue('orderstatus');
                    log.debug('po订单状态',order_status);
                    if(order_status == 'B' || order_status == 'D' || order_status == 'E'){//B:待收货；D:部分收货；E:部分收货/待定账单
                        try{
                            var ir_Rec = record.transform({
                                fromType: 'purchaseorder',
                                fromId: po_id,
                                toType: 'itemreceipt',
                                isDynamic: true
                            });
                            var ir_count = ir_Rec.getLineCount('item');
                            log.debug('ir_count',ir_count);
                            var ir_diff_qty = Number(0);
                            var ir_commit_flag = 'Y';
                            for(var i = 0; i < ir_count;i++){
                                ir_Rec.selectLine('item',i);
                                var sku = ir_Rec.getCurrentSublistValue({
                                    sublistId:'item',
                                    fieldId:'item',
                                });
                                var ir_line_key = ir_Rec.getCurrentSublistValue({
                                    sublistId:'item',
                                    fieldId:'custcol_hc_source_order_unique_key',
                                });
                                log.debug('sku line_sku ir_line_key line_key',sku + '---' + line_sku + '---' + ir_line_key + '---' + line_key);
                                if(sku == line_sku && line_key == ir_line_key){
                                    var qty = ir_Rec.getCurrentSublistValue({
                                        sublistId:'item',
                                        fieldId:'quantity',
                                    });
                                    var is_receive = ir_Rec.getCurrentSublistValue({
                                        sublistId:'item',
                                        fieldId:'itemreceive',
                                    });
                                    if(ir_diff_qty == 0 && ir_commit_flag == 'Y'){
                                        if(qty >= actual_qty){
                                            ir_Rec.setCurrentSublistValue({            //TODO：部分收货，部分发货只需要赋值数量字段就可以，但是发货需要系统设置一下
                                                sublistId:'item',
                                                fieldId:'quantity',
                                                value:actual_qty
                                            });
                                            ir_Rec.commitLine('item');
                                            ir_commit_flag = 'N';
                                        }
                                        else if(qty < actual_qty){
                                            ir_Rec.setCurrentSublistValue({
                                                sublistId:'item',
                                                fieldId:'quantity',
                                                value:qty
                                            });
                                            ir_Rec.commitLine('item');
                                            ir_diff_qty = Number(actual_qty) - Number(qty);
                                        }
                                    }
                                    else if(ir_commit_flag == 'Y'){
                                        if(qty >= ir_diff_qty){
                                            ir_Rec.setCurrentSublistValue({
                                                sublistId:'item',
                                                fieldId:'quantity',
                                                value:ir_diff_qty
                                            });
                                            ir_Rec.commitLine('item');
                                            ir_commit_flag = 'N';
                                        }
                                        else if(qty < ir_diff_qty){
                                            ir_Rec.setCurrentSublistValue({
                                                sublistId:'item',
                                                fieldId:'quantity',
                                                value:qty
                                            });
                                            ir_Rec.commitLine('item');
                                            ir_diff_qty = Number(ir_diff_qty) - Number(qty);
                                        }
                                    }
                                    else if(ir_commit_flag == 'N'){
                                        ir_Rec.setCurrentSublistValue({
                                            sublistId:'item',
                                            fieldId:'itemreceive',
                                            value:false
                                        });
                                        ir_Rec.commitLine('item');
                                    }
                                }
                                else {
                                    ir_Rec.setCurrentSublistValue({
                                        sublistId:'item',
                                        fieldId:'itemreceive',
                                        value:false
                                    });
                                    ir_Rec.commitLine('item');
                                }
                            }
                            ir_Id = ir_Rec.save();
                            log.debug('收货单id', ir_Id);
                        }catch(e){
                            log.debug('生成收货单报错',e);
                            ir_error = e.message;
                        }
                        try{
                            var vb_diff_qty = Number(0);
                            var vb_commit_flag = 'Y';
                            if(ir_Id){
                                //账单
                                var vendorbill_Rec = record.transform({fromType:'purchaseorder',fromId:po_id,toType:'vendorbill',isDynamic: true});
                                vendorbill_Rec.setValue('approvalstatus',2);//已核准
                                // vendorbill_Rec.setValue({fieldId:'trandate',value:changeDate(trandate)});
                                var vb_count = vendorbill_Rec.getLineCount('item');
                                for(var j = 0;j < vb_count;j++){
                                    vendorbill_Rec.selectLine('item',j);
                                    var vb_qty = vendorbill_Rec.getCurrentSublistValue({
                                        sublistId:'item',
                                        fieldId:'quantity',
                                    });
                                    var vb_sku = vendorbill_Rec.getCurrentSublistValue({
                                        sublistId:'item',
                                        fieldId:'item',
                                    });
                                    var vb_line_key = vendorbill_Rec.getCurrentSublistValue({
                                        sublistId:'item',
                                        fieldId:'custcol_hc_source_order_unique_key',
                                    });
                                    log.debug('vb_sku line_sku vb_line_key line_key',vb_sku + '---' + line_sku + '---' + vb_line_key + '---' + line_key);
                                    if(vb_sku == line_sku && line_key == vb_line_key){
                                        if(vb_diff_qty == 0 && vb_commit_flag == 'Y'){
                                            if(vb_qty >= actual_qty){
                                                vendorbill_Rec.setCurrentSublistValue({
                                                    sublistId:'item',
                                                    fieldId:'quantity',
                                                    value:actual_qty,
                                                });
                                                vendorbill_Rec.commitLine('item');
                                                vb_commit_flag = 'N';
                                            }
                                            else if(vb_qty < actual_qty){
                                                vendorbill_Rec.setCurrentSublistValue({
                                                    sublistId:'item',
                                                    fieldId:'quantity',
                                                    value:vb_qty,
                                                });
                                                vendorbill_Rec.commitLine('item');
                                                vb_diff_qty = Number(actual_qty) - Number(vb_qty);
                                            }
                                        }
                                        else if(vb_commit_flag == 'Y'){
                                            if(vb_qty >= vb_diff_qty){
                                                vendorbill_Rec.setCurrentSublistValue({
                                                    sublistId:'item',
                                                    fieldId:'quantity',
                                                    value:vb_diff_qty,
                                                });
                                                vendorbill_Rec.commitLine('item');
                                                vb_commit_flag = 'N';
                                            }
                                            else if(vb_qty < vb_diff_qty){
                                                vendorbill_Rec.setCurrentSublistValue({
                                                    sublistId:'item',
                                                    fieldId:'quantity',
                                                    value:vb_qty,
                                                });
                                                vendorbill_Rec.commitLine('item');
                                                vb_diff_qty = Number(vb_diff_qty) - Number(vb_qty);
                                            }
                                        }
                                        else if(vb_commit_flag == 'N'){
                                            vendorbill_Rec.setCurrentSublistValue({
                                                sublistId:'item',
                                                fieldId:'itemreceive',
                                                value:false,
                                            });
                                            vendorbill_Rec.commitLine('item');
                                        }
                                    }
                                    else{
                                        vendorbill_Rec.setCurrentSublistValue({
                                            sublistId:'item',
                                            fieldId:'itemreceive',
                                            value:false,
                                        });
                                        vendorbill_Rec.commitLine('item');
                                    }
                                }
                                vendorbill_Id = vendorbill_Rec.save();
                                log.debug('账单id',vendorbill_Id);
                            }
                        }catch(e){
                            log.debug('收货单后生成账单报错',e);
                            vb_error = e.message;
                        }
                    }
                    else if(order_status == 'F'){//待定账单
                        try{
                            var vb_diff_qty2 = Number(0);
                            //账单
                            var vendorbill_Rec2 = record.transform({fromType:'purchaseorder',fromId:po_id,toType:'vendorbill',isDynamic: true});
                            vendorbill_Rec2.setValue('approvalstatus',2);//已核准
                            // vendorbill_Rec2.setValue({fieldId:'trandate',value:changeDate(trandate)});
                            var vb_count2 = vendorbill_Rec2.getLineCount('item');
                            for(var j2 = 0;j2 < vb_count2;j2++){
                                vendorbill_Rec2.selectLine('item',j2);
                                var vb_qty2 = vendorbill_Rec2.getCurrentSublistValue({
                                    sublistId:'item',
                                    fieldId:'quantity',
                                });
                                var vb_sku2 = vendorbill_Rec2.getCurrentSublistValue({
                                    sublistId:'item',
                                    fieldId:'item',
                                });
                                var vb_line_key2 = vendorbill_Rec2.getCurrentSublistValue({
                                    sublistId:'item',
                                    fieldId:'custcol_hc_source_order_unique_key',
                                });
                                log.debug('vb_line_key2 line_key',vb_line_key2 + '---' + line_key);
                                if(vb_sku2 == line_sku && vb_line_key2 == line_key){
                                    if(vb_diff_qty2 == 0){
                                        if(vb_qty2 >= actual_qty){
                                            vendorbill_Rec2.setCurrentSublistValue({
                                                sublistId:'item',
                                                fieldId:'quantity',
                                                value:actual_qty,
                                            });
                                            vendorbill_Rec2.commitLine('item');
                                            break;
                                        }
                                        else if(vb_qty2 < actual_qty){
                                            vendorbill_Rec2.setCurrentSublistValue({
                                                sublistId:'item',
                                                fieldId:'quantity',
                                                value:vb_qty,
                                            });
                                            vendorbill_Rec2.commitLine('item');
                                            vb_diff_qty2 = Number(actual_qty) - Number(vb_qty2);
                                        }
                                    }
                                    else {
                                        if(vb_qty2 >= vb_diff_qty2){
                                            vendorbill_Rec2.setCurrentSublistValue({
                                                sublistId:'item',
                                                fieldId:'quantity',
                                                value:vb_diff_qty2,
                                            });
                                            vendorbill_Rec2.commitLine('item');
                                            break;
                                        }
                                        else if(vb_qty2 < vb_diff_qty2){
                                            vendorbill_Rec2.setCurrentSublistValue({
                                                sublistId:'item',
                                                fieldId:'quantity',
                                                value:vb_qty2,
                                            });
                                            vendorbill_Rec2.commitLine('item');
                                            vb_diff_qty2 = Number(vb_diff_qty2) - Number(vb_qty2);
                                        }
                                    }
                                }
                                else{
                                    vendorbill_Rec2.setCurrentSublistValue({
                                        sublistId:'item',
                                        fieldId:'itemreceive',
                                        value:false,
                                    });
                                    vendorbill_Rec2.commitLine('item');
                                }
                            }
                            vendorbill_Id = vendorbill_Rec2.save();
                            log.debug('账单id',vendorbill_Id);
                        }catch(e){
                            log.debug('直接生成账单报错',e);
                            vb_error = e.message;
                        }
                    }
                    else{
                        ir_error = '检查采购订单状态';
                        vb_error = '检查采购订单状态';
                    }
                }


                return {
                    "ir_id":ir_Id,
                    "vendorbill_Id":vendorbill_Id,
                    "ir_error":ir_error,
                    "vb_error":vb_error,
                }
            }
        }
        function createTo(shipment_item_type_t,actual_shipment_quantity,start_location,end_location,sku,dgjh_detail_id) {
            var location_data = getLocation(end_location);
            var to_sub = location_data.subsidiary;
            var to_start_location = start_location;
            var to_end_location = location_data.ontheway_location;
            log.debug('出货计划类型',shipment_item_type_t);
            // if(shipment_item_type_t.indexOf("国内直发FBA") != -1 || shipment_item_type_t.indexOf("海外仓转平台仓") != -1 || shipment_item_type_t.indexOf("供应商直发FBA") != -1){
            //     if(to_sub == 23 || to_sub == 25){
            //         to_end_location = 127;//FBA在途仓-香港
            //     }else if(to_sub == 24){
            //         to_end_location = 126;//FBA在途仓-美国
            //     }
            // }
            // else if(shipment_item_type_t.indexOf("国内直发海外仓") != -1 || shipment_item_type_t.indexOf("供应商直发海外仓") != -1 || shipment_item_type_t.indexOf("海外仓转海外仓") != -1 || shipment_item_type_t.indexOf("FBA转海外仓") != -1){
            //     if(to_sub == 23 || to_sub == 25){
            //         to_end_location = 429;//海外仓在途仓-香港
            //     }else if(to_sub == 24){
            //         to_end_location = 428;//海外仓在途仓-美国
            //     }
            // }

            //创建公司间to单
            var nb_to_rec = record.create({type:'transferorder',isDynamic:true});
            //主体字段
            nb_to_rec.setValue('subsidiary',to_sub);
            nb_to_rec.setText('custbody_hl_bsq_order_type',shipment_item_type_t);//调拨类型
            nb_to_rec.setValue('location',to_start_location);
            nb_to_rec.setValue('transferlocation',to_end_location);
            nb_to_rec.setText('orderstatus','等待发货');
            nb_to_rec.setText('incoterm','DAP');//贸易术语
            nb_to_rec.setValue('custbody_sl_df_detail',dgjh_detail_id);//订柜计划明细
            //明细
            nb_to_rec.selectNewLine('item');
            nb_to_rec.setCurrentSublistValue({
                sublistId:'item',
                fieldId:'item',     //货品
                value:sku,
            });
            nb_to_rec.setCurrentSublistValue({
                sublistId:'item',
                fieldId:'quantity',     //数量
                value:actual_shipment_quantity,
            });
            nb_to_rec.commitLine('item');

            var nb_to_rec_id = nb_to_rec.save();
            return nb_to_rec_id;
        }
        function toTransferIrIF(to_Id,actual_shipment_quantity,sku,start_location) {
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
                            to_if_rec.setCurrentSublistValue({
                                sublistId:'item',
                                fieldId:'item',
                                value:sku
                            });
                            to_if_rec.setCurrentSublistValue({
                                sublistId:'item',
                                fieldId:'location',
                                value:start_location
                            });
                            to_if_rec.setCurrentSublistValue({        //TODO：部分收货，部分发货只需要赋值数量字段就可以，但是发货需要系统设置一下
                                sublistId:'item',
                                fieldId:'quantity',
                                value:actual_shipment_quantity
                            });
                            to_if_rec.setCurrentSublistValue({
                                sublistId:'item',
                                fieldId:'itemreceive',
                                value:true
                            });
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
        function createIt(start_location,on_location,end_location,shipment_item_type_t,dgjh_detail_id,sku,actual_receipt_quantity,dgjh_id,create_it_flag) {
            var s_location;
            var it_sub;
            var e_location;
            var in_location_type;
            var location_data;
            if(create_it_flag == 'ONE' || create_it_flag == 'TWO2'){
                location_data = getLocation(end_location);
                it_sub = location_data.subsidiary;
                e_location = end_location;
                s_location = location_data.ontheway_location;
            }else if(create_it_flag == 'TWO1'){
                location_data = getLocation(on_location);
                it_sub = location_data.subsidiary;
                e_location = on_location;
                s_location = location_data.ontheway_location;
            }
            log.debug('出货计划类型',shipment_item_type_t);
            if(shipment_item_type_t.indexOf("国内直发FBA") != -1 || shipment_item_type_t.indexOf("海外仓转平台仓") != -1 || shipment_item_type_t.indexOf("供应商直发FBA") != -1){
                // if(it_sub == 23 || it_sub == 25){
                //     s_location = 127;//FBA在途仓-香港
                // }else if(it_sub == 24){
                //     s_location = 126;//FBA在途仓-美国
                // }
                in_location_type = 1;
            }
            else if(shipment_item_type_t.indexOf("国内直发海外仓") != -1 || shipment_item_type_t.indexOf("供应商直发海外仓") != -1 || shipment_item_type_t.indexOf("海外仓转海外仓") != -1 || shipment_item_type_t.indexOf("FBA转海外仓") != -1){
                // if(it_sub == 23 || it_sub == 25){
                //     s_location = 429;//海外仓在途仓-香港
                // }else if(it_sub == 24){
                //     s_location = 428;//海外仓在途仓-美国
                // }
                in_location_type = 2;
            }

            //创建IT单
            var nb_it_rec = record.create({type:'inventorytransfer',isDynamic:true});
            //主体字段
            nb_it_rec.setText("customform","BSQ_库存转移单");//表格样式,BSQ_库存转移单
            nb_it_rec.setValue('subsidiary',it_sub);//子公司
            nb_it_rec.setText('custbody_hl_bsq_order_type',shipment_item_type_t);//转移类型
            nb_it_rec.setValue('custbody_warehousing_type',in_location_type);//TODO:入库类型，测试  1,fba入库 2 ：海外仓入库
            nb_it_rec.setValue('location',s_location);//起始仓
            nb_it_rec.setValue('transferlocation',e_location);//目的仓
            nb_it_rec.setValue('custbody_hl_bsq_booking_plan_number',dgjh_id);//订柜计划单号
            nb_it_rec.setValue('custbody_sl_df_detail',dgjh_detail_id);//订柜计划明细
            //明细
            nb_it_rec.selectNewLine('inventory');
            nb_it_rec.setCurrentSublistValue({
                sublistId:'inventory',
                fieldId:'item',     //货品
                value:sku,
            });
            nb_it_rec.setCurrentSublistValue({
                sublistId:'inventory',
                fieldId:'adjustqtyby',     //要转移数量
                value:actual_receipt_quantity,
            });
            nb_it_rec.commitLine('inventory');

            var nb_it_rec_id = nb_it_rec.save();
            return nb_it_rec_id;
        }
        function createPo(po_id,start_location,on_location,end_location,sku,actual_shipment_quantity,shipment_item_type_t,dgjh_detail_id,create_po_flag,nb_orgin_price_one,nb_tran_price_one,nb_orgin_price_two,nb_tran_price_two,nb_add_price_one,nb_add_price_two) {
            var jcbi_data;
            var po_sub;
            var nb_price_data;
            var po_rate;
            var po_orgin_price;
            var po_add_price;
            var po_location;
            var location_data;
            if(create_po_flag == 'ONE'){
                jcbi_data = getJcbi(getLocation(start_location).subsidiary,getLocation(end_location).subsidiary);
            }
            else if(create_po_flag == 'TWO1'){
                jcbi_data = getJcbi(getLocation(start_location).subsidiary,getLocation(on_location).subsidiary);
            }
            else if(create_po_flag == 'TWO2'){
                jcbi_data = getJcbi(getLocation(on_location).subsidiary,getLocation(end_location).subsidiary);
            }
            //内部采购字段数据
            if(create_po_flag == 'ONE' || create_po_flag == 'TWO2'){
                location_data = getLocation(end_location);
                po_sub = location_data.subsidiary;
                po_location = location_data.ontheway_location;
            }
            else if(create_po_flag == 'TWO1'){
                location_data = getLocation(on_location);
                po_sub = location_data.subsidiary;
                po_location = location_data.ontheway_location;
            }

            // if(create_po_flag == 'ONE' || create_po_flag == 'TWO1'){
            //     nb_price_data = getNbPrice(po_id,jcbi_data,sku,start_location);
            // }
            // else if(create_po_flag == 'TWO2'){
            //     nb_price_data = getNbPrice(po_id,getJcbi(getLocation(start_location).subsidiary,getLocation(on_location).subsidiary),sku,start_location);
            // }
            var po_currency_text = jcbi_data.currency_text;
            var po_vendor = jcbi_data.nbVendor;

            if(create_po_flag == 'ONE' || create_po_flag == 'TWO1'){
                // po_rate = nb_price_data.nb_price;
                // po_orgin_price = nb_price_data.nb_rate * nb_price_data.nb_hl;//基价
                // po_add_price = Number(po_rate) - Number(po_orgin_price);//加价
                po_rate = nb_tran_price_one;   //交易价                nb_orgin_price_one ,nb_tran_price_one,nb_orgin_price_two,nb_tran_price_two,nb_add_price_one,nb_add_price_two
                po_orgin_price = nb_orgin_price_one;   //基价
                po_add_price = nb_add_price_one;   //加价
            }
            else if(create_po_flag == 'TWO2'){
                // po_rate = nb_price_data.nb_price * (Number(1) + Number(jcbi_data.jcbi.split("%")[0]/100));
                // po_orgin_price = nb_price_data.nb_price;//基价
                // po_add_price = Number(po_rate) - Number(po_orgin_price);//加价
                po_rate = nb_tran_price_two;   //交易价
                po_orgin_price = nb_orgin_price_two;   //基价
                po_add_price = nb_add_price_two;   //加价
            }
            var po_item = sku;
            var po_taxcode = 16;//固定值"VAT_CN:VAT_0%"
            var po_qty = actual_shipment_quantity;
            var po_dingguijihuamingxi = dgjh_detail_id;
            log.debug('出货计划类型',shipment_item_type_t);
            // if(shipment_item_type_t.indexOf("国内直发FBA") != -1 || shipment_item_type_t.indexOf("海外仓转平台仓") != -1 || shipment_item_type_t.indexOf("供应商直发FBA") != -1){
            //     if(po_sub == 23 || po_sub == 25){
            //         po_location = 127;//FBA在途仓-香港
            //     }else if(po_sub == 24){
            //         po_location = 126;//FBA在途仓-美国
            //     }
            // }
            // else if(shipment_item_type_t.indexOf("国内直发海外仓") != -1 || shipment_item_type_t.indexOf("供应商直发海外仓") != -1 || shipment_item_type_t.indexOf("海外仓转海外仓") != -1 || shipment_item_type_t.indexOf("FBA转海外仓") != -1){
            //     if(po_sub == 23 || po_sub == 25){
            //         po_location = 429;//海外仓在途仓-香港
            //     }else if(po_sub == 24){
            //         po_location = 428;//海外仓在途仓-美国
            //     }
            // }

            //创建内部采购
            var poNbRec = record.create({type:'purchaseorder',isDynamic:true});
            // poNbRec.setText("customform","BSQ_采购订单(内部)");//表格样式,BSQ_采购订单(内部)
            poNbRec.setValue('customform',100);
            poNbRec.setValue('entity',po_vendor);//供应商
            poNbRec.setValue('subsidiary',po_sub);//子公司
            poNbRec.setText('currency',po_currency_text);//币种
            poNbRec.setValue('location',po_location);//地点
            poNbRec.setValue('custbody_dingguijihuamingxi',po_dingguijihuamingxi);//来源订柜计划明细
            if(po_id){
                poNbRec.setValue('custbody_external_po',po_id);//关联外部po
            }
            poNbRec.setValue('approvalstatus',2);//已核准
            //货品明细赋值
            poNbRec.selectNewLine('item');
            poNbRec.setCurrentSublistValue({
                sublistId:'item',
                fieldId:'item',     //货品
                value:po_item,
                // line:0
            });
            // poNbRec.setCurrentSublistValue({
            //     sublistId:'item',
            //     fieldId:'taxcode',//税码
            //     value:po_taxcode,
            //     // line:0,
            // });
            poNbRec.setCurrentSublistValue({
                sublistId:'item',
                fieldId:'rate',//单价
                value:po_rate,
                // line:0,
            });
            poNbRec.setCurrentSublistValue({
                sublistId:'item',
                fieldId:'quantity',//数量
                value:po_qty,
                // line:0,
            });
            poNbRec.setCurrentSublistValue({
                sublistId:'item',
                fieldId:'custcol_baseprice1',//基价单价
                value:po_orgin_price,
                // line:0,
            });
            poNbRec.setCurrentSublistValue({
                sublistId:'item',
                fieldId:'custcol_overprice1',//加价单价
                value:po_add_price,
                // line:0,
            });
            poNbRec.setCurrentSublistValue({
                sublistId:'item',
                fieldId:'custcol_baseprice2',//基价总额
                value:po_orgin_price * po_qty,
                // line:0,
            });
            poNbRec.setCurrentSublistValue({
                sublistId:'item',
                fieldId:'custcol_overprice2',//加价总额
                value:po_add_price * po_qty,
                // line:0,
            });
            poNbRec.commitLine('item');

            var nb_po_id = poNbRec.save();

            return nb_po_id;
        }
        function getNbPrice(po_id,jcbi_data,sku,start_location) {
            var nb_hl = Number(0);
            var nb_rate = Number(0);
            var nb_price = Number(0);
            //有采购单号
            if(po_id){
                var po_data = getPo(po_id);
                log.debug('po_data',po_data);
                nb_hl = Number(getCurrencyRate(po_data.currency_text,"USD"));
                for(var j = 0;j < po_data.itemList.length;j++){
                    if(po_data.itemList[j].item == sku){
                        nb_rate = Number(po_data.itemList[j].rate);
                        nb_price = nb_rate * (Number(1) + Number(jcbi_data.jcbi.split("%")[0]/100)) * nb_hl;
                        log.debug('one nb_price',nb_price);
                        break;
                    }
                }
            }
            //没采购取库存平均成本
            else{
                var locationaveragecost = getLocationaveragecost(sku,start_location);
                log.debug('地点平均成本',locationaveragecost);
                nb_hl = Number(getCurrencyRate(getItem(sku,"1").currency_text,"USD"));
                if(locationaveragecost > 0){//地点平均成本大于零
                    nb_rate = locationaveragecost;
                    nb_price = locationaveragecost * (Number(1) + Number(jcbi_data.jcbi.split("%")[0]/100)) * nb_hl;
                }
                else{//获取货品的上次采购价格
                    locationaveragecost = getItem(sku,"0");
                    log.debug('上次采购价格',locationaveragecost);
                    nb_rate = locationaveragecost;
                    nb_price = locationaveragecost * (Number(1) + Number(jcbi_data.jcbi.split("%")[0]/100)) * nb_hl;
                }
            }
            return {"nb_hl":nb_hl,"nb_rate":nb_rate,"nb_price":nb_price};
        }
        function getPo(poid) {
            if(poid){
                var rec = record.load({
                    type:'purchaseorder',
                    id:poid,
                });
                var itemList = new Array();
                var po_count = rec.getLineCount('item');
                for(var i = 0;i < po_count;i++){
                    var item = rec.getSublistValue({
                        sublistId:'item',
                        fieldId:'item',
                        line:i,
                    });
                    var rate = rec.getSublistValue({
                        sublistId:'item',
                        fieldId:'rate',
                        line:i,
                    });
                    itemList.push({"item":item,"rate":rate});
                }
                return {"currency_text":rec.getText('currency'),"itemList":itemList};
            }
        }
        function getItem(item,flag) {
            if(item){
                var rec = record.load({
                    type:'inventoryitem',
                    id:item
                });
                var item_sub = rec.getValue('subsidiary');
                var item_lastpurchaseprice = rec.getValue('lastpurchaseprice');//上次采购价格
                if(flag == "1"){
                    var sub_data = getSubsidiary(item_sub);
                    return sub_data;
                }else{
                    return item_lastpurchaseprice;
                }
            }
        }
        function getLocationaveragecost(sku,location,subsidiary) { //TODO:获取货品平均成本
            var locationaveragecost = Number(0);
            var mySearch = search.create({
                type:'item',
                filters:[['internalid','anyof',sku],
                    // 'AND',['quantityavailable','greaterthan',0]
                ], //
                columns:[
                    {name:'locationquantityavailable',type:'float',label:'可用地点'},
                    {name:'subsidiarynohierarchy',type:'select',label:'库存地点子公司'},
                    {name:'inventorylocation',type:'select',label:'库存地点'},
                    {name:'quantityavailable',label:'可用'},
                    {name:'locationquantityavailable'},
                    {name:'locationquantitycommitted'},
                    {name:'locationquantitycommitted',label:'地点已确定'},
                    {name:'locationaveragecost',label:'地点平均成本'}
                ]
            });
            var col = mySearch.columns;
            var res = mySearch.run().getRange({start:0,end:1000});
            log.debug('sku location',sku + '--' + location);
            // log.debug('平均成本条数',res.length + JSON.stringify(res));
            if(res.length > 0){
                for(var i = 0;i < res.length;i++){
                    var location_search = res[i].getValue(col[2]);
                    if(location == location_search){
                        locationaveragecost = res[i].getValue(col[7]);
                    }
                }
            }
            return locationaveragecost;
        }
        function getJcbi(so_sub,po_sub) {//paramater:so_sub:发货仓附属公司；po_sub：收获仓附属公司
            if(so_sub && po_sub){
                var mysearch = search.create({
                    type:'customrecord_add_scale_record',
                    filters:[
                        ['custrecord_sales_company','anyof',so_sub],
                        'AND',['custrecord_sourcing_company','anyof',po_sub],
                    ],
                    columns:[
                        'custrecord_currency_internal',
                        'custrecord_bonus_proportion',
                        'custrecord_internal_supplier',
                        'custrecord_internal_customers'
                    ]
                });
                var res = mysearch.run().getRange(0,1);
                if(res.length > 0){
                    return {"currency_text":res[0].getText('custrecord_currency_internal'),"jcbi":res[0].getValue('custrecord_bonus_proportion'),"nbVendor":res[0].getValue('custrecord_internal_supplier'),"nbcustomer":res[0].getValue('custrecord_internal_customers')};
                }
            }
        }
        function getSubsidiary(subsidiary_id) {
            if(subsidiary_id){
                var rec = record.load({
                    type:'subsidiary',
                    id:subsidiary_id,
                });
                var sub_name = rec.getValue('name');
                var currency_text = rec.getText('currency');

                return {"sub_name":sub_name,"currency_text":currency_text};
            }
        }
        function getLocation(location_id) {
            if(location_id){
                var rec = record.load({
                    type:'location',
                    id:location_id,
                });
                var subsidiary = rec.getValue('subsidiary');
                var ontheway_location = rec.getValue('custrecord_ontheway_location');//在途仓

                return {"subsidiary":subsidiary,"ontheway_location":ontheway_location};
            }
        }
        function getCurrencyRate(source,target) {
            if(source && target){
                var rate = exchangeRate.exchangeRate({
                    source:source,
                    target:target,
                    date:new Date(),
                });
                return rate;
            }
        }
        function map(context) {
            log.debug({
                title: 'context map',
                details: context
            });
            var value = JSON.parse(context.value);
            if(value){

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
        return {
            getInputData: getInputData,
            map: map,
            reduce: reduce,
            summarize: summarize
        };
    });