/**
 * 亚马逊payment生成退货授权和贷项通知单、退款核销和日记账
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 */
define(
    ['N/search', 'N/record', 'N/task','N/file','N/runtime','N/format'],
    function(search, record, task,file,runtime,format) {
        function getInputData(){
            var alls = [];
            var mySearch = initSearch();
            mySearch.run().each(function(result){
                var results = result.getValue({name:'internalid'});
                //    log.debug('result',results);
                var tmp = new Object();
                tmp.id = results;
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
            doRecord(value.id);
            context.write({
                key: "paymentId",
                value:value.id
            });
        }
        function reduce(context) {
            log.debug({
                title: 'context reduce',
                details: context
            });
            // doRecord(context.values[0]);
            // context.write({
            //     key:"paymentId",
            //     value: context.values[0]
            // });
        }
        function summarize(summary) {
            log.debug('summary',summary)
        }
        function doRecord(id){
            var value = {};
            value.id = id;
            try{
                var itemColumns = search.lookupFields({
                    type: 'customrecord_hx_pay_amz_payment',
                    id: value.id,
                    columns:['custrecord_hx_pay_amz_customer','custrecord_hx_pay_amz_productsales','custrecord_hx_pay_amz_arnumber','custrecordcustrecord_hx_pay_amz_light_tr','custrecordcustrecord_payamz_wdchange_oth','custrecord_rm_points',
                        'custrecord_hx_pay_amz_cmnumber','custrecord_pay_amz_sonumber','custrecord_hx_soamount_','custrecordcustrecord_hx_pay_amz_null_tra','custrecordcustrecord_hx_pay_amz_subscr_o','custrecordcustrecord_payamz_invenreturn_',
                        'custrecord_hx_pay_amz_platform','custrecord_hx_shopnember','custrecord_hx_pay_amz_store','custrecordcustrecord_hx_pay_amz_zhandian','custrecord_payamz_debt','custrecord_order_other','custrecord_nssku2','custrecord_comminglingvat',
                        'custrecord_hx_pay_amz_shippingcredits','custrecord_hx_pay_amz_shippingcreditstax','custrecord_hx_pay_amz_giftwrapcredits','custrecordcustrecord_payamz_order_other','custrecordcustrecord_payamz_storage_othe',
                        'custrecord_hx_pay_amz_giftwrapcreditstax','custrecord_hx_pay_amz_promotionalrebates','custrecord_hx_pay_amz_promotio1','custrecordcustrecord_hx_pay_amz_ad_tran','custrecord_transfer_','custrecord_hx_amount_involved',
                        'custrecord_hx_pay_amz_marketplacewithhel','custrecord_hx_pay_amz_sellingfees','custrecord_hx_pay_amz_fbafees','custrecordcustrecord_hx_pay_amz_fbadispo','custrecordcustrecord_payamz_perorder_oth','custrecordcustrecord_payamz_losthouse_ot',
                        'custrecord_hx_pay_amz_other','custrecord_hx_pay_amz_othertransactionfe','custrecord_hx_goods_sale_tax','custrecord_hx_zd_salestax','custrecordcustrecord_payamz_disposal_oth','custrecordcustrecord_payamz_postage_othe',
                        'custrecord_hx_pay_amz_createdate','custrecordcustrecord_hx_pay_amz_currency','custrecord_hx_pay_amz_total','custrecord_hx_pay_amz_productsalestax','custrecordcustrecord_payamz_intership_ot']
                });
                var sumAmount = Math.abs( Number(itemColumns.custrecord_hx_pay_amz_promotionalrebates) + Number(itemColumns.custrecord_hx_pay_amz_productsales));
                var qty = itemColumns.custrecord_hx_amount_involved;
                var raRec = record.create({
                    type:'returnauthorization',
                    isDynamic:true
                });
                if(sumAmount != 0){
                    if(qty == 0 || qty == ''){
                        qty = 1;
                    }
                    log.debug('qty rate',qty + '---' + sumAmount/qty);
                    raRec.setValue({fieldId:'entity',value:itemColumns.custrecord_hx_pay_amz_customer[0].value});
                    raRec.setValue({fieldId:'custbody_hx_so_shoporder',value:itemColumns.custrecord_hx_shopnember});
                    raRec.setValue({fieldId:'custbody_laiyuan_so',value:itemColumns.custrecord_pay_amz_sonumber[0].value});
                    raRec.setValue({fieldId:'custbody_laiyuan',value:value.id});
                    raRec.setValue('trandate',format.parse({value:itemColumns.custrecord_hx_pay_amz_createdate,type:format.Type.DATE}));
                    raRec.selectNewLine({sublistId:'item'});
                    raRec.setCurrentSublistValue({
                        sublistId:'item',
                        fieldId:'item',
                        value:itemColumns.custrecord_nssku2[0].value
                    });
                    raRec.setCurrentSublistValue({
                        sublistId:'item',
                        fieldId:'rate',
                        value:Number(sumAmount/qty)
                    });
                    raRec.setCurrentSublistValue({
                        sublistId:'item',
                        fieldId:'quantity',
                        value: Number(qty)
                    });
                    raRec.commitLine({sublistId:'item'});
                }
                var raId = raRec.save();
                log.debug('退货授权单',raId);
                log.debug('生成RA后点数',runtime.getCurrentScript().getRemainingUsage());
                if(raId){
                    var cmRec = record.transform({
                        fromType:'returnauthorization',
                        fromId:raId,
                        toType:'creditmemo',
                        isDynamic: true
                    });
                    cmRec.setValue({fieldId:'location',value:getSo(itemColumns.custrecord_pay_amz_sonumber[0].value).location});
                    cmRec.setValue({fieldId:'custbody_laiyuan',value:value.id});
                    cmRec.setValue('trandate',format.parse({value:itemColumns.custrecord_hx_pay_amz_createdate,type:format.Type.DATE}));
                    var cmId = cmRec.save();
                    log.debug('贷项通知单',cmId);
                    log.debug('生成CM后的点数',runtime.getCurrentScript().getRemainingUsage());
                    if(cmId){
                        log.debug('销售订单号',itemColumns.custrecord_pay_amz_sonumber);
                        log.debug('站点',itemColumns.custrecordcustrecord_hx_pay_amz_zhandian);
                        var refund = record.create({
                            type: 'customerrefund',
                            isDynamic: true
                        });
                        //获取店铺对应的科目id
                        var customer = itemColumns.custrecord_hx_pay_amz_customer[0].value;
                        var soData = getSo(itemColumns.custrecord_pay_amz_sonumber[0].value);
                        var currency = itemColumns.custrecordcustrecord_hx_pay_amz_currency;
                        var customerData = getCustomer(customer,currency);
                        log.debug('zhndian',customerData.zhandian);
                        log.debug('客户',customer);
                        refund.setValue('customer',itemColumns.custrecord_hx_pay_amz_customer[0].value);
                        log.debug('退款金额',itemColumns.custrecord_hx_pay_amz_total);
                        refund.setValue('account',122);//应收账款：非关联方
                        refund.setValue('location',soData.location);//仓库
                        refund.setText('paymentmethod','其他');
                        refund.setValue({fieldId:'custbody_laiyuan',value:value.id});
                        refund.setValue('trandate',format.parse({value:itemColumns.custrecord_hx_pay_amz_createdate,type:format.Type.DATE}));
                        var flage = 0;
                        refund.setValue('approvalstatus',2);
                        var count = refund.getLineCount('apply');
                        log.debug('count',count);
                        if(count>0){
                            for(var j = 0;j < count;j++){
                                var item = new Object();
                                refund.selectLine({sublistId:'apply', line: j});
                                item.refnum = refund.getCurrentSublistValue({
                                    sublistId: 'apply',
                                    fieldId: 'refnum'
                                });
                                item.trantype = refund.getCurrentSublistValue({
                                    sublistId:'apply',
                                    fieldId:'trantype'
                                });
                                var results;
                                var column;
                                // log.debug('判断贷项之前的点数',runtime.getCurrentScript().getRemainingUsage());
                                if(item.trantype == 'CustCred'){
                                    var mySearch = search.create({
                                        type: 'creditmemo',
                                        filters: [['tranid','is',item.refnum]]
                                    });
                                    results = mySearch.run().getRange({
                                        start: 0,
                                        end: 1
                                    });
                                    log.debug({
                                        title: '贷项id',
                                        details: results[0].id + '---' + cmId
                                    });
                                    // log.debug('比较贷项之前的点数',runtime.getCurrentScript().getRemainingUsage());
                                    if(results[0].id == cmId){
                                        column = search.lookupFields({
                                            type: 'creditmemo',
                                            id: results[0].id,
                                            columns: ['tranid','total']
                                        });
                                        var memoTotal = column.total;
                                        refund.setCurrentSublistValue({
                                            sublistId: 'apply',
                                            line: j,
                                            fieldId: 'apply',
                                            value: true
                                        });
                                        refund.commitLine({sublistId:'apply'});

                                        var refundId = refund.save();
                                        log.debug('refundId',refundId);
                                        log.debug('保存退款单之后的点数',runtime.getCurrentScript().getRemainingUsage());
                                        var soId = itemColumns.custrecord_pay_amz_sonumber[0].value;//销售订单号
                                        // //创建日记账
                                        // var journalId = createJournal(itemColumns,soId,flage,customer,customerData,value.id);
                                        // log.debug('journalId',journalId);
                                        var rec = record.load({
                                            type: 'customerrefund',
                                            id: refundId,
                                            isDynamic: true
                                        });
                                        var payments = Number(column.custrecord_hx_pay_amz_productsales) + Number(column.custrecord_hx_pay_amz_promotionalrebates) + Number(column.custrecord_hx_pay_amz_giftwrapcredits) + Number(column.custrecord_hx_pay_amz_shippingcredits);
                                        var aramount = memoTotal;
                                        //退款编号回写亚马逊主表
                                        var paymentNum = rec.getValue('tranid');

                                        var status = null;
                                        if(Math.abs(payments) == aramount){
                                            status = '完全核销';
                                        }else if(Math.abs(payments) > aramount || Math.abs(payments) < aramount){
                                            status = '部分核销';
                                        }else{
                                            status = '未核销';
                                        }
                                        record.submitFields({
                                            type: 'customrecord_hx_pay_amz_payment',
                                            id: value.id,
                                            values: {
                                                custrecord_hx_scstatus: '已生成',
                                                custrecord_hx_deal_free: status,
                                                custrecord_hx_satu_lsit: true,
                                                custrecord_refundid:refundId,
                                                custrecord_hx_pay_amz_cmnumber:cmId
                                            },
                                        });
                                        break;//停止for循环
                                    }
                                }
                            }
                        }
                    }
                }
            }
            catch (e){
                log.debug('生成单据错误',e);
            }
        }
        function getCustomer(customer,currency){
            var customerData = {};
            var rec = record.load({type:'customer',id:customer});
            var subid = rec.getValue({fieldId:'custentityrm_collection_account'});
            var zhandian = rec.getValue('custentitycseg_hx_fm_country');
            customerData.account = subid;
            customerData.zhandian = zhandian;
            return customerData;
        }
        function getSo(soId){
            var soData = {};
            var rec = record.load({type:'salesorder',id:soId});
            var customer = rec.getValue({fieldId:'entity'});
            var locationSo = rec.getValue({fieldId:'location'});
            soData.customer = customer;
            var mySearch = search.create({
                type:'customrecord_cseg_hx_fm_store',
                columns:['internalid','custrecord_hx_md_warehouse'],
                filters:[['custrecord_cs_store_customer','anyof',soData.customer]]
            });
            var res = mySearch.run().getRange({start: 0,end: 1000});
            for(var i = 0;i < res.length;i++){
                var storeId = res[i].getValue('internalid');
                var location = res[i].getValue('custrecord_hx_md_warehouse');
                soData.location = location;
            }
            return soData;
        }
        function createJournal(column,soId,flage,customer,customerData,payId){
            var journal = record.create({
                type: 'journalentry',
                isDynamic: true
            })
            //获取so上公司id
            var soRec = record.load({type:'salesorder',id:soId});
            var subId = soRec.getValue({fieldId:'subsidiary'});
            journal.setValue('subsidiary',subId);
            journal.setValue('approvalstatus',2);//审批状态,2
            journal.setValue('custbody_amzpayment_',payId);
            var itemColumns = search.lookupFields({
                type: 'customer',
                id: column.custrecord_hx_pay_amz_customer[0].value,
                columns: ['currency']
            });
            journal.setValue('currency',itemColumns.currency[0].value);
            journal.setValue('custbody_laiyuan',payId);
            if(flage == 0){
                for(var i = 0;i < 16;i++) {
                    journal.selectNewLine('line');
                    var saleAmount = Number(column.custrecord_hx_pay_amz_productsalestax) + Number(column.custrecord_hx_pay_amz_shippingcreditstax) + Number(column.custrecord_hx_pay_amz_giftwrapcreditstax) + Number(column.custrecord_hx_pay_amz_promotio1) + Number(column.custrecord_hx_pay_amz_marketplacewithhel);
                    var zkAmount = Number(column.custrecord_hx_pay_amz_sellingfees) + Number(column.custrecord_hx_pay_amz_fbafees) + Number(column.custrecordcustrecord_payamz_disposal_oth) + Number(column.custrecordcustrecord_hx_pay_amz_ad_tran) + Number(column.custrecord_hx_pay_amz_othertransactionfe) + Number(column.custrecordcustrecord_payamz_invenreturn_) + Number(column.custrecord_transfer) + Number(column.custrecordcustrecord_hx_pay_amz_light_tr) + Number(column.custrecord_rm_points) + Number(column.custrecord_order_other) + Number(column.custrecordcustrecord_payamz_postage_othe) + Number(column.custrecordcustrecord_payamz_wdchange_oth) + Number(column.custrecord_payamz_debt) + Number(column.custrecordcustrecord_payamz_perorder_oth) + Number(column.custrecord_comminglingvat);
                    var amount827 = Number(column.custrecord_hx_pay_amz_othertransactionfe) + Number(column.custrecord_rm_points) + Number(column.custrecord_order_other) + Number(column.custrecordcustrecord_payamz_wdchange_oth) + Number(column.custrecord_payamz_debt);
                    var amount823 = Number(column.custrecordcustrecord_payamz_perorder_oth) + Number(column.custrecord_hx_pay_amz_fbafees) + Number(column.custrecordcustrecord_payamz_postage_othe);
                    if (i == 0 && saleAmount != 0) {
                        journal.setCurrentSublistValue('line', 'account', 591); //应交税费-应交销售税
                        journal.setCurrentSublistValue('line', 'debit', -saleAmount);
                        journal.setCurrentSublistValue('line', 'entity', customer);
                        journal.commitLine('line');
                    } else if (i == 1 && saleAmount != 0) {
                        journal.setCurrentSublistValue('line', 'account', 122); //平台
                        journal.setCurrentSublistValue('line', 'credit', saleAmount);
                        journal.setCurrentSublistValue('line', 'entity', customer);
                        journal.commitLine('line');
                    }
                    else if (i == 2 && column.custrecord_hx_pay_amz_shippingcredits != 0 && column.custrecord_hx_pay_amz_shippingcredits != '') {
                        journal.setCurrentSublistValue('line', 'account', 559); //
                        journal.setCurrentSublistValue('line', 'debit', -column.custrecord_hx_pay_amz_shippingcredits);
                        journal.setCurrentSublistValue('line', 'entity', customer);
                        journal.commitLine('line');
                    }
                    else if (i == 3 && column.custrecord_hx_pay_amz_shippingcredits != 0 && column.custrecord_hx_pay_amz_shippingcredits != '') {
                        journal.setCurrentSublistValue('line', 'account', 602); //
                        journal.setCurrentSublistValue('line', 'credit', column.custrecord_hx_pay_amz_shippingcredits);
                        journal.setCurrentSublistValue('line', 'entity', customer);
                        journal.commitLine('line');
                    }
                    else if (i == 4 && column.custrecord_hx_pay_amz_giftwrapcredits != 0 && column.custrecord_hx_pay_amz_giftwrapcredits != '') {
                        journal.setCurrentSublistValue('line', 'account', 559); //
                        journal.setCurrentSublistValue('line', 'debit', -column.custrecord_hx_pay_amz_giftwrapcredits);
                        journal.setCurrentSublistValue('line', 'entity', customer);
                        journal.commitLine('line');
                    }
                    else if (i == 5 && column.custrecord_hx_pay_amz_giftwrapcredits != 0 && column.custrecord_hx_pay_amz_giftwrapcredits != '') {
                        journal.setCurrentSublistValue('line', 'account', 600); //
                        journal.setCurrentSublistValue('line', 'credit', column.custrecord_hx_pay_amz_giftwrapcredits);
                        journal.setCurrentSublistValue('line', 'entity', customer);
                        journal.commitLine('line');
                    }
                    else if (i == 6 && column.custrecord_hx_pay_amz_sellingfees != 0 && column.custrecord_hx_pay_amz_sellingfees != '') {
                        journal.setCurrentSublistValue('line', 'account', 1458); //
                        journal.setCurrentSublistValue('line', 'debit', -column.custrecord_hx_pay_amz_sellingfees);
                        journal.setCurrentSublistValue('line', 'entity', customer);
                        journal.commitLine('line');
                    }
                    else if (i == 7 && amount823 != 0) {
                        journal.setCurrentSublistValue('line', 'account', 1457); //
                        journal.setCurrentSublistValue('line', 'debit', -amount823);
                        journal.setCurrentSublistValue('line', 'entity', customer);
                        journal.commitLine('line');
                    }
                    else if (i == 8 && column.custrecordcustrecord_payamz_disposal_oth != 0 && column.custrecordcustrecord_payamz_disposal_oth != '') {
                        journal.setCurrentSublistValue('line', 'account', 1482); //
                        journal.setCurrentSublistValue('line', 'debit', -column.custrecordcustrecord_payamz_disposal_oth);
                        journal.setCurrentSublistValue('line', 'entity', customer);
                        journal.commitLine('line');
                    }
                    else if (i == 9 && column.custrecordcustrecord_hx_pay_amz_ad_tran != 0 && column.custrecordcustrecord_hx_pay_amz_ad_tran != '') {
                        journal.setCurrentSublistValue('line', 'account', 1483); //
                        journal.setCurrentSublistValue('line', 'debit', -column.custrecordcustrecord_hx_pay_amz_ad_tran);
                        journal.setCurrentSublistValue('line', 'entity', customer);
                        journal.commitLine('line');
                    }
                    else if (i == 10 && amount827 != 0) {
                        journal.setCurrentSublistValue('line', 'account', 1459); //
                        journal.setCurrentSublistValue('line', 'debit', -amount827);
                        journal.setCurrentSublistValue('line', 'entity', customer);
                        journal.commitLine('line');
                    }
                    else if (i == 11 && column.custrecordcustrecord_payamz_invenreturn_ != 0 && column.custrecordcustrecord_payamz_invenreturn_ != '') {
                        journal.setCurrentSublistValue('line', 'account', 601); //
                        journal.setCurrentSublistValue('line', 'debit', -column.custrecordcustrecord_payamz_invenreturn_);
                        journal.setCurrentSublistValue('line', 'entity', customer);
                        journal.commitLine('line');
                    }
                    else if (i == 12 && column.custrecord_transfer != 0 && column.custrecord_transfer != '') {
                        journal.setCurrentSublistValue('line', 'account', customerData.account); //
                        journal.setCurrentSublistValue('line', 'debit', -column.custrecord_transfer);
                        journal.setCurrentSublistValue('line', 'entity', customer);
                        journal.commitLine('line');
                    }
                    else if (i == 13 && column.custrecordcustrecord_hx_pay_amz_light_tr != 0 && column.custrecordcustrecord_hx_pay_amz_light_tr != '') {
                        journal.setCurrentSublistValue('line', 'account', 1459); //
                        journal.setCurrentSublistValue('line', 'debit', -column.custrecordcustrecord_hx_pay_amz_light_tr);
                        journal.setCurrentSublistValue('line', 'entity', customer);
                        journal.commitLine('line');
                    }
                    else if (i == 14 && column.custrecord_comminglingvat != 0 && column.custrecord_comminglingvat != '') {
                        journal.setCurrentSublistValue('line', 'account', 1558); //
                        journal.setCurrentSublistValue('line', 'debit', -column.custrecord_comminglingvat);
                        journal.setCurrentSublistValue('line', 'entity', customer);
                        journal.commitLine('line');
                    }
                    else if (i == 15 && zkAmount != 0) {
                        journal.setCurrentSublistValue('line', 'account', 122); //
                        journal.setCurrentSublistValue('line', 'credit', zkAmount);
                        journal.setCurrentSublistValue('line', 'entity', customer);
                        journal.commitLine('line');
                    }
                }
            }
            else if(flage == 1){

            }
            var journalId = journal.save();

            return journalId;
        }
        function initSearch() {
            var mySearch = search.load({id:'customsearchcl_amz3cr'});
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