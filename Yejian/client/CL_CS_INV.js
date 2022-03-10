/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope public
 */
 define(['N/currentRecord','N/format','N/url','N/record','N/search','N/https','N/runtime'],
 /**
  * @param {currency} currency
  */
 function(currentRecord,format,urls,record,mysearch,https,runtime) {
     
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
 
 
     //界面搜索
     function search(){
         var url = window.location.href;
         var record = currentRecord.get();

        var gys = record.getValue('custpage_vendor');//供应商
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
        var employee = record.getValue('custpage_employee');//业务员
        if(employee){
            employee = encodeURIComponent(employee);
            url = changeURLArg(url,'employee',employee);
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
        var month_flag = record.getValue('custpage_month');//月份
        if(month_flag){
            month = encodeURIComponent(month_flag);
            url = changeURLArg(url,'month',month);
        }
        //  url = changeURLArg(url,'nowPage','0');
         // search_this = ToCDB(search_this);//全角转半角
         
         setWindowChanged(window, false);
         window.location.href = url;
     
     }
     //刷新
     function refreshOrder(){
        var url = 'https://7373203.app.netsuite.com/app/site/hosting/scriptlet.nl?script=98&deploy=1';//测试
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
             if(check == true){
                flag2 = 2;
                break;                
             }
         }
         if(flag2 == 1){
            alert('至少勾选一条发票明细!!');
            return false;
         }
         return true;
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
            var vendor_type = record.load({type:'vendor',id:currentRecord.getValue('custpage_vendor')}).getValue('custentity_rm_supplier_type');
            // alert(vendor_type);
            if(role_flag == 'Y' && vendor_type != '4'){
                alert('物流角色不能查看非物流类型的供应商数据，请修改供应商');
            }
            else if(role_flag == 'N' && vendor_type == '4'){
                alert('非物流角色不能查看物流类型的供应商数据，请修改供应商');
            }
         }
     }
 
     return {
        //  pageInit:pageInit,
        //  search:search,
        refreshOrder:refreshOrder,
        //  fieldChanged:fieldChanged,
         saveRecord:saveRecord,
     };
     
 });