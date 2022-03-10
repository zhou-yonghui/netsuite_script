/**
 * 公共客户端脚本文件
 * CL_CS_UNTIL.js
 *@NApiVersion 2.x
 */
//*@NScriptType ClientScript
define(['N/error','N/search','N/format','N/currentRecord','N/currency','N/record','N/url','N/https'],
    function(error,search,format,currentRecord,currencyRate,record,url,https) {
        function pageInit(context) {

        }
        function autoApproval(soData) {
            var rec = currentRecord.get();
            // alert(JSON.stringify(''));
            if(soData == 1){
                alert('订单金额大于消费品限制金额');
            }else if(soData == 2){
                alert('订单总额不等于到款总额');
            }else if(soData == 3){
                alert('偏远地区');
            }else if(soData == 4){
                alert('保险选项不对')
            }else if(soData == 5){
                alert('网单保险金额不同')
            }else if(soData == 6){
                alert('网单运费金额不同')
            }else if(soData == 7){
                alert('网单paypal金额不同')
            }else if(soData == 1000){
                alert('不允许只选费用货品')
            }else if(soData == 100){
                alert('此货品是普通货品，不能点击此按钮审批')
            }else if(soData == 101){
                alert('请检查明细货品库存');
            }
            else{
                var create_url = url.resolveScript({
                    scriptId:'customscript_cl_sl_autoapproval',    //TODO:销售订单自动审核脚本
                    deploymentId:'customdeploy_cl_sl_autoapproval'
                });
                var headers = {
                    "Content-Type":"application/json;charset=utf-8",
                    "Accept":"application/json"
                }
                var response = https.post({
                    url:create_url,
                    body:{
                        recordId: rec.id,
                    },
                    headers:headers
                });
                if(response.body == 'Y'){
                    alert('自动审核通过');
                    window.location.replace('https://7373203.app.netsuite.com/app/accounting/transactions/salesord.nl?id='+ rec.id +'&whence=');
                }else {
                    alert('自动审核失败');
                }
            }
        }
        //打印PI,CI,PL的pdf模板,报价单pdf模板
        function reportExcel(flag) {
            var rec = currentRecord.get();
            //alert(JSON.stringify(rec));
            var create_url = url.resolveScript({
                scriptId: 'customscript_cl_sl_report',    //
                deploymentId: 'customdeploy_cl_sl_report'
            });
            var headers = {
                "Content-Type": "application/json;charset=utf-8",
                "Accept": "application/json"
            }
            var response = https.post({
                url: create_url,
                body:{
                    recordId: rec.id,
                    recordType: rec.type,
                    poFlag : flag,
                },
                headers:headers
            });
            // log.debug(
            //     response.body
            // )
            if(response.body == 'Y_1'){
                alert('打印成功');
                window.location.replace('https://7373203.app.netsuite.com/app/common/custom/custrecordentry.nl?rectype=32&id=' + rec.id);//报价打印单
            }
            else if(response.body == 'Y_2'){
                alert('打印成功');
                window.location.replace('https://7373203.app.netsuite.com/app/common/custom/custrecordentry.nl?rectype=34&id=' + rec.id);//模板打印单
            }
            else if(response.body == 'Y_3'){
                alert('打印成功');
                window.location.replace('https://7373203.app.netsuite.com/app/accounting/transactions/itemship.nl?id=' + rec.id);//发货单
            }
            else if(response.body == 'Y_4' ){
                alert('打印成功');
                window.location.replace('https://7373203.app.netsuite.com/app/accounting/transactions/purchord.nl?id=' + rec.id + '&whence=');//采购订单
            }
            else if(response.body == 'Y_5'){
                alert('打印出货单成功');
                // window.location.replace('https://7373203.app.netsuite.com/app/accounting/transactions/salesord.nl?id=6470&whence=');//销售订单
                window.location.replace('https://7373203.app.netsuite.com/app/accounting/transactions/salesord.nl?id='+ rec.id +'&whence=');//销售订单
            }
            else if(response.body == 'N'){
                alert('生成打印文件出错,请检查');
            }
        }
        function returnDktz(){
            var rec = currentRecord.get();
            var dktz_id = rec.getValue('custrecord_cl_laiyuan_dktz');//来源到款通知
            if(dktz_id){
                // window.open('https://7373203.app.netsuite.com/app/common/custom/custrecordentry.nl?rectype=5&id='+ dktz_id + '&e=T');//TODO:跳转到款通知单页面，参数e=T代表编辑状态
                window.open('https://7373203.app.netsuite.com/app/common/custom/custrecordentry.nl?rectype=5&id='+ dktz_id);
            }
            else {
                alert('没有来源到款通知单，请检查再试');
            }
        }
        function toRl(){
            var rec = currentRecord.get();
            var if_yz = record.load({id:rec.getValue('custrecord_sl_fkfs'),type:'customrecord_sl_glfkfs',isDynamic:true}).getValue('custrecord_pm_need_verification');
            var sell_bh = rec.getValue('custrecord_sl_mjbh');//
            var xyyz = rec.getValue('custrecord_sl_xyyz');//
            var xy_memo = rec.getValue('custrecord_sl_dk_khxybz');//
            var dk_status = rec.getValue('custrecord_sl_dkzt');
            var order_qk = rec.getValue('custrecord_sl_ddsm');//
            if(dk_status == 3 && (order_qk == '' || order_qk == null)){
                alert('待定状态下订单情况必填');
            }
            else if(if_yz == true && sell_bh == false && xyyz == false){
                alert('付款方式是设置了”需要验证“的”付款方式“，且如果到款通知”卖家保护“没有勾选，则要求”信用验证“必须勾选');
            }
            else if(if_yz == true && sell_bh == false && xyyz == true && !xy_memo){
                alert('付款方式是设置了”需要验证“的”付款方式“，且如果到款通知”卖家保护“没有勾选，则要求”信用验证“必须勾选，且“客户信用验证备注”必须选择值');
            }
            else {
                var create_url = url.resolveScript({
                    scriptId: 'customscript_cl_sl_dkrl',    //
                    deploymentId: 'customdeploy_cl_sl_dkrl'
                });
                var headers = {
                    "Content-Type": "application/json;charset=utf-8",
                    "Accept": "application/json"
                }
                var response = https.post({
                    url: create_url,
                    body:{
                        recordId: rec.id,
                        recordType: rec.type,
                        soId:rec.getValue('custrecord_sl_xsdd'),
                        dkAmount:rec.getValue('custrecord_sl_dkje'),
                        tkAmount:rec.getValue('custrecord_sl_tkje')
                    },
                    headers:headers
                });
                if(response.body == 'Y'){
                    window.location.replace('https://7373203.app.netsuite.com/app/common/custom/custrecordentry.nl?rectype=5&id=' + rec.id);
                }
                else{
                    alert('认领失败');
                }
            }
        }
        function saveRecord(context) {

        }
        return {
            pageInit: pageInit,
            autoApproval: autoApproval,
            reportExcel: reportExcel,
            returnDktz:returnDktz,
            // toRl:toRl,
            //  saveRecord: saveRecord,
        };
    });