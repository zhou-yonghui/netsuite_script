/**
 * @LastEditors: zhouyh
 * @LastEditTime: 2022-02-17 15:21:40
 * @Description: 创建发票生成到款通知的差额贷项通知
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define(['N/record','N/search','N/format','N/runtime'],
    function(record,search,format,runtime) {
        function beforeLoad(context) {

        }
        function beforeSubmit(context) {

        }
        function afterSubmit(context) {
            try{
                //创建发票生成差额贷项通知
                if(context.type == 'create'){
                    var rec = record.load({type : 'invoice',id : context.newRecord.id,isDynamic:true});
                    var createdfrom_t = rec.getText('createdfrom');
                    log.debug('创建自',createdfrom_t);
                    if(createdfrom_t.indexOf('SO') != -1){
                        var so_id = rec.getValue('createdfrom');
                        if(so_id){
                            var soRec = record.load({
                                type:'salesorder',
                                id:so_id,
                                isDynamic:true,
                            });
                            var so_data = getSo(so_id);
                            if(so_data != 'null'){
                                if(so_data.hk_sum_amount != 0 || so_data.hk_sum_amount != null || so_data.hk_sum_amount != ' '){
                                    doSome(so_id,so_data,context.newRecord.id);
                                }
                            }
                        }
                    }
                }
            }catch (e) {
                log.debug('create creditmemo error',e);
            }
        }
        function getSo(so_id) {
            if(so_id){
                var rec = record.load({
                    type:'salesorder',
                    id:so_id,
                    isDynamic:true,
                });
                return{
                    "currency":rec.getValue('currency'),
                    "department":rec.getValue('department'),
                    "location":rec.getValue('location'),
                    "class":rec.getValue('class'),
                    "entity":rec.getValue('entity'),
                    "baojiadan":rec.getValue('custbody_sl_bbaojiadan'), //报价单号
                    "wd_num":rec.getValue('custbody_sl_so_innumber'),   //网单号
                    "pay_type":rec.getValue('custbody_sl_sopayway'),     //付款方式
                    "total":rec.getValue('total'),          //总计
                    "hk_sum_amount":rec.getValue('custbody_sl_soamm'),      //回款金额
                    "ce_type":rec.getText('custbody_difference_type'),   //差额类型
                }
            }
            else{
                return 'null';
            }
        }
        function doSome(so_id,so_data,invoice_id) {
            var ce_amount = Number(0);
            var so_hk_amount = so_data.hk_sum_amount;//销售到款净金额
            var so_total_zmount = so_data.total;//销售订单总额
            var inv_arr = new Array();
            if(!so_hk_amount){
                so_hk_amount = Number(0);
            }
            //判断差额,回款金额小于销售金额，是否<=配置表的“自动核销判断差额（30USD）”，销售订单默认是USD币种；如果是，先创建贷项，再贷项勾选应用发票核销
            log.debug('so_hk_amount so_total_zmount',so_hk_amount+ '--- ' + so_total_zmount);
            if(Number(so_hk_amount)  < Number(so_total_zmount) && Number(so_total_zmount) - Number(so_hk_amount) < 30){
                log.debug('so_id',so_id);
                //加载未结搜索
                var invoice_search = search.load('customsearch_open_invoice');
                var inv_col = invoice_search.columns;
                var inv_res = invoice_search.run().getRange(0,1000);
                // log.debug('未结发票',JSON.stringify(inv_res));
                if(inv_res.length > 0){
                    for(var i = 0;i < inv_res.length;i++){
                        log.debug('so_id soinvid invid',so_id + '---' + inv_res[i].getValue(inv_col[0]) + '---' + inv_res[i].id);
                        if(Number(inv_res[i].getValue(inv_col[0])) == Number(so_id)){
                            log.debug('inv_res[i].id',inv_res[i].id);
                            inv_arr.push(inv_res[i].id);
                        }
                    }
                    log.debug('inv_arr',inv_arr);
                    //创建贷项核销发票
                    ce_amount = so_total_zmount - so_hk_amount;
                    var cr_memo_id = createCreditMemo(so_data,so_id,inv_arr,ce_amount);
                    log.debug('cr_memo_id',cr_memo_id);
                }
            }
        }
        function createCreditMemo(so_data,so_id,inv_arr,ce_amount){
            var cr_memo_rec = record.create({
                type:'creditmemo',
                isDynamic:true,
            });
            cr_memo_rec.setText('customform','傲英贷项通知单');
            cr_memo_rec.setValue('entity',so_data.entity);
            cr_memo_rec.setValue('custbody_sales_order',so_id);
            cr_memo_rec.setValue('department',so_data.department);
            cr_memo_rec.setValue('location',so_data.location);
            cr_memo_rec.setValue('class',so_data.class);
            cr_memo_rec.setValue('custbody_sl_so_innumber',so_data.wd_num);
            cr_memo_rec.setValue('custbody_sl_bbaojiadan',so_data.baojiadan);
            cr_memo_rec.setValue('custbody_sl_sopayway',so_data.pay_type);
            cr_memo_rec.setValue('memo','收款差额生成贷项通知单');
            //货品明细
            cr_memo_rec.selectNewLine('item',0);
            cr_memo_rec.setCurrentSublistValue({
                sublistId:'item',
                fieldId:'item',
                value:145,             //手续费
            });
            cr_memo_rec.setCurrentSublistValue({
                sublistId:'item',
                fieldId:'rate',
                value:ce_amount,
            });
            cr_memo_rec.setCurrentSublistValue({
                sublistId:'item',
                fieldId:'quantity',
                value:1,
            });
            cr_memo_rec.setCurrentSublistValue({
                sublistId:'item',
                fieldId:'taxcode',
                value:144,              //VAT_0
            });
            cr_memo_rec.setCurrentSublistValue({
                sublistId:'item',
                fieldId:'location',
                value:so_data.location,
            });
            cr_memo_rec.setCurrentSublistValue({
                sublistId:'item',
                fieldId:'department',
                value:so_data.department,
            });
            cr_memo_rec.commitLine('item');
            //应用明细
            var apply_count = cr_memo_rec.getLineCount('apply');
            log.debug('inv_arr',inv_arr);
            for(var i = 0;i < apply_count;i++){
                cr_memo_rec.selectLine('apply',i);
                var trantype = cr_memo_rec.getCurrentSublistValue({
                    sublistId:'apply',
                    fieldId:'trantype',
                });
                if(trantype == 'CustInvc'){
                    var doc = cr_memo_rec.getCurrentSublistValue({
                        sublistId:'apply',
                        fieldId:'doc',
                    });
                    log.debug('doc',doc);
                    for(var j = 0;j < inv_arr.length;j++){
                        if(doc == inv_arr[j]){
                            cr_memo_rec.setCurrentSublistValue({
                                sublistId:'apply',
                                fieldId:'amount',
                                value:ce_amount,
                            });
                            cr_memo_rec.setCurrentSublistValue({
                                sublistId:'apply',
                                fieldId:'apply',
                                value:true,
                            });
                            cr_memo_rec.commitLine('apply');
                        }
                    }
                }
            }

            var cr_memo_id = cr_memo_rec.save();
            return cr_memo_id;
        }
        return {
            // beforeLoad: beforeLoad,
            //  beforeSubmit: beforeSubmit,
            afterSubmit: afterSubmit
        };
    });
