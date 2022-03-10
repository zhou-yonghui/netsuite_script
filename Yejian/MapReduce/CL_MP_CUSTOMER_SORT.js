/**
 * 客户统计排名表定时刷新
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
            var value = JSON.parse(context.value);
            var sum_amount = Number(0);
            try {
                var all_so_search = search.create({
                    type:'salesorder',
                    filters:[
                        ['mainline','is',true],
                        'AND',['status','anyof',['SalesOrd:G', 'SalesOrd:F']],         //已开票，未开票
                        'AND',['entity','is',value.id]
                    ],
                    columns:[
                        'custbody_sl_soamm',//回款金额
                    ]
                });
                var all_so_res = all_so_search.run().getRange(0,1000);
                log.debug('all_so_res',JSON.stringify(all_so_res));
                if(all_so_res.length > 0){
                    for(var i = 0;i < all_so_res.length;i++){
                        var hk_amount = all_so_res[i].getValue('custbody_sl_soamm');
                        if(hk_amount){
                            sum_amount += Number(hk_amount);
                        }
                        else {
                            sum_amount += Number(0);
                        }
                    }
                }
                log.debug('sum_amount',sum_amount);
                //传递信息到reduce汇总
                context.write({
                    key:value.id,
                    value:sum_amount,
                });
                
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

            context.write({
                key:context.key,
                value:context.values,
            });
        }
        function summarize(summary) {
            log.debug({
                title: 'summary',
                details: summary
            });
            summary.output.iterator().each(function (key,value){
                log.debug('key value','key: ' + key + ' / value: ' + value);
            });
        }

        function initSearch() {
            var mySearch = search.load({id:'customsearch_cl_cus_sort'});//客户排名统计表
            log.debug({
                title: 'mySearch',
                details: mySearch
            });
            return mySearch;
        }
        return {
            getInputData: getInputData,
            map: map,
            reduce: reduce,
            summarize: summarize
        };
    });