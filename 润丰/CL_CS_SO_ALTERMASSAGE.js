/**
 * 验证销售订单收货人为空/收获城市为空/省份为空，如果为类型：RP-销售订单 （客服补发订单），保存判断收货人信息为必填
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */
define(['N/error','N/search','N/format','N/currentRecord','N/currency'],
    function(error,search,format,currentRecord,currencyRate) {
        function pageInit(context) {

        }
        function saveRecord(context) {
            var rec = context.currentRecord;
            var customform = rec.getText('customform');
            var address_rec = rec.getSubrecord({
                fieldId: 'shippingaddress',               //TODO:发运信息里面的收货信息type:'shippingaddress'
            });
            var country = address_rec.getValue('country');
            var attention = address_rec.getValue('attention');//收件人
            var addressee = address_rec.getValue('addressee');//收件人
            var city = address_rec.getValue('city');
            var state = address_rec.getValue('state');//省/市/自治区
            var zip = address_rec.getValue('zip');//邮编
            if(customform == 'RP-销售订单 （客服补发订单）'){
                if(!addressee || !attention){
                    alert('客服补发订单不能没有收件人，请查看！！');
                    return false;
                }else{
                    return true;
                }
            }else{
                if(!country){
                    alert('国家不能为空！！');
                    return false;
                }else if(!attention && !addressee){
                    alert('收件人不能为空！！');
                    return false;
                }else if(!state){
                    alert('省/市/自治区不能为空！！');
                    return false;
                }else if(!city){
                    alert('城市不能为空！！');
                    return false;
                }else{
                    return true;
                }
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