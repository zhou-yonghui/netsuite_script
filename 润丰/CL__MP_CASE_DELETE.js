/**
 * 定时处理垃圾邮件处理记录上垃圾邮箱关联的CASE记录
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 */
define(
    ['N/search', 'N/record', 'N/task','N/file','N/format','N/runtime'],
    function(search, record, task,file,format,runtime) {
        function getInputData() {
            var alls = [];
            var mySearch = initSearch();
            var res = mySearch.run().getRange({start:0,end:1000});
            log.debug('搜索结果数量',res.length);
            if(res.length){
                for(var i = 0;i < res.length;i++){
                    var tmp = new Object();
                    tmp.id = res[i].id;
                    alls[alls.length] = tmp;
                }
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
            var id = JSON.parse(context.value).id;
            try {
                var rec = record.load({type:'customrecord_rp_record_spam_handling',id:id,isDynamic:true});
                var email = rec.getValue('custrecord_rp_field_junk_mail');
                log.debug('eamilText',email);
                var mysearch = search.create({
                    type:'supportcase',
                    filters:[['email','is',email]],
                    columns:['internalid']
                });
                var res = mysearch.run().getRange({start: 0,end: 1000});
                log.debug('case个数',res.length);
                if(res.length > 0){
                    for(var i = 0;i < res.length;i++){
                        log.debug('要删除的case',res[i].getValue('internalid'));
                        record.delete({
                            type:'supportcase',
                            id:res[i].getValue('internalid')
                        });
                    }
                }
            } catch (e) {
                log.debug('垃圾邮件处理Id：'+id+'--删除邮件报错',e);
            }

            // var value = JSON.parse(context.value.id);
            // doRecord(value);
        }
        function reduce(context) {
            log.debug({
                title: 'context reduce',
                details: context
            });
            // doRecord(context.values[0]);
            // context.write({
            //     key:"irId",
            //     value: context.values[0]
            // });
        }
        function summarize(summary) {
            log.debug({
                title: 'summary',
                details: summary
            });
        }
        function doRecord(id) {
            log.debug('垃圾处理记录的id',id)
            var value = {};
            value.id = id;
            try {
                var rec = record.load({type:'customrecord_rp_record_spam_handling',id:id,isDynamic:true});
                var email = rec.getValue('custrecord_rp_field_junk_mail');
                log.debug('eamilText',email);
                var mysearch = search.create({
                    type:'supportcase',
                    filters:[['email','is',email]],
                    columns:['internalid']
                });
                var res = mysearch.run().getRange({start: 0,end: 1});
                if(res.length > 0){
                    for(var i = 0;i < res.length;i++){
                        log.debug('要删除的case',res[i].getValue('internalid'));
                        var delRec = record.delete({
                            type:'supportcase',
                            id:res[i].getValue('internalid')
                        });
                        log.debug('delRec',delRec);
                    }
                }
            } catch (e) {
                log.debug('垃圾邮件处理Id：'+id+'--删除邮件报错',e);
            }
        }
        function initSearch() {
            var mySearch = search.load({id:'customsearch_cl_delcase'});
            log.debug({
                title: 'mySearch',
                details: mySearch
            })
            return mySearch;
        }
        return {
            getInputData: getInputData,
            map: map,
            // reduce: reduce,
            // summarize: summarize
        };
    });