/**
 * 订柜计划按钮
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */
 define(['N/error','N/search','N/format','N/currentRecord','N/currency','N/record','N/url','N/https'],
 function(error,search,format,currentRecord,currencyRate,record,urls,https) {
     function pageInit(context) {

     }
     function saveRecord(context) {
         
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
     function buttonDo(flag){
         //falg: 1 采购发货  2 发运  3 收货   4  发货
        if(flag == 1 || flag == 2 || flag == 3 || flag == 4){
            var rec = currentRecord.get();
            //先判断是否正在启动脚本
            // var flag_do = getSameLogRecord(rec.id);
            // if(flag_do == 'Y'){
                //链接到sl脚本启动任务
                var create_url = urls.resolveScript({
                    scriptId: 'customscript_cl_sl_dgjh_do_mp',    //订柜计划启动脚本
                    deploymentId: 'customdeploy_cl_sl_dgjh_do_mp'
                });
                var headers = {
                        "Content-Type": "application/json;charset=utf-8",
                        "Accept": "application/json"
                }   
                var response = https.post({
                        url: create_url,
                        body: {
                            flag: flag,
                            dgId: rec.id
                        },
                        headers: headers
                });
                //刷新页面防止重复点击按钮
                window.location.replace('https://6797408.app.netsuite.com/app/common/custom/custrecordentry.nl?rectype=230&id=' + rec.id);
                // window.open('https://6797408-sb1.app.netsuite.com/app/common/custom/custrecordentry.nl?rectype=60&id=' + rec.id);//todo:?+参数是合法的的链接
                if(response.body == 'Y'){
                    // alert('脚本启动成功');
                }
                else if(response.body == 'MAP_REDUCE_ALREADY_RUNNING'){
                    alert('脚本已被占用，两分钟后再试');
                }
                else{
                    alert(response.body);
                }
            // }
            // else{
            //     alert('脚本已被占用，两分钟后再试');
            // }
        }
     }
     function getSameLogRecord(dgId) {
        var flag = 'N';
        if(dgId){
            var mysearch = search.create({
                type:'customrecord_sl_dg_sc_re',
                filters:[
                    // ['custrecord_sl_dg_number','anyof',dgId],
                    // 'AND',['custrecord_sl_zx_result','is',2],        //执行中
                    ['custrecord_sl_zx_result','is',2],        //执行中
                ]
            });
            var res = mysearch.run().getRange(0,1000);
            if(res.length == 0){
                flag = 'Y';
            }
        }
        return flag;
    }
     return {
         pageInit: pageInit,
         // fieldChanged: fieldChanged,
         // postSourcing: postSourcing,
         // sublistChanged: sublistChanged,
         // lineInit: lineInit,
         // validateField: validateField,
        //  validateLine: validateLine,
         // validateInsert: validateInsert,
         // validateDelete: validateDelete,
        //  saveRecord: saveRecord
        buttonDo:buttonDo,
     };
 });