/**
 * 根据库存转移记录生成库存转移
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
                var columns = search.lookupFields({
                    type:'customrecord_sl_it_rec',
                    id:value.id,
                    columns:[
                        'custrecord_sl_start_location','custrecord_sl_end_location','custrecord_sl_item','custrecord_sl_change_num','custrecord_sl_yy_day'
                    ]
                });
                if(columns.custrecord_sl_yy_day > 0){
                    log.debug('columns.custrecord_sl_yy_day',columns.custrecord_sl_yy_day);
                    record.submitFields({
                        type:'customrecord_sl_it_rec',
                        id:value.id,
                        values:{
                            custrecord_sl_yy_day : Number(columns.custrecord_sl_yy_day) - Number(2),
                        }
                    });
                }
                else {
                    var it_rec = record.create({
                        type:'inventorytransfer',
                        isDynamic:true,
                    });
                    it_rec.setValue("location",columns.custrecord_sl_start_location[0].value);
                    it_rec.setValue('transferlocation',columns.custrecord_sl_end_location[0].value);
                    it_rec.setValue('department',3);//销售部
                    //明细
                    it_rec.selectLine('inventory',0);
                    it_rec.setCurrentSublistValue({
                        sublistId:'inventory',
                        fieldId:'item',
                        value:columns.custrecord_sl_item[0].value
                    });
                    it_rec.setCurrentSublistValue({
                        sublistId:'inventory',
                        fieldId:'adjustqtyby',
                        value:columns.custrecord_sl_change_num
                    });
                    it_rec.commitLine('inventory');

                    var it_id = it_rec.save();
                    log.debug('it_id',it_id);
                    if(it_id){
                        record.submitFields({
                            type:'customrecord_sl_it_rec',
                            id:value.id,
                            values:{
                                custrecord_sl_end_it : true,
                                custrecord_sl_wait_it: false,
                            }
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
                title: 'context',
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
            var mySearch = search.load({id:'customsearch_cl_create_it'});//库存转移记录
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