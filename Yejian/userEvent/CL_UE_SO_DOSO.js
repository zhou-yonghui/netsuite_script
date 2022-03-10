/**
 * 销售订单判断首单
 * 货品自动审批
 * 保存之后计算折后总计等字段
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define(['N/record','N/search','N/format','N/runtime','N/currency','SuiteScripts/Common/FREIGHT_CALCULATION.js'],
    function(record,search,format,runtime,currencyRate) {
        function beforeLoad(context) {
            try{
                if(context.type == 'view'){
                    var rec = context.newRecord;
                    var form = context.form;
                    var soData = new Object();
                    soData.flag = '0';
                    var peizhi_array = new Array();
                    var item_list = new Object();
                    var flag = 0;      //0：代表消费品，1代表普通品
                    var web_order_flag = rec.getValue('custbody_sl_so_wd');//网单标记
                    //判断是否为消费品
                    var count = rec.getLineCount('item');
                    for(var i = 0;i < count;i++){
                        var sku = rec.getSublistValue({
                            sublistId:'item',
                            fieldId:'item',
                            line:i,
                        });
                        var qty = rec.getSublistValue({
                            sublistId:'item',
                            fieldId:'quantity',
                            line:i,
                        })
                        var item_info = findIitemClass(sku);
                        log.debug('item_info',item_info);
                        if(item_info.flag == 'ptitem'){
                            flag = 1;
                            break;
                        }else if(item_info.flag == 'xfitem'){
                            //
                            var onhand = getOnhandQty(sku,rec.getValue('location'));
                            if(onhand >= qty){
                                if(item_info.xfjexz){
                                    peizhi_array.push({'xfjexz':item_info.xfjexz});
                                }else{
                                    peizhi_array.push({'xfjexz':0});
                                }
                            }else {
                                flag = 2;
                                break;
                            }
                        }else if(item_info.flag == 'otherchargeitem'){
                            var amount = rec.getSublistValue({
                                sublistId:'item',
                                fieldId:'amount',
                                line:i
                            });
                            if(sku == '134'){
                                item_list.baoxian = amount;
                                item_list.bxsku = sku;
                            }
                            if(sku == '139'){
                                item_list.yunfei = amount;
                                item_list.yfsku = sku;
                            }
                            if(sku == '136'){
                                item_list.paypal = amount;
                                item_list.paysku = sku;
                            }
                        }
                    }
                    log.debug('peizhi_array',peizhi_array);
                    log.debug('flag',flag);
                    log.debug('item_list',item_list);
                    /** ①	订单总额=到款总额
                     ②	订单金额 < 1000USD （支持设置）
                     ③	提交后，库存可用数量足够本单发货
                     ④	产品大类在设置范围内
                     ⑤	偏远费=0 （非偏远地区）
                     ⑥	订单明细包含保险费时，保险选项=建议保险
                     ⑦	费用检测：
                     1)	Paypal 费=网单 paypal 费
                     2)	保险费=网单保险费
                     3)	运费=网单运费
                     */
                    if(flag == 0){
                        var order_amount = rec.getValue('total');//订单总计金额
                        var return_amount = rec.getValue('custbody_sl_soamm');//回款金额
                        if(peizhi_array.length > 0){   //防止只选费用货品
                            if(order_amount > peizhi_array[0].xfjexz){
                                soData.flag = 1;//TODO：订单金额大于消费品限制金额，订单金额还未转成USD汇率的金额
                            }else{
                                if(order_amount != return_amount){
                                    soData.flag = 2;//订单总额不等于到款总额
                                }else{
                                    var pyf = rec.getValue('custbody_sl_so_pyf');//是否偏远地区
                                    if(pyf == true){
                                        soData.flag = 3;//偏远地区
                                    }else{
                                        var wdbaoxian = rec.getValue('custbody_sl_so_wdbaox');//网单保险费
                                        var wdyunfei = rec.getValue('custbody_sl_so_wdyf');//网单运费
                                        var wdpay = rec.getValue('custbody_sl_so_fypapal');//网单 paypal 费
                                        var bxxuanxiang = rec.getValue('custbody_sl_so_baox');//保险选项
                                        var jy_baoxian = rec.getValue('custbody_sl_sojiany');//建议保险
                                        //有保险费
                                        if(item_list.baoxian > 0){
                                            if(item_list.bxsku == '134' && bxxuanxiang != jy_baoxian){
                                                soData.flag = 4;//保险选项不对
                                            }else{
                                                if(item_list.bxsku == '134' && item_list.baoxian != wdbaoxian){
                                                    soData.flag = 5;//网单保险金额不同
                                                }else if(item_list.yfsku == '139' && item_list.yunfei != wdyunfei){
                                                    soData.flag = 6;//网单运费金额不同
                                                }else if(item_list.paysku == '136' && item_list.paypal != wdpay){
                                                    soData.flag = 7;//网单paypal金额不同
                                                }
                                            }
                                        }
                                        //没有保险费
                                        else {
                                            if(item_list.bxsku == '134' && item_list.baoxian != wdbaoxian){
                                                soData.flag = 5;//网单保险金额不同
                                            }else if(item_list.yfsku == '139' && item_list.yunfei != wdyunfei){
                                                soData.flag = 6;//网单运费金额不同
                                            }else if(item_list.paysku == '136' && item_list.paypal != wdpay){
                                                soData.flag = 7;//网单paypal金额不同
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        else{
                            soData.flag = 1000;
                        }
                    }else if(flag == 1){    //普通货品
                        soData.flag = 100;
                    }else if(flag == 2){
                        //无库存
                        soData.flag = 101;
                    }
                    log.debug('soData.flag',soData.flag);
                    // log.debug('record status',rec.getValue('status'));
                    // if(rec.getValue('orderstatus') == 'A'){//等待核准状态
                    if(rec.getValue('custbody_approval_status') != 5 && rec.getValue('orderstatus') == 'A' && web_order_flag == true){      //5:审核通过
                        //创建按钮
                        form.clientScriptFileId = 17;   //TODO:关联客户端脚本CL_CS_UNTIL.js的内部id
                        //判断角色
                        var role = runtime.getCurrentUser().role;
                        log.debug('role',role);
                        var role_flag = checkRole(role);
                        if(role_flag == 'Y'){
                            if(soData.flag != 0){
                                form.addButton({
                                    id:'custpage_autoapproval',
                                    label:'自动审批',
                                    functionName:'autoApproval(' + soData.flag + ')',
                                });
                            }else{
                                form.addButton({
                                    id:'custpage_autoapproval',
                                    label:'自动审批',
                                    functionName:'autoApproval(' + flag + ')',
                                });
                            }
                        }
                    }
                }
            }
            catch (e){
                log.debug('加载之前报错',e);
            }
        }
        function getOnhandQty(sku,location) { //TODO:获取货品可用量的搜索
            var onhandQty = Number(0);
            var mySearch = search.create({
                type:'item',
                filters:[['internalid','anyof',sku],
                    // 'AND',['quantityavailable','greaterthan',0]
                    "AND",['inventorylocation','anyof',location],
                ],
                columns:[
                    {name:'locationquantityavailable',type:'float',label:'可用地点'},            //TODO：地点可用数量
                    // {name:'subsidiarynohierarchy',type:'select',label:'库存地点子公司'},
                    {name:'inventorylocation',type:'select',label:'库存地点'},
                    {name:'quantityavailable',label:'可用'},
                    {name:'locationquantityavailable'},
                    {name:'locationquantitycommitted'},
                    {name:'locationquantitycommitted',label:'地点已确定'},
                ]
            });
            var col = mySearch.columns;
            var res = mySearch.run().getRange({start:0,end:1000});
            log.debug('可用量查询数量',res.length + JSON.stringify(res));
            if(res.length > 0){
                for(var i = 0;i < res.length;i++){
                    var location_search = res[i].getValue(col[1]);
                    if(location == location_search){
                        var sub_onhand = res[i].getValue(col[2]);//可用量
                        onhandQty = sub_onhand;
                    }
                }
            }
            return onhandQty;
        }
        function checkRole(role_id) {
            log.debug('role_id',role_id);
            var flag = 'Y';
            if(role_id){
                // 采购角色
                var role_arr = [1018,1019,1024];
                for(var i = 0;i < role_arr.length;i++){
                    if(role_id == role_arr[i]){
                        flag = 'N';
                        break;
                    }
                }
            }
            log.debug('角色',flag);
            return flag;
        }
        function getCurrencyRate(soCurrency) {
            var rate = currencyRate.exchangeRate({
                date: new Date(),
                source: soCurrency,
                target: 'USD',
            });
            log.debug('rate',rate);
        }
        function findIitemClass(sku) {
            var item_info = new Object();
            item_info.flag = 'ptitem';
            var check_item = otherchargeitem(sku);
            if(check_item == 'item'){
                var search_invItem = search.create({
                    type:'inventoryitem',
                    filters:[['internalid','is',sku]],
                    columns:['class']
                });
                var res_invItem = search_invItem.run().getRange(0,1);
                log.debug('res_invItem',JSON.stringify(res_invItem));
                if(res_invItem.length > 0){
                    //查找消费品配置表
                    var mysearch = search.create({
                        type:'customrecord_sl_xfp',
                        columns:[
                            {name:'internalid',sort:search.Sort.ASC},//TODO:顺序排序
                            {name:'custrecord_sl_ddxs'},//消费品限制金额
                            {name:'custrecord_sl_cpfw',join:'CUSTRECORD_SL_GLXFMX'},//产品范围
                            {name:'custrecord_sl_cebl',join:'CUSTRECORD11'}
                        ],
                        filters:[['isinactive','is',false]]
                    });
                    var res = mysearch.run().getRange(0,1000);
                    log.debug('peizhi res',JSON.stringify(res));
                    if(res.length > 0){
                        for(var i = 0;i < res.length;i++){
                            if(res[i].getValue(mysearch.columns[2]) == res_invItem[0].getValue(search_invItem.columns[0])){
                                item_info.flag = 'xfitem';
                                item_info.xfjexz = res[i].getValue(mysearch.columns[1]);
                            }
                        }
                    }
                }
            }else if(check_item == 'otherchargeitem'){
                item_info.flag = 'otherchargeitem';
            }
            return item_info;
        }
        function otherchargeitem(sku) {
            //  var otherchargeitem_array = ['15','16','12'];//TODO:测试环境 15:保险费，16：运费，12：Paypal费
            if(sku){
                // for(var i = 0;i < otherchargeitem_array.length;i++){
                //     if(sku == otherchargeitem_array[i]){
                //         return 'otherchargeitem';
                //     }
                // }
                // return 'item';

                var mysearch = search.create({
                    type:'otherchargeitem',
                    filters:[
                        ['internalid','is',sku],
                        'AND',['isinactive','is',false],
                    ]
                });
                var res = mysearch.run().getRange(0,1);
                if(res.length > 0){
                    return 'otherchargeitem';
                }
                else{
                    return 'item';
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
                    //对总重量、折后总计、原价总计、折扣金额、其他费用、保险费、运费
                    if(bx_amount || yf_amount || r_amount){
                        rec.setValue('custbody_sl_socankao',((Number(bx_amount) + Number(yf_amount) + Number(r_amount)) * 0.04).toFixed(4));//PP参考费
                    }else {
                        rec.setValue('custbody_sl_socankao','0.0000');//PP参考费
                    }
                    rec.setValue('custbody_sl_spo_yunfheji',yf_amount);//运费
                    rec.setValue('custbody_sl_spo_baoxheji',bx_amount);//保险费
                    rec.setValue('custbody_sl_spo_qitfeiyheji',other_amount);//其他费用
                    rec.setValue('custbody_sl_zkjrxj',(y_amount.toFixed(4) - r_amount.toFixed(4)).toFixed(4));//折后金额小计
                    rec.setValue('custbody_sl_soyuanj',r_amount.toFixed(4) || '0.00');//折后小计
                    rec.setValue('custbody_sl_sozheko',y_amount.toFixed(4) || '0.00');//原价小计
                    rec.setValue('custbody_sl_spo_zhozl',(weight_sum).toFixed(2));//总重量
                    if(r_amount * 0.018 >= 10){
                        rec.setValue('custbody_sl_so_baoxf',(r_amount * 0.018).toFixed(4));//参考保险费
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
            try{
                if(context.type == 'create' || context.type == 'edit'){   //TODO:测试
                    var rec = record.load({
                        type:'salesorder',
                        id:context.newRecord.id,
                        isDynamic:true,
                    });
                    var customer = rec.getValue('entity');//客户
                    if(record.load({type:'customer',id:customer,isDynamic:true}).getValue('custentity_sl_sflkh') == false){
                        var find_so_flag = findSalesOrder(customer);
                        log.debug('find_so_flag',find_so_flag);
                        if(find_so_flag.flag == 'old'){
                            var order_date = format.parse({
                                value: rec.getValue('trandate'),
                                type: format.Type.DATE
                            });//订单日期
                            var old_date = format.parse({
                                value: find_so_flag.oldDate,
                                type: format.Type.DATE,
                            })
                            //    log.debug('order_date',new Date(order_date).getTime() + typeof(order_date));
                            //    log.debug('old date',new Date(old_date).getTime() + typeof(new Date(find_so_flag.oldDate)));
                            var one_day_secend = 86400000;//毫秒
                            if(new Date(order_date).getTime() - new Date(old_date).getTime() > one_day_secend * 14){
                                log.debug('已经超过首单十四天');
                                rec.setValue('custbody_sl_so_new',false);//新单
                                rec.save();
                            }
                            else{
                                rec.setValue('custbody_sl_so_new',true);//新单
                                rec.save();
                            }
                        }else{
                            rec.setValue('custbody_sl_so_new',true);//新单
                            rec.save();
                        }
                    }else {
                        rec.setValue('custbody_sl_so_new',false);//新单
                        rec.save();
                    }
                }
            }catch (e){
                log.debug('保存之后报错',e);
            }
        }
        function findSalesOrder(customer) {
            var flag = 'new';
            var oldDate;
            if(customer){
                var mysearch = search.create({
                    type:'salesorder',
                    columns:[{name:'internalid',sort: search.Sort.ASC},'trandate'],
                    filters:[['entity','is',customer],'AND',['mainline','is',true]],
                });
                var res = mysearch.run().getRange({start:0,end:1000});
                // log.debug('res',JSON.stringify(res));
                if(res.length > 1){
                    flag = 'old';
                    oldDate = res[0].getValue('trandate');
                }
            }
            return {"flag":flag,"oldDate":oldDate};
        }
        return {
            beforeLoad: beforeLoad,
            beforeSubmit: beforeSubmit,
            afterSubmit: afterSubmit
        };
    });
