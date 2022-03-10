/**
 * 库存转移生成的货品收据自动生成内部采购订单
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
                    var results = res[i].getValue('internalid');
                    // log.debug('result',results);
                    var tmp = new Object();
                    tmp.id = results;
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
            doRecord(value.id);
            context.write({
                key:'irId',
                value: value.id,
            });
        }
        function reduce(context) {
            log.debug({
                title: 'context reduce',
                details: context
            });
            log.debug('context.values.length',context.values.length);
            // if(context.values.length > 0){
            //     for(var i = 0;i < context.values.length;i++){
            //         doRecord(context.values[i]);
            //         context.write({
            //             key:"irId",
            //             value: context.values[i]
            //         });
            //     }
            // }
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
                    type:'itemreceipt',
                    id:value.id,
                    columns:['createdfrom']
                });
                var toId = columns.createdfrom[0].value;//to单
                //先查询po单是否关联to
                var po_search = search.create({
                    type:'purchaseorder',
                    filters:[
                        ['custbody_hx_field_as_inv_order_num','anyof',toId],
                    ]
                });
                var po_res = po_search.run().getRange(0,1);
                if(po_res.length == 0){
                    var rec = record.load({type:'transferorder',id:toId,isDynamic:true});
                    var toLocation = rec.getValue('transferlocation');//至地点,目的仓类型为虚拟仓自动生成po
                    var flag = getLocation(toLocation);
                    log.debug('flag',flag);
                    var itemList = [];
                    if(flag == 1){
                        var store = rec.getValue('cseg_hx_fm_store');
                        var storeData = getStore(store,toId);
                        log.debug('storeData',storeData);
                        var irRec = record.load({type:'itemreceipt',id:value.id,isDynamic:true});
                        var count = irRec.getLineCount('item');
                        for(var i = 0;i < count;i++){
                            var sku = irRec.getSublistValue({
                                sublistId:'item',
                                fieldId:'item',
                                line:i,
                            });
                            var qty = irRec.getSublistValue({
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
                            log.debug('创建人id name',runtime.getCurrentUser().id + runtime.getCurrentUser().name);
                            poRec.setText({fieldId:'customform',text:'RP-销售用-公司间采购'});
                            // poRec.setValue({fieldId:'employee',value:runtime.getCurrentUser().id});//创建人
                            // poRec.setText('employee',runtime.getCurrentUser().name);//todo:获取的是systom
                            poRec.setValue({fieldId:'entity',value:getNbVendorSub(storeData.subsi)});//供应商
                            // poRec.setValue({fieldId:'employee',value:40});//创建人,PS750,正式环境
                            poRec.setValue({fieldId:'subsidiary',value:storeData.subsi});//
                            poRec.setValue({fieldId:'location',value: storeData.location});//地点
                            // poRec.setValue({fieldId:'duedate',value:format.parse({value:new Date(),type:format.Type.DATE})});// Receive By
                            // poRec.setValue({fieldId:'custbody_rp_pm_shippingdate',value:format.parse({value:new Date(),type:format.Type.DATE})});//船期
                            poRec.setValue({fieldId:'department',value:1});//部门 todo:测试赋值:Management Office 内部id为1
                            poRec.setValue({fieldId:'approvalstatus',value:'2'});//已核准，才能自动进入公司间交易
                            poRec.setValue({fieldId:'custbody_hx_field_as_inv_order_num',value:toId});//关联TO订单号
                            poRec.setValue({fieldId:'custbody_hx_field_po_type',value:'1'});//采购单类型custbody_hx_field_po_type 公司间交易
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
                                });
                                poRec.commitLine('item');
                            }
                            var poId = poRec.save();
                            log.debug('新建po',poId);
                            if(poId){
                                record.submitFields({
                                    type:'itemreceipt',
                                    id:value.id,
                                    values:{
                                        custbody_cust_company_po:poId
                                    }
                                });
                                log.debug('内部交易货品收据回写');
                            }
                        }
                    }
                }else {
                    log.debug('已存在内部po内部id:',po_res[0].id);
                }
            } catch (e) {
                log.debug('生成po报错',e);
            }
        }
        function getNbVendorSub(subId){
            if(subId){
                var mysearch = search.create({
                    type:'customrecord_nb_vendor',
                    filters:[['custrecord215','anyof',subId]],
                    columns:['custrecord216']
                })
                var res = mysearch.run().getRange({start:0,end:1});
                log.debug('内部交易配对',res.length);
                if(res.length > 0){
                    var vendorId = res[0].getValue('custrecord216');
                    log.debug('供应商id',vendorId);
                    return vendorId;
                }
            }
        }
        function getStore(storeId,toId){
            var storeRec = record.load({type:'customrecord_cseg_hx_fm_store',id:storeId});
            var location = storeRec.getValue('custrecord_hx_md_warehouse');//默认仓库
            var subsi = storeRec.getValue('custrecord_md_company');//所属公司

            var vendor = getSubsidiary(record.load({type:'transferorder',id:toId,isDynamic:true}).getValue('subsidiary'));

            return {"location":location,"vendor":vendor,"subsi":subsi};
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
        function initSearch() {
            // var mySearch = search.load({id:'customsearch_cl_ir_getto'});
            var mySearch = search.create({
                type:'itemreceipt',
                columns:['internalid'],
                filters:[
                    ['type','anyof','ItemRcpt'],
                    'and',
                    ['mainline','is','T'],
                    'and',
                    ['createdfrom.tranid','contains','TO'],
                    'and',
                    ['custbody_cust_company_po','anyof','@NONE@'],
                    'and',
                    ['customform','anyof','113']
                ]
            })
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