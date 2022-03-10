/**
 * 公司间库存转移自动生成采购订单
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define(['N/record','N/search','N/format','N/runtime'],
    function(record,search,format,runtime) {
        function beforeLoad(context) {
            if(context.type == 'create'){
                var rec = context.newRecord;
                rec.setValue('subsidiary',10);//todo：默认：Rocdan Limited（HK1）
            }
        }
        function beforeSubmit(context) {
        }
        function afterSubmit(context) {
            try{
                if(context.type == 'create' || context.type == 'edit'){
                    var rec = record.load({type:'transferorder',id:context.newRecord.id,isDynamic:true});
                    var toLocation = rec.getValue('transferlocation');//至地点,目的仓类型为虚拟仓自动生成po
                    var flag = getLocation(toLocation);
                    log.debug('flag',flag);
                    var itemList = [];
                    if(flag == 1){
                        var store = rec.getValue('cseg_hx_fm_store');
                        var storeData = getStore(store);
                        var count = rec.getLineCount('item');
                        for(var i = 0;i < count;i++){
                            var sku = rec.getSublistValue({
                                sublistId:'item',
                                fieldId:'item',
                                line:i,
                            });
                            var qty = rec.getSublistValue({
                                sublistId: 'item',
                                fieldId: 'quantity',
                                line: i,
                            });
                            itemList.push({"sku":sku,"qty":qty});
                        }
                        log.debug('itemList',itemList);
                        var price = getPrice(itemList,storeData);
                        if(price){
                            /**创建po单*/
                            var poRec = record.create({
                                type:'purchaseorder',
                                isDynamic:true,
                            });
                            poRec.setText({fieldId:'customform',text:'RP-销售用-公司间采购'});
                            poRec.setValue({fieldId:'entity',value:getSubsidiary(rec.getValue('subsidiary'))});//to单公司对应供应商
                            poRec.setValue({fieldId:'subsidiary',value:storeData.storeSub});//店铺子公司
                            poRec.setValue({fieldId:'location',value: storeData.location});//地点
                            poRec.setValue({fieldId:'custbody_hx_field_as_inv_order_num',value:context.newRecord.id});//关联to字段
                            poRec.setValue({fieldId:'approvalstatus',value:'2'});//已核准，才能自动进入公司间交易
                            // poRec.setValue({fieldId:'department',value:1});//部门
                            // poRec.setValue({fieldId:'custbody_rp_pm_shippingdate',value:format.parse({value:new Date(),type:format.Type.DATE})});
                            // poRec.setValue({fieldId:'duedate',value:''})
                            for(var n = 0;n < itemList.length;n++){
                                poRec.selectNewLine('item');
                                poRec.setCurrentSublistValue({
                                    sublistId:'item',
                                    fieldId:'item',
                                    value:itemList[n].sku,
                                });
                                poRec.setCurrentSublistValue({
                                    sublistId:'item',
                                    fieldId:'quantity',
                                    value:itemList[n].qty,
                                });
                                poRec.setCurrentSublistValue({
                                    sublistId:'item',
                                    fieldId:'rate',
                                    value:price,
                                });
                                poRec.setCurrentSublistValue({
                                    sublistId:'item',
                                    fieldId:'location',
                                    value:storeData.location,
                                })
                                poRec.commitLine('item');
                            }
                            var poId = poRec.save();
                            log.debug('新建po',poId);
                        }
                    }
                }
            }
            catch (e){
                log.debug('创建po单报错',e);
            }
        }
        function getStore(storeId){
            var storeRec = record.load({type:'customrecord_cseg_hx_fm_store',id:storeId});
            var location = storeRec.getValue('custrecord_hx_md_warehouse');//默认仓库
            var subsi = storeRec.getValue('custrecord_md_company');//所属公司
            var vendor = getSubsidiary(subsi);

            return {"location":location,"vendor":vendor,"storeSub":subsi};
        }
        function getPrice(itemList,storeData){
            var poPrice;
            var item = search.lookupFields({
                type:'inventoryitem',
                id:itemList[0].sku,
                columns:['cost']
            });
            var itemPrice = item.cost;//采购价格
            log.debug('货品采购价格',itemPrice);
            if(itemPrice){
                var mysearch = search.create({
                    type:'customrecord639',
                    columns:['custrecord203'],
                    filters:[['custrecord202','anyof',record.load({type:'vendor',id:storeData.vendor,isDynamic:true}).getValue('subsidiary')],'and',['isinactive','is',false]]
                });
                var res = mysearch.run().getRange({start:0,end:1});
                if(res.length > 0){
                    var rate = res[0].getValue('custrecord203');//加成比例
                    log.debug('价格相关参数','itemPrice:' + itemPrice + '--rate:' + getRate(rate));
                    poPrice = itemPrice * (1 + getRate(rate));
                }
                else {
                    poPrice = itemPrice;
                }
                return poPrice;
            }
        }
        function getRate(rate){
            var r = rate.split('%')[0]/100;
            return r;
        }
        function getSubsidiary(subId){
            var vendorId;
            var mysearch = search.create({
                type:'subsidiary',
                columns:['representingvendor'],
                filters:[['internalid','is',subId]],
            });
            var res = mysearch.run().getRange({start: 0,end:10});
            if(res.length > 0){
                vendorId = res[0].getValue('representingvendor');
                return vendorId;
            }
        }
        function getLocation(location){
            var flag = 0;
            var mysearch = search.create({
                type:'location',
                columns:['custrecord_hx_field_other_ware_type'],
                filters:[['internalid','is',location]],
            });
            var res = mysearch.run().getRange({start:0,end:1000});
            if(res.length > 0){
                var type = res[0].getValue('custrecord_hx_field_other_ware_type');
                log.debug('type',type);
                if(type == 5){  //type为5时时虚拟仓
                    flag = 1;
                }
            }
            return flag;
        }
        return {
            // beforeLoad: beforeLoad,
            // beforeSubmit: beforeSubmit,
            afterSubmit: afterSubmit
        };
    });
