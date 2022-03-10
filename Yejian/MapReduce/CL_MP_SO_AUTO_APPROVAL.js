/**
 * 普通未进行财务审批的销售订单定时自动审批
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 */
define(
    ['N/search', 'N/record', 'N/task','N/file','N/runtime','N/format'],
    function(search, record, task,file,runtime,format) {
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
            while (results.length > 0 && j < 100) {
                for (var i = 0; i < results.length; i++) {
                    var result = results[i];
                    var tmp = new Object();
                    tmp.id = result.id;
                    // tmp.type = result.getValue('type');
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
            log.debug('初始化map点数',runtime.getCurrentScript().getRemainingUsage());
            var value = JSON.parse(context.value);
            var outInfo = '审核结果：';
            var bx_sum = Number(0);
            var yf_sum = Number(0);
            var pp_sum = Number(0);
            var approval_flag = 'Y';
            try {
                var go_flag = 'Y';
                var soRec = record.load({
                    type:'salesorder',
                    id:value.id,
                    isDynamic:true,
                });
                var count = soRec.getLineCount('item');
                for(var i = 0;i < count;i++){
                    var sku = soRec.getSublistValue({
                        sublistId:'item',
                        fieldId:'item',
                        line:i,
                    });
                    var amount = soRec.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'amount',
                        line:i,
                    })
                    var item_info = findIitemClass(sku);
                    if(item_info.flag == 'xfitem'){
                        outInfo = '明细行存在消费品，请检查';
                        go_flag = 'N';
                        break;
                    }else if(item_info.flag == 'otherchargeitem'){
                        var other = otherchargeitem(sku);
                        if(other.name.indexOf('保险') != -1){
                            bx_sum += Number(amount);
                        }
                        else if(other.name.indexOf('运费') != -1){
                            yf_sum += Number(amount);
                        }
                        else if(other.name.indexOf('paypal') != -1){
                            pp_sum += Number(amount);
                        }
                    }
                }
                log.debug('go_flag',go_flag);
                var web_order_flag = soRec.getValue('custbody_sl_so_wd');//网单标记
                if(go_flag == 'Y'){
                    var wdbaoxian = Number(soRec.getValue('custbody_sl_so_wdbaox'));//网单保险费
                    var wdyunfei = Number(soRec.getValue('custbody_sl_so_wdyf'));//网单运费
                    var wdpay = Number(soRec.getValue('custbody_sl_so_fypapal'));//网单 paypal 费
                    var dk_amount = Number(soRec.getValue('custbody_sl_soamm'));//回款金额
                    var total = Number(soRec.getValue('total'));//总计
                    var if_pianyuan = soRec.getValue('custbody_sl_so_pyf');//是否偏远地区
                    var jy_baoxian = soRec.getValue('custbody_sl_sojiany');//建议保险
                    var bx_xuanxiang = soRec.getValue('custbody_sl_so_baox');//保险选项
                    //网单
                    if(web_order_flag == true){
                        if(Number(bx_sum) == 0){
                            //没有保险费时
                            if(Number(bx_sum) == Number(wdbaoxian) && Number(yf_sum) == Number(wdyunfei) && Number(pp_sum) == Number(wdpay) && Number(dk_amount) >= Number(total) && Number(dk_amount) <= 500 && if_pianyuan == false){
                                approval_flag = 'Y';
                            }else {
                                approval_flag = 'N';
                                outInfo += '请检查没有保险情况下的条件是否符合';
                            }
                        }else {
                            //有保险费时
                            if(jy_baoxian == bx_xuanxiang && Number(bx_sum) == Number(wdbaoxian) && Number(yf_sum) == Number(wdyunfei) && Number(pp_sum) == Number(wdpay) && Number(dk_amount) >= Number(total) && Number(dk_amount) <= 500 && if_pianyuan == false){
                                approval_flag = 'Y';
                            }else {
                                approval_flag = 'N';
                                outInfo += '请检查有保险情况下的条件是否符合';
                            }
                        }
                    }
                    //非网单
                    else {
                        var yf_ck = Number(soRec.getValue('custbody_sl_so_yunfei'));//参考运费
                        var pp_ck = Number(soRec.getValue('custbody_sl_socankao'));//pp参考费
                        var dk_type = soRec.getValue('custbody_difference_type');//1,作为余额   2，作为效益
                        var diff_amount = total - dk_amount;
                        var diff_amount_abs = Math.abs(diff_amount);
                        var dk_flag = 'Y';
                        var other_flag = 'Y';
                        if(diff_amount == 0){
                            if(if_pianyuan == false && yf_sum >= yf_ck * 0.9 && bx_sum == 0 && pp_sum == pp_ck){
                                other_flag = 'Y';
                                approval_flag = 'Y';
                            }else if(if_pianyuan == false && yf_sum >= yf_ck * 0.9 && bx_sum > 0 && bx_xuanxiang == jy_baoxian && pp_sum == pp_ck){
                                other_flag = 'Y';
                                approval_flag = 'Y';
                            }else {
                                other_flag = 'N';
                                approval_flag = 'N';
                                outInfo += '请检查到款金额与订单金额没差额的条件是否满足';
                            }
                        }else {
                            if(dk_amount <= 2000){
                                if(diff_amount_abs <= 25){
                                    dk_flag = 'Y';
                                }
                                else {
                                    dk_flag = 'N';
                                    outInfo += '到款<=2000，差额>25';
                                }
                            }else if(dk_amount > 2000 && dk_amount <= 5000){
                                if(dk_amount * 0.01 <= 30){
                                    if(diff_amount_abs <= dk_amount * 0.01){
                                        dk_flag = 'Y';
                                    }else {
                                        dk_flag = 'N';
                                        outInfo += '到款在2000至5000之间,差额有问题';
                                    }
                                }else {
                                    if(diff_amount_abs <= 30){
                                        dk_flag = 'Y';
                                    }else {
                                        dk_flag = 'N';
                                        outInfo += '到款在2000至5000之间,差额有问题';
                                    }
                                }
                            }else if(dk_amount > 5000){
                                dk_flag = 'N';
                                approval_flag = 'N';
                                outInfo += '到款金额超过5000';
                            }
                            //之前条件都符合之后
                            if(dk_flag == 'Y'){
                                //超款
                                if(diff_amount < 0){
                                    if(diff_amount_abs <= 30 && dk_type == 2){
                                        approval_flag = 'Y';
                                    }else {
                                        approval_flag = 'N';
                                        outInfo += '请检查超款条件是否符合';
                                    }
                                }else {
                                    approval_flag = 'Y';
                                }
                            }else {
                                approval_flag = 'N';
                            }
                        }
                    }
                    log.debug('approval_flag',approval_flag);
                    //最后提交审核结果到销售订单
                    if(approval_flag == 'Y'){
                        outInfo += '自动审核通过'
                        returnToSoApprovalInfo(value.id,outInfo,approval_flag);
                        log.debug('订单：' + value.id + '审核通过');
                    }else if(approval_flag == 'N'){
                        outInfo += '自动审核失败';
                        returnToSoApprovalInfo(value.id,outInfo,approval_flag);
                        log.debug('订单：' + value.id + '审核失败');
                    }
                }else {
                    //存在消费品返回信息
                    if(outInfo != '' || outInfo != null){
                        outInfo = '明细行中存在消费品';
                        returnToSoApprovalInfo(value.id,outInfo,'one');
                    }
                }
            } catch (e) {
                log.error({
                    title: 'netsuite error:' + value.id,
                    details: e.message + ',' + e.stack
                });
                outInfo = e;
                returnToSoApprovalInfo(value.id,outInfo,'one');
            }
        }
        function returnToSoApprovalInfo(soId,outInfo,flag){
            if(soId){
                if(flag == 'one'){
                    record.submitFields({
                        type:'salesorder',
                        id:soId,
                        values:{
                            custbody_auto_approve_comments:outInfo,
                        }
                    });
                }else {
                    if(flag == 'Y'){
                        record.submitFields({
                            type:'salesorder',
                            id:soId,
                            values:{
                                custbody_auto_approve_comments:outInfo,
                                custbody_approval_status:5,     //审核通过
                                orderstatus:'B',                //订单状态
                            }
                        });
                    }else if(flag == 'N'){
                        record.submitFields({
                            type:'salesorder',
                            id:soId,
                            values:{
                                custbody_auto_approve_comments:outInfo,
                            }
                        });
                    }
                }
            }
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
            }else if(check_item.type == 'otherchargeitem'){
                item_info.flag = 'otherchargeitem';
            }
            return item_info;
        }
        function otherchargeitem(sku) {
            if(sku){
                var mysearch = search.create({
                    type:'otherchargeitem',
                    filters:[
                        ['internalid','is',sku],
                        'AND',['isinactive','is',false],
                    ],
                    columns:[
                        'itemid',
                    ]
                });
                var res = mysearch.run().getRange(0,1);
                if(res.length > 0){
                    return {
                        "type":'otherchargeitem',
                        "name": res[0].getValue('itemid'),
                    };
                }
                else{
                    return 'item';
                }
            }
        }
        function reduce(context) {
            log.debug({
                title: 'context',
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
            var mySearch = search.load({id:'customsearch_pending_financial_review_so'});//待财务审核销售订单
            log.debug({
                title: 'mySearch',
                details: mySearch
            })
            return mySearch;
        }
        return {
            getInputData: getInputData,
            map: map,
            reduce: reduce,
            summarize: summarize
        };
    });