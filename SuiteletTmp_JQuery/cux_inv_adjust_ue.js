/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 * @Description 自定义库存调整单ue
 */
define(["N/log", "N/ui/serverWidget", "../../../../config/const",'N/record'],

    function (log, serverWidget, cuxConst,record) {

        /**
         * Function definition to be triggered before record is loaded.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {string} scriptContext.type - Trigger type
         * @param {Form} scriptContext.form - Current form
         * @Since 2015.2
         */
        function beforeLoad(scriptContext) {
            var type = scriptContext.type;
            var form = scriptContext.form;
            var rec = scriptContext.newRecord;
            form.clientScriptModulePath = '../cs/cux_inv_adjust_cs.js';
            if (type == "view") {
                //获取审核状态
                var status = rec.getValue({
                    fieldId: "custrecord_hx_field_predoc_state"
                });
                //关联锁库单
                var lockNumber = rec.getValue({
                    fieldId: "custrecord_link_lock_number"
                });
                //关联标准库存调整单
                var stdInvAdjust = rec.getValue({
                    fieldId: "custrecord_hx_field_predoc_associatedno"
                });
                //关联标准采购退货单
                var stdPoReturn = rec.getValue({
                    fieldId: "custrecord_hx_field_predoc_po_return"
                });
                //已核准且未锁库
                if (status == cuxConst.APPROVAL_STATUS.APPROVAVED && !lockNumber) {
                    //未生成标准单据
                    if(!stdInvAdjust && !stdPoReturn){
                        form.addButton({
                            id: 'custpage_lock_btn',
                            label: '锁库',
                            functionName: "doLockBtn()"
                        });
                    }
                }
            }
        }

        /**
         * Function definition to be triggered before record is loaded.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type
         * @Since 2015.2
         */
        function beforeSubmit(scriptContext) {

        }

        /**
         * Function definition to be triggered before record is loaded.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type
         * @Since 2015.2
         */
        function afterSubmit(scriptContext) {

        }

        return {
            beforeLoad: beforeLoad,
            beforeSubmit: beforeSubmit,
            afterSubmit: afterSubmit
        };

    });
