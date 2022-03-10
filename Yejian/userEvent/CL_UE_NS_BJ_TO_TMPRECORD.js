/**
 * 系统报价单添加跳转报价单取值单和模板打印取值单按钮
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define(['N/record','N/search','N/format','N/runtime','SuiteScripts/Common/FREIGHT_CALCULATION.js'],
    function(record,search,format,runtime) {
        function beforeLoad(context) {
            try{
                var para = context.request.parameters;
                var rec = context.newRecord;
                if(para.opportunity){
                    var opportunity_data = getOpportunity(para.opportunity);
                    log.debug('data',opportunity_data);
                    //字段赋值
                    rec.setValue('entity',opportunity_data.entity);//客户
                    rec.setValue('entitystatus',opportunity_data.entitystatus);//状态
                    rec.setValue('location',opportunity_data.location);//仓库
                    rec.setValue('department',opportunity_data.department);//部门
                    rec.setValue('custbody_sl_sopeis',opportunity_data.country);//配送国家地区
                    rec.setValue('custbody_sl_so_custdiq',opportunity_data.customer_country);//客户国家
                    rec.setValue('custbody_sl_so_custdir',opportunity_data.customer_area);//客户详细地址
                    var items = opportunity_data.items;
                    for(var i = 0;i < items.length;i++){
                        rec.setSublistValue({
                            sublistId:'item',
                            fieldId:'item',
                            value:items[i].item,
                            line:i,
                        });
                        rec.setSublistValue({
                            sublistId:'item',
                            fieldId:'custcol_sl_ydj',
                            value:items[i].rate,
                            line:i,
                        });
                        rec.setSublistValue({
                            sublistId:'item',
                            fieldId:'custcol_sl_cpxh',
                            value:items[i].cpxh,
                            line:i,
                        });
                        rec.setSublistValue({sublistId:'item', fieldId:'custcol_y_so_brand', value:items[i].brand, line:i,});
                        rec.setSublistValue({sublistId:'item', fieldId:'custcol_y_so_gpl', value:items[i].gpl, line:i,});
                        rec.setSublistValue({sublistId:'item', fieldId:'custcol_sl_so_kucun', value:items[i].kcOff, line:i,});
                        rec.setSublistValue({sublistId:'item', fieldId:'custcol2', value:items[i].dhOff, line:i,});
                        rec.setSublistValue({sublistId:'item', fieldId:'custcol_sl_spo_danjianzl', value:items[i].djWeight, line:i,});
                        rec.setSublistValue({sublistId:'item', fieldId:'custcol_sl_spo_zhlxj', value:(items[i].djWeight * items[i].qty).toFixed(2), line:i,});
                        rec.setSublistValue({sublistId:'item', fieldId:'description', value:items[i].des, line:i,});
                        rec.setSublistValue({sublistId:'item', fieldId:'location', value:items[i].wzLocation, line:i,});
                        rec.setSublistValue({sublistId:'item', fieldId:'custcol_sl_spo_linglirprice', value:items[i].llPrice, line:i,});
                        rec.setSublistValue({sublistId:'item', fieldId:'custcol_product_line2', value:items[i].productLine, line:i,});
                        rec.setSublistValue({
                            sublistId:'item',
                            fieldId:'rate',
                            value:items[i].rate,
                            line:i,
                        });
                        rec.setSublistValue({
                            sublistId:'item',
                            fieldId:'quantity',
                            value:items[i].qty,
                            line:i,
                        });
                        rec.setSublistValue({
                            sublistId:'item',
                            fieldId:'taxcode',
                            value:items[i].taxcode,
                            line:i,
                        });
                    }
                }
                if(context.type == 'view'){
                    var baojia_id = context.newRecord.id;
                    var form  = context.form;
                    //创建跳转按钮
                    form.clientScriptFileId = 192;   //TODO:关联客户端脚本CL_CS_UNTIL_TO_RECORD.js的内部id
                    //报价单取值单
                    form.addButton({
                        id:'custpage_tobaojia',
                        label:'报价单打印单',
                        functionName:'toBaojiaTmp(' + baojia_id + ')',
                    });
                    //模板打印取值单
                    form.addButton({
                        id:'custpage_toquzhi',
                        label:'模板打印单',
                        functionName:'toPiPlCiTmp(' + baojia_id + ')',
                    });
                }
            }catch (e){
                log.debug('error',e);
            }
        }
        function getOpportunity(id){
            if(id){
                var rec = record.load({
                    type:'opportunity',
                    id:id,
                    isDynamic:true,
                });
                var count = rec.getLineCount('item');
                var item_list = new Array();
                for(var i = 0;i < count;i++){
                    rec.selectLine('item',i);
                    var item = rec.getCurrentSublistValue({
                        sublistId:'item',
                        fieldId:'item'
                    });
                    var qty = rec.getCurrentSublistValue({
                        sublistId:'item',
                        fieldId:'quantity'
                    });
                    // var y_rate = rec.getCurrentSublistValue({
                    //     sublistId:'item',
                    //     fieldId:'custcol_sl_ydj'
                    // });
                    var rate = rec.getCurrentSublistValue({
                        sublistId:'item',
                        fieldId:'rate'
                    });
                    var taxcode = rec.getCurrentSublistValue({
                        sublistId:'item',
                        fieldId:'taxcode'
                    });
                    var cpxh = rec.getCurrentSublistValue({
                        sublistId:'item',
                        fieldId:'custcol_sl_cpxh',
                    });
                    var brand = rec.getCurrentSublistValue({
                        sublistId:'item',
                        fieldId:'custcol_y_so_brand',
                    });
                    var gpl = rec.getCurrentSublistValue({
                        sublistId:'item',
                        fieldId:'custcol_y_so_gpl',
                    });
                    var kc_off = rec.getCurrentSublistValue({
                        sublistId:'item',
                        fieldId:'custcol_sl_so_kucun',
                    });
                    var dh_off = rec.getCurrentSublistValue({
                        sublistId:'item',
                        fieldId:'custcol2',
                    });
                    var dj_weight = rec.getCurrentSublistValue({
                        sublistId:'item',
                        fieldId:'custcol_sl_spo_danjianzl',
                    });
                    // var all_weight = rec.getCurrentSublistValue({
                    //     sublistId:'item',
                    //     fieldId:'custcol_sl_spo_zhlxj',
                    // });
                    var des = rec.getCurrentSublistValue({
                        sublistId:'item',
                        fieldId:'description',
                    });
                    var location_wz = rec.getCurrentSublistValue({
                        sublistId:'item',
                        fieldId:'location',
                    });
                    var lr_price = rec.getCurrentSublistValue({
                        sublistId:'item',
                        fieldId:'custcol_sl_spo_linglirprice',
                    });
                    var product_line = rec.getCurrentSublistValue({
                        sublistId:'item',
                        fieldId:'custcol_product_line2'
                    })
                    item_list.push({
                        "item":item,
                        "qty":qty,
                        "rate":rate,
                        "taxcode":taxcode,
                        // "y_rate":y_rate,
                        "cpxh":cpxh,
                        "brand":brand,
                        "gpl":gpl,
                        "kcOff":kc_off,
                        "dhOff":dh_off,
                        "djWeight":dj_weight,
                        // "allWeight":all_weight,
                        "des":des,
                        "wzLocation":location_wz,
                        "llPrice":lr_price,
                        "productLine":product_line,
                    });
                }

                return {
                    "entity":rec.getValue('entity'),
                    "department":rec.getValue('department'),
                    "location":rec.getValue('location'),
                    "entitystatus":rec.getValue('entitystatus'),
                    "customer_country":rec.getValue('custbody_sl_so_custdiq'),
                    "country":rec.getValue('custbody_sl_sopeis'),
                    "customer_area":rec.getValue('custbody_sl_so_custdir'),
                    "items":item_list,
                }
            }
        }
        function beforeSubmit(context) {
            try{
                var weight_sum = Number(0);
                var y_amount = Number(0);
                var r_amount = Number(0);
                var bx_amount = Number(0);
                var yf_amount = Number(0);
                var other_amount = Number(0);
                if(context.type == 'create' || context.type == 'edit'){
                    var rec = context.newRecord;
                    var count = rec.getLineCount('item');
                    var sublistId = 'item';
                    for(var i = 0;i < count;i++){
                        var qty = rec.getSublistValue({
                            sublistId:sublistId,
                            fieldId:'quantity',
                            line:i,
                        });
                        var each_weight = rec.getSublistValue({
                            sublistId:sublistId,
                            fieldId:'custcol_sl_spo_danjianzl',
                            line:i,
                        });
                        var item = rec.getSublistValue({
                            sublistId:sublistId,
                            fieldId:'item',
                            line:i,
                        });
                        var rate = rec.getSublistValue({
                            sublistId:sublistId,
                            fieldId:'rate',
                            line:i,
                        });
                        var y_rate = rec.getSublistValue({
                            sublistId:sublistId,
                            fieldId:'custcol_sl_ydj',
                            line:i,
                        });
                        var item_class = checkInventoryitem(item);
                        if(item_class == 'Y'){
                            weight_sum += Number(each_weight) * Number(qty);
                            y_amount += Number(y_rate) * Number(qty);
                            r_amount += Number(rate) * Number(qty);
                        }
                        if(item == 134){//保险费
                            bx_amount += Number(rate) * Number(qty);
                        }
                        if(item == 139){//运费
                            yf_amount += Number(rate) * Number(qty);
                        }
                        if(item_class == 'N' && item != 139 && item != 134){
                            other_amount += Number(rate) * Number(qty);
                        }
                    }
                    log.debug('yf_amount bx_amount other_amount weight_sum r_amount y_amount',yf_amount + '---' + bx_amount + '---' + other_amount + '---' + weight_sum + '---' + r_amount + '---' + y_amount);
                    //对总重量、折后总计、原价总计、折扣金额、其他费用、保险费、运费
                    if(bx_amount || yf_amount || r_amount){
                        rec.setValue('custbody_sl_socankao',((Number(bx_amount) + Number(yf_amount) + Number(r_amount)) * 0.04).toFixed(2));//PP参考费
                    }else {
                        rec.setValue('custbody_sl_socankao','0.0000');//PP参考费
                    }
                    rec.setValue('custbody_sl_spo_yunfheji',yf_amount);//运费
                    rec.setValue('custbody_sl_spo_baoxheji',bx_amount);//保险费
                    rec.setValue('custbody_sl_spo_qitfeiyheji',other_amount);//其他费用
                    // rec.setValue('custbody_sl_zkjrxj',(y_amount.toFixed(4) - r_amount.toFixed(4)).toFixed(4));//折后金额小计
                    rec.setValue('custbody_sl_soyuanj',r_amount.toFixed(2) || '0.00');//折后小计
                    rec.setValue('custbody_sl_sozheko',y_amount.toFixed(2) || '0.00');//原价小计
                    rec.setValue('custbody_sl_spo_zhozl',(weight_sum).toFixed(2));//总重量
                    if(r_amount * 0.018 >= 10){
                        rec.setValue('custbody_sl_so_baoxf',(r_amount * 0.018).toFixed(2));//参考保险费
                    }else{
                        rec.setValue('custbody_sl_so_baoxf',10);//参考保险费
                    }
                    //参考运费，调用公共脚本
                    if(weight_sum && rec.getValue('custbody_sl_spo_transway') && rec.getValue('custbody_sl_sopeis')){
                        var ret = freightQuery({"custpage_transport_country":record.load({type:'customrecord_country_im',id:rec.getValue('custbody_sl_sopeis')}).getValue('custrecord_country_cn'),"custpage_transport_weight":weight_sum,"custpage_remote_areas":rec.getValue('custbody_sl_so_pyf')});//FREIGHT_CALCULATION.js,
                        log.debug('调用函数返回值',ret);
                        if(ret){
                            for(var r = 0;r < ret.length;r++){
                                if(ret[r].shipping_type == rec.getValue('custbody_sl_spo_transway')){
                                    rec.setValue('custbody_sl_so_yunfei',ret[r].transport_fee);//参考运费
                                    break;
                                }
                                else{
                                    rec.setValue('custbody_sl_so_yunfei',0);//参考运费
                                }
                            }
                        }
                        else {
                            rec.setValue('custbody_sl_so_yunfei',0);//参考运费
                        }
                    }
                }
            }catch (e){
                log.debug('保存之前报错',e);
            }
        }
        //查询运输费用
        function freightQuery(params) {
            //根据国家查询所有的运输价格(国家对应的类型有相同的，按优先级取)
            var data = [], result_arr = [];
            if (params.custpage_transport_country && params.custpage_transport_weight) {
                search.create({
                    type: 'customrecord_destination',
                    filters: [
                        { name: 'custrecord_countrys', operator: 'is', values: params.custpage_transport_country },
                        { name: 'isinactive', operator: 'is', values: false }
                    ],
                    columns: [
                        { name: 'custrecord_mians_id' },
                        { name: 'custrecord_shipping_type', join: 'custrecord_mians_id' },
                        { name: 'custrecord_sequence_no', join: 'custrecord_mians_id' },
                        { name: 'custrecord_prescription', join: 'custrecord_mians_id' }
                    ]
                }).run().each(function (rec) {
                    if (rec.getValue(rec.columns[0])) {
                        data.push({
                            main_id: rec.getValue(rec.columns[0]),
                            shipping_type: rec.getValue(rec.columns[1]),
                            sequence_no: rec.getValue(rec.columns[2]),
                            prescription: rec.getValue(rec.columns[3]),
                        })
                    }
                    return true;
                });
                log.debug('data', data);
                if (data.length > 0) {
                    //去除相同类型，按优先级取值
                    var need_arr = mergeFilter(data);
                    log.debug('need_arr', need_arr);
                    if (need_arr.length > 0) {
                        //获取运输价格明细
                        var detail_arr = getPricDetail(need_arr, search);
                        if (detail_arr.length > 0) {
                            //将运输类型、时效放入detail_arr数组中
                            for (var i = 0; i < detail_arr.length; i++) {
                                for (var j = 0; j < need_arr.length; j++) {
                                    if (detail_arr[i].main_id == need_arr[j].main_id) {
                                        detail_arr[i].shipping_type = need_arr[j].shipping_type;
                                        detail_arr[i].prescription = need_arr[j].prescription;
                                    }
                                }
                            }
                            log.debug('detail_arr', detail_arr);
                            //根据重量获取最佳运输价格明细
                            var optimum_arr = getOptimumPrice(detail_arr, params.custpage_transport_weight);
                            log.debug('optimum_arr', optimum_arr);
                            if (optimum_arr.length > 0) {
                                //获取偏远地区
                                var areas_fee;
                                if (params.custpage_remote_areas == 'T') {
                                    areas_fee = getRemoteAreas(search, params.custpage_transport_weight);
                                }
                                log.debug('偏远地区费用', areas_fee);
                                //获取运费系数、系数、总额/最小值/阶梯价格
                                var freight_coefficient = getFreightCoefficient(params, search, params.custpage_transport_weight);
                                log.debug('freight_coefficient', freight_coefficient);
                                if (freight_coefficient.length > 0) {
                                    var optimum_arr_type = [];
                                    for (var i = 0; i < optimum_arr.length; i++) {
                                        if (optimum_arr_type.indexOf(optimum_arr[i].shipping_type) == -1) {
                                            optimum_arr_type.push(optimum_arr[i].shipping_type);
                                        }
                                        var freight_fee = 1, transport_fee, coefficient_fee = 1, res_fee = 0, additional_name;
                                        for (var j = 0; j < freight_coefficient.length; j++) {
                                            if (freight_coefficient[j].select_all) {
                                                if (freight_coefficient[j].freight_coefficient && freight_coefficient[j].freight_coefficient != 0) {
                                                    freight_fee = freight_coefficient[j].freight_coefficient;
                                                }
                                                if (freight_coefficient[j].coefficient && freight_coefficient[j].coefficient != 0) {
                                                    coefficient_fee = freight_coefficient[j].coefficient;
                                                }
                                                // main_id = freight_coefficient[j].main_id ? freight_coefficient[j].main_id : '';
                                                res_fee = Number(freight_coefficient[j].result_fee) + Number(res_fee);
                                                // additional_name = freight_coefficient[j].additional_name;
                                                // trans_type = 'true';
                                                // break;
                                            } else if (freight_coefficient[j].transportation_type.indexOf(optimum_arr[i].shipping_type) != -1) {
                                                if (freight_coefficient[j].freight_coefficient && freight_coefficient[j].freight_coefficient != 0) {
                                                    freight_fee = freight_coefficient[j].freight_coefficient;
                                                }
                                                if (freight_coefficient[j].coefficient && freight_coefficient[j].coefficient != 0) {
                                                    coefficient_fee = freight_coefficient[j].coefficient;
                                                }
                                                // main_id = freight_coefficient[j].main_id ? freight_coefficient[j].main_id : '';
                                                res_fee = Number(freight_coefficient[j].result_fee) + Number(res_fee);
                                                // additional_name = freight_coefficient[j].additional_name;
                                                // trans_type = freight_coefficient[j].transportation_type;
                                                // break;
                                            }
                                        }
                                        if (optimum_arr[i].result_str.price_type == 2) {//如果是变量需要用（价格*运费系数*重量*系数 + 总额/最小值/阶梯价格）
                                            transport_fee = Number(optimum_arr[i].result_str.selling_price * freight_fee * params.custpage_transport_weight * coefficient_fee) + Number(res_fee);
                                        } else {
                                            transport_fee = Number(optimum_arr[i].result_str.selling_price * freight_fee * coefficient_fee) + Number(res_fee);
                                        }
                                        if (areas_fee && params.custpage_remote_areas == 'T' && transport_fee != 0) {
                                            transport_fee = Number(transport_fee) + Number(areas_fee);
                                        }
                                        result_arr.push({
                                            shipping_type: optimum_arr[i].shipping_type ? optimum_arr[i].shipping_type : '',
                                            prescription: optimum_arr[i].prescription ? optimum_arr[i].prescription : '',
                                            transport_fee: transport_fee ? Number(transport_fee).toFixed(2) : '',
                                            // additional_arr: additional_arr,
                                            // additional_name: additional_name ? additional_name : '',
                                            // trans_type: trans_type ? trans_type : '',
                                            // res_fee: res_fee,
                                            // main_id: main_id
                                        })
                                    }
                                    //对需要展示的附加费进行处理
                                    log.debug('optimum_arr_type', optimum_arr_type);
                                    var additional_arr = [], main_id = [];
                                    if (areas_fee && areas_fee != 0) {
                                        additional_arr.push({
                                            additional_name: '偏远地区费',
                                            need_fee: areas_fee,
                                            trans_type: 'true',
                                            trans_type_arr: []
                                        })
                                    }
                                    for (var j = 0; j < freight_coefficient.length; j++) {
                                        if (Number(freight_coefficient[j].result_fee) != 0 && main_id.indexOf(freight_coefficient[j].main_id) == -1) {
                                            var trans_type = false, trans_type_arr = [], flage = 2;
                                            if (freight_coefficient[j].select_all) {
                                                trans_type = 'true';
                                                flage = 1;
                                            } else if (freight_coefficient[j].transportation_type.length > 0) {
                                                for (var i = 0; i < freight_coefficient[j].transportation_type.length; i++) {
                                                    for (var a = 0; a < optimum_arr_type.length; a++) {
                                                        if (optimum_arr_type[a] == freight_coefficient[j].transportation_type[i]) {
                                                            trans_type_arr.push(freight_coefficient[j].transportation_type[i]);
                                                            flage = 1;
                                                        }
                                                    }
                                                }
                                            }
                                            if (flage == 1) {
                                                additional_arr.push({
                                                    additional_name: freight_coefficient[j].additional_name,
                                                    need_fee: freight_coefficient[j].result_fee,
                                                    trans_type: trans_type,
                                                    trans_type_arr: trans_type_arr
                                                })
                                                main_id.push(freight_coefficient[j].main_id);
                                            }
                                        }
                                    }
                                    result_arr[0].additional_arr = additional_arr;
                                    log.debug('result_arr', result_arr);
                                    return result_arr;
                                }
                            }
                        }
                    }
                }
            }
        }
        //获取运费系数
        function getFreightCoefficient(params, search, weight) {
            var data = [];
            var bill_id = [];
            //按国家查询所有的附加费表
            search.create({
                type: 'customrecord_destination',
                filters: [
                    { name: 'custrecord_countrys', operator: 'is', values: params.custpage_transport_country },
                    { name: 'isinactive', operator: 'is', values: false }
                ],
                columns: [
                    { name: 'custrecord_secondary_id' },
                    { name: 'custrecord_fj_sequence', join: 'custrecord_secondary_id', sort: search.Sort.ASC },
                    { name: 'custrecord_freight_coefficient', join: 'custrecord_secondary_id' },
                    { name: 'custrecord_select_all', join: 'custrecord_secondary_id' },
                    { name: 'custrecord_apply_country', join: 'custrecord_secondary_id' },
                    { name: 'custrecord_total', join: 'custrecord_secondary_id' },
                    { name: 'custrecord_minimum_price', join: 'custrecord_secondary_id' },
                    { name: 'custrecord_coefficient', join: 'custrecord_secondary_id' },
                    { name: 'custrecord_variable', join: 'custrecord_secondary_id' },
                    { name: 'custrecord_additional_name', join: 'custrecord_secondary_id' }
                ]
            }).run().each(function (rec) {
                if (rec.getValue(rec.columns[0])) {
                    data.push({
                        main_id: rec.getValue(rec.columns[0]),
                        fj_sequence: rec.getValue(rec.columns[1]),
                        freight_coefficient: rec.getValue(rec.columns[2]),
                        select_all: rec.getValue(rec.columns[3]),
                        apply_country: rec.getValue(rec.columns[4]),
                        total: rec.getValue(rec.columns[5]),
                        minimum_price: rec.getValue(rec.columns[6]),
                        coefficient: rec.getValue(rec.columns[7]),
                        variable: rec.getValue(rec.columns[8]),
                        additional_name: rec.getValue(rec.columns[9]),
                        transportation_type: '',
                        result_fee: 0
                    })
                    bill_id.push(rec.getValue(rec.columns[0]));
                }
                return true;
            });
            //直接查询应用到所有目的地的附加费信息
            search.create({
                type: 'customrecord_transport_additional',
                filters: [
                    { name: 'custrecord_apply_country', operator: 'is', values: true },
                    { name: 'isinactive', operator: 'is', values: false }
                ],
                columns: [
                    { name: 'custrecord_fj_sequence', sort: search.Sort.ASC },
                    { name: 'custrecord_freight_coefficient' },
                    { name: 'custrecord_select_all' },
                    { name: 'custrecord_apply_country' },
                    { name: 'custrecord_total' },
                    { name: 'custrecord_minimum_price' },
                    { name: 'custrecord_coefficient' },
                    { name: 'custrecord_variable' },
                    { name: 'custrecord_additional_name' }
                ]
            }).run().each(function (rec) {
                if (bill_id.indexOf(rec.id) == -1) {
                    data.push({
                        main_id: rec.id,
                        fj_sequence: rec.getValue(rec.columns[0]),
                        freight_coefficient: rec.getValue(rec.columns[1]),
                        select_all: rec.getValue(rec.columns[2]),
                        apply_country: rec.getValue(rec.columns[3]),
                        total: rec.getValue(rec.columns[4]),
                        minimum_price: rec.getValue(rec.columns[5]),
                        coefficient: rec.getValue(rec.columns[6]),
                        variable: rec.getValue(rec.columns[7]),
                        additional_name: rec.getValue(rec.columns[8]),
                        transportation_type: '',
                        result_fee: 0
                    })
                }
                return true;
            });
            //查询没有应用到所有运输类型的运输类型明细
            if (data.length > 0) {
                var transportation_arr = [];
                for (var i = 0; i < data.length; i++) {
                    if (!data[i].select_all) {
                        transportation_arr.push(data[i].main_id);
                    }
                }
                if (transportation_arr.length > 0) {
                    var type_arr = [];
                    search.create({
                        type: 'customrecord_transportation_type',
                        filters: [
                            { name: 'custrecord_transport_id', operator: 'anyof', values: transportation_arr },
                            { name: 'isinactive', operator: 'is', values: false }
                        ],
                        columns: [
                            { name: 'custrecord_of_shipping' },
                            { name: 'custrecord_transport_id' }
                        ]
                    }).run().each(function (rec) {
                        type_arr.push({
                            type_id: rec.getValue(rec.columns[0]),
                            bill_id: rec.getValue(rec.columns[1])
                        });
                        return true;
                    });
                    for (var i = 0; i < data.length; i++) {
                        var need_type_arr = []
                        for (var j = 0; j < type_arr.length; j++) {
                            if (type_arr[j].bill_id == data[i].main_id) {
                                need_type_arr.push(type_arr[j].type_id);
                            }
                        }
                        data[i].transportation_type = need_type_arr;
                    }
                }
                //需查询的明细
                var need_id = [];
                for (var i = 0; i < data.length; i++) {
                    if (data[i].total && data[i].minimum_price && data[i].total != 0 && data[i].minimum_price != 0) {
                        var total;
                        if (data[i].variable) {
                            total = data[i].total * weight;
                        } else {
                            total = data[i].total
                        }
                        if (total >= data[i].minimum_price) {
                            data[i].result_fee = total ? total : 0;
                        } else {
                            data[i].result_fee = data[i].minimum_price ? data[i].minimum_price : 0;
                        }
                    } else if (data[i].total && data[i].total != 0) {
                        if (data[i].variable) {
                            data[i].result_fee = data[i].total * weight;
                        } else {
                            data[i].result_fee = data[i].total ? data[i].total : 0
                        }
                    } else if (data[i].minimum_price && data[i].minimum_price != 0) {
                        data[i].result_fee = data[i].minimum_price ? data[i].minimum_price : 0;
                    } else {
                        need_id.push(data[i].main_id);
                    }
                }
                if (need_id.length > 0) {
                    var result_arr = getDetailsData(need_id, search, weight);
                    if (result_arr.length > 0) {
                        for (var i = 0; i < data.length; i++) {
                            for (var j = 0; j < result_arr.length; j++) {
                                if (result_arr[j].main_id == data[i].main_id) {
                                    data[i].result_fee = result_arr[j].result_fee ? result_arr[j].result_fee : 0
                                }
                            }
                        }
                    }
                }
            }
            return data;
        }
        //获取偏远地区
        function getRemoteAreas(search, weight) {
            var data = [], fee, bill_id = [];
            search.create({
                type: 'customrecord_transport_additional',
                filters: [
                    { name: 'custrecord_remote_areas', operator: 'is', values: true },
                    { name: 'isinactive', operator: 'is', values: false }
                ],
                columns: [
                    { name: 'custrecord_fj_sequence', sort: search.Sort.DESC },
                    { name: 'custrecord_total' },
                    { name: 'custrecord_minimum_price' },
                    { name: 'custrecord_variable' }
                ]
            }).run().each(function (rec) {
                data.push({
                    fj_sequence: rec.getValue(rec.columns[0]),
                    total: rec.getValue(rec.columns[1]),
                    minimum_price: rec.getValue(rec.columns[2]),
                    variable: rec.getValue(rec.columns[3])
                })
                bill_id.push(rec.id);
                return true;
            });
            if (data.length > 0) {
                for (var i = 0; i < data.length; i++) {
                    if (data[i].total && data[i].minimum_price && data[i].total != 0 && data[i].minimum_price != 0) {
                        var total;
                        if (data[i].variable) {
                            total = data[i].total * weight;
                        } else {
                            total = data[i].total
                        }
                        if (total >= data[i].minimum_price) {
                            fee = total;
                        } else {
                            fee = data[i].minimum_price;
                        }
                    } else if (data[i].total && data[i].total != 0) {
                        if (data[i].variable) {
                            fee = data[i].total * weight;
                        } else {
                            fee = data[i].total
                        }
                    } else if (data[i].minimum_price && data[i].minimum_price != 0) {
                        fee = data[i].minimum_price;
                    }
                }
                if (!fee || fee == 0) {
                    //查询阶梯价格明细
                    var detail_arr = [];
                    search.create({
                        type: 'customrecord_weight_details',
                        filters: [
                            { name: 'custrecord_weight_id', operator: 'anyof', values: bill_id },
                            { name: 'isinactive', operator: 'is', values: false }
                        ],
                        columns: [
                            { name: 'custrecord_sequence', sort: search.Sort.ASC },
                            { name: 'custrecord_operator' },
                            { name: 'custrecord_weight' },
                            { name: 'custrecord_cost' },
                            { name: 'custrecord_minimum_price', join: 'custrecord_weight_id' },
                            { name: 'custrecord_variable', join: 'custrecord_weight_id' }
                        ]
                    }).run().each(function (rec) {
                        detail_arr.push({
                            sequence: rec.getValue(rec.columns[0]),
                            operator: rec.getValue(rec.columns[1]),
                            weight: rec.getValue(rec.columns[2]),
                            cost: rec.getValue(rec.columns[3]),
                            minimum_price: rec.getValue(rec.columns[4]),
                            variable: rec.getValue(rec.columns[5])
                        })
                        return true;
                    });
                    //获取最佳的阶梯价格
                    if (detail_arr.length > 0) {
                        fee = getLadderPrice(detail_arr, weight);
                    }
                }
            }
            return fee;
        }
        //获取阶梯价格明细
        function getDetailsData(need_id, search, weight) {
            var detail_arr = [], need_arrs = [];
            search.create({
                type: 'customrecord_weight_details',
                filters: [
                    { name: 'custrecord_weight_id', operator: 'anyof', values: need_id },
                    { name: 'isinactive', operator: 'is', values: false }
                ],
                columns: [
                    { name: 'custrecord_sequence', sort: search.Sort.ASC },
                    { name: 'custrecord_operator' },
                    { name: 'custrecord_weight' },
                    { name: 'custrecord_cost' },
                    { name: 'custrecord_minimum_price', join: 'custrecord_weight_id' },
                    { name: 'custrecord_variable', join: 'custrecord_weight_id' },
                    { name: 'custrecord_weight_id' }
                ]
            }).run().each(function (rec) {
                detail_arr.push({
                    sequence: rec.getValue(rec.columns[0]),
                    operator: rec.getValue(rec.columns[1]),
                    weight: rec.getValue(rec.columns[2]),
                    cost: rec.getValue(rec.columns[3]),
                    minimum_price: rec.getValue(rec.columns[4]),
                    variable: rec.getValue(rec.columns[5]),
                    main_id: rec.getValue(rec.columns[6])
                })
                return true;
            });
            if (detail_arr.length > 0) {
                need_arrs = getDetailsDataArrs(detail_arr, weight);
            }
            return need_arrs;
        }
        //获取最佳阶梯价格数组
        function getDetailsDataArrs(detail_arr, weight) {
            var fee_arr = [], err_arr = [];
            for (var a = 0; a < detail_arr.length; a++) {
                if (err_arr.indexOf(detail_arr[a].main_id) == -1) {
                    var sgin = 2, fee;
                    if (detail_arr[a].operator == 1) {
                        if (Number(weight) > Number(detail_arr[a].weight)) {
                            sgin = 1;
                        }
                    } else if (detail_arr[a].operator == 2) {
                        if (Number(weight) >= Number(detail_arr[a].weight)) {
                            sgin = 1;
                        }
                    } else if (detail_arr[a].operator == 3) {
                        if (Number(weight) < Number(detail_arr[a].weight)) {
                            sgin = 1;
                        }
                    } else if (detail_arr[a].operator == 4) {
                        if (Number(weight) <= Number(detail_arr[a].weight)) {
                            sgin = 1;
                        }
                    }
                    if (sgin && sgin == 1) {
                        if (detail_arr[a].cost && detail_arr[a].minimum_price && detail_arr[a].cost != 0 && detail_arr[a].minimum_price != 0) {
                            var total;
                            if (detail_arr[a].variable) {
                                total = detail_arr[a].cost * weight;
                            } else {
                                total = detail_arr[a].cost
                            }
                            if (total >= detail_arr[a].minimum_price) {
                                fee = total;
                            } else {
                                fee = detail_arr[a].minimum_price;
                            }
                        } else if (detail_arr[a].cost && detail_arr[a].cost != 0) {
                            if (detail_arr[a].variable) {
                                fee = detail_arr[a].cost * weight;
                            } else {
                                fee = detail_arr[a].cost;
                            }
                        } else if (detail_arr[a].minimum_price && detail_arr[a].minimum_price != 0) {
                            fee = detail_arr[a].minimum_price;
                        }
                        fee_arr.push({
                            main_id: detail_arr[a].main_id,
                            result_fee: detail_arr[a].fee
                        })
                        err_arr.push(detail_arr[a].main_id)
                    }
                }
            }
            return fee_arr;
        }
        //获取最佳的阶梯价格
        function getLadderPrice(detail_arr, weight) {
            var fee;
            for (var a = 0; a < detail_arr.length; a++) {
                var sgin = 2;
                if (detail_arr[a].operator == 1) {
                    if (Number(weight) > Number(detail_arr[a].weight)) {
                        sgin = 1;
                    }
                } else if (detail_arr[a].operator == 2) {
                    if (Number(weight) >= Number(detail_arr[a].weight)) {
                        sgin = 1;
                    }
                } else if (detail_arr[a].operator == 3) {
                    if (Number(weight) < Number(detail_arr[a].weight)) {
                        sgin = 1;
                    }
                } else if (detail_arr[a].operator == 4) {
                    if (Number(weight) <= Number(detail_arr[a].weight)) {
                        sgin = 1;
                    }
                }
                if (sgin && sgin == 1) {
                    if (detail_arr[a].cost && detail_arr[a].minimum_price && detail_arr[a].cost != 0 && detail_arr[a].minimum_price != 0) {
                        var total;
                        if (detail_arr[a].variable) {
                            total = detail_arr[a].cost * weight;
                        } else {
                            total = detail_arr[a].cost
                        }
                        if (total >= detail_arr[a].minimum_price) {
                            fee = total;
                        } else {
                            fee = detail_arr[a].minimum_price;
                        }
                    } else if (detail_arr[a].cost && detail_arr[a].cost != 0) {
                        if (detail_arr[a].variable) {
                            fee = detail_arr[a].cost * weight;
                        } else {
                            fee = detail_arr[a].cost;
                        }
                    } else if (detail_arr[a].minimum_price && detail_arr[a].minimum_price != 0) {
                        fee = detail_arr[a].minimum_price;
                    }
                    break;
                }
            }
            return fee;
        }
        //根据重量获取最佳运输价格明细
        function getOptimumPrice(detail_arr, weight) {
            var data_arr = [];
            for (var i = 0; i < detail_arr.length; i++) {
                var list_arr = detail_arr[i].list_arr;
                if (list_arr.length > 0) {
                    var ne_arr = {};
                    for (var a = 0; a < list_arr.length; a++) {
                        var sgin = 2;
                        var max_num = Number(list_arr[a].max_num);
                        if (list_arr[a].operator_list == 1) {
                            if (Number(weight) > Number(max_num)) {
                                sgin = 1;
                            }
                        } else if (list_arr[a].operator_list == 2) {
                            if (Number(weight) >= Number(max_num)) {
                                sgin = 1;
                            }
                        } else if (list_arr[a].operator_list == 3) {
                            if (Number(weight) < Number(max_num)) {
                                sgin = 1;
                            }
                        } else if (list_arr[a].operator_list == 4) {
                            if (Number(weight) <= Number(max_num)) {
                                sgin = 1;
                            }
                        }
                        if (sgin && sgin == 1) {
                            ne_arr.detail_sequence = list_arr[a].detail_sequence;
                            ne_arr.variable_type = list_arr[a].variable_type;
                            ne_arr.operator_list = list_arr[a].operator_list;
                            ne_arr.max_num = list_arr[a].max_num;
                            ne_arr.price_type = list_arr[a].price_type;
                            ne_arr.selling_price = list_arr[a].selling_price;
                            break;
                        }
                    }
                    data_arr.push({
                        main_id: detail_arr[i].main_id,
                        shipping_type: detail_arr[i].shipping_type,
                        prescription: detail_arr[i].prescription,
                        result_str: ne_arr
                    })
                }
            }
            return data_arr;
        }
        //获取对应的运输价格明细
        function getPricDetail(need_arr, search) {
            //查出的主键ID是唯一的
            var bill_ids = [], data_arr = [], sign_arr = [];
            for (var i = 0; i < need_arr.length; i++) {
                bill_ids.push(need_arr[i].main_id);
            }
            if (bill_ids.length > 0) {
                search.create({
                    type: 'customrecord_pric_detailed',
                    filters: [
                        { name: 'custrecord_main_id', operator: 'anyof', values: bill_ids },
                        { name: 'isinactive', operator: 'is', values: false }
                    ],
                    columns: [
                        { name: 'custrecord_main_id' },
                        { name: 'custrecord_detail_sequence', sort: search.Sort.ASC },
                        { name: 'custrecord_variable_type' },
                        { name: 'custrecord_operator_list' },
                        { name: 'custrecord_max_num' },
                        { name: 'custrecord_price_type' },
                        { name: 'custrecord_selling_price' }
                    ]
                }).run().each(function (rec) {
                    //相同的主ID，将数据放在同一个数组中
                    if (sign_arr.indexOf(rec.getValue('custrecord_main_id')) == -1) {
                        data_arr.push({
                            main_id: rec.getValue('custrecord_main_id'),
                            list_arr: [{
                                detail_sequence: rec.getValue('custrecord_detail_sequence'),
                                variable_type: rec.getValue('custrecord_variable_type'),
                                operator_list: rec.getValue('custrecord_operator_list'),
                                max_num: rec.getValue('custrecord_max_num'),
                                price_type: rec.getValue('custrecord_price_type'),
                                selling_price: rec.getValue('custrecord_selling_price'),
                            }]
                        })
                        sign_arr.push(rec.getValue('custrecord_main_id'));
                    } else {
                        for (var j = 0; j < data_arr.length; j++) {
                            if (data_arr[j].main_id == rec.getValue('custrecord_main_id')) {
                                data_arr[j].list_arr.push({
                                    detail_sequence: rec.getValue('custrecord_detail_sequence'),
                                    variable_type: rec.getValue('custrecord_variable_type'),
                                    operator_list: rec.getValue('custrecord_operator_list'),
                                    max_num: rec.getValue('custrecord_max_num'),
                                    price_type: rec.getValue('custrecord_price_type'),
                                    selling_price: rec.getValue('custrecord_selling_price'),
                                });
                                break;
                            }
                        }
                    }
                    return true;
                });
                return data_arr;
            }
        }
        //合并筛选优先级最高的数据
        function mergeFilter(data) {
            var need_data = [], pending_data = [], shipping_type = [];
            for (var i = 0; i < data.length; i++) {
                //将同类型的数据放在数组中
                if (shipping_type.indexOf(data[i].shipping_type) == -1) {
                    pending_data.push({
                        shipping_type: data[i].shipping_type,
                        prescription: data[i].prescription,
                        res_data: [{
                            main_id: data[i].main_id,
                            sequence_no: data[i].sequence_no
                        }]
                    })
                    shipping_type.push(data[i].shipping_type);
                } else {
                    for (var j = 0; j < pending_data.length; j++) {
                        if (pending_data[j].shipping_type == data[i].shipping_type) {
                            pending_data[j].res_data.push({
                                main_id: data[i].main_id,
                                sequence_no: data[i].sequence_no
                            });
                            break;
                        }
                    }
                }
            }
            log.debug('pending_data', pending_data);
            if (pending_data.length > 0) {
                for (var i = 0; i < pending_data.length; i++) {
                    var main_id, sequence_no;
                    if (pending_data[i].res_data.length > 1) {
                        var rs_data = mathMin(pending_data[i].res_data);
                        log.debug('rs_data', rs_data);
                        main_id = rs_data.main_id;
                        sequence_no = rs_data.sequence_no;
                    } else {
                        main_id = pending_data[i].res_data[0].main_id;
                        sequence_no = pending_data[i].res_data[0].sequence_no;
                    }
                    need_data.push({
                        main_id: main_id,
                        shipping_type: pending_data[i].shipping_type,
                        sequence_no: sequence_no,
                        prescription: pending_data[i].prescription
                    })
                }
            }

            return need_data;
        }
        // 查找数组中最小值
        function mathMin(arrs) {
            var min = arrs[0].sequence_no, data = {};
            for (var i = 0; i < arrs.length; i++) {
                if (arrs[i].sequence_no <= min) {
                    min = arrs[i].sequence_no;
                    data.main_id = arrs[i].main_id;
                    data.sequence_no = arrs[i].sequence_no;
                }
            }
            return data;
        }
        function checkInventoryitem(item){
            if(item){
                var mysearch = search.create({
                    type:'inventoryitem',
                    filters:[
                        ['internalid','is',item]
                    ],
                });
                var res = mysearch.run().getRange(0,100);
                if(res.length > 0){
                    return 'Y';
                }
                else if(item == 134){
                    return 'N_134';
                }
                else if(item == 139){
                    return 'N_139'
                }
                else {
                    return 'N';
                }
            }
        }
        function afterSubmit(context) {
            if(context.type == 'create'){
                var rec = record.load({type:'estimate',id:context.newRecord.id,isDynamic:true});
                var customer = rec.getValue('entity');
                var context_log = rec.getText('trandate') + '创建了报价单：' + rec.getValue('tranid');
                var man = rec.getValue('custbody_sl_spo_yyy');
                //向客户添加客户跟进记录子列表
                var log_rec = record.create({
                    type:'customrecord_cl_yejian_customer_log',
                    isDynamic:true,
                });
                log_rec.setValue('custrecord_cl_bj_id',context.newRecord.id);
                log_rec.setValue('custrecord_cl_yj_employe',man);
                log_rec.setValue('custrecord_cl_yj_customer_match',customer);
                log_rec.setValue('custrecord_cl_yj_context',context_log);
                var log_id = log_rec.save({ignoreMandatoryFields: true});
                log.debug('log_id',log_id);
            }
        }

        return {
            beforeLoad: beforeLoad,
            beforeSubmit: beforeSubmit,
            afterSubmit: afterSubmit
        };
    });
