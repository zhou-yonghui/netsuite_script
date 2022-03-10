/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 *部分发货部分审核
 */
 define(['N/record','N/search'], function (record,search) {

    function beforeLoad(context) {
        try{
            if(context.type == 'create'){
                var para = context.request.parameters;
                var rec = context.newRecord;
                log.debug('para',para);
                var so_id = para.record_id;
                if(so_id){
                    var so_data = getSo(so_id);
                    log.debug('so_data',so_data);
                    //主体
                    rec.setValue('custrecord_sl_sobianhao',so_id);//销售订单
                    rec.setValue('custrecord_sl_so_amount',so_data.total);//折后总计
                    rec.setValue('custrecord_sl_so_djbl',so_data.djbl);//定金比例
                    rec.setValue('custrecord_sl_so_dkje',so_data.amount_sum);//销售到款金额
                    rec.setValue('custrecord_sl_so_yfcphz',so_data.yf_amount);//已发产品货值
                    rec.setValue('custrecord_sl_so_last_amount',so_data.amount_sum - so_data.yf_amount);//剩余到款金额
                    rec.setValue('custrecord_sl_wfdj_amount',(so_data.total - so_data.yf_amount) * (so_data.djbl/100));//未发货定金比例：未发货产品的货值 * 订金比例
                    // rec.setValue('custrecord_sl_zdfhjz',);//最大发货价值
                    //明细行
                    for(var i = 0;i < so_data.item_list.length;i++){
                        rec.setSublistValue({
                            sublistId:'recmachcustrecord_sl_guanlian_topy',
                            fieldId:'custrecord_sl_cp',
                            value:so_data.item_list[i].item,
                            line:i,
                        });
                        rec.setSublistValue({
                            sublistId:'recmachcustrecord_sl_guanlian_topy',
                            fieldId:'custrecord_sl_yfsl',
                            value:so_data.item_list[i].commit_qty,
                            line:i,
                        });
                        rec.setSublistValue({
                            sublistId:'recmachcustrecord_sl_guanlian_topy',
                            fieldId:'custrecord_sl_zhj',
                            value:so_data.item_list[i].zh_amount,
                            line:i,
                        });
                        rec.setSublistValue({
                            sublistId:'recmachcustrecord_sl_guanlian_topy',
                            fieldId:'custrecord_sl_shuliang',
                            value:so_data.item_list[i].qty,
                            line:i,
                        });
                        rec.setSublistValue({
                            sublistId:'recmachcustrecord_sl_guanlian_topy',
                            fieldId:'custrecord_sl_so_zkrate',
                            value:so_data.item_list[i].zh_rate,
                            line:i,
                        })
                    }
                }
            }
        }catch (e){
            log.debug('load',e);
        }
    }
    function getSo(so_id) {
        var item_list = new Array();
        var amount_sum = Number(0);
        var yf_amount = Number(0);
        if(so_id){
            var rec = record.load({
                type:'salesorder',
                id:so_id,
                isDynamic:true,
            });
            var count = rec.getLineCount('item');
            for(var i = 0;i < count;i++){
                rec.selectLine('item',i);
                var item = rec.getCurrentSublistValue({
                    sublistId:'item',
                    fieldId:'item',
                });
                var commit_qty = rec.getCurrentSublistValue({
                    sublistId:'item',
                    fieldId:'quantitycommitted',  //已确认数量
                });
                var fulfill_qty = rec.getCurrentSublistValue({
                    sublistId:'item',
                    fieldId:'quantityfulfilled',   //已完成数量
                });
                var rate = rec.getCurrentSublistValue({
                    sublistId:'item',
                    fieldId:'rate',
                });
                var zk = rec.getCurrentSublistValue({
                    sublistId:'item',
                    fieldId:'custcol_sl_so_zheko', //折扣
                })
                var zh_amount = rec.getCurrentSublistValue({
                    sublistId:'item',
                    fieldId:'amount',
                });
                var qty = rec.getCurrentSublistValue({
                    sublistId:'item',
                    fieldId:'quantity',
                })
                item_list.push({
                    "item":item,
                    "commit_qty":commit_qty,
                    "zh_amount":zh_amount,
                    "zh_rate":rate.toFixed(4),
                    "fulfill_qty":fulfill_qty,
                    "qty" : qty,
                });
                yf_amount += Number(rate) * Number(fulfill_qty);
            }
            var inv_id_arr = new Array();
            var links_count = rec.getLineCount('links');
            for(var j = 0;j < links_count;j++){
                rec.selectLine('links',j);
                var type = rec.getCurrentSublistValue({
                    sublistId:'links',
                    fieldId:'type',
                });
                var status = rec.getCurrentSublistValue({
                    sublistId:'links',
                    fieldId:'status'
                });
                if(type == '发票' && status == '全额收款'){
                    var inv_id = rec.getCurrentSublistValue({
                        sublistId:'links',
                        fieldId:'id',
                    })
                    // inv_id_arr.push(inv_id);
                    var inv_rec = record.load({
                        type:'invoice',
                        id:inv_id,
                        isDynamic:true
                    });
                    amount_sum += Number(inv_rec.getValue('total'));
                }
            }
            //获取发票总金额
            // var mysearch = search.create({
            //     type:'invoice',
            //     filters:[
            //         ['internalid','anyof',inv_id_arr],
            //         'AND',['mainline','is',true],
            //     ],
            //     columns:[
            //         'total'
            //     ]
            // });
            // var res = mysearch.run().getRange(0,1000);
            // log.debug('inv res',JSON.stringify(res));
            // for(var n = 0;n < res.length;n++){
            //     var inv_total = res[n].getValue('total');
            //     amount_sum += Number(inv_total);
            // }
        }
        return {
            "total":rec.getValue('total'),
            "zh_total":rec.getValue('custbody_sl_sozheko'),
            "djbl":rec.getValue('custbody_sl_so_deposit'),
            "yf_amount":yf_amount.toFixed(4),
            "amount_sum":amount_sum.toFixed(4),
            "item_list":item_list
        };
    }
    function beforeSubmit(context) {
        try {
            if(context.type == 'create' || context.type == 'edit'){
                var yunfei_sum = Number(0);
                var item_sum = Number(0);
                var rec = context.newRecord;
                var status = rec.getValue('custrecord_sl_bffhzt');//审批状态，5：待提交 ,10：财务审批中,9：审批通过
                if(status == 5){
                    var sub_data = getSublistData(rec,yunfei_sum,item_sum);
                    // log.debug('item_sum yunfei_sum',item_sum + '---' + yunfei_sum);
                    var djbl = rec.getValue('custrecord_sl_so_djbl');
                    var dk_amount = rec.getValue('custrecord_sl_so_dkje');
                    var zh_total = rec.getValue('custrecord_sl_so_amount');
                    //最大发货价值
                    rec.setValue('custrecord_sl_zdfhjz',dk_amount - (zh_total - (sub_data.item_sum + sub_data.yunfei_sum)) * (djbl/100));
                }
                else if(status == 10){
                    var zd_amount = rec.getValue('custrecord_sl_zdfhjz');
                    var sub_data = getSublistData(rec,yunfei_sum,item_sum);
                    if(zd_amount < sub_data.item_sum){
                        throw '申请发货的货值大于最大发货价值，不符合条件';
                    }
                }
            }
        }catch (e){
            log.debug('befor',e);
        }
    }
    function getSublistData(rec,yunfei_sum,item_sum) {
        var count = rec.getLineCount('recmachcustrecord_sl_guanlian_topy');
        for(var i = 0;i < count;i++){
            var paln_qty = rec.getSublistValue({
                sublistId:'recmachcustrecord_sl_guanlian_topy',
                fieldId:'custrecord_sl_qty_plan',
                line:i
            });
            if(paln_qty){
                var yunfei = rec.getSublistValue({
                    sublistId:'recmachcustrecord_sl_guanlian_topy',
                    fieldId:'custrecord_sl_fpyf',
                    line:i
                });
                var zh_rate = rec.getSublistValue({
                    sublistId:'recmachcustrecord_sl_guanlian_topy',
                    fieldId:'custrecord_sl_so_zkrate',
                    line:i
                });
                item_sum += Number(paln_qty) * Number(zh_rate);
                yunfei_sum += Number(yunfei);
            }
        }
        // item_sum = 1000;
        return {
            "yunfei_sum":yunfei_sum,
            "item_sum":item_sum,
        }
    }
    function afterSubmit(context) {
        try{
            // if(context.type == 'view'){
            var old_rec = context.oldRecord;
            var old_status = old_rec.getValue('custrecord_sl_bffhzt');
            log.debug('old_s',old_status);
            var rec = context.newRecord;
            var status = rec.getValue('custrecord_sl_bffhzt');
            var so_id = rec.getValue('custrecord_sl_sobianhao');
            log.debug('status',status);
            if(old_status != status){
                if(status == 9){//审核通过
                    record.submitFields({
                        type:'salesorder',
                        id:so_id,
                        values:{
                            custbody_sl_match_bffh:rec.id,
                        }
                    });
                    //更新明细状态
                    setBfDetails(rec.id,status);
                }
                else if(status == 10){//2 采购审核 ,10 财务审核中
                    setBfDetails(rec.id,status);
                }
            }
            // }
        }
        catch (e){
            log.debug('after',e);
        }
    }
    function setBfDetails(order_id,status) {
        if(order_id){
            var mysearch = search.create({
                type:'customrecord_sl_bffhshmx',
                filters:[
                    ['custrecord_sl_guanlian_topy','anyof',order_id],
                    // 'AND',['']
                ]
            });
            var res = mysearch.run().getRange(0,1000);
            log.debug('res',JSON.stringify(res));
            for(var i = 0;i < res.length;i++){
                if(status == 10){
                    record.submitFields({
                        type:'customrecord_sl_bffhshmx',
                        id:res[i].id,
                        values:{
                            custrecord_sl_cgysh:true,
                        }
                    });
                }
                else if(status == 9){
                    record.submitFields({
                        type:'customrecord_sl_bffhshmx',
                        id:res[i].id,
                        values:{
                            custrecord_sl_cwysh:true,
                        }
                    });
                }
            }
        }
    }
    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    }
});
