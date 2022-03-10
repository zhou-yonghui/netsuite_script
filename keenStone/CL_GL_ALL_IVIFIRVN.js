/**
 * Module Description
 * 对内部交易订单关联的发票、货品实施、账单和货品收据的总账影响
 */
 function customizeGlImpact(transactionRecord, standardLines, customLines, book){
    var accountList = [];
    var accountListOne = [];
    var accountListTwo = [];
    var count = standardLines.getCount();
    nlapiLogExecution("DEBUG", "count", count);
    var recordType = transactionRecord.getRecordType();
    var recordId = transactionRecord.getId();
    nlapiLogExecution('debug','recordId',recordId);
    if(recordId){
        var matchRecord = transactionRecord.getFieldValue('custbody_444');
        nlapiLogExecution('debug','单据关联日记账字段',matchRecord);
        var flag = 0;
        var id;
        var status;
        var taxStatus;
        var text;
        if(matchRecord == '' || matchRecord == null){
            if(recordType == 'itemreceipt'){
                id = transactionRecord.getFieldValue('createdfrom');
                text = transactionRecord.getFieldText('createfrom');
                nlapiLogExecution('创建自',text);
                if(text.indexOf('PO') != -1){
                    status = nlapiLoadRecord('purchaseorder',id).getFieldValue('intercostatus');//todo:来源po才可
                    nlapiLogExecution('debug','货品收据',status);
                    if(status == 2){
                        flag = 1;
                    }
                }
            }
            else if(recordType == 'vendorbill'){
                var ven = transactionRecord.getFieldValue('entity');
                nlapiLogExecution('debug','账单');
                var n = vendorBiao(ven);
                if(n == 1){
                    flag = 1;
                }
            }
            else if(recordType == 'itemfulfillment' || recordType == 'invoice'){
                id = transactionRecord.getFieldValue('createdfrom');
                status = nlapiLoadRecord('salesorder',id).getFieldValue('intercostatus');
                nlapiLogExecution('debug','status 货品实施 发票',status);
                if(status == 2){
                    flag = 1;
                }
            }
            nlapiLogExecution('debug','flag',flag);
            if(flag == 1){
                var vendorName = Number(transactionRecord.getFieldValue('custbody_wuliu'));//名称 , 货品收据上的字段
                var entity = transactionRecord.getFieldValue('entity');//
                var subsidiary = transactionRecord.getFieldValue('subsidiary');//附属公司
                var basicCurr = transactionRecord.getFieldText('currency');//币种
                var currency = transactionRecord.getFieldText('custbody_internalcurrency');//内部交易币种
                var soId = transactionRecord.getFieldValue('createdfrom');//货品实施来源单据
                var trandate = transactionRecord.getFieldValue('trandate');//创建日期 todo:首选项可能日期格式不一样
                nlapiLogExecution('debug','trandate',trandate);
                // nlapiLogExecution('DEBUG','当前记录字段','vendor:'+vendorName + '---sub:' + subsidiary + '===curr:' + currency + '---basiccurr:' + basicCurr + '---entity:' + entity);
                /**内部交易货币和货币不同时要将总账影响对冲并生成日记账*/
                if(currency != basicCurr){
                    for(var i = 0;i < count;i++){
                        var currLine = standardLines.getLine(i);
                        var accountId = currLine.getAccountId();
                        var creditAmount = currLine.getCreditAmount();
                        var debitAmount = currLine.getDebitAmount();
                        var entityId = currLine.getEntityId();
                        var locationId = currLine.getLocationId();
                        var memo = currLine.getMemo();
                        var subsidiaryId = currLine.getSubsidiaryId();
                        var isTaxable = currLine.isTaxable();//是否过账
                        // nlapiLogExecution('DEBUG','data','account:'+accountId + '===credit:' + creditAmount + '----debitAmount:' + debitAmount + '===entity:' + entityId + '====locationId:' + locationId + '---memo:' + memo + '---subsidiaryId:' + subsidiaryId + '---isTaxable:' + isTaxable);
                        if(accountId != null){
                            if(memo != 'VAT'){
                                // nlapiLogExecution('debug','dr cr',debitAmount + '--' + creditAmount + '---' + typeof (debitAmount));
                                if(debitAmount > 0 || creditAmount > 0){
                                    accountList.push({'accountId':accountId,'creditAmount':creditAmount,'debitAmount':debitAmount,'entityId':entityId,'subsidiaryId':subsidiaryId,'locationId':locationId,'memo':memo});
                                }
                                /**方案一：反冲科目在总账影响上处理
                                 * 添加新的行*/
                                // var newLine = customLines.addNewLine();
                                // newLine.setAccountId(accountId);
                                // if(debitAmount > 0){
                                //     newLine.setCreditAmount(debitAmount);
                                // }
                                // if(creditAmount > 0){
                                //     newLine.setDebitAmount(creditAmount);
                                // }
                                // if(subsidiaryId){
                                //     newLine.setSubsidiaryId(subsidiaryId);
                                // }
                                // if(entityId != null){
                                //     newLine.setEntityId(entityId);
                                // }
                                // newLine.setLocationId(locationId);          //货品实施会因为仓库报错，因为无法赋值子公司，子公司和仓库相关联
                                //     newLine.setMemo(memo);
                            }
                            if(isTaxable == true){
                                taxStatus = isTaxable;
                            }
                        }
                    }
                    nlapiLogExecution('debug','是否过账',taxStatus);
                    nlapiLogExecution('debug','accountlist',JSON.stringify(accountList));
                    if(matchRecord == '' || matchRecord == null){
                        /**货品实施单总账影响上可能出现两个不同子公司如果有则需要分开生成日记账*/
                        if(accountList.length > 0){
                            for(var m = 0;m < accountList.length;m++){
                                if(accountList[0].subsidiaryId == accountList[m].subsidiaryId){
                                    accountListOne.push(accountList[m]);
                                }
                                else {
                                    accountListTwo.push(accountList[m]);
                                }
                            }
                        }
                        // nlapiLogExecution('debug','accountlistOne',JSON.stringify(accountListOne));
                        // nlapiLogExecution('debug','accountlistTwo',JSON.stringify(accountListTwo));
                        /**方案二：直接生成反冲的日记账*/
                            // basicCurr = 'USD';//TODO:测试用币种USD
                            // currency = 'GBP';// TODO:测试用内部交易币种GBP
                        var journalId;
                        var journalIdChange;
                        var journalIdArr = [];
                        var index = ['fan','change'];
                        if(accountListOne.length > 0){
                            for(var k = 0;k < index.length;k++){
                                journalId = createJournal(accountListOne,recordType,subsidiary,currency,basicCurr,vendorName,entity,soId,recordId,trandate,index[k]);
                                journalIdArr.push(journalId);
                            }
                        }
                        if(accountListTwo.length > 0){
                            for(var c = 0;c < index.length;c++){
                                journalId = createJournal(accountListTwo,recordType,subsidiary,currency,basicCurr,vendorName,entity,soId,recordId,trandate,index[c]);
                                journalIdArr.push(journalId);
                            }
                        }
                        nlapiLogExecution('debug','日记账id',journalIdArr);
                        /**回写记录*/
                        if(journalIdArr.length > 0){
                            nlapiSubmitField(transactionRecord.getRecordType(),transactionRecord.getId(),'custbody_444',journalIdArr);//来源单据，多项选择
                        }
                    }
                }
            }
        }
    }
}
function createJournal(accountList,recordType,subsidiary,currency,basicCurr,vendorName,entity,soId,recordId,trandate,index){
    nlapiLogExecution('debug','创建日记账','subsidiary:' + subsidiary + '---bascurr:' + basicCurr + '---recordType:' + recordType + '---currency:' + currency + '---vendorName:' + vendorName + '---entity:' + entity + '---soId:' + soId + '---recordId:' + recordId + '---index:' + index);
    var venSub;
    var cusSub;
    var journalRec = nlapiCreateRecord('journalentry');
    journalRec.setFieldValue('custbody_444',recordId);
    journalRec.setFieldValue('approvalstatus',2);//已核准：2
    journalRec.setFieldValue('trandate',trandate);//创建日期 todo
    if(recordType == 'itemfulfillment' && soId){
        // var sub = nlapiLoadRecord('salesorder',soId).getFieldValue('subsidiary');
        basicCurr = nlapiLoadRecord('salesorder',soId).getFieldText('currency');//货品实施单上没有原币种，需要从so单获取
        // nlapiLogExecution('debug','so currency',basicCurr);
        /**总账影响上金额对应的子公司*/
        journalRec.setFieldValue('subsidiary',accountList[0].subsidiaryId);
    }
    else {
        journalRec.setFieldValue('subsidiary',subsidiary);
    }
    if(currency || basicCurr){
        if(index == 'fan'){
            journalRec.setFieldText('currency',basicCurr);
        }
        else {
            journalRec.setFieldText('currency',currency);
        }
    }
    if(recordType == 'vendorbill'){
        venSub = nlapiLoadRecord('vendor',entity).getFieldValue('representingsubsidiary');//代表附属公司
        journalRec.setFieldValue('tosubsidiary',venSub);
    }
    else if(recordType == 'invoice'){
        cusSub = nlapiLoadRecord('customer',entity).getFieldValue('representingsubsidiary');//代表附属公司
        journalRec.setFieldValue('tosubsidiary',cusSub);
    }
    if(accountList.length > 0 && basicCurr != null){
        // nlapiLogExecution('debug','日记账行赋值',accountList.length);
        var debitChangAmount = Number(0);
        var creditChangeAmount = Number(0);
        for(var j = 0;j < accountList.length;j++){
            // nlapiLogExecution('debug','list',JSON.stringify(accountList[j]));
            journalRec.selectNewLineItem('line');
            journalRec.setCurrentLineItemValue('line', 'account', accountList[j].accountId);
            if(index == 'fan'){
                nlapiLogExecution('debug','subsi',accountList[0].subsidiaryId);
                var subCurrency = getSubsidiary(accountList[0].subsidiaryId);//获取子公司币种
                // nlapiLogExecution('debug','subCurr',subCurrency);
                var rate = nlapiExchangeRate(subCurrency, basicCurr,'8/7/2021');//todo:测试时间,
                // nlapiLogExecution('debug','rate fan',rate);

                if(j < accountList.length - 1){
                    var debit = (accountList[j].debitAmount * rate).toFixed(2);
                    var credit = (accountList[j].creditAmount * rate).toFixed(2);
                    debitChangAmount += Number(debit);
                    creditChangeAmount += Number(credit);
                    // nlapiLogExecution('debug','fan 转换汇率后的借贷方总金额',debitChangAmount + '---' + creditChangeAmount);
                    if(accountList[j].debitAmount > 0){
                        journalRec.setCurrentLineItemValue('line', 'credit', debit);
                    }
                    if(accountList[j].creditAmount > 0){
                        journalRec.setCurrentLineItemValue('line', 'debit', credit);
                    }
                }
                else if(accountList.length - 1 == j && accountList[j].debitAmount > 0){
                    // nlapiLogExecution('debug','剩余借记金额',(creditChangeAmount - debitChangAmount).toFixed(2));
                    journalRec.setCurrentLineItemValue('line', 'credit', (creditChangeAmount - debitChangAmount).toFixed(2));
                }
                else if(accountList.length - 1 == j && accountList[j].creditAmount > 0){
                    // nlapiLogExecution('debug','剩余贷记金额',(debitChangAmount - creditChangeAmount).toFixed(2));
                    journalRec.setCurrentLineItemValue('line', 'debit', (debitChangAmount - creditChangeAmount).toFixed(2));
                }


                // if(accountList[j].debitAmount > 0){
                //     nlapiLogExecution('debug','fan debitAmount',accountList[j].debitAmount);
                //     journalRec.setCurrentLineItemValue('line', 'credit', accountList[j].debitAmount);
                // }
                // if(accountList[j].creditAmount > 0){
                //     journalRec.setCurrentLineItemValue('line', 'debit', accountList[j].creditAmount);
                // }
            }
            else if(index == 'change'){
                var rate = nlapiExchangeRate(currency, basicCurr,'8/7/2021');//todo:测试时间
                nlapiLogExecution('debug','rate change',rate);

                if(j < accountList.length - 1){
                    var debit = (accountList[j].debitAmount / rate).toFixed(2);
                    var credit = (accountList[j].creditAmount / rate).toFixed(2);
                    debitChangAmount += Number(debit);
                    creditChangeAmount += Number(credit);
                    // nlapiLogExecution('debug','change 转换汇率后的借贷方总金额',debitChangAmount + '---' + creditChangeAmount);
                    if(accountList[j].debitAmount > 0){
                        journalRec.setCurrentLineItemValue('line', 'debit', debit);
                    }
                    if(accountList[j].creditAmount > 0){
                        journalRec.setCurrentLineItemValue('line', 'credit', credit);
                    }
                }
                else if(accountList.length - 1 == j && accountList[j].debitAmount > 0){
                    // nlapiLogExecution('debug','剩余借记金额',(creditChangeAmount - debitChangAmount).toFixed(2));
                    journalRec.setCurrentLineItemValue('line', 'debit', (creditChangeAmount - debitChangAmount).toFixed(2));
                }
                else if(accountList.length - 1 == j && accountList[j].creditAmount > 0){
                    // nlapiLogExecution('debug','剩余贷记金额',(debitChangAmount - creditChangeAmount).toFixed(2));
                    journalRec.setCurrentLineItemValue('line', 'credit', (debitChangAmount - creditChangeAmount).toFixed(2));
                }
            }
            if(accountList[j].entityId != null){
                if(recordType != 'itemfulfillment'){
                    journalRec.setCurrentLineItemValue('line','entity',accountList[j].entityId);        //todo:货品实施赋值报错，其他未测
                }
                if(recordType == 'invoice' || recordType == 'vendorbill'){
                    journalRec.setCurrentLineItemValue('line','eliminate','T');  //抵消
                }
            }
            // journalRec.setCurrentLineItemValue('line','location',accountList[j].locationId);
            journalRec.setCurrentLineItemValue('line','memo',accountList[j].memo);
            journalRec.commitLineItem('line');
        }
        nlapiLogExecution('debug','out');
        var recId = nlapiSubmitRecord(journalRec);
        return recId;
    }
}
function getSubsidiary(id){
    var filters = new Array();
    filters[0] = new nlobjSearchFilter('internalid',null,'is',id);
    var columns = new Array();
    columns[0] = new nlobjSearchColumn('currency');
    var mysearch = nlapiCreateSearch('subsidiary',filters,columns);
    var resultSet = mysearch.runSearch();
    var sum;
    resultSet.forEachResult(function(searchResult) {
        sum = searchResult.getText('currency');
        return true;
    });
    return sum;
}
function vendorBiao(vendor){
    var flag = 0;
    var list = ['857','860','861','855','856'];
    for(var i = 0;i < list.length;i++){
        if(list[i] == vendor){
            flag = 1
        }
    }
    return flag;
}