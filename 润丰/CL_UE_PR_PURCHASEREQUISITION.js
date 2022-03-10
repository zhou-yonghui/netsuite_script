/**
 * 请购单审核后直接生成采购单
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define(['N/record', 'N/file', 'N/search', 'N/url', './moment', 'N/runtime', '../utils/omsRequester','N/ui/serverWidget'],
    function (record, file, search, url, moment, runtime, omsRequester,serverWidget) {
        function beforeLoad(context) {
            var form = context.form;
            var sublist = form.getSublist('item');
            sublist.getField('item').updateDisplayType({displayType : serverWidget.FieldDisplayType.DISABLED});
            sublist.getField('amount').updateDisplayType({displayType : serverWidget.FieldDisplayType.DISABLED});//estimatedamount vendorname
            sublist.getField('estimatedamount').updateDisplayType({displayType : serverWidget.FieldDisplayType.DISABLED});
            //  sublist.getField('amount').updateDisplayType({displayType : serverWidget.FieldDisplayType.DISABLED});
        }
        function beforeSubmit(context) {
        }
        function afterSubmit(context) {
            try {
                var recPR = context.newRecord;
                if (context.type != 'delete' && (recPR.getValue('approvalstatus') == 2 || recPR.getValue("status") == "待订购")) {//==2为已审批
                    var purchaserequisition = record.load({
                        type: "purchaserequisition",
                        id: context.newRecord.id
                    })
                    var poId = purchaserequisition.getSublistValue({
                        sublistId: 'links',
                        fieldId: 'id',
                        line: 0
                    })
                    if (poId) { // 存在PO，做修改
                        log.debug("采购订单存在", "采购订单存在");
                    } else { // 添加po
                        var poRec;
                        poRec = record.transform({
                            fromType: "purchaserequisition",
                            fromId: context.newRecord.id,
                            toType: record.Type.PURCHASE_ORDER
                        });
                        log.debug("poRec", poRec);
                        var location = recPR.getSublistValue({
                            sublistId: 'item',
                            fieldId: 'location',
                            line: 0
                        });
                        var entity = recPR.getSublistValue({
                            sublistId: 'item',
                            fieldId: 'vendorname',
                            line: 0
                        });
                        var item_id = recPR.getSublistValue({
                            sublistId: 'item',
                            fieldId: 'item',
                            line: 0
                        });
                        var shippingdate = recPR.getValue("custbody_rp_pm_shippingdate");
                        var employee = recPR.getValue("entity"); // 员工
                        var fm_platfm_id = recPR.getValue("cseg_hx_fm_platfm"); // 销售平台
                        //根据供应商编码获取供应商ID以及供应商的编码(供应商批次号代码)
                        var po_purchaser, vendorCode;
                        search.create({
                            type: 'vendor',
                            filters: [
                                { name: 'entityid', operator: 'is', values: entity }
                            ],
                            columns: [
                                { name: 'custentity2' }
                            ]
                        }).run().each(function (rec) {
                            po_purchaser = rec.id;
                            vendorCode = rec.getValue('custentity2')
                            return false;
                        });
                        poRec.setValue("entity", po_purchaser); // 供应商
                        poRec.setValue("employee", employee) // 员工
                        poRec.setValue("location", location); // 地点
                        var dateFormat = runtime.getCurrentUser().getPreference('DATEFORMAT');
                        var date = moment(new Date().getTime()).format(dateFormat);
                        poRec.setText('duedate', date);//收货日期
                        poRec.setValue("custbody_rp_pm_shippingdate", moment(shippingdate, 'D/M/YYYY').toDate());//船运日期
                        poRec.setValue("custbody_rp_pm_demandquantity", recPR.getValue("custbody_rp_pm_demandquantity"));// 销售需求数量
                        poRec.setValue("cseg_hx_fm_store", recPR.getValue("cseg_hx_fm_store"));//销售店铺
                        poRec.setValue("cseg_hx_fm_platfm", fm_platfm_id);//销售平台
                        //获取产品认证信息、认证型号、产品型号、价格
                        var item_authenticationinfo, item_authenticationno, mode_no, cost;
                        search.create({
                            type: 'item',
                            filters: [
                                { name: 'internalid', operator: 'is', values: item_id }
                            ],
                            columns: [
                                { name: 'custitem_rp_md_item_authenticationinfo' },
                                { name: 'custitem_rp_md_item_authenticationno' },
                                { name: 'custitem_mode_no' },
                                { name: 'cost' }
                            ]
                        }).run().each(function (rec) {
                            item_authenticationinfo = rec.getValue('custitem_rp_md_item_authenticationinfo');
                            item_authenticationno = rec.getValue('custitem_rp_md_item_authenticationno');
                            mode_no = rec.getValue('custitem_mode_no');
                            cost = rec.getValue('cost');
                        });
                        poRec.setSublistValue({ sublistId: 'item', fieldId: 'custcol12', value: item_authenticationinfo, line: 0 });
                        poRec.setSublistValue({ sublistId: 'item', fieldId: 'custcol13', value: item_authenticationno, line: 0 });
                        poRec.setSublistValue({ sublistId: 'item', fieldId: 'custcol_rp_pm_modelno', value: mode_no, line: 0 });
                        poRec.setSublistValue({ sublistId: 'item', fieldId: 'taxcode', value: 5, line: 0 });
                        poId = poRec.save({ ignoreMandatoryFields: true });

                        //生成采购批次号
                        if (poId) {
                            //获取PO号后6位
                            var po_data = record.load({ type: "purchaseorder", id: poId })
                            var poCode = po_data.getValue('tranid').slice(-6);
                            var type = 'PO_ITEM_NUMBER';
                            var requestPayload = {
                                "VENDOR_CODE": vendorCode,
                                "TRANS_YEAR": moment.utc().add(8, 'hours').format('YY'),
                                "PO_CODE": poCode
                            };
                            var result_lot_no = omsRequester.numberGenerator(type, requestPayload);
                            log.debug("result_lot_no", result_lot_no);
                            po_data.setValue('custbody_rp_pm_batchnumber', result_lot_no.returnObject);
                            po_data.save({ ignoreMandatoryFields: true });
                        }
                    }
                    log.debug("poId", poId);
                }
            } catch (e) {
                log.debug("出错", e)
            }
        }
        return {
            beforeLoad: beforeLoad,
            beforeSubmit: beforeSubmit,
            afterSubmit: afterSubmit
        };
    });