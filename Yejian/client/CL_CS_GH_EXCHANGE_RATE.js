/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */
 define(['N/search', 'N/record', 'N/runtime', 'N/currency'], function (search, record, runtime, currency) {

    function pageInit(context) {

    }

    function saveRecord(context) {

    }

    function validateField(context) {

    }

    function fieldChanged(context) {
        try {
            var now_rec = context.currentRecord;
            var now_fieldid = context.fieldId;//拿到当前的字段
            console.log(now_fieldid);
            //获取支付币种汇率或获取购进币种汇率
            if (now_fieldid == 'custrecord_hg_bank_transfer_currency_bwb') {
                var currency_bwb = now_rec.getValue('custrecord_hg_bank_transfer_currency_bwb');
                var currency_f = now_rec.getValue('custrecord_hg_bank_transfer_currency_f');
                var transfer_date = now_rec.getValue('custrecord_hg_bank_transfer_date');
                if (currency_f && transfer_date && currency_bwb) {
                    var need_rate = currency.exchangeRate({ source: currency_f, target: currency_bwb, date: transfer_date });//target:为货币汇率中的基本货币，source：为货币汇率中的来源货币
                    now_rec.setValue('custrecord_hg_bank_transfer_zb_rate', Number(need_rate).toFixed(8));
                }
                var currency_t = now_rec.getValue('custrecord_hg_bank_transfer_currency_t');
                if (currency_t && transfer_date && currency_bwb) {
                    var need_rate = currency.exchangeRate({ source: currency_t, target: currency_bwb, date: transfer_date });
                    now_rec.setValue('custrecord_hg_bank_transfer_bz_rate', Number(need_rate).toFixed(8));
                }
            }
            if (now_fieldid == 'custrecord_hg_bank_transfer_currency_f' || now_fieldid == 'custrecord_hg_bank_transfer_currency_t') {
                var currency_bwb = now_rec.getValue('custrecord_hg_bank_transfer_currency_bwb');
                var currency_id = now_rec.getValue(now_fieldid);
                var transfer_date = now_rec.getValue('custrecord_hg_bank_transfer_date');
                if (currency_id && currency_bwb) {
                    var need_rate = currency.exchangeRate({ source: currency_id, target: currency_bwb, date: transfer_date });//target:为货币汇率中的基本货币，source：为货币汇率中的来源货币
                    console.log(need_rate);
                    if (now_fieldid == 'custrecord_hg_bank_transfer_currency_f') {
                        now_rec.setValue('custrecord_hg_bank_transfer_zb_rate', Number(need_rate).toFixed(8));
                    } else if (now_fieldid == 'custrecord_hg_bank_transfer_currency_t') {
                        now_rec.setValue('custrecord_hg_bank_transfer_bz_rate', Number(need_rate).toFixed(8));
                    }
                }

            }
            //赋值类型字段和记账汇率
            if (now_fieldid == 'custrecord_hg_bank_transfer_currency_f' || now_fieldid == 'custrecord_hg_bank_transfer_currency_t' || now_fieldid == 'custrecord_hg_bank_transfer_currency_bwb') {
                var currency_bwb = now_rec.getValue('custrecord_hg_bank_transfer_currency_bwb');
                var currency_f = now_rec.getValue('custrecord_hg_bank_transfer_currency_f');
                var currency_t = now_rec.getValue('custrecord_hg_bank_transfer_currency_t');
                var transfer_date = now_rec.getValue('custrecord_hg_bank_transfer_date');
                var transfer_type, need_rate;
                if (currency_bwb && currency_f && currency_t) {
                    if (currency_f == currency_bwb && currency_t != currency_bwb) {
                        transfer_type = 2;//仅支付币种与公司本位币一致
                        var currency_t = now_rec.getValue('custrecord_hg_bank_transfer_currency_t');
                        need_rate = currency.exchangeRate({ source: currency_t, target: currency_bwb, date: transfer_date });
                    } else if (currency_f != currency_bwb && currency_t != currency_bwb) {
                        transfer_type = 1;//购进及支付币种均与公司本位币不一致
                        var amount_fz = now_rec.getValue('custrecord_hg_bank_transfer_amount_fz') ? now_rec.getValue('custrecord_hg_bank_transfer_amount_fz') : 0;
                        var bz_rate = now_rec.getValue('custrecord_hg_bank_transfer_bz_rate') ? now_rec.getValue('custrecord_hg_bank_transfer_bz_rate') : 0;
                        var amount_f;
                        if (now_rec.getValue('custrecord_hg_bank_transfer_amount_f') != null && now_rec.getValue('custrecord_hg_bank_transfer_amount_f')) {
                            amount_f = now_rec.getValue('custrecord_hg_bank_transfer_amount_f');
                        } else {
                            amount_f = 0;
                        }
                        need_rate = amount_fz / bz_rate / amount_f;
                    } else if (currency_f != currency_bwb && currency_t == currency_bwb) {
                        transfer_type = 3;//仅购买币种与公司本位币一致
                        var currency_f = now_rec.getValue('custrecord_hg_bank_transfer_currency_f');
                        need_rate = currency.exchangeRate({ source: currency_f, target: currency_bwb, date: transfer_date });
                    } else {
                        transfer_type = '';
                        need_rate = '';
                    }
                    now_rec.setValue('custrecord_hg_bank_transfer_type', transfer_type);
                    now_rec.setValue('custrecord_hg_bank_transfer_jz_rate', Number(need_rate).toFixed(8));
                }
            }

            //赋值记账汇率
            if (now_fieldid == 'custrecord_hg_bank_transfer_amount_fz' || now_fieldid == 'custrecord_hg_bank_transfer_bz_rate' || now_fieldid == 'custrecord_hg_bank_transfer_amount_f') {
                var transfer_type = now_rec.getValue('custrecord_hg_bank_transfer_type');
                if (transfer_type && transfer_type == 1) {
                    var amount_fz = now_rec.getValue('custrecord_hg_bank_transfer_amount_fz') ? now_rec.getValue('custrecord_hg_bank_transfer_amount_fz') : 0;
                    var bz_rate = now_rec.getValue('custrecord_hg_bank_transfer_bz_rate') ? now_rec.getValue('custrecord_hg_bank_transfer_bz_rate') : 0;
                    var amount_f;
                    if (now_rec.getValue('custrecord_hg_bank_transfer_amount_f') != null && now_rec.getValue('custrecord_hg_bank_transfer_amount_f')) {
                        amount_f = now_rec.getValue('custrecord_hg_bank_transfer_amount_f');
                    } else {
                        amount_f = 0;
                    }
                    var need_rate = amount_fz / bz_rate / amount_f;
                    now_rec.setValue('custrecord_hg_bank_transfer_jz_rate', Number(need_rate).toFixed(8));
                }
            }

            //赋值购汇汇率
            if (now_fieldid == 'custrecord_hg_bank_transfer_amount_t' || now_fieldid == 'custrecord_hg_bank_transfer_amount_f') {
                var amount_t = now_rec.getValue('custrecord_hg_bank_transfer_amount_t') ? now_rec.getValue('custrecord_hg_bank_transfer_amount_t') : 0;
                var amount_f;
                if (now_rec.getValue('custrecord_hg_bank_transfer_amount_f') != null && now_rec.getValue('custrecord_hg_bank_transfer_amount_f')) {
                    amount_f = now_rec.getValue('custrecord_hg_bank_transfer_amount_f');
                } else {
                    amount_f = 0;
                }
                if (amount_t && amount_f) {
                    var gh_rate = Number(amount_t / amount_f).toFixed(8);
                    now_rec.setValue('custrecord_hg_bank_transfer_gh_rate', gh_rate);
                }
            }

            //赋值中转科目金额（支付）和中转科目金额（购进）
            if (now_fieldid == 'custrecord_hg_bank_transfer_amount_f') {
                var amount_f;
                if (now_rec.getValue('custrecord_hg_bank_transfer_amount_f') != null && now_rec.getValue('custrecord_hg_bank_transfer_amount_f')) {
                    amount_f = now_rec.getValue('custrecord_hg_bank_transfer_amount_f');
                } else {
                    amount_f = 0;
                }
                var zb_rate = now_rec.getValue('custrecord_hg_bank_transfer_zb_rate') ? now_rec.getValue('custrecord_hg_bank_transfer_zb_rate') : 0;
                var amount_fz = Number(amount_f * zb_rate).toFixed(8);
                now_rec.setValue('custrecord_hg_bank_transfer_amount_fz', amount_fz);
                var bz_rate = now_rec.getValue('custrecord_hg_bank_transfer_bz_rate') ? now_rec.getValue('custrecord_hg_bank_transfer_bz_rate') : 0;
                var amount_tz = Number(amount_fz / bz_rate).toFixed(8);
                now_rec.setValue('custrecord_hg_bank_transfer_amount_tz', amount_tz);

            }

            //赋值换算本位币金额
            if (now_fieldid == 'custrecord_hg_bank_transfer_amount_f' || now_fieldid == 'custrecord_hg_bank_transfer_jz_rate' ||
                now_fieldid == 'custrecord_hg_bank_transfer_amount_t' || now_fieldid == 'custrecord_hg_bank_transfer_amount_tz' || now_fieldid == 'custrecord_hg_bank_transfer_zb_rate') {
                var transfer_type = now_rec.getValue('custrecord_hg_bank_transfer_type');
                if (transfer_type) {
                    var jz_rate = now_rec.getValue('custrecord_hg_bank_transfer_jz_rate') ? now_rec.getValue('custrecord_hg_bank_transfer_jz_rate') : 0;
                    var amount_hs = 0;
                    if (transfer_type == 2) {
                        var amount_f;
                        if (now_rec.getValue('custrecord_hg_bank_transfer_amount_f') != null && now_rec.getValue('custrecord_hg_bank_transfer_amount_f')) {
                            amount_f = now_rec.getValue('custrecord_hg_bank_transfer_amount_f');
                        } else {
                            amount_f = 0;
                        }
                        amount_hs = Number(amount_f * jz_rate).toFixed(8);
                    } else if (transfer_type == 3) {
                        var amount_t = now_rec.getValue('custrecord_hg_bank_transfer_amount_t') ? now_rec.getValue('custrecord_hg_bank_transfer_amount_t') : 0;
                        amount_hs = Number(amount_t / jz_rate).toFixed(8);
                    } else if (transfer_type == 1) {
                        var amount_tz = now_rec.getValue('custrecord_hg_bank_transfer_amount_tz') ? now_rec.getValue('custrecord_hg_bank_transfer_amount_tz') : 0;
                        var zb_rate = now_rec.getValue('custrecord_hg_bank_transfer_zb_rate') ? now_rec.getValue('custrecord_hg_bank_transfer_zb_rate') : 0;
                        amount_hs = Number(amount_tz / zb_rate).toFixed(8);
                    }
                    now_rec.setValue('custrecord_hg_bank_transfer_amount_hs', amount_hs);
                }
            }

            //赋值子类型
            if (now_fieldid == 'custrecord_hg_bank_transfer_jz_rate' || now_fieldid == 'custrecord_hg_bank_transfer_gh_rate') {
                var jz_rate = now_rec.getValue('custrecord_hg_bank_transfer_jz_rate') ? now_rec.getValue('custrecord_hg_bank_transfer_jz_rate') : 0;
                var gh_rate = now_rec.getValue('custrecord_hg_bank_transfer_gh_rate') ? now_rec.getValue('custrecord_hg_bank_transfer_gh_rate') : 0;
                if (jz_rate > gh_rate) {
                    now_rec.setValue('custrecord_hg_bank_transfer_type_sub', 2);
                } else if (jz_rate <= gh_rate) {
                    now_rec.setValue('custrecord_hg_bank_transfer_type_sub', 1);
                }
            }
        } catch (e) {
            log.debug('e', e);
        }
    }

    function postSourcing(context) {

    }

    function lineInit(context) {

    }

    function validateDelete(context) {

    }

    function validateInsert(context) {

    }

    function validateLine(context) {

    }

    function sublistChanged(context) {

    }

    return {
        // pageInit: pageInit,
        // saveRecord: saveRecord,
        // validateField: validateField,
        fieldChanged: fieldChanged,
        // postSourcing: postSourcing,
        // lineInit: lineInit,
        // validateDelete: validateDelete,
        // validateInsert: validateInsert,
        // validateLine: validateLine,
        // sublistChanged: sublistChanged
    }
});
