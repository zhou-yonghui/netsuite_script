/**
 * @Author: zhouyh
 * @Date: 2021-12-30 10:04:15
 * @LastEditors: zhouyh
 * @LastEditTime: 2021-12-30 10:04:16
 * @Description: 检查出货计划和货件计划数据
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 */
 define(
    ['N/search', 'N/record', 'N/task','N/file','N/runtime','N/format'],
    function(search, record, task,file,runtime,format) {
        function getInputData() {
            try{
                var ret_arr = initSearch();
                log.debug('ret_arr',ret_arr);
                if(ret_arr.length > 0){
                    for(var i = 0;i < ret_arr.length;i++){
                        if(ret_arr[i].error != 'pass'){
                            var ch_id;
                            var ch_rec = record.load({
                                type:'customrecord_wl_plan_detail',
                                id:ret_arr[i].chid,
                                isDynamic:true,
                            });
                            if(ret_arr[i].error == 'Y'){
                                var str = '错误信息：';
                                if(ret_arr[i].store != '' || ret_arr[i].store != null){
                                    str += ret_arr[i].store + '\n';
                                }
                                if(ret_arr[i].fnsku || ret_arr[i].fnsku != null){
                                    str += ret_arr[i].fnsku + '\n';
                                }
                                if(ret_arr[i].sellersku || ret_arr[i].sellersku != null){
                                    str += ret_arr[i].sellersku + '\n';
                                }
                                if(ret_arr[i].fbacode || ret_arr[i].fbacode != null){
                                    str += ret_arr[i].fbacode + '\n';
                                }
                                if(ret_arr[i].shipmentid || ret_arr[i].shipmentid != null){
                                    str += ret_arr[i].shipmentid + '\n';
                                }
                                ch_rec.setValue('custrecord_sl_pp_ship_error',str);
                                ch_id = ch_rec.save();
                            }
                            else{
                                ch_rec.setValue('custrecord_sl_pp_ship_error','配对成功');
                                ch_id = ch_rec.save();
                            }
                            log.debug('保存成功',ch_id);
                        }
                    }
                }
            }catch(e){
                log.debug('error',e);
            }
        }

        function map(context) {
            log.debug({
                title: 'context map',
                details: context
            });
        }

        function reduce(context) {
            log.debug({
                title: 'context',
                details: context
            });
        }
        function summarize(summary) {
            log.debug({
                title: 'summary',
                details: summary
            });
        }

        function initSearch() {
            var shipment_id_arr = new Array();
            var ret_arr = new Array();
            var ch_search = search.create({
                type:'customrecord_wl_plan_detail',
                filters:[
                    ['custrecord_sl_pp_ship_error','isempty',[]],
                    // ['internalid','is',8806],
                    'AND',['isinactive','is',false],
                ],
                columns:[
                    'custrecord_ls_dg_shipment_id','custrecord_account','custrecord_fnsku','custrecord_sellersku',
                    'custrecord_fc','custrecord_shipment_id_quantity'
                ]
            });
            var ch_res = ch_search.run().getRange(0,100);
            log.debug('ch_res',JSON.stringify(ch_res));
            
            for(var i = 0;i < ch_res.length;i++){
                var shipment_id = ch_res[i].getValue('custrecord_ls_dg_shipment_id');
                // shipment_id_arr.push(shipment_id);
                var ret_obj = new Object();
                ret_obj.store = '';
                ret_obj.fnsku = '';
                ret_obj.sellersku = '';
                ret_obj.fbacode = '';
                ret_obj.shipmentid = '';
                ret_obj.error = '';
                ret_obj.chid = ch_res[i].id;
                var hj_search = search.create({
                    type:'customrecord_inbound_shipment_info',
                    filters:[
                        ['custrecord_shipment_id','is',shipment_id],
                        'AND',['isinactive','is',false],
                    ],
                    columns:[
                        'custrecord_shipment_store_id','custrecord_item_shipment_id.custrecord_shipment_item_seller_sku','custrecord_destination_fulfillment_cente',
                        'custrecord_item_shipment_id.custrecord_quantity_shipped','custrecord_item_shipment_id.custrecord_fulfillment_network_sku'
                    ]
                });
                var hj_col = hj_search.columns;
                var hj_res = hj_search.run().getRange(0,1);
                log.debug('hj_res',JSON.stringify(hj_res));
                var flag = 'N';
                if(hj_res.length > 0){
                    if(ch_res[i].getValue('custrecord_fnsku') != hj_res[0].getValue(hj_col[4])){
                        ret_obj.fnsku = '与货件计划FNSKU：' + hj_res[0].getValue(hj_col[4]) + '不一致';
                        flag = 'Y';
                    } 
                    if(ch_res[i].getValue('custrecord_shipment_id_quantity') != hj_res[0].getValue(hj_col[3])){
                        ret_obj.shipmentid = '与货件计划发货数量：' + hj_res[0].getValue(hj_col[3]) + '不一致';
                        flag = 'Y';
                    }
                    
                    if(ch_res[i].getValue('custrecord_account') != hj_res[0].getValue('custrecord_shipment_store_id')){
                        ret_obj.store = '与货件计划店铺ID：' + hj_res[0].getValue('custrecord_shipment_store_id') + '不一致';
                        flag = 'Y';
                    }
                    if(ch_res[i].getValue('custrecord_sellersku') != hj_res[0].getValue(hj_col[1])){
                        ret_obj.sellersku = '与货件计划卖方SKU：' + hj_res[0].getValue(hj_col[1]) + '不一致';
                        flag = 'Y';
                    }
                    if(ch_res[i].getValue('custrecord_fc') != hj_res[0].getValue('custrecord_destination_fulfillment_cente')){
                        ret_obj.fbacode = '与货件计划亚马逊创建的亚马逊运营中心标识符：' + hj_res[0].getValue('custrecord_destination_fulfillment_cente') + '不一致';
                        flag = 'Y';
                    }
                }
                else{
                    flag = 'pass';
                }
                ret_obj.error = flag;
                ret_arr.push(ret_obj);
            }
            return ret_arr;
        }
        return {
            getInputData: getInputData,
            map: map,
            reduce: reduce,
            summarize: summarize
        };
    });