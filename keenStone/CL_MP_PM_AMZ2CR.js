/**
 * 亚马逊退款核销
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 */
define(
    ['N/search', 'N/record', 'N/task','N/file','N/format'],
    function(search, record, task,file,format) {
        function getInputData() {
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
                title: 'context',
                details: context
            });
            var value = JSON.parse(context.value);
            try {
                var itemColumns = search.lookupFields({
                    type: 'customrecord_hx_pay_amz_payment',
                    id: value.id,
                    columns: ['custrecord_hx_pay_amz_customer','custrecord_hx_pay_amz_productsales','custrecord_hx_pay_amz_arnumber','custrecordcustrecord_hx_pay_amz_light_tr','custrecordcustrecord_payamz_wdchange_oth',
                        'custrecord_hx_pay_amz_cmnumber','custrecord_pay_amz_sonumber','custrecord_hx_soamount_','custrecordcustrecord_hx_pay_amz_null_tra','custrecordcustrecord_hx_pay_amz_subscr_o','custrecordcustrecord_payamz_invenreturn_',
                        'custrecord_hx_pay_amz_platform','custrecord_hx_shopnember','custrecord_hx_pay_amz_store','custrecordcustrecord_hx_pay_amz_zhandian','custrecord_payamz_debt','custrecord_order_other',
                        'custrecord_hx_pay_amz_shippingcredits','custrecord_hx_pay_amz_shippingcreditstax','custrecord_hx_pay_amz_giftwrapcredits','custrecordcustrecord_payamz_order_other','custrecordcustrecord_payamz_storage_othe',
                        'custrecord_hx_pay_amz_giftwrapcreditstax','custrecord_hx_pay_amz_promotionalrebates','custrecord_hx_pay_amz_promotio1','custrecordcustrecord_hx_pay_amz_ad_tran','custrecord_transfer_',
                        'custrecord_hx_pay_amz_marketplacewithhel','custrecord_hx_pay_amz_sellingfees','custrecord_hx_pay_amz_fbafees','custrecordcustrecord_hx_pay_amz_fbadispo','custrecordcustrecord_payamz_perorder_oth','custrecordcustrecord_payamz_losthouse_ot',
                        'custrecord_hx_pay_amz_other','custrecord_hx_pay_amz_othertransactionfe','custrecord_hx_goods_sale_tax','custrecord_hx_zd_salestax','custrecordcustrecord_payamz_disposal_oth','custrecordcustrecord_payamz_postage_othe',
                        'custrecord_hx_pay_amz_createdate','custrecordcustrecord_hx_pay_amz_currency','custrecord_hx_pay_amz_total','custrecord_hx_pay_amz_productsalestax','custrecordcustrecord_payamz_intership_ot']
                });
                //           log.debug({
//                title:'itemColumns',
//                details:itemColumns
//            })
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
                refund.setValue('trandate',format.parse({value:itemColumns.custrecord_hx_pay_amz_createdate,type:format.Type.DATE}));
                log.debug('退款金额',itemColumns.custrecord_hx_pay_amz_total);
                // refund.setValue('total',itemColumns.custrecord_hx_pay_amz_total);//退款金额
                // refund.setValue('aracct',122);   //应收账款：非关联方
                refund.setValue('account',122);//应收账款：非关联方
                refund.setValue('location',soData.location);//仓库
                var flage = 0;
                // if(payment.getText('currency') == itemColumns.custrecordcustrecord_hx_pay_amz_currency){
                // 	payment.setValue('account',bankSubId);
                // }else{payment.setValue('account',3644);flage = 1}
                refund.setValue('approvalstatus',2);
                var count = refund.getLineCount('apply');
                log.debug('count',count);
                if(count>0){
                    for (var i = 0; i < count; i++) {
                        var item = new Object();
                        refund.selectLine({sublistId:'apply', line: i});
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
                        if(item.trantype == 'CustCred'){
                            var mySearch = search.create({
                                type: 'creditmemo',
                                filters: [['tranid','is',item.refnum]]
                            });
                            results = mySearch.run().getRange({
                                start: 0,
                                end: 1
                            });
                            column = search.lookupFields({
                                type: 'creditmemo',
                                id: results[0].id,
                                columns: ['custbody_creditmemo_so','tranid','total']
                            });
                            log.debug({
                                title: '贷项通知销售单号',
                                details: column.custbody_creditmemo_so
                            });
                            log.debug('贷项通知tranid', column.tranid);
                            var memoTotal = column.total;
                            if(column.custbody_creditmemo_so[0].value != null && column.custbody_creditmemo_so[0].value == itemColumns.custrecord_pay_amz_sonumber[0].value){
                                log.debug({
                                    title: 'amz销售单号',
                                    details: itemColumns.custrecord_pay_amz_sonumber[0].value
                                });
                                refund.setCurrentSublistValue({
                                    sublistId: 'apply',
                                    fieldId: 'apply',
                                    value: true
                                });
                                refund.commitLine({sublistId:'apply', line:i});

                                var refundId = refund.save();
                                log.debug('refundId',refundId);
                                var soId = itemColumns.custrecord_pay_amz_sonumber[0].value;//销售订单号
                                //创建日记账
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
                                        custrecord_refundid:refundId
                                    },
                                });

                            }
                        }
                    }
                }
            } catch (e) {
                log.error({
                    title: 'netsuite error:' + value.id,
                    details: e.message + ',' + e.stack
                });
            }
        }

        function reduce(context) {
            log.debug({
                title: 'context',
                details: context
            });
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
            soData.location = locationSo;
            // var mySearch = search.create({
            //     type:'customrecord_cseg_hx_fm_store',
            //     columns:['internalid','custrecord_hx_md_warehouse'],
            //     filters:[['custrecord_cs_store_customer','anyof',soData.customer]]
            // });
            // var res = mySearch.run().getRange({start: 0,end: 1000});
            // for(var i = 0;i < res.length;i++){
            //     var storeId = res[i].getValue('internalid');
            //     var location = res[i].getValue('custrecord_hx_md_warehouse');
            //     soData.location = location;
            // }
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
                    var zkAmount = Number(column.custrecord_hx_pay_amz_sellingfees) + Number(column.custrecord_hx_pay_amz_fbafees) + Number(column.custrecordcustrecord_payamz_disposal_oth) + Number(column.custrecordcustrecord_hx_pay_amz_ad_tran) + Number(column.custrecord_hx_pay_amz_othertransactionfe) + Number(column.custrecordcustrecord_payamz_invenreturn_) + Number(column.custrecord_transfer_) + Number(column.custrecordcustrecord_hx_pay_amz_light_tr) + Number(column.custrecord_rm_points) + Number(column.custrecord_order_other) + Number(column.custrecordcustrecord_payamz_postage_othe) + Number(column.custrecordcustrecord_payamz_wdchange_oth) + Number(column.custrecord_payamz_debt) + Number(column.custrecordcustrecord_payamz_perorder_oth) + Number(column.custrecord_comminglingvat);
                    var amount827 = Number(column.custrecord_hx_pay_amz_othertransactionfe) + Number(column.custrecord_rm_points) + Number(column.custrecord_order_other) + Number(column.custrecordcustrecord_payamz_wdchange_oth) + Number(column.custrecord_payamz_debt);
                    var amount823 = Number(column.custrecordcustrecord_payamz_perorder_oth) + Number(column.custrecord_hx_pay_amz_fbafees) + Number(column.custrecordcustrecord_payamz_postage_othe);
                    if (i == 0 && saleAmount != 0) {
                        log.debug('dr 1044',-saleAmount);
                        journal.setCurrentSublistValue('line', 'account', 1044); //应交税费-应交销售税
                        journal.setCurrentSublistValue('line', 'debit', -saleAmount);
                        journal.setCurrentSublistValue('line', 'entity', customer);
                        journal.commitLine('line');
                    } else if (i == 1 && saleAmount != 0) {
                        log.debug('dr 122',-saleAmount);
                        journal.setCurrentSublistValue('line', 'account', 122); //平台
                        journal.setCurrentSublistValue('line', 'credit', -saleAmount);
                        journal.setCurrentSublistValue('line', 'entity', customer);
                        journal.commitLine('line');
                    }
                    else if (i == 2 && column.custrecord_hx_pay_amz_shippingcredits != 0 && column.custrecord_hx_pay_amz_shippingcredits != '') {
                        log.debug('dr 1048',-column.custrecord_hx_pay_amz_shippingcredits);
                        journal.setCurrentSublistValue('line', 'account', 1048); //
                        journal.setCurrentSublistValue('line', 'debit', -column.custrecord_hx_pay_amz_shippingcredits);
                        journal.setCurrentSublistValue('line', 'entity', customer);
                        journal.commitLine('line');
                    }
                    else if (i == 3 && column.custrecord_hx_pay_amz_shippingcredits != 0 && column.custrecord_hx_pay_amz_shippingcredits != '') {
                        log.debug('cr 1082',-column.custrecord_hx_pay_amz_shippingcredits);
                        journal.setCurrentSublistValue('line', 'account', 1082); //
                        journal.setCurrentSublistValue('line', 'credit', -column.custrecord_hx_pay_amz_shippingcredits);
                        journal.setCurrentSublistValue('line', 'entity', customer);
                        journal.commitLine('line');
                    }
                    else if (i == 4 && column.custrecord_hx_pay_amz_giftwrapcredits != 0 && column.custrecord_hx_pay_amz_giftwrapcredits != '') {
                        log.debug('dr 1048',-column.custrecord_hx_pay_amz_giftwrapcredits);
                        journal.setCurrentSublistValue('line', 'account', 1048); //
                        journal.setCurrentSublistValue('line', 'debit', -column.custrecord_hx_pay_amz_giftwrapcredits);
                        journal.setCurrentSublistValue('line', 'entity', customer);
                        journal.commitLine('line');
                    }
                    else if (i == 5 && column.custrecord_hx_pay_amz_giftwrapcredits != 0 && column.custrecord_hx_pay_amz_giftwrapcredits != '') {
                        log.debug('cr 1083',-column.custrecord_hx_pay_amz_giftwrapcredits);
                        journal.setCurrentSublistValue('line', 'account', 1083); //
                        journal.setCurrentSublistValue('line', 'credit', -column.custrecord_hx_pay_amz_giftwrapcredits);
                        journal.setCurrentSublistValue('line', 'entity', customer);
                        journal.commitLine('line');
                    }
                    else if (i == 6 && column.custrecord_hx_pay_amz_sellingfees != 0 && column.custrecord_hx_pay_amz_sellingfees != '') {
                        log.debug('dr 824',-column.custrecord_hx_pay_amz_sellingfees);
                        journal.setCurrentSublistValue('line', 'account', 824); //
                        journal.setCurrentSublistValue('line', 'debit', -column.custrecord_hx_pay_amz_sellingfees);
                        journal.setCurrentSublistValue('line', 'entity', customer);
                        journal.commitLine('line');
                    }
                    else if (i == 7 && amount823 != 0) {
                        log.debug('dr 823',-amount823);
                        journal.setCurrentSublistValue('line', 'account', 823); //
                        journal.setCurrentSublistValue('line', 'debit', -amount823);
                        journal.setCurrentSublistValue('line', 'entity', customer);
                        journal.commitLine('line');
                    }
                    else if (i == 8 && column.custrecordcustrecord_payamz_disposal_oth != 0 && column.custrecordcustrecord_payamz_disposal_oth != '') {
                        log.debug('dr 1085',-column.custrecordcustrecord_payamz_disposal_oth);
                        journal.setCurrentSublistValue('line', 'account', 1085); //
                        journal.setCurrentSublistValue('line', 'debit', -column.custrecordcustrecord_payamz_disposal_oth);
                        journal.setCurrentSublistValue('line', 'entity', customer);
                        journal.commitLine('line');
                    }
                    else if (i == 9 && column.custrecordcustrecord_hx_pay_amz_ad_tran != 0 && column.custrecordcustrecord_hx_pay_amz_ad_tran != '') {
                        log.debug('dr 1086',-column.custrecordcustrecord_hx_pay_amz_ad_tran);
                        journal.setCurrentSublistValue('line', 'account', 1086); //
                        journal.setCurrentSublistValue('line', 'debit', -column.custrecordcustrecord_hx_pay_amz_ad_tran);
                        journal.setCurrentSublistValue('line', 'entity', customer);
                        journal.commitLine('line');
                    }
                    else if (i == 10 && amount827 != 0) {
                        log.debug('dr 827',-amount827);
                        journal.setCurrentSublistValue('line', 'account', 827); //
                        journal.setCurrentSublistValue('line', 'debit', -amount827);
                        journal.setCurrentSublistValue('line', 'entity', customer);
                        journal.commitLine('line');
                    }
                    else if (i == 11 && column.custrecordcustrecord_payamz_invenreturn_ != 0 && column.custrecordcustrecord_payamz_invenreturn_ != '') {
                        log.debug('dr 1084',-column.custrecordcustrecord_payamz_invenreturn_);
                        journal.setCurrentSublistValue('line', 'account', 1084); //
                        journal.setCurrentSublistValue('line', 'debit', -column.custrecordcustrecord_payamz_invenreturn_);
                        journal.setCurrentSublistValue('line', 'entity', customer);
                        journal.commitLine('line');
                    }
                    else if (i == 12 && column.custrecord_transfer_ != 0 && column.custrecord_transfer_ != '') {
                        log.debug('dr account',-column.custrecord_transfer_);
                        var accountStore = record.load({type:'customrecord_cseg_hx_fm_store',id:column.custrecord_hx_pay_amz_store[0].value}).getValue('custrecord_hx_store_account');
                        log.debug('accountStore',accountStore);
                        if(accountStore == 1048){
                            journal.setCurrentSublistValue('line', 'account', Number(accountStore)); //payment店铺对应银行科目
                            journal.setCurrentSublistValue('line', 'debit', -column.custrecord_transfer_);
                            journal.setCurrentSublistValue('line', 'entity', customer);
                            journal.commitLine('line');
                        }
                    }
                    else if (i == 13 && column.custrecordcustrecord_hx_pay_amz_light_tr != 0 && column.custrecordcustrecord_hx_pay_amz_light_tr != '') {
                        log.debug('dr 827',-column.custrecordcustrecord_hx_pay_amz_light_tr);
                        journal.setCurrentSublistValue('line', 'account', 827); //
                        journal.setCurrentSublistValue('line', 'debit', -column.custrecordcustrecord_hx_pay_amz_light_tr);
                        journal.setCurrentSublistValue('line', 'entity', customer);
                        journal.commitLine('line');
                    }
                    else if (i == 14 && column.custrecord_comminglingvat != 0 && column.custrecord_comminglingvat != '') {
                        log.debug('dr 1088',-column.custrecord_comminglingvat);
                        journal.setCurrentSublistValue('line', 'account', 1088); //
                        journal.setCurrentSublistValue('line', 'debit', -column.custrecord_comminglingvat);
                        journal.setCurrentSublistValue('line', 'entity', customer);
                        journal.commitLine('line');
                    }
                    else if (i == 15 && zkAmount != 0) {
                        log.debug('cr 122',-zkAmount);
                        journal.setCurrentSublistValue('line', 'account', 122); //
                        journal.setCurrentSublistValue('line', 'credit', -zkAmount);
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

        function summarize(summary) {
///        log.debug({
            //           title: 'summary',
            //           details: summary
            //       });
        }

        function initSearch() {
            var mySearch = search.load({id:'customsearch_cl_amz2cr'});
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