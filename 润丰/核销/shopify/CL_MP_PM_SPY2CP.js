/**
 * shopify付款核销
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 */
define(
    ['N/search', 'N/record', 'N/task','N/file','N/currency','N/format','N/runtime'],
    function(search, record, task,file,currencyRate,format,runtime) {
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
            while (results.length > 0 && j < 10) {
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
            var value = JSON.parse(context.value);
            try {
                var itemColumns = search.lookupFields({
                    type: 'customrecord_hx_pay_spf_payment',
                    id: value.id,
                    columns: ['custrecord_hx_pay_spf_source_order_id','custrecord_hx_pay_spf_store','custrecord_hx_pay_spf_source_type','custrecord_hx_pay_spf_currency','custrecord_hx_salesordercurrency',
                        'custrecord_hx_pay_spf_fee','custrecord_hx_pay_spf_customer','custrecord_hx_salesorderamount','custrecord_hx_pay_spf_totalamount','custrecord_hx_pay_spf_date']
                });
                log.debug('销售订单号',itemColumns.custrecord_hx_pay_spf_source_order_id);
                log.debug('销售币种',itemColumns.custrecord_hx_salesordercurrency);
                if(itemColumns.custrecord_hx_pay_spf_source_order_id[0].value){
                    var payment = record.create({
                        type: 'customerpayment',
                        isDynamic: true
                    });
                    payment.setValue('customer',itemColumns.custrecord_hx_pay_spf_customer[0].value);
                    // payment.setValue('account',122);
                    if(itemColumns.custrecord_hx_pay_spf_currency[0].text != itemColumns.custrecord_hx_salesordercurrency){
                        if(itemColumns.custrecord_hx_salesorderamount){
                            payment.setValue('payment',itemColumns.custrecord_hx_salesorderamount);//支付金额，销售金额
                        }
                    }else{
                        if(itemColumns.custrecord_hx_pay_spf_totalamount){
                            payment.setValue('payment',itemColumns.custrecord_hx_pay_spf_totalamount);//支付金额，总金额
                        }
                    }
                    var flage = 0;
                    payment.setValue('approvalstatus',2);
                    payment.setValue('custbody_ly_shopify_payment',value.id);//来源shopify
                    payment.setText('currency',itemColumns.custrecord_hx_salesordercurrency);//订单币种
                    var count = payment.getLineCount('apply');
                    log.debug('count',count);
                    if(count > 0){
                        var mysearch = search.create({
                            type:'invoice',
                            columns:['internalid'],
                            filters:[['createdfrom','anyof',itemColumns.custrecord_hx_pay_spf_source_order_id[0].value]]
                        });
                        var res = mysearch.run().getRange({start:0,end:1});
                        log.debug('发票上搜索结果',res);
                        log.debug('初始化map点数',runtime.getCurrentScript().getRemainingUsage());
                        for(var i = 0;i < count;i++){
                            payment.selectLine('apply',i);
                            var type = payment.getCurrentSublistValue({
                                sublistId:'apply',
                                fieldId:'type',
                            });
                            log.debug('type',type);
                            if(type == 'Invoice' || type == '发票'){
                                var invId = payment.getCurrentSublistValue({
                                    sublistId: 'apply',
                                    fieldId:'internalid'
                                });
                                log.debug('invId',invId);
                                if(invId == res[0].getValue('internalid')){
                                    log.debug('inv',res[0].getValue('internalid'));
                                    payment.setCurrentSublistValue({
                                        sublistId:'apply',
                                        fieldId:'apply',
                                        value:true
                                    });
                                }
                            }
                            payment.commitLine('apply');
                        }
                        log.debug('for之后',runtime.getCurrentScript().getRemainingUsage());
                        var paymentId = payment.save();//{ignoreMandatoryFields:true}
                        log.debug('paymentId',paymentId);
                        record.submitFields({
                            type: 'customrecord_hx_pay_spf_payment',
                            id: value.id,
                            values: {
                                custrecord_hx_payorder: paymentId,
                            },
                        });
                        log.debug('准备创建日记账点数',runtime.getCurrentScript().getRemainingUsage());
                        //创建日记账
                        var journalIdArr = [];
                        var journalIdOne;
                        var journalIdTwo;
                        var rate;
                        if(itemColumns.custrecord_hx_pay_spf_currency[0].text != itemColumns.custrecord_hx_salesordercurrency){
                            rate = exChangeRate(itemColumns.custrecord_hx_salesordercurrency,format.parse({value:itemColumns.custrecord_hx_pay_spf_date,type:format.Type.DATE}));
                            log.debug('rate',rate);
                            if(itemColumns.custrecord_hx_pay_spf_currency[0].text == 'USD' && itemColumns.custrecord_hx_salesordercurrency[0].text != 'USD'){
                                journalIdOne = createJournal(itemColumns,value.id,itemColumns.custrecord_hx_salesordercurrency,'diffSo',rate);//销售订单币种日记账
                                journalIdTwo = createJournal(itemColumns,value.id,itemColumns.custrecord_hx_pay_spf_currency[0].text,'diffPay',rate);//payment币种日记账
                            }else {
                                journalIdOne = createJournal(itemColumns,value.id,itemColumns.custrecord_hx_salesordercurrency,'soCurr',rate);//销售订单币种日记账
                                journalIdTwo = createJournal(itemColumns,value.id,itemColumns.custrecord_hx_pay_spf_currency[0].text,'payCurr',rate);//payment币种日记账
                            }
                            journalIdArr.push(journalIdOne,journalIdTwo);
                        }
                        log.debug('journalIdArr',journalIdArr);
                        record.submitFields({
                            type: 'customrecord_hx_pay_spf_payment',
                            id: value.id,
                            values: {
                                custrecord_journalpay: journalIdArr,
                            },
                        });
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
                title: 'context reduce',
                details: context
            });
        }
        function createJournal(column,payId,currency,flag,rate){
            var journal = record.create({
                type: 'journalentry',
                isDynamic: true
            })
            //获取so上公司id
            var soId = column.custrecord_hx_pay_spf_source_order_id[0].value;
            var soCol = search.lookupFields({
                type:'salesorder',
                id:soId,
                columns:['subsidiary'],
            });
            log.debug('subid',soCol.subsidiary[0].value);
            journal.setValue('subsidiary',soCol.subsidiary[0].value);
            journal.setValue('approvalstatus',2);//审批状态,2
            journal.setValue('custbody_ly_shopify_payment',payId);//来源shopify
            journal.setValue('trandate',format.parse({value:column.custrecord_hx_pay_spf_date,type:format.Type.DATE}));//日期
            if(flag == 'soCurr' || flag == 'diffPay'){
                journal.setText('currency',currency);
            }else if(flag == 'payCurr'){
                var soRateAmo = Number(rate) * Number(column.custrecord_hx_salesorderamount);
                log.debug('销售金额换算后',soRateAmo);
                journal.setText('currency',currency);
                journal.setValue('exchangerate',Number(soRateAmo)/Number(column.custrecord_hx_pay_spf_totalamount));//汇率;
            }else if(flag == 'diffSo'){
                journal.setText('currency',currency);
                journal.setValue('exchangerate',Number(column.custrecord_hx_pay_spf_totalamount)/Number(column.custrecord_hx_salesorderamount));//汇率;
            }
            if(flag == 'soCurr' || flag == 'diffSo'){
                log.debug('soCurr');
                for(var i = 0;i < 2;i++) {
                    journal.selectNewLine('line');
                    if (i == 0 && column.custrecord_hx_salesorderamount != 0 && column.custrecord_hx_salesorderamount != '') {
                        log.debug('dr 122',column.custrecord_hx_salesorderamount);
                        // journal.setCurrentSublistValue('line', 'account', 1165);//todo:测试环境
                        journal.setCurrentSublistValue('line', 'account', 1190);//todo:正式环境
                        journal.setCurrentSublistValue('line', 'debit', column.custrecord_hx_salesorderamount);
                        journal.commitLine('line');
                    } else if (i == 1 && column.custrecord_hx_salesorderamount != 0 && column.custrecord_hx_salesorderamount != '') {
                        log.debug('cr 1047',column.custrecord_hx_salesorderamount);
                        journal.setCurrentSublistValue('line', 'account', 122);
                        journal.setCurrentSublistValue('line', 'credit', column.custrecord_hx_salesorderamount);
                        journal.setCurrentSublistValue('line','cseg_hx_fm_store',column.custrecord_hx_pay_spf_store[0].value);
                        journal.commitLine('line');
                    }
                }
            }else if(flag == 'payCurr' || flag == 'diffPay'){
                for(var j = 0;j < 2;j++) {
                    journal.selectNewLine('line');
                    if (j == 0 && column.custrecord_hx_pay_spf_totalamount != 0 && column.custrecord_hx_pay_spf_totalamount != '') {
                        log.debug('dr 122',column.custrecord_hx_pay_spf_totalamount);
                        journal.setCurrentSublistValue('line', 'account', 122);
                        journal.setCurrentSublistValue('line', 'debit', column.custrecord_hx_pay_spf_totalamount);
                        journal.setCurrentSublistValue('line','cseg_hx_fm_store',column.custrecord_hx_pay_spf_store[0].value);
                        journal.commitLine('line');
                    } else if (j == 1 && column.custrecord_hx_pay_spf_totalamount != 0 && column.custrecord_hx_pay_spf_totalamount != '') {
                        log.debug('cr 1190',column.custrecord_hx_pay_spf_totalamount);
                        // journal.setCurrentSublistValue('line', 'account', 1165);//todo:测试环境
                        journal.setCurrentSublistValue('line', 'account', 1190);//todo:正式环境
                        journal.setCurrentSublistValue('line', 'credit', column.custrecord_hx_pay_spf_totalamount);
                        journal.commitLine('line');
                    }
                }
            }
            var journalId = journal.save();

            return journalId;
        }
        function exChangeRate(soCurr,journal_date){
            if(soCurr){
                var rate = currencyRate.exchangeRate({
                    source:soCurr,
                    target:'USD',
                    date:journal_date,
                });
                return rate;
            }
        }
        function summarize(summary) {
            log.debug({
                title: 'summary',
                details: summary
            });
        }

        function initSearch() {
            var mySearch = search.load({id:'customsearch_shopify_pay'});
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