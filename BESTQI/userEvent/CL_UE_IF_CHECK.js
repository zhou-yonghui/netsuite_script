/**
 * @LastEditors: zhouyh
 * @LastEditTime: 2022-01-12 09:58:54
 * @Description: 发货单检查库存
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define(['N/record','N/search','N/format','N/runtime'],
    function(record,search,format,runtime) {
        function beforeLoad(context) {

        }
        function beforeSubmit(context) {
            // try{
                var rec = context.newRecord;
                var count = rec.getLineCount('item');
                //判断可用数量
                for(var i = 0;i < count;i++){
                    var line = Number(i) + Number(1);
                    var item = rec.getSublistValue({
                        sublistId:'item',
                        fieldId:'item',
                        line:i,
                    });
                    var itemname = rec.getSublistText({
                        sublistId:'item',
                        fieldId:'itemname',
                        line:i,
                    });
                    var location = rec.getSublistValue({
                        sublistId:'item',
                        fieldId:'location',
                        line:i,
                    });
                    var qty = rec.getSublistValue({
                        sublistId:'item',
                        fieldId:'quantity',
                        line:i,
                    });
                    var itemreceive = rec.getSublistValue({
                        sublistId:'item',
                        fieldId:'itemreceive',
                        line:i,
                    });
                    var onhand = rec.getSublistValue({
                        sublistId:'item',
                        fieldId:'onhand',
                        line:i,
                    });
                    // log.debug('itemreceive',itemreceive);
                    if(itemreceive == true){
                        log.debug('onhand_qty qty',onhand + '---' + qty);
                        if(onhand < qty){
                            throw '第' + line + '行货品id:' + item + '库存可用量不足，请更改发货数量';
                        }
                    }
                }
            // }catch(e){
            //     log.debug('错误',e);
            // }
        }
        function getOnhandQty(sku,location) { //TODO:获取货品可用量的搜索
            var onhandQty = Number(0);
            var mySearch = search.create({
                type:'item',
                filters:[['internalid','anyof',sku],
                    // 'AND',['quantityavailable','greaterthan',0]
                    "AND",['inventorylocation','anyof',location],
                ],
                columns:[
                    {name:'locationquantityavailable',type:'float',label:'可用地点'},            //TODO：地点可用数量
                    {name:'subsidiarynohierarchy',type:'select',label:'库存地点子公司'},
                    {name:'inventorylocation',type:'select',label:'库存地点'},
                    {name:'quantityavailable',label:'可用'},
                    {name:'locationquantityavailable'},
                    {name:'locationquantitycommitted'},
                    {name:'locationquantitycommitted',label:'地点已确定'},
                ]
            });
            var col = mySearch.columns;
            var res = mySearch.run().getRange({start:0,end:1000});
            log.debug('可用量查询数量',res.length + JSON.stringify(res));
            if(res.length > 0){
                for(var i = 0;i < res.length;i++){
                    var location_search = res[i].getValue(col[2]);
                    //1、直接比较地点可用量
                    if(location == location_search){
                        var onhandQty_location = res[i].getValue(col[0]);
                        var qtyTrue = res[i].getValue(col[6]);//地点已确认数量
                        // onhandQty = Number(onhandQty_location) + Number(qtyTrue);
                        onhandQty = onhandQty_location;
                    }
                }
            }
            return onhandQty;
        }
        function afterSubmit(context) {

        }

        return {
            //  beforeLoad: beforeLoad,
            beforeSubmit: beforeSubmit,
            // afterSubmit: afterSubmit
        };
    });