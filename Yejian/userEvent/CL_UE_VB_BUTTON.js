/**
 * @LastEditors: zhouyh
 * @LastEditTime: 2022-01-05 18:40:53
 * @Description: 账单打印按钮
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define(['N/record','N/search','N/format','N/runtime'],
    function(record,search,format,runtime) {
        function beforeLoad(context) {
            var form  = context.form;
            //创建跳转按钮
            form.clientScriptFileId = 192;   //TODO:关联客户端脚本CL_CS_UNTIL_TO_RECORD.js的内部id

            if(context.type == 'view'){
                form.addButton({
                    id:'custpage_toprint',
                    label:'打印',
                    functionName:'reportExcel()',
                });
            }

        }
        function beforeSubmit(context) {

        }
        function afterSubmit(context) {

        }

        return {
            beforeLoad: beforeLoad,
            //  beforeSubmit: beforeSubmit,
            // afterSubmit: afterSubmit
        };
    });