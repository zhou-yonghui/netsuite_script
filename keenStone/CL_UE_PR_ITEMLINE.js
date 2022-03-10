/**
 * 请购单赋值明细行海外仓数量、FBA数量、WFS数量、在途仓数量和未交数量
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define(['N/record','N/search','N/format','N/runtime'],
    function(record,search,format,runtime) {
        function beforeLoad(context) {
        }
        function beforeSubmit(context) {
        }
        function afterSubmit(context) {
            try{
                var rec = record.load({
                    type:'purchaserequisition',
                    id:context.newRecord.id,
                    isDynamic:true,
                });
                var count = rec.getLineCount('item');
                log.debug('count',count);
                if(count > 0){
                    for(var i = 0;i < count;i++){
                        rec.selectLine('item',i);
                        var itemName = rec.getCurrentSublistText({
                            sublistId:'item',
                            fieldId:'item',
                        });
                        var skuName = rec.getCurrentSublistText({
                            sublistId: 'item',
                            fieldId: 'custcol_cs_sku_linefield'
                        });
                        log.debug('itemName skuName',itemName + '===' + skuName);
                        /**sku未交数量*/
                        var weiQty = getWeiJiao(skuName);
                        /**WFS仓*/
                        // var wfsQty = getWFS(itemName);
                        /***/
                        /***/
                        /***/
                        rec.setCurrentSublistValue({
                            sublistId:'item',
                            fieldId:'custcol_cs_sku_wj_sl_c1',
                            value:weiQty,
                        });
                        rec.commitLine('item');
                    }
                    var prId = rec.save();
                    log.debug('prId',prId);
                }
            } catch (e) {
                log.debug("出错",e)
            }
        }
        /**sku未交数量*/
        function getWeiJiao(skuName){
            var sum = Number(0);
            var mysearch = search.load({
                id:'customsearch_cs_sku_po_quantity_1'
            });
            var col = mysearch.columns;
            mysearch.run().each(function (res){
                var poSku = res.getValue(col[2]);
                log.debug('poSku',poSku);
                if(poSku == skuName){
                    var weiQty = res.getValue(col[6]);
                    sum += Number(weiQty);
                }
            });
            log.debug('sumwei',sum);
            return sum;
        }
        function getWFS(itemName){
            var sum = Number(0);
            var mysearch = search.load({
                id:'customsearch_cs_sku_wfs_quantity_c1'
            });
            var col = mysearch.columns;
            mysearch.run().each(function (res){
                var wfsSku = res.getValue(col[0]);
                log.debug('wfsSku',wfsSku);
                if(wfsSku == itemName){
                    var wfsQty = res.getValue(col[2]);
                    sum += Number(wfsQty);
                }
            });
            log.debug('sumwfs',sum);
            return sum;
        }
        return {
            // beforeLoad: beforeLoad,
            // beforeSubmit: beforeSubmit,
            afterSubmit: afterSubmit
        };
    });
