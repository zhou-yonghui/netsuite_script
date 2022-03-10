/**
 * shopify生成日记账
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 */
define(
    ['N/search', 'N/record', 'N/task','N/file','N/format'],
    function(search, record, task,file,format) {
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
                    type: 'customrecord_hx_pay_spf_payment',
                    id: value.id,
                    columns: ['custrecord_hx_pay_spf_source_order_id','custrecord_hx_pay_spf_store','custrecord_hx_pay_spf_date','custrecord_hx_pay_spf_source_type','custrecord_hx_pay_spf_currency','custrecord_hx_salesordercurrency',
                        'custrecord_hx_pay_spf_fee']
                });
                log.debug('销售订单号',itemColumns.custrecord_hx_pay_spf_source_order_id);
                if(itemColumns.custrecord_hx_pay_spf_source_order_id[0].value){
                    var payment = record.create({
                        type: 'customerpayment',
                        isDynamic: true
                    });
                    /**创建日记账*/
                    var flage = 0;
                    var type = itemColumns.custrecord_hx_pay_spf_source_type[0].text;
                    var journalId;
                    var currency = itemColumns.custrecord_hx_pay_spf_currency[0].text;
                    journalId = createJournal(itemColumns,value.id,type,currency);
                    log.debug('journalId',journalId);
                    record.submitFields({
                        type: 'customrecord_hx_pay_spf_payment',
                        id: value.id,
                        values:{
                            custrecordhx_expenseje: journalId,
                        }
                    });
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
        function createJournal(column,payId,type,currency){
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
            journal.setValue('trandate',format.parse({value:column.custrecord_hx_pay_spf_date,type:format.Type.DATE}));
            log.debug('currency',currency);
            journal.setText('currency',currency);
            journal.setValue('custbody_ly_shopify_payment',payId);//来源shopify
            if(type == 'payout'){
                for(var i = 0;i < 2;i++) {
                    journal.selectNewLine('line');
                    var bankSub = getStore(column.custrecord_hx_pay_spf_store[0].value);
                    if (i == 0 && column.custrecord_hx_pay_spf_fee != 0 && column.custrecord_hx_pay_spf_fee != '' && bankSub) {
                        log.debug('dr account:' + bankSub,-column.custrecord_hx_pay_spf_fee);
                        journal.setCurrentSublistValue('line', 'account', bankSub);
                        journal.setCurrentSublistValue('line', 'debit', -column.custrecord_hx_pay_spf_fee);
                        journal.commitLine('line');
                    } else if (i == 1 && column.custrecord_hx_pay_spf_fee != 0 && column.custrecord_hx_pay_spf_fee != '' && bankSub) {
                        log.debug('cr 122',-column.custrecord_hx_pay_spf_fee);
                        journal.setCurrentSublistValue('line', 'account', 122);
                        journal.setCurrentSublistValue('line', 'credit', -column.custrecord_hx_pay_spf_fee);
                        journal.setCurrentSublistValue('line','cseg_hx_fm_store',column.custrecord_hx_pay_spf_store[0].value);
                        journal.setCurrentSublistValue('line','custcol_cseg_cn_cfi',1);//销售商品、提供劳务收到的现金
                        journal.commitLine('line');
                    }
                }
            }
            else {
                for(var j = 0;j < 2;j++) {
                    journal.selectNewLine('line');
                    if (j == 0 && column.custrecord_hx_pay_spf_fee != 0 && column.custrecord_hx_pay_spf_fee != '') {
                        log.debug('dr 122',-column.custrecord_hx_pay_spf_fee);
                        journal.setCurrentSublistValue('line', 'account', 122);
                        journal.setCurrentSublistValue('line', 'debit', -column.custrecord_hx_pay_spf_fee);
                        journal.setCurrentSublistValue('line','cseg_hx_fm_store',column.custrecord_hx_pay_spf_store[0].value);
                        journal.commitLine('line');
                    } else if (j == 1 && column.custrecord_hx_pay_spf_fee != 0 && column.custrecord_hx_pay_spf_fee != '') {
                        log.debug('cr 708',-column.custrecord_hx_pay_spf_fee);
                        // journal.setCurrentSublistValue('line', 'account', 1047);//todo:测试环境
                        journal.setCurrentSublistValue('line', 'account', 708);//todo:正式环境
                        journal.setCurrentSublistValue('line', 'credit', -column.custrecord_hx_pay_spf_fee);
                        journal.setCurrentSublistValue('line','cseg_hx_fm_store',column.custrecord_hx_pay_spf_store[0].value);
                        journal.commitLine('line');
                    }
                }
            }
            var journalId = journal.save();

            return journalId;
        }
        function getStore(storeId){
            if(storeId){
                var rec = record.load({
                    type:'customrecord_cseg_hx_fm_store',
                    id:storeId,
                    isDynamic:true,
                });
                var bankSub = rec.getValue('custrecord_store_bank_subject');
                return bankSub;
            }
        }
        function getCustomer(customer,currency){
            var customerData = {};
            var rec = record.load({type:'customer',id:customer});
            // var subid = rec.getValue({fieldId:'custentityrm_collection_account'});
            var zhandian = rec.getValue('custentitycseg_hx_fm_country');
            var account = rec.getValue('custentityrm_collection_account');
            customerData.account = account;
            customerData.zhandian = zhandian;
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
        function summarize(summary) {
            log.debug({
                title: 'summary',
                details: summary
            });
        }

        function initSearch() {
            var mySearch = search.load({id:'customsearch_shopify_journal'});
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