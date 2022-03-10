/**
 * 退货授权单同步OMS
 * @NApiVersion 2.x
 * @NScriptType WorkflowActionScript
 */
define(['N/record'],
    function(record) {
        function onAction(context){
            try {
                var rec = context.newRecord;
                var oldVersion = rec.getValue('custbody_rp_pm_changeversion');//老版本
                log.debug('oldVer',oldVersion);
                if(oldVersion){
                    var num = oldVersion.split('R')[1].split('.')[0];
                    var newNum = Number(num) + Number(1);
                    rec.setValue({fieldId:'custbody_rp_pm_changeversion',value:'R' + newNum + '.0'});
                    rec.setValue({fieldId: 'custbody_rp_pm_revised',value: true});
                    rec.save();
                }
                else {
                    rec.setValue({fieldId:'custbody_rp_pm_changeversion',value:'R1.0'});
                    rec.setValue({fieldId: 'custbody_rp_pm_revised',value: true});
                    rec.save();
                }
            } catch (e) {
                log.debug({
                    title:"error",
                    details: e.message + ',' + e.stack
                });
            }
        }
        return {
            onAction: onAction
        }
    });