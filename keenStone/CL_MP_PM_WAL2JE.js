/**
 * 沃尔玛日记账
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 */
 define(
    ['N/search', 'N/record', './moment', 'N/task','N/file'],
    function(search, record, moment, task,file) {
        function getInputData() {
            // var alls = [];
            // var mySearch = initSearch();
            // mySearch.run().each(function(result){
            //     var tmp = new Object();
            //     tmp.id = result.id;
            //     alls[alls.length] = tmp;

            //     return true;
            // });

            // log.debug({
            //     title: 'alls',
            //     details: JSON.stringify(alls.length)
            // });
            // return alls;
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
            var flag;
            try {
                var itemColumns = search.lookupFields({
                    type: 'customrecord_walmart_payment',
                    id: value.id,
                    columns: ['custrecordcustrecord_pay_wal_sonumber','custrecord_customer','custrecord_wal_payable_partner_sale','custrecord_wal_walmart_order_number','custrecordcustrecord_hx_pay_wal_platform','custrecordcustrecord_hx_pay_wal_store',
                        'custrecord_wal_commission_from_sale','custrecord_wal_total_net_tax_collected','custrecord_wal_gross_sales_sevenue','custrecord_wal_transaction_type','custrecord_wal_net_fee_revenue','custrecord_wal_net_gift_wrap_revenue','custrecord_wal_net_shipping_revenue']
                });
                // if(itemColumns.custrecordcustrecord_pay_wal_sonumber[0].value){
                    //判断交易类型
                    if(itemColumns.custrecord_wal_transaction_type == 'REFUNDED' || itemColumns.custrecord_wal_transaction_type == 'SALE'){
                        flag = '1';
                    }
                    else if(itemColumns.custrecord_wal_transaction_type == 'ADJMNT'){
                        flag = '2';
                    }
                    else if(itemColumns.custrecord_wal_transaction_type == 'Service Fee' || itemColumns.custrecord_wal_transaction_type == '广告费'){
                        flag = '3';
                    }
                    //
                    var soId = itemColumns.custrecordcustrecord_pay_wal_sonumber[0].value;
                    //获取店铺对应的科目id
                    // var soData = getSo(soId);
                    var customer = itemColumns.custrecord_customer[0].value;
                    // var bankSubId = subsidiary(customer);
                    // log.debug("bankSubId",bankSubId);      
                    //创建日记账
                    var journalId = createJournal(itemColumns,flag,customer,value.id);
                    log.debug('journalId',journalId);
                    record.submitFields({
                        type: 'customrecord_walmart_payment',
                        id: value.id,
                        values: {
                            custrecordcustrecord_hx_expense_je: journalId,
                        },
                    });    
                // }
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
        function getCustomer(customer,currency){
            var customerData = {};
            var rec = record.load({type:'customer',id:customer});
            // var subid = rec.getValue({fieldId:'custentityrm_collection_account'});
            var zhandian = rec.getValue('custentitycseg_hx_fm_country');
            var account = rec.getValue('custentityrm_collection_account');
            var subsidiary = rec.getValue('subsidiary');
            customerData.account = account;
            customerData.zhandian = zhandian;
            customerData.subsidiary = subsidiary;
            return customerData;
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
        function getStore(store_id){
            if(store_id){
                var rec = record.load({type:'customrecord_cseg_hx_fm_store',id:store_id});

                return {
                    "so_currency":rec.getValue('custrecord_currency'),
                }
            }
        }
        function createJournal(column,flag,customer,payId){
            var journal = record.create({
                type: 'journalentry',
                isDynamic: true
            })
            journal.setValue('subsidiary',getCustomer(customer).subsidiary);
            journal.setValue('currency',getStore(column.custrecordcustrecord_hx_pay_wal_store[0].value).so_currency);
            journal.setValue('approvalstatus',2);//审批状态,2
            journal.setValue('custbody_ly_walmart_payment',payId);

            if(flag == '1'){
                for(var i = 0;i < 10;i++) {
                    journal.selectNewLine('line');
                    if (i == 0 && column.custrecord_wal_commission_from_sale != 0 && column.custrecord_wal_commission_from_sale != '') {
                        log.debug('1458 dr',column.custrecord_wal_commission_from_sale);
                        journal.setCurrentSublistValue('line', 'account', 1458); //销售费用：销售佣金
                        journal.setCurrentSublistValue('line', 'debit', column.custrecord_wal_commission_from_sale);
                        journal.setCurrentSublistValue('line', 'cseg_hx_fm_platfm', column.custrecordcustrecord_hx_pay_wal_platform[0].value);//销售平台
                        journal.setCurrentSublistValue('line', 'cseg_hx_fm_store', column.custrecordcustrecord_hx_pay_wal_store[0].value);//销售店铺
                        journal.setCurrentSublistValue('line', 'entity', customer);
                        journal.commitLine('line');
                    }
                    else if(i == 1 && column.custrecord_wal_commission_from_sale != 0 && column.custrecord_wal_commission_from_sale != 0){
                        log.debug('122 cr',column.custrecord_wal_commission_from_sale);
                        journal.setCurrentSublistValue('line', 'account',122);//
                        journal.setCurrentSublistValue('line','credit',column.custrecord_wal_commission_from_sale);
                        journal.setCurrentSublistValue('line', 'cseg_hx_fm_platfm', column.custrecordcustrecord_hx_pay_wal_platform[0].value);//销售平台
                        journal.setCurrentSublistValue('line', 'cseg_hx_fm_store', column.custrecordcustrecord_hx_pay_wal_store[0].value);//销售店铺
                        journal.setCurrentSublistValue('line', 'entity', customer);
                        journal.commitLine('line');
                    }
                    else if(i == 2 && column.custrecord_wal_total_net_tax_collected != 0 && column.custrecord_wal_total_net_tax_collected != 0){
                        log.debug('591 dr',column.custrecord_wal_total_net_tax_collected);
                        journal.setCurrentSublistValue('line', 'account',591);//应交税费：应交销售税
                        journal.setCurrentSublistValue('line','debit',column.custrecord_wal_total_net_tax_collected);
                        journal.setCurrentSublistValue('line', 'cseg_hx_fm_platfm', column.custrecordcustrecord_hx_pay_wal_platform[0].value);//销售平台
                        journal.setCurrentSublistValue('line', 'cseg_hx_fm_store', column.custrecordcustrecord_hx_pay_wal_store[0].value);//销售店铺
                        journal.commitLine('line');
                    }
                    else if(i == 3 && column.custrecord_wal_total_net_tax_collected != 0 && column.custrecord_wal_total_net_tax_collected != 0){
                        log.debug('122 cr',column.custrecord_wal_total_net_tax_collected);
                        journal.setCurrentSublistValue('line', 'account',122);//应收账款：非关联方
                        journal.setCurrentSublistValue('line','credit',column.custrecord_wal_total_net_tax_collected);
                        journal.setCurrentSublistValue('line', 'cseg_hx_fm_platfm', column.custrecordcustrecord_hx_pay_wal_platform[0].value);//销售平台
                        journal.setCurrentSublistValue('line', 'cseg_hx_fm_store', column.custrecordcustrecord_hx_pay_wal_store[0].value);//销售店铺
                        journal.setCurrentSublistValue('line', 'entity', customer);
                        journal.commitLine('line');
                    }
                    else if(i == 4 && column.custrecord_wal_total_net_tax_collected != 0 && column.custrecord_wal_total_net_tax_collected != 0){
                        log.debug('122 dr',column.custrecord_wal_total_net_tax_collected);
                        journal.setCurrentSublistValue('line', 'account',122);//应交税费：应交销售税
                        journal.setCurrentSublistValue('line','debit',column.custrecord_wal_total_net_tax_collected);
                        journal.setCurrentSublistValue('line', 'cseg_hx_fm_platfm', column.custrecordcustrecord_hx_pay_wal_platform[0].value);//销售平台
                        journal.setCurrentSublistValue('line', 'cseg_hx_fm_store', column.custrecordcustrecord_hx_pay_wal_store[0].value);//销售店铺
                        journal.setCurrentSublistValue('line', 'entity', customer);
                        journal.commitLine('line');
                    }
                    else if(i == 5 && column.custrecord_wal_total_net_tax_collected != 0 && column.custrecord_wal_total_net_tax_collected != 0){
                        log.debug('591 cr',column.custrecord_wal_total_net_tax_collected);
                        journal.setCurrentSublistValue('line', 'account',591);//应收账款：非关联方
                        journal.setCurrentSublistValue('line','credit',column.custrecord_wal_total_net_tax_collected);
                        journal.setCurrentSublistValue('line', 'cseg_hx_fm_platfm', column.custrecordcustrecord_hx_pay_wal_platform[0].value);//销售平台
                        journal.setCurrentSublistValue('line', 'cseg_hx_fm_store', column.custrecordcustrecord_hx_pay_wal_store[0].value);//销售店铺
                        journal.setCurrentSublistValue('line', 'entity', customer);
                        journal.commitLine('line');
                    }
                    else if(i == 6 && column.custrecord_wal_net_fee_revenue != 0 && column.custrecord_wal_net_fee_revenue != 0){
                        log.debug('122 dr',column.custrecord_wal_net_fee_revenue);
                        journal.setCurrentSublistValue('line', 'account',122);//应交税费：应交销售税
                        journal.setCurrentSublistValue('line','debit',column.custrecord_wal_net_fee_revenue);
                        journal.setCurrentSublistValue('line', 'cseg_hx_fm_platfm', column.custrecordcustrecord_hx_pay_wal_platform[0].value);//销售平台
                        journal.setCurrentSublistValue('line', 'cseg_hx_fm_store', column.custrecordcustrecord_hx_pay_wal_store[0].value);//销售店铺
                        journal.setCurrentSublistValue('line', 'entity', customer);
                        journal.commitLine('line');
                    }
                    else if(i == 7 && column.custrecord_wal_net_fee_revenue != 0 && column.custrecord_wal_net_fee_revenue != 0){
                        log.debug('1566 cr',column.custrecord_wal_net_fee_revenue);
                        journal.setCurrentSublistValue('line', 'account',1566);//
                        journal.setCurrentSublistValue('line','credit',column.custrecord_wal_net_fee_revenue);
                        journal.setCurrentSublistValue('line', 'cseg_hx_fm_platfm', column.custrecordcustrecord_hx_pay_wal_platform[0].value);//销售平台
                        journal.setCurrentSublistValue('line', 'cseg_hx_fm_store', column.custrecordcustrecord_hx_pay_wal_store[0].value);//销售店铺
                        journal.setCurrentSublistValue('line', 'entity', customer);
                        journal.commitLine('line');
                    }
                    else if(i == 8 && column.custrecord_wal_net_gift_wrap_revenue != 0 && column.custrecord_wal_net_gift_wrap_revenue != 0){
                        log.debug('122 dr',column.custrecord_wal_net_gift_wrap_revenue);
                        journal.setCurrentSublistValue('line', 'account',122);//应交税费：应交销售税
                        journal.setCurrentSublistValue('line','debit',column.custrecord_wal_net_gift_wrap_revenue);
                        journal.setCurrentSublistValue('line', 'cseg_hx_fm_platfm', column.custrecordcustrecord_hx_pay_wal_platform[0].value);//销售平台
                        journal.setCurrentSublistValue('line', 'cseg_hx_fm_store', column.custrecordcustrecord_hx_pay_wal_store[0].value);//销售店铺
                        journal.setCurrentSublistValue('line', 'entity', customer);
                        journal.commitLine('line');
                    }
                    else if(i == 9 && column.custrecord_wal_net_gift_wrap_revenue != 0 && column.custrecord_wal_net_gift_wrap_revenue != 0){
                        log.debug('600 cr',column.custrecord_wal_net_gift_wrap_revenue);
                        journal.setCurrentSublistValue('line', 'account',600);//
                        journal.setCurrentSublistValue('line','credit',column.custrecord_wal_net_gift_wrap_revenue);
                        journal.setCurrentSublistValue('line', 'cseg_hx_fm_platfm', column.custrecordcustrecord_hx_pay_wal_platform[0].value);//销售平台
                        journal.setCurrentSublistValue('line', 'cseg_hx_fm_store', column.custrecordcustrecord_hx_pay_wal_store[0].value);//销售店铺
                        journal.setCurrentSublistValue('line', 'entity', customer);
                        journal.commitLine('line');
                    }
                    // else if(i == 10 && column.custrecord_wal_net_shipping_revenue != 0 && column.custrecord_wal_net_shipping_revenue != 0){
                    //     log.debug('122 dr',column.custrecord_wal_net_shipping_revenue);
                    //     journal.setCurrentSublistValue('line', 'account',122);//应交税费：应交销售税
                    //     journal.setCurrentSublistValue('line','debit',column.custrecord_wal_net_shipping_revenue);
                    //     journal.setCurrentSublistValue('line', 'cseg_hx_fm_platfm', column.custrecordcustrecord_hx_pay_wal_platform[0].value);//销售平台
                    //     journal.setCurrentSublistValue('line', 'cseg_hx_fm_store', column.custrecordcustrecord_hx_pay_wal_store[0].value);//销售店铺
                    //     journal.setCurrentSublistValue('line', 'entity', customer);
                    //     journal.commitLine('line');
                    // }
                    // else if(i == 11 && column.custrecord_wal_net_shipping_revenue != 0 && column.custrecord_wal_net_shipping_revenue != 0){
                    //     log.debug('602 cr',column.custrecord_wal_net_shipping_revenue);
                    //     journal.setCurrentSublistValue('line', 'account',602);//
                    //     journal.setCurrentSublistValue('line','credit',column.custrecord_wal_net_shipping_revenue);
                    //     journal.setCurrentSublistValue('line', 'cseg_hx_fm_platfm', column.custrecordcustrecord_hx_pay_wal_platform[0].value);//销售平台
                    //     journal.setCurrentSublistValue('line', 'cseg_hx_fm_store', column.custrecordcustrecord_hx_pay_wal_store[0].value);//销售店铺
                    //     journal.setCurrentSublistValue('line', 'entity', customer);
                    //     journal.commitLine('line');
                    // }
                }
                // journal.setCurrentSublistValue('line', 'cseg_hx_fm_platfm', column.custrecord_hx_pay_amz_platform[0].value);//销售平台
                // journal.setCurrentSublistValue('line', 'cseg_hx_fm_store', column.custrecord_hx_pay_amz_store[0].value);//销售店铺
            }
            else if(flag == "2"){
                for(var i = 0;i < 2;i++) {
                    journal.selectNewLine('line');
                    if (i == 0 && column.custrecord_wal_payable_partner_sale != 0 && column.custrecord_wal_payable_partner_sale != '') {
                        log.debug('122 dr',column.custrecord_wal_payable_partner_sale);
                        journal.setCurrentSublistValue('line', 'account', 122); 
                        journal.setCurrentSublistValue('line', 'debit', column.custrecord_wal_payable_partner_sale);
                        journal.setCurrentSublistValue('line', 'entity', customer);
                        journal.setCurrentSublistValue('line', 'cseg_hx_fm_platfm', column.custrecordcustrecord_hx_pay_wal_platform[0].value);//销售平台
                        journal.setCurrentSublistValue('line', 'cseg_hx_fm_store', column.custrecordcustrecord_hx_pay_wal_store[0].value);//销售店铺
                        journal.commitLine('line');
                    }
                    else if(i == 1 && column.custrecord_wal_payable_partner_sale != 0 && column.custrecord_wal_payable_partner_sale != 0){
                        log.debug('1458 cr',column.custrecord_wal_payable_partner_sale);
                        journal.setCurrentSublistValue('line', 'account',1458);//
                        journal.setCurrentSublistValue('line','credit',column.custrecord_wal_payable_partner_sale);
                        journal.setCurrentSublistValue('line', 'entity', customer);
                        journal.setCurrentSublistValue('line', 'cseg_hx_fm_platfm', column.custrecordcustrecord_hx_pay_wal_platform[0].value);//销售平台
                        journal.setCurrentSublistValue('line', 'cseg_hx_fm_store', column.custrecordcustrecord_hx_pay_wal_store[0].value);//销售店铺
                        journal.commitLine('line');
                    }
                }
            }
            else if(flag == '3'){
                for(var i = 0;i < 2;i++) {
                    journal.selectNewLine('line');
                    if (i == 0 && column.custrecord_wal_payable_partner_sale != 0 && column.custrecord_wal_payable_partner_sale != '') {
                        log.debug('122 dr',column.custrecord_wal_payable_partner_sale);
                        journal.setCurrentSublistValue('line', 'account', 122); 
                        journal.setCurrentSublistValue('line', 'debit', column.custrecord_wal_payable_partner_sale);
                        journal.setCurrentSublistValue('line', 'entity', customer);
                        journal.setCurrentSublistValue('line', 'cseg_hx_fm_platfm', column.custrecordcustrecord_hx_pay_wal_platform[0].value);//销售平台
                        journal.setCurrentSublistValue('line', 'cseg_hx_fm_store', column.custrecordcustrecord_hx_pay_wal_store[0].value);//销售店铺
                        journal.commitLine('line');
                    }
                    else if(i == 1 && column.custrecord_wal_payable_partner_sale != 0 && column.custrecord_wal_payable_partner_sale != 0){
                        log.debug('1483 cr',column.custrecord_wal_payable_partner_sale);
                        journal.setCurrentSublistValue('line', 'account',1483);//
                        journal.setCurrentSublistValue('line','credit',column.custrecord_wal_payable_partner_sale);
                        journal.setCurrentSublistValue('line', 'entity', customer);
                        journal.setCurrentSublistValue('line', 'cseg_hx_fm_platfm', column.custrecordcustrecord_hx_pay_wal_platform[0].value);//销售平台
                        journal.setCurrentSublistValue('line', 'cseg_hx_fm_store', column.custrecordcustrecord_hx_pay_wal_store[0].value);//销售店铺
                        journal.commitLine('line');
                    }
                }
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
            var mySearch = search.load({id:'customsearch_journal_walmart'});
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