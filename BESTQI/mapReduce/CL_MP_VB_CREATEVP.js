/**
 * 供应商对账单
 *@NApiVersion 2.x
 *@NScriptType MapReduceScript
 */
define(['N/runtime', 'N/record', 'N/search','N/format'], function (runtime, record, search,format) {

    function getInputData() {
        var all_data = JSON.parse(runtime.getCurrentScript().getParameter('custscript_deatail_info'));
        var user = JSON.parse(runtime.getCurrentScript().getParameter('custscript_user'));
        var ret = getVendorPayment(all_data,user);
        log.debug('ret',ret);
    }
    function getVendorPayment(all_data,user) {
        var ret = new Object();
        if(all_data.sublist_data.length > 0){//.sublist_data.length > 0
            var vendor_col = search.lookupFields({
                type:'vendor',
                id:all_data.entity,
                columns:['custentity_rm_supplier_type','defaultvendorpaymentaccount'],
            });
            var subsidiary_col = search.lookupFields({
                type:'subsidiary',
                id:all_data.subsidiary,
                columns:['custrecord_default_usd_payaccount','custrecord_default_cny_payaccount']
            });
            log.debug('vendor_col',JSON.stringify(vendor_col));
            try{
                var vp_rec = record.create({
                    type:'vendorpayment',
                    isDynamic:true,
                });
                if(vendor_col.custentity_rm_supplier_type[0].value == 1){//外部采购供应商
                    // vp_rec.setText('customform','BSQ-付款申请（货款）');
                    // vp_rec.setValue('customform',130);//test
                    vp_rec.setValue('customform',150);
                }
                else if(vendor_col.custentity_rm_supplier_type[0].value == 2){//物流供应商
                    // vp_rec.setText('customform','BSQ-付款申请（物流费）');
                    // vp_rec.setValue('customform',132);
                    vp_rec.setValue('customform',151);
                }
                else if(vendor_col.custentity_rm_supplier_type[0].value == 4){//内部交易供应商
                    // vp_rec.setText('customform','BSQ-付款申请（内部交易）');
                    // vp_rec.setValue('customform',133);
                    vp_rec.setValue('customform',152);
                }
                else{
                    // vp_rec.setText('customform','BSQ-付款申请（其他）');
                    // vp_rec.setValue('customform',129);
                    vp_rec.setValue('customform',153);
                }
                vp_rec.setValue('entity',all_data.entity);//收款人
                vp_rec.setValue('subsidiary',all_data.subsidiary);//子公司
                vp_rec.setValue('apacct',all_data.apaccount);//A/P科目
                vp_rec.setValue('currency',all_data.currency);//币种
                if(all_data.currency == 1){//人民币
                    vp_rec.setValue('account',subsidiary_col.custrecord_default_cny_payaccount[0].value);
                }
                else if(all_data.currency == 2){//美元
                    vp_rec.setValue('account',subsidiary_col.custrecord_default_usd_payaccount[0].value);
                }
                // else{
                //     vp_rec.setValue('account',vendor_col.defaultvendorpaymentaccount[0].value);//科目：取自供应商默认供应商付款账户
                // }
                vp_rec.setValue('custbody_invoice_addvalue',all_data.inv_num);//发票
                // vp_rec.setValue('custbody_script_submit',true);//脚本用提交，提交至下一审批人
                // vp_rec.setValue('approvalstatus',2);//批准
                var vp_count = vp_rec.getLineCount('apply');
                log.debug('vp-count',vp_count);
                for(var i = 0;i < vp_count;i++){
                    vp_rec.selectLine('apply',i);
                    var vb_id = vp_rec.getCurrentSublistValue({
                        sublistId:'apply',
                        fieldId:'internalid'
                    });
                    // log.debug('vb_id',vb_id);
                    for(var j = 0;j < all_data.sublist_data.length;j++){
                        if(vb_id == all_data.sublist_data[j].vb_id){
                            vp_rec.setCurrentSublistValue({
                                sublistId:'apply',
                                fieldId:'disc',
                                value:all_data.sublist_data[j].zk_amount,
                            });
                            vp_rec.setCurrentSublistValue({
                                sublistId:'apply',
                                fieldId:'amount',
                                value:all_data.sublist_data[j].pay_amount,
                            });
                            vp_rec.setCurrentSublistValue({
                                sublistId:'apply',
                                fieldId:'apply',
                                value:true,
                            });
                            vp_rec.commitLine('apply');
                        }
                    }
                }
                var id = vp_rec.save();
                log.debug('单据生成',id);

                ret.result = id;
                ret.flag = '1';
                // ret.tranid = search.lookupFields({ type: 'vendorpayment', id: id, columns: ['transactionnumber'] }).transactionnumber[0].text;
                ret.tranid = record.load({type:'vendorpayment',id:id,isDynamic:true}).getText('transactionnumber');
            }
            catch(e){
                ret.result = e.message;
                ret.flag = '2';
                ret.tranid = '';
            }
        }else{
            ret.result = '没勾选明细行';
            ret.flag = '3';
            ret.tranid = '';
        }
        //将信息写入当前用户供应商账单相关自定义字段
        record.submitFields({
            type: 'employee',
            id: user,
            values: {
                custentity_sl_supplier_reconciliation_st: 3,
                custentity_sl_supplier_reconciliation_n: JSON.stringify(ret)
            }
        });
        return ret;
    }
    function map(context) {

    }

    function reduce(context) {

    }

    function summarize(summary) {
        log.debug('summary',summary);
    }

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    }
});
