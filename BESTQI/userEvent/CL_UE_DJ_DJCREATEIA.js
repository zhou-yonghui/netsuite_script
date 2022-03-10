/**
 *平台调货单转库存调整
      1、同公司之间货品转换生成库存调整
      2、不同公司间货品转换先公司间内部交易，再由目的仓公司库存调整
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
 define(['N/record','N/search','N/currency'],
 function(record,search,exchangeRate) {
     function beforeLoad(context) {
         
     }
     function beforeSubmit(context){

     }		
     function afterSubmit(context){
         var rec = record.load({
             type:'customrecord_hl_platform_transfer',
             id:context.newRecord.id,
         });
         var order_do_flag = 'N';
         try{
            //先勾选生成中字段
            // setToF('true',context.newRecord.id);
            //______________________________
            var apprveStatus = rec.getValue({fieldId:'custrecord_hl_approval_status'});
            var iaId;
            var save_flag = 'N';
            if(apprveStatus == '2' && rec.getValue('isinactive') == false){
                var count = rec.getLineCount({sublistId:'recmachcustrecord_hl_association_header_record'});
                for(var i = 0;i < count;i++){
                    var out_order = rec.getSublistValue({sublistId:'recmachcustrecord_hl_association_header_record',fieldId:'custrecord_hl_transfer_out_document',line:i});
                    var in_order = rec.getSublistValue({sublistId:'recmachcustrecord_hl_association_header_record',fieldId:'custrecord_hl_transfer_in_document',line:i});
                    var detail_id = rec.getSublistValue({sublistId:'recmachcustrecord_hl_association_header_record',fieldId:'id',line:i});
                    //判断是否已生成库存转移
                    if(!out_order && !in_order){
                        var outSku = rec.getSublistValue({sublistId:'recmachcustrecord_hl_association_header_record',fieldId:'custrecord_hl_transfer_out_goods',line:i});//调出货品
                        var outLocation = rec.getSublistValue({sublistId:'recmachcustrecord_hl_association_header_record',fieldId:'custrecord_hl_transfer_out_of_warehouse',line:i});//调出仓库
                        var outSubsidary = rec.getSublistValue({sublistId:'recmachcustrecord_hl_association_header_record',fieldId:'custrecord_hl_affiliated_company_out',line:i});//调出所属公司
                        var outQty = rec.getSublistValue({sublistId:'recmachcustrecord_hl_association_header_record',fieldId:'custrecord_hl_transfer_out_quantity',line:i});//调出数量
                        var inSku = rec.getSublistValue({sublistId:'recmachcustrecord_hl_association_header_record',fieldId:'custrecord_hl_transfer_in_goods',line:i});//调入货品
                        var inLocation = rec.getSublistValue({sublistId:'recmachcustrecord_hl_association_header_record',fieldId:'custrecord_hl_transfer_in_warehouse',line:i});//调入仓库
                        var inSubsidary = rec.getSublistValue({sublistId:'recmachcustrecord_hl_association_header_record',fieldId:'custrecord_hl_affiliated_company_in',line:i});//调入所属公司
                        var inQty = rec.getSublistText({sublistId:'recmachcustrecord_hl_association_header_record',fieldId:'custrecord_hl_transfer_in_quantity',line:i});//调入数量
                        log.debug('outSku outSubsidary outLocation outQty inSubsidary inSku inLocation inQty',outSku + '---' + outSubsidary + '---' + outLocation + '===' + outQty + '---' + inSubsidary + '--' + inSku + '---' + inLocation + '===' + inQty);
                        //同公司转移
                        if(getLocation(outLocation).subsidiary == getLocation(inLocation).subsidiary){
                            //同公司可在同一调整单上做两个明细行
                            iaId = createIa(outSubsidary,outLocation,outSku,outQty,inSubsidary,inSku,inLocation,inQty,'ONE');
                            log.debug('iaid',iaId);
                            if(iaId){
                                save_flag = 'Y';
                                //对平台调货明细赋值
                                rec.setSublistValue({sublistId:'recmachcustrecord_hl_association_header_record',fieldId:'custrecord_hl_transfer_out_document',value:iaId,line:i});//调出单据
                                rec.setSublistValue({sublistId:'recmachcustrecord_hl_association_header_record',fieldId:'custrecord_hl_transfer_in_document',value:iaId,line:i});//调入单据
                            }
                        }
                        //不同公司转移
                        else{
                            //先生成内部交易
                            var nb_po_id = createPo(outLocation,inLocation,outSku,outQty,detail_id);
                            log.debug('nb_po_id',nb_po_id);
                            if(nb_po_id){
                                //后生成目的公司的库存调整
                                var iaId_one = createIa(outSubsidary,outLocation,outSku,outQty,inSubsidary,inSku,inLocation,inQty,"TWO1",nb_po_id);
                                log.debug('iaid out',iaId_one);
                                var iaId_two = createIa(outSubsidary,outLocation,outSku,outQty,inSubsidary,inSku,inLocation,inQty,"TWO2",nb_po_id);
                                log.debug('iaid in',iaId_two);
                                if(iaId_one && iaId_two){
                                    save_flag = 'Y';
                                    order_do_flag = 'Y';
                                    //对平台调货明细赋值
                                    rec.setSublistValue({sublistId:'recmachcustrecord_hl_association_header_record',fieldId:'custrecord_hl_seasoning_condiments_po',value:nb_po_id,line:i});//调货单公司间PO
                                    rec.setSublistValue({sublistId:'recmachcustrecord_hl_association_header_record',fieldId:'custrecord_hl_transfer_out_document',value:iaId_one,line:i});//调出单据
                                    rec.setSublistValue({sublistId:'recmachcustrecord_hl_association_header_record',fieldId:'custrecord_hl_transfer_in_document',value:iaId_two,line:i});//调入单据
                                }
                            }
                        }
                    }
                }
                log.debug('save_flag',save_flag);
                if(save_flag == 'Y'){
                    if(order_do_flag == 'Y'){
                        rec.setValue('custrecord_hl_document_generation',false);
                    }
                    var dh_id = rec.save();
                    log.debug('保存之后的平台调货单id',dh_id);
                }
                else{
                    rec.setValue('custrecord_hl_document_generation',true);
                    var dh_id = rec.save();
                    log.debug('生成单据异常保存之后的平台调货单id',dh_id);
                }
            }
         }
         catch(e){
             log.debug({
                 title: '生成库存调整或者生成内部po报错',
                 details: e
             })
         }
     }
     function setToF(flag,dgId) {
        log.debug('flag dgId',flag + dgId);
        if(flag){
            if(flag == 'true'){
                flag = true;
            }else if(flag == 'false'){
                flag = false;
            }
            //先将单据生成中字段勾选
            record.submitFields({
                type:'customrecord_hl_platform_transfer',
                id:dgId,
                values:{
                    custrecord_hl_document_generation:flag,
                }
            });
        }
    }
     function createIa(outSubsidary,outLocation,outSku,outQty,inSubsidary,inSku,inLocation,inQty,flag,nb_po_id) {
        try{
            var iaRec = record.create({type:'inventoryadjustment'});
            if(flag == 'ONE'){
                iaRec.setValue({fieldId:'subsidiary',value:outSubsidary});
                iaRec.setValue({fieldId:'adjlocation',value:outLocation});
            }
            else if(flag == 'TWO1'){
                iaRec.setValue({fieldId:'subsidiary',value:outSubsidary});
                iaRec.setValue({fieldId:'adjlocation',value:outLocation});
            }
            else if(flag == 'TWO2'){
                iaRec.setValue({fieldId:'subsidiary',value:inSubsidary});
                iaRec.setValue({fieldId:'adjlocation',value:inLocation});
            }
            iaRec.setValue({fieldId:'account',value:634});//528 外部成本	 634：正式环境
            iaRec.setValue({fieldId:'custbody_iatype2',value:4});//其他
            var j_index;
            if(flag == 'ONE'){
                j_index = 2; 
            }else if(flag == 'TWO1' || flag == 'TWO2'){
                j_index = 1;
            }					
            for(var j = 0;j < j_index;j++){
                if(flag == 'ONE'){
                    //调出仓
                    if(j == 0){
                        iaRec.setSublistValue({sublistId:'inventory',fieldId:'item',line:j,value:outSku || ' '});
                        iaRec.setSublistValue({sublistId:'inventory',fieldId:'location',line:j,value:outLocation || ' '});
                        if(outQty > 0){
                            iaRec.setSublistValue({sublistId:'inventory',fieldId:'adjustqtyby',line:j,value: -outQty || ' '});//实际数量
                            iaRec.setSublistValue({sublistId:'inventory',fieldId:'custcol_hl_bsq_plan_qty',line:j,value: -outQty});//计划数量
                        }
                    }
                    //调入仓
                    else if(j == 1){
                        iaRec.setSublistValue({sublistId:'inventory',fieldId:'item',line:j,value:inSku || ' '});
                        iaRec.setSublistValue({sublistId:'inventory',fieldId:'location',line:j,value:inLocation || ' '});
                        if(inQty > 0){
                            iaRec.setSublistValue({sublistId:'inventory',fieldId:'adjustqtyby',line:j,value:inQty || ' '});//
                            iaRec.setSublistValue({sublistId:'inventory',fieldId:'custcol_hl_bsq_plan_qty',line:j,value: inQty});//
                        }
                    }
                }
                else if(flag == 'TWO1'){
                    iaRec.setSublistValue({sublistId:'inventory',fieldId:'item',line:j,value:outSku || ' '});
                    iaRec.setSublistValue({sublistId:'inventory',fieldId:'location',line:j,value:outLocation || ' '});
                    if(outQty > 0){
                        iaRec.setSublistValue({sublistId:'inventory',fieldId:'adjustqtyby',line:j,value: -outQty || ' '});//
                        iaRec.setSublistValue({sublistId:'inventory',fieldId:'custcol_hl_bsq_plan_qty',line:j,value: -outQty});//
                    }
                }
                else if(flag == 'TWO2'){
                    iaRec.setSublistValue({sublistId:'inventory',fieldId:'item',line:j,value:inSku || ' '});
                    iaRec.setSublistValue({sublistId:'inventory',fieldId:'location',line:j,value:inLocation || ' '});
                    if(inQty > 0){
                        iaRec.setSublistValue({sublistId:'inventory',fieldId:'adjustqtyby',line:j,value:inQty || ' '});//
                        iaRec.setSublistValue({sublistId:'inventory',fieldId:'custcol_hl_bsq_plan_qty',line:j,value: inQty});//
                    }
                }
            }

            var iaId = iaRec.save();
            return iaId;
        }catch(e){
            log.debug('生成库存调整错误',e);
            record.delete({
                type: 'purchaseorder',
                id: nb_po_id
            });
            log.debug('删除已生成的内部po');
        }
     }
     function createPo(start_location,end_location,sku,actual_shipment_quantity,detail_id) {
        var jcbi_data = getJcbi(getLocation(start_location).subsidiary,getLocation(end_location).subsidiary);
        var nb_price_data = getNbPrice(jcbi_data,sku,start_location);
        //内部采购字段数据
        var po_sub = getLocation(end_location).subsidiary;
        var po_currency_text = jcbi_data.currency_text;
        var po_vendor = jcbi_data.nbVendor;
        var po_rate = nb_price_data.nb_price;
        var po_orgin_price = nb_price_data.nb_rate * nb_price_data.nb_hl;//基价
        var po_add_price = Number(po_rate) - Number(po_orgin_price); 
        var po_item = sku;
        var po_taxcode = 16;//固定值"VAT_CN:VAT_0%"
        var po_qty = actual_shipment_quantity;
        var po_location = end_location;
        
        //创建内部采购
        var poNbRec = record.create({type:'purchaseorder',isDynamic:true});
        // poNbRec.setText("customform","BSQ_采购订单(内部)");//表格样式,BSQ_采购订单(内部)
        poNbRec.setValue('customform',132);
        poNbRec.setValue('entity',po_vendor);//供应商
        poNbRec.setValue('subsidiary',po_sub);//子公司
        poNbRec.setText('currency',po_currency_text);//币种
        poNbRec.setValue('location',po_location);//地点
        poNbRec.setValue('custbody_hl_transfer_order',detail_id);//来源平台调货单
        poNbRec.setValue('approvalstatus',2);//已核准
        //货品明细赋值
        poNbRec.selectNewLine('item');
        poNbRec.setCurrentSublistValue({
            sublistId:'item',
            fieldId:'item',     //货品
            value:po_item,
            // line:0
        });
        // poNbRec.setCurrentSublistValue({
        //     sublistId:'item',
        //     fieldId:'taxcode',//税码
        //     value:po_taxcode,
        //     // line:0,
        // });
        poNbRec.setCurrentSublistValue({
            sublistId:'item',
            fieldId:'rate',//单价
            value:po_rate,
            // line:0,
        });
        poNbRec.setCurrentSublistValue({
            sublistId:'item',
            fieldId:'quantity',//数量
            value:po_qty,
            // line:0,
        });
        poNbRec.setCurrentSublistValue({
            sublistId:'item',
            fieldId:'custcol_baseprice1',//基价单价
            value:po_orgin_price,
            // line:0,
        });
        poNbRec.setCurrentSublistValue({
            sublistId:'item',
            fieldId:'custcol_overprice1',//加价单价
            value:po_add_price,
            // line:0,
        });
        poNbRec.setCurrentSublistValue({
            sublistId:'item',
            fieldId:'custcol_baseprice2',//基价总额
            value:po_orgin_price * po_qty,
            // line:0,
        });
        poNbRec.setCurrentSublistValue({
            sublistId:'item',
            fieldId:'custcol_overprice2',//加价总额
            value:po_add_price * po_qty,
            // line:0,
        });
        poNbRec.commitLine('item');

        var po_id = poNbRec.save();

        return po_id;
     }
     function getJcbi(so_sub,po_sub) {//paramater:so_sub:发货仓附属公司；po_sub：收获仓附属公司
        if(so_sub && po_sub){
            var mysearch = search.create({
                type:'customrecord_add_scale_record',
                filters:[
                    ['custrecord_sales_company','anyof',so_sub],
                    'AND',['custrecord_sourcing_company','anyof',po_sub],
                ],
                columns:[
                    'custrecord_currency_internal',
                    'custrecord_bonus_proportion',
                    'custrecord_internal_supplier',
                    'custrecord_internal_customers'
                ]
            });
            var res = mysearch.run().getRange(0,1);
            if(res.length > 0){
                return {"currency_text":res[0].getText('custrecord_currency_internal'),"jcbi":res[0].getValue('custrecord_bonus_proportion'),"nbVendor":res[0].getValue('custrecord_internal_supplier'),"nbcustomer":res[0].getValue('custrecord_internal_customers')};
            }
        }
     }
     function getNbPrice(jcbi_data,sku,start_location) {
        var nb_hl = Number(0);
        var nb_rate = Number(0);
        var nb_price = Number(0);
        //没采购取库存平均成本
        if(jcbi_data){
            var locationaveragecost = getLocationaveragecost(sku,start_location);
            log.debug('地点平均成本',locationaveragecost);
            nb_hl = Number(getCurrencyRate(getItem(sku,"1").currency_text,"USD"));
            if(locationaveragecost > 0){//地点平均成本大于零
                nb_rate = locationaveragecost;
                nb_price = locationaveragecost * (Number(1) + Number(jcbi_data.jcbi.split("%")[0]/100)) * nb_hl;
            }
            else{//获取货品的上次采购价格
                locationaveragecost = getItem(sku,"0");
                log.debug('上次采购价格',locationaveragecost);
                nb_rate = locationaveragecost;
                nb_price = locationaveragecost * (Number(1) + Number(jcbi_data.jcbi.split("%")[0]/100)) * nb_hl;
            }
        }
        return {"nb_hl":nb_hl,"nb_rate":nb_rate,"nb_price":nb_price};
    }
    function getItem(item,flag) {
        if(item){
            var rec = record.load({
                type:'inventoryitem',
                id:item
            });
            var item_sub = rec.getValue('subsidiary');
            var item_lastpurchaseprice = rec.getValue('lastpurchaseprice');//上次采购价格
            if(flag == "1"){
               var sub_data = getSubsidiary(item_sub);
               return sub_data;
            }else{
                return item_lastpurchaseprice;
            }
        }
    }
    function getCurrencyRate(source,target) {
        if(source && target){
            var rate = exchangeRate.exchangeRate({
                source:source,
                target:target,
                date:new Date(),
            });
            return rate;
        }
    }
    function getLocationaveragecost(sku,location,subsidiary) { //TODO:获取货品平均成本
        var locationaveragecost = Number(0);
        var mySearch = search.create({
            type:'item',
            filters:[['internalid','anyof',sku],
                // 'AND',['quantityavailable','greaterthan',0]
            ], //
            columns:[
                {name:'locationquantityavailable',type:'float',label:'可用地点'},            
                {name:'subsidiarynohierarchy',type:'select',label:'库存地点子公司'},
                {name:'inventorylocation',type:'select',label:'库存地点'},
                {name:'quantityavailable',label:'可用'},
                {name:'locationquantityavailable'},
                {name:'locationquantitycommitted'},
                {name:'locationquantitycommitted',label:'地点已确定'},
                {name:'locationaveragecost',label:'地点平均成本'}
            ]
        });
        var col = mySearch.columns;
        var res = mySearch.run().getRange({start:0,end:1000});
        log.debug('sku location',sku + '--' + location);
        // log.debug('平均成本条数',res.length + JSON.stringify(res));
        if(res.length > 0){
            for(var i = 0;i < res.length;i++){
                var location_search = res[i].getValue(col[2]);
                if(location == location_search){
                    locationaveragecost = res[i].getValue(col[7]);
                }
            }
        }
        return locationaveragecost;
    }
     function getInvItemCost(outSku,outLocation){
         log.debug('outSku',outSku);
         var adjRec = record.load({type:'inventoryitem',id:outSku});
         var count = adjRec.getLineCount({sublistId:'locations'});
         for(var i = 0;i < count;i++){
             var location = adjRec.getSublistValue({sublistId:'locations',fieldId:'location',line:i});
             var cost = adjRec.getSublistValue({sublistId:'locations',fieldId:'averagecostmli',line:i});
             if(location == outLocation){
                 return cost;
             }
         }	
     }
     function getSubsidiary(subsidiary_id) {
        if(subsidiary_id){
            var rec = record.load({
                type:'subsidiary',
                id:subsidiary_id,
            });
            var sub_name = rec.getValue('name');
            var currency_text = rec.getText('currency');

            return {"sub_name":sub_name,"currency_text":currency_text};
        }
    }
     function getLocation(location_id) {
        if(location_id){
            var rec = record.load({
                type:'location',
                id:location_id,
            });
            var subsidiary = rec.getValue('subsidiary');

            return {"subsidiary":subsidiary};
        }
    }
    return {
        // beforeLoad: beforeLoad,
        beforeSubmit:beforeSubmit,
        afterSubmit:afterSubmit
    };
});


