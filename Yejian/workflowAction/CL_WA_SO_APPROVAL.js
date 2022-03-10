/**
 * 到款通知取消到款
 * @NApiVersion 2.x
 * @NScriptType WorkflowActionScript
 */
define(['N/record','N/search','N/format'],
    function(record,search,format) {
        function onAction(context){
            try{
                var rec = context.newRecord;
                var so_id = rec.id;
                var approval_status = rec.getValue('custbody_approval_status');//审批状态
                log.debug('审批状态',approval_status);
                //审批通过
                if(approval_status == 5){
                    var so_data = getSo(so_id);
                    log.debug('so-data',so_data);
                    var ce_amount = Number(0);
                    var so_hk_amount = rec.getValue('custbody_sl_soamm');//回款金额
                    var so_total_zmount = rec.getValue('total');//总计
                    var dk_date = rec.getValue('trandate');//日期 TODO:暂时
                    var inv_arr = new Array();
                    if(!so_hk_amount){
                        so_hk_amount = Number(0);
                    }
                    //判断差额,回款金额小于销售金额，是否<=配置表的“自动核销判断差额（30USD）”，销售订单默认是USD币种；如果是，先创建贷项，再贷项勾选应用发票核销
                    log.debug('so_hk_amount so_total_zmount',so_hk_amount+ '---' + so_total_zmount);
                    if(Number(so_hk_amount)  < Number(so_total_zmount) && Number(so_total_zmount) - Number(so_hk_amount) < 30){
                        var invoice_search = search.create({
                            type:'invoice',
                            filters:[
                                // ['status','anyof',['CustInvc:A']],
                                ['status','is',"未结"],
                                'AND',['createdfrom','is',so_id],
                                "AND",['mainline','is',true],
                            ],
                            columns:[
                                'entity','trandate','createdfrom',
                            ]
                        });
                        var inv_res = invoice_search.run().getRange(0,1000);
                        log.debug('销售订单关联的未结发票',JSON.stringify(inv_res));
                        if(inv_res.length > 0){
                            for(var i = 0;i < inv_res.length;i++){
                                inv_arr.push(inv_res[i].id);
                            }
                            //创建贷项核销发票
                            ce_amount = so_total_zmount - so_hk_amount;
                            var cr_memo_id = createCreditMemo(so_data,so_id,inv_arr,ce_amount);
                            log.debug('cr_memo_id',cr_memo_id);
                        }
                    }
                    //回款金额大于订单金额
                    else if(Number(so_hk_amount) > Number(so_total_zmount)){
                        //差额类型为空
                        if(so_data.ce_type == null || so_data.ce_type == ''){
                            if(Number(so_hk_amount) - Number(so_total_zmount) < 30){
                                ce_amount = Number(so_hk_amount) - Number(so_total_zmount);
                                var inv_id = createFyInvoice(so_data,so_id,dk_date,ce_amount);
                                if(inv_id){
                                    // inv_arr.push(inv_id);
                                    // var ret = hxInvoice(c_id,inv_id);
                                    // log.debug('存款应用程序id',ret);
                                }
                            }
                        }
                        else if(so_data == '作为余额'){

                        }
                        else if(so_data == '作为效益'){
                            ce_amount = Number(so_hk_amount) - Number(so_total_zmount);
                            var inv_id = createFyInvoice(so_data,so_id,dk_date,ce_amount);
                            if(inv_id){
                                // inv_arr.push(inv_id);
                                // var ret = hxInvoice(c_id,inv_id);
                                // log.debug('存款应用程序id',ret);
                            }
                        }
                    }
                }
            }catch(e){
                log.debug('错误',e.message);
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
                    log.debug('internalid inv_id',internalid + '---' + inv_id);
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
        function createFyInvoice(so_data,so_id,dk_date,ce_amount) {
            log.debug('差额',ce_amount);
            var inv_rec = record.create({
                type:'invoice',
                isDynamic:true,
            });
            inv_rec.setValue('entity',so_data.entity || ' ');
            inv_rec.setValue('trandate',format.parse({type:format.Type.DATE,value:dk_date}));//
            inv_rec.setValue('memo','收款差额生成费用发票');
            inv_rec.setValue('custbody_sales_order',so_id || ' ');
            if(so_data.department){
                inv_rec.setValue('department',so_data.department || ' ');
            }
            if(so_data.location){
                inv_rec.setValue('location',so_data.location || ' ');
            }
            if(so_data.class){
                inv_rec.setValue('class',so_data.class || ' ');
            }
            if(so_data.baojiadan){
                inv_rec.setValue('custbody_sl_bbaojiadan',so_data.baojiadan || ' ');
            }
            if(so_data.pay_type){
                inv_rec.setValue('custbody_sl_sopayway',so_data.pay_type || ' ');
            }
            inv_rec.setValue('memo','收款差额生成费用发票');
            //明细行
            inv_rec.selectNewLine('item');
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
            log.debug('end fyInvoice');

            return inv_id;
        }
        function createCreditMemo(so_data,so_id,inv_arr,ce_amount){
            var cr_memo_rec = record.create({
                type:'creditmemo',
                isDynamic:true,
            });
            cr_memo_rec.setText('customform','傲英贷项通知单');
            cr_memo_rec.setValue('entity',so_data.entity);
            cr_memo_rec.setValue('custbody_sales_order',so_id);
            cr_memo_rec.setValue('department',so_data.department);
            cr_memo_rec.setValue('location',so_data.location);
            cr_memo_rec.setValue('class',so_data.class);
            cr_memo_rec.setValue('custbody_sl_so_innumber',so_data.wd_num);
            cr_memo_rec.setValue('custbody_sl_bbaojiadan',so_data.baojiadan);
            cr_memo_rec.setValue('custbody_sl_sopayway',so_data.pay_type);
            cr_memo_rec.setValue('memo','收款差额生成贷项通知单');
            //货品明细
            cr_memo_rec.selectNewLine('item',0);
            cr_memo_rec.setCurrentSublistValue({
                sublistId:'item',
                fieldId:'item',
                value:145,             //手续费
            });
            cr_memo_rec.setCurrentSublistValue({
                sublistId:'item',
                fieldId:'rate',
                value:ce_amount,
            });
            cr_memo_rec.setCurrentSublistValue({
                sublistId:'item',
                fieldId:'quantity',
                value:1,
            });
            cr_memo_rec.setCurrentSublistValue({
                sublistId:'item',
                fieldId:'taxcode',
                value:144,              //VAT_0
            });
            cr_memo_rec.setCurrentSublistValue({
                sublistId:'item',
                fieldId:'location',
                value:so_data.location,
            });
            cr_memo_rec.setCurrentSublistValue({
                sublistId:'item',
                fieldId:'department',
                value:so_data.department,
            });
            cr_memo_rec.commitLine('item');
            //应用明细
            var apply_count = cr_memo_rec.getLineCount('apply');
            for(var i = 0;i < apply_count;i++){
                cr_memo_rec.selectLine('apply',i);
                var trantype = cr_memo_rec.getCurrentSublistValue({
                    sublistId:'apply',
                    fieldId:'trantype',
                });
                if(trantype == 'CustInvc'){
                    var internalid = cr_memo_rec.getCurrentSublistValue({
                        sublistId:'apply',
                        fieldId:'internalid',
                    });
                    for(var j = 0;j < inv_arr.length;j++){
                        if(internalid == inv_arr[j]){
                            cr_memo_rec.setCurrentSublistValue({
                                sublistId:'apply',
                                fieldId:'apply',
                                value:true,
                            });
                            cr_memo_rec.commitLine('apply');
                        }
                    }
                }
            }

            var cr_memo_id = cr_memo_rec.save();
            return cr_memo_id;
        }
        return {
            onAction: onAction
        }
    });