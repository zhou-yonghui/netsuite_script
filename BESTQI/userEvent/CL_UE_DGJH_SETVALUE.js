/**
 * 2021/10/25：订柜计划单赋值处理单据类型、一级内部交易价USD、二级内部交易价USD
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define(['N/record','N/search','N/format','N/runtime','N/currency','SuiteScripts/utils/moment.js','N/task'],
    function(record,search,format,runtime,exchangeRate,moment,task) {
        function beforeLoad(context) {
            try{
                if(context.type == 'view' && context.type != 'delete'){
                    var role_id = runtime.getCurrentUser().roleId;
                    var role = runtime.getCurrentUser().role;
                    // log.debug('role_id role',role_id + '--' + role);
                    var role_flag = getRole(role);
                    // log.debug('role_flag',role_flag);
                    if(role_flag == 'Y'){
                        var wb_po_flag = 'N';
                        var ship_flag = 'N';
                        var if_flag = 'N';
                        var ir_flag = 'N';
                        var rec = context.newRecord;
                        var form = context.form;
                        form.clientScriptFileId = 198; //CL_CS_DGJH_PARA.js
                        var details_arr = getDetails(rec.id);
                        log.debug('details_arr.length',details_arr.length);
                        var script_check = rec.getValue('custrecord_document_generation');//单据生成中
                        for(var i = 0;i < details_arr.length;i++){
                            // var po_id = details_arr[i].po_id;
                            // var wb_po_ir = details_arr[i].wb_po_ir;
                            var shipment_item_type = details_arr[i].shipment_item_type;
                            var qty_sh = Number(details_arr[i].qty_sh);
                            var qty_fh = Number(details_arr[i].qty_fh);
                            // var variance_quantity = details_arr[i].variance_quantity;
                            var wb_po = details_arr[i].wb_po;
                            var actul_qty = Number(details_arr[i].actul_qty);
                            // var nb_po_one = details_arr[i].nb_po_one;
                            var cumulative_shipment_quantity = Number(details_arr[i].cumulative_shipment_quantity);
                            var cumulative_quantity_received = Number(details_arr[i].cumulative_quantity_received);
                            var zj_qty = Number(details_arr[i].zj_qty);
                            var ship_type_status = details_arr[i].ship_type_status;
                            log.debug('shipment_item_type',shipment_item_type);
                            if(script_check == false){
                                if(cumulative_shipment_quantity == null || cumulative_shipment_quantity == ''){
                                    cumulative_shipment_quantity = Number(0);
                                }
                                if(cumulative_quantity_received == null || cumulative_quantity_received == ''){
                                    cumulative_quantity_received = Number(0)
                                }
                                if(zj_qty == null || zj_qty == ''){
                                    zj_qty = Number(0);
                                }
                                if(actul_qty == null || actul_qty == ''){
                                    actul_qty = Number(0);
                                }
                                log.debug('qty_sh qty_fh',qty_sh +'---' + qty_fh);
                                log.debug('actul_qty zj_qty cumulative_shipment_quantity cumulative_quantity_received',actul_qty  + '----' + zj_qty + '----' + cumulative_shipment_quantity + '---' + cumulative_quantity_received);
                                if(shipment_item_type == 3 || shipment_item_type == 4){//  供应商直发FBA    供应商直发海外仓
                                    if(wb_po == false && zj_qty > 0 && actul_qty > 0 && actul_qty <= zj_qty){
                                        wb_po_flag = 'Y';
                                    }
                                    if(qty_sh > 0 && (ship_type_status == 2 || ship_type_status == 11)){
                                        ir_flag = 'Y';
                                    }
                                    if(zj_qty > 0 && actul_qty > 0 && actul_qty <= zj_qty && zj_qty > cumulative_shipment_quantity){
                                        ship_flag = 'Y';
                                    }
                                }
                                if(shipment_item_type == 1 || shipment_item_type == 2){ //	国内直发FBA   国内直发海外仓
                                    if(qty_sh > 0 && (ship_type_status == 2 || ship_type_status == 11)){
                                        ir_flag = 'Y';
                                    }
                                    if(actul_qty > 0 && actul_qty > cumulative_shipment_quantity){
                                        ship_flag = 'Y';
                                    }
                                }
                                if(shipment_item_type == 5 || shipment_item_type == 7 || shipment_item_type == 8){    //海外仓转平台仓   海外仓转海外仓  FBA转海外仓
                                    if(qty_sh > 0 && (ship_type_status == 2 || ship_type_status == 11)){
                                        ir_flag = 'Y';
                                    }
                                    if(qty_fh > 0 && actul_qty >= qty_fh && actul_qty > cumulative_shipment_quantity){
                                        if_flag = 'Y';
                                    }
                                }
                            }
                        }
                        log.debug('wb_po_flag ship_flag ir_flag if_flag',wb_po_flag + '--' + ship_flag + '--' + ir_flag + '--' + if_flag);
                        // if(wb_po_flag == 'Y'){
                        //     form.addButton({
                        //         id:'custpage_wbpo',
                        //         label:'采购收货',
                        //         functionName:'buttonDo(' + 1 + ')',
                        //     });
                        // }
                        if(ship_flag == 'Y'){
                            form.addButton({
                                id:'custpage_ship',
                                label:'发运',
                                functionName:'buttonDo(' + 2 + ')',
                            });
                        }
                        if(ir_flag == 'Y'){
                            form.addButton({
                                id:'custpage_ir',
                                label:'收货',
                                functionName:'buttonDo(' + 3 + ')',
                            });
                        }
                        if(if_flag == 'Y'){
                            form.addButton({
                                id:'custpage_if',
                                label:'发货',
                                functionName:'buttonDo(' + 4 + ')',
                            });
                        }
                    }
                }
            }catch(e){
                log.debug('loadrecrd error',e);
            }
        }
        function getRole(role_id) {
            var flag = 'Y';
            if(role_id){
                var mysearch = search.create({
                    type:'role',
                    filters:[
                        ['internalid','is',role_id],
                        'AND',['isinactive','is',false],
                    ],
                    columns:[
                        'name',
                    ]
                });
                var res = mysearch.run().getRange(0,1);
                if(res.length > 0){
                    var role_name = res[0].getValue('name');
                    log.debug('role_name',role_name);
                    //非物流专员、物流主管、物流经理、仓储专员、仓储主管，供应链总监，管理员时不显示
                    if(role_name.indexOf('物流专员') == -1 && role_name.indexOf('物流主管') == -1 && role_name.indexOf('物流经理') == -1 && role_name.indexOf('仓储专员') == -1 && role_name.indexOf('仓储主管') == -1 && role_name.indexOf('供应链总监') == -1 && role_name.indexOf('管理员') == -1){
                        flag = 'N';
                    }
                }
            }
            return flag;
        }
        function getDetails(dg_id) {
            var details_arr = new Array();
            if(dg_id){
                var mysearch = search.create({
                    type:'customrecord_sl_dg_detail',
                    filters:[
                        ['custrecord_sl_rp_body','anyof',dg_id]
                    ],
                    columns:[
                        'custrecord_sl_dg_po_number','custrecord_cumulative_shipment_quantity','custrecord_sl_dg_gsj_po','custrecord_sl_dg_sku_qty2','custrecord_variance_quantity','custrecord_sl_dg_po_inbound','custrecord_sl_ch_type1','custrecord_actual_receipt_quantity','custrecord_actual_shipment_quantity','custrecord_sl_purchase_receipt',
                        'custrecord_sl_dg_pass_amount','custrecord_cumulative_quantity_received','custrecord_sl_document_status1',
                    ]
                });
                var res = mysearch.run().getRange(0,1000);
                if(res.length > 0){
                    for(var i = 0;i < res.length;i++){
                        details_arr.push({
                            // "po_id":res[i].getValue('custrecord_sl_dg_po_number'),
                            // "wb_po_ir":res[i].getValue('custrecord_sl_dg_po_inbound'),
                            "shipment_item_type":res[i].getValue('custrecord_sl_ch_type1'),
                            "qty_sh":res[i].getValue('custrecord_actual_receipt_quantity'),
                            "qty_fh":res[i].getValue('custrecord_actual_shipment_quantity'),
                            // "variance_quantity":res[i].getValue('custrecord_variance_quantity'),
                            "wb_po":res[i].getValue('custrecord_sl_purchase_receipt'),
                            "actul_qty":res[i].getValue('custrecord_sl_dg_sku_qty2'),
                            // "nb_po_one":res[i].getValue('custrecord_sl_dg_gsj_po'),
                            "cumulative_shipment_quantity" : res[i].getValue('custrecord_cumulative_shipment_quantity'),
                            "cumulative_quantity_received" : res[i].getValue('custrecord_cumulative_quantity_received'),
                            "zj_qty" : res[i].getValue('custrecord_sl_dg_pass_amount'),
                            "ship_type_status" : res[i].getValue('custrecord_sl_document_status1'),
                        })
                    }
                }
            }
            return details_arr;
        }
        function beforeSubmit(context) {
            try{
                var nb_flag = 'init';
                var nb_data = new Object();
                var nb_price = Number(0);
                var nb_price_two = Number(0);
                var nb_hl = Number(0);
                var nb_rate = Number(0);
                var location_arr = new Array();
                var rec = context.newRecord;
                var doc_status = rec.getValue('custrecord_document_status');
                // if((rec.getValue('custrecord_document_status') == 2 || rec.getValue('custrecord_document_status') == 6) && (rec.getValue("custrecord_document_generation") == false || (rec.getValue("custrecord_document_generation") == true && rec.getValue("custrecord_cl_error_message") == "create po error"))){
                var line_count = rec.getLineCount('recmachcustrecord_sl_rp_body');
                //有明细行就更改单据状态为待发运
                if(line_count > 0){
                    if(doc_status == 3 || doc_status == 4){//待定舱  已订舱
                        //更新单据状态
                        rec.setValue('custrecord_document_status',9);//待发运
                    }
                }
                for(var i = 0;i < line_count;i++){
                    var sku = rec.getSublistValue({
                        sublistId:'recmachcustrecord_sl_rp_body',
                        fieldId:'custrecord_sl_dg_detail',
                        line:i
                    })
                    var start_location = rec.getSublistValue({
                        sublistId:'recmachcustrecord_sl_rp_body',
                        fieldId:'custrecord_sl_dc_start_location',
                        line:i
                    });
                    var on_location = rec.getSublistValue({
                        sublistId:'recmachcustrecord_sl_rp_body',
                        fieldId:'custrecord_sl_zz_location',
                        line:i
                    });
                    var end_location = rec.getSublistValue({
                        sublistId:'recmachcustrecord_sl_rp_body',
                        fieldId:'custrecord_sl_dg_md_location',
                        line:i
                    });
                    var po_id = rec.getSublistValue({
                        sublistId:'recmachcustrecord_sl_rp_body',
                        fieldId:'custrecord_sl_dg_po_number',
                        line:i,
                    });
                    //目的国
                    var end_country = rec.getSublistValue({
                        sublistId:'recmachcustrecord_sl_rp_body',
                        fieldId:'custrecord_mudi_location',
                        line:i
                    });
                    //标签状态
                    var tag_status = rec.getSublistValue({
                        sublistId:'recmachcustrecord_sl_rp_body',
                        fieldId:'custrecord_tag_status',
                        line:i,
                    });
                    //收货累计数量、发货累计数量
                    // var received_quantity = rec.getSublistValue({
                    //     sublistId:'recmachcustrecord_sl_rp_body',
                    //     fieldId:'custrecord_cumulative_quantity_received',
                    //     line:i,
                    // });
                    var shipment_quantity = rec.getSublistValue({
                        sublistId:'recmachcustrecord_sl_rp_body',
                        fieldId:'custrecord_cumulative_shipment_quantity',
                        line:i,
                    });
                    //QTY(实际)
                    var actual_qty = rec.getSublistValue({
                        sublistId:'recmachcustrecord_sl_rp_body',
                        fieldId:'custrecord_sl_dg_sku_qty2',
                        line:i,
                    });
                    //实际发货数量
                    var qty_fh = rec.getSublistValue({
                        sublistId:'recmachcustrecord_sl_rp_body',
                        fieldId:'custrecord_actual_shipment_quantity',
                        line:i,
                    });
                    //实际收货数量
                    var qty_sh = rec.getSublistValue({
                        sublistId:'recmachcustrecord_sl_rp_body',
                        fieldId:'custrecord_actual_receipt_quantity',
                        line:i,
                    });
                    var tag_status_t = rec.getSublistValue({
                        sublistId:'recmachcustrecord_sl_rp_body',
                        fieldId:'custrecord_tag_status',//标签状态
                        line:i
                    });
                    var cumulative_quantity_received = rec.getSublistValue({
                        sublistId:'recmachcustrecord_sl_rp_body',
                        fieldId:'custrecord_cumulative_quantity_received',//收货累计数量
                        line:i
                    });
                    //明细数据汇总,用于判断目的国目的仓是否一致
                    // location_arr.push({
                    //     "location":end_location,
                    //     "country":end_country,
                    //     "ship_type":ship_type,
                    //     "line":i,
                    // })
                    //
                    if(actual_qty){//标签COLSED：2 ，tag_status_t == 2
                        if(cumulative_quantity_received == null || cumulative_quantity_received == '' || cumulative_quantity_received == 0){
                            cumulative_quantity_received = 0;
                        }
                        log.debug('cumulative_quantity_received 2',cumulative_quantity_received);
                        // log.debug('tag_status_t 2',tag_status_t);
                        rec.setSublistValue({
                            sublistId:'recmachcustrecord_sl_rp_body',
                            fieldId:'custrecord_variance_quantity',        //差异数量
                            value:Number(actual_qty) - Number(cumulative_quantity_received),
                            line:i
                        });
                    }
                    //
                    if(!on_location && getLocation(start_location).subsidiary != getLocation(end_location).subsidiary){
                        rec.setSublistValue({
                            sublistId:'recmachcustrecord_sl_rp_body',
                            fieldId:'custrecord_ns_type',
                            value:1, //一级内部交易
                            line:i,
                        });
                        nb_flag = "one_nb";
                    }
                    else{
                        if(on_location){
                            if(getLocation(start_location).subsidiary != getLocation(on_location).subsidiary && getLocation(start_location).subsidiary != getLocation(end_location).subsidiary && getLocation(on_location).subsidiary != getLocation(end_location).subsidiary){
                                rec.setSublistValue({
                                    sublistId:'recmachcustrecord_sl_rp_body',
                                    fieldId:'custrecord_ns_type',
                                    value:2, //二级内部交易
                                    line:i,
                                });
                                nb_flag = "two_nb";
                            }
                        }else{
                            if(getLocation(start_location).subsidiary == getLocation(end_location).subsidiary){
                                rec.setSublistValue({
                                    sublistId:'recmachcustrecord_sl_rp_body',
                                    fieldId:'custrecord_ns_type',
                                    value:4, //公司内库存转移TO单
                                    line:i,
                                });
                                nb_flag = 'nb_to';
                            }
                        }
                    }
                    log.debug('nb_flag',nb_flag);
                    //一级内部交易
                    var err_flag = 'N';
                    if(nb_flag == 'one_nb'){
                        var jcbi_data = getJcbi(getLocation(start_location).subsidiary,getLocation(end_location).subsidiary);
                        log.debug('jcbi_data',jcbi_data);
                        //有采购单号
                        if(po_id){
                            var po_data = getPo(po_id);
                            log.debug('po_data',po_data);
                            nb_hl = Number(getCurrencyRate(po_data.currency_text,"USD"));
                            for(var j = 0;j < po_data.itemList.length;j++){
                                if(po_data.itemList[j].item == sku){
                                    nb_rate = Number(po_data.itemList[j].rate) * nb_hl;
                                    nb_price = nb_rate * (Number(1) + Number(jcbi_data.jcbi.split("%")[0]/100));
                                    log.debug('one nb_price',nb_price);
                                    break;
                                }
                            }
                        }
                        //旧版本：没采购取库存平均成本，新版本：价目表最高未税单价
                        else{
                            // var locationaveragecost = getLocationaveragecost(sku,start_location);
                            // log.debug('地点平均成本',locationaveragecost);
                            // nb_hl = Number(getCurrencyRate(getItem(sku,"1").currency_text,"USD"));
                            // if(locationaveragecost > 0){//地点平均成本大于零
                            //     nb_rate = locationaveragecost;
                            //     nb_price = locationaveragecost * (Number(1) + Number(jcbi_data.jcbi.split("%")[0]/100)) * nb_hl;
                            // }
                            // else{//获取货品的上次采购价格
                            //     locationaveragecost = getItem(sku,"0");
                            //     log.debug('上次采购价格',locationaveragecost);
                            //     nb_rate = locationaveragecost;
                            //     nb_price = locationaveragecost * (Number(1) + Number(jcbi_data.jcbi.split("%")[0]/100)) * nb_hl;
                            // }
                            //___________________________/
                            var price_max = getVendorPriceList(sku);
                            log.debug('获取最大价格',price_max);
                            if(price_max.flag == 'Y'){
                                nb_rate = price_max.price_max;
                                nb_price = nb_rate * (Number(1) + Number(jcbi_data.jcbi.split("%")[0]/100));
                            }
                            else if(price_max.flag == 'N_1'){
                                err_flag = '供应商价目表没有未税单价';
                            }
                            else if(price_max.flag == 'N_2'){
                                err_flag = '未找到对应供应商价目表';
                            }
                        }
                        log.debug('nb_price',nb_price);
                        if(err_flag == 'N'){
                            //一级内部基价、一级内部交易价、一级内部交易USD
                            rec.setSublistValue({
                                sublistId:'recmachcustrecord_sl_rp_body',
                                fieldId:'custrecord_origin1',
                                value: nb_rate.toFixed(4),
                                line:i,
                            });
                            rec.setSublistValue({
                                sublistId:'recmachcustrecord_sl_rp_body',
                                fieldId:'custrecord_add1',
                                value:(nb_price - nb_rate).toFixed(4),
                                line:i,
                            });
                            rec.setSublistValue({
                                sublistId:'recmachcustrecord_sl_rp_body',
                                fieldId:'custrecord_internal_transaction_price',
                                value:nb_price.toFixed(4),
                                line:i,
                            });
                        }
                        else{
                            rec.setSublistValue({
                                sublistId:'recmachcustrecord_sl_rp_body',
                                fieldId:'custrecord_inter_remind',    //内部交易价格提示信息
                                value:err_flag,
                                line:i,
                            });
                        }
                    }
                    //二级内部交易
                    else if(nb_flag == 'two_nb'){
                        var jcbi_data_one = getJcbi(getLocation(start_location).subsidiary,getLocation(on_location).subsidiary);
                        log.debug('jcbi_data_one',jcbi_data_one);
                        var jcbi_data_two = getJcbi(getLocation(on_location).subsidiary,getLocation(end_location).subsidiary);
                        log.debug('jcbi_data_two',jcbi_data_two);
                        if(po_id){
                            var po_data = getPo(po_id);
                            log.debug('po_data',po_data);
                            nb_hl = Number(getCurrencyRate(po_data.currency_text,"USD"));
                            for(var j = 0;j < po_data.itemList.length;j++){
                                if(po_data.itemList[j].item == sku){
                                    nb_rate = Number(po_data.itemList[j].rate) * nb_hl;
                                    nb_price = nb_rate * (Number(1) + Number(jcbi_data_one.jcbi.split("%")[0]/100));
                                    log.debug('two nb_price',nb_price);
                                    break;
                                }
                            }
                        }else{
                            // var locationaveragecost = getLocationaveragecost(sku,start_location);
                            // log.debug('地点平均成本',locationaveragecost);
                            // nb_hl = Number(getCurrencyRate(getItem(sku,"1").currency_text,"USD"));
                            // if(locationaveragecost > 0){//地点平均成本大于零
                            //     nb_rate = locationaveragecost;
                            //     nb_price = locationaveragecost * (Number(1) + Number(jcbi_data_one.jcbi.split("%")[0]/100)) * nb_hl;
                            // }
                            // else{//获取货品的上次采购价格
                            //     locationaveragecost = getItem(sku,"0");
                            //     log.debug('上次采购价格',locationaveragecost);
                            //     nb_rate = locationaveragecost;
                            //     nb_price = locationaveragecost * (Number(1) + Number(jcbi_data_one.jcbi.split("%")[0]/100)) * nb_hl;
                            // }
                            /******************************************** */
                            var price_max = getVendorPriceList(sku);
                            if(price_max.flag == 'Y'){
                                nb_rate = price_max.price_max;
                                nb_price = nb_rate * (Number(1) + Number(jcbi_data_one.jcbi.split("%")[0]/100));
                            }
                            else if(price_max.flag == 'N_1'){
                                err_flag = '供应商价目表没有未税单价';
                            }
                            else if(price_max.flag == 'N_2'){
                                err_flag = '未找到对应供应商价目表';
                            }
                        }
                        nb_price_two = nb_price * (Number(1) + Number(jcbi_data_two.jcbi.split("%")[0]/100));
                        log.debug('nb_price',nb_price);
                        log.debug('nb_price_two',nb_price_two);
                        if(err_flag == 'N'){
                            //一级内部基价、一级内部交易价、一级内部交易USD
                            rec.setSublistValue({
                                sublistId:'recmachcustrecord_sl_rp_body',
                                fieldId:'custrecord_origin1',
                                value: nb_rate.toFixed(4),
                                line:i,
                            });
                            rec.setSublistValue({
                                sublistId:'recmachcustrecord_sl_rp_body',
                                fieldId:'custrecord_add1',
                                value:(nb_price - nb_rate).toFixed(4),
                                line:i,
                            });
                            rec.setSublistValue({
                                sublistId:'recmachcustrecord_sl_rp_body',
                                fieldId:'custrecord_internal_transaction_price',
                                value:nb_price.toFixed(4),
                                line:i,
                            });
                            //二级内部交易USD，二级内部基价、二级内部交易价
                            rec.setSublistValue({
                                sublistId:'recmachcustrecord_sl_rp_body',
                                fieldId:'custrecord_origin2',
                                value: nb_price.toFixed(4),
                                line:i,
                            });
                            rec.setSublistValue({
                                sublistId:'recmachcustrecord_sl_rp_body',
                                fieldId:'custrecord_add2',
                                value:(nb_price_two - nb_price).toFixed(4),
                                line:i,
                            });
                            rec.setSublistValue({
                                sublistId:'recmachcustrecord_sl_rp_body',
                                fieldId:'custrecord_internal_transaction_price2',
                                value:nb_price_two.toFixed(4),
                                line:i,
                            });
                        }
                        else {
                            rec.setSublistValue({
                                sublistId:'recmachcustrecord_sl_rp_body',
                                fieldId:'custrecord_inter_remind',    //内部交易价格提示信息
                                value:err_flag,
                                line:i,
                            });
                        }

                    }
                }
                // }
                //判断目的仓、目的国是否一致

            }catch(e){
                log.debug('错误信息',e);
            }
        }
        function getVendorPriceList(sku) {
            if(sku){
                var price_arr = new Array();
                var mysearch = search.create({
                    type:'customrecord_supplier_price_list',
                    filters:[
                        ['custrecord_hl_bsq_sku','anyof',sku],
                        'AND',['custrecord_hl_bsq_activation_date','is',1], //启用状态：true
                    ],
                    columns:[
                        {name:'custrecord_hl_bsq_currency'},
                        {name:'custrecord_hl_bsq_untaxed_price',sort:search.Sort.ASC}
                    ]
                });
                var res = mysearch.run().getRange(0,1000);
                log.debug('res',res.length + '----' + JSON.stringify(res));
                if(res.length > 0){
                    for(var i = 0;i < res.length;i++){
                        var currency_t = res[i].getText('custrecord_hl_bsq_currency');
                        var price = res[i].getValue('custrecord_hl_bsq_untaxed_price');
                        if(!price){
                            price = Number(0);
                        }
                        var currency_rate = getCurrencyRate(currency_t,'USD');
                        price_arr.push(Number(price) * currency_rate);
                    }
                    log.debug('price_arr',price_arr);
                    var price_max = getMaxOfArray(price_arr);
                    log.debug('price_max',price_max);
                    if(price_max == 0){
                        return {
                            "price_max":price_max,
                            "flag": 'N_1'
                        };
                    }
                    else{
                        return {
                            "price_max":price_max,
                            "flag": 'Y'
                        };
                    }
                }
                else{
                    return {
                        "price_max":'nopricelist',
                        "flag": 'N_2'
                    };
                }
            }
        }
        //TODO:获取数组中数值最大的元素
        function getMaxOfArray(numArray) {
            return Math.max.apply(null, numArray);
        }
        function getAllLocationCountry(location_arr) {
            var error_location_arr = new Array();
            var error_country_arr = new Array();
            var shiptype_arr = [1,2,3,4];
            var check_flag_1 = 'N';
            var check_flag_2 = 'N';
            var check_flag = 'Y';
            if(location_arr.length > 1){
                for(var j = 0;j < shiptype_arr.length;j++){
                    for(var n = 0;n < location_arr.length;n++){
                        if(location_arr[n].ship_type != shiptype_arr[j]){
                            check_flag_1 = 'Y';
                        }else{
                            check_flag_2 = 'Y';
                        }
                    }
                }
                if(check_flag_2 == 'Y' && check_flag_1 == 'N'){
                    for(var i = 1;i < location_arr.length;i++){
                        var line = Number(location_arr[i].line) + Number(1);
                        if(location_arr[0].location != location_arr[i].location){
                            error_location_arr.push(line);
                        }
                        if(location_arr[0].country != location_arr[i].country){
                            error_country_arr.push(line);
                        }
                    }
                }else if(check_flag_2 == 'Y' && check_flag_1 == 'Y'){
                    check_flag = 'N';
                }
            }
            return {
                "error_location":error_location_arr,
                "error_country":error_country_arr,
                "checkflag":check_flag,
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
        function getJcbi(so_sub,po_sub) {
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

                return {"subsidiary":subsidiary};
            }
        }
        function afterSubmit(context) {
            var recUe = context.newRecord;
            log.debug('订柜计划id',recUe.id);
            var document_status = recUe.getValue('custrecord_document_status');//单据状态，已发运：2
            log.debug("单据状态",document_status);
            var in_out_check = recUe.getValue('custrecord_sl_in_out_check');//入库/出库回写
            var out_check = recUe.getValue('custrecord_sl_out_hx');//发货
            /***-----------------生成内部交易------------------------ */
            if(context.type == context.UserEventType.CREATE || context.type == context.UserEventType.EDIT){
                /***-------------------------------------- */
                if(document_status == 2 && out_check == true){//TODO: 已发运状态才能生成内部单据  ,单据生成中字段来防止循环启动map脚本

                    if(recUe.getValue("custrecord_sl_out_hx") == true){  //接口赋值勾选框
                        // //创建生成内部交易的脚本部署
                        // var rec = record.create({
                        //     type: record.Type.SCRIPT_DEPLOYMENT,
                        //     defaultValues: {
                        //         // script: 221      //订柜计划生成内部交易的脚本内部id,正式环境
                        //         script:145,          // 测试环境
                        //     },
                        //     isDynamic: true
                        // });
                        // var now = moment.utc().format('YYYYMMDDHHmmss') + recUe.id;
                        // rec.setValue('scriptid','_' + now.toLowerCase());
                        // rec.setValue('title', '订柜计划生成内部交易');
                        // rec.setValue('startdate', new Date());
                        // var recId = rec.save();
                        // log.debug('recId',recId);
                        // //log.debug('deployid','customdeploy_' + now);
                        // var deploymentId = 'customdeploy_' + now;
                        // log.debug('deployid',deploymentId);
                        //启动map脚本
                        var mrTask = task.create({
                            taskType: task.TaskType.MAP_REDUCE,
                            scriptId: 86,    //正式环境
                            // scriptId:145,          // 测试环境
                            // deploymentId: deploymentId,
                            deploymentId : 'customdeploy_cl_mp_dgjh_do_mp',       //订柜计划生成内部交易
                        });
                        //测试map
                        // var mrTask = task.create({
                        //     taskType: task.TaskType.MAP_REDUCE,
                        //     // scriptId: 221,    //正式环境
                        //     scriptId:145,          // 测试环境
                        //     deploymentId: 'customdeploy_2021102804525039',
                        // });

                        mrTask.params = {'custscript_cl_dgid' : recUe.id,"custscript_cl_button_flag" : 5};
                        mrTask.submit();
                    }
                }
            }
        }

        return {
            beforeLoad: beforeLoad,
            beforeSubmit: beforeSubmit,
            afterSubmit: afterSubmit
        };
    });
