/**
 * 制作日记账分录时，当日记账里有银行类科目时，非银行类的科目需要根据科目自动带出对应的现金流量表项目
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
            if(context.type == 'create'){
                var rec = record.load({
                    type:'journalentry',
                    id:context.newRecord.id,
                    isDynamic:true,
                });
                var change_flag = 'no';
                var account;
                var account_info;
                var count = rec.getLineCount('line');
                for(var i = 0;i < count;i++){
                    rec.selectLine('line',i);
                    account = rec.getCurrentSublistValue({
                        sublistId:'line',
                        fieldId:'account',
                    });
                    account_info = getAccount(account);
                    log.debug('check account_info',account_info);
                    if(account_info.flag == 'bank'){
                        change_flag = 'yes';
                    }
                }
                log.debug('change_flag',change_flag);
                if(change_flag == 'yes'){
                    for(var j = 0;j < count;j++){
                        rec.selectLine('line',j);
                        account = rec.getCurrentSublistValue({
                            sublistId:'line',
                            fieldId:'account',
                        });
                        account_info = getAccount(account);
                        if(account_info.flag != 'bank'){
                            rec.setCurrentSublistValue({
                                sublistId:'line',
                                fieldId:'cseg_cashflow3',
                                value:account_info.cashflow,
                            });
                            rec.commitLine('line');
                        }
                    }
                    var rec_id = rec.save({
                        ignoreMandatoryFields: true,
                    });
                    log.debug('已保存日记账',rec_id);
                }
            }
        }catch(e){
            log.debug('日记账赋值现金流量表有错',e);
        }
     }
     function getAccount(accountId) {
         var ret = new Object();
         ret.flag = 'nobank';
         if(accountId){
            var rec = record.load({
                type: record.Type.ACCOUNT,
                id: accountId,
                isDynamic: true,
            });
            var accttype = rec.getText('accttype');
            // log.debug('accttype',accttype + typeof(accttype));
            if(accttype == '银行'){
                ret.flag = 'bank';
            }else{
                var cashflow = rec.getValue('custrecord_cashflow6');//TODO:测试环境：现金流量表项目custrecord_cashflow6
                ret.cashflow = cashflow;
            }
         }
         return ret;
     }
     return {
        //  beforeLoad: beforeLoad,
        //  beforeSubmit: beforeSubmit,
         afterSubmit: afterSubmit
     };
 });
