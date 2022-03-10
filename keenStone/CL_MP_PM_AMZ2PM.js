/**
 * 亚马逊收款核销
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
                var itemColumns = search.lookupFields({
                    type: 'customrecord_hx_pay_amz_payment',
                    id: value.id,
                    columns: ['custrecord_hx_pay_amz_customer','custrecord_hx_pay_amz_productsales','custrecord_hx_pay_amz_arnumber','custrecordcustrecord_hx_pay_amz_light_tr','custrecordcustrecord_payamz_wdchange_oth',
                        'custrecord_hx_pay_amz_cmnumber','custrecord_pay_amz_sonumber','custrecord_hx_soamount_','custrecordcustrecord_hx_pay_amz_null_tra','custrecordcustrecord_hx_pay_amz_subscr_o','custrecordcustrecord_payamz_invenreturn_',
                        'custrecord_hx_pay_amz_platform','custrecord_hx_shopnember','custrecord_hx_pay_amz_store','custrecordcustrecord_hx_pay_amz_zhandian','custrecord_payamz_debt','custrecord_order_other','custrecord_comminglingvat',
                        'custrecord_hx_pay_amz_shippingcredits','custrecord_hx_pay_amz_shippingcreditstax','custrecord_hx_pay_amz_giftwrapcredits','custrecordcustrecord_payamz_order_other','custrecordcustrecord_payamz_storage_othe',
                        'custrecord_hx_pay_amz_giftwrapcreditstax','custrecord_hx_pay_amz_promotionalrebates','custrecord_hx_pay_amz_promotio1','custrecordcustrecord_hx_pay_amz_ad_tran','custrecord_rm_points',
                        'custrecord_hx_pay_amz_marketplacewithhel','custrecord_hx_pay_amz_sellingfees','custrecord_hx_pay_amz_fbafees','custrecordcustrecord_hx_pay_amz_fbadispo','custrecordcustrecord_payamz_perorder_oth','custrecordcustrecord_payamz_losthouse_ot',
                        'custrecord_hx_pay_amz_other','custrecord_hx_pay_amz_othertransactionfe','custrecord_hx_goods_sale_tax','custrecord_hx_zd_salestax','custrecordcustrecord_payamz_disposal_oth','custrecordcustrecord_payamz_postage_othe',
                        'custrecord_hx_pay_amz_createdate','custrecordcustrecord_hx_pay_amz_currency','custrecord_hx_pay_amz_total','custrecord_hx_pay_amz_productsalestax','custrecordcustrecord_payamz_intership_ot']
                });
                log.debug('销售订单号',itemColumns.custrecord_pay_amz_sonumber);
                var so_id;
                if(itemColumns.custrecord_pay_amz_sonumber[0].value == null || itemColumns.custrecord_pay_amz_sonumber[0].value == ''){
                    //判断销售订单
                    so_id = findSo(itemColumns.custrecord_hx_pay_amz_store[0].value,itemColumns.custrecord_hx_shopnember);
                }else{
                    so_id = itemColumns.custrecord_pay_amz_sonumber[0].value;
                }
                //创建收款单
                var payment = record.create({
                    type: 'customerpayment',
                    isDynamic: true
                });
                //获取店铺对应的科目id
                var customer = itemColumns.custrecord_hx_pay_amz_customer[0].value;
                if(so_id){
                    var soData = getSo(so_id);
                    var currency = itemColumns.custrecordcustrecord_hx_pay_amz_currency[0].value;
                    var customerData = getCustomer(customer,currency);
                    payment.setValue('customer',itemColumns.custrecord_hx_pay_amz_customer[0].value);
                    var payments = Number(itemColumns.custrecord_hx_pay_amz_productsales) + Number(itemColumns.custrecord_hx_pay_amz_promotionalrebates);
                    log.debug('付款单金额',payments);
                    if(payments > 0){
                        payment.setValue('payment',payments.toFixed(2));//支付金额
                        //payment.setValue('aracct',331);   //1122.01 应收账款：非关联方
                        // payment.setValue('account',122);//测试 未存资金
                        payment.setValue('location',soData.location);//仓库
                        var flage = 0;
                        // if(payment.getText('currency') == itemColumns.custrecordcustrecord_hx_pay_amz_currency){
                        // 	payment.setValue('account',bankSubId);
                        // }else{payment.setValue('account',3644);flage = 1}
                        payment.setValue('currency',currency);
                        payment.setValue('approvalstatus',2);
                        payment.setValue('custbody_laiyuan',value.id);//来源亚马逊
                        payment.setValue('trandate',format.parse({value:itemColumns.custrecord_hx_pay_amz_createdate,type:format.Type.DATE}));
                        var count = payment.getLineCount('apply');
                        log.debug('count',count);
                        /**通过payment上的so来找发票*/
                        if(count > 0){
                            var mysearch = search.create({
                                type:'invoice',
                                columns:['createdfrom','total','internalid'],
                                filters:[['createdfrom','anyof',so_id]]
                            });
                            var res = mysearch.run().getRange({start:0,end:1});
                            log.debug('发票上搜索结果',res);
                            log.debug('查询pay销售对应发票后的点数',runtime.getCurrentScript().getRemainingUsage());
                            if(res.length == 1){
                                for(var i = 0;i < count;i++){
                                    payment.selectLine('apply',i);
                                    var type = payment.getCurrentSublistValue({
                                        sublistId:'apply',
                                        fieldId:'type',
                                    });
                                    if(type == '发票'){
                                        var invId = payment.getCurrentSublistValue({
                                            sublistId: 'apply',
                                            fieldId:'internalid',
                                        });
                                        if(invId == res[0].id){
                                            payment.setCurrentSublistValue({
                                                sublistId:'apply',
                                                fieldId:'apply',
                                                value:true,
                                            });
                                            log.debug('勾选应用之后的点数',runtime.getCurrentScript().getRemainingUsage());
                                            payment.commitLine('apply');
                                        }
                                    }
                                }
                            
                                var paymentId = payment.save();
                                log.debug('paymentId',paymentId);
                                log.debug('保存之后的点数',runtime.getCurrentScript().getRemainingUsage());
                                //创建日记账
                                // var journalId = createJournal(itemColumns,soId,flage,customer,customerData,value.id);
                                // log.debug('journalId',journalId);
                                var rec = record.load({
                                    type: 'customerpayment',
                                    id: paymentId,
                                    isDynamic: true
                                });

                                var paymentAmount = rec.getValue({fieldId:'payment'});
                                var aramount = res[0].getValue('total');
                                //付款编号回写亚马逊主表
                                var paymentNum = rec.getValue('tranid');

                                var status = null;
                                if(paymentAmount == aramount){
                                    status = '完全核销';
                                }else if(paymentAmount > aramount || paymentAmount < aramount){
                                    status = '部分核销';
                                }else{
                                    status = '未核销';
                                }

                                record.submitFields({
                                    type: 'customrecord_hx_pay_amz_payment',
                                    id: value.id,
                                    values: {
                                        custrecord_hx_scstatus: '已生成',
                                        custrecord_hx_deal_free: status,
                                        custrecord_hx_satu_lsit: true,
                                        custrecord_pay_fk_info: paymentId,
                                    },
                                });
                                log.debug('回写之后的点数',runtime.getCurrentScript().getRemainingUsage());
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

        function reduce(context) {
            log.debug({
                title: 'context',
                details: context
            });
        }
        function findSo(store_id,store_number){
            if(store_id && store_number){
                var so_search = search.create({
                    type:'salesorder',
                    filters:[
                        ['cseg_hx_fm_store','anyof',store_id],
                        'AND',['custbody_hx_so_shoporder','is',store_number],
                    ]
                });
                var res = so_search.run().getRange(0,1);
                log.debug('销售订单搜索结果',JSON.stringify(res));
                if(res.length > 0){
                    return res[0].id;
                }
            }
        }
        function getCustomer(customer,currency){
            var customerData = {};
            var rec = record.load({type:'customer',id:customer});
            var subid = rec.getValue({fieldId:'custentityrm_collection_account'});
            var zhandian = rec.getValue('custentitycseg_hx_fm_country');
            customerData.account = subid;
            customerData.zhandian = zhandian;
            return customerData;
        }
        function getSo(soId){
            var soData = {};
            var rec = record.load({type:'salesorder',id:soId});
            var customer = rec.getValue({fieldId:'entity'});
            var locationSo = rec.getValue({fieldId:'location'});
            soData.customer = customer;
            // soData.location = locationSo;
            soData.location = record.load({type:"customrecord_cseg_hx_fm_store",id:rec.getValue('cseg_hx_fm_store'),isDynamic:true}).getValue('custrecord_hx_md_warehouse');
            return soData;
        }
        function createJournal(column,soId,flage,customer,customerData,payId){
            var journal = record.create({
                type: 'journalentry',
                isDynamic: true
            })
            //获取so上公司id
            var soRec = record.load({type:'salesorder',id:soId});
            var subId = soRec.getValue({fieldId:'subsidiary'});
            journal.setValue('subsidiary',subId);
            journal.setValue('approvalstatus',2);//审批状态,2
            journal.setValue('custbody_amzpayment_',payId);
            var itemColumns = search.lookupFields({
                type: 'customer',
                id: column.custrecord_hx_pay_amz_customer[0].value,
                columns: ['currency']
            });
            journal.setValue('currency',itemColumns.currency[0].value);
            journal.setValue('custbody_hx_so_shoporder',column.custrecord_hx_shopnember);
            if(flage == 0){
                for(var i = 0;i < 16;i++) {
                    journal.selectNewLine('line');
                    var saleAmount = Number(column.custrecord_hx_pay_amz_productsalestax) + Number(column.custrecord_hx_pay_amz_shippingcreditstax) + Number(column.custrecord_hx_pay_amz_giftwrapcreditstax) + Number(column.custrecord_hx_pay_amz_promotio1) + Number(column.custrecord_hx_pay_amz_marketplacewithhel);
                    var zkAmount = Number(column.custrecord_hx_pay_amz_sellingfees) + Number(column.custrecord_hx_pay_amz_fbafees) + Number(column.custrecordcustrecord_payamz_disposal_oth) + Number(column.custrecordcustrecord_hx_pay_amz_ad_tran) + Number(column.custrecord_hx_pay_amz_othertransactionfe) + Number(column.custrecordcustrecord_payamz_invenreturn_) + Number(column.custrecord_transfer) + Number(column.custrecordcustrecord_hx_pay_amz_light_tr) + Number(column.custrecord_rm_points) + Number(column.custrecord_order_other) + Number(column.custrecordcustrecord_payamz_postage_othe) + Number(column.custrecordcustrecord_payamz_wdchange_oth) + Number(column.custrecord_payamz_debt) + Number(column.custrecordcustrecord_payamz_perorder_oth) + Number(column.custrecord_comminglingvat);
                    var amount827 = Number(column.custrecord_hx_pay_amz_othertransactionfe) + Number(column.custrecord_rm_points) + Number(column.custrecord_order_other) + Number(column.custrecordcustrecord_payamz_wdchange_oth) + Number(column.custrecord_payamz_debt);
                    var amount823 = Number(column.custrecordcustrecord_payamz_perorder_oth) + Number(column.custrecord_hx_pay_amz_fbafees) + Number(column.custrecordcustrecord_payamz_postage_othe);
                    if (i == 0 && saleAmount != 0) {
                        journal.setCurrentSublistValue('line', 'account', 591); //应交税费-应交销售税
                        journal.setCurrentSublistValue('line', 'debit', -saleAmount);
                        journal.setCurrentSublistValue('line', 'entity', customer);
                        journal.commitLine('line');
                    } else if (i == 1 && saleAmount != 0) {
                        journal.setCurrentSublistValue('line', 'account', 122); //平台
                        journal.setCurrentSublistValue('line', 'credit', saleAmount);
                        journal.setCurrentSublistValue('line', 'entity', customer);
                        journal.commitLine('line');
                    }
                    else if (i == 2 && column.custrecord_hx_pay_amz_shippingcredits != 0 && column.custrecord_hx_pay_amz_shippingcredits != '') {
                        journal.setCurrentSublistValue('line', 'account', 559); //
                        journal.setCurrentSublistValue('line', 'debit', -column.custrecord_hx_pay_amz_shippingcredits);
                        journal.setCurrentSublistValue('line', 'entity', customer);
                        journal.commitLine('line');
                    }
                    else if (i == 3 && column.custrecord_hx_pay_amz_shippingcredits != 0 && column.custrecord_hx_pay_amz_shippingcredits != '') {
                        journal.setCurrentSublistValue('line', 'account', 602); //
                        journal.setCurrentSublistValue('line', 'credit', column.custrecord_hx_pay_amz_shippingcredits);
                        journal.setCurrentSublistValue('line', 'entity', customer);
                        journal.commitLine('line');
                    }
                    else if (i == 4 && column.custrecord_hx_pay_amz_giftwrapcredits != 0 && column.custrecord_hx_pay_amz_giftwrapcredits != '') {
                        journal.setCurrentSublistValue('line', 'account', 559); //
                        journal.setCurrentSublistValue('line', 'debit', -column.custrecord_hx_pay_amz_giftwrapcredits);
                        journal.setCurrentSublistValue('line', 'entity', customer);
                        journal.commitLine('line');
                    }
                    else if (i == 5 && column.custrecord_hx_pay_amz_giftwrapcredits != 0 && column.custrecord_hx_pay_amz_giftwrapcredits != '') {
                        journal.setCurrentSublistValue('line', 'account', 600); //
                        journal.setCurrentSublistValue('line', 'credit', column.custrecord_hx_pay_amz_giftwrapcredits);
                        journal.setCurrentSublistValue('line', 'entity', customer);
                        journal.commitLine('line');
                    }
                    else if (i == 6 && column.custrecord_hx_pay_amz_sellingfees != 0 && column.custrecord_hx_pay_amz_sellingfees != '') {
                        journal.setCurrentSublistValue('line', 'account', 1458); //
                        journal.setCurrentSublistValue('line', 'debit', -column.custrecord_hx_pay_amz_sellingfees);
                        journal.setCurrentSublistValue('line', 'entity', customer);
                        journal.commitLine('line');
                    }
                    else if (i == 7 && amount823 != 0) {
                        journal.setCurrentSublistValue('line', 'account', 1457); //
                        journal.setCurrentSublistValue('line', 'debit', -amount823);
                        journal.setCurrentSublistValue('line', 'entity', customer);
                        journal.commitLine('line');
                    }
                    else if (i == 8 && column.custrecordcustrecord_payamz_disposal_oth != 0 && column.custrecordcustrecord_payamz_disposal_oth != '') {
                        journal.setCurrentSublistValue('line', 'account', 1482); //
                        journal.setCurrentSublistValue('line', 'debit', -column.custrecordcustrecord_payamz_disposal_oth);
                        journal.setCurrentSublistValue('line', 'entity', customer);
                        journal.commitLine('line');
                    }
                    else if (i == 9 && column.custrecordcustrecord_hx_pay_amz_ad_tran != 0 && column.custrecordcustrecord_hx_pay_amz_ad_tran != '') {
                        journal.setCurrentSublistValue('line', 'account', 1483); //
                        journal.setCurrentSublistValue('line', 'debit', -column.custrecordcustrecord_hx_pay_amz_ad_tran);
                        journal.setCurrentSublistValue('line', 'entity', customer);
                        journal.commitLine('line');
                    }
                    else if (i == 10 && amount827 != 0) {
                        journal.setCurrentSublistValue('line', 'account', 1459); //
                        journal.setCurrentSublistValue('line', 'debit', -amount827);
                        journal.setCurrentSublistValue('line', 'entity', customer);
                        journal.commitLine('line');
                    }
                    else if (i == 11 && column.custrecordcustrecord_payamz_invenreturn_ != 0 && column.custrecordcustrecord_payamz_invenreturn_ != '') {
                        journal.setCurrentSublistValue('line', 'account', 601); //
                        journal.setCurrentSublistValue('line', 'debit', -column.custrecordcustrecord_payamz_invenreturn_);
                        journal.setCurrentSublistValue('line', 'entity', customer);
                        journal.commitLine('line');
                    }
                    else if (i == 12 && column.custrecord_transfer != 0 && column.custrecord_transfer != '') {
                        journal.setCurrentSublistValue('line', 'account', customerData.account); //
                        journal.setCurrentSublistValue('line', 'debit', -column.custrecord_transfer);
                        journal.setCurrentSublistValue('line', 'entity', customer);
                        journal.commitLine('line');
                    }
                    else if (i == 13 && column.custrecordcustrecord_hx_pay_amz_light_tr != 0 && column.custrecordcustrecord_hx_pay_amz_light_tr != '') {
                        journal.setCurrentSublistValue('line', 'account', 1459); //
                        journal.setCurrentSublistValue('line', 'debit', -column.custrecordcustrecord_hx_pay_amz_light_tr);
                        journal.setCurrentSublistValue('line', 'entity', customer);
                        journal.commitLine('line');
                    }
                    else if (i == 14 && column.custrecord_comminglingvat != 0 && column.custrecord_comminglingvat != '') {
                        journal.setCurrentSublistValue('line', 'account', 1558); //
                        journal.setCurrentSublistValue('line', 'debit', -column.custrecord_comminglingvat);
                        journal.setCurrentSublistValue('line', 'entity', customer);
                        journal.commitLine('line');
                    }
                    else if (i == 15 && zkAmount != 0) {
                        journal.setCurrentSublistValue('line', 'account', 122); //
                        journal.setCurrentSublistValue('line', 'credit', zkAmount);
                        journal.setCurrentSublistValue('line', 'entity', customer);
                        journal.commitLine('line');
                    }
                }
            }
            else if(flage == 1){

            }
            var journalId = journal.save();

            return journalId;
        }

        function summarize(summary) {
            log.debug({
                title: 'summary',
                details: summary
            });
        }

        function initSearch() {
            var mySearch = search.load({id:'customsearch_rm_payment2pm_2'});//customsearch_rm_payment2pm_2
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