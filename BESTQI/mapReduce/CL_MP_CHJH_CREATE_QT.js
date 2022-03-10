/**
 *@NApiVersion 2.x
 *@NScriptType MapReduceScript
 */
 define(['N/runtime', 'N/record', 'N/search','N/format'], function (runtime, record, search,format) {

    function getInputData() {
        try {
            var detail = JSON.parse(runtime.getCurrentScript().getParameter('custscript_chqt_info'));
            var newDetail = merge_details(detail.info);
            log.debug('newDetail', newDetail);
            return newDetail;
        } catch (e) {
            log.debug('e', e);
        }
    }

    function merge_details(details) {
        var ret = {};
        for (var i = 0; i < details.length; i++) {
            var vendor = details[i].supplier_name;
            if (!ret[vendor]) {
                ret[vendor] = [];
            }
            ret[vendor].push(details[i]);
        }
        return ret;
    }

    function map(context) {
        var result;
        try {
            var data = JSON.parse(context.value);
            var objRecord = record.create({ type: 'customrecord_bsq_quality_inspection', isDynamic: true });
            var user = runtime.getCurrentUser().id;
            log.debug('user', user);
            objRecord.setValue({ fieldId: 'custrecord_bsq_qc_', value: user });
            for (var i = 0; i < data.length; i++) {
                objRecord.selectNewLine({ sublistId: 'recmachcustrecord_po_qc_rel' });
                objRecord.setCurrentSublistValue({ sublistId: 'recmachcustrecord_po_qc_rel', fieldId: 'custrecord_shipment_plan', value: data[i].bill_num });
                // objRecord.setCurrentSublistValue({ sublistId: 'recmachcustrecord_po_qc_rel', fieldId: 'custrecord_bsq_purchase_quantity', value: data[i].po_quantity });
                objRecord.setCurrentSublistValue({ sublistId: 'recmachcustrecord_po_qc_rel', fieldId: 'custrecord_hl_plan', value: data[i].bill_detail_num });
                objRecord.setCurrentSublistValue({ sublistId: 'recmachcustrecord_po_qc_rel', fieldId: 'custrecord_po_qc_qty', value: data[i].qt_quantity });
                /**2021/11/21 添加赋值 */
                objRecord.setCurrentSublistValue({ sublistId: 'recmachcustrecord_po_qc_rel', fieldId: 'custrecord_po_qc_date', value: format.parse({value:data[i].qt_date,type:format.Type.DATE}) });
                // objRecord.setCurrentSublistValue({ sublistId: 'recmachcustrecord_po_qc_rel', fieldId: 'custrecord_po_qc_qty', value: data[i].qt_quantity });
                objRecord.setCurrentSublistValue({ sublistId: 'recmachcustrecord_po_qc_rel', fieldId: 'custrecord_bsq_remarks_on_qc', value: data[i].po_memo});
                objRecord.setCurrentSublistValue({ sublistId: 'recmachcustrecord_po_qc_rel', fieldId: 'custrecord_qc_po_no', value: data[i].po_num});

                objRecord.commitLine({ sublistId: 'recmachcustrecord_po_qc_rel' });
            }
            var inspection_id = objRecord.save({ ignoreMandatoryFields: true });
            log.debug('inspection_id', inspection_id);
            if (inspection_id) {
              //add author:wh ; 解决生成的质检单，用户脚本获取不到值问题。
              		var	inspectionRec = record.load({
                      type:"customrecord_bsq_quality_inspection",
                      id:inspection_id
                    })
                    inspectionRec.save({ ignoreMandatoryFields: true })
                //回写已质检数量到出货计划明细上
                for(var i = 0; i < data.length; i++){
                    var rac_data = record.load({ type: 'customrecord_wl_plan_list', id: data[i].bill_detail_num });
                    var inspected_quantity = rac_data.getValue('custrecord_inspected_quantity') ? rac_data.getValue('custrecord_inspected_quantity') : 0;
                    rac_data.setValue({ fieldId: 'custrecord_inspected_quantity', value: Number(inspected_quantity) + Number(data[i].qt_quantity) });
                    rac_data.save();
                }
                var fieldLookUp = search.lookupFields({ type: 'customrecord_bsq_quality_inspection', id: inspection_id, columns: ['name'] });
                var name = fieldLookUp.name;
                log.debug('name', name);
                result = inspection_id + '-' + name;
            }
        } catch (e) {
            log.debug('map e', e.message);
            result = 'error' + '-' + e.message;
        }
        context.write('result', result);
    }

    function reduce(context) {
        var data_arr = context.values, data_length = context.values.length, data_success = [], data_error = [], resultJson = {};
        for (var i = 0; i < data_length; i++) {
            var rec_arr = data_arr[i].split('-');
            if (rec_arr[0] == 'error') {
                data_error.push(rec_arr[1]);
            } else {
                data_success.push(rec_arr);
            }
        }
        resultJson.length = data_length;
        resultJson.resultarr = data_success;
        resultJson.success = data_success.length;
        resultJson.errorarr = data_error;
        resultJson.fail = data_error.length;
        log.debug('resultJson', resultJson);
        //获取当前登录用户信息
        var user = runtime.getCurrentUser().id;
        record.submitFields({
            type: 'employee',
            id: user,
            values: {
                custentity_ch_to_qt_status: 3,
                custentity_ch_to_qt_info: JSON.stringify(resultJson)
            }
        });
    }

    function summarize(summary) {

    }

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    }
});
