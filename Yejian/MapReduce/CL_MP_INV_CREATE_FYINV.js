/**
 * 到款通知根据全额收款的发票生成费用发票
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
            try {
                var rec = record.load({type : 'invoice',id : value.id,isDynamic:true});
                var createdfrom_t = rec.getText('createdfrom');
                log.debug('创建自',createdfrom_t);
                if(createdfrom_t.indexOf('SO') != -1){
                    var so_id = rec.getValue('createdfrom');
                    if(so_id){
                        var soRec = record.load({
                            type:'salesorder',
                            id:so_id,
                            isDynamic:true,
                        });
                        var so_data = getSo(so_id);
                        log.debug('so_data',so_data);
                        if(so_data != 'null'){
                            if(so_data.hk_sum_amount != 0 || so_data.hk_sum_amount != null || so_data.hk_sum_amount != ' '){
                                doSome(so_id,so_data,value);
                            }
                        }
                    }
                }
            } catch (e) {
                log.error({
                    title: 'netsuite error:' + value.id,
                    details: e.message + ',' + e.stack
                });
            }
        }
        function getSo(so_id) {
            if(so_id){
                var rec = record.load({
                    type:'salesorder',
                    id:so_id,
                    isDynamic:true,
                });
                return{
                    "currency":rec.getValue('currency'),
                    "department":rec.getValue('department'),
                    "location":rec.getValue('location'),
                    "class":rec.getValue('class'),
                    "entity":rec.getValue('entity'),
                    "baojiadan":rec.getValue('custbody_sl_bbaojiadan'), //报价单号
                    "wd_num":rec.getValue('custbody_sl_so_innumber'),   //网单号
                    "pay_type":rec.getValue('custbody_sl_sopayway'),     //付款方式
                    "total":rec.getValue('total'),          //总计
                    "hk_sum_amount":rec.getValue('custbody_sl_soamm'),      //回款金额
                    "ce_type":rec.getText('custbody_difference_type'),   //差额类型
                }
            }
            else{
                return 'null';
            }
        }
        function doSome(so_id,so_data,value) {
            var so_inv_id = value.id;
            var ce_amount = Number(0);
            var so_hk_amount = so_data.hk_sum_amount;//销售到款净金额
            var so_total_zmount = so_data.total;//销售订单总额
            var inv_arr = new Array();
            if(!so_hk_amount){
                so_hk_amount = Number(0);
            }
            //判断差额,回款金额小于销售金额，是否<=配置表的“自动核销判断差额（30USD）”，销售订单默认是USD币种；如果是，先创建贷项，再贷项勾选应用发票核销
            log.debug('so_hk_amount so_total_zmount',so_hk_amount+ '--- ' + so_total_zmount);
            //回款金额大于订单金额
            if(Number(so_hk_amount) > Number(so_total_zmount)){
                //差额类型为空
                if(so_data.ce_type == null || so_data.ce_type == ''){
                    if(Number(so_hk_amount) - Number(so_total_zmount) < 30){
                        ce_amount = Number(so_hk_amount) - Number(so_total_zmount);
                        var inv_id = createFyInvoice(so_data,so_id,ce_amount,so_inv_id);
                        log.debug('差额为空 fy inv_id',inv_id);
                        if(inv_id){
                            submitFyidToSoinv(inv_id,so_inv_id);
                            // inv_arr.push(inv_id);
                            //先通过搜索找到销售订单下的所有未核销发票
                            var cd_search = search.load('customsearch_customer_deposit');//客户存款单未核销
                            var cd_col = cd_search.columns;
                            var cd_res = cd_search.run().getRange(0,1000);
                            if(cd_res.length > 0){
                                for(var i = 0;i < cd_res.length;i++){
                                    if(so_id == cd_res[i].getValue(cd_col[0])){
                                        //核销每个客户存款
                                        var c_id = cd_res[i].id;
                                        log.debug('客户存款id',c_id);
                                        var ret = hxInvoice(c_id,inv_id);
                                        log.debug('存款应用程序id',ret);
                                    }
                                }
                            }
                        }
                    }
                }
                else if(so_data.ce_type == '作为余额'){

                }
                else if(so_data.ce_type == '作为效益'){
                    ce_amount = Number(so_hk_amount) - Number(so_total_zmount);
                    var inv_id = createFyInvoice(so_data,so_id,ce_amount,so_inv_id);
                    log.debug('作为效益 fy inv_id',inv_id);
                    if(inv_id){
                        //提交费用发票到销售发票
                        submitFyidToSoinv(inv_id,so_inv_id);
                        // inv_arr.push(inv_id);
                        //先通过搜索找到销售订单下的所有未核销发票
                        var cd_search = search.load('customsearch_customer_deposit');//客户存款单未核销
                        var cd_col = cd_search.columns;
                        var cd_res = cd_search.run().getRange(0,1000);
                        if(cd_res.length > 0){
                            for(var i = 0;i < cd_res.length;i++){
                                if(so_id == cd_res[i].getValue(cd_col[0])){
                                    //核销每个客户存款
                                    var c_id = cd_res[i].id;
                                    log.debug('客户存款id',c_id);
                                    var ret = hxInvoice(c_id,inv_id);
                                    log.debug('存款应用程序id',ret);
                                }
                            }
                        }
                    }
                }
            }
        }
        function submitFyidToSoinv(fyId,so_inv_id){
            record.submitField({
                type:'invoice',
                id:so_inv_id,
                values:{
                    custbody_associated_invoice:fyId,          //关联费用发票
                }
            })
        }
        function createFyInvoice(so_data,so_id,ce_amount,so_inv_id) {
            var inv_rec = record.create({
                type:'invoice',
                isDynamic:true,
            });
            inv_rec.setValue('entity',so_data.entity);
            // inv_rec.setValue('trandate',format.parse({type:format.Type.DATE,value:dk_date}));//
            inv_rec.setValue('memo','收款差额生成费用发票');
            inv_rec.setValue('custbody_sales_order',so_id);
            inv_rec.setValue('department',so_data.department);
            inv_rec.setValue('location',so_data.location);
            inv_rec.setValue('class',so_data.class);
            inv_rec.setValue('custbody_sl_bbaojiadan',so_data.baojiadan);
            inv_rec.setValue('custbody_sl_sopayway',so_data.pay_type);
            inv_rec.setValue('memo','收款差额生成费用发票');
            inv_rec.setValue('custbody_associated_sales_invoice',so_inv_id);//关联销售发票
            //明细行
            inv_rec.selectLine('item',0);
            inv_rec.setCurrentSublistValue({
                sublistId:'item',
                fieldId:'item',
                value:145,                   //手续费
            });
            inv_rec.setCurrentSublistValue({
                sublistId:'item',
                fieldId:'rate',
                value:ce_amount,
            });
            inv_rec.setCurrentSublistValue({
                sublistId:'item',
                fieldId:'quantity',
                value:1,
            });
            inv_rec.setCurrentSublistValue({
                sublistId:'item',
                fieldId:'taxcode',
                value:144,
            });
            inv_rec.commitLine('item');

            var inv_id = inv_rec.save();

            return inv_id;
        }
        function hxInvoice(c_id,inv_id) {
            if(c_id){
                //客户存款转存款应用程序，然后应用程序核销发票
                var depositapplication_rec = record.transform({
                    fromType: 'customerdeposit',
                    fromId: c_id,
                    toType: 'depositapplication',
                    isDynamic: true,
                });
                var count = depositapplication_rec.getLineCount('apply');
                for(var i = 0; i < count;i++){
                    depositapplication_rec.selectLine('apply',i);
                    var internalid = depositapplication_rec.getCurrentSublistValue({
                        sublistId:'apply',
                        fieldId:'internalid'
                    });
                    var currency = depositapplication_rec.getCurrentSublistValue({
                        sublistId:'apply',
                        fieldId:'currency',
                    });
                    // for(var j = 0;j < inv_arr.length;j++){
                    // log.debug('internalid inv_id',internalid + '---' + inv_id);
                    if(internalid == inv_id){
                        depositapplication_rec.setCurrentSublistValue({
                            sublistId:'apply',
                            fieldId:'apply',
                            value: true,
                        });
                        depositapplication_rec.commitLine('apply');
                    }
                    // }
                }
                var dep_app_id = depositapplication_rec.save();
                return dep_app_id;
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
            var mySearch = search.load({id:'customsearch_open_invoice_2'});//销售订单全额收款发票
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