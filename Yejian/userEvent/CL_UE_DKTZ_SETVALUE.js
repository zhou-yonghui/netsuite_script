/**
 * 到款通知单赋值
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define(['N/record','N/search','N/format','N/runtime','N/ui/serverWidget','N/currency'],
    function(record,search,format,runtime,serverWidget,nsCurrency) {
        function beforeLoad(context) {
            var rec = context.newRecord;
            var form = context.form;
            var status = rec.getValue('custrecord_sl_dkzt');//状态，已认领：4
            var dd_check = rec.getValue('custrecord_sl_daid');
            var script_do = rec.getValue('custrecord_cl_script_do');//脚本执行中
            log.debug('status dd_check',status + '---' + dd_check);
            if(context.type == 'view'){
                if(status == 2 || status == 3){  //待认领 ,待定
                    form.clientScriptFileId = 192;
                    if(status == 2){
                        //待认领
                        form.addButton({
                            id:'custpage_dd',
                            label:'待定',
                            functionName:'toDktzDd('+ rec.id +')',
                        });
                    }
                    if(dd_check == true && status == 2){
                        log.debug('不显示认领按钮');
                    }
                    else {
                        if(script_do == false){
                            //认领
                            form.addButton({
                                id:'custpage_rl',
                                label:'确认认领',
                                functionName:'toRl('+ rec.id +')',
                            });
                        }
                    }
                }
            }
        }
        function beforeSubmit(context) {

        }
        function getDayExchangerate(one_currency,two_currency,dk_date) {
            //
            log.debug('dk_date',dk_date);
            if(one_currency && two_currency){
                var one_rate = Number(1);
                var two_rate = Number(1);
                if(one_currency != 1){//CNY
                    var mysearch = search.create({
                        type:'customrecord_real_time_exchange_rate',
                        filters:[
                            ['custrecord_rte_rate_currency','is',one_currency],
                            'AND',['custrecord_latest_date','on',dk_date],
                        ],
                        columns:[
                            'custrecord_rte_rates',
                        ]
                    });
                    var res = mysearch.run().getRange(0,1);
                    if(res.length > 0){
                        one_rate = res[0].getValue('custrecord_rte_rates');
                        log.debug('one_rate',one_rate);
                    }
                }
                if(two_currency){
                    var mysearch_usd = search.create({
                        type:'customrecord_real_time_exchange_rate',
                        filters:[
                            ['custrecord_rte_rate_currency','is',two_currency],
                            'AND',['custrecord_latest_date','on',dk_date],
                        ],
                        columns:[
                            'custrecord_rte_rates'
                        ]
                    });
                    var res_usd = mysearch_usd.run().getRange(0,1);
                    if(res_usd.length > 0){
                        two_rate = res_usd[0].getValue('custrecord_rte_rates');
                        log.debug('two_rate',two_rate);
                    }
                }
                log.debug('huilv',Number(one_rate)/Number(two_rate));
                return Number(one_rate)/Number(two_rate);
            }
        }
        function getPayType(pay_type){
            if(pay_type){
                var rec = record.load({
                    type:'customrecord_sl_glfkfs',
                    id:pay_type,
                    isDynamic:true,
                });
                return {
                    "sy" : Number(rec.getValue('custrecord_sl_hdsybl'))/100,
                }
            }
        }
        function getDk(s_code){
            var number;
            var mysearch = search.create({
                type:'customrecord_sl_dktz_list',
                filters:[
                    // ['created','on',['today']]
                    ["custrecord_sl_dkbh",'contains',s_code]
                ],
                columns:[
                    {name:'internalid',sort:search.Sort.ASC},
                    {name:'custrecord_sl_dkbh'}
                ]
            });
            var res = mysearch.run().getRange(0,1000);
            log.debug('当月新建通知单条数',res.length);
            log.debug('当月新建通知单',JSON.stringify(res));
            if(res.length > 0){
                number  = Number(res.length) + Number(1);
                if(number < 10){
                    number = '0' + number;
                }
                //TODO:编号去重判断
                var flag = 'Y';
                for(var i = 0;i < res.length;i++){
                    if(res[i].getValue('custrecord_sl_dkbh') == s_code + number){
                        flag = 'N';
                        break;
                    }
                }
                log.debug('flag',flag);
                if(flag == 'N'){
                    log.debug('最大编号',res[res.length - 1].getValue('custrecord_sl_dkbh'));
                    //在最大的编号上加一
                    var old_code = res[res.length - 1].getValue('custrecord_sl_dkbh');
                    var old_all_num = old_code.substring(9,res.length);
                    log.debug('数量',old_all_num);
                    // var old_num = old_code.substring(9,10);
                    var old_num_1 = Math.abs(old_all_num) + Number(1);
                    if(old_num_1 < 10){
                        number = '0' + old_num_1;
                    }
                    else{
                        number = old_num_1;
                    }
                }
            }
            else{
                number = '01';
            }
            var code = s_code + number;
            return {
                'code':code,
            }
        }
        function afterSubmit(context) {
            try{
                if(context.type == 'create' || context.type == 'edit'){
                    var rec = record.load({type:'customrecord_sl_dktz_list',id:context.newRecord.id,isDynamic: true});
                    var refund_amount = rec.getValue('custrecord_sl_tkje');//退款金额
                    var dk_amount = rec.getValue('custrecord_sl_dkje');//到款金额
                    var dk_cur = rec.getValue('custrecord_sl_dktz_bz');//到款币种
                    var pay_type = rec.getValue('custrecord_sl_fkfs');//付款方式
                    var sg_set_rate = rec.getValue('custrecord_manual_modification');//手工修改汇率
                    var dk_date = rec.getText('custrecord19');//到款时间
                    var status = rec.getValue('custrecord_sl_dkzt');//状态，已认领：4
                    if(context.type == 'create' || !rec.getValue('custrecord_sl_dkbh')){
                        var bj_date = new Date(new Date().getTime()+(parseInt(new Date().getTimezoneOffset()/60) + 8)*3600*1000);
                        var year = bj_date.getFullYear();
                        var month = Number(bj_date.getMonth()) + Number(1);
                        if(Number(month) < 10){
                            month = '0' + month;
                        }
                        var s_code = 'PN' + year + month;
                        log.debug('s_code',s_code);
                        if(s_code){
                            var number_data = getDk(s_code);
                            log.debug('number_code',number_data);
                            //到款编号
                            rec.setValue('custrecord_sl_dkbh',number_data.code);
                        }
                    }
                    //计算到款净美元
                    var j_amount = Number(0);
                    if(refund_amount){
                        j_amount = Number(dk_amount) - Number(refund_amount);
                    }
                    else {
                        j_amount = Number(dk_amount);
                    }
                    //到款币种与美元的汇率
                    if(sg_set_rate == true){
                        var sg_rate = rec.getValue('custrecord_dktz_exchange_rate');
                        if(sg_rate){
                            rec.setValue('custrecord_sl_dkmj',(Number(j_amount) / Number(sg_rate)).toFixed(2));//到款（净|美元）
                        }
                    }
                    else {
                        if(dk_cur != 2){
                            var rate = getDayExchangerate(2,dk_cur,dk_date);//2：USD
                            log.debug('汇率表汇率',rate);
                            var sy_data = getPayType(pay_type);//汇率损益比例
                            log.debug('sy_data',sy_data);
                            if(sy_data){
                                log.debug('含汇兑损益比例 j_amount',rate + '---' + j_amount);
                                rec.setValue('custrecord_dktz_exchange_rate',(rate * (1 + sy_data.sy)).toFixed(4));//汇率（含汇兑损益比例）
                                rec.setValue('custrecord_sl_dkmj',(Number(j_amount) / Number(rate * (1 + sy_data.sy))).toFixed(2));//到款（净|美元）
                            }
                            else {
                                log.debug('n 含汇兑损益比例 j_amount',rate + '---' + j_amount);
                                rec.setValue('custrecord_dktz_exchange_rate',rate);//汇率（含汇兑损益比例）
                                rec.setValue('custrecord_sl_dkmj',(Number(j_amount) / Number(rate)).toFixed(2));//到款（净|美元）
                            }
                        }
                        else {
                            rec.setValue('custrecord_dktz_exchange_rate',1);//汇率（含汇兑损益比例）
                            rec.setValue('custrecord_sl_dkmj',Number(j_amount).toFixed(2));//到款（净|美元）
                        }
                    }
                    rec.save({ignoreMandatoryFields:true});
                }
            }catch (e){
                log.debug('after',e);
            }
        }
        function submitGh(rec) {
            if(g_id){
                record.submitFields({
                    type:'customrecord_sl_dktz_list',
                    id:rec.id,
                    values:{
                        custrecord_purchase_settlement:g_id,//购汇单
                    }
                });
            }
        }

        return {
            beforeLoad: beforeLoad,
            // beforeSubmit: beforeSubmit,
            afterSubmit: afterSubmit
        };
    });
