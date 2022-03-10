/**
 * 内部销售订单自动收发货,验证发货数量
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 */
define(
    ['N/search', 'N/record', './moment', 'N/task','N/file','N/format'],
    function(search, record, moment, task,file,format) {
        function getInputData() {
            var alls = [];
            var mySearch = initSearch();
            mySearch.run().each(function(result){
                var results = result.getValue({name:'internalid'});
                //    log.debug('result',results);
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
            doSomething(value.id);
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
        function doSomething(soId){
            try {
                var rec = record.load({type:'salesorder',id:soId,isDynamic:true});
                var nbCurrency = rec.getValue('custbody_internalcurrency');//内部交易币种
                var trandate = rec.getValue('trandate');//创建日期
                var so_location = rec.getValue('location');//地点
                var so_subsidiary = rec.getValue('subsidiary');//附属公司
                var entity = rec.getValue('entity');//客户
                log.debug('so_location so_subsidiary',so_location + '---' + so_subsidiary);
                log.debug('nbCurrency',nbCurrency);
                // if (nbCurrency) {
                var poData = getNbPo(rec.id);
                log.debug('poData', poData);
                var location;
                if (poData != {}) {
                    if(!so_location){
                        if(so_subsidiary == 12){
                            location = 346;
                        }else if(so_subsidiary == 18){
                            location = 403;
                        }else if(so_subsidiary == 31){
                            location = 351;
                        }else if(entity == 1973){ //当内部销售订单的客户=1973；发货仓库默认=505
                            location = 505;
                        }
                    }else{
                        location = so_location;
                    }
                    log.debug('location', location);
                    /***/
                    // var shipment = rec.getValue('custbody_shipment_id');//
                    // var shipmentData = getShipmentData(shipment);
                    // log.debug('shipmentData',shipmentData);
                    // var flag = 'flag';
                    // if(shipmentData.length > 0){
                    //货品收据
                    if(poData.po_location == 351){          //香港中转仓才自动收货
                        try{
                            log.debug('ir poid',poData.poId);
                            var irRec = record.transform({
                                fromType: 'purchaseorder',
                                fromId: poData.poId,
                                toType: 'itemreceipt',
                                isDynamic: true
                            });
                            // irRec.setValue('custbody_internalcurrency',nbCurrency);
                            irRec.setValue({fieldId: 'trandate', value: changeDate(trandate)});
                            var ir_count = irRec.getLineCount('item');
                            log.debug('ir_count',ir_count);
                            for(var r = 0;r < ir_count;r++){
                                irRec.selectLine('item',r);
                                irRec.setCurrentSublistValue({
                                    sublistId:'item',
                                    fieldId:'location',
                                    value:poData.po_location
                                });
                                irRec.setCurrentSublistValue({
                                    sublistId:'item',
                                    fieldId:'custcol_cs_lh_date',        //来货日期
                                    value: changeDate(trandate),
                                });
                            }
                            var irRecId = irRec.save();
                            log.debug('irRecId', irRecId);
                        }catch(e){
                            log.debug('生成货品收据错误',e);
                        }
                        //账单
                        try{
                            var vendorRec = record.transform({fromType:'purchaseorder',fromId:poData.poId,toType:'vendorbill',isDynamic: true});
                            vendorRec.setValue('approvalstatus',2);//已核准
                            vendorRec.setValue({fieldId:'trandate',value:changeDate(trandate)});
                            var vendorRecId = vendorRec.save();
                            log.debug('vendorRecId',vendorRecId);
                        }catch (e) {
                            log.debug('生成供应商账单报错',e);
                        }
                    }
                    //货品履行
                    try{
                        //当内部SO上, “采购程级=其他”时，SO的默认履行仓库取“发货仓库”{custbody_cs_po_from_location}这个字段
                        var po_grade = rec.getValue("custbody_po_grade");//采购程级
                        if(po_grade == 3){
                            location = rec.getValue('custbody_cs_po_from_location');
                        }
                        var ifRec = record.transform({fromType:'salesorder',fromId:soId,toType:'itemfulfillment',isDynamic: true});
                        ifRec.setValue({fieldId:'shipstatus',value:'C'});
                        ifRec.setValue({fieldId:'trandate',value:changeDate(trandate)});
                        var if_count = ifRec.getLineCount('item');
                        log.debug('if count',if_count);
                        for(var f = 0;f < if_count;f++){
                            ifRec.selectLine('item',f);
                            var item = ifRec.getCurrentSublistValue({
                                sublistId:'item',
                                fieldId:'item'
                            });
                            var if_qty = ifRec.getCurrentSublistValue({
                                sublistId:'item',
                                fieldId:'quantity'
                            });
                            var location_line = ifRec.getCurrentSublistValue({
                                sublistId:'item',
                                fieldId:'location'
                            });
                            // log.debug('location_line',location_line);
                            var onhandQty = getOnhandQty(item,location,so_subsidiary);
                            log.debug('if_qty onhandQty',if_qty + '---' + onhandQty);
                            if(onhandQty >= if_qty){
                                ifRec.setCurrentSublistValue({
                                    sublistId:'item',
                                    fieldId:'location',
                                    value:location,
                                });
                                ifRec.commitLine('item');
                            }
                        }
                        var ifRecId = ifRec.save();
                        log.debug('ifRecId',ifRecId);
                    }catch (e){
                        log.debug('生成货品履行错误',e);
                    }
                    //发票
                    //try{
                    //    var invoiceRec = record.transform({fromType:'salesorder',fromId:soId,toType:'invoice',isDynamic: true});
                    //    invoiceRec.setValue({fieldId:'trandate',value:changeDate(trandate)});
                    //    var invoiceRecId = invoiceRec.save();
                    //   log.debug('invoiceRecId',invoiceRecId);
                    //  }catch (e) {
                    //// 		  log.debug('生成发票错误',e);
                    //   }
                    log.debug('end js');
                    // }
                }
                // }
            } catch (e) {
                log.debug("出错",e)
            }
        }
        function getOnhandQty(sku,location,subsidiary) { //TODO:获取货品可用量的搜索
            var onhandQty = Number(0);
            var mySearch = search.create({
                type:'item',
                filters:[['internalid','anyof',sku],
                    // 'AND',['quantityavailable','greaterthan',0]
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
            log.debug('sku location',sku + '--' + location);
            log.debug('可用量查询数量',res.length + JSON.stringify(res));
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
        function changeDate(date){
            if(date){
                var trandate = format.parse({
                    value: date,
                    type: format.Type.DATE
                });
                return trandate;
            }
        }
        function getShipmentData(shipment){
            var shipmentData = [];
            var mysearch = search.create({
                type:'customrecord_inbound_shipment_info',
                columns:['custrecord_shipment_status','internalid'],
                filters:[['custrecord_shipment_id','is',shipment]]
            });
            var res = mysearch.run().getRange({start: 0,end: 1});
            if(res.length > 0){
                var status = res[0].getValue('custrecord_shipment_status');
                if(status == 'CLOSED'){
                    var id = res[0].getValue('internalid');
                    var rec = record.load({type:'customrecord_inbound_shipment_info',id:id,isDynamic:true});
                    var count = rec.getLineCount('recmachcustrecord_item_shipment_id');
                    if(count > 0){
                        for(var i = 0;i < count;i++){
                            var ship = {};
                            var saleSku = rec.getSublistValue({sublistId:'recmachcustrecord_item_shipment_id',fieldId:'custrecord_shipment_item_seller_sku',line:i});//卖方sku
                            var fnSku = rec.getSublistValue({sublistId:'recmachcustrecord_item_shipment_id',fieldId:'custrecord_fulfillment_network_sku',line:i});//FNSku
                            var nsSku = rec.getSublistValue({sublistId:'recmachcustrecord_item_shipment_id',fieldId:'custrecord_shipment_item_oms_sku',line:i});//系统sku
                            var qty = rec.getSublistValue({sublistId:'recmachcustrecord_item_shipment_id',fieldId:'custrecord_quantity_received',line:i});//收货数量
                            ship.saleSku = saleSku;
                            ship.fnSku = fnSku;
                            ship.nsSku = nsSku;
                            ship.qty = qty;
                            shipmentData.push(ship);
                        }
                    }
                }
            }
            return shipmentData;
        }
        function getNbPo(soId){
            var poData = {};
            var mySearch = search.create({
                type:'purchaseorder',
                columns:['internalid','subsidiary','location'],
                filters:[['intercotransaction','anyof',soId]]
            });
            var res = mySearch.run().getRange({start:0,end:1});
            if(res.length > 0){
                var poId = res[0].getValue('internalid');
                var subsidiary = res[0].getValue('subsidiary');
                var po_location = res[0].getValue('location');//地点
                poData.poId = poId;
                poData.subsidiary = subsidiary;
                poData.po_location = po_location;
            }
            return poData;
        }
        function getLocation(soId){
            var rec = record.load({type:'salesorder',id:soId});
            var status = rec.getValue('status');
            log.debug('销售订单状态',status);
            if(status == '待履行' || status == '待开票' || status == '待开票/部分完成'  || status == '部分完成'){
                var shipmentId = rec.getValue('custbody_shipment_id');
                var mysearch = search.create({
                    type:'customrecord_inbound_shipment_info',
                    columns:['custrecord_shipment_store_id'],
                    filters:[['custrecord_shipment_id','is',shipmentId]]
                });
                var res = mysearch.run().getRange({start: 0,end: 1});
                log.debug('shipment销售订单数量',res.length);
                var storeId = res[0].getValue('custrecord_shipment_store_id');
                log.debug('店铺id',storeId);
                if(res.length > 0 && storeId){
                    var storeRec = record.load({type:'customrecord_cseg_hx_fm_store',id:storeId});
                    var location = storeRec.getValue('custrecord_hx_md_warehouse');
                    log.debug('店铺仓库',location);
                    return location;
                }
            }
        }
        function initSearch() {
            var mySearch = search.load({id:'customsearch_cl_nbsocreateall'});// 内部交易自动收发货搜索
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