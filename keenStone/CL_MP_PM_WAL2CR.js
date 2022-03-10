/**
 * 沃尔玛退款核销
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 */
 define(
    ['N/search', 'N/record', './moment', 'N/task','N/file'],
    function(search, record, moment, task,file) {
        function getInputData() {
            var alls = [];
            var mySearch = initSearch();
            mySearch.run().each(function(result){
                var results = result.getValue({name:'internalid'});
                //    log.debug('result',results);
                var tmp = new Object();
                tmp.id = results;
                alls[alls.length] = tmp;

                return true;
            });

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
            var value = JSON.parse(context.value);
            try {
                var itemColumns = search.lookupFields({
                    type: 'customrecord_walmart_payment',
                    id: value.id,
                    columns: ['custrecordcustrecord_pay_wal_sonumber','custrecord_customer','custrecord_wal_payable_partner_sale','custrecord_wal_walmart_order_number','custrecordcustrecord_hx_pay_wal_platform','custrecordcustrecord_hx_pay_wal_store',
                        'custrecord_wal_commission_from_sale','custrecord_wal_total_net_tax_collected']
                });
                // log.debug({
                //    title:'itemColumns',
                //    details:itemColumns
                // });
                var refund = record.create({
                    type: 'customerrefund',
                    isDynamic: true
                });
                //获取店铺对应的科目id
                // var soData = getSo(itemColumns.custrecordcustrecord_pay_wal_sonumber[0].value);
                var customer = itemColumns.custrecord_customer[0].value;
                var store_date = getStore(itemColumns.custrecordcustrecord_hx_pay_wal_store[0].value)
                // var bankSubId = subsidiary(customer);
                // log.debug("bankSubId",bankSubId);
                refund.setValue('customer',customer);
                refund.setValue('custbody_hx_aramount',itemColumns.custrecord_hx_pay_amz_productsales);
                // payment.setValue('custbody_hx_arnumber',itemColumns.custrecord_hx_pay_amz_arnumber[0].value);
                // payment.setValue('custbody_hx_cmnumber',itemColumns.custrecord_hx_pay_amz_cmnumber[0].value);
                // payment.setValue('custbody_sales_number',itemColumns.custrecord_pay_amz_sonumber[0].value);
                // payment.setValue('custbody_hx_transactionid',itemColumns.name);
                // payment.setValue('cseg_hx_fm_platfm',itemColumns.custrecord_hx_pay_amz_platform[0].value);
                // payment.setValue('custbody_hx_so_shoporder',itemColumns.custrecord_hx_shopnember);
                // payment.setText('custbody_hx_currency',itemColumns.custrecordcustrecord_hx_pay_amz_currency);//收款货币
                refund.setValue('total',itemColumns.custrecord_wal_payable_partner_sale);//退款金额
                // payment.setValue('cseg_hx_fm_store',itemColumns.custrecord_hx_pay_amz_store[0].value);//销售店铺
                // payment.setText('trandate',itemColumns.custrecord_hx_pay_amz_createdate);//日期
                // payment.setValue('aracct',331);   //1122.01 应收账款：非关联方
                refund.setValue('currency',store_date.so_currency);//币种
                refund.setValue('account',122);//应收账款：非关联方
                refund.setValue('location',store_date.location);//仓库
                var flage = 0;
                // if(payment.getText('currency') == itemColumns.custrecordcustrecord_hx_pay_amz_currency){
                // 	payment.setValue('account',bankSubId);
                // }else{payment.setValue('account',3644);flage = 1}
                refund.setValue('approvalstatus',2);
                var count = refund.getLineCount('apply');
                log.debug('count',count);
                if(count>0){
                    for (var i = 0; i < count; i++) {
                        var item = new Object();
                        refund.selectLine({sublistId:'apply', line: i});
                        item.refnum = refund.getCurrentSublistValue({
                            sublistId: 'apply',
                            fieldId: 'refnum'
                        });
                        item.trantype = refund.getCurrentSublistValue({
                            sublistId:'apply',
                            fieldId:'trantype'
                        });
                        var results;
                        var column;
                        if(item.trantype == 'CustCred'){
                            var mySearch = search.create({
                                type: 'creditmemo',
                                filters: [['tranid','is',item.refnum]]
                            });
                            results = mySearch.run().getRange({
                                start: 0,
                                end: 1
                            });
                            column = search.lookupFields({
                                type: 'creditmemo',
                                id: results[0].id,
                                columns: ['custbody_creditmemo_so','tranid','total']
                            });
                            log.debug({
                                title: '贷项通知销售单号',
                                details: column.custbody_creditmemo_so
                            });
                            log.debug('贷项通知tranid', column.tranid);
                            var memoTotal = column.total;
                            if(column.custbody_creditmemo_so[0].value != null && column.custbody_creditmemo_so[0].value == itemColumns.custrecordcustrecord_pay_wal_sonumber[0].value){
                                log.debug({
                                    title: 'walmart销售订单',
                                    details: itemColumns.custrecordcustrecord_pay_wal_sonumber
                                });
                                refund.setCurrentSublistValue({
                                    sublistId: 'apply',
                                    line: i,
                                    fieldId: 'apply',
                                    value: true
                                });
                                refund.commitLine({sublistId:'apply', line:i});

                                var refundId = refund.save();
                                log.debug('paymentId',refundId);
                                var soId = itemColumns.custrecordcustrecord_pay_wal_sonumber[0].value;//销售订单号
                                var rec = record.load({
                                    type: 'customerrefund',
                                    id: refundId,
                                    isDynamic: true
                                });

                                var payments = rec.getValue('payment');
                                var aramount = memoTotal;
                                //付款编号回写亚马逊主表
                                var paymentNum = rec.getValue('tranid');

                                var status = null;
                                if(payments == aramount){
                                    status = '完全核销';
                                }else if(payments > aramount || payments < aramount){
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
                                        custrecord_refund:refundId,
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
                }
            } catch (e) {
                log.error({
                    title: 'netsuite error:' + value.id,
                    details: e.message + ',' + e.stack
                });
                record.submitFields({
                    type: 'customrecord_hx_pay_amz_payment',
                    id: value.id,
                    values: {
                        custbody_last_process_date: moment.utc().format('YYYY-MM-DD')
                    },
                });
            }
        }

        function reduce(context) {
            log.debug({
                title: 'context reduce',
                details: context
            });
        }
        function getStore(store_id){
            if(store_id){
                var rec = record.load({type:'customrecord_cseg_hx_fm_store',id:store_id});

                return {
                    "so_currency":rec.getValue('custrecord_currency'),
                    "location":rec.getValue('custrecord_hx_md_warehouse'),
                }
            }
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
                filters:[['custrecord_rm_store_customer','anyof',soData.customer]]
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
            // journal.setValue('custbody_sales_number',column.custrecord_pay_amz_sonumber[0].value);//销售订单号
            // journal.setValue('cseg_hx_fm_platfm',column.custrecord_hx_pay_amz_platform[0].value);//销售平台
            // journal.setValue('cseg_hx_fm_store',column.custrecord_hx_pay_amz_store[0].value);//销售店铺
            // journal.setText('trandate',column.custrecord_hx_pay_amz_createdate);//日期
            journal.setValue('approvalstatus',2);//审批状态,2
            journal.setValue('custbody_walmart_payment',payId);
            //获取销售店铺name
            //   var storeRec = record.load({type:'customrecord_cseg_hx_fm_store',id:column.custrecord_hx_pay_amz_store[0].value});
            //   var storeName = storeRec.getValue({fieldId:'name'});
            //    log.debug('storeName',storeName);

            // var itemColumns = search.lookupFields({
            //     type: 'customer',
            //     id: column.custrecord_hx_pay_amz_customer[0].value,
            //     columns: ['currency']
            // });
            // journal.setValue('currency',itemColumns.currency[0].value);
            // journal.setValue('custbody_hx_so_shoporder',column.custrecord_hx_shopnember);
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
            log.debug({
                      title: 'summary',
                      details: summary
            });
        }

        function initSearch() {
            var mySearch = search.load({id:'customsearch_cl_wal2cr'});
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