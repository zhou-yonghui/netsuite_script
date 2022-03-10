/**
 * 员工预借款记录赋值默认公司和行上的科目
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */
define(['N/error','N/search','N/format','N/currentRecord','N/currency'],
    function(error,search,format,currentRecord,currencyRate) {
        function pageInit(context) {
            var currrentRec = context.currentRecord;
            currrentRec.setValue({
                fieldId:'subsidiary',
                value:1,          //虚拟母公司
                ignoreFieldChange: true,
                forceSyncSourcing: true
            });
            for(var i = 0;i < 1;i++){
                currrentRec.selectNewLine('line');
                // if(i == 0){
                //     currrentRec.setCurrentSublistValue({
                //         sublistId:'line',
                //         fieldId: 'custcol_hl_expense',
                //         value: 1,          //费用类型：员工借款
                //     });
                //     currrentRec.setCurrentSublistValue({
                //         sublistId: 'line',
                //         fieldId:'account',
                //         value: 824,      //员工借款
                //     });
                //     currrentRec.setCurrentSublistValue({
                //         sublistId: 'line',
                //         fieldId:'amount',
                //         value: 1,   //默认金额必须大于0
                //     });
                //     currrentRec.commitLine('line');
                // }
                if(i == 0){
                    currrentRec.setCurrentSublistValue({
                        sublistId:'line',
                        fieldId: 'custcol_hl_expense',
                        value: 1,          //费用类型：员工借款
                    });
                    currrentRec.setCurrentSublistValue({
                        sublistId: 'line',
                        fieldId:'account',
                        value: 939,      //员工借款中转科目，正式：939，测试：1156
                    });
                    currrentRec.setCurrentSublistValue({
                        sublistId: 'line',
                        fieldId:'amount',
                        value: 1,
                    });
                    currrentRec.commitLine('line');
                }
            }
        }
        function saveRecord(context) {

        }
        function validateField(context) {

        }
        function fieldChanged(context) {

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
            pageInit: pageInit,
            //fieldChanged: fieldChanged,
            // postSourcing: postSourcing,
            // sublistChanged: sublistChanged,
            // lineInit: lineInit,
            // validateField: validateField,
            // validateLine: validateLine,
            // validateInsert: validateInsert,
            // validateDelete: validateDelete,
            // saveRecord: saveRecord
        };
    });