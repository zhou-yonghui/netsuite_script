/**
 * @LastEditors: zhouyh
 * @LastEditTime: 2022-01-10 23:17:47
 * @Description: 发货单检查库存状况
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */
define(['N/error','N/search','N/format','N/currentRecord','N/currency','N/record'],
    function(error,search,format,currentRecord,currencyRate,record) {
        function pageInit(context) {

        }
        function saveRecord(context) {
            var rec = context.currentRecord;
            var count = rec.getLineCount('item');
            //判断可用数量
            for(var i = 0;i < count;i++){
                rec.selectLine('item',i);
                var line = Number(i) + Number(1);
                var item = rec.getCurrentSublistValue({
                    sublistId:'item',
                    fieldId:'item',
                });
                var itemname = rec.getCurrentSublistValue({
                    sublistId:'item',
                    fieldId:'itemname',
                })
                var location = rec.getCurrentSublistValue({
                    sublistId:'item',
                    fieldId:'location'
                });
                var qty = rec.getCurrentSublistValue({
                    sublistId:'item',
                    fieldId:'quantity',
                });
                var itemreceive = rec.getCurrentSublistValue({
                    sublistId:'item',
                    fieldId:'itemreceive',
                });
                var onhand = rec.getCurrentSublistValue({
                    sublistId:'item',
                    fieldId:'onhand',
                });
                log.debug('itemname',itemname);
                if(itemreceive == true){
                    log.debug('onhand_qty qty',onhand + '---' + qty);
                    if(onhand < qty){
                        alert('第' + line + '行货品内部id:' + item + '库存可用量不足，请更改发货数量');
                        return false;
                    }
                }
            }

            return true;
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