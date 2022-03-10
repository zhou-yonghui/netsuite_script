/**
 * 员工预借款记录赋值默认公司和行上的科目
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define(['N/record','N/search','N/format','N/runtime'],
    function(record,search,format,runtime) {
        function beforeLoad(context) {
            if(context.type == 'create'){
                var rec = context.newRecord;
                rec.setValue({fieldId:'subsidiary',value:1});//附属公司  TODO:暂定虚拟母公司
                for(var i = 0;i < 1;i++){
                    // if(i == 0){
                    //     rec.setSublistValue({
                    //         sublistId:'line',
                    //         fieldId: 'custcol_hl_expense',
                    //         value: 1,          //费用类型：员工借款
                    //         line:i
                    //     });
                    //     rec.setSublistValue({
                    //         sublistId: 'line',
                    //         fieldId:'account',
                    //         value: 824,      //员工借款
                    //         line:i
                    //     });
                    // }
                    if(i == 0){
                        rec.setSublistValue({
                            sublistId:'line',
                            fieldId: 'custcol_hl_expense',
                            value: 1,          //费用类型：员工借款
                            line:i
                        });
                        rec.setSublistValue({
                            sublistId: 'line',
                            fieldId:'account',
                            value: 939,      //员工借款中转科目，正式：939，测试：1156
                            line:i
                        });
                        rec.setSublistValue({
                            sublistId:'line',
                            fieldId:'amount',
                            value:1,
                            line:i,
                        })
                    }
                }
            }
        }
        function beforeSubmit(context) {
        }
        function afterSubmit(context) {

        }
        return {
            beforeLoad: beforeLoad,
            // beforeSubmit: beforeSubmit,
            afterSubmit: afterSubmit
        };
    });
