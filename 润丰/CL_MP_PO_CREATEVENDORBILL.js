/**
 * 未开账此采购生成账单
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 */
define(
    ['N/search', 'N/record', 'N/task','N/file','N/format','N/runtime'],
    function(search, record, task,file,format,runtime) {
        function getInputData() {
            var alls = [];
            var mySearch = initSearch();
            var col = mySearch.columns;
            var res = mySearch.run().getRange({start:0,end:1000});
            log.debug('搜索结果数量',res.length);
            if(res.length){
                for(var i = 0;i < res.length;i++){
                    // var results = res[i].getValue('internalid');
                    // log.debug('result',results);
                    var tmp = new Object();
                    tmp.id = res[i].id;
                    tmp.soId = res[i].getValue(col[0]);
                    alls[alls.length] = tmp;
                }
            }
            // mySearch.run().each(function(result){
            //     var results = result.id;
            //     log.debug('result',results);
            //     log.debug('id',result.id);
            //     var tmp = new Object();
            //     tmp.id = results;
            //     alls[alls.length] = tmp;
            //
            //     return true;
            // });

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
            doRecord(value);
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
        function doRecord(value) {
            var values = {};
            values.soId = value.soId;
            try {
                var poId = record.load({type:'salesorder',id:values.soId,isDynamic:true}).getValue('intercotransaction');
                if(poId){
                    var vendorRec = record.transform({fromType:'purchaseorder',fromId:poId,toType:'vendorbill',isDynamic: true});
                    //润米正式环境添加
                    vendorRec.setValue('trandate',format.parse({type:format.Type.DATE,value:'28/2/2022'}));//日期
                    vendorRec.setValue('approvalstatus',2);//已核准
                    var vendorRecId = vendorRec.save({ignoreMandatoryFields:true});
                    log.debug('vendorRecId',vendorRecId);
                }
            } catch (e) {
                log.debug('生成账单报错',e);
            }
        }
        function initSearch() {
            var mySearch = search.load({id:'customsearch533'});
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