/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope public
 */
 define(['N/currentRecord','N/format','N/url','N/record','N/search','N/https','N/runtime'],
 /**
  * @param {currency} currency
  */
 function(currentRecord,format,urls,recordN,mysearch,https,runtime) {
     
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
         document.getElementById('timeoutblocker').remove();
      }
 
      //返回
     function returnPage(){
          var getUrl = urls.resolveScript({
             scriptId: 'customscript_hp_delivery_notice',
             deploymentId: 'customdeploy_hp_delivery_notice',
             returnExternalUrl: false
         });
         setWindowChanged(window, false);//+ "&seltype=" + selType
         window.location.href = getUrl;
     }
 
 
     //界面搜索
     function search(){
         var url = window.location.href;
         var record = currentRecord.get();

         var gys_flag = 'Y';
         var gys = record.getValue('custpage_vendor');//供应商
         var role = runtime.getCurrentUser().role;
         var role_flag = checkRole(role);
         if(gys){
             var vendor_type = recordN.load({type:'vendor',id:gys}).getValue('custentity_rm_supplier_type');
             if(role_flag == 'Y' && vendor_type != '2' && role != 3){
                 alert('物流角色不能查看非物流类型的供应商数据，请修改供应商');
                 gys_flag = 'N';
             }
             else if(role_flag == 'N' && vendor_type == '2' && role != 3){
                 alert('非物流角色不能查看物流类型的供应商数据，请修改供应商');
                 gys_flag = 'N';
             }
         }
         if(gys_flag == 'Y'){
             if(gys){
                 gys = encodeURIComponent(gys);
                 url = changeURLArg(url,'gys',gys);
             }
             var sub = record.getValue('custpage_subsidiary');//附属公司
             if(sub){
                 sub = encodeURIComponent(sub);
                 url = changeURLArg(url,'sub',sub);
             }
             var cur = record.getValue('custpage_currency');//币种
             if(cur){
                 cur = encodeURIComponent(cur);
                 url = changeURLArg(url,'cur',cur);
             }
             var iv_no = record.getValue('custpage_invoice');//发票号码
             if(iv_no){
                 iv_no = encodeURIComponent(iv_no);
                 url = changeURLArg(url,'iv',iv_no);
             }
             var acc = record.getValue('custpage_account');//科目
             if(acc){
                 acc = encodeURIComponent(acc);
                 url = changeURLArg(url,'acc',acc);
             }
             var s_due = record.getValue('custpage_s_duedate');//起始到期日期
             if(s_due){
                 s_due = format.format({
                     value: s_due,
                     type: format.Type.DATE,
                     timezone:format.Timezone.ASIA_HONG_KONG
                 });
                 s_due = encodeURIComponent(s_due);
                 url = changeURLArg(url,'sduedate',s_due);
             }
             var e_due = record.getValue('custpage_s_duedate');//结束到期日期
             if(e_due){
                 e_due = format.format({
                     value: e_due,
                     type: format.Type.DATE,
                     timezone:format.Timezone.ASIA_HONG_KONG
                 });
                 e_due = encodeURIComponent(e_due);
                 url = changeURLArg(url,'eduedate',e_due);
             }
             var createdate = record.getValue('custpage_createdate');//起始日期
             var enddate = record.getValue('custpage_enddate');//结束日期

             if(createdate){
                 createdate = format.format({
                     value: createdate,
                     type: format.Type.DATE,
                     timezone:format.Timezone.ASIA_HONG_KONG
                 });
                 createdate = encodeURIComponent(createdate);
                 url = changeURLArg(url,'createdate',createdate);
             }
             if(enddate){
                 enddate = format.format({
                     value: enddate,
                     type: format.Type.DATE,
                     timezone:format.Timezone.ASIA_HONG_KONG
                 });
                 enddate = encodeURIComponent(enddate);
                 url = changeURLArg(url,'enddate',enddate);
             }
             setWindowChanged(window, false);
             window.location.href = url;
         }
     }
    function createVpButton(){
         var submit = 'y';
         submit = encodeURIComponent(submit);
         url = changeURLArg(url,'submit',submit);
         setWindowChanged(window, false);
         window.location.href = url;
    }
     //url上拼接参数
     function changeURLArg(url,arg,arg_val){ 
         var pattern=arg+'=([^&]*)'; 
         var replaceText=arg+'='+arg_val; 
         if(url.match(pattern)){ 
         var tmp='/('+ arg+'=)([^&]*)/gi'; 
         tmp=url.replace(eval(tmp),replaceText); 
         return tmp; 
         }else{ 
         if(url.match('[\?]')){ 
         return url+'&'+replaceText; 
         }else{ 
         return url+'?'+replaceText; 
         } 
         } 
         return url+'\n'+arg+'\n'+arg_val; 
     }
 
     //全角转换为半角
     function ToCDB(str) { 
         str = str.replace("。",".");
         var tmp = ""; 
         for(var i=0;i<str.length;i++){ 
             if (str.charCodeAt(i) == 12288){
                 tmp += String.fromCharCode(str.charCodeAt(i)-12256);
                 continue;
             }
             if(str.charCodeAt(i) > 65280 && str.charCodeAt(i) < 65375){ 
                 tmp += String.fromCharCode(str.charCodeAt(i)-65248); 
             } 
             else{ 
                 tmp += String.fromCharCode(str.charCodeAt(i)); 
             } 
         } 
         return tmp 
     }
 
     //下一页
     function nextPage(page){
         var url = window.location.href;
         url = changeURLArg(url,'nowPage',page);
         setWindowChanged(window, false);//+ "&seltype=" + selType
         window.location.href = url;
     }
 
     //刷新
     function refresh(){
        //  var url = 'https://5784666.app.netsuite.com/app/site/hosting/scriptlet.nl?script=248&deploy=1';//正式
         var url = 'https://6797408-sb1.app.netsuite.com/app/site/hosting/scriptlet.nl?script=147&deploy=1';//测试
         window.location.href = url;
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
        //  var role = runtime.getCurrentUser().role;
         var thisRecord = scriptContext.currentRecord;
         var allLine =thisRecord.getLineCount('custpage_sublist');
         var iv_no = thisRecord.getValue('custpage_invoice');//发票号码
         var vendor = thisRecord.getValue('custpage_vendor');//供应商
         var currency = thisRecord.getValue('custpage_currency');//币种
         var account = thisRecord.getValue('custpage_account');//科目
        //  var role_flag = checkRole(role);
         var flag = 1;
         var flag2 = 1;
         var flag_arr = new Array();
         var sub_arr = new Array();
         var yl_id_arr = 's';
         var credit_flag = 'Y';
         var amount_sum = Number(0);
         for(var i=0;i<allLine;i++){
             var check = thisRecord.getSublistValue({sublistId: 'custpage_sublist',fieldId: 'custpage_check_sub',line: i});
             var yl_id = thisRecord.getSublistValue({sublistId:'custpage_sublist',fieldId:'custpage_internalid',line:i});
             var zk_amount = thisRecord.getSublistValue({sublistId: 'custpage_sublist',fieldId:'custpage_amount_zk',line:i});
             var pay_amount = thisRecord.getSublistValue({sublistId: 'custpage_sublist',fieldId:'custpage_amount_pay',line:i});
             var file_code = thisRecord.getSublistValue({sublistId: 'custpage_sublist',fieldId:'custpage_ordercode',line:i});
             var file_code_text = thisRecord.getSublistText({sublistId: 'custpage_sublist',fieldId:'custpage_ordercode',line:i});
             var amount_pay = thisRecord.getSublistValue({sublistId: 'custpage_sublist',fieldId:'custpage_amount_pay',line:i});
             if(check == true){
                flag = 2;
                flag_arr.push(flag);
                if(!zk_amount){
                    zk_amount = 0;
                }
                else if(!pay_amount){
                    pay_amount = 0;
                }
                if(!file_code && amount_pay > 0){
                    credit_flag = Number(i) + Number(1);
                }
                else if(file_code_text.indexOf('BILL') == -1 && amount_pay > 0) {
                    credit_flag = Number(i) + Number(1);
                }
                yl_id_arr = yl_id_arr + 'm' + yl_id + '+' + zk_amount + '+' + pay_amount;
                amount_sum += Number(amount_pay);
             }
         }
         for(var n = 0;n < flag_arr.length;n++){
            if(flag == 2){
                flag2 = 2;
                break;
            }
         }
         if(flag2 == 1){
            alert('至少勾选一条供应商账单!!');
            return false;
         }else{
            if(credit_flag != 'Y'){
                alert('第'+ credit_flag +'行，支付金额不能为正数，请修改');
                return false;
            }
            if(amount_sum < 0){
                alert('勾选行的付款金额总和不能小于0，请检查后再提交！！');
                return false;
            }
            //
            for(var j = 0;j < sub_arr.length;j++){
                if(sub_arr[0] != sub_arr[j]){
                    alert('勾选的单据子公司不同，请重新勾选！！');
                    return false;
                }
            }
        //     var create_url = urls.resolveScript({
        //            scriptId: 'customscript_cl_sl_vb_create_vp',    //供应商账单生成账单付款 
        //            deploymentId: 'customdeploy_cl_sl_vb_create_vp'
        //     });
        //     var headers = {
        //            "Content-Type": "application/json;charset=utf-8",
        //            "Accept": "application/json"
        //     }
        //    //  alert(yl_id_arr);
   
        //     var response = https.post({
        //            url: create_url,
        //            body: {
        //                recordId: yl_id_arr + 'm' + iv_no + '+' + vendor + '+' + currency + '+' + account,
        //            },
        //            headers: headers
        //     });
        //     if(response.body == 'N'){
        //         alert('生成账单付款出错！！');
        //         return false;
        //     }
        //     else{
        //         alert(response.body);
        //         // alert('https://6797408-sb1.app.netsuite.com/app/accounting/transactions/vendpymt.nl?id='+ response.body +'&whence=');
        //         // var url = 'https://6797408-sb1.app.netsuite.com/app/common/scripting/script.nl?id=195';
        //         // window.location.href = url;
        //     }
         }
         return true;
     }
     function checkRole(role_id) {
        log.debug('role_id',role_id);
        var flag = 'N';
        if(role_id){
           var role_arr = [1059,1058,1056,1049,1048,1047,1046];
           for(var i = 0;i < role_arr.length;i++){
               if(role_id == role_arr[i]){
                   flag = 'Y';
                   break;
               }
           }
        }
        log.debug('角色',flag);
        return flag;
    }
     //通过
     function pass(){
         var thisRecord = currentRecord.get();
         thisRecord.setValue('search_flag',1);
         jQuery("#submitter").click(); 
     }
 
     //拒绝
     function refuse(){
         var thisRecord = currentRecord.get();
         thisRecord.setValue('search_flag',2);
         jQuery("#submitter").click(); 
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
         var currentRecord = scriptContext.currentRecord;
        //  alert(currentRecord.fieldId);
         if(scriptContext.fieldId == 'custpage_vendor'){
            var role = runtime.getCurrentUser().role;
            // alert(role);
            var role_flag = checkRole(role);
            // alert(role_flag);
             if(currentRecord.getValue('custpage_vendor')){
                 var vendor_type = recordN.load({type:'vendor',id:currentRecord.getValue('custpage_vendor')}).getValue('custentity_rm_supplier_type');
                 // alert(vendor_type);
                 if(role_flag == 'Y' && vendor_type != '2' && role != 3){
                     alert('物流角色不能查看非物流类型的供应商数据，请修改供应商');
                 }
                 else if(role_flag == 'N' && vendor_type == '2' && role != 3){
                     alert('非物流角色不能查看物流类型的供应商数据，请修改供应商');
                 }
             }
         }
     }
 
     function getSelectLine(thisRecord){
         var allLine = thisRecord.getLineCount({sublistId: 'info_list'});
         var thisAllSelectLine = 0;
         for(var i=0;i<allLine;i++){
             thisRecord.selectLine({sublistId: 'info_list',line: i});
             var select = thisRecord.getCurrentSublistValue({sublistId: 'info_list',fieldId: 'sublist_select'});
             if(select){
                 thisAllSelectLine++;
             }
         }
         return thisAllSelectLine;
     }
 
     //全选
     function selectAll(){
         var thisRecord = currentRecord.get();
         var allLine = thisRecord.getLineCount({sublistId: 'info_list'});
         for(var i=0;i<allLine;i++){
             thisRecord.selectLine({sublistId: 'info_list',line: i});
             thisRecord.setCurrentSublistValue({sublistId: 'info_list',fieldId: 'sublist_select',value:true,ignoreFieldChange:true});
             var cansendquantity = thisRecord.getCurrentSublistValue({sublistId: 'info_list',fieldId: 'custpage_cansendquantity2'});
             var quantity = thisRecord.getCurrentSublistValue({sublistId: 'info_list',fieldId: 'custpage_sendquantity'});
             if(Number(quantity) == 0 || Number(quantity)>Number(cansendquantity)){
                 thisRecord.setCurrentSublistValue({sublistId: 'info_list',fieldId: 'custpage_sendquantity',value:cansendquantity,ignoreFieldChange:true});
             }
             thisRecord.commitLine({sublistId: 'info_list'});
         }
         document.getElementById('show_run_lable').value='已标记'+allLine+'条';
     }
 
     //取消全选
     function unselectAll(){
         var thisRecord = currentRecord.get();
         var allLine = thisRecord.getLineCount({sublistId: 'info_list'});
         for(var i=0;i<allLine;i++){
             thisRecord.selectLine({sublistId: 'info_list',line: i});
             thisRecord.setCurrentSublistValue({sublistId: 'info_list',fieldId: 'sublist_select',value:false,ignoreFieldChange:true});
             thisRecord.setCurrentSublistValue({sublistId: 'info_list',fieldId: 'custpage_sendquantity',value:'',ignoreFieldChange:true});
             thisRecord.commitLine({sublistId: 'info_list'});
         }
         document.getElementById('show_run_lable').value='已标记0条';
     }
 
     return {
         pageInit:pageInit,
         search:search,
         refresh:refresh,
         nextPage:nextPage,
         fieldChanged:fieldChanged,
         saveRecord:saveRecord,
         returnPage:returnPage,
         selectAll:selectAll,
         unselectAll:unselectAll,
         createVpButton:createVpButton,
         //pass:pass,
         //refuse:refuse
     };
     
 });