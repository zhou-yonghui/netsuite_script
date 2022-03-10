/**
 * @LastEditors: zhouyh
 * @LastEditTime: 2022-01-10 23:17:47
 * @Description: 发货单检查库存状况
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */
define(['N/error','N/search','N/format','N/currentRecord','N/currency','N/record'],
    function(error,search,format,currentRecord,currencyRate,record) {
        function pageInit(context) {

        }
        function saveRecord(context) {
            return true;
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
        function search(){
                var url = window.location.href;
                var cur_record = currentRecord.get();
                var no = cur_record.getValue('custpage_dgjh_no_head');
                if(no){
                        // no = encodeURIComponent(no);
                        // url = changeURLArg(url,'no',no);
                        var url = 'https://6797408-sb1.app.netsuite.com/app/site/hosting/scriptlet.nl?script=336&deploy=1&no=' + no;//测试
                }
                setWindowChanged(window, false);
                window.location.href = url;
        }
        function refresh(){
                //  var url = 'https://5784666.app.netsuite.com/app/site/hosting/scriptlet.nl?script=248&deploy=1';//正式
                var url = 'https://6797408-sb1.app.netsuite.com/app/site/hosting/scriptlet.nl?script=336&deploy=1';//测试
                window.location.href = url;
        }
        return {
                refresh:refresh,
                search:search,
            //  pageInit: pageInit,
            // fieldChanged: fieldChanged,
            // postSourcing: postSourcing,
            //  sublistChanged: sublistChanged,
            // lineInit: lineInit,
            // validateField: validateField,
            //  validateLine: validateLine,
            // validateInsert: validateInsert,
            // validateDelete: validateDelete,
            saveRecord: saveRecord
        };
    });