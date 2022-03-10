/**
 * 采购收货更改关联销售订单明细的状态
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
 define(['N/record','N/search','N/format','N/runtime'],
 function(record,search,format,runtime) {
     function beforeLoad(context) {
        //预加载信息
        if(context.type == 'create'){
            var rec = context.newRecord;
            var line_count = rec.getLineCount('item');
            for(var i = 0;i < line_count;i++){
                var item = rec.getSublistValue({
                    sublistId:'item',
                    fieldId:'item',
                    line:i,
                });
                var qty = rec.getSublistValue({
                    sublistId:'item',
                    fieldId:'quantity',
                    line:i,
                });
                log.debug('beforload line_id item qty',i + '--' + item + '---' + qty);
            }
        }
     }
     function beforeSubmit(context) {

     }
     function afterSubmit(context) {
         try{
            var ir_arr = new Array(); 
            if(context.type == 'create'){
                var rec = context.newRecord;
                var po = rec.getValue('createdfrom');
                var po_flag = checkPo(po);
                if(po_flag == "true"){
                    var line_count = rec.getLineCount('item');
                    for(var i = 0;i < line_count;i++){
                        var item = rec.getSublistValue({
                            sublistId:'item',
                            fieldId:'item',
                            line:i,
                        });
                        var qty = rec.getSublistValue({
                            sublistId:'item',
                            fieldId:'quantity',
                            line:i,
                        });
                        var item_receive = rec.getSublistValue({
                            sublistId:'item',
                            fieldId:'itemreceive',
                            line:i,
                        });
                        var location = rec.getSublistText({
                            sublistId:'item',
                            fieldId:'location',
                            line:i,
                        })
                        log.debug('after line_id item qty itemreceive location',i + '--' + item + '---' + qty + '---' + item_receive + '---' + location);
                        if(item_receive == true){
                            ir_arr.push({
                                "item":item,
                                "actual_qty":qty,
                                "line":i,
                                "location":location,
                            });
                        }
                    }
                    log.debug('收货信息',ir_arr);
                    //赋值关联销售订单明细
                    getPo(po,ir_arr);
                }
            }
         }catch(e){
             log.debug('收货更新销售明细状态报错',e);
         }
     }
     function checkPo(po_id){
         if(po_id){
             var mysearch = search.create({
                 type:'purchaseorder',
                 filters:[['internalid','is',po_id]]
             });
             var res = mysearch.run().getRange(0,1);
             if(res.length > 0){
                 return "true";
             }else{
                 return "false";
             }
         }
     }
     function getPo(po_id,ir_arr){
         if(po_id){
             //获取po明细行
             var po_rec = record.load({type:'purchaseorder',id:po_id,isDynamic:true});
             var item_count = po_rec.getLineCount('item');
             for(var i = 0;i < item_count;i++){
                 var so_line_status;
                 po_rec.selectLine('item',i);
                 var item = po_rec.getCurrentSublistValue({
                     sublistId:'item',
                     fieldId:'item'
                 });
                 var qty = po_rec.getCurrentSublistValue({
                    sublistId:'item',
                    fieldId:'quantity'
                 });
                 var quantityreceived = po_rec.getCurrentSublistValue({
                     sublistId:'item',
                     fieldId:'quantityreceived',
                 });
                 var so_id = po_rec.getCurrentSublistValue({
                    sublistId:'item',
                    fieldId:'custcol_sl_so_id'
                });
                log.debug('so_id quantityreceived qty',so_id + '---' + quantityreceived + '---' + qty);
                for(var j = 0;j < ir_arr.length;j++){
                    if(i == ir_arr[j].line && item == ir_arr[j].item){
                        if(qty > quantityreceived){
                            so_line_status = '部分收货,库位：' + ir_arr[j].location;
                        }else{
                            so_line_status = '全部收货,库位：' + ir_arr[j].location;
                        }
                        //更新销售明细
                        changeSo(so_id,po_id,item,so_line_status);
                    }
                }
             }
         }
     }
     function changeSo(so_id,poid,po_item,so_line_status){
        if(so_id){
            var so_rec = record.load({type:'salesorder',id:so_id,isDynamic:true});
            var item_count = so_rec.getLineCount('item');
            for(var i = 0;i < item_count;i++){
                so_rec.selectLine('item',i);
                var po_id = so_rec.getCurrentSublistValue({
                    sublistId:'item',
                    fieldId:'custcol_sl_po_id'
                });
                if(po_id){
                    var item = so_rec.getCurrentSublistValue({
                        sublistId:'item',
                        fieldId:'item',
                    });
                    if(po_item == item && po_id == poid){
                        so_rec.setCurrentSublistValue({
                            sublistId:'item',
                            fieldId:'custcol_sl_genjzt',
                            value:so_line_status,
                        });
                        so_rec.commitLine('item');
                    }
                }
            }
            var tranid = so_rec.getValue('tranid');
            so_rec.save();
            log.debug('更新状态的so',tranid);
        }
     }
     return {
        //  beforeLoad: beforeLoad,
        //  beforeSubmit: beforeSubmit,
         afterSubmit: afterSubmit
     };
 });
