/**
 * 沃尔玛payment生成贷项通知单
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 */
 define(
    ['N/search', 'N/record', './moment', 'N/task','N/file'],
    function(search, record, moment, task,file) {
        function getInputData(){
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
                title: 'context',
                details: context
            });
            var value = JSON.parse(context.value);
            try{
                var columns = search.lookupFields({
                    type: 'customrecord_walmart_payment',
                    id: value.id,
                    columns:['custrecordcustrecord_pay_wal_sonumber','custrecord_customer','custrecordcustrecord_hx_pay_wal_store','custrecord_wal_partner_item_id','custrecord_wal_refunded_retail_sales','custrecord_wal_shipped_qty']
                });
                var nsSku = getSku(columns.custrecord_wal_partner_item_id);//sku映射表上店铺sku对应的nssku
                // var soData = getSo(columns.custrecordcustrecord_pay_wal_sonumber[0].value);
                var store_date = getStore(columns.custrecordcustrecord_hx_pay_wal_store[0].value);
                log.debug('nssku store_date',nsSku + '===' + store_date);
                if(nsSku && store_date.so_currency){
                    if(columns.custrecord_wal_shipped_qty == 0 || columns.custrecord_wal_shipped_qty == ''){
                        columns.custrecord_wal_shipped_qty = Number(1);
                    }
                    /**创建贷项通知单*/
                    var memoRec = record.create({type:'creditmemo',isDynamic: true});
                    memoRec.setValue({fieldId:'entity',value:columns.custrecord_customer[0].value});
                    memoRec.setValue({fieldId:'location',value:store_date.location});
                    memoRec.setText({fieldId:'currency',text:store_date.so_currency});
                    memoRec.setValue({fieldId:'custbody_creditmemo_so',value:columns.custrecordcustrecord_pay_wal_sonumber[0].value});
                    memoRec.setValue({fieldId:'custbody_tuikuansku', value: nsSku});//退款SKU
                    memoRec.setValue({fieldId:'custbody_dianpusku', value: columns.custrecord_wal_partner_item_id});//店铺sku
                    memoRec.setValue({fieldId:'custbody_ly_walmart_payment', value: value.id});//来源PAYMENT
                    for(var i = 0;i < 1;i++){
                        log.debug('for in');
                        memoRec.selectNewLine('item');
                        memoRec.setCurrentSublistValue({
                            sublistId:'item',
                            fieldId:'item',
                            value:15542             //退款货品
                        });
                        var rate = Math.abs(Number(columns.custrecord_wal_refunded_retail_sales));
                        log.debug('rate',rate);
                        memoRec.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'rate',
                            value: rate/Number(columns.custrecord_wal_shipped_qty)
                        });
                        memoRec.setCurrentSublistValue({
                            sublistId:'item',
                            fieldId:'quantity',
                            value: Number(columns.custrecord_wal_shipped_qty)
                        });//数量
                        memoRec.commitLine('item');
                    }
                    var memoId = memoRec.save();
                    log.debug('memoId',memoId);
                    /**回写payment*/
                    var payId = record.submitFields({
                        type:'customrecord_walmart_payment',
                        id:value.id,
                        values:{
                            custrecord_daixiangdan:memoId
                        }
                    });
                    log.debug('回写payment',payId);
                }
            }
            catch (e){
                log.debug('生成贷项通知错误',e);
            }
        }
        function getSku(storeSku){
            var mySearch = search.create({
                type:'customrecord_hx_record_skucorrelation',
                columns:['custrecord_hx_field_item'],
                filters:[['custrecord_hx_field_item_shopsku','is',storeSku]]
            });
            log.debug('nssku.length',mySearch.length);
            var res = mySearch.run().getRange({start: 0,end: 1});
            for(var i = 0;i < res.length;i++){
                var nsSku = res[i].getValue('custrecord_hx_field_item');
                return nsSku;
            }
        }
        function getStore(store_id){
            if(store_id){
                var rec = record.load({type:'customrecord_cseg_hx_fm_store',id:store_id});

                return {
                    "so_currency":rec.getValue('custrecord_currency'),
                    "location":rec.getValue('custrecord_hx_md_warehouse'),
                }
            }
        }
        function getSo(soId){
            var soData = {};
            var rec = record.load({type:'salesorder',id:soId});
            var customer = rec.getValue({fieldId:'entity'});
            var currency = rec.getText({fieldId:'currency'});
            var locationSo = rec.getValue({fieldId:'location'});
            soData.customer = customer;
            soData.currency = currency;
            var mySearch = search.create({
                type:'customrecord_cseg_hx_fm_store',
                columns:['internalid','custrecord_hx_md_warehouse'],
                filters:[['custrecord_rm_store_customer','anyof',soData.customer]]
            });
            var res = mySearch.run().getRange({start: 0,end: 1000});
            for(var i = 0;i < res.length;i++){
                var storeId = res[i].getValue('internalid');
                var location = res[i].getValue('custrecord_hx_md_warehouse');
                soData.location = location;
            }
            return soData;
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
            var mySearch = search.load({id:'customsearch_cl_wal2cr'});
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