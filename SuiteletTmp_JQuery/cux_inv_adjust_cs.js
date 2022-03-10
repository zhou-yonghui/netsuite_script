/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 * @Description 自定义库存调整单cs
 */
define(["N/log","N/url","N/currentRecord","N/ui/dialog","../../../../config/const",
        "../../../../lib/custom/customer_common_util","../../../../lib/third/jquery-3.2.1.min"],

    function (log,url,currentRecord,dialog,cuxConst,commonUtil,jquery) {
        var clickBtnFlag = true;
        /**
         * Function to be executed after page is initialized.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
         *
         * @since 2015.2
         */
        function pageInit(scriptContext) {

        }

        /**
         * Function to be executed when field is changed.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         * @param {string} scriptContext.fieldId - Field name
         * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
         * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
         *
         * @since 2015.2
         */
        function fieldChanged(scriptContext) {

        }

        /**
         * Function to be executed when field is slaved.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         * @param {string} scriptContext.fieldId - Field name
         *
         * @since 2015.2
         */
        function postSourcing(scriptContext) {

        }

        /**
         * Function to be executed after sublist is inserted, removed, or edited.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         *
         * @since 2015.2
         */
        function sublistChanged(scriptContext) {

        }

        /**
         * Function to be executed after line is selected.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         *
         * @since 2015.2
         */
        function lineInit(scriptContext) {

        }

        /**
         * Validation function to be executed when field is changed.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         * @param {string} scriptContext.fieldId - Field name
         * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
         * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
         *
         * @returns {boolean} Return true if field is valid
         *
         * @since 2015.2
         */
        function validateField(scriptContext) {
            return true;
        }

        /**
         * Validation function to be executed when sublist line is committed.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         *
         * @returns {boolean} Return true if sublist line is valid
         *
         * @since 2015.2
         */
        function validateLine(scriptContext) {
            return true;
        }

        /**
         * Validation function to be executed when sublist line is inserted.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         *
         * @returns {boolean} Return true if sublist line is valid
         *
         * @since 2015.2
         */
        function validateInsert(scriptContext) {
            return true;
        }

        /**
         * Validation function to be executed when record is deleted.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         *
         * @returns {boolean} Return true if sublist line is valid
         *
         * @since 2015.2
         */
        function validateDelete(scriptContext) {
            return true;
        }

        /**
         * Validation function to be executed when record is saved.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @returns {boolean} Return true if record is valid
         *
         * @since 2015.2
         */
        function saveRecord(scriptContext) {
            return true;
        }

        /**
         * 点击了"锁库"按钮
         */
        function doLockBtn() {
            try {
                if (!clickBtnFlag) {
                    dialog.alert({
                        title: '提示',
                        message: '已经提交锁库,请勿重复点击!!!'
                    });
                    return;
                }
                clickBtnFlag = false;
                var curRec = currentRecord.get();
                var id = curRec.id;
                var targetUrl = url.resolveScript({
                    scriptId: "customscript_cux_inv_adjust_sl",
                    deploymentId: "customdeploy_cux_inv_adjust_sl"
                });
                var mask = new Ext.LoadMask(Ext.getBody(), {
                    msg: '正在锁库,请稍等...',
                });
                mask.show(); //显示 等待罩
                setTimeout(function () {
                    try {
                       console.info("targetUrl:" + targetUrl+'&action=doLockBtn&id='
                            + id);
                        var resp = commonUtil.postAjax(targetUrl,
                            '&action=doLockBtn&id='
                            + id).responseText;
                        console.info("resp:"+resp);
                        if (resp.indexOf('<!') > 0) {
                            resp = resp.split('<!')[0];
                        }
                        if(typeof resp != "object"){
                            resp = JSON.parse(resp);
                        }
                        console.info("resp:" + resp);
                    } catch (e) {
                        log.debug("接收锁库结果出错",e)
                        alert("接收锁库结果出错:" + e);
                    }
                    if (resp.RETURN_CODE != cuxConst.RETURN_CODE.SUCCESS) {
                        if (window.confirm(resp.RETURN_MSG)) {
                            window.location.reload();
                            mask.hide(); //隐藏 等待罩
                            return true;
                        } else {
                            window.location.reload();// 重新加载当前页面
                            mask.hide(); //隐藏 等待罩
                            return false;
                        }
                    }else {
                        if (window.confirm("锁库成功！")) {
                            window.location.reload();
                            mask.hide(); //隐藏 等待罩
                            return true;
                        } else {
                            window.location.reload();// 重新加载当前页面
                            mask.hide(); //隐藏 等待罩
                            return false;
                        }
                    }
                }, 0);

            }catch(e){
                log.debug("error",e)
                alert("ERROR:" + e);
            }
        }

        return {
            pageInit: pageInit,
            fieldChanged: fieldChanged,
            postSourcing: postSourcing,
            sublistChanged: sublistChanged,
            lineInit: lineInit,
            validateField: validateField,
            validateLine: validateLine,
            validateInsert: validateInsert,
            validateDelete: validateDelete,
            saveRecord: saveRecord,
            doLockBtn : doLockBtn
        };

    });
