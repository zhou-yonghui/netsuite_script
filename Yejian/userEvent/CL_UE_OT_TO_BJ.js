/**
 * @LastEditors: zhouyh
 * @LastEditTime: 2022-01-04 15:21:40
 * @Description: 机会跳转报价单
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
                //模板打印取值单
                form.addButton({
                    id:'custpage_tobj',
                    label:'报价单',
                    functionName:'toBj()',
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
