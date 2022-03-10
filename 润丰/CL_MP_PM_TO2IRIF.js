/**
 *
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 */
define(
    ['N/search', 'N/record', 'N/task','N/file','N/format','N/runtime'],
    function(search, record, task,file,format,runtime) {
        function getInputData() {
            var alls = [];
            var mySearch = initSearch();
            mySearch.run().each(function(result){
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
            doRecord(value.id);
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
        function doRecord(id) {
            var value = {};
            value.id = id;
            try {
                var columns = search.lookupFields({
                    type:'customrecord_0831toorder',
                    id:value.id,
                    columns:['custrecord_toorder','custrecord_sku666','custrecord223','custrecord_date44','custrecord221','custrecord_date88','custrecord_777',
                    'custrecord222','custrecord_po'],
                });
                log.debug('columns',columns);
                //发货
                if(columns.custrecord221){
                    var ifRec = record.transform({
                        fromType:'transferorder',
                        fromId:columns.custrecord_toorder[0].value,
                        toType:'itemfulfillment',
                        isDynamic: true
                    });
                    log.debug('columns.custrecord_date44',columns.custrecord_date44);
                    ifRec.setValue('trandate',format.parse({value:columns.custrecord_date44,type:format.Type.DATE}));
                    ifRec.setValue('approvalstatus',2);//已核准
                    var count = ifRec.selectLine('item');
                    log.debug('count',count);
                    for(var i = 0;i < count;i++){
                        ifRec.selectLine('item',i);
                        var sku = ifRec.getCurrentSublistValue({
                            sublistId:'item',
                            fieldId:'item'
                        });
                        ifRec.setCurrentSublistValue({
                            sublistId:'item',
                            fieldId:'item',
                            value:columns.custrecord_sku666[0].value,
                        });
                        ifRec.setCurrentSublistValue({
                            sublistId:'item',
                            fieldId: 'location',
                            value:columns.custrecord223[0].value,
                        });
                        ifRec.setCurrentSublistValue({
                            sublistId:'item',
                            fieldId:'quantity',
                            value:columns.custrecord221,
                        });
                        ifRec.commitLine('item');
                    }
                    var ifRecId = ifRec.save({ignoreMandatoryFields:true});
                    log.debug('ifRecId',ifRecId);
                    if(ifRecId){
                        record.submitFields({
                            type:'customrecord_0831toorder',
                            id:value.id,
                            values:{
                                custrecord_678:true,
                            }
                        })
                    }
                }
                //收货
                else if(columns.custrecord222){
                    var irRec = record.transform({
                        fromType:'transferorder',
                        fromId:columns.custrecord_toorder[0].value,
                        toType:'itemreceipt',
                        isDynamic: true
                    });
                    irRec.setValue('trandate',format.parse({value:columns.custrecord_date88,type:format.Type.DATE}));
                    irRec.setValue('approvalstatus',2);//已核准
                    if(columns.custrecord_po[0].value){
                        log.debug('公司间PO',columns.custrecord_po);
                        irRec.setValue('custbody_cust_company_po',columns.custrecord_po[0].value);
                    }
                    irRec.selectLine('item',0);
                    irRec.setCurrentSublistValue({
                        sublistId:'item',
                        fieldId:'item',
                        value:columns.custrecord_sku666[0].value,
                    });
                    irRec.setCurrentSublistValue({
                        sublistId:'item',
                        fieldId: 'location',
                        value:columns.custrecord_777[0].value,
                    });
                    irRec.setCurrentSublistValue({
                        sublistId:'item',
                        fieldId:'quantity',
                        value:columns.custrecord222,
                    });
                    irRec.commitLine('item');
                    var irRecId = irRec.save({ignoreMandatoryFields:true});
                    log.debug('irRecId',irRecId);
                    if(irRecId){
                        record.submitFields({
                            type:'customrecord_0831toorder',
                            id:value.id,
                            values:{
                                custrecord_678:true,
                            }
                        })
                    }

                }
            } catch (e) {
                log.debug('报错',e);
            }
        }
        function initSearch() {
            var mySearch = search.load({id:'customsearch304'});//发货
            // var mySearch = search.load({id:'customsearch305'});//收货
            // var mySearch = search.create({
            //     type:'customrecord_0831toorder',
            //     filters:[['custrecord_toorder','noneof','@NONE@'],'AND',['custrecord_678','is',false]]
            // });
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