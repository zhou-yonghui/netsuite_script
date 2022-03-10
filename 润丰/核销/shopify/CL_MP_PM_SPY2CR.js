/**
 * shopify退款核销
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 */
 define(
    ['N/search', 'N/record', 'N/task','N/file'],
    function(search, record, task,file) {
        function getInputData() {
            var alls = [];
            var mySearch = initSearch();
            mySearch.run().each(function(result){
                // var results = result.getValue({name:'internalid'});
                var tmp = new Object();
                tmp.id = result.id;
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
                    columns: ['custrecord_hx_pay_spf_source_order_id','custrecord_hx_pay_spf_store','custrecord_hx_pay_spf_source_type','custrecord_hx_pay_spf_currency','custrecord_hx_salesordercurrency',
                        'custrecord_hx_pay_spf_fee','custrecord_hx_pay_spf_customer','custrecord_hx_salesorderamount','custrecord_hx_pay_spf_totalamount','custrecord_hx_pay_spf_cmnumber']
                });
                if(itemColumns.custrecord_hx_pay_spf_source_order_id[0].value){
                    var refund = record.create({
                        type: 'customerrefund',
                        isDynamic: true
                    });
                    refund.setValue('customer',itemColumns.custrecord_hx_pay_spf_customer[0].value);
                    refund.setText('currency',itemColumns.custrecord_hx_pay_spf_currency[0].text);//pay币种
                    refund.setValue('account',122);//应收账款：非关联方
                    // refund.setValue('location',soData.location);//仓库
                    refund.setValue('custbody_ly_shopify_payment',value.id);//来源shopify
                    var flage = 0;
                    refund.setValue('approvalstatus',2);
                    var count = refund.getLineCount('apply');
                    log.debug('count',count);
                    if(count>0){
                        for (var i = 0; i < count; i++) {
                            var item = new Object();
                            refund.selectLine({sublistId:'apply', line: i});
                            item.id = refund.getCurrentSublistValue({
                                sublistId: 'apply',
                                fieldId: 'internalid'
                            });
                            item.trantype = refund.getCurrentSublistValue({
                                sublistId:'apply',
                                fieldId:'trantype'
                            });
                            var results;
                            var column;
                            log.debug('trantype internalid',item.trantype + '---' + item.id);
                            log.debug('cmnumber',itemColumns.custrecord_hx_pay_spf_cmnumber);
                            if(item.trantype == 'CustCred' && item.id == itemColumns.custrecord_hx_pay_spf_cmnumber[0].value){
                                refund.setCurrentSublistValue({
                                    sublistId: 'apply',
                                    fieldId: 'apply',
                                    value: true
                                });
                                refund.commitLine({sublistId:'apply'});
                            }
                        }
                        var refundId = refund.save({ignoreMandatoryFields:true});
                        log.debug('refundId',refundId);
                        record.submitFields({
                            type: 'customrecord_hx_pay_spf_payment',
                            id: value.id,
                            values: {
                                custrecord_refundshopify:refundId
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
            context.write({
                key:'shopifypaymentId',
                value: value.id,
            });
        }

        function reduce(context) {
            log.debug({
                title: 'context reduce',
                details: context
            });
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
            soData.location = locationSo;
            // var mySearch = search.create({
            //     type:'customrecord_cseg_hx_fm_store',
            //     columns:['internalid','custrecord_hx_md_warehouse'],
            //     filters:[['custrecord_cs_store_customer','anyof',soData.customer]]
            // });
            // var res = mySearch.run().getRange({start: 0,end: 1000});
            // for(var i = 0;i < res.length;i++){
            //     var storeId = res[i].getValue('internalid');
            //     var location = res[i].getValue('custrecord_hx_md_warehouse');
            //     soData.location = location;
            // }
            return soData;
        }
        function summarize(summary) {
            log.debug({
                      title: 'summary',
                      details: summary
            });
        }
        function initSearch() {
            var mySearch = search.load({id:'customsearch_hx_shopify_refund'});
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