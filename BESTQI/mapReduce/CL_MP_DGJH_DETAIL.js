/**
 * @Author: zhouyh
 * @Date: 2021-12-30 10:04:15
 * @LastEditors: zhouyh
 * @LastEditTime: 2021-12-30 10:04:16
 * @Description: 订柜计划明细操作
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 */
define(
    ['N/search', 'N/record', 'N/task','N/file','N/runtime','N/format'],
    function(search, record, task,file,runtime,format) {
        function getInputData() {
            try{
                var mySearch = initSearch();
                var results = mySearch.run().getRange({
                    start: 0,
                    end: 1000
                });
                var col = mySearch.columns;
                var alls = [];
                var j = 1;
                log.debug({
                    title: 'results.length',
                    details: results.length
                });
                while (results.length > 0 && j < 10) {
                    for (var i = 0; i < results.length; i++) {
                        var result = results[i];
                        var tmp = new Object();
                        tmp.id = result.id;
                        tmp.searchType = mySearch.searchType;
                        tmp.qty = result.getValue(col[0]);
                        tmp.ztLocation = result.getValue(col[1]);
                        tmp.ztt = result.getText(col[1]);
                        tmp.startLocation = result.getValue(col[2]);
                        tmp.startLocationT = result.getText(col[2]);
                        tmp.sku = result.getValue(col[3]);
                        tmp.skut = result.getText(col[3]);
                        tmp.outType = result.getValue(col[4]);
                        tmp.outt = result.getText(col[4]);
                        tmp.subsidiary = result.getValue(col[5]);
                        alls[alls.length] = tmp;
                    }
                    results = mySearch.run().getRange({
                        start: 0 + j * 1000,
                        end: 1000 + j * 1000
                    });
                    j++;
                }
                log.debug({
                    title: 'alls',
                    details: JSON.stringify(alls.length)
                });
                return alls;
            }catch(e){
                log.debug('error',e);
            }
        }

        function map(context) {
            log.debug({
                title: 'context map',
                details: context
            });
            var a = JSON.parse(context.value);
            log.debug('value',a);
            //
            var detailRec = record.load({type:a.searchType,id:a.id,isDynamic:true});
            var oldTo = detailRec.getValue('custrecord_company_it_order');//公司间TO
            log.debug('oldTo',oldTo);
            // var detailCol = search.lookupFields({
            //     type:String(a.searchType),
            //     id:Number(a.id),
            //     columns:['custrecord_company_it_order']
            // });
            // log.debug('detailCol',detailCol + '---' + typeof (detailCol));
            var shipment_item_type_t = a.outType;
            var actual_shipment_quantity = a.qty;
            var start_location = a.startLocation;
            var end_location = a.ztLocation;
            var sku = a.sku;
            var dgjh_detail_id = a.id;
            var subsidiary = a.subsidiary;
            //创建to
            var toId = createTo(shipment_item_type_t,actual_shipment_quantity,start_location,end_location,sku,dgjh_detail_id,subsidiary);
            log.debug('toId',toId);
            if(toId){
                // var toArr = new Array();
                // var outArr = arrayAdd(toArr,oldTo);
                // log.debug('outArr',typeof (outArr));
                // record.submitFields({
                //     type:'customrecord_sl_dg_detail',
                //     id:a.id,
                //     values:{
                //         custrecord_company_it_order:outArr.push(toId),
                //     }
                // });
                detailRec.setValue('custrecord_company_it_order',toId);
                detailRec.save();
                //to转单
                var irifObj = toTransferIrIF(toId,actual_shipment_quantity,sku,start_location);
            }
        }
        function arrayAdd(array_orgin,array_out) {//TODO:数组添加元素
            if(array_orgin.length > 0){
                for(var i = 0;i < array_orgin.length;i++){
                    array_out.push(array_orgin[i]);
                }
                return array_out;
            }
        }
        function toTransferIrIF(to_Id,actual_shipment_quantity,sku,start_location) {
            var ifirObj = new Object();
            if(to_Id){
                log.debug('init');
                //发货
                try{
                    var to_if_rec = record.transform({
                        fromType: "transferorder",
                        fromId: to_Id,
                        toType: 'itemfulfillment',
                        isDynamic: true,
                    });
                    // to_if_rec.setText('shipstatus','已付运');
                    to_if_rec.setText('customform','BSQ_货品履行(内部交易)');//自定义表格
                    to_if_rec.setValue({fieldId:'shipstatus',value:'C'});
                    to_if_rec.setValue('approvalstatus',2);//已核准
                    var if_count = to_if_rec.getLineCount('item');
                    log.debug('if_count',if_count);
                    if(if_count > 0){
                        for(var i = 0;i < if_count;i++){
                            to_if_rec.selectLine('item',i);
                            to_if_rec.setCurrentSublistValue({
                                sublistId:'item',
                                fieldId:'item',
                                value:sku
                            });
                            to_if_rec.setCurrentSublistValue({
                                sublistId:'item',
                                fieldId:'location',
                                value:start_location
                            });
                            to_if_rec.setCurrentSublistValue({        //TODO：部分收货，部分发货只需要赋值数量字段就可以，但是发货需要系统设置一下
                                sublistId:'item',
                                fieldId:'quantity',
                                value:actual_shipment_quantity
                            });
                            to_if_rec.setCurrentSublistValue({
                                sublistId:'item',
                                fieldId:'itemreceive',
                                value:true
                            });
                        }
                        var to_if_id = to_if_rec.save();
                        log.debug('to_if_id',to_if_id);
                        ifirObj.ifId = to_if_id;
                        if(to_if_id){
                            //收货
                            try{
                                var to_ir_rec = record.transform({
                                    fromType: "transferorder",
                                    fromId: to_Id,
                                    toType: 'itemreceipt',
                                    isDynamic: true,
                                });
                                var to_ir_id = to_ir_rec.save();
                                log.debug('to_ir_id',to_ir_id);
                                ifirObj.irId = to_ir_id;
                            }catch(e){
                                log.debug('to转收货单报错',e);
                            }
                        }
                    }
                }catch(e){
                    log.debug('to转发货单报错',e);
                }
            }
            return ifirObj;
        }
        function createTo(shipment_item_type_t,actual_shipment_quantity,start_location,end_location,sku,dgjh_detail_id,subsidiary) {
            // var locationData = getLocation(start_location);
            // log.debug({
            //     title: 'locationData',
            //     details: locationData,
            // });
            // var to_sub = locationData.subsidiary;
            var to_start_location = start_location;
            var to_end_location = end_location;
            //创建公司间to单
            var nb_to_rec = record.create({type:'transferorder',isDynamic:true});
            //主体字段
            log.debug('shipment_item_type_t to_start_location to_end_location',shipment_item_type_t + '--' + to_start_location + '---' + to_end_location);
            nb_to_rec.setValue('subsidiary',4);
            nb_to_rec.setValue('custbody_hl_bsq_order_type',shipment_item_type_t);//调拨类型
            nb_to_rec.setValue('location',to_start_location);
            nb_to_rec.setValue('transferlocation',to_end_location);
            // nb_to_rec.setValue('transferlocation',2);//HK-工厂暂存仓
            nb_to_rec.setText('orderstatus','等待发货');
            nb_to_rec.setText('incoterm','DAP');//贸易术语
            nb_to_rec.setValue('custbody_sl_df_detail',dgjh_detail_id);//订柜计划明细
            //明细
            log.debug('sku qty',sku + '---' + actual_shipment_quantity);
            nb_to_rec.selectNewLine('item');
            nb_to_rec.setCurrentSublistValue({
                sublistId:'item',
                fieldId:'item',     //货品
                value:sku,
            });
            nb_to_rec.setCurrentSublistValue({
                sublistId:'item',
                fieldId:'quantity',     //数量
                value:actual_shipment_quantity,
            });
            nb_to_rec.commitLine('item');
            var nb_to_rec_id = nb_to_rec.save();
            log.debug('end');
            return nb_to_rec_id;
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
        function getLocation(location_id) {
            if(location_id){
                var rec = record.load({
                    type:'location',
                    id:location_id,
                });
                var subsidiary = rec.getValue('subsidiary');
                var ontheway_location = rec.getValue('custrecord_ontheway_location');//在途仓

                return {"subsidiary":subsidiary,"ontheway_location":ontheway_location};
            }
        }
        function initSearch() {
            var customrecord_sl_dg_detailSearchObj = search.create({
                type: "customrecord_sl_dg_detail",
                filters:
                    [
                        ["custrecord_sl_dg_po_number","noneof","@NONE@"], 
                        "AND", 
                        ["custrecord_sl_dg_md_location.custrecord_ontheway_location","noneof","@NONE@"], 
                        "AND", 
                        ["custrecord_sl_dc_start_location","anyof","2"],
                        // "AND",
                        // ['internalid','is',15044]
                    ],
                columns:
                    [
                        search.createColumn({name: "custrecord_sl_dg_sku_qty", label: "QTY（计划）"}),
                        search.createColumn({
                            name: "custrecord_ontheway_location",
                            join: "CUSTRECORD_SL_DG_MD_LOCATION",
                            label: "在途仓库"
                        }),
                        search.createColumn({name: "custrecord_sl_dc_start_location", label: "起始仓"}),
                        search.createColumn({name: "custrecord_sl_dg_detail", label: "SKU"}),
                        search.createColumn({name:'custrecord_sl_ch_type1',label:"出货计划类型"}),
                        search.createColumn({name:'subsidiary',join: "CUSTRECORD_SL_DG_MD_LOCATION", label: "在途仓子公司"}),
                    ]
            });
            var searchResultCount = customrecord_sl_dg_detailSearchObj.runPaged().count;
            log.debug("customrecord_sl_dg_detailSearchObj result count",searchResultCount);
            // customrecord_sl_dg_detailSearchObj.run().each(function(result){
            //     // .run().each has a limit of 4,000 results
            //     return true;
            // });

            return customrecord_sl_dg_detailSearchObj;
        }
        return {
            getInputData: getInputData,
            map: map,
            reduce: reduce,
            summarize: summarize
        };
    });