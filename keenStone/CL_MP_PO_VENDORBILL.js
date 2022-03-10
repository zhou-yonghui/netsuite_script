/**
 * 采购订单未开账自动开账单
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
            try{
                var vbRec = record.transform({
                    fromType: 'purchaseorder',
                    fromId: value.id,
                    toType: 'vendorbill',
                    isDynamic: true,
                });
                vbRec.setValue('approvalstatus',2);//已核准;
                var vbId = vbRec.save();
                log.debug('vbId',vbId);
            }
            catch (e){
                log.debug('开账错误',e);
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
            // var mySearch = search.load({id:'customsearch_cl_ir_novb'});
            var mySearch = search.load({id:'customsearch_unbill'});//
            // var mySearch = search.load({id:'customsearch249'});
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