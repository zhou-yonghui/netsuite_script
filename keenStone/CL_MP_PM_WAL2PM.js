/**
 * 沃尔玛收款核销
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 */
 define(
    ['N/search', 'N/record', './moment', 'N/task','N/file'],
    function(search, record, moment, task,file) {
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
                title: 'context',
                details: context
            });
            var value = JSON.parse(context.value);
            try {
                var itemColumns = search.lookupFields({
                    type: 'customrecord_walmart_payment',
                    id: value.id,
                    columns: ['custrecordcustrecord_pay_wal_sonumber','custrecord_wal_payable_partner_sale','custrecord_wal_walmart_order_number','custrecordcustrecord_hx_pay_wal_platform','custrecordcustrecord_hx_pay_wal_store',
                        'custrecord_wal_commission_from_sale','custrecord_wal_total_net_tax_collected','custrecord_wal_gross_sales_sevenue']
                });
                var payment = record.create({
                    type: 'customerpayment',
                    isDynamic: true
                });
                if(itemColumns.custrecordcustrecord_pay_wal_sonumber[0].value){
                    //获取店铺对应的科目id
                    var soData = getSo(itemColumns.custrecordcustrecord_pay_wal_sonumber[0].value);
                    var customer = soData.customer;
                    var bankSubId = subsidiary(customer);
                    log.debug("bankSubId",bankSubId);
                    payment.setValue('customer',customer);
                    payment.setValue('custbody_hx_aramount',itemColumns.custrecord_hx_pay_amz_productsales);
                    payment.setValue('payment',itemColumns.custrecord_wal_gross_sales_sevenue);//支付金额
                    payment.setValue('location',soData.location);//仓库
                    var flage = 0;
                    // if(payment.getText('currency') == itemColumns.custrecordcustrecord_hx_pay_amz_currency){
                    // 	payment.setValue('account',bankSubId);
                    // }else{payment.setValue('account',3644);flage = 1}
                    payment.setValue('approvalstatus',2);
                    var count = payment.getLineCount('apply');
                    log.debug('count',count);
                    if(count > 0){
                        var mysearch = search.create({
                            type:'invoice',
                            columns:['createdfrom','total'],
                            filters:[['createdfrom','anyof',itemColumns.custrecordcustrecord_pay_wal_sonumber[0].value]]
                        });
                        var res = mysearch.run().getRange({start:0,end:1});
                        if(res.length == 1){
                            var paymentId = payment.save();
                            log.debug('paymentId',paymentId);
                            var soId = itemColumns.custrecordcustrecord_pay_wal_sonumber[0].value;//销售订单号
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
                                type: 'customrecord_walmart_payment',
                                id: value.id,
                                values: {
                                    custrecordcustrecord_hx_scstatus: '已生成',
                                    custrecordcustrecord_hx_deal_free: status,
                                    custrecordcustrecord_hx_satu_lsit: true,
                                    custrecordcustrecord_pay_fk_info: paymentId
                                },
                            });
                            //创建日记账
                            // var journalId = createJournal(itemColumns,bankSubId,soId,flage,customer,value.id);
                            // log.debug('journalId',journalId);
                            // record.submitFields({
                            //     type: 'customrecord_walmart_payment',
                            //     id: value.id,
                            //     values: {
                            //         custrecordcustrecord_hx_expense_je: journalId,
                            //     },
                            // });
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
        function getSo(soId){
            var soData = {};
            var rec = record.load({type:'salesorder',id:soId});
            var customer = rec.getValue({fieldId:'entity'});
            var locationSo = rec.getValue({fieldId:'location'});
            soData.customer = customer;
            var mySearch = search.create({
                type:'customrecord_cseg_hx_fm_store',
                columns:['internalid','custrecord_hx_md_warehouse'],
                filters:[['custrecord_cs_store_customer','anyof',soData.customer]]
            });
            var res = mySearch.run().getRange({start: 0,end: 1000});
            for(var i = 0;i < res.length;i++){
                var storeId = res[i].getValue('internalid');
                var location = res[i].getValue('custrecord_hx_md_warehouse');
                soData.location = location;
            }
            return soData;
        }
        function subsidiary(customer){
            var rec = record.load({type:'customer',id:customer});
            var subid = rec.getValue({fieldId:'custentityrm_collection_account'});
            return subid;
        }
        function createJournal(column,bankSubId,soId,flage,customer,payId){
            var journal = record.create({
                type: 'journalentry',
                isDynamic: true
            })
            //获取so上公司id
            var soRec = record.load({type:'salesorder',id:soId});
            var subId = soRec.getValue({fieldId:'subsidiary'});
            journal.setValue('subsidiary',subId);
            journal.setValue('approvalstatus',2);//审批状态,2
            journal.setValue('custbody_ly_walmart_payment',payId);

            if(flage == 0){
                for(var i = 0;i < 8;i++) {
                    journal.selectNewLine('line');
                    if (i == 0 && column.custrecord_wal_commission_from_sale != 0 && column.custrecord_wal_commission_from_sale != '') {
                        log.debug('1458 dr',column.custrecord_wal_commission_from_sale);
                        journal.setCurrentSublistValue('line', 'account', 1458); //销售费用：销售佣金
                        journal.setCurrentSublistValue('line', 'debit', column.custrecord_wal_commission_from_sale);
                        // journal.setCurrentSublistValue('line', 'cseg_hx_fm_platfm', column.custrecord_hx_pay_amz_platform[0].value);//销售平台
                        // journal.setCurrentSublistValue('line', 'cseg_hx_fm_store', column.custrecord_hx_pay_amz_store[0].value);//销售店铺
                        journal.setCurrentSublistValue('line', 'entity', customer);
                        journal.commitLine('line');
                    }
                    else if(i == 1 && column.custrecord_wal_commission_from_sale != 0 && column.custrecord_wal_commission_from_sale != 0){
                        log.debug('122 cr',column.custrecord_wal_commission_from_sale);
                        journal.setCurrentSublistValue('line', 'account',122);//
                        journal.setCurrentSublistValue('line','debit',column.custrecord_wal_commission_from_sale);
                        // journal.setCurrentSublistValue('line','cseg_hx_fm_platfm',column.custrecord_hx_pay_amz_platform[0].value);//销售平台
                        // journal.setCurrentSublistValue('line','cseg_hx_fm_store',column.custrecord_hx_pay_amz_store[0].value);//销售店铺
                        journal.setCurrentSublistValue('line', 'entity', customer);
                        journal.commitLine('line');
                    }
                    else if(i == 2 && column.custrecord_wal_gross_sales_sevenue != 0 && column.custrecord_wal_gross_sales_sevenue != ''){
                        log.debug('122 dr',column.custrecord_wal_gross_sales_sevenue);
                        journal.setCurrentSublistValue('line', 'account',122);//
                        journal.setCurrentSublistValue('line','debit',column.custrecord_wal_gross_sales_sevenue);
                        // journal.setCurrentSublistValue('line','cseg_hx_fm_platfm',column.custrecord_hx_pay_amz_platform[0].value);//销售平台
                        // journal.setCurrentSublistValue('line','cseg_hx_fm_store',column.custrecord_hx_pay_amz_store[0].value);//销售店铺
                        journal.setCurrentSublistValue('line', 'entity', customer);
                        journal.commitLine('line');
                    }
                    else if(i == 3 && column.custrecord_wal_gross_sales_sevenue != 0 && column.custrecord_wal_gross_sales_sevenue != ''){
                        log.debug('559 cr',column.custrecord_wal_gross_sales_sevenue);
                        journal.setCurrentSublistValue('line', 'account',559);//
                        journal.setCurrentSublistValue('line','debit',column.custrecord_wal_gross_sales_sevenue);
                        // journal.setCurrentSublistValue('line','cseg_hx_fm_platfm',column.custrecord_hx_pay_amz_platform[0].value);//销售平台
                        // journal.setCurrentSublistValue('line','cseg_hx_fm_store',column.custrecord_hx_pay_amz_store[0].value);//销售店铺
                        journal.setCurrentSublistValue('line', 'entity', customer);
                        journal.commitLine('line');
                    }
                    else if(i == 4 && column.custrecord_wal_total_net_tax_collected != 0 && column.custrecord_wal_total_net_tax_collected != 0){
                        log.debug('591 dr',column.custrecord_wal_total_net_tax_collected);
                        journal.setCurrentSublistValue('line', 'account',591);//应交税费：应交销售税
                        journal.setCurrentSublistValue('line','debit',column.custrecord_wal_total_net_tax_collected);
                        // journal.setCurrentSublistValue('line','cseg_hx_fm_platfm',column.custrecord_hx_pay_amz_platform[0].value);//销售平台
                        // journal.setCurrentSublistValue('line','cseg_hx_fm_store',column.custrecord_hx_pay_amz_store[0].value);//销售店铺
                        journal.setCurrentSublistValue('line', 'entity', customer);
                        journal.commitLine('line');
                    }
                    else if(i == 5 && column.custrecord_wal_total_net_tax_collected != 0 && column.custrecord_wal_total_net_tax_collected != 0){
                        log.debug('122 cr',column.custrecord_wal_total_net_tax_collected);
                        journal.setCurrentSublistValue('line', 'account',122);//应收账款：非关联方
                        journal.setCurrentSublistValue('line','credit',column.custrecord_wal_total_net_tax_collected);
                        // journal.setCurrentSublistValue('line','cseg_hx_fm_platfm',column.custrecord_hx_pay_amz_platform[0].value);//销售平台
                        // journal.setCurrentSublistValue('line','cseg_hx_fm_store',column.custrecord_hx_pay_amz_store[0].value);//销售店铺
                        journal.setCurrentSublistValue('line', 'entity', customer);
                        journal.commitLine('line');
                    }
                    else if(i == 6 && column.custrecord_wal_total_net_tax_collected != 0 && column.custrecord_wal_total_net_tax_collected != 0){
                        log.debug('122 dr',column.custrecord_wal_total_net_tax_collected);
                        journal.setCurrentSublistValue('line', 'account',122);//应交税费：应交销售税
                        journal.setCurrentSublistValue('line','debit',column.custrecord_wal_total_net_tax_collected);
                        // journal.setCurrentSublistValue('line','cseg_hx_fm_platfm',column.custrecord_hx_pay_amz_platform[0].value);//销售平台
                        // journal.setCurrentSublistValue('line','cseg_hx_fm_store',column.custrecord_hx_pay_amz_store[0].value);//销售店铺
                        journal.setCurrentSublistValue('line', 'entity', customer);
                        journal.commitLine('line');
                    }
                    else if(i == 7 && column.custrecord_wal_total_net_tax_collected != 0 && column.custrecord_wal_total_net_tax_collected != 0){
                        log.debug('591 cr',column.custrecord_wal_total_net_tax_collected);
                        journal.setCurrentSublistValue('line', 'account',591);//应收账款：非关联方
                        journal.setCurrentSublistValue('line','credit',column.custrecord_wal_total_net_tax_collected);
                        // journal.setCurrentSublistValue('line','cseg_hx_fm_platfm',column.custrecord_hx_pay_amz_platform[0].value);//销售平台
                        // journal.setCurrentSublistValue('line','cseg_hx_fm_store',column.custrecord_hx_pay_amz_store[0].value);//销售店铺
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
///        log.debug({
            //           title: 'summary',
            //           details: summary
            //       });
        }

        function initSearch() {
            var mySearch = search.load({id:'customsearch_walmart_payment_kf'});
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