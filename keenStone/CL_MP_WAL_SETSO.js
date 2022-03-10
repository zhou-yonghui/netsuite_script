/**
 * 沃尔玛缺失销售订单补齐
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
                // log.debug('paymentid',results);
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
                title:'context map',
                details:context,
            });
            var value = JSON.parse(context.value);
            try{
                var columns = search.lookupFields({
                    type:'customrecord_walmart_payment',
                    id:value.id,
                    columns:['custrecord_wal_purchase_order_number']
                });
                var storeNumber = columns.custrecord_wal_purchase_order_number;
                log.debug('storeNumber',storeNumber);
                if(storeNumber){
                    var mysearch = search.create({
                        type:'salesorder',
                        columns:['internalid'],
                        filters:[['custbody_hx_so_shoporder','is',storeNumber]]
                    });
                    var res = mysearch.run().getRange({start:0,end:1});
                    log.debug('存在销售订单',res.length);
                    if(res.length > 0){
                        var soId = res[0].getValue('internalid');
                        record.submitFields({
                            type: 'customrecord_walmart_payment',
                            id: value.id,
                            values:{
                                custrecordcustrecord_pay_wal_sonumber:soId,
                            }
                        })
                    }
                }
            }
            catch(e){
                log.debug('错误信息',e);
            }
        }
        function reduce(context) {
            log.debug({
                title: 'context reduce',
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
            var mySearch = search.load({id:'customsearch_cl_mp_wal_noso'});
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