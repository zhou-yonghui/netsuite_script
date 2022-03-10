/**
 * 物流预录生成账单
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */
define(['N/search', 'N/ui/serverWidget', 'N/runtime', 'N/record', 'N/file', 'N/redirect', 'N/task', 'N/query','N/http','N/format'],

    function(search, serverWidget, runtime, record, file, redirect, task, query, http,format) {

        /**
         * Definition of the Suitelet script trigger point.
         *
         * @param {Object} context
         * @param {ServerRequest} context.request - Encapsulation of the incoming request
         * @param {ServerResponse} context.response - Encapsulation of the Suitelet response
         * @Since 2015.2
         */
        function onRequest(context) {
            var para = context.request.parameters;
            var recid_str = para.recordId;
            log.debug('para',JSON.stringify(recid_str));
            var recid_arr = recid_str.split('+');
            log.debug('recid_arr',recid_arr + recid_arr.length);
            var output_flag = 'N';
            var order_info;
            var wlgys;
            var bgf_sum = Number(0);
            var gs_sum = Number(0);
            var yf_sum = Number(0);
            var qgf_sum = Number(0);
            var currency;
            if(recid_arr.length > 0){
                for(var i = 1;i < recid_arr.length - 1;i++){
                    var rec = record.load({
                        type:'customrecord_cs_yldmx_c1',
                        id:recid_arr[i],
                        isDynamic:true,
                    });
                    var match_rec_id = rec.getValue('custrecord_cs_dh_c1');//采购或者库存转移单
                    order_info = checkSubsidiary(match_rec_id);
                    // var wlgys_text = rec.getText('custrecord_cs_wlgys_c1');//物流供应商
                    // wlgys = getWlgys(wlgys_text);
                    var bgf = rec.getValue('custrecordcustrecord_cs_wlyf_bgf_c1');//报关费
                    var gs = rec.getValue('custrecord_cs_gs_c1');//关税
                    var yf = rec.getValue('custrecord_cs_yf_c1');//运费
                    var qgf = rec.getValue('custrecord_cs_qgf_c1');//清关费
                    bgf_sum += Number(bgf);
                    gs_sum += Number(gs);
                    yf_sum += Number(yf);
                    qgf_sum += Number(qgf);
                }
                //单独获取wlgys
                var wlgys_text = record.load({type:'customrecord_cs_yldmx_c1',id:recid_arr[1],isDynamic:true}).getText('custrecord_cs_wlgys_c1');//物流供应商
                wlgys = getWlgys(wlgys_text);

                log.debug('bgf_sum gs_sum yf_sum qgf_sum',bgf_sum + '--' + gs_sum + '--' + yf_sum + '--' + qgf_sum);
                log.debug('order_info',order_info);
                if(order_info.subsidiary && wlgys && order_info.location){
                    if(bgf_sum > 0 || gs_sum > 0 || yf_sum > 0 || qgf_sum > 0){
                        var vendorbill_rec = record.create({
                            type:'vendorbill',
                            isDynamic:true,
                        });
                        vendorbill_rec.setValue('entity',wlgys);//供应商
                        // vendorbill_rec.setValue('custbody_cs_relatedir',context.newRecord.id);//TODO:正式环境id修改,关联货品收据
                        vendorbill_rec.setValue('subsidiary',order_info.subsidiary);//附属公司
                        vendorbill_rec.setValue('account',579);//2202.01 外部交易（id：579）
                        vendorbill_rec.setValue('currency',order_info.currency);//币种
                        vendorbill_rec.setValue('approvalstatus',2);//已核准
                        vendorbill_rec.setValue('memo',recid_arr[recid_arr.length - 1]);//备注
                        for(var n = 0;n < 4;n++){
                            vendorbill_rec.selectNewLine('item');//"costYun":costYun,"costGuan":costGuan,"costQing":costQing
                            if(n == 0 && yf_sum > 0){
                                vendorbill_rec.setCurrentSublistValue({
                                    sublistId:'item',
                                    fieldId:'item',
                                    // value:'8887',             //TODO：运费,测试id
                                    value:'9009'
                                });
                                vendorbill_rec.setCurrentSublistValue({
                                    sublistId:'item',
                                    fieldId:'quantity',
                                    value:yf_sum,
                                });
                                vendorbill_rec.setCurrentSublistValue({
                                    sublistId:'item',
                                    fieldId:'rate',
                                    value:'1'
                                });
                                vendorbill_rec.setCurrentSublistValue({
                                    sublistId:'item',
                                    fieldId:'location',
                                    value:order_info.location,
                                });
                                vendorbill_rec.commitLine('item');
                            }else if(n == 1 && gs_sum > 0){
                                vendorbill_rec.setCurrentSublistValue({
                                    sublistId:'item',
                                    fieldId:'item',
                                    // value:'8888',             //TODO:关税,测试id
                                    value:'9008',
                                });
                                vendorbill_rec.setCurrentSublistValue({
                                    sublistId:'item',
                                    fieldId:'quantity',
                                    value:gs_sum,
                                });
                                vendorbill_rec.setCurrentSublistValue({
                                    sublistId:'item',
                                    fieldId:'rate',
                                    value:'1'
                                });
                                vendorbill_rec.setCurrentSublistValue({
                                    sublistId:'item',
                                    fieldId:'location',
                                    value:order_info.location,
                                });
                                vendorbill_rec.commitLine('item');
                            }else if(n == 2 && qgf_sum > 0){
                                vendorbill_rec.setCurrentSublistValue({
                                    sublistId:'item',
                                    fieldId:'item',
                                    // value:'8891',             //TODO：清关费,测试id
                                    value:9007
                                });
                                vendorbill_rec.setCurrentSublistValue({
                                    sublistId:'item',
                                    fieldId:'quantity',
                                    value:qgf_sum,
                                });
                                vendorbill_rec.setCurrentSublistValue({
                                    sublistId:'item',
                                    fieldId:'rate',
                                    value:'1'
                                });
                                vendorbill_rec.setCurrentSublistValue({
                                    sublistId:'item',
                                    fieldId:'location',
                                    value:order_info.location,
                                });
                                vendorbill_rec.commitLine('item');
                            }
                            else if(n == 3 && bgf_sum > 0){
                                vendorbill_rec.setCurrentSublistValue({
                                    sublistId:'item',
                                    fieldId:'item',
                                    // value:'8889',             //TODO：报关费,测试id
                                    value:9006
                                });
                                vendorbill_rec.setCurrentSublistValue({
                                    sublistId:'item',
                                    fieldId:'quantity',
                                    value:bgf_sum,
                                });
                                vendorbill_rec.setCurrentSublistValue({
                                    sublistId:'item',
                                    fieldId:'rate',
                                    value:'1'
                                });
                                vendorbill_rec.setCurrentSublistValue({
                                    sublistId:'item',
                                    fieldId:'location',
                                    value:order_info.location,
                                });
                                vendorbill_rec.commitLine('item');
                            }
                        }
                        var vb_id = vendorbill_rec.save();
                        log.debug('账单id',vb_id);
                        if(vb_id){
                            output_flag = 'Y';
                            //回写物流费用预估单的物流账单字段
                            for(var n = 1;n < recid_arr.length - 1;n++){
                                record.submitFields({
                                    type:'customrecord_cs_yldmx_c1',
                                    id:recid_arr[n],
                                    values:{
                                        custrecord_cs_wuly_zd:vb_id,
                                        // custrecord_cs_zxzt_c1:2,             //执行状态，已执行
                                    }
                                })
                            }
                        }
                    }
                }
                if(output_flag == 'N'){
                    context.response.write({output:'N'});
                }
                else{
                    context.response.write({output:'Y'});
                }
            }
        }
        function getWlgys(wlgys_text) {
            var mysearch = search.create({
                type:'customrecord230',   //TODO：测试环境，物流供应商记录
                filters:[['name','is',wlgys_text]],
                columns:['custrecord6'],   //TODO：物流供应商字段
            });
            var res = mysearch.run().getRange(0,1);
            if(res.length){
                log.debug('wlgys',res[0].getValue('custrecord6'));
                return res[0].getValue('custrecord6');
            }
        }
        function checkSubsidiary(id) {
            if(id){
                var subsidiary;
                var location;
                var currency;
                var my_search = search.create({
                    type:'purchaseorder',
                    filters:[['internalid','is',id]],
                });
                var res = my_search.run().getRange(0,1);
                if(res.length > 0){
                    var po_rec = record.load({
                        type:'purchaseorder',
                        id:id,
                        isDynamic:true,
                    });
                    subsidiary = po_rec.getValue('subsidiary');
                    location = po_rec.getValue('location');
                    currency = po_rec.getValue('currency');
                }else{
                    var to_rec = record.load({
                        type:'transferorder',
                        id:id,
                        isDynamic:true,
                    });
                    subsidiary = to_rec.getValue('subsidiary');
                    location = to_rec.getValue('transferlocation');//收货仓库
                    currency = to_rec.getValue('currency');
                }
                return {"subsidiary":subsidiary,"location":location,'currency':currency};
            }
        }
        return {
            onRequest: onRequest
        };

    });