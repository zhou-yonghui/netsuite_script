/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define(['N/record', 'N/format', 'N/render', 'N/file','SuiteScripts/utils/moment.js', 'N/runtime','N/search'],
    function(record, format, render, file,moment, runtime, search) {
        function afterSubmit(context){
            var rec = record.load({
                type: 'vendorprepayment',
                id: context.newRecord.id,
                isDynamic: true
            });
            var trans = new Object();
            //trans.department = rec.getText('department');
            trans.trandate = rec.getText('trandate');
            //trans.trandate = moment(rec.getText('trandate')).format('YYYY/MM/DD');
            trans.transactionnumber = rec.getText('transactionnumber');
            trans.subsidiary = rec.getText('subsidiary');
            trans.entity = rec.getText('entity');
            trans.currency = rec.getText('currency');
            trans.custbody_vendorpaymentaccount_info = rec.getText('custbody_vendorpaymentaccount_info');
            trans.custbody_hl_applier1 = rec.getText('custbody_hl_applier1');
            trans.memo = rec.getText('memo');
            trans.payment = rec.getText('payment');
            trans.fileNo = rec.getText('tranid');
            var custentity_rp_field = 0
            if (rec.getValue('entity')){
                var recentity = record.load({
                    type: 'vendor',
                    id: rec.getValue('entity'),
                    isDynamic: true
                });
                trans.companyname = recentity.getText('companyname');
                trans.terms = recentity.getText('terms');
                trans.custentity_rp_field = recentity.getText('custentity_rp_field');
                trans.legalname = recentity.getText('legalname');
                trans.accountnumber = recentity.getText('accountnumber');
                trans.custentity_hx_field_suppier_depositbank = recentity.getText('custentity_hx_field_suppier_depositbank');
                trans.custentity_brank_addr = recentity.getText('custentity_brank_addr');
                trans.custentity_brank_code = recentity.getText('custentity_brank_code');
                var str = recentity.getText('custentity_rp_field');
                log.debug({
                    title: '汇率str',
                    details: str
                });
                var varstr = str.replace("%","")
                custentity_rp_field = varstr/100
            }
            if (rec.getValue('purchaseorder')){
                var recpo = record.load({
                    type: 'purchaseorder',
                    id: rec.getValue('purchaseorder'),
                    isDynamic: true
                });
                trans.tranid = recpo.getText('tranid');
                trans.department = recpo.getText('department');
                log.debug({
                    title: 'tranid',
                    details: recpo.getText('tranid')
                });
                var count = recpo.getLineCount('item');
                var items = [];
                for (var i = 0; i < count; i++) {
                    var item = new Object();
                    recpo.selectLine({
                        sublistId: 'item',
                        line: i
                    });
                    // item.item = recpo.getCurrentSublistText({
                    // 	sublistId: 'item',
                    // 	fieldId: 'item'
                    // });
                    item.item_display = recpo.getCurrentSublistText({
                        sublistId: 'item',
                        fieldId: 'item_display'
                    });
                    item.quantity = recpo.getCurrentSublistText({
                        sublistId: 'item',
                        fieldId: 'quantity'
                    });
                    item.rate = recpo.getCurrentSublistText({
                        sublistId: 'item',
                        fieldId: 'rate'
                    });
                    // if(item.rate == '0.00'){
                    // 	item.amount = '0.00'
                    // }else{
                    // 	item.amount = rec.getText('payment');
                    // }
                    var quantitystr = item.quantity.replace(",","")
                    item.amount = (parseFloat(quantitystr)*parseFloat(item.rate)*parseFloat(custentity_rp_field)).toFixed(2)
                    // var amountstr = item.quantity*item.rate*custentity_rp_field
                    // item.amount = amountstr.toFixed(2)

                    // item.line_memo = recpo.getCurrentSublistValue({
                    // 	sublistId: 'item',
                    // 	fieldId: 'line_memo'
                    // });
                    items[items.length] = item;
                }
                trans.item = items;
            }
            var employeeId = runtime.getCurrentUser().id;
            var employee = record.load({
                type: 'employee',
                id: employeeId,
                isDynamic: true
            });
            trans.firstname = employee.getText('firstname');
            // trans.department = employee.getText('department');
            log.debug({
                title: '名字',
                details: employee
            });
            log.debug({
                title: 'trans',
                details: JSON.stringify(trans)
            });
            var jsonString = JSON.stringify(trans);
            var renderer = render.create();
            //模板ID
            if (rec.getValue('purchaseorder')){
                renderer.templateContent = file.load(4637).getContents();
            }else{
                renderer.templateContent = file.load(4638).getContents();
                // renderer.templateContent = file.load(4637).getContents();
            }
            // renderer.setTemplateById(115);
            renderer.addCustomDataSource({
                format: render.DataSource.JSON,
                alias: "record",
                data: jsonString
            });
            var pdfFile = renderer.renderAsPdf();
            pdfFile.folder = -15; //PDF文件存放文件夹ID
            log.debug({
                title: 'name',
                details: runtime.getCurrentScript().deploymentId
            });
            pdfFile.name = moment().format('YYYY-MM-DDTHH:mm:ss') + '.pdf';
            // pdfFile.name = 'advanceCharge.pdf'
            var fileId = pdfFile.save();
            log.debug({
                title: 'pdfFile',
                details: JSON.stringify(pdfFile.name)
            });
            rec.setValue('custbodycust_prepay_print', fileId);
            var recid = rec.save();
            log.debug({
                title: 'recid',
                details: JSON.stringify(recid)
            });
        }
        return {
            afterSubmit:afterSubmit
        };
    });

