/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 * 1.0 2019-08-15 marvin 购汇/结汇单确认后产生日记账
 * 1.2  20191112  william  新增：当触发失败的时候，如果是部署不够自动创建部署
 */
define(['N/record', 'N/runtime', 'N/search', 'N/format', 'N/file', 'N/task', 'N/currency'],
    /**
     * @param {record} record
     * @param {runtime} runtime
     * @param {search} search
     */
    function (record, runtime, search, format, file, task, currency) {
        // 一些参数
        var attemptTime = 0; // 尝试次数，每次新建部署最多尝试十次，超过则抛出失败
        var deploymentId = 0; //  记录部署id，不用每次都进行查找了
        // 创建新部署
        function createNewDeployment() {
            if (deploymentId == 0) {
                var scriptdeploymentSearchObj = search.create({
                    type: "scriptdeployment",
                    filters:
                        [
                            ["script.scriptid", "is", "customscript_trigger_cn_cashflow_ss"]
                        ],
                    columns:
                        [
                            search.createColumn({name: "internalid"})
                        ]
                });
                var searchDepIdArr = [];
                var searchRetArr = scriptdeploymentSearchObj.run().getRange({start: 0, end: 1});
                for (var i = 0; i < searchRetArr.length; i++) {
                    var alu_rec_id = searchRetArr[i].getValue({name: "internalid"});
                    if (alu_rec_id) {
                        searchDepIdArr.push({"recordType": "scriptdeployment", "id": alu_rec_id});
                    }
                }
                if (searchDepIdArr.length > 0) {
                    deploymentId = searchDepIdArr[0].id;
                }
            }
            if (deploymentId != 0) {
                record.copy({
                    type: record.Type.SCRIPT_DEPLOYMENT,
                    id: deploymentId,
                    isDynamic: true
                }).save();
            }
        }

        // 触发中国现金流表项
        function triggerTaskUpdateCashFlow(paramsObj) {
            attemptTime++;
            try {
                var createTask = task.create({
                    taskType: task.TaskType.SCHEDULED_SCRIPT,
                    scriptId: 'customscript_trigger_cn_cashflow_ss',
                    params: {
                        custscript_update_ss_params: {recordType: paramsObj.recordType, recordId: paramsObj.recordId}
                    }
                });
                createTask.submit();
            } catch (e) {
                log.error("触发中国现金流失败:", JSON.stringify(e.message));
                if (e.name === 'NO_DEPLOYMENTS_AVAILABLE' || e.name === 'FAILED_TO_SUBMIT_JOB_REQUEST_1') {
                    if (attemptTime > 10) {
                        throw e;
                    }
                    createNewDeployment();
                    triggerTaskUpdateCashFlow(paramsObj);
                } else {
                    throw e;
                }
            }
            attemptTime = 0;
        }

        var UFACCOUNT = '125'; //Undeposited Funds
        var createFile = false;

        /**
         * Function definition to be triggered before record is loaded.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {string} scriptContext.type - Trigger type
         * @param {Form} scriptContext.form - Current form
         * @Since 2015.2
         */
        function beforeLoad(scriptContext) {
        }

        /**
         * Function definition to be triggered before record is loaded.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type
         * @Since 2015.2
         */
        function beforeSubmit(scriptContext) {
        }

        /**
         * Function definition to be triggered before record is loaded.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type
         * @Since 2015.2
         */
        function afterSubmit(scriptContext) {
            log.debug('ue afterSubmit step0', 'executionContext = ' + runtime.executionContext);
            var userObj = runtime.getCurrentUser();
            var userRole = userObj.role;
            var updFlg = false;
            if (scriptContext.type != 'delete' && scriptContext.type != 'xedit') {
                var newRec = scriptContext.newRecord;
                var id = newRec.getValue({fieldId: 'id'});
                log.debug('购汇单ID', id);
                var newStatus = newRec.getValue({fieldId: 'custrecord_hg_bank_transfer_status'});//获取单据状态做判断
                var nowDate = getOffsetZoneDate(8); //new Date();
                var useDate = newRec.getValue({fieldId: 'custrecord_hg_bank_transfer_date'});
                var nowTrandate = format.parse({value: nowDate, type: format.Type.DATE});
                var nowPostingperiod = getNowOpenPeriod(useDate);
                log.debug('ue afterSubmit step1', 'nowTrandate = ' + nowTrandate + '  :nowPostingperiod = ' + nowPostingperiod);
                //记录生成的单据ID
                var bscId;
                var bscId2;
                var ori_bscId = newRec.getValue({fieldId: 'custrecord_hg_bank_transfer_je_1'});//存日记账
                var updFlg = false;
                //状态变为已确认，创建日记账
                if (newStatus == '2' && nowPostingperiod) {
                    try {
                        var acObj = {};
                        acObj.nowTrandate = nowTrandate;
                        acObj.nowPostingperiod = nowPostingperiod;
                        if (ori_bscId) {
                            bscId = ori_bscId;
                        } else {
                            var idObj = dealBankTransferJe(newRec, acObj);
                            bscId = idObj.id1;
                            bscId2 = idObj.id2;
                            updFlg = true;
                        }

                        //生成的JE回写原单据
                        if (updFlg) {
                            var newRecFroUpd = record.load({type: 'customrecord_hg_bank_transfer_order', id: id, isDynamic: true});
                            if (bscId) {
                                newRecFroUpd.setValue('custrecord_hg_bank_transfer_je_1', bscId);
                            }
                            if (bscId2) {
                                newRecFroUpd.setValue('custrecord_hg_bank_transfer_je_2', bscId2);
                            }
                            newRecFroUpd.save();
                        }
                        // 20191112 william 生成的日记账触发中国现金流
                        if (updFlg) {
                            if (bscId) {
                                triggerTaskUpdateCashFlow({recordType: 'journalentry', recordId: bscId});
                            }
                            if (bscId2) {
                                triggerTaskUpdateCashFlow({recordType: 'journalentry', recordId: bscId2});
                            }
                        }
                    } catch (e) {
                        log.error('ue afterSubmit error', e);
                    }
                }
            }
            log.debug('ue afterSubmit step9', 'afterSubmit end');
        }

        function getOffsetZoneDate(offsetZone) {
            var nowServer = new Date();
            var moffset = nowServer.getTimezoneOffset();
            var nowOffset = new Date(nowServer.getTime() + ((offsetZone * 60 + moffset) * 60 * 1000));

            return nowOffset;
        }

        //取得当天对应的打开状态的账期
        function getNowOpenPeriod(nowDate) {
            //var nowDate = new Date();
            //var useDate = newRec.getValue({ fieldId :'custrecord_hg_bank_transfer_date' });
            //var nowTrandate = format.parse({ value : nowDate, type : format.Type.DATE });
            var nowTrandate = getCurrentDateFormateByDate(nowDate);
            var nowPostingperiod;
            try {
                var b_filters = [];
                b_filters.push(search.createFilter({name: 'closed', operator: search.Operator.IS, values: 'F'}));
                b_filters.push(search.createFilter({name: 'isyear', operator: search.Operator.IS, values: 'F'}));
                b_filters.push(search.createFilter({name: 'isquarter', operator: search.Operator.IS, values: 'F'}));
                b_filters.push(search.createFilter({name: 'startdate', operator: search.Operator.ONORBEFORE, values: nowTrandate}));
                b_filters.push(search.createFilter({name: 'enddate', operator: search.Operator.ONORAFTER, values: nowTrandate}));
                var b_columns = [];
                b_columns.push(search.createColumn({name: 'internalid'}));
                var tmpSearch = search.create({type: 'accountingperiod', filters: b_filters, columns: b_columns});
                var res = tmpSearch.run().getRange({start: 0, end: 10});
                if (res && res.length > 0) {
                    nowPostingperiod = res[0].getValue(b_columns[0]);
                }
            } catch (e) {
                log.error('UE_hg_on_ce_comfirm afterSubmit getNowOpenPeriod error', e);
            }
            return nowPostingperiod;
        }

        function getCurrentDateFormateByDate(date) {
            return getCurrentDateFormate(date.getFullYear(), date.getMonth() + 1, date.getDate());
        }

        //获取当前用户的时间格式
        function getCurrentDateFormate(year, month, day) {
            var userObj = runtime.getCurrentUser();
            var s_context = userObj.getPreference({name: "DATEFORMAT"});
            if (s_context == 'YYYY年M月D日' || s_context == 'YYYY年MM月DD日') {
                return year + '年' + month + '月' + day + '日';
            } else if (s_context == 'YYYY-M-D' || s_context == 'YYYY-MM-DD') {
                return year + '-' + month + '-' + day;
            } else if (s_context == 'YYYY M D' || s_context == 'YYYY MM DD') {
                return year + ' ' + month + ' ' + day;
            } else if (s_context == 'YYYY/M/D' || s_context == 'YYYY/MM/DD') {
                return year + '/' + addZero(month) + '/' + addZero(day);
            } else if (s_context == 'M/D/YYYY' || s_context == 'MM/DD/YYYY') {
                return month + '/' + day + '/' + year;
            } else if (s_context == 'D/M/YYYY' || s_context == 'DD/MM/YYYY') {
                return day + '/' + month + '/' + year;
            } else if (s_context == 'D-Mon-YYYY' || s_context == 'DD-Mon-YYYY') {
                return day + '-' + month + '-' + year;
            } else if (s_context == 'D.M.YYYY' || s_context == 'DD.MM.YYYY') {
                return day + '.' + month + '.' + year;
            }
        }

        //购汇、结汇日记账
        function dealBankTransferJe(newRec, acObj) {
            var id1;
            var id2;
            var amount_f = newRec.getValue({fieldId: 'custrecord_hg_bank_transfer_amount_f'});
            if (amount_f && !isNaN(amount_f)) {
                var subsidiary = newRec.getValue({fieldId: 'custrecord_hg_bank_transfer_subsidiary'});//主体公司
                var date = newRec.getValue({fieldId: 'custrecord_hg_bank_transfer_date'});//交易时间
                var ghd = newRec.getValue({fieldId: 'id'});
                log.debug('ghd', ghd);
                var account_f = newRec.getValue({fieldId: 'custrecord_hg_bank_transfer_from_account'});//自科目
                var account_t = newRec.getValue({fieldId: 'custrecord_hg_bank_transfer_to_account'});//至科目
                var account_hd = newRec.getValue({fieldId: 'custrecord_hg_bank_transfer_account_hd'});//汇兑损益科目
                var currency_f = newRec.getValue({fieldId: 'custrecord_hg_bank_transfer_currency_f'});//自货币币种
                var currency_t = newRec.getValue({fieldId: 'custrecord_hg_bank_transfer_currency_t'});//至货币币种
                var currency_bwb = newRec.getValue({fieldId: 'custrecord_hg_bank_transfer_currency_bwb'});//公司本位币
                var rate1 = '';
                if (currency_bwb && currency_t) {
                    rate1 = currency.exchangeRate({source: currency_t, target: currency_bwb, date: date});
                    log.debug('买进货币币种与公司本位币汇率', rate1);
                }
                var rate2 = '';
                if (currency_bwb && currency_f) {
                    rate2 = currency.exchangeRate({source: currency_f, target: currency_bwb, date: date});
                    log.debug('卖出货币币种与公司本位币汇率', rate2);
                }
                var amount_f = dealRateFix(newRec.getValue({fieldId: 'custrecord_hg_bank_transfer_amount_f'}), rate2);//支付金额
                var amount_t = dealRateFix(newRec.getValue({fieldId: 'custrecord_hg_bank_transfer_amount_t'}), rate1);//购进金额
                var amount_fz = newRec.getValue({fieldId: 'custrecord_hg_bank_transfer_amount_fz'});//中转科目金额（自）
                var amount_tz = dealRateFix(newRec.getValue({fieldId: 'custrecord_hg_bank_transfer_amount_tz'}), rate1);//中转科目金额（至）
                log.debug('中转科目金额至', amount_tz);
                var amount_hs = newRec.getValue({fieldId: 'custrecord_hg_bank_transfer_amount_hs'});//换算本位币金额
                if (rate1 < 0.01) {
                    amount_hs = dealRateFix(amount_hs, rate1);
                } else {
                    amount_hs = dealRateFix(amount_hs, rate2);
                }
                var type = newRec.getValue({fieldId: 'custrecord_hg_bank_transfer_type'});//类型
                log.debug('type', type);
                var sub_type = newRec.getValue({fieldId: 'custrecord_hg_bank_transfer_type_sub'});//子类型
                //注：sub_type = 1 ==>汇益；sub_type = 2  ==>汇损；
                log.debug('subtype', sub_type);
                //type=2，sub_type=1,汇益金额=购进金额-换算本位币金额
                var amount_sy1 = dealRateFix(Number(amount_t) - Number(amount_hs), rate1);
                log.debug('支付币种一致汇益金额', amount_sy1);
                //type=2,sub_type=2,汇损金额= 换算本位币金额-购进金额
                var amount_sy2 = dealRateFix(Number(amount_hs) - Number(amount_t), rate1);
                log.debug('支付币种一致汇损金额', amount_sy2);
                //type=3,sub_type=1,汇损金额=换算本位币金额-支付金额
                var amount_sy3 = dealRateFix(Number(amount_hs) - Number(amount_f), rate2);
                log.debug('购进币种一致汇益金额', amount_sy3);
                //type=3,sub_type=2,汇损金额=支付金额-换算本位币金额
                var amount_sy4 = dealRateFix(Number(amount_f) - Number(amount_hs), rate2);
                //log.debug('购进币种一致汇损金额',amount_sy4);
                log.debug('type=3,subtype=2 各金额日志', '支付金额/贷方: ' + amount_f + '换算本位币金额/借方:' + amount_hs + '汇损金额（支付金额-换算金额）/借方:' + amount_sy4);
                //type=1,sub_type=1,汇损金额=购进金额-中转科目金额（至）
                var amount_sy5 = dealRateFix(Number(amount_t) - Number(amount_tz), rate1);
                log.debug('币种不一致汇益金额', amount_sy5);
                //type=1,sub_type=2,汇损金额=中转科目金额（至）-购进金额
                var amount_sy6 = dealRateFix(Number(amount_tz) - Number(amount_t), rate1);
                log.debug('币种不一致汇损金额', amount_sy6);

                //创建购汇结汇日记账
                var jeRec = record.create({type: 'journalentry'});
                //类型=币种全跟本位币一致，type=‘1’，产生2个日记账
                //类型=支付币种跟本位币一致，type=‘2’，币种取购进币种
                //类型=购进币种跟本位币一致，type=‘3’
                if (type == '2' && sub_type == '1') {

                    jeRec.setValue({fieldId: 'subsidiary', value: subsidiary});
                    jeRec.setValue({fieldId: 'postingperiod', value: acObj.nowPostingperiod});
                    //jeRec.setValue({ fieldId : 'trandate', value : acObj.nowTrandate });
                    jeRec.setValue({fieldId: 'currency', value: currency_t});
                    jeRec.setValue({fieldId: 'trandate', value: date});
                    jeRec.setValue({fieldId: 'custbody_hg_create_from_gh', value: ghd});
                    jeRec.setValue({fieldId: 'approvalstatus', value: '2'}); //已核准
                    //借方明细行
                    jeRec.setSublistValue({sublistId: 'line', fieldId: 'account', value: account_t, line: 0});//借方科目
                    jeRec.setSublistValue({sublistId: 'line', fieldId: 'debit', value: amount_t, line: 0});//借方金额
                    //03-10：amount_tz>>amount_t
                    //jeRec.setSublistValue({ sublistId: 'line', fieldId : 'custcol_cseg_cn_cfi', value : '4' , line : 0});
                    //贷方明细行
                    jeRec.setSublistValue({sublistId: 'line', fieldId: 'account', value: account_f, line: 1});
                    jeRec.setSublistValue({sublistId: 'line', fieldId: 'credit', value: amount_hs, line: 1});
                    //2020-07-27:取消银行科目JE行的现金流量表项
                    //jeRec.setSublistValue({ sublistId: 'line', fieldId : 'custcol_cseg_cn_cfi', value : '3', line : 1});
                    jeRec.setSublistValue({sublistId: 'line', fieldId: 'account', value: account_hd, line: 2});
                    jeRec.setSublistValue({sublistId: 'line', fieldId: 'credit', value: amount_sy1, line: 2});
                    jeRec.setSublistValue({sublistId: 'line', fieldId: 'custcol_cseg_cn_cfi', value: '3', line: 2});

                    //log.debug('本位币不一致发生汇益数据',借方: amount_t + 贷方: amount_hs + 贷方: amount_sy1 + 借贷平衡: balamt);
                    log.debug('借方金额', amount_t);
                    log.debug('贷方金额', amount_hs);
                    log.debug('贷方金额', amount_sy1);
                    log.debug('借贷平衡', balamt);
                    id1 = jeRec.save();
                }
                if (type == '2' && sub_type == '2') {
                    jeRec.setValue({fieldId: 'subsidiary', value: subsidiary});
                    jeRec.setValue({fieldId: 'postingperiod', value: acObj.nowPostingperiod});
                    //jeRec.setValue({ fieldId : 'trandate', value : acObj.nowTrandate });
                    jeRec.setValue({fieldId: 'currency', value: currency_t});
                    jeRec.setValue({fieldId: 'trandate', value: date});
                    jeRec.setValue({fieldId: 'custbody_hg_create_from_gh', value: ghd});
                    jeRec.setValue({fieldId: 'approvalstatus', value: '2'}); //已核准
                    //借方明细行
                    jeRec.setSublistValue({sublistId: 'line', fieldId: 'account', value: account_t, line: 0});//借方科目
                    jeRec.setSublistValue({sublistId: 'line', fieldId: 'debit', value: amount_t, line: 0});//借方金额
                    //jeRec.setSublistValue({ sublistId: 'line', fieldId : 'custcol_cseg_cn_cfi', value : '7' , line : 0});
                    jeRec.setSublistValue({sublistId: 'line', fieldId: 'account', value: account_hd, line: 1});
                    jeRec.setSublistValue({sublistId: 'line', fieldId: 'debit', value: amount_sy2, line: 1});
                    //2021-01-21 Conan反馈汇兑科目现金流有误，借方7，贷方3
                    if (amount_sy2 > 0) {
                        jeRec.setSublistValue({sublistId: 'line', fieldId: 'custcol_cseg_cn_cfi', value: '7', line: 1});
                    } else {
                        jeRec.setSublistValue({sublistId: 'line', fieldId: 'custcol_cseg_cn_cfi', value: '3', line: 1});
                    }
                    //贷方明细行
                    jeRec.setSublistValue({sublistId: 'line', fieldId: 'account', value: account_f, line: 2});
                    jeRec.setSublistValue({sublistId: 'line', fieldId: 'credit', value: amount_hs, line: 2});
                    var balamt = Number(amount_t) - Number(amount_sy2) - Number(amount_hs);
                    //log.debug('本位币不一致发生汇损数据',借方: amount_t + 贷方: amount_sy2 + 贷方: amount_hs + 借贷平衡: balamt);
                    log.debug('借方金额', amount_t);
                    log.debug('贷方金额', amount_sy2);
                    log.debug('贷方金额', amount_hs);
                    log.debug('借贷平衡', balamt);
                    id1 = jeRec.save();
                }
                if (type == '3' && sub_type == '1') {

                    jeRec.setValue({fieldId: 'subsidiary', value: subsidiary});
                    jeRec.setValue({fieldId: 'postingperiod', value: acObj.nowPostingperiod});
                    //jeRec.setValue({ fieldId : 'trandate', value : acObj.nowTrandate });
                    jeRec.setValue({fieldId: 'currency', value: currency_f});//币种取购进币种
                    jeRec.setValue({fieldId: 'trandate', value: date});
                    jeRec.setValue({fieldId: 'custbody_hg_create_from_gh', value: ghd});
                    jeRec.setValue({fieldId: 'approvalstatus', value: '2'}); //已核准
                    //借方明细行
                    jeRec.setSublistValue({sublistId: 'line', fieldId: 'account', value: account_t, line: 0});//借方科目
                    jeRec.setSublistValue({sublistId: 'line', fieldId: 'debit', value: amount_hs, line: 0});//借方金额取换算本位币金额
                    //jeRec.setSublistValue({ sublistId: 'line', fieldId : 'custcol_cseg_cn_cfi', value : '4' , line : 0});
                    //贷方明细行
                    jeRec.setSublistValue({sublistId: 'line', fieldId: 'account', value: account_f, line: 1});//贷方科目取自科目
                    jeRec.setSublistValue({sublistId: 'line', fieldId: 'credit', value: amount_f, line: 1});//金额取支付金额
                    jeRec.setSublistValue({sublistId: 'line', fieldId: 'account', value: account_hd, line: 2});//取汇兑损益科目
                    jeRec.setSublistValue({sublistId: 'line', fieldId: 'credit', value: amount_sy3, line: 2});//取汇损金额
                    //2021-01-21 Conan反馈汇兑科目现金流有误，借方7，贷方3
                    if (amount_sy3 > 0) {
                        jeRec.setSublistValue({sublistId: 'line', fieldId: 'custcol_cseg_cn_cfi', value: '3', line: 2});
                    } else {
                        jeRec.setSublistValue({sublistId: 'line', fieldId: 'custcol_cseg_cn_cfi', value: '7', line: 2});
                    }
                    var balamt = Number(amount_hs) - Number(amount_f) - Number(amount_sy3);
                    //log.debug('本位币不一致发生汇益数据',借方: amount_hs + 贷方: amount_f + 贷方: amount_sy3 +借贷平衡: balamt);
                    log.debug('借贷平衡', balamt);
                    id1 = jeRec.save();
                }
                if (type == '3' && sub_type == '2') {
                    jeRec.setValue({fieldId: 'subsidiary', value: subsidiary});
                    jeRec.setValue({fieldId: 'postingperiod', value: acObj.nowPostingperiod});
                    //jeRec.setValue({ fieldId : 'trandate', value : acObj.nowTrandate });
                    jeRec.setValue({fieldId: 'currency', value: currency_f});//币种取购进币种
                    jeRec.setValue({fieldId: 'trandate', value: date});
                    jeRec.setValue({fieldId: 'custbody_hg_create_from_gh', value: ghd});
                    jeRec.setValue({fieldId: 'approvalstatus', value: '2'}); //已核准
                    //借方明细行
                    jeRec.setSublistValue({sublistId: 'line', fieldId: 'account', value: account_t, line: 0});//借方科目
                    jeRec.setSublistValue({sublistId: 'line', fieldId: 'debit', value: amount_hs, line: 0});//借方金额取换算本位币金额
                    //jeRec.setSublistValue({ sublistId: 'line', fieldId : 'custcol_cseg_cn_cfi', value : '4' , line : 0});
                    jeRec.setSublistValue({sublistId: 'line', fieldId: 'account', value: account_hd, line: 1});//取汇兑科目
                    jeRec.setSublistValue({sublistId: 'line', fieldId: 'debit', value: amount_sy4, line: 1});//取汇损金额
                    //2021-01-21 Conan反馈汇兑科目现金流有误，借方7，贷方3
                    if (amount_sy4 > 0) {
                        jeRec.setSublistValue({sublistId: 'line', fieldId: 'custcol_cseg_cn_cfi', value: '7', line: 1});
                    } else {
                        jeRec.setSublistValue({sublistId: 'line', fieldId: 'custcol_cseg_cn_cfi', value: '3', line: 1});
                    }
                    //贷方明细行
                    jeRec.setSublistValue({sublistId: 'line', fieldId: 'account', value: account_f, line: 2});//取自科目
                    jeRec.setSublistValue({sublistId: 'line', fieldId: 'credit', value: amount_f, line: 2});//取支付金额
                    var balamt = Number(amount_f) - Number(amount_hs) - Number(amount_sy4);
                    log.debug('本位币不一致发生汇损数据', '借方: ' + amount_hs + '借方:' + amount_sy4 + '贷方:' + amount_f + '借贷平衡:' + balamt);
                    log.debug('借贷平衡', balamt);
                    id1 = jeRec.save();
                }
                if (type == '1' && sub_type == '1') {
                    //创建支付日记账
                    jeRec.setValue({fieldId: 'subsidiary', value: subsidiary});
                    jeRec.setValue({fieldId: 'postingperiod', value: acObj.nowPostingperiod});
                    //jeRec.setValue({ fieldId : 'trandate', value : acObj.nowTrandate });
                    jeRec.setValue({fieldId: 'currency', value: currency_f});//币种取自币种
                    jeRec.setValue({fieldId: 'trandate', value: date});
                    jeRec.setValue({fieldId: 'custbody_hg_create_from_gh', value: ghd});
                    jeRec.setValue({fieldId: 'approvalstatus', value: '2'}); //已核准
                    //借方明细行
                    jeRec.setSublistValue({sublistId: 'line', fieldId: 'account', value: account_f, line: 0});//借方科目
                    jeRec.setSublistValue({sublistId: 'line', fieldId: 'credit', value: amount_f, line: 0});//借方金额取支付金额
                    //jeRec.setSublistValue({ sublistId: 'line', fieldId : 'custcol_cseg_cn_cfi', value : '4' , line : 0});
                    //贷方明细行
                    jeRec.setSublistValue({sublistId: 'line', fieldId: 'account', value: '125', line: 1});//贷方科目取固定值：Undeposit
                    jeRec.setSublistValue({sublistId: 'line', fieldId: 'debit', value: amount_f, line: 1});//金额取支付金额
                    //2020-09-23 Conan 去掉1903科目现金流
                    //jeRec.setSublistValue({ sublistId: 'line', fieldId : 'custcol_cseg_cn_cfi', value : '7', line : 1});
                    //log.debug('本位币不一致发生汇益数据-支付日记账',借方: amount_f + 贷方: amount_f );
                    id1 = jeRec.save();
                    //创建购进日记账
                    var jeRec2 = record.create({type: 'journalentry'});
                    jeRec2.setValue({fieldId: 'subsidiary', value: subsidiary});
                    jeRec2.setValue({fieldId: 'postingperiod', value: acObj.nowPostingperiod});
                    //jeRec2.setValue({ fieldId : 'trandate', value : acObj.nowTrandate });
                    jeRec2.setValue({fieldId: 'trandate', value: date});
                    jeRec2.setValue({fieldId: 'custbody_hg_create_from_gh', value: ghd});
                    jeRec2.setValue({fieldId: 'currency', value: currency_t});//币种取至币种
                    jeRec2.setValue({fieldId: 'approvalstatus', value: '2'}); //已核准
                    //借方明细行
                    jeRec2.setSublistValue({sublistId: 'line', fieldId: 'account', value: account_t, line: 0});//借方科目
                    jeRec2.setSublistValue({sublistId: 'line', fieldId: 'debit', value: amount_t, line: 0});//借方金额取购进金额
                    //jeRec2.setSublistValue({ sublistId: 'line', fieldId : 'custcol_cseg_cn_cfi', value : '4' , line : 0});
                    //贷方明细行
                    jeRec2.setSublistValue({sublistId: 'line', fieldId: 'account', value: '125', line: 1});//贷方科目取固定科目中转科目
                    jeRec2.setSublistValue({sublistId: 'line', fieldId: 'credit', value: amount_tz, line: 1});//金额取中转科目（至）
                    jeRec2.setSublistValue({sublistId: 'line', fieldId: 'account', value: account_hd, line: 2});//取汇兑损益科目
                    jeRec2.setSublistValue({sublistId: 'line', fieldId: 'credit', value: amount_sy5, line: 2});//取汇损金额
                    //2021-01-21 Conan反馈汇兑科目现金流有误，借方7，贷方3
                    if (amount_sy5 > 0) {
                        jeRec2.setSublistValue({sublistId: 'line', fieldId: 'custcol_cseg_cn_cfi', value: '3', line: 2});
                    } else {
                        jeRec2.setSublistValue({sublistId: 'line', fieldId: 'custcol_cseg_cn_cfi', value: '7', line: 2});
                    }
                    //2020-09-23 Conan 去掉1903科目现金流
                    //jeRec2.setSublistValue({ sublistId: 'line', fieldId : 'custcol_cseg_cn_cfi', value : '3', line : 1});
                    var balamt = Number(amount_t) - Number(amount_tz) - Number(amount_sy5);
                    //log.debug('本位币不一致发生汇益数据-购进日记账',借方: amount_t + 贷方: amount_tz + 贷方: amount_sy5 + 借贷平衡: balamt);
                    log.debug('借贷平衡', balamt);
                    id2 = jeRec2.save();
                }
                if (type == '1' && sub_type == '2') {
                    //创建支付日记账
                    jeRec.setValue({fieldId: 'subsidiary', value: subsidiary});
                    jeRec.setValue({fieldId: 'postingperiod', value: acObj.nowPostingperiod});
                    //jeRec.setValue({ fieldId : 'trandate', value : acObj.nowTrandate });
                    jeRec.setValue({fieldId: 'trandate', value: date});
                    jeRec.setValue({fieldId: 'custbody_hg_create_from_gh', value: ghd});
                    jeRec.setValue({fieldId: 'currency', value: currency_f});//币种取自币种
                    jeRec.setValue({fieldId: 'approvalstatus', value: '2'}); //已核准
                    //借方明细行
                    jeRec.setSublistValue({sublistId: 'line', fieldId: 'account', value: account_f, line: 0});//借方科目
                    jeRec.setSublistValue({sublistId: 'line', fieldId: 'credit', value: amount_f, line: 0});//借方金额取支付金额
                    //jeRec.setSublistValue({ sublistId: 'line', fieldId : 'custcol_cseg_cn_cfi', value : '4' , line : 0});
                    //贷方明细行
                    jeRec.setSublistValue({sublistId: 'line', fieldId: 'account', value: '125', line: 1});//贷方科目取固定值：Undeposit
                    jeRec.setSublistValue({sublistId: 'line', fieldId: 'debit', value: amount_f, line: 1});//金额取支付金额
                    //2020-09-23 Conan 去掉1903科目现金流
                    //jeRec.setSublistValue({ sublistId: 'line', fieldId : 'custcol_cseg_cn_cfi', value : '7', line : 1});
                    log.debug('本位币不一致发生汇损数据-支付日记账，借方金额：贷方金额', amount_f + ':' + amount_f);
                    id1 = jeRec.save();
                    //创建购进日记账
                    var jeRec2 = record.create({type: 'journalentry'});
                    jeRec2.setValue({fieldId: 'subsidiary', value: subsidiary});
                    jeRec2.setValue({fieldId: 'postingperiod', value: acObj.nowPostingperiod});
                    //jeRec2.setValue({ fieldId : 'trandate', value : acObj.nowTrandate });
                    jeRec2.setValue({fieldId: 'trandate', value: date});
                    jeRec2.setValue({fieldId: 'custbody_hg_create_from_gh', value: ghd});
                    jeRec2.setValue({fieldId: 'currency', value: currency_t});//币种取至币种
                    jeRec2.setValue({fieldId: 'approvalstatus', value: '2'}); //已核准
                    //借方明细行
                    jeRec2.setSublistValue({sublistId: 'line', fieldId: 'account', value: account_t, line: 0});//借方科目
                    jeRec2.setSublistValue({sublistId: 'line', fieldId: 'debit', value: amount_t, line: 0});//借方金额取购进金额
                    jeRec2.setSublistValue({sublistId: 'line', fieldId: 'account', value: account_hd, line: 1});//取汇兑损益科目
                    jeRec2.setSublistValue({sublistId: 'line', fieldId: 'debit', value: amount_sy6, line: 1});//取汇损金额
                    //2021-01-21 Conan反馈汇兑科目现金流有误，借方7，贷方3
                    if (amount_sy6 > 0) {
                        jeRec2.setSublistValue({sublistId: 'line', fieldId: 'custcol_cseg_cn_cfi', value: '7', line: 1});
                    } else {
                        jeRec2.setSublistValue({sublistId: 'line', fieldId: 'custcol_cseg_cn_cfi', value: '3', line: 1});
                    }
                    //jeRec2.setSublistValue({ sublistId: 'line', fieldId : 'custcol_cseg_cn_cfi', value : '4' , line : 0});
                    //贷方明细行
                    jeRec2.setSublistValue({sublistId: 'line', fieldId: 'account', value: '125', line: 2});//贷方科目取固定科目中转科目
                    jeRec2.setSublistValue({sublistId: 'line', fieldId: 'credit', value: amount_tz, line: 2});//金额取中转科目（至）
                    //2020-09-23 Conan 去掉1903科目现金流
                    //jeRec2.setSublistValue({ sublistId: 'line', fieldId : 'custcol_cseg_cn_cfi', value : '3', line : 2});
                    var balamt = Number(amount_t) + Number(amount_sy6) - Number(amount_tz);
                    log.debug('本位币不一致发生汇损数据-购进日记账，借方1：借方2：贷方', amount_t + ':' + amount_sy6 + ':' + amount_tz);
                    log.debug('借贷平衡', balamt);

                    id2 = jeRec2.save();
                }
            }
            var rtnObj = {};
            rtnObj.id1 = id1;
            rtnObj.id2 = id2;
            return rtnObj;
        }

        function keep7decimal(num) {
            return Math.round(num * 10000000) / 10000000;
        }

        function keep4decimal(num) {
            return Math.round(num * 10000) / 10000;
        }

        function keep2decimal(num) {
            return Math.round(num * 100) / 100;
        }

        function dealRateFix(tarVal, rate) {
            if (isNaN(tarVal)) {
                return  tarVal;
            }
            tarVal = Number(tarVal);
            if (isNaN(rate)) {
                tarVal = tarVal.toFixed(2);
            } else {
                rate = Number(rate);
                if (rate < 0.01) {
                    tarVal = tarVal.toFixed(0);
                } else {
                    tarVal = tarVal.toFixed(2);
                }
            }
            return tarVal;
        }

        return {
            //beforeLoad: beforeLoad,
            //beforeSubmit: beforeSubmit,
            afterSubmit: afterSubmit
        };
    });
