/**
 * @LastEditors: zhouyh
 * @LastEditTime: 2022-01-10 23:36:28
 * @Description: 库存转移单检查库存状况
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */
define(['N/error','N/search','N/format','N/currentRecord','N/currency','N/record'],
    function(error,search,format,currentRecord,currencyRate,record) {
        function pageInit(context) {

        }
        function saveRecord(context) {
            var rec = context.currentRecord;
            var location = rec.getValue('location');//发货仓库
            var count = rec.getLineCount('item');
            //判断可用数量
            for(var i = 0;i < count;i++){
                var line = Number(i) + Number(1);
                rec.selectLine('item',i);
                var item = rec.getCurrentSublistValue({
                    sublistId:'item',
                    fieldId:'item',
                });
                var item_t = rec.getCurrentSublistText({
                    sublistId:'item',
                    fieldId:'item',
                });
                var qty = rec.getCurrentSublistValue({
                    sublistId:'item',
                    fieldId:'quantity',
                });
                if(location){
                    var onhand_qty = getOnhandQty(item,location);
                    log.debug('onhand_qty qty',onhand_qty + '---' + qty);
                    if(onhand_qty < qty){
                        alert('第' + line + '行货品内部id:' + item + '库存可用量不足，请更改发货数量');
                        return false;
                    }
                }
            }

            return true;
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
        function validateField(context) {

        }
        function fieldChanged(context) {

        }
        function postSourcing(context) {

        }
        function lineInit(context) {

        }
        function validateDelete(context) {

        }
        function validateInsert(context) {

        }
        function validateLine(context) {

        }
        return {
            //  pageInit: pageInit,
            // fieldChanged: fieldChanged,
            // postSourcing: postSourcing,
            //  sublistChanged: sublistChanged,
            // lineInit: lineInit,
            // validateField: validateField,
            //  validateLine: validateLine,
            // validateInsert: validateInsert,
            // validateDelete: validateDelete,
            saveRecord: saveRecord
        };
    });