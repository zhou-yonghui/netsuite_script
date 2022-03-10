/**
 * @LastEditors: zhouyh
 * @LastEditTime: 2022-01-02 11:21:12
 * @Description: 发货校验是否财务审核
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 */
define(['N/error','N/search','N/format','N/currentRecord','N/currency','N/record'],
    function(error,search,format,currentRecord,currencyRate,record) {
        function pageInit(context) {

        }
        function saveRecord(context) {
            var rec = context.currentRecord;
            var createdfrom_t = rec.getText('createdfrom');//
            var createdfrom = rec.getValue('createdfrom');
            var count = rec.getLineCount('item');
            if(createdfrom_t.indexOf('销售') != -1){
                var columns = search.lookupFields({
                    type:'salesorder',
                    id:createdfrom,
                    columns:[
                        'custbody_approval_status'
                    ]
                });
                var approval_status = columns.custbody_approval_status;//审批状态
                log.debug('approval_status',approval_status);
                if(approval_status){
                    if(approval_status[0].value != 5){//审核通过
                        alert('销售订单财务未审核通过');
                        return false;
                    }
                }
                else {
                    alert('销售订单财务未审核通过');
                    return false;
                }
            }
            //判断可用数量
            for(var i = 0;i < count;i++){
                rec.selectLine('item',i);
                var item = rec.getCurrentSublistValue({
                    sublistId:'item',
                    fieldId:'item',
                });
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
                })
                if(itemreceive == true){
                    // log.debug('usage for in',runtime.getCurrentScript().getRemainingUsage());
                    var onhand_qty = getOnhandQty(item,location);
                    log.debug('onhand_qty qty',onhand_qty + '---' + qty);
                    if(onhand_qty < qty){
                        alert('货品库存可用量不足！！');
                        return false;
                    }
                    // log.debug('usage for search out',runtime.getCurrentScript().getRemainingUsage());
                }
            }

            return true;
        }
        function getOnhandQty(sku,location,subsidiary) { //TODO:获取货品可用量的搜索
            var onhandQty = Number(0);
            var mySearch = search.create({
                type:'item',
                filters:[['internalid','anyof',sku],
                    // 'AND',['quantityavailable','greaterthan',0]
                    "AND",['inventorylocation','anyof',location],
                ], //
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
            // log.debug('sku location',sku + '--' + location);
            // log.debug('可用量查询数量',res.length + JSON.stringify(res));
            if(res.length > 0){
                for(var i = 0;i < res.length;i++){
                    var location_search = res[i].getValue(col[2]);
                    //1、直接比较地点可用量
                    if(location == location_search){
                        var onhandQty_location = res[i].getValue(col[0]);
                        var qtyTrue = res[i].getValue(col[6]);//地点已确认数量
                        onhandQty = Number(onhandQty_location) + Number(qtyTrue);
                        if(!onhandQty || onhandQty == 0 || onhandQty == ''){//2、如果{locationquantityavailable}和=0或为空或找不到，就查这个字段{locationquantityavailable}+{locationquantitycommitted}的库存数量，再校验一遍库存可用量
                            onhandQty = Number(res[i].getValue(col[4])) + Number(res[i].getValue(col[5]));
                            log.debug('第二逻辑可用量',onhandQty);
                        }
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