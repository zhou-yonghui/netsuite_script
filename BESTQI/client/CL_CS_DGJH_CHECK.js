/**
 * @LastEditors: zhouyh
 * @LastEditTime: 2021-12-26 18:40:04
 * @Description: 订柜计划检验
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 */
define(['N/error','N/search','N/format','N/currentRecord','N/currency','N/record'],
    function(error,search,format,currentRecord,currencyRate,record) {
        function pageInit(context) {

        }
        function saveRecord(context) {
            var rec = context.currentRecord;
            var count = rec.getLineCount('recmachcustrecord_sl_rp_body');
            var alert_arr = new Array();
            var location_arr = new Array();
            if(count > 0){
                for(var i = 0;i < count;i++){
                    var line = Number(i) + Number(1);
                    var actual_qty = rec.getSublistValue({
                        sublistId:'recmachcustrecord_sl_rp_body',
                        fieldId:'custrecord_sl_dg_sku_qty2',
                        line:i
                    });
                    var shipment_quantity = rec.getSublistValue({
                        sublistId:'recmachcustrecord_sl_rp_body',
                        fieldId:'custrecord_cumulative_shipment_quantity',
                        line:i
                    });
                    var actual_shipment_quantity = rec.getSublistValue({
                        sublistId:'recmachcustrecord_sl_rp_body',
                        fieldId:'custrecord_actual_shipment_quantity',
                        line:i
                    });
                    var end_location = rec.getSublistValue({
                        sublistId:'recmachcustrecord_sl_rp_body',
                        fieldId:'custrecord_sl_dg_md_location',
                        line:i
                    });
                    var end_country = rec.getSublistValue({
                        sublistId:'recmachcustrecord_sl_rp_body',
                        fieldId:'custrecord_mudi_location',
                        line:i
                    });
                    var ship_type = rec.getSublistValue({
                        sublistId:'recmachcustrecord_sl_rp_body',
                        fieldId:'custrecord_sl_ch_type1',
                        line:i
                    });
                    var out_type = rec.getSublistValue({
                        sublistId:'recmachcustrecord_sl_rp_body',
                        fieldId:'custrecord_type_of_shipping1',
                        line:i,
                    })
                    // log.debug('end_location end_country',end_location + '---' + end_country);
                    location_arr.push({
                        "location":end_location,
                        "country":end_country,
                        "ship_type":ship_type,
                        "out_type":out_type,
                        "line":i,
                    })
                    // log.debug('actual_qty shipment_quantity actual_shipment_quantity', actual_qty + '---'  + shipment_quantity + '---' + actual_shipment_quantity);
                    if(actual_qty && actual_shipment_quantity){
                        if(shipment_quantity){
                            if(actual_shipment_quantity > actual_qty - shipment_quantity){
                                alert_arr.push(line);
                            }
                        }else{
                            if(actual_shipment_quantity > actual_qty){
                                alert_arr.push(line);
                            }
                        }
                    }
                }
                log.debug('location_arr',location_arr);

                var ret_error = getAllLocationCountry(location_arr);
                log.debug('ret_error',ret_error);
                //提示错误
                if(alert_arr.length > 0){
                    alert('第[' + alert_arr + ']行的发货数量大于QTY（实际）数量与累计发货数量之差,请检查实际发货数量！！');
                    return false;
                }
                if(ret_error.checkflag == 'Y'){
                    // if(ret_error.error_location.length > 0){
                    //     alert('第[' + ret_error.error_location + ']行的目的仓与第一行不一致，请检查目的仓数据！！');
                    //     return false;
                    // }
                    if(ret_error.error_country.length > 0){
                        alert('第[' + ret_error.error_country + ']行的目的国与第一行不一致，请检查目的国数据！！');
                        return false;
                    }
                    if(ret_error.error_type.length > 0){
                        alert('第[' + ret_error.error_type + ']行的运输方式与第一行不一致，请检查运输方式数据！！');
                        return false;
                    }
                }
                else if(ret_error.checkflag == 'N'){
                    alert('出货类型不一致，不允许头程二程混发,请检查出货计划类型!!');
                    return false;
                }
            }
            return true;
        }
        function getAllLocationCountry(location_arr) {
            var error_location_arr = new Array();
            var error_country_arr = new Array();
            var error_type_arr = new Array();
            var shiptype_arr = [1,2,3,4];
            var check_flag_1 = 'N';
            var check_flag_2 = 'N';
            var check_flag = 'Y';
            if(location_arr.length > 1){
                var true_num = Number(0);
                for(var j = 0;j < shiptype_arr.length;j++){
                    for(var n = 0;n < location_arr.length;n++){
                        if(location_arr[n].ship_type == shiptype_arr[j]){
                            true_num += Number(1);
                        }
                    }
                }
                log.debug('true_num',true_num);
                if(true_num == location_arr.length){
                    for(var i = 1;i < location_arr.length;i++){
                        var line = Number(location_arr[i].line) + Number(1);
                        if(location_arr[0].location != location_arr[i].location){
                            error_location_arr.push(line);
                        }
                        if(location_arr[0].country != location_arr[i].country){
                            error_country_arr.push(line);
                        }
                        if(location_arr[0].out_type != location_arr[i].out_type){
                            error_type_arr.push(line);
                        }
                    }
                }else if(true_num < location_arr.length && true_num != 0){
                    check_flag = 'N';
                }
            }
            return {
                "error_location":error_location_arr,
                "error_country":error_country_arr,
                "error_type":error_type_arr,
                "checkflag":check_flag,
            }
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
            // pageInit: pageInit,
            // fieldChanged: fieldChanged,
            // postSourcing: postSourcing,
            // sublistChanged: sublistChanged,
            // lineInit: lineInit,
            // validateField: validateField,
            // validateLine: validateLine,
            // validateInsert: validateInsert,
            // validateDelete: validateDelete,
            saveRecord: saveRecord
        };
    });