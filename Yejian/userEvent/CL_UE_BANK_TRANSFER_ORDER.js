/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 *购汇单生成日记账
 */
 define(['N/record'], function (record) {

    function beforeLoad(context) {

    }

    function beforeSubmit(context) {

    }

    function afterSubmit(context) {
        try {
            var newRecord = context.newRecord;
            if (context.type == 'edit') {
                var transfer_status = newRecord.getValue('custrecord_hg_bank_transfer_status');//状态
                if (transfer_status == 2) {
                    var transfer_je_1 = newRecord.getValue('custrecord_hg_bank_transfer_je_1');
                    var transfer_je_2 = newRecord.getValue('custrecord_hg_bank_transfer_je_2');
                    var transfer_type = newRecord.getValue('custrecord_hg_bank_transfer_type');//类型
                    var bill_id = newRecord.id;//购汇单ID
                    var transfer_subsidiary = newRecord.getValue('custrecord_hg_bank_transfer_subsidiary');//主体公司
                    var transfer_date = newRecord.getValue('custrecord_hg_bank_transfer_date');//交易时间
                    var currency_f = newRecord.getValue('custrecord_hg_bank_transfer_currency_f');//支付币种
                    var to_account = newRecord.getValue('custrecord_hg_bank_transfer_to_account');//购进科目
                    var amount_hs = newRecord.getValue('custrecord_hg_bank_transfer_amount_hs');//换算本位币金额
                    var from_account = newRecord.getValue('custrecord_hg_bank_transfer_from_account');//支付科目
                    var amount_f = newRecord.getValue('custrecord_hg_bank_transfer_amount_f');//支付金额
                    var account_hd = newRecord.getValue('custrecord_hg_bank_transfer_account_hd');//汇兑损益记账科目
                    var type_sub = newRecord.getValue('custrecord_hg_bank_transfer_type_sub');//子类型
                    var currency_t = newRecord.getValue('custrecord_hg_bank_transfer_currency_t');//购进币种
                    var amount_t = newRecord.getValue('custrecord_hg_bank_transfer_amount_t');//购进金额
                    var amount_tz = newRecord.getValue('custrecord_hg_bank_transfer_amount_tz');//中转科目金额(购进)
                    //创建日记账
                    var journal_id, journal_id1;
                    var journal = record.create({ type: 'journalentry' });
                    if (transfer_type == 3 && !transfer_je_1) {//仅购进币种与公司本位币一致
                        journal.setValue('subsidiary', transfer_subsidiary);
                        journal.setValue('trandate', transfer_date);
                        journal.setValue('currency', currency_f);
                        journal.setValue('memo', '购汇单生成日记账');
                        journal.setValue('custbody_gouhuidan', bill_id);
                        journal.setValue('custbody_redmark', 2);
                        //借方明细行
                        journal.setSublistValue({ sublistId: 'line', fieldId: 'account', value: to_account, line: 0 });//借方科目
                        journal.setSublistValue({ sublistId: 'line', fieldId: 'debit', value: amount_hs, line: 0 });//借方金额
                        //贷方明细行
                        journal.setSublistValue({ sublistId: 'line', fieldId: 'account', value: from_account, line: 1 });
                        journal.setSublistValue({ sublistId: 'line', fieldId: 'credit', value: amount_f, line: 1 });
                        //现金流量表行
                        journal.setSublistValue({ sublistId: 'line', fieldId: 'account', value: account_hd, line: 2 });//借方科目
                        var amount_num = amount_f - amount_hs;
                        journal.setSublistValue({ sublistId: 'line', fieldId: 'debit', value: amount_num, line: 2 });//借方金额
                        var cn_cfi;
                        if (type_sub == 1) {
                            cn_cfi = 3;//收到其他与经营活动有关的现金
                        } else {
                            cn_cfi = 7;//支付其他与经营活动有关的现金
                        }
                        journal.setSublistValue({ sublistId: 'line', fieldId: 'custcol_cseg_cn_cfi', value: cn_cfi, line: 2 });
                        journal_id = journal.save();
                    } else if (transfer_type == 2 && !transfer_je_1) {//仅支付币种与公司本位币一致
                        journal.setValue('subsidiary', transfer_subsidiary);
                        journal.setValue('trandate', transfer_date);
                        journal.setValue('currency', currency_t);
                        journal.setValue('memo', '购汇单生成日记账');
                        journal.setValue('custbody_gouhuidan', bill_id);
                        journal.setValue('custbody_redmark', 2);
                        //借方明细行
                        journal.setSublistValue({ sublistId: 'line', fieldId: 'account', value: to_account, line: 0 });//借方科目
                        journal.setSublistValue({ sublistId: 'line', fieldId: 'debit', value: amount_t, line: 0 });//借方金额
                        //贷方明细行
                        journal.setSublistValue({ sublistId: 'line', fieldId: 'account', value: from_account, line: 1 });
                        journal.setSublistValue({ sublistId: 'line', fieldId: 'credit', value: amount_tz, line: 1 });
                        //现金流量表行
                        journal.setSublistValue({ sublistId: 'line', fieldId: 'account', value: account_hd, line: 2 });//借方科目
                        var amount_num = amount_tz - amount_t;
                        journal.setSublistValue({ sublistId: 'line', fieldId: 'debit', value: amount_num, line: 2 });//借方金额
                        var cn_cfi;
                        if (type_sub == 1) {
                            cn_cfi = 3;//收到其他与经营活动有关的现金 汇益
                        } else {
                            cn_cfi = 7;//支付其他与经营活动有关的现金 汇损
                        }
                        journal.setSublistValue({ sublistId: 'line', fieldId: 'custcol_cseg_cn_cfi', value: cn_cfi, line: 2 });
                        journal_id = journal.save();
                    } else if (transfer_type == 1) {//购进及支付币种均与公司本位币不一致
                        if (!transfer_je_1) {
                            journal.setValue('subsidiary', transfer_subsidiary);
                            journal.setValue('trandate', transfer_date);
                            journal.setValue('currency', currency_f);
                            journal.setValue('memo', '购汇单生成日记账');
                            journal.setValue('custbody_gouhuidan', bill_id);
                            journal.setValue('custbody_redmark', 2);
                            //借方明细行
                            journal.setSublistValue({ sublistId: 'line', fieldId: 'account', value: 122, line: 0 });//借方科目
                            journal.setSublistValue({ sublistId: 'line', fieldId: 'debit', value: amount_f, line: 0 });//借方金额
                            //贷方明细行
                            journal.setSublistValue({ sublistId: 'line', fieldId: 'account', value: from_account, line: 1 });
                            journal.setSublistValue({ sublistId: 'line', fieldId: 'credit', value: amount_f, line: 1 });
                            journal_id = journal.save();
                        }
                        if (!transfer_je_2) {
                            //第二张日记账
                            var journal1 = record.create({ type: 'journalentry' });
                            journal1.setValue('subsidiary', transfer_subsidiary);
                            journal1.setValue('trandate', transfer_date);
                            journal1.setValue('currency', currency_t);
                            journal1.setValue('memo', '购汇单生成日记账');
                            journal1.setValue('custbody_gouhuidan', bill_id);
                            journal1.setValue('custbody_redmark', 2);
                            //借方明细行 
                            journal1.setSublistValue({ sublistId: 'line', fieldId: 'account', value: to_account, line: 0 });//借方科目
                            journal1.setSublistValue({ sublistId: 'line', fieldId: 'debit', value: amount_t, line: 0 });//借方金额
                            //贷方明细行
                            journal1.setSublistValue({ sublistId: 'line', fieldId: 'account', value: 122, line: 1 });
                            journal1.setSublistValue({ sublistId: 'line', fieldId: 'credit', value: amount_tz, line: 1 });
                            //现金流量表行
                            journal1.setSublistValue({ sublistId: 'line', fieldId: 'account', value: account_hd, line: 2 });//借方科目
                            var amount_num = amount_tz - amount_t;
                            journal1.setSublistValue({ sublistId: 'line', fieldId: 'debit', value: amount_num, line: 2 });//借方金额
                            var cn_cfi;
                            if (type_sub == 1) {
                                cn_cfi = 3;//收到其他与经营活动有关的现金 汇益
                            } else {
                                cn_cfi = 7;//支付其他与经营活动有关的现金 汇损
                            }
                            journal1.setSublistValue({ sublistId: 'line', fieldId: 'custcol_cseg_cn_cfi', value: cn_cfi, line: 2 });
                            journal_id1 = journal1.save();
                        }
                    }
                    //将生成的日记账回写到购汇单上
                    if(journal_id || journal_id1){
                        record.submitFields({
                            type: 'customrecord_hg_bank_transfer_order',
                            id: bill_id,
                            values: {
                                custrecord_hg_bank_transfer_je_1: journal_id,
                                custrecord_hg_bank_transfer_je_2: journal_id1
                            }
                        });
                    }
                }
            }
        } catch (e) {
            log.debug('e', e);
        }
    }

    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    }
});
