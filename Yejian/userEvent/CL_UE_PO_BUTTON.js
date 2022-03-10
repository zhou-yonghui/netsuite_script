/**
 * @LastEditors: zhouyh
 * @LastEditTime: 2022-01-05 18:13:00
 * @Description: 采购订单打印模板
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define(['N/record','N/search','N/format','N/runtime','N/ui/serverWidget'],
    function(record,search,format,runtime,serverWidget) {
        function beforeLoad(context) {
            try{
                var rec = context.newRecord;
                var form  = context.form;
                //创建跳转按钮
                form.clientScriptFileId = 17;   //TODO:关联客户端脚本CL_CS_UNTIL.js的内部id

                if(context.type == 'view'){
                    form.addButton({
                        id:'custpage_toprint',
                        label:'中文打印',
                        functionName:'reportExcel(' + 1 +')',
                    });
                    form.addButton({
                        id:'custpage_toprint',
                        label:'英文打印',
                        functionName:'reportExcel(' + 2 +')',
                    });
                }
                if(context.type == 'create' || context.type == 'edit'){
                    var sublist = form.getSublist({
                        id:"item"
                    });
                    sublist.getField('amount').updateDisplayType({    // 不计税总金额
                        displayType : serverWidget.FieldDisplayType.DISABLED,
                    });
                    // sublist.getField('rate').updateDisplayType({
                    //     displayType : serverWidget.FieldDisplayType.DISABLED,
                    // });
                    sublist.getField('grossamt').updateDisplayType({    // 总金额
                        displayType : serverWidget.FieldDisplayType.DISABLED,
                    });
                }
            }catch (e){
                log.debug('load',e);
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
