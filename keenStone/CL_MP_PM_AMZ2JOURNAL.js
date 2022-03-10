/**
 * 亚马逊除去order和refund的付款类型生成日记账
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
                        'custrecord_hx_pay_amz_platform','custrecord_hx_shopnember','custrecord_hx_pay_amz_store','custrecordcustrecord_hx_pay_amz_zhandian','custrecord_payamz_debt','custrecord_rm_points','custrecord_comminglingvat',
                        'custrecord_hx_pay_amz_shippingcredits','custrecord_hx_pay_amz_shippingcreditstax','custrecord_hx_pay_amz_giftwrapcredits','custrecordcustrecord_payamz_order_other','custrecordcustrecord_payamz_storage_othe',
                        'custrecord_hx_pay_amz_giftwrapcreditstax','custrecord_hx_pay_amz_promotionalrebates','custrecord_hx_pay_amz_promotio1','custrecordcustrecord_hx_pay_amz_ad_tran','custrecord_transfer_','custrecord_order_other',
                        'custrecord_hx_pay_amz_marketplacewithhel','custrecord_hx_pay_amz_sellingfees','custrecord_hx_pay_amz_fbafees','custrecordcustrecord_hx_pay_amz_fbadispo','custrecordcustrecord_payamz_perorder_oth','custrecordcustrecord_payamz_losthouse_ot',
                        'custrecord_hx_pay_amz_other','custrecord_hx_pay_amz_othertransactionfe','custrecord_hx_goods_sale_tax','custrecord_hx_zd_salestax','custrecordcustrecord_payamz_disposal_oth','custrecordcustrecord_payamz_postage_othe',
                        'custrecord_hx_pay_amz_createdate','custrecordcustrecord_hx_pay_amz_currency','custrecord_hx_pay_amz_total','custrecord_hx_pay_amz_productsalestax','custrecordcustrecord_payamz_intership_ot']
                });
                log.debug('销售订单号',itemColumns.custrecord_pay_amz_sonumber);
                log.debug('站点',itemColumns.custrecordcustrecord_hx_pay_amz_zhandian);
                var payment = record.create({
                    type: 'customerpayment',
                    isDynamic: true
                });
                var payments = Number(itemColumns.custrecord_hx_pay_amz_productsales) + Number(itemColumns.custrecord_hx_pay_amz_promotionalrebates) + Number(itemColumns.custrecord_hx_pay_amz_giftwrapcredits) + Number(itemColumns.custrecord_hx_pay_amz_shippingcredits);
                //获取店铺对应的科目id
                var customer = itemColumns.custrecord_hx_pay_amz_customer[0].value;
                // var soData = getSo(itemColumns.custrecord_pay_amz_sonumber[0].value);
                var currency = itemColumns.custrecordcustrecord_hx_pay_amz_currency;
                var customerData = getCustomer(customer,currency);
                log.debug('zhndian',customerData.zhandian);
                log.debug('客户',customer);
                /**创建日记账*/
                var flage = 0;
                var journalId = createJournal(itemColumns,itemColumns.custrecord_pay_amz_sonumber[0].value,flage,customer,customerData,value.id);
                log.debug('journalId',journalId);
                record.submitFields({
                    type: 'customrecord_hx_pay_amz_payment',
                    id: value.id,
                    values:{
                        custrecord_hx_expense_je: journalId,
                    }
                });


            } catch (e) {
                log.error({
                    title: 'netsuite error:' + value.id,
                    details: e.message + ',' + e.stack
                });
                record.submitFields({
                    type: 'customrecord_hx_pay_amz_payment',
                    id: value.id,
                    values: {
                        custbody_last_process_date: moment.utc().format('YYYY-MM-DD')
                    },
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
            // var subid = rec.getValue({fieldId:'custentityrm_collection_account'});
            var zhandian = rec.getValue('custentitycseg_hx_fm_country');
            var account = rec.getValue('custentityrm_collection_account');
            var subsidiary = rec.getValue('subsidiary');
            customerData.account = account;
            customerData.zhandian = zhandian;
            customerData.subsidiary = subsidiary;
            return customerData;
        }
        function getStore(store_id){
            if(store_id){
                var rec = record.load({
                    type: 'customrecord_cseg_hx_fm_store',
                    id: store_id,
                    isDynamic: true,
                });
                var store_account = rec.getValue('custrecord_hx_store_account');

                return store_account;
            }
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
            // var soRec = record.load({type:'salesorder',id:soId});
            // var subId = soRec.getValue({fieldId:'subsidiary'});
            // log.debug('subId',subId);
            journal.setValue('subsidiary',customerData.subsidiary);
            journal.setValue('approvalstatus',2);//审批状态,2
            // journal.setValue('custbody_amzpayment_',payId);
            // var itemColumns = search.lookupFields({
            //     type: 'customer',
            //     id: column.custrecord_hx_pay_amz_customer[0].value,
            //     columns: ['currency']
            // });
            journal.setValue('trandate',format.parse({value:column.custrecord_hx_pay_amz_createdate,type:format.Type.DATE}));
            journal.setValue('currency',column.custrecordcustrecord_hx_pay_amz_currency[0].value);
            journal.setValue('custbody_laiyuan',payId);//来源亚马逊
            if(flage == 0){
                for(var i = 0;i < 16;i++) {
                    journal.selectNewLine('line');
                    var saleAmount = Number(column.custrecord_hx_pay_amz_productsalestax) + Number(column.custrecord_hx_pay_amz_shippingcreditstax) + Number(column.custrecord_hx_pay_amz_giftwrapcreditstax) + Number(column.custrecord_hx_pay_amz_promotio1) + Number(column.custrecord_hx_pay_amz_marketplacewithhel);
                    var zkAmount = Number(column.custrecord_hx_pay_amz_sellingfees) + Number(column.custrecord_hx_pay_amz_fbafees) + Number(column.custrecordcustrecord_payamz_disposal_oth) + Number(column.custrecordcustrecord_hx_pay_amz_ad_tran) + Number(column.custrecord_hx_pay_amz_othertransactionfe) + Number(column.custrecordcustrecord_payamz_invenreturn_) + Number(column.custrecord_transfer_) + Number(column.custrecordcustrecord_hx_pay_amz_light_tr) + Number(column.custrecord_rm_points) + Number(column.custrecord_order_other) + Number(column.custrecordcustrecord_payamz_postage_othe) + Number(column.custrecordcustrecord_payamz_wdchange_oth) + Number(column.custrecord_payamz_debt) + Number(column.custrecordcustrecord_payamz_perorder_oth) + Number(column.custrecord_comminglingvat);
                    var amount827 = Number(column.custrecord_hx_pay_amz_othertransactionfe) + Number(column.custrecord_rm_points) + Number(column.custrecord_order_other) + Number(column.custrecordcustrecord_payamz_wdchange_oth) + Number(column.custrecord_payamz_debt);
                    var amount823 = Number(column.custrecordcustrecord_payamz_perorder_oth) + Number(column.custrecord_hx_pay_amz_fbafees) + Number(column.custrecordcustrecord_payamz_postage_othe);
                    if (i == 0 && saleAmount != 0 && saleAmount != '') {
                        log.debug('dr 591',-saleAmount);
                        journal.setCurrentSublistValue('line', 'account', 591); //应交税费-应交销售税
                        journal.setCurrentSublistValue('line', 'debit', -saleAmount);
                        journal.setCurrentSublistValue('line', 'entity', customer);
                        journal.setCurrentSublistValue('line','cseg_hx_fm_platfm',column.custrecord_hx_pay_amz_platform[0].value);
                        journal.setCurrentSublistValue('line','cseg_hx_fm_store',column.custrecord_hx_pay_amz_store[0].value);
                        journal.commitLine('line');
                    } else if (i == 1 && saleAmount != 0 && saleAmount != '') {
                        log.debug('cr 122',saleAmount);
                        journal.setCurrentSublistValue('line', 'account', 122); //平台
                        journal.setCurrentSublistValue('line', 'credit', -saleAmount);
                        journal.setCurrentSublistValue('line', 'entity', customer);
                        journal.setCurrentSublistValue('line','cseg_hx_fm_platfm',column.custrecord_hx_pay_amz_platform[0].value);
                        journal.setCurrentSublistValue('line','cseg_hx_fm_store',column.custrecord_hx_pay_amz_store[0].value);
                        journal.commitLine('line');
                    }
                    else if (i == 2 && column.custrecord_hx_pay_amz_shippingcredits != 0 && column.custrecord_hx_pay_amz_shippingcredits != '') {
                        log.debug('dr 559',-column.custrecord_hx_pay_amz_shippingcredits);
                        journal.setCurrentSublistValue('line', 'account', 559); //
                        journal.setCurrentSublistValue('line', 'debit', -column.custrecord_hx_pay_amz_shippingcredits);
                        journal.setCurrentSublistValue('line', 'entity', customer);
                        journal.setCurrentSublistValue('line','cseg_hx_fm_platfm',column.custrecord_hx_pay_amz_platform[0].value);
                        journal.setCurrentSublistValue('line','cseg_hx_fm_store',column.custrecord_hx_pay_amz_store[0].value);
                        journal.commitLine('line');
                    }
                    else if (i == 3 && column.custrecord_hx_pay_amz_shippingcredits != 0 && column.custrecord_hx_pay_amz_shippingcredits != '') {
                        log.debug('cr 602',column.custrecord_hx_pay_amz_shippingcredits);
                        journal.setCurrentSublistValue('line', 'account', 602); //
                        journal.setCurrentSublistValue('line', 'credit', -column.custrecord_hx_pay_amz_shippingcredits);
                        journal.setCurrentSublistValue('line', 'entity', customer);
                        journal.setCurrentSublistValue('line','cseg_hx_fm_platfm',column.custrecord_hx_pay_amz_platform[0].value);
                        journal.setCurrentSublistValue('line','cseg_hx_fm_store',column.custrecord_hx_pay_amz_store[0].value);
                        journal.commitLine('line');
                    }
                    else if (i == 4 && column.custrecord_hx_pay_amz_giftwrapcredits != 0 && column.custrecord_hx_pay_amz_giftwrapcredits != '') {
                        log.debug('dr 559',-column.custrecord_hx_pay_amz_giftwrapcredits);
                        journal.setCurrentSublistValue('line', 'account', 559); //
                        journal.setCurrentSublistValue('line', 'debit', -column.custrecord_hx_pay_amz_giftwrapcredits);
                        journal.setCurrentSublistValue('line', 'entity', customer);
                        journal.setCurrentSublistValue('line','cseg_hx_fm_platfm',column.custrecord_hx_pay_amz_platform[0].value);
                        journal.setCurrentSublistValue('line','cseg_hx_fm_store',column.custrecord_hx_pay_amz_store[0].value);
                        journal.commitLine('line');
                    }
                    else if (i == 5 && column.custrecord_hx_pay_amz_giftwrapcredits != 0 && column.custrecord_hx_pay_amz_giftwrapcredits != '') {
                        log.debug('cr 600',column.custrecord_hx_pay_amz_giftwrapcredits);
                        journal.setCurrentSublistValue('line', 'account', 600); //
                        journal.setCurrentSublistValue('line', 'credit', -column.custrecord_hx_pay_amz_giftwrapcredits);
                        journal.setCurrentSublistValue('line', 'entity', customer);
                        journal.setCurrentSublistValue('line','cseg_hx_fm_platfm',column.custrecord_hx_pay_amz_platform[0].value);
                        journal.setCurrentSublistValue('line','cseg_hx_fm_store',column.custrecord_hx_pay_amz_store[0].value);
                        journal.commitLine('line');
                    }
                    else if (i == 6 && column.custrecord_hx_pay_amz_sellingfees != 0 && column.custrecord_hx_pay_amz_sellingfees != '') {
                        log.debug('dr 1458',-column.custrecord_hx_pay_amz_sellingfees);
                        journal.setCurrentSublistValue('line', 'account', 1458); //
                        journal.setCurrentSublistValue('line', 'debit', -column.custrecord_hx_pay_amz_sellingfees);
                        journal.setCurrentSublistValue('line', 'entity', customer);
                        journal.setCurrentSublistValue('line','cseg_hx_fm_platfm',column.custrecord_hx_pay_amz_platform[0].value);
                        journal.setCurrentSublistValue('line','cseg_hx_fm_store',column.custrecord_hx_pay_amz_store[0].value);
                        journal.commitLine('line');
                    }
                    else if (i == 7 && amount823 != 0) {
                        log.debug('dr 1457',-amount823);
                        journal.setCurrentSublistValue('line', 'account', 1457); //
                        journal.setCurrentSublistValue('line', 'debit', -amount823);
                        journal.setCurrentSublistValue('line', 'entity', customer);
                        journal.setCurrentSublistValue('line','cseg_hx_fm_platfm',column.custrecord_hx_pay_amz_platform[0].value);
                        journal.setCurrentSublistValue('line','cseg_hx_fm_store',column.custrecord_hx_pay_amz_store[0].value);
                        journal.commitLine('line');
                    }
                    else if (i == 8 && column.custrecordcustrecord_payamz_disposal_oth != 0 && column.custrecordcustrecord_payamz_disposal_oth != '') {
                        log.debug('dr 1482',-column.custrecordcustrecord_payamz_disposal_oth);
                        journal.setCurrentSublistValue('line', 'account', 1482); //
                        journal.setCurrentSublistValue('line', 'debit', -column.custrecordcustrecord_payamz_disposal_oth);
                        journal.setCurrentSublistValue('line', 'entity', customer);
                        journal.setCurrentSublistValue('line','cseg_hx_fm_platfm',column.custrecord_hx_pay_amz_platform[0].value);
                        journal.setCurrentSublistValue('line','cseg_hx_fm_store',column.custrecord_hx_pay_amz_store[0].value);
                        journal.commitLine('line');
                    }
                    else if (i == 9 && column.custrecordcustrecord_hx_pay_amz_ad_tran != 0 && column.custrecordcustrecord_hx_pay_amz_ad_tran != '') {
                        log.debug('dr 1483',-column.custrecordcustrecord_hx_pay_amz_ad_tran);
                        journal.setCurrentSublistValue('line', 'account', 1483); //
                        journal.setCurrentSublistValue('line', 'debit', -column.custrecordcustrecord_hx_pay_amz_ad_tran);
                        journal.setCurrentSublistValue('line', 'entity', customer);
                        journal.setCurrentSublistValue('line','cseg_hx_fm_platfm',column.custrecord_hx_pay_amz_platform[0].value);
                        journal.setCurrentSublistValue('line','cseg_hx_fm_store',column.custrecord_hx_pay_amz_store[0].value);
                        journal.commitLine('line');
                    }
                    else if (i == 10 && amount827 != 0) {
                        log.debug('dr 1459',-amount827);
                        journal.setCurrentSublistValue('line', 'account', 1459); //
                        journal.setCurrentSublistValue('line', 'debit', -amount827);
                        journal.setCurrentSublistValue('line', 'entity', customer);
                        journal.setCurrentSublistValue('line','cseg_hx_fm_platfm',column.custrecord_hx_pay_amz_platform[0].value);
                        journal.setCurrentSublistValue('line','cseg_hx_fm_store',column.custrecord_hx_pay_amz_store[0].value);
                        journal.commitLine('line');
                    }
                    else if (i == 11 && column.custrecordcustrecord_payamz_invenreturn_ != 0 && column.custrecordcustrecord_payamz_invenreturn_ != '') {
                        log.debug('dr 601',-column.custrecordcustrecord_payamz_invenreturn_);
                        journal.setCurrentSublistValue('line', 'account', 601); //
                        journal.setCurrentSublistValue('line', 'debit', -column.custrecordcustrecord_payamz_invenreturn_);
                        journal.setCurrentSublistValue('line', 'entity', customer);
                        journal.setCurrentSublistValue('line','cseg_hx_fm_platfm',column.custrecord_hx_pay_amz_platform[0].value);
                        journal.setCurrentSublistValue('line','cseg_hx_fm_store',column.custrecord_hx_pay_amz_store[0].value);
                        journal.commitLine('line');
                    }
                    else if (i == 12 && column.custrecord_transfer_ != 0 && column.custrecord_transfer_ != '') {
                        log.debug('dr account',-column.custrecord_transfer_);
                        journal.setCurrentSublistValue('line', 'account', getStore(column.custrecord_hx_pay_amz_store[0].value)); //店铺科目
                        journal.setCurrentSublistValue('line', 'debit', -column.custrecord_transfer_);
                        journal.setCurrentSublistValue('line', 'entity', customer);
                        journal.setCurrentSublistValue('line','cseg_hx_fm_platfm',column.custrecord_hx_pay_amz_platform[0].value);
                        journal.setCurrentSublistValue('line','cseg_hx_fm_store',column.custrecord_hx_pay_amz_store[0].value);
                        journal.commitLine('line');
                    }
                    else if (i == 13 && column.custrecordcustrecord_hx_pay_amz_light_tr != 0 && column.custrecordcustrecord_hx_pay_amz_light_tr != '') {
                        log.debug('dr 1459',-column.custrecordcustrecord_hx_pay_amz_light_tr);
                        journal.setCurrentSublistValue('line', 'account', 1459); //
                        journal.setCurrentSublistValue('line', 'debit', -column.custrecordcustrecord_hx_pay_amz_light_tr);
                        journal.setCurrentSublistValue('line', 'entity', customer);
                        journal.setCurrentSublistValue('line','cseg_hx_fm_platfm',column.custrecord_hx_pay_amz_platform[0].value);
                        journal.setCurrentSublistValue('line','cseg_hx_fm_store',column.custrecord_hx_pay_amz_store[0].value);
                        journal.commitLine('line');
                    }
                    else if (i == 14 && column.custrecord_comminglingvat != 0 && column.custrecord_comminglingvat != '') {
                        log.debug('dr 1558',-column.custrecord_comminglingvat);
                        journal.setCurrentSublistValue('line', 'account', 1558); //
                        journal.setCurrentSublistValue('line', 'debit', -column.custrecord_comminglingvat);
                        journal.setCurrentSublistValue('line', 'entity', customer);
                        journal.setCurrentSublistValue('line','cseg_hx_fm_platfm',column.custrecord_hx_pay_amz_platform[0].value);
                        journal.setCurrentSublistValue('line','cseg_hx_fm_store',column.custrecord_hx_pay_amz_store[0].value);
                        journal.commitLine('line');
                    }
                    else if (i == 15 && zkAmount != 0) {
                        log.debug('cr 122',-zkAmount);
                        journal.setCurrentSublistValue('line', 'account', 122); //
                        journal.setCurrentSublistValue('line', 'credit', -zkAmount);
                        journal.setCurrentSublistValue('line', 'entity', customer);
                        journal.setCurrentSublistValue('line','cseg_hx_fm_platfm',column.custrecord_hx_pay_amz_platform[0].value);
                        journal.setCurrentSublistValue('line','cseg_hx_fm_store',column.custrecord_hx_pay_amz_store[0].value);
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
            log.debug({
                title: 'summary',
                details: summary
            });
        }

        function initSearch() {
            var mySearch = search.load({id:'customsearch_cl_amz2journal'});
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