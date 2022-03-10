/**
 * Module Description
 * 已开增值税发票的账单生成新日记账
 */
 function customizeGlImpact(transactionRecord, standardLines, customLines, book){
    var accountList = [];
    var accountListOne = [];
    var accountListTwo = [];
    var count = standardLines.getCount();
    nlapiLogExecution("DEBUG", "count", count);
    var recordType = transactionRecord.getRecordType();
    var recordId = transactionRecord.getId();
    var trandate = transactionRecord.getFieldValue('trandate');//创建日期 todo:首选项可能日期格式不一样
    var matchJournal = transactionRecord.getFieldValue('custbodycustbody_444');//关联日记账
    var entity = transactionRecord.getFieldValue('entity');//供应商
    nlapiLogExecution('debug','matchJournal',matchJournal);
    if(recordId && (matchJournal == '' || matchJournal == null)){
        var isVatInvoice = transactionRecord.getFieldValue('custbody_vatinvoice');//是否开具增值税发票
        nlapiLogExecution('debug','是否曾值税',isVatInvoice);
        if(isVatInvoice == "T"){
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
                nlapiLogExecution('debug','account',accountId);
                if(accountId != null){
                    // if(memo != 'VAT'){
                        if(debitAmount > 0 || creditAmount > 0){
                            accountList.push({'accountId':accountId,'creditAmount':creditAmount,'debitAmount':debitAmount,'entityId':entityId,'subsidiaryId':subsidiaryId,'locationId':locationId,'memo':memo,'entity':entity});
                        }
                    // }
                }
            }
            nlapiLogExecution('debug','accountList',JSON.stringify(accountList));
            if(accountList.length > 0){
                var journalId = createJournal(accountList,recordType,recordId,trandate);
                nlapiLogExecution('debug','journalid',journalId);
                if(journalId.length > 0){
                    nlapiSubmitField(transactionRecord.getRecordType(),transactionRecord.getId(),'custbodycustbody_444',journalId);//来源单据，多项选择
                }
            }
        }
    }
}
function createJournal(accountList,recordType,recordId,trandate){
    var journalRec = nlapiCreateRecord('journalentry');
    journalRec.setFieldValue('approvalstatus',2);//已核准：2
    journalRec.setFieldValue('custbodycustbody_444',recordId);
    journalRec.setFieldValue('subsidiary',accountList[0].subsidiaryId);
    journalRec.setFieldValue('trandate',trandate);//创建日期 todo
    var drAmount = Number(0);
    var crAmount = Number(0);
    var eliminateFlag = 'No';
    //创建借方
    for(var j = 0;j < accountList.length;j++){
        journalRec.selectNewLineItem('line');
        if(accountList[j].entityId != 522 && accountList[j].entityId != 844){ //todo: 	Default Tax Agency CN : Default Tax Agency CN (12 - 深圳聪石) (20210509-073241)此实体无法赋值 或者 Default Tax Agency CN : Default Tax Agency CN (18 - 长沙聪石科技有限公司) (20210625-110752)
            journalRec.setCurrentLineItemValue('line','entity',accountList[j].entityId);
        }
        if(accountList[j].debitAmount > 0){
            nlapiLogExecution('debug','debitamount',accountList[j].debitAmount);
            // if(accountList[j].accountId == 1076){  //TODO:测试
            if(accountList[j].accountId == 854){//TODO：正式
                //待开进项税额 改成 出口退税
                // journalRec.setCurrentLineItemValue('line', 'account', 1079);//TODO:test
                journalRec.setCurrentLineItemValue('line', 'account', 857);//TODO：product
            }else {
                journalRec.setCurrentLineItemValue('line', 'account', accountList[j].accountId);
                // journalRec.setCurrentLineItemValue('line', 'entity',accountList[j].entity);
            }
            journalRec.setCurrentLineItemValue('line', 'debit', accountList[j].debitAmount);
            drAmount += Number(accountList[j].debitAmount);
        }else if(accountList[j].creditAmount > 0){
            nlapiLogExecution('debug','creditamount',accountList[j].creditAmount);
            if(accountList[j].accountId == 854){//TODO：正式
                //待开进项税额 改成 出口退税
                // journalRec.setCurrentLineItemValue('line', 'account', 1079);
                journalRec.setCurrentLineItemValue('line', 'account', 857);//TODO：product
            }else {
                journalRec.setCurrentLineItemValue('line', 'account', accountList[j].accountId);
                // journalRec.setCurrentLineItemValue('line', 'entity',accountList[j].entity);
            }
            journalRec.setCurrentLineItemValue('line', 'debit', accountList[j].creditAmount);
            drAmount += Number(accountList[j].creditAmount);
        }
        if(accountList[j].accountId == '112'){ //应付款项:暂估
            journalRec.setCurrentLineItemValue('line','entity',accountList[j].entity);
        }
        if(accountList[j].entityId){
            // journalRec.setCurrentLineItemValue('line','eliminate','T');  //抵消
            // eliminateFlag = 'Yes';
        }
        journalRec.setCurrentLineItemValue('line','memo',accountList[j].memo);
        journalRec.setCurrentLineItemValue('line','location',accountList[j].locationId);
        journalRec.commitLineItem('line');
    }
    nlapiLogExecution('debug','抵消借方标记',eliminateFlag);
    //创建贷方
    for(var m = 0;m < accountList.length;m++){
        journalRec.selectNewLineItem('line');
        if(accountList[m].entityId != 522 && accountList[m].entityId != 844){
            journalRec.setCurrentLineItemValue('line','entity',accountList[m].entityId);
        }
        if(accountList[m].debitAmount > 0){
            nlapiLogExecution('debug','debitamount',accountList[m].debitAmount);
            journalRec.setCurrentLineItemValue('line', 'account', accountList[m].accountId);
            journalRec.setCurrentLineItemValue('line', 'credit', accountList[m].debitAmount);
            crAmount += Number(accountList[m].debitAmount);
        }else if(accountList[m].creditAmount > 0){
            nlapiLogExecution('debug','creditamount',accountList[m].creditAmount);
            journalRec.setCurrentLineItemValue('line', 'account', accountList[m].accountId);
            journalRec.setCurrentLineItemValue('line','credit',accountList[m].creditAmount);
            crAmount += Number(accountList[m].creditAmount);
        }
        if(accountList[m].accountId == '112'){ //应付款项:暂估
            journalRec.setCurrentLineItemValue('line','entity',accountList[m].entity);
        }
        // if(accountList[m].entityId && eliminateFlag == 'No'){
        //     journalRec.setCurrentLineItemValue('line','eliminate','T');  //抵消
        // }
        journalRec.setCurrentLineItemValue('line','memo',accountList[m].memo);
        journalRec.setCurrentLineItemValue('line','location',accountList[m].locationId);
        journalRec.commitLineItem('line');
    }
    nlapiLogExecution('debug','out',drAmount + '---cr:' + crAmount);
    var recId = nlapiSubmitRecord(journalRec);
    return recId;
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