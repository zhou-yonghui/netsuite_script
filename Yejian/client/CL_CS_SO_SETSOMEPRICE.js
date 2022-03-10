/**
 * 销售订单赋值参考费、运费、折扣小计、原价小计
 * 2021/10/17 保险管理: 参考保险费和建议保险字段计算
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */
define(['N/error','N/search','N/format','N/currentRecord','N/currency','N/record','SuiteScripts/Common/FREIGHT_CALCULATION.js'],
    function(error,search,format,currentRecord,currencyRate,record,FREIGHT_CALCULATION) {
        function pageInit(context) {
            // var rec = context.newRecord;
            // rec.setValue('custbody_sl_so_baox',1);//默认建议保险
        }
        function saveRecord(context) {
            var rec = context.currentRecord;
            var yslx_t = rec.getText('custbody_sl_spo_transway');//运输类型

            var item_count = rec.getLineCount('item');
            var amount_sum = Number(0);
            var bx_flag = "notbx";
            var bmbx_flag = 'N';
            for(var i = 0;i < item_count;i++){
                var item = rec.getSublistValue({
                    sublistId:'item',
                    fieldId:'item',
                    line:i,
                });
                var amount = rec.getSublistValue({
                    sublistId:'item',
                    fieldId:'amount',
                    line:i,
                });
                if(item == 134 && amount > 0){//保险费费用货品
                    bx_flag = "bx";
                }else{
                    var ret_item = checkOtherItem(item);
                    if(ret_item == "Y"){
                        amount_sum += Number(amount);
                    }
                }
            }
            log.debug('bx_flag',bx_flag);
            log.debug('非费用货品总金额',amount_sum);
            //明细行包含保险费
            if(bx_flag == 'bx'){
                var amount_sum_dis = amount_sum * 0.018;//TODO:计算配置表待确定，取最大值（产品折后总额 * 1.8%（支持配置）， 10（支持配置））
                if(amount_sum_dis < 10){
                    amount_sum_dis = 10;
                }
                log.debug('参考保险费',amount_sum_dis);
                rec.setValue('custbody_sl_so_baoxf',amount_sum_dis);//参考保险费
                //保险选项、建议保险字段
                var so_currency = rec.getText('custbody_sl_socurrency');//TODO:so币种，暂时先定为USD，别的币种需要汇率转换
                var ps_country = rec.getValue('custbody_sl_sopeis');//配送国家
                var country_data = psCountry(ps_country);
                var ys_type_data = yslxRec(rec.getValue('custbody_sl_spo_transway'));
                log.debug('yslx_t country_data',yslx_t + '---' + country_data);
                if(yslx_t == '客户快递'){//运输类型=“客户快递”，必买保险
                    bmbx_flag = 'Y';
                    //货物价值(折后总金额)<=5000
                    if(amount_sum <= 5000){
                        //高位风险区、必然风险区，先取运输类型的默认保险否则取第三方保险
                        if(country_data.brfxq == true || country_data.gwfxq == true){
                            if(ys_type_data.mrbaoxian){
                                rec.setValue('custbody_sl_so_baox',ys_type_data.mrbaoxian);//保险选项
                                rec.setValue('custbody_sl_sojiany',ys_type_data.mrbaoxian);//建议保险
                            }
                            else{
                                rec.setText('custbody_sl_so_baox','第三方保险');//保险选项
                                rec.setText('custbody_sl_sojiany','第三方保险');//建议保险
                            }
                        }
                    }
                    else if(amount_sum > 5000){
                        if(country_data.brfxq == true){
                            rec.setText('custbody_sl_so_baox','第三方保险');//保险选项
                            rec.setText('custbody_sl_sojiany','第三方保险');//建议保险
                        }
                    }
                    else if(amount_sum >= 30000){
                        rec.setText('custbody_sl_so_baox','第三方保险');//保险选项
                        rec.setText('custbody_sl_sojiany','第三方保险');//建议保险
                    }
                }
            }
            //没保险费
            else{
                rec.setText('custbody_sl_sojiany','无');//建议保险
            }
            //运输方式为Aramex时，默认保险为第三方保险
            if(yslx_t == 'Aramex'){
                rec.setText('custbody_sl_so_baox','第三方保险');//保险选项
            }
            if(bmbx_flag == 'Y'){
                var bxxx_t = rec.getText('custbody_sl_so_baox');//保险选项
                var bx_memo = rec.getValue('custbody_sl_sobaoxianbeizhu');//保险备注
                log.debug('保险选项 保险备注',bxxx_t + '---' + bx_memo);
                if(!bx_memo && (bxxx_t == '无' || bxxx_t == '不买保险')){
                    alert('没有保险备注时不允许不买保险选项为无或者不买保险！！');
                    return false;
                }
            }
            return true;
        }
        function yslxRec(yslx_id){
            if(yslx_id){
                var rec = record.load({
                    type:'customrecord_shipping_type',
                    id:yslx_id,
                    isDynamic:true,
                });
                return {
                    'mrbaoxian':rec.getValue('custrecord_sl_mrbx'),
                };
            }
            else{
                return {
                    'mrbaoxian':'',
                };
            }
        }
        function psCountry(country_id){
            if(country_id){
                var rec = record.load({
                    type:'customrecord_country_im',
                    id:country_id,
                    isDynamic:true,
                });

                return {
                    'cbrfx':rec.getValue('custrecord_inevitable_risks'),
                    'gwfxq':rec.getValue('custrecord_high_risk_countries'),
                    'brfxq':rec.getValue('custrecord_sl_birfxqy'),
                };
            }
            else{
                return {
                    'cbrfx':'',
                    'gwfxq':'',
                    'brfxq':'',
                };
            }
        }
        //获取价格区间
        function getPriceQujian(){
            var mysearch = search.create({
                type:'customrecord_sl_bxqj',
                columns:[
                    {name:'custrecord_sl_qjczz'},
                    {name:'custrecord_sl_dybz'},
                    {name:'internalid',sort:search.Sort.ASC}
                ],
            });
            var res = mysearch.run().getRange(0,100);

        }
        function checkOtherItem(item) {
            if(item){
                var mysearch = search.create({
                    type:'otherchargeitem',
                    filters:[['internalid','is',item]]
                });
                var res = mysearch.run().getRange(0,1);
                if(res.length >0){
                    return "F";
                }
            }
            return "Y";
        }
        function validateField(context) {

        }
        function fieldChanged(context) {
            var ret = new Array();
            var rec = context.currentRecord;
            var sublistId = context.sublistId;
            log.debug('sublistId',sublistId);
            var fieldId = context.fieldId;
            log.debug('fieldId',fieldId);
            if(fieldId == 'entity'){
                if(rec.getValue('entity')){
                    var cus_data = getCustomerSort(rec.getValue('entity'));
                    log.debug('cus_data',cus_data);
                    if(cus_data.cus_num){
                        rec.setValue('custbody_sl_so_custnum',cus_data.cus_num);//客户编号
                    }
                    if(cus_data.cus_dj){
                        rec.setValue('custbody_sl_socustr',cus_data.cus_dj);//客户等级
                    }
                    if(cus_data.cus_sort){
                        rec.setValue('custbody_sl_sopam',cus_data.cus_sort);//客户排名
                    }
                    if(cus_data.cus_cuntory){
                        rec.setValue('custbody_sl_so_custdiq',cus_data.cus_cuntory);//客户国家地区
                        rec.setValue('custbody_sl_sopeis',cus_data.cus_cuntory);//配送国家地区
                    }
                    if(cus_data.cus_email){
                        rec.setValue('custbody_sl_so_custemail',cus_data.cus_email);//客户邮箱
                    }
                    if(cus_data.address_arr.length > 0){
                        var data = cus_data.address_arr[0];
                        var str = "Country：" + data.country + '\n' + "Name：" +  data.attention + ' ' + data.addressee + '\n' + "Company：" +  data.companyname + '\n' + "Street：" +  data.addr1 + '\n' + "Street2：" + data.addr2 + '\n' + "City：" + data.city + '\n' + "Region：" + data.state + '\n' + "PostCode：" + data.zip + '\n';
                        //赋值
                        rec.setValue('custbody_sl_sozmmemo',str);
                        rec.setValue('custbody_sl_so_custdir',str);
                    }
                    if(cus_data.department){
                        rec.setValue('department',cus_data.department);//客户邮箱
                    }
                }
            }
            //条款信息
            if(fieldId == 'custbody_sl_spo_tiaokxx'){
                // var tikuan = getTiaokuan(rec.getValue(custbody_sl_spo_tiaokxx));
                if(rec.getValue("custbody_sl_spo_tiaokxx")){
                    rec.setValue('custbody_sl_tkxxxxxs',record.load({
                        type:'customrecord_sl_tiaokuanxxw',
                        id:rec.getValue("custbody_sl_spo_tiaokxx"),
                        isDynamic:true,
                    }).getValue('custrecord_sl_tkxxxx'));
                }
            }
            //银行信息
            if(fieldId == 'custbody_sl_spo_yhxx'){
                if(rec.getValue('custbody_sl_spo_yhxx')){
                    rec.setValue('custbody_sl_yhxxxxxs',record.load({type:'customrecord_sl_yhxxpzb',id:rec.getValue('custbody_sl_spo_yhxx'),isDynamic:true}).getValue('custrecord_sl_yhxxxx'));
                }
            }
            //运费
            // if(fieldId == 'custbody_sl_so_baoxf' || fieldId == 'custbody_sl_so_yunfei'){
            //     var yunfei = rec.getValue('custbody_sl_so_yunfei');
            //     var baoxian = rec.getValue('custbody_sl_so_baoxf');
            //     log.debug('yunfei baoxian',yunfei + '---' + baoxian);
            //     if(baoxian && yunfei){
            //         rec.setValue('custbody_sl_sotransportcharge',Number(yunfei) + Number(baoxian));//运费（含保险）
            //     }
            // }
            var old_sub_data = {
                "qty_sum" : 0,
                "weight_sum" : 0,
                "y_amount" : 0,
                "r_amount" : 0,
                "bx_amount" : 0,
                "yf_amount" : 0,
                "other_amount" : 0,
            };
            //赋值明细行折扣和原单价、数量
            if(fieldId == 'custcol_sl_ydj' || fieldId == 'quantity' || fieldId == 'custcol_sl_so_zheko'){
                doSublistZk(rec,sublistId,'zk',old_sub_data);
            }
            //有保险、运费或者折后小计就计算pp参考费、参考保险费
            if(fieldId == 'custbody_sl_spo_yunfheji' || fieldId == 'custbody_sl_spo_baoxheji' || fieldId == 'custbody_sl_sozheko'){
                var bxhj = rec.getValue('custbody_sl_spo_baoxheji');//保险合计
                var yfhj = rec.getValue('custbody_sl_spo_yunfheji');//运费合计
                var zhxj = rec.getValue('custbody_sl_soyuanj');//折后小计
                if(bxhj || yfhj || zhxj){
                    rec.setValue('custbody_sl_socankao',((Number(bxhj) + Number(yfhj) + Number(zhxj)) * 0.04).toFixed(4) || '0.00');//PP参考费
                }else{
                    rec.setValue('custbody_sl_socankao','0');
                }
                if(zhxj){
                    if(zhxj * 0.018 >= 10){
                        rec.setValue('custbody_sl_so_baoxf',(zhxj * 0.018).toFixed(2));//参考保险费
                    }else{
                        rec.setValue('custbody_sl_so_baoxf',10);//参考保险费
                    }
                }
            }
            //填写整单折扣计算折后小计等字段
            if(fieldId == 'custbody_sl_so_wonzhek'){
                doSublist(rec,'dobodyzhekou');
            }
            //总重量
            if(fieldId == 'custcol_sl_spo_danjianzl' || fieldId == 'quantity'){
                doSublistZk(rec,sublistId,'weight',old_sub_data);
            }
            //勾选清洁号产品
            if(fieldId == 'item'){
                doSublistZk(rec,sublistId,'qj',old_sub_data);
            }
            //提交行赋值总重量时启动
            // if(fieldId == 'custbody_sl_spo_zhozl'){
            //     var ret_sub_data = getSublist(rec,'item');
            //     log.debug('赋值总重量字段时返回的行总重量',ret_sub_data);
            //     if(ret_sub_data.weight_sum){
            //         rec.setValue({fieldId:'custbody_sl_spo_zhozl',value:ret_sub_data.weight_sum,ignoreFieldChange:true});
            //     }
            // }
            //改变配送国家地区、运输类型、是否偏远地区、总重量计算参考运费
            if(fieldId == 'custbody_sl_sopeis' || fieldId == 'custbody_sl_so_pyf' || fieldId == 'custbody_sl_spo_zhozl' || fieldId == 'custbody_sl_spo_transway'){
                if(rec.getValue('custbody_sl_sopeis') && rec.getValue('custbody_sl_spo_transway') && rec.getValue('custbody_sl_spo_zhozl')){
                    numericalCalculation.init(search,record);
                    ret = numericalCalculation.freightQuery({"custpage_transport_country":record.load({type:'customrecord_country_im',id:rec.getValue('custbody_sl_sopeis')}).getValue('custrecord_country_cn'),"custpage_transport_weight":rec.getValue('custbody_sl_spo_zhozl'),"custpage_remote_areas":rec.getValue('custbody_sl_so_pyf')});//FREIGHT_CALCULATION.js,
                    log.debug('调用函数返回值',ret);
                    if(ret){
                        for(var i = 0;i < ret.length;i++){
                            if(ret[i].shipping_type == rec.getValue('custbody_sl_spo_transway')){
                                rec.setValue('custbody_sl_so_yunfei',ret[i].transport_fee);//参考运费
                                break;
                            }
                            else{
                                rec.setValue('custbody_sl_so_yunfei',0);//参考运费
                            }
                        }
                    }
                }
            }
            //计算重量
        }
        function getTiaokuan(rec_id) {
            var tk = '';
            log.debug('rec_id',rec_id);
            if(rec_id){
                var rec = record.load({
                    type:'customrecord_sl_tiaokuanxxw',
                    id:rec_id,
                    isDynamic:true,
                });
                tk = rec.getValue('custrecord_sl_tkxxxx');
            }
            return {
                "note" : tk,
            };
        }
        function getCustomerSort(customer_id) {
            //  log.debug('customer_id',customer_id);
            if(customer_id){
                var address_arr = new Array();
                if(customer_id){
                    //客户地址信息
                    var rec = record.load({
                        type:'customer',
                        id:customer_id,
                        isDynamic:true
                    });
                    var companyname = rec.getValue('companyname');
                    var defaultaddress = rec.getValue('defaultaddress');
                    log.debug('defaultaddress',defaultaddress);
                    var addressbook_count = rec.getLineCount('addressbook');
                    for(var i = 0;i < addressbook_count;i++){
                        rec.selectLine('addressbook',i);
                        var defaultshipping = rec.getCurrentSublistValue({
                            sublistId:'addressbook',
                            fieldId:'defaultshipping',    //默认地址
                        });
                        if(defaultshipping == true){
                            var addr1 = rec.getCurrentSublistValue({
                                sublistId:'addressbook',
                                fieldId:'addr1_initialvalue'           //地址 1
                            });
                            var addr2 = rec.getCurrentSublistValue({
                                sublistId:'addressbook',
                                fieldId:'addr2_initialvalue'          //地址2
                            });
                            var addressee = rec.getCurrentSublistValue({
                                sublistId:'addressbook',
                                fieldId:'addressee_initialvalue'          //收件人
                            });
                            var attention = rec.getCurrentSublistValue({
                                sublistId:'addressbook',
                                fieldId:'attention_initialvalue'       //收件人
                            });
                            var city = rec.getCurrentSublistValue({
                                sublistId:'addressbook',
                                fieldId:'city_initialvalue'              //城市
                            });
                            var country = rec.getCurrentSublistValue({
                                sublistId:'addressbook',
                                fieldId:'country_initialvalue'               //国家
                            });
                            var state = rec.getCurrentSublistValue({
                                sublistId:'addressbook',
                                fieldId:'dropdownstate_initialvalue',   //省市区
                            });
                            var zip = rec.getCurrentSublistValue({
                                sublistId:'addressbook',
                                fieldId:'zip_initialvalue'               //zip
                            });
                            var phone = rec.getCurrentSublistValue({
                                sublistId:'addressbook',
                                fieldId:'phone_initialvalue',
                            });
                            address_arr.push({
                                "country":country,
                                "addressee":addressee,
                                "attention":attention,
                                "companyname":companyname,
                                "phone":phone,
                                "addr1":addr1,
                                "addr2":addr2,
                                "city":city,
                                "state":state,
                                "zip":zip,
                            })
                        }
                    }
                }
                //获取客户排名信息
                var mysearch = search.create({
                    type:'customrecord_sl_customer_all',
                    filters:[
                        ['custrecord_sl_customer','anyof',customer_id],
                        'AND',['isinactive','is',false],
                    ],
                    columns:[
                        'custrecord_sl_customer_num','custrecord_sl_customer_dj','custrecord_sl_customer_sort',
                        {name:'custentity_sl_country',join:'custrecord_sl_customer'},
                        {name:'email',join:'custrecord_sl_customer'},
                    ]
                });
                var res = mysearch.run().getRange(0,1);
                var col = mysearch.columns;
                if(res.length > 0){
                    return {
                        "cus_num":rec.getValue('entityid'),
                        "cus_dj":res[0].getValue(col[1]),
                        "cus_sort":res[0].getValue(col[2]),
                        "cus_cuntory":res[0].getValue(col[3]),
                        "cus_email":res[0].getValue(col[4]),
                        "department" : rec.getValue('custentity_department1'),
                        "address_arr":address_arr,
                    }
                }
                return {
                    "cus_num":'',
                    "cus_dj":'',
                    "cus_sort":'',
                    "cus_cuntory":'',
                    "cus_email":'',
                    "address_arr":address_arr,
                }
            }
        }
        function doSublistZk(rec,sublistId,flag,old_data) {
            var ret = new Array();
            var y_amount_sum = old_data.y_amount;
            var r_amount_sum = old_data.r_amount;
            var r_weight_sum = old_data.weight_sum;
            var bx_amount = old_data.bx_amount;
            var yf_amount = old_data.yf_amount;
            var other_amount = old_data.other_amount;
            var amount = rec.getCurrentSublistValue({
                sublistId:sublistId,
                fieldId:'amount'
            });
            var qty = rec.getCurrentSublistValue({
                sublistId:sublistId,
                fieldId:'quantity'
            });
            var rate = rec.getCurrentSublistValue({
                sublistId:sublistId,
                fieldId:'rate'
            });
            var y_rate = rec.getCurrentSublistValue({
                sublistId:sublistId,
                fieldId:'custcol_sl_ydj'
            })
            var each_weight = rec.getCurrentSublistValue({
                sublistId:sublistId,
                fieldId:'custcol_sl_spo_danjianzl'
            });
            var item = rec.getCurrentSublistValue({
                sublistId:'item',
                fieldId:'item'
            });
            var item_flag = checkInventoryitem(item);
            log.debug('item_flag',item_flag);
            if(flag == 'zk'){
                if(item_flag == 'Y_1' || item_flag == 'Y_2' || item_flag == 'N' || item_flag == 'N_134' || item_flag == 'N_139'){
                    var zhekou = rec.getCurrentSublistValue({         //
                        sublistId:sublistId,
                        fieldId:'custcol_sl_so_zheko',  ///折扣
                    });
                    if(!zhekou || zhekou == null || zhekou == ''){
                        zhekou = Number(0);
                    }
                    if(zhekou != 0){
                        //当前货品行赋值
                        rec.setCurrentSublistValue({
                            sublistId:sublistId,
                            fieldId:'custcol_sl_so_zheko',  ///折扣
                            value:zhekou,
                            ignoreFieldChange:true,
                        });
                        log.debug('field rate',y_rate * (100 - zhekou) / 100);
                        rec.setCurrentSublistValue({
                            sublistId:sublistId,
                            fieldId:'rate',  ///单价
                            value:y_rate * (100 - zhekou) / 100 || 0.00,
                        });
                        rec.setCurrentSublistValue({
                            sublistId:sublistId,
                            fieldId:'custcol_sl_zkje',  //折扣金额
                            value:((zhekou / 100) * Number(qty) * Number(y_rate)).toFixed(4) || 0.00
                        })
                        rec.setCurrentSublistValue({
                            sublistId:sublistId,
                            fieldId:'custcol_sl_so_zheho',   ///折后价
                            value:(Number(qty) * Number(y_rate) * ( (100 - zhekou)/100)).toFixed(4) || 0.00,
                            ignoreFieldChange:true,
                        });
                        rec.setCurrentSublistValue({
                            sublistId:sublistId,
                            fieldId:'amount',   ///不含税合计金额
                            value:(Number(qty) * Number(y_rate) * ((100 - zhekou) / 100)).toFixed(4) || 0.00,
                            ignoreFieldChange:true,
                        });
                        rec.setCurrentSublistValue({
                            sublistId:sublistId,
                            fieldId:'grossamt',          //总金额
                            value:(Number(qty) * Number(y_rate) * ((100 - zhekou) / 100)).toFixed(4) || 0.00,
                            ignoreFieldChange:true,
                        });
                        if(item_flag == 'Y_1'){
                            rec.setCurrentSublistValue({
                                sublistId:sublistId,
                                fieldId:'custcol_y_so_qjh',          //清洁号产品
                                value:false,
                                ignoreFieldChange:true,
                            });
                        }
                        else if(item_flag == 'Y_2'){
                            rec.setCurrentSublistValue({
                                sublistId:sublistId,
                                fieldId:'custcol_y_so_qjh',          //清洁号产品
                                value:true,
                                ignoreFieldChange:true,
                            });
                        }
                        // if(item_flag == 'N'){
                        //     rec.setValue('custbody_sl_spo_qitfeiyheji',Number(other_amount) + Number(rate) * Number(qty));//其他费用
                        // }
                        // else if(item_flag == 'N_134'){
                        //     rec.setValue('custbody_sl_spo_baoxheji',Number(bx_amount) + Number(qty) * Number(rate));//保险费
                        // }
                        // else if(item_flag == 'N_139'){
                        //     rec.setValue('custbody_sl_spo_yunfheji',Number(yf_amount) + Number(rate) * Number(qty));//运费
                        // }
                    }
                    else {
                        if(y_rate){
                            //当前货品行赋值
                            rec.setCurrentSublistValue({
                                sublistId:sublistId,
                                fieldId:'rate',  ///单价
                                value:y_rate.toFixed(4) || 0.00,
                            });
                            rec.setCurrentSublistValue({
                                sublistId:sublistId,
                                fieldId:'custcol_sl_zkje',  //折扣金额
                                value:0
                            })
                            rec.setCurrentSublistValue({
                                sublistId:sublistId,
                                fieldId:'custcol_sl_so_zheho',   ///折后价
                                value:y_rate,
                                ignoreFieldChange:true,
                            });
                            rec.setCurrentSublistValue({
                                sublistId:sublistId,
                                fieldId:'amount',   ///不含税合计金额
                                value:(Number(qty) * Number(y_rate)).toFixed(4) || 0.00,
                                ignoreFieldChange:true,
                            });
                            rec.setCurrentSublistValue({
                                sublistId:sublistId,
                                fieldId:'grossamt',          //总金额
                                value:(Number(qty) * Number(y_rate)).toFixed(4) || 0.00,
                                ignoreFieldChange:true,
                            });
                            if(item_flag == 'Y_1'){
                                rec.setCurrentSublistValue({
                                    sublistId:sublistId,
                                    fieldId:'custcol_y_so_qjh',          //清洁号产品
                                    value:false,
                                    ignoreFieldChange:true,
                                });
                            }
                            else if(item_flag == 'Y_2'){
                                rec.setCurrentSublistValue({
                                    sublistId:sublistId,
                                    fieldId:'custcol_y_so_qjh',          //清洁号产品
                                    value:true,
                                    ignoreFieldChange:true,
                                });
                            }
                        }
                    }
                }
            }
            else if(flag == 'qj'){
                if(item_flag == 'Y_1'){
                    rec.setCurrentSublistValue({
                        sublistId:sublistId,
                        fieldId:'custcol_y_so_qjh',          //清洁号产品
                        value:false,
                        ignoreFieldChange:true,
                    });
                }
                else if(item_flag == 'Y_2'){
                    rec.setCurrentSublistValue({
                        sublistId:sublistId,
                        fieldId:'custcol_y_so_qjh',          //清洁号产品
                        value:true,
                        ignoreFieldChange:true,
                    });
                }
            }
            else if(flag == 'weight'){
                if(qty && each_weight){
                    log.debug('qty each_weight',qty + '---' + each_weight);
                    rec.setCurrentSublistValue({
                        sublistId:sublistId,
                        fieldId:'custcol_sl_spo_zhlxj',//重量合计
                        value:(Number(qty) * Number(each_weight)).toFixed(2),
                        ignoreFieldChange:true,
                    });
                }
            }
        }
        function checkInventoryitem(item){
            if(item){
                var mysearch = search.create({
                    type:'inventoryitem',
                    filters:[
                        ['internalid','is',item]
                    ],
                    columns:[
                        'custitem3',
                    ]
                });
                var res = mysearch.run().getRange(0,100);
                if(res.length > 0){
                    var sx = res[0].getValue('custitem3');
                    log.debug('sx',sx);
                    var index = sx.indexOf('9');//9 清洁号
                    if(index == -1){
                        return 'Y_1';
                    }
                    else {
                        return 'Y_2';
                    }
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
        function postSourcing(context) {

        }
        function lineInit(context) {

        }
        function validateDelete(context) {

        }
        function validateInsert(context) {

        }
        function validateLine(context) {
            var rec = context.currentRecord;
            var sublistId = context.sublistId;
            var one_line_weight = Number(0);
            if(sublistId == 'item'){
                var qty = rec.getCurrentSublistValue({
                    sublistId:sublistId,
                    fieldId:'quantity',
                });
                var each_weight = rec.getCurrentSublistValue({
                    sublistId:sublistId,
                    fieldId:'custcol_sl_spo_danjianzl',
                });
                if(qty && each_weight){
                    one_line_weight = Number(qty) * Number(each_weight);
                    rec.setCurrentSublistValue({
                        sublistId:sublistId,
                        fieldId:'custcol_sl_spo_zhlxj',
                        value:one_line_weight,
                        ignoreFieldChange:true,
                    });
                }
                log.debug('one_line_weight',one_line_weight);
                // var sub_data = getSublist(rec,sublistId);       //TODO：获取之前已提交的行会无限循环
                // var sub_data = {"weight_sum":0}
                log.debug('sub_data',sub_data);
                log.debug('weight_sum',sub_data.weight_sum);
                rec.setValue('custbody_sl_spo_zhozl',Number(one_line_weight));//总重量

                return true;
            }
        }
        function sublistChanged(context) {
            var rec = context.currentRecord;
            var sublistId = context.sublistId;
            var line = context.line;
            log.debug('sublistline',line);
            log.debug('sublistId',sublistId);
            var zheho_sum = Number(0);
            var amount_sum = Number(0);
            if(sublistId == 'item'){
                // doSublist(rec,'sublistChanged');
                var zhekou = rec.getValue('custbody_sl_so_wonzhek');
                if(!zhekou || zhekou == null || zhekou == ''){
                    zhekou = 100;
                }
                if(zhekou){
                    var count = rec.getLineCount('item');
                    log.debug('sublist count',count);
                    for(var i = 0;i < count;i++){          //TODO：在sublistChange里面统计多行数据不能用getCurrentSublistValue
                        var zheho_amount = rec.getSublistValue({
                            sublistId:'item',
                            fieldId:'custcol_sl_so_zheho',
                            line:i,
                        });
                        var amount_1 = rec.getSublistValue({
                            sublistId:'item',
                            fieldId:'amount',
                            line:i,
                        });
                        var qty = rec.getSublistValue({
                            sublistId:'item',
                            fieldId:'quantity',
                            line:i,
                        });
                        var rate = rec.getSublistValue({
                            sublistId:'item',
                            fieldId:'rate',
                            line:i,
                        });
                        var y_rate = rec.getSublistValue({
                            sublistId:'item',
                            fieldId:'custcol_sl_ydj',
                            line:i,
                        });
                        log.debug('rate qty',rate + '---' + qty);
                        zheho_amount = Number(qty) * Number(y_rate) * Number(zhekou)/100;
                        zheho_sum += Number(zheho_amount);
                        amount_sum += Number(amount_1);
                    }
                    log.debug('zheho_sum amount_sum',zheho_sum + '---' + amount_sum);
                    if(zheho_sum || amount_sum){
                        rec.setValue('custbody_sl_sozheko',amount_sum.toFixed(4) || '0.00');//折后小计
                        rec.setValue('custbody_sl_soyuanj',zheho_sum.toFixed(4) || '0.00');//原价小计
                    }
                    else{
                        rec.setValue('custbody_sl_sozheko','0.00');//折后小计
                        rec.setValue('custbody_sl_soyuanj','0.00');//原价小计
                    }
                }
            }
        }
        function doSublist(rec,flag) {
            var zheho_sum = Number(0);
            var amount_sum = Number(0);
            var qty;
            var rate;
            var y_rate;
            var zhekou = rec.getValue('custbody_sl_so_wonzhek');
            if(!zhekou || zhekou == null || zhekou == ''){
                zhekou = Number(0);
            }
            var count = rec.getLineCount('item');
            log.debug('sublist count',count);
            for(var i = 0;i < count;i++){
                rec.selectLine('item',i);
                var item = rec.getCurrentSublistValue({
                    sublistId:'item',
                    fieldId:'item',
                });
                // var if_iv = checkInventoryitem(item);
                // log.debug('if_iv',if_iv);
                var if_iv = 'Y';
                // if(if_iv == 'Y_1' || if_iv == 'Y_2'){
                if(if_iv == 'Y'){
                    qty = rec.getCurrentSublistValue({
                        sublistId:'item',
                        fieldId:'quantity',
                        // line:i,
                    });
                    rate = rec.getCurrentSublistValue({
                        sublistId:'item',
                        fieldId:'rate',
                        // line:i,
                    });
                    y_rate = rec.getCurrentSublistValue({
                        sublistId:'item',
                        fieldId:"custcol_sl_ydj",
                    });
                    //更改折扣时更新所有货品行
                    if(flag == 'dobodyzhekou'){
                        rec.setCurrentSublistValue({
                            sublistId:'item',
                            fieldId:'custcol_sl_so_zheko',
                            value:zhekou,
                            // ignoreFieldChange:true,
                        });
                        rec.setCurrentSublistValue({
                            sublistId:'item',
                            fieldId:'custcol_sl_so_zheho',
                            value:(Number(qty) * Number(y_rate) * ( 1 - zhekou/100)).toFixed(4),
                            ignoreFieldChange:true,
                        });
                        rec.setCurrentSublistValue({
                            sublistId:'item',
                            fieldId:'custcol_sl_zkje',//折扣金额
                            value:(Number(qty) * Number(y_rate) * Number(zhekou)/100).toFixed(4),
                            ignoreFieldChange:true,
                        });
                    }
                }
            }
        }
        return {
            pageInit: pageInit,
            fieldChanged: fieldChanged,
            // postSourcing: postSourcing,
            // sublistChanged: sublistChanged,
            // lineInit: lineInit,
            // validateField: validateField,
            // validateLine: validateLine,
            // validateInsert: validateInsert,
            // validateDelete: validateDelete,
            saveRecord: saveRecord
        };
    });