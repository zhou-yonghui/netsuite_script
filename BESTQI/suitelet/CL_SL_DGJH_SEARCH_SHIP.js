/**
 * 供应商账单提交付款界面
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */
define(['N/search', 'N/ui/serverWidget', 'N/runtime', 'N/record', 'N/file', 'N/redirect', 'N/task', 'N/query','N/http','N/format','N/currency'],

    function(search, serverWidget, runtime, record, file, redirect, task, query, http,format,currencyRate) {

        /**
         * Definition of the Suitelet script trigger point.
         *
         * @param {Object} context
         * @param {ServerRequest} context.request - Encapsulation of the incoming request
         * @param {ServerResponse} context.response - Encapsulation of the Suitelet response
         * @Since 2015.2
         */
        function onRequest(context) {
            log.debug('request.parameters',JSON.stringify(context.request.parameters));
            var parameters = context.request.parameters;
            log.debug('request.method',context.request.method);
            if(context.request.method == 'GET'){
                var form = createForm(context,parameters);
                if(parameters.no){
                    //对表单赋值
                    form = setFieldToForm(form,parameters);
                }
                context.response.writePage(form);
            }
            else{
                // log.debug('post parm',parameters);
                //     //跳转suitelet初始页面
                //     // redirect.toSuitelet({
                //     //     scriptId:'customscript_cl_sl_vb_cp',
                //     //     deploymentId: 'customdeploy_cl_sl_vb_cp',
                //     // });
                //     // context.response.writePage(form);
                //获取页面数据
                var all_data = getCheckSublistValue(context);
                var ret = getOutInfo(all_data);
                log.debug('ret',ret);
                //跳转结果页面
                var form = endForm(context,ret);
                context.response.writePage(form);
            }
        }
        function endForm(context,ret) {
            var wo_url;
            var field_list = [
                {
                    "id":'custpage_result_info',
                    "type":serverWidget.FieldType.LABEL,
                    "label":'<a target="_blank"><p style="color: blue;">生成成功的条数：'+ ret.result.success.num + '</P></a>',
                },
                {
                    "id":'custpage_result_info_2',
                    "type":serverWidget.FieldType.LABEL,
                    "label":'<a target="_blank"><p style="color: blue;">生成失败的条数:' + ret.result.fail.num + '</P></a>',
                },
                {
                    "id":'custpage_result_info_3',
                    "type":serverWidget.FieldType.LABEL,
                    "label":'<a target="_blank"><p style="color: blue;">生成单据失败:没有要生成的数据</P></a>',
                },
            ]
            // if(){
            /**form主体信息 */
            var form = serverWidget.createForm({
                title: '订柜计划明细发运生成结果页面',
            });
            for(var i = 0;i < field_list.length;i++){
                if(ret.flag == '3' && field_list[i].id == 'custpage_result_info_3'){
                    field = form.addField({
                        id:field_list[i].id,
                        type:field_list[i].type,
                        label:field_list[i].label,
                    });
                    break;
                }else {
                    if(field_list[i].id == 'custpage_result_info'){
                        field = form.addField({
                            id:field_list[i].id,
                            type:field_list[i].type,
                            label:field_list[i].label,
                        });
                    }
                    if(field_list[i].id == 'custpage_result_info_2'){
                        field = form.addField({
                            id:field_list[i].id,
                            type:field_list[i].type,
                            label:field_list[i].label,
                        });
                    }
                }
            }
            var page_sublist = form.addSublist({ id: 'custpage_sublistid', type: 'staticlist', label: '生成结果' });
            var dgjh_detail_id = page_sublist.addField({ id: 'custpage_dgjh_detail_id', type: 'text', label: '订柜计划明细单号' });
            dgjh_detail_id.updateDisplayType({ displayType: 'readonly' });
            var status = page_sublist.addField({ id: 'custpage_status', type: 'text', label: '生成状态' });
            status.updateDisplayType({ displayType: 'readonly' });
            var error = page_sublist.addField({ id: 'custpage_error', type: 'text', label: '报错信息' });
            if(ret.flag == '3'){
                wo_url = '未生成';
                page_sublist.setSublistValue({ id: 'custpage_dgjh_detail_id', line: 0, value: wo_url });
            }
            else{
                for(var i = 0;i < Number(ret.result.success.num) + Number(ret.result.fail.num);i++){
                    if(i < ret.result.success.num){
                        wo_url = '<a href="https://6797408-sb1.app.netsuite.com/app/common/custom/custrecordentry.nl?rectype=115&id='+ ret.result.success.ids[i] +'&"><p style="color: blue;">'+ ret.result.success.ids[i] + '</P></a>';
                        page_sublist.setSublistValue({ id: 'custpage_dgjh_detail_id', line: i, value: wo_url });
                        page_sublist.setSublistValue({ id: 'custpage_status', line: i, value: '成功' });
                    }else {
                        wo_url = '<a href="https://6797408-sb1.app.netsuite.com/app/common/custom/custrecordentry.nl?rectype=115&id='+ ret.result.fail.ids[i - ret.result.success.num].id +'&"><p style="color: blue;">'+ ret.result.fail.ids[i - ret.result.success.num].id + '</P></a>';
                        page_sublist.setSublistValue({ id: 'custpage_dgjh_detail_id', line: i, value: wo_url });
                        page_sublist.setSublistValue({ id: 'custpage_status', line: i, value: '失败' });
                        page_sublist.setSublistValue({ id: 'custpage_error', line: i, value: ret.result.fail.ids[i - ret.result.success.num].error });
                    }
                }
            }
            // }
            return form;
        }
        function getCheckSublistValue(context) {
            var all_data = new Object();
            var sublist_data = new Array();
            var count = context.request.getLineCount({group:'custpage_sublist'});
            log.debug('count',count);
            for(var i = 0;i < count;i++){
                var obj = new Object();
                // var check = context.request.getSublistValue({ group: 'custpage_sublist', name: 'custpage_check_sub', line: i });
                // if(check == 'T'){
                    var detail_id = context.request.getSublistValue({ group: 'custpage_sublist', name: 'custpage_dgjh_details_no_id', line: i });
                    obj.detail_id = detail_id;
                // }
                sublist_data.push(obj);
            }
            all_data.sublist_data = sublist_data;

            log.debug('all_data',all_data);
            return all_data;
        }
        function getOutInfo(all_data) {
            var id_success_arr = new Array();
            var id_fail_arr = new Array();
            var ret = new Object();
            if(all_data.sublist_data.length > 0){
                for(var i = 0;i < all_data.sublist_data.length;i++){
                    var detail_id = all_data.sublist_data[i].detail_id;
                    if(detail_id){
                        var ret_data = doRecord(detail_id);
                        log.debug('ret_data',ret_data);
                        if(ret_data.flag == 'success'){
                            id_success_arr.push(ret_data.detailsId);
                        }else if(ret_data.flag == 'fail'){
                            id_fail_arr.push({
                                error:ret_data.error,
                                id:detail_id,
                            });
                        }
                    }
                }
                //返回保存成功或者失败的单号
                var result = new Object();
                var ret_success = new Object();
                var ret_fail = new Object();
                result.success = '';
                result.fail = '';
                if(id_success_arr.length > 0){
                    ret_success.result = '保存成功';
                    ret_success.ids = id_success_arr;
                    ret_success.flag = '1';
                    ret_success.num = id_success_arr.length;

                    result.success = ret_success;
                }else {
                    ret_success.result = '保存成功';
                    ret_success.num = 0;
                    result.success = ret_success;
                }
                if(id_fail_arr.length > 0){
                    ret_fail.result = '保存失败';
                    ret_fail.ids = id_fail_arr;
                    ret_fail.flag = '2';
                    ret_fail.num = id_fail_arr.length;

                    result.fail = ret_fail;
                }else {
                    ret_fail.result = '保存失败';
                    ret_fail.num = 0;
                    result.fail = ret_fail;
                }
                //ret
                ret.result = result;
                ret.flag = '4';
            }else{
                var result_3 = new Object();
                var ret_success_3 = new Object();
                var ret_fail_3 = new Object();
                result_3.success = ret_success_3;
                ret_success_3.num = 0;
                result_3.fail = ret_fail_3;
                ret_fail_3.num = 0;
                ret.result = result_3;
                ret.flag = '3';

            }
            return ret;
        }
        function doRecord(detail_id){
            try{
                var button_flag = 2;

                var del_it_arr_one = new Array();
                var del_it_arr_two = new Array();
                var del_po_arr_one = new Array();
                var del_po_arr_two = new Array();
                var save_flag_arr = new Array();
                var log_rec_obj = new Object();
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
                var wb_po_arr = new Array();
                var dg_rec = record.load({
                    type:'customrecord_sl_dg_detail',
                    id:detail_id,
                    isDynamic:true,
                });
                var sku = dg_rec.getValue({fieldId:'custrecord_sl_dg_detail',});
                var start_location = dg_rec.getValue({fieldId:'custrecord_sl_dc_start_location',});
                var on_location = dg_rec.getValue({fieldId:'custrecord_sl_zz_location',});
                var end_location = dg_rec.getValue({fieldId:'custrecord_sl_dg_md_location',});
                var ns_type =  dg_rec.getValue({
                    fieldId:'custrecord_ns_type', //单据处理类型
                });
                var actual_qty = dg_rec.getValue({
                    fieldId:'custrecord_sl_dg_sku_qty2',             //qty(实际)
                });
                var actual_shipment_quantity = dg_rec.getValue({
                    fieldId:'custrecord_actual_shipment_quantity',//实际发货数量
                });
                var actual_receipt_quantity = dg_rec.getValue({
                    fieldId:'custrecord_actual_receipt_quantity',//实际收货数量
                });
                var cumulative_quantity_received = dg_rec.getValue({
                    fieldId:'custrecord_cumulative_quantity_received',//收货累计数量
                });
                var cumulative_shipment_quantity = dg_rec.getValue({
                    fieldId:'custrecord_cumulative_shipment_quantity',//发货累计数量
                });
                var zj_qty = dg_rec.getValue({
                    fieldId:'custrecord_sl_dg_pass_amount',       //质检数量
                })
                var tag_status_t = dg_rec.getText({
                    fieldId:'custrecord_tag_status',//标签状态
                });
                var po_id = dg_rec.getValue({
                    fieldId:'custrecord_sl_dg_po_number',
                });
                var shipment_item_type_t = dg_rec.getText({
                    fieldId:'custrecord_sl_ch_type1',        //出货计划类型
                });
                var dgjh_detail_id = dg_rec.getValue({
                    fieldId:'id',        //订柜计划明细id
                });
                var wb_po_ir = dg_rec.getValue({
                    fieldId:'custrecord_sl_dg_po_inbound', //外部po收货单
                });
                var wb_po_vb = dg_rec.getValue({
                    fieldId:'custrecord_purchase_bill',//外部po账单
                });
                var one_nb_po = dg_rec.getValue({
                    fieldId:'custrecord_sl_dg_gsj_po',        //一级内部交易po
                });
                var two_nb_po = dg_rec.getValue({
                    fieldId:'custrecord_sl_dg_gsj_po2',        //二级内部交易po
                });
                var one_nb_it = dg_rec.getValue({
                    fieldId:'custrecord_company_it_order1',        //公司内it1
                });
                var two_nb_it = dg_rec.getValue({
                    fieldId:'custrecord_company_it_order22',        //公司内it2
                });
                var three_nb_it = dg_rec.getValue({
                    fieldId:'custrecord_company_it_order3',        //公司内it3
                });
                var nb_to = dg_rec.getValue({
                    fieldId:'custrecord_company_it_order',        //公司间TO
                });
                var po_error = dg_rec.getValue({
                    fieldId:'custrecord_error',        //公司间交易报错
                });
                var ir_one_date = dg_rec.getValue({
                    fieldId:'custrecord_first_warehousing_date',        //第一次入库时间
                });
                var nb_orgin_price_one = dg_rec.getValue({
                    fieldId:'custrecord_origin1',              //一级基价
                });
                var nb_add_price_one = dg_rec.getValue({
                    fieldId:'custrecord_add1',        //一级加价
                });
                var nb_tran_price_one = dg_rec.getValue({
                    fieldId:'custrecord_internal_transaction_price',        //一级交易价
                });
                var nb_orgin_price_two = dg_rec.getValue({
                    fieldId:'custrecord_origin2',              //二级基价
                });
                var nb_add_price_two = dg_rec.getValue({
                    fieldId:'custrecord_add2',        //二级加价
                });
                var nb_tran_price_two = dg_rec.getValue({
                    fieldId:'custrecord_internal_transaction_price2',        //二级交易价
                });
                var is_wb_po = dg_rec.getValue({
                    fieldId:'custrecord_sl_purchase_receipt',        //外部采购收货勾选
                });
                var line_key = dg_rec.getValue({
                    fieldId:'custrecord_hl_row_only_key',        ///采购订单行唯一键
                });
                var ship_type_status = dg_rec.getValue({
                    fieldId:'custrecord_sl_document_status1',     //发运状态
                });
                //首先判断出货计划类型
                var shipment_type_flag = checkShipmentType(shipment_item_type_t);
                log.debug('出货计划类型flag init',shipment_type_flag);
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
                                save_flag_arr.push(save_flag);
                            }
                        }
                    }
                    //有po单，供应商直发FBA和供应商发海外
                    else if(shipment_type_flag == 'vendor' && po_id && ship_type_status != 2){ //不能为已发运
                        log.debug('vendor button',button_flag);
                        // actual_qty = zj_qty;//TODO:供应商类型，外部采购收货、发运用质检数量
                        // log.debug('质检数量',actual_qty);
                        var createNbPoTo_flag = 'N';
                        if(wb_po_ir.length == 0 && wb_po_vb.length == 0){
                            if(button_flag == 1 || (button_flag == 2 && is_wb_po == false)){
                                //外部po收货
                                var do_po_data = wbPoToiriv(po_id,actual_qty,wb_po_arr,sku,line_key);
                                log.debug('外部po自动收货开单数据',do_po_data);
                                if(do_po_data.ir_error != 'n' && do_po_data.vb_error != "n"){
                                    dg_rec.setValue({
                                        fieldId:'custrecord_receiving_error',        //采购收货报错
                                        value:'外部po生成收货单报错：' + do_po_data.ir_error,
                                    });
                                    dg_rec.setValue({
                                        fieldId:'custrecord_statement_error',        //采购账单报错
                                        value:'外部po生成帐单报错：' + do_po_data.vb_error,
                                    });
                                    wb_po_flag = do_po_data.ir_error + '；' +do_po_data.vb_error;
                                    // save_flag = 'Y';
                                    // save_flag_arr.push(save_flag);
                                    // createNbPo_flag = 'Y';
                                }
                                else if(do_po_data.ir_id && do_po_data.vendorbill_Id){
                                    if(do_po_data.ir_id){
                                        dg_rec.setValue({
                                            fieldId:'custrecord_sl_dg_po_inbound',        //采购收货单
                                            value:do_po_data.ir_id,
                                        });
                                        dg_rec.setValue({
                                            fieldId:'custrecord_receiving_error',        //采购收货报错
                                            value:'',
                                        });
                                        dg_rec.setValue({
                                            fieldId:'custrecord_sl_purchase_receipt',        //外部采购收货勾选
                                            value:true,
                                        });
                                        wb_po_obj.ir_id = do_po_data.ir_id;
                                    }
                                    if(do_po_data.vendorbill_Id){
                                        dg_rec.setValue({
                                            fieldId:'custrecord_purchase_bill',        //采购账单
                                            value:do_po_data.vendorbill_Id,
                                        });
                                        dg_rec.setValue({
                                            fieldId:'custrecord_statement_error',        //采购账单报错
                                            value:'',
                                        });
                                        wb_po_obj.vb_id = do_po_data.vendorbill_Id;
                                    }
                                    save_flag = 'Y';
                                    save_flag_arr.push(save_flag);
                                    createNbPoTo_flag = 'Y';
                                }
                                else{
                                    if(do_po_data.ir_id){
                                        dg_rec.setValue({
                                            fieldId:'custrecord_sl_dg_po_inbound',        //采购收货单
                                            value:do_po_data.ir_id,
                                        });
                                        dg_rec.setValue({
                                            fieldId:'custrecord_receiving_error',        //采购收货报错
                                            value:'',
                                        });
                                        dg_rec.setValue({
                                            fieldId:'custrecord_sl_purchase_receipt',        //外部采购收货勾选
                                            value:true,
                                        });
                                        // save_flag = 'Y';
                                        wb_po_obj.ir_id = do_po_data.ir_id;
                                        // save_flag_arr.push(save_flag);
                                    }
                                    if(do_po_data.vendorbill_Id){
                                        dg_rec.setValue({
                                            fieldId:'custrecord_purchase_bill',        //采购账单
                                            value:do_po_data.vendorbill_Id,
                                        });
                                        dg_rec.setValue({
                                            fieldId:'custrecord_statement_error',        //采购账单报错
                                            value:'',
                                        });
                                        wb_po_obj.vb_id = do_po_data.vendorbill_Id;
                                        // save_flag = 'Y';
                                        // save_flag_arr.push(save_flag);
                                    }
                                    if(do_po_data.ir_error != 'n'){
                                        dg_rec.setValue({
                                            fieldId:'custrecord_receiving_error',        //采购收货报错
                                            value:'外部po生成收货单报错：' + do_po_data.ir_error,
                                        });
                                        wb_po_flag = do_po_data.ir_error;
                                        // save_flag = 'Y';
                                        // save_flag_arr.push(save_flag);
                                    }
                                    if(do_po_data.vb_error != 'n'){
                                        dg_rec.setValue({
                                            fieldId:'custrecord_statement_error',        //采购账单报错
                                            value:'外部po生成帐单报错：' + do_po_data.vb_error,
                                        });
                                        wb_po_flag = do_po_data.vb_error;
                                        // save_flag = 'Y';
                                        // save_flag_arr.push(save_flag);
                                    }
                                    if(do_po_data.ir_id || do_po_data.vendorbill_Id){
                                        wb_po_obj.wb_po = po_id;
                                        wb_po_arr.push(wb_po_obj);
                                    }
                                }
                                //业务处理类型为：供应商直发FBA、供应商直发海外仓时
                                log.debug('出货计划类型flag 外部po创建内部po',shipment_type_flag + '---' + createNbPoTo_flag);
                                if(shipment_type_flag == 'vendor' && createNbPoTo_flag == 'Y'){
                                    if(button_flag == 2 || button_flag == 5){
                                        // save_flag = 'F';
                                        if(actual_qty > 0 && ns_type != 4){
                                            //创建内部po关联单据
                                            // save_flag =
                                            var to_sucess_falg_po = createNbPo(dg_rec,save_flag,ns_type,one_nb_po,po_arr,nb_po_id,del_po_arr_one,two_nb_po,nb_po_id_one,po_arr_t,del_po_arr_two,nb_po_id_two,cumulative_shipment_quantity,actual_qty,po_id,start_location,on_location,end_location,sku,shipment_item_type_t,dgjh_detail_id,nb_orgin_price_one,nb_tran_price_one,nb_orgin_price_two,nb_tran_price_two,nb_add_price_one,nb_add_price_two);
                                            if(to_sucess_falg_po != 'Y'){
                                                save_flag_arr.pop();
                                                save_flag_arr.push('N');
                                            }
                                            // save_flag_arr.push(save_flag);
                                        }
                                        else if(actual_qty > 0 && ns_type == 4){
                                            //创建内部to关联单据
                                            // save_flag =
                                            var to_sucess_falg_to = createNbTo(ns_type,dg_rec,nb_to,to_arr,nb_to_id,shipment_item_type_t,actual_qty,cumulative_shipment_quantity,start_location,end_location,sku,to_flag,save_flag,dgjh_detail_id);
                                            if(to_sucess_falg_to != 'Y'){
                                                save_flag_arr.pop();//TODO:删除数组最后一位
                                                save_flag_arr.push('N');
                                            }
                                            // save_flag_arr.push(save_flag);
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
                    /***************************************处理后续数据**********************************************/

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
                        dg_rec.setValue({
                            fieldId:'custrecord_variance_quantity',        //差异数量
                            value:Number(actual_qty) - Number(cumulative_quantity_received),
                        });
                        // }
                        dg_rec.setValue({
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
                                dg_rec.setValue({
                                    fieldId:'custrecord_sl_document_status1',        //发运状态
                                    value:11,                         //部分发运
                                });
                            }
                            else if(actual_qty == cumulative_shipment_quantity && cumulative_shipment_quantity > 0){
                                dg_rec.setValue({
                                    fieldId:'custrecord_sl_document_status1',        //发运状态
                                    value:2,                         //已发运
                                });
                            }
                        }
                        else if(shipment_type_flag == 'vendor'){
                            if(actual_qty){
                                log.debug('供应商类型判断是否发完货');
                                if(actual_qty > cumulative_shipment_quantity && cumulative_shipment_quantity > 0){
                                    dg_rec.setValue({
                                        fieldId:'custrecord_sl_document_status1',        //发运状态
                                        value:11,                         //部分发运
                                    });
                                }
                                else if(actual_qty == cumulative_shipment_quantity && cumulative_shipment_quantity > 0){
                                    dg_rec.setValue({
                                        fieldId:'custrecord_sl_document_status1',        //发运状态
                                        value:2,                         //已发运
                                    });
                                }
                            }
                        }
                        if(cumulative_quantity_received < cumulative_shipment_quantity && cumulative_quantity_received > 0){
                            dg_rec.setValue({
                                fieldId:'custrecord_sl_document_status2',        //收货状态
                                value:5,                         //部分收货
                            });
                        }
                        else if(cumulative_quantity_received >= cumulative_shipment_quantity && cumulative_shipment_quantity > 0){
                            dg_rec.setValue({
                                fieldId:'custrecord_sl_document_status2',        //收货状态
                                value:13,                         //已收货
                            });
                        }
                    }
                    //赋值第一次发货时间发货
                    if(button_flag == 2 && !ir_one_date){
                        dg_rec.setValue({
                            fieldId:'custrecord_out_of_warehouse_time',        //
                            value:format.parse({value:new Date(new Date().getTime()+(parseInt(new Date().getTimezoneOffset()/60) + 8)*3600*1000),type:format.Type.DATE}),
                        });
                    }
                    else if(button_flag == 4 && shipment_type_flag == 'outsea'){
                        dg_rec.setValue({
                            fieldId:'custrecord_out_of_warehouse_time',        //
                            value:format.parse({value:new Date(new Date().getTime()+(parseInt(new Date().getTimezoneOffset()/60) + 8)*3600*1000),type:format.Type.DATE}),
                        });
                    }
                    //保存记录
                    var save_rec_id = dg_rec.save();
                    log.debug('保存结束',save_rec_id);
                    if(save_rec_id){
                        return {
                            flag:'success',
                            detailsId: save_rec_id,
                        }
                    }
                }
            }catch (e){
                log.debug('订柜计划明细操作错误',e);
                return {
                    flag: 'fail',
                    detailsId:detail_id,
                    error:e.message,
                }
            }
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
                // log.debug('wb_po_arr',wb_po_arr);
                // if(wb_po_arr.length > 0){
                //     for(var p = 0;p < wb_po_arr.length;p++){
                //         if(po_id == wb_po_arr[p].wb_po) {
                //             ir_Id = wb_po_arr[p].ir_id
                //             vendorbill_Id = wb_po_arr[p].vb_id;
                //             do_flag = 'N';
                //             break;
                //         }
                //     }
                // }
                // log.debug('do_flag',do_flag);
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
                                        log.debug('first qty actual_qty',qty + '---' + actual_qty);
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
                    dg_rec.setValue({
                        fieldId:'custrecord_company_it_order',        //公司内TO
                        value:to_arr
                    });
                    log.debug('ifir_flag',ifir_flag);
                    if(ifir_flag == 'Y_if'){
                        dg_rec.setValue({
                            fieldId:'custrecord_out_of_warehouse_time',        //发运时间
                            value:format.parse({value:new Date(new Date().getTime()+(parseInt(new Date().getTimezoneOffset()/60) + 8)*3600*1000),type:format.Type.DATE}),
                        });
                    }
                    log.debug('to_flag',to_flag);
                    if(to_flag == 'Y'){
                        dg_rec.setValue({
                            fieldId:'custrecord_actual_shipment_quantity',//实际发货数量
                            value:0
                        });
                        dg_rec.setValue({
                            fieldId:'custrecord_error',        //公司间交易报错
                            value:''
                        });
                        //发货累计
                        if(cumulative_shipment_quantity){
                            dg_rec.setValue({
                                fieldId:'custrecord_cumulative_shipment_quantity',//发货累计数量
                                value:Number(cumulative_shipment_quantity) + Number(actual_shipment_quantity),
                            });
                        }else{
                            dg_rec.setValue({
                                fieldId:'custrecord_cumulative_shipment_quantity',//发货累计数量
                                value:Number(actual_shipment_quantity),
                            });
                        }
                        save_flag = 'Y';
                    }else{
                        dg_rec.setValue({
                            fieldId:'custrecord_error',        //公司间交易报错
                            value:'公司间TO报错：' + to_flag
                        });
                        save_flag = 'N';
                    }
                }
                else{
                    dg_rec.setValue({
                        fieldId:'custrecord_error',        //公司间交易报错
                        value:'公司间TO报错：' + to_flag
                    });
                    save_flag = 'N';
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
            var po_currency_text = jcbi_data.currency_text;
            var po_vendor = jcbi_data.nbVendor;

            if(create_po_flag == 'ONE' || create_po_flag == 'TWO1'){
                po_rate = nb_tran_price_one;   //交易价
                po_orgin_price = nb_orgin_price_one;   //基价
                po_add_price = nb_add_price_one;   //加价
            }
            else if(create_po_flag == 'TWO2'){
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
        function createNbPo(dg_rec,save_flag,ns_type,one_nb_po,po_arr,nb_po_id,del_po_arr_one,two_nb_po,nb_po_id_one,po_arr_t,del_po_arr_two,nb_po_id_two,cumulative_shipment_quantity,actual_shipment_quantity,po_id,start_location,on_location,end_location,sku,shipment_item_type_t,dgjh_detail_id,nb_orgin_price_one,nb_tran_price_one,nb_orgin_price_two,nb_tran_price_two,nb_add_price_one,nb_add_price_two) {
            save_flag = 'F';
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
                dg_rec.setValue({
                    fieldId:'custrecord_sl_dg_gsj_po',        //一级内部交易po
                    value:po_arr
                });
                dg_rec.setValue({
                    fieldId:'custrecord_actual_shipment_quantity',//实际发货数量
                    value:0
                });
                save_flag = "Y";
            }
            if(po_arr_t.length > 0){
                log.debug("二级po合集",po_arr_t);
                dg_rec.setValue({
                    fieldId:'custrecord_sl_dg_gsj_po2',        //二级内部交易po
                    value:po_arr_t
                });
                dg_rec.setValue({
                    fieldId:'custrecord_actual_shipment_quantity',//实际发货数量
                    value:0
                });
                save_flag = "Y";
            }
            //发货累计
            if(save_flag == 'Y'){
                if(cumulative_shipment_quantity){
                    dg_rec.setValue({
                        fieldId:'custrecord_cumulative_shipment_quantity',//发货累计数量
                        value:Number(cumulative_shipment_quantity) + Number(actual_shipment_quantity),
                    });
                }else{
                    dg_rec.setValue({
                        fieldId:'custrecord_cumulative_shipment_quantity',//发货累计数量
                        value:Number(actual_shipment_quantity),
                    });
                }
                dg_rec.setValue({
                    fieldId:'custrecord_internal_transactions',//公司间交易是否完成
                    value:false,
                });
            }
            return save_flag;
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
        function createForm(context,parameters) {
            var field_list = [
                {
                    "id":'custpage_dgjh_no_head',
                    "type":serverWidget.FieldType.TEXTAREA,
                    "label":'订柜计划单号(多单号用英文,分隔开)',
                    // "source":'currency',
                    "group":'custpage_check'
                },
            ]
            var sublist_field_list = [
                //flag:1  text；2  checkbox；3 edit text
                {
                    'id':'custpage_dgjh_no',
                    'type':serverWidget.FieldType.TEXT,
                    'label':'订柜计划单',
                    'flag':'1',
                },
                {
                    'id':'custpage_dgjh_no_id',
                    'type':serverWidget.FieldType.TEXT,
                    'label':'订柜计划单内部id',
                    'flag':'1',
                },
                {
                    'id':'custpage_dgjh_details_status',
                    'type':serverWidget.FieldType.TEXT,
                    'label':'订柜计划状态（明细）',
                    'flag':'1',
                },
                {
                    'id':'custpage_dgjh_status',
                    'type':serverWidget.FieldType.TEXT,
                    'label':'订柜计划状态（表头）',
                    'flag':'1',
                },
                {
                    'id':'custpage_chjh_no',
                    'type':serverWidget.FieldType.TEXT,
                    'label':'出货计划单号',
                    'flag':'1',
                },
                {
                    'id':'custpage_dgjh_details_no',
                    'type':serverWidget.FieldType.TEXT,
                    'label':'订柜计划明细单号',
                    'flag':'1',
                },
                {
                    'id':'custpage_dgjh_details_no_id',
                    'type':serverWidget.FieldType.TEXT,
                    'label':'订柜计划明细单号内部id',
                    'flag':'1',
                },
                {
                    'id':'custpage_ch_type',
                    'type':serverWidget.FieldType.TEXT,
                    'label':'出货计划类型',
                    'flag':'1',
                },
                {
                    'id':'custpage_qty_jh',
                    'type':serverWidget.FieldType.TEXT,
                    'label':'QTY（计划）',
                    'flag':'1',
                },
                {
                    'id':'custpage_qty_sj',
                    'type':serverWidget.FieldType.TEXT,
                    'label':'QTY（实际）',
                    'flag':'1',
                },
                {
                    'id':'custpage_pc_qty',
                    'type':serverWidget.FieldType.TEXT,
                    'label':'质检合格数量',
                    'flag':'1',
                },
            ];
            /**form主体信息 */
            var form = serverWidget.createForm({
                title: '订柜计划发运',
            });
            form.clientScriptModulePath = 'SuiteScripts/client/CL_DGJH_SHIP.js';//关联客户端脚本
            //生成按钮
            if(parameters.no){
                form.addSubmitButton({
                    label: '生成'
                });
            }
            else{
                form.addSubmitButton({
                    label: '生成'
                }).isDisabled = true;
            }
            //查询按钮
            form.addButton({
                id:'custpage_check_button',
                label: '查询',
                functionName:'search'
            });
            //刷新按钮
            form.addButton({
                id:'custpage_refresh_button',
                label:'刷新',
                functionName:'refresh',
            })
            //查询条件
            form.addFieldGroup({
                id: 'custpage_check',
                label: '查询条件',
            });
            //屏幕遮罩
            let hidden_field = form.addField({
                id: 'hidden_info',
                type: serverWidget.FieldType.INLINEHTML,
                label: '屏幕遮罩'
            });
            //hidden_field.updateDisplayType({displayType : serverWidget.FieldDisplayType.HIDDEN});
            // hidden_field.defaultValue =
            //     '<div id="timeoutblocker" style="position: absolute; z-index: 10000; top: 0px; left: 0px; height: 100%; width: 100%; margin: 5px 0px; background-color: rgb(155, 155, 155); opacity: 0.6;"><span style="width:100%;height:100%;line-height:700px;text-align:center;display:block;font-weight: bold; color: #ff4800">加载中，请稍候 ... </span></div>';
            //主体字段
            for(var i = 0;i < field_list.length;i++){
                var field;
                if(field_list[i].id == 'custpage_dgjh_no_head'){
                    field = form.addField({
                        id:field_list[i].id,
                        type:field_list[i].type,
                        label:field_list[i].label,
                        source:field_list[i].source,
                        container:field_list[i].group
                    });
                    // field.isMandatory = true;
                    if(parameters.no && field_list[i].id == 'custpage_dgjh_no_head'){
                        field.defaultValue = parameters.no;
                    }
                }
            }
            //子列表字段
            var sublist = form.addSublist({
                id:'custpage_sublist',
                type:serverWidget.SublistType.LIST,
                label:'查询信息'
            });
            for(var j = 0;j < sublist_field_list.length;j++){
                if(sublist_field_list[j].flag == "1" || sublist_field_list[j].flag == "2"){
                    sublist.addField({
                        id:sublist_field_list[j].id,
                        type:sublist_field_list[j].type,
                        label:sublist_field_list[j].label,
                    });
                }
                else if(sublist_field_list[j].flag == "3"){
                    sublist.addField({
                        id:sublist_field_list[j].id,
                        type:sublist_field_list[j].type,
                        label:sublist_field_list[j].label,
                    }).updateDisplayType({
                        displayType:serverWidget.FieldDisplayType.ENTRY,
                    });
                }
            }

            return form;
        }
        function setFieldToForm(form,parameters) {
            var search_result = doSearch(parameters);
            var res = search_result.run().getRange(0,1000);
            log.debug('res',res.length + JSON.stringify(res));

            var search_col = search_result.columns;
            var sublist_info = form.getSublist('custpage_sublist');
            var line = Number(0);
            for(var i = 0;i < res.length;i++){
                if(res.length > 0){
                    if(res[i].getValue(search_col[1])){
                        sublist_info.setSublistValue({
                            id:'custpage_dgjh_no',       //订柜计划单号
                            value:res[i].getValue(search_col[1]),
                            line:line,
                        })
                    }
                    if(res[i].getValue(search_col[13])){
                        sublist_info.setSublistValue({
                            id:'custpage_dgjh_no_id',       //订柜计划单号内部id
                            value:res[i].getValue(search_col[13]),
                            line:line,
                        })
                    }
                    if(res[i].getValue(search_col[2])){
                        sublist_info.setSublistValue({
                            id:'custpage_dgjh_details_status',       //订柜计划状态（明细）
                            value:res[i].getText(search_col[2]),
                            line:line,
                        })
                    }
                    if(res[i].getValue(search_col[3])){
                        sublist_info.setSublistValue({
                            id:'custpage_dgjh_status',       //订柜计划状态（表头）
                            value:res[i].getText(search_col[3]),
                            line:line,
                        })
                    }
                    if(res[i].getValue(search_col[4])){
                        sublist_info.setSublistValue({
                            id:'custpage_chjh_no',       //出货计划单号
                            value:res[i].getText(search_col[4]),
                            line:line,
                        })
                    }
                    if(res[i].getValue(search_col[0])){
                        sublist_info.setSublistValue({
                            id:'custpage_dgjh_details_no',       //订柜计划明细单号
                            value:res[i].getValue(search_col[0]),
                            line:line,
                        })
                    }
                    if(res[i].getValue(search_col[0])){
                        sublist_info.setSublistValue({
                            id:'custpage_dgjh_details_no_id',       //订柜计划明细单号
                            value:res[i].id,
                            line:line,
                        })
                    }
                    if(res[i].getValue(search_col[14])){
                        sublist_info.setSublistValue({
                            id:'custpage_ch_type',       //出货计划类型
                            value:res[i].getText(search_col[14]),
                            line:line,
                        })
                    }
                    if(res[i].getValue(search_col[12])){
                        sublist_info.setSublistValue({
                            id:'custpage_qty_jh',       //QTY（计划）
                            value:res[i].getValue(search_col[12]),
                            line:line,
                        })
                    }
                    if(res[i].getValue(search_col[11])){
                        sublist_info.setSublistValue({
                            id:'custpage_qty_sj',       //QTY（实际）
                            value:res[i].getValue(search_col[11]),
                            line:line,
                        })
                    }
                    if(res[i].getValue(search_col[5])){
                        sublist_info.setSublistValue({
                            id:'custpage_pc_qty',       //质检合格数量
                            value:res[i].getValue(search_col[5]),
                            line:line,
                        })
                    }
                    line += Number(1);
                }
            }

            return form;
        }
        function doSearch(params) {
            var mySearch = search.create({
                type:'customrecord_sl_dg_detail',
                columns:[
                    {name:'name',label:'ID'},
                    {name:'name',join:'custrecord_sl_rp_body',label:'关联表头(订柜计划单号)'},
                    {name:'custrecord_sl_document_status1',label: '发运状态'},
                    {name:'custrecord_document_status',join:'custrecord_sl_rp_body',label: '单据状态(表头)'},
                    {name:'custrecord_sl_ch_number',label: '出货计划单'},
                    {name:'custrecord_sl_dg_pass_amount',label:'质检合格数量'},
                    {name:'custrecord_sl_dc_start_location',label:'起始仓'},
                    {name:'custrecord_sl_dg_md_location',label:'目的仓'},
                    {name:'custrecord_ontheway_location',join:'CUSTRECORD_SL_DG_MD_LOCATION',label:'在途仓库'},
                    {name:'custrecord_sl_dg_po_number',label:'采购订单号'},
                    {name:'custrecord_hl_row_only_key',label:'采购订单行唯一键'},
                    {name:'custrecord_sl_dg_sku_qty2',label:'QTY（实际）'},
                    {name:'custrecord_sl_dg_sku_qty',label: 'QTY(计划）'},
                    {name:'internalid',join:'custrecord_sl_rp_body',label:'关联表头(订柜计划单号内部id)'},
                    {name:'custrecord_sl_ch_type1',label: '出货计划类型'},
                ]
            });
            var filters = [];
            //科目
            if(params.no){
                var or_filters = [];
                //将订柜计划单号切割
                var no_arr = params.no.split(',');
                log.debug('no_arr',no_arr);
                if(no_arr.length > 0){
                    for(var r = 0;r < no_arr.length;r++){
                        if(r == 0){
                            or_filters[or_filters.length] = ['custrecord_sl_rp_body.name','haskeywords',no_arr[r]];
                        }else {
                            or_filters[or_filters.length] = 'OR';
                            or_filters[or_filters.length] = ['custrecord_sl_rp_body.name','haskeywords',no_arr[r]];
                        }
                    }
                    log.debug('or_filters',or_filters);
                    filters[filters.length] = or_filters;
                }
            }
            if(filters.length > 0){
                filters[filters.length] = 'AND';
                filters[filters.length] = ['custrecord_sl_document_status1','anyof',['9']];
                filters[filters.length] = 'AND';
                filters[filters.length] = ['custrecord_sl_ch_type1','anyof',['3','4','1','2']];
                filters[filters.length] = 'AND';
                filters[filters.length] = ['custrecord_sl_ch_number','noneof',['@NONE@']];
                mySearch.filterExpression = filters;
                log.debug('filterExpression',JSON.stringify(mySearch.filterExpression));
            }

            return mySearch;
        }
        return {
            onRequest: onRequest
        };

    });