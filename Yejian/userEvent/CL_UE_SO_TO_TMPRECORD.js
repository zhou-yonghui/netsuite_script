/**
 * 销售订单添加模板打印取值单按钮
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
                var rec = context.newRecord;
                var is_if = rec.getValue('custbody_sl_bffh');//部分发货
                var order_status = rec.getValue('orderstatus');//B:待履行，D:部分完成,E:待开票/部分完成
                var approval_status = rec.getValue('custbody_approval_status');//审批状态
                var so_id = context.newRecord.id;
                //判断角色
                var role = runtime.getCurrentUser().role;
                log.debug('role',role);
                var role_flag = checkRole(role);
                if(role_flag == 'Y'){
                    //模板打印取值单
                    form.addButton({
                        id:'custpage_toquzhi',
                        label:'模板打印取值单',
                        functionName:'toPiPlCiTmp(' + so_id + ')',
                    });
                    //打印pdf按钮
                    form.addButton({
                        id:'custpage_reportexcel',
                        label:'打印PDF',
                        functionName:'reportExcel()',
                    });
                    if(is_if == true && approval_status == 5){
                        //跳转部分发货
                        form.addButton({
                            id:'custpage_tobfsh',
                            label:'跳转部分发货',
                            functionName:'toBfsh(' + so_id + ')',
                        });
                    }
                }
            }else{
                //查询是否偏远地区
                form.addButton({
                    id:'custpage_findIsRemoteArea',
                    label:'查询是否偏远地区',
                    functionName:'findIsRemoteArea()'
                });
            }

        }
        function checkRole(role_id) {
            log.debug('role_id',role_id);
            var flag = 'Y';
            if(role_id){
                // 采购角色
                var role_arr = [1018,1019,1024];
                for(var i = 0;i < role_arr.length;i++){
                    if(role_id == role_arr[i]){
                        flag = 'N';
                        break;
                    }
                }
            }
            log.debug('角色',flag);
            return flag;
        }
        function beforeSubmit(context) {

        }
        function afterSubmit(context) {
            if(context.type == 'create'){
                var rec = record.load({type:'salesorder',id:context.newRecord.id,isDynamic:true});
                var customer = rec.getValue('entity');
                var context_log = rec.getText('trandate') + '创建了销售订单：' + rec.getValue('tranid');
                var man = rec.getValue('custbody_sl_spo_yyy');
                //向客户添加客户跟进记录子列表
                var log_rec = record.create({
                    type:'customrecord_cl_yejian_customer_log',
                    isDynamic:true,
                });
                log_rec.setValue('custrecord_cl_so_id',context.newRecord.id);
                log_rec.setValue('custrecord_cl_yj_employe',man);
                log_rec.setValue('custrecord_cl_yj_customer_match',customer);
                log_rec.setValue('custrecord_cl_yj_context',context_log);
                var log_id = log_rec.save();
                log.debug('log_id',log_id);
            }
        }

        return {
            beforeLoad: beforeLoad,
            //  beforeSubmit: beforeSubmit,
            afterSubmit: afterSubmit
        };
    });
