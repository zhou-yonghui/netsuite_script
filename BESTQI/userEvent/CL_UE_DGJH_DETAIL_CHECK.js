/**
 * @LastEditors: zhouyh
 * @LastEditTime: 2021-12-26 18:45:36
 * @Description: 订柜计划明细检验
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 */
define(['N/record', 'N/search', 'N/format', 'N/runtime','N/currency'],
    function (record, search, format, runtime,exchangeRate) {
        function beforeLoad(context) {

        }
        function beforeSubmit(context) {
            try{
                if (context.type == 'create' || context.type == 'edit') {
                    var rec = context.newRecord;
                    var plan_details_id = rec.getValue('custrecord_hl_shipment_plan_details');
                    log.debug('dgjhid',plan_details_id);
                    var nb_flag = 'init';
                    var nb_price = Number(0);
                    var nb_price_two = Number(0);
                    var nb_hl = Number(0);
                    var nb_rate = Number(0);
                    if (plan_details_id) {
                        var dg_detail_id;
                        search.create({
                            type: 'customrecord_sl_dg_detail',
                            filters:
                                [
                                    ['custrecord_hl_shipment_plan_details', 'anyof', plan_details_id],
                                    'AND',
                                    ['isinactive', 'is', 'F']
                                ]
                        }).run().each(function (result) {
                            dg_detail_id = result.id;
                            return false;
                        });
                        if (dg_detail_id && rec.id != dg_detail_id) {
                            throw '其他单据中存在相同的出货计划明细，请重新输入！';
                        }else {
                            log.debug('in');
                            var dgjh_id = rec.getValue('custrecord_sl_rp_body');//关联表头
                            var dgjh_status = record.load({ type: 'customrecord_hl_bsq_reservation_plan', id: dgjh_id, isDynamic: true }).getValue('custrecord_document_status');
                            if (dgjh_status == 3 || dgjh_status == 4) {//待定舱  已订舱
                                //更改单据状态
                                record.submitFields({
                                    type: 'customrecord_hl_bsq_reservation_plan',
                                    id: dgjh_id,
                                    values: {
                                        custrecord_document_status: 9,     //待发运
                                    }
                                });
                            }
                            //处理单据类型
                            var start_location = rec.getValue('custrecord_sl_dc_start_location');
                            var on_location = rec.getValue('custrecord_sl_zz_location');
                            var end_location = rec.getValue('custrecord_sl_dg_md_location');
                            var po_id = rec.getValue('custrecord_sl_dg_po_number');
                            var sku = rec.getValue('custrecord_sl_dg_detail');
                            log.debug('s o e',start_location + '--' + on_location + '---' + end_location);
                            if(!on_location && getLocation(start_location).subsidiary != getLocation(end_location).subsidiary){
                                rec.setValue({
                                    fieldId:'custrecord_ns_type',
                                    value:1, //一级内部交易
                                });
                                nb_flag = "one_nb";
                            }
                            else{
                                if(on_location){
                                    if(getLocation(start_location).subsidiary != getLocation(on_location).subsidiary && getLocation(start_location).subsidiary != getLocation(end_location).subsidiary && getLocation(on_location).subsidiary != getLocation(end_location).subsidiary){
                                        rec.setValue({
                                            fieldId:'custrecord_ns_type',
                                            value:2, //二级内部交易
                                        });
                                        nb_flag = "two_nb";
                                    }
                                }else{
                                    if(getLocation(start_location).subsidiary == getLocation(end_location).subsidiary){
                                        rec.setValue({
                                            fieldId:'custrecord_ns_type',
                                            value:4, //公司内库存转移TO单
                                        });
                                        nb_flag = 'nb_to';
                                    }
                                }
                            }
                            //内部交易加成
                            log.debug('nb_flag',nb_flag);
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
                                    rec.setValue({
                                        fieldId:'custrecord_origin1',
                                        value: nb_rate.toFixed(4),
                                    });
                                    rec.setValue({
                                        fieldId:'custrecord_add1',
                                        value:(nb_price - nb_rate).toFixed(4),
                                    });
                                    rec.setValue({
                                        fieldId:'custrecord_internal_transaction_price',
                                        value:nb_price.toFixed(4),
                                    });
                                }
                                else{
                                    rec.setValue({
                                        fieldId:'custrecord_inter_remind',    //内部交易价格提示信息
                                        value:err_flag,
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
                                    rec.setValue({
                                        fieldId:'custrecord_origin1',
                                        value: nb_rate.toFixed(4),
                                    });
                                    rec.setValue({
                                        fieldId:'custrecord_add1',
                                        value:(nb_price - nb_rate).toFixed(4),
                                    });
                                    rec.setValue({
                                        fieldId:'custrecord_internal_transaction_price',
                                        value:nb_price.toFixed(4),
                                    });
                                    //二级内部交易USD，二级内部基价、二级内部交易价
                                    rec.setValue({
                                        fieldId:'custrecord_origin2',
                                        value: nb_price.toFixed(4),
                                    });
                                    rec.setValue({
                                        fieldId:'custrecord_add2',
                                        value:(nb_price_two - nb_price).toFixed(4),
                                    });
                                    rec.setValue({
                                        fieldId:'custrecord_internal_transaction_price2',
                                        value:nb_price_two.toFixed(4),
                                    });
                                }
                                else {
                                    rec.setValue({
                                        fieldId:'custrecord_inter_remind',    //内部交易价格提示信息
                                        value:err_flag,
                                    });
                                }

                            }
                        }
                    }
                    // var dgjh_id = rec.getValue('custrecord_sl_rp_body');//关联表头
                    // var md_location = rec.getValue('custrecord_sl_dg_md_location');
                    // var md_country = rec.getValue('custrecord_mudi_location');
                    // var ship_type = rec.getValue('custrecord_sl_ch_type1');
                    // var out_type = rec.getValue('custrecord_type_of_shipping1');
                    // var error_ret = getAllDgjhDetail(dgjh_id, md_location, md_country, ship_type, out_type);
                    // log.debug('error_ret', error_ret);
                    // if (error_ret.error_rp_body == 'n_match_1') {
                    //     throw '之前单据出货类型不一致，不允许头程二程混发,检查出货计划类型！！';
                    // }
                    // else if (error_ret.error_rp_body == 'n_match_2') {
                    //     throw '此单出货类型不一致，不允许头程二程混发,检查出货计划类型！！';
                    // }
                    // else if (error_ret.error_rp_body == 'N') {
                    //     throw '请填写关联表头字段！！';
                    // }
                    // else if (error_ret.error_rp_body == 'n_country') {
                    //     throw '请填写目的国字段！！';
                    // }
                    // else if (error_ret.error_rp_body == 'n_location') {
                    //     throw '请填写目的仓字段！！';
                    // } else {
                    //     if (error_ret.error_country.length > 0) {
                    //         throw '此纪录与内部标识为[' + error_ret.error_country + ']的订柜计划明细的目的国不相同请检查！！';
                    //     }
                    //     else if (error_ret.error_location.length > 0) {
                    //         throw '此纪录与内部标识为[' + error_ret.error_location + ']的订柜计划明细的目的仓不相同请检查！！';
                    //     }
                    //     else if (error_ret.error_type.length > 0) {
                    //         throw '此纪录与内部标识为[' + error_ret.error_type + ']的订柜计划明细的运输方式不相同请检查！！';
                    //     }
                    //     else {
                    //         var dgjh_status = record.load({ type: 'customrecord_hl_bsq_reservation_plan', id: dgjh_id, isDynamic: true }).getValue('custrecord_document_status');
                    //         if (dgjh_status == 3 || dgjh_status == 4) {//待定舱  已订舱
                    //             //更改单据状态
                    //             record.submitFields({
                    //                 type: 'customrecord_hl_bsq_reservation_plan',
                    //                 id: dgjh_id,
                    //                 values: {
                    //                     custrecord_document_status: 9,     //待发运
                    //                 }
                    //             });
                    //         }
                    //     }
                    // }
                }
            }catch (e) {
                log.debug('befor error',e);
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
        function getLocation(location_id) {
            if(location_id){
                var rec = record.load({
                    type:'location',
                    id:location_id,
                });
                var subsidiary = rec.getValue('subsidiary');
                log.debug('sub',subsidiary);
                return {"subsidiary":subsidiary};
            }
        }
        // function getAllDgjhDetail(dgjh_id, md_location, md_country, ship_type, out_type) {
        //     var error_location_arr = new Array();
        //     var error_country_arr = new Array();
        //     var error_type_arr = new Array();
        //     var shiptype_arr = new Array(1, 2, 3, 4);
        //     var check_flag_1 = 'N';
        //     var check_flag_2 = 'N';
        //     var error_rp_body = 'Y';
        //     log.debug('dgjh_id md_location md_country', dgjh_id + '---' + md_location + '---' + md_country);
        //     if (dgjh_id) {
        //         var mysearch = search.create({
        //             type: 'customrecord_sl_dg_detail',
        //             filters: [
        //                 ['custrecord_sl_rp_body', 'anyof', dgjh_id],
        //             ],
        //             columns: [
        //                 'custrecord_sl_dg_md_location', //目的仓
        //                 'custrecord_mudi_location',      //目的国
        //                 "name",
        //                 "custrecord_sl_ch_type1",
        //                 "custrecord_type_of_shipping1",  //运输方式
        //             ]
        //         });
        //         var res = mysearch.run().getRange(0, 1000);
        //         for (var j = 0; j < shiptype_arr.length; j++) {
        //             for (var n = 0; n < res.length; n++) {
        //                 if (res[n].ship_type != shiptype_arr[j]) {
        //                     check_flag_1 = 'Y';
        //                 } else {
        //                     check_flag_2 = 'Y';
        //                 }
        //             }
        //         }
        //         if (check_flag_1 == 'Y' && check_flag_2 == 'Y') {
        //             error_rp_body = 'n_match_1';
        //         }
        //         else if (check_flag_1 == 'N' && check_flag_2 == 'Y' && (ship_type != 1 || ship_type != 2 || ship_type != 3 || ship_type != 4)) {
        //             error_rp_body = 'n_match_2';
        //         }
        //         else {
        //             if (md_country && md_location) {
        //                 for (var i = 0; i < res.length; i++) {
        //                     if (res[i].getValue('custrecord_sl_dg_md_location') != md_location) {
        //                         error_location_arr.push(res[i].getValue('name'));
        //                     }
        //                     if (res[i].getValue('custrecord_mudi_location') != md_country) {
        //                         error_country_arr.push(res[i].getValue('name'));
        //                     }
        //                     if (res[i].getValue('custrecord_type_of_shipping1') != out_type) {
        //                         error_type_arr.push(res[i].getValue('name'));
        //                     }
        //                 }
        //             }
        //             else if (!md_country) {
        //                 error_rp_body = 'n_country';
        //             }
        //             else if (!md_location) {
        //                 error_rp_body = 'n_location';
        //             }
        //         }
        //     }
        //     else {
        //         error_rp_body = 'N';
        //     }
        //     log.debug('error_location_arr error_country_arr', error_location_arr + '---' + error_country_arr);
        //     return {
        //         "error_location": error_location_arr,
        //         "error_country": error_country_arr,
        //         "error_type": error_type_arr,
        //         "error_rp_body": error_rp_body,
        //     }
        // }
        function afterSubmit(context) {

        }

        return {
            //  beforeLoad: beforeLoad,
            beforeSubmit: beforeSubmit,
            //  afterSubmit: afterSubmit
        };
    });
