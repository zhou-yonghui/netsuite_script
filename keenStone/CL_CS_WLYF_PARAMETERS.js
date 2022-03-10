/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope public
 */
 define(['N/currentRecord','N/format','N/url','N/record','N/search','N/https'],
 /**
  * @param {currency} currency
  */
 function(currentRecord,format,urls,record,mysearch,https) {
     
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

        var wls = record.getValue('custpage_wlgys_1');//物流商
        if(wls){
            wls = encodeURIComponent(wls);
            url = changeURLArg(url,'wls',wls);
        }
        var currency = record.getValue('custpage_currency');//币种
        if(currency){
            currency = encodeURIComponent(currency);
            url = changeURLArg(url,'cur',currency);
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
        //  url = changeURLArg(url,'nowPage','0');
         // search_this = ToCDB(search_this);//全角转半角
         
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
        var url = "https://5784666-sb1.app.netsuite.com/app/site/hosting/scriptlet.nl?script=248&deploy=1";//测试
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
         var thisRecord = scriptContext.currentRecord;
         var allLine =thisRecord.getLineCount('custpage_sublist');
         var flag = 1;
         var flag2 = 1;
         var flag_arr = new Array();
         var sub_arr = new Array();
         var yl_id_arr = 's';
         for(var i=0;i<allLine;i++){
             var check = thisRecord.getSublistValue({sublistId: 'custpage_sublist',fieldId: 'custpage_check_sub',line: i});
             var rec_id = thisRecord.getSublistValue({sublistId: 'custpage_sublist',fieldId:'custpage_ordernumber_id',line:i});
             var yl_id = thisRecord.getSublistValue({sublistId:'custpage_sublist',fieldId:'custpage_yl_id',line:i});
             var sub = thisRecord.getSublistValue({sublistId:'custpage_sublist',fieldId:'custpage_sub',line:i});
             if(check == true){
                flag = 2;
                flag_arr.push(flag);
                yl_id_arr = yl_id_arr + '+' + yl_id;
                if(rec_id){
                    // var rec_sub = checkSubsidiary(rec_id);
                    sub_arr.push(sub);
                }
             }
         }
         for(var n = 0;n < flag_arr.length;n++){
            if(flag == 2){
                flag2 = 2;
                break;
            }
         }
         if(flag2 == 1){
            alert('至少勾选一条物流预录单!!');
            return false;
         }
         for(var j = 0;j < sub_arr.length;j++){
             if(sub_arr[0] != sub_arr[j]){
                 alert('勾选的单据子公司不同，请重新勾选！！');
                 return false;
             }
         }
        //  alert('没有报错');
         var create_url = urls.resolveScript({
                scriptId: 'customscript_cl_sl_createbill',    //物流预录批量生成账单 
                deploymentId: 'customdeploy_cl_sl_createbill'
         });
         var headers = {
                "Content-Type": "application/json;charset=utf-8",
                "Accept": "application/json"
         }
        //  alert(yl_id_arr);

         var response = https.post({
                url: create_url,
                body: {
                    recordId: yl_id_arr + '+' + thisRecord.getValue('custpage_memo'),
                },
                headers: headers
         });
         if(response.body == 'N'){
             alert('生成账单出错！！');
             return false;
         }
         else{
             alert('生成账单成功！！');
         }
         return true;
     }
     function checkSubsidiary(id) {
        if(id && id != '暂无单号'){
            var subsidiary;
            var my_search = mysearch.create({
                type:'purchaseorder',
                filters:[['internalid','is',id]],
            });
            var res = my_search.run().getRange(0,1);
            if(res.length > 0){
                var po_rec = record.load({
                    type:'purchaseorder',
                    id:id,
                    isDynamic:true,
                });
                subsidiary = po_rec.getValue('subsidiary');
            }else{
                var to_rec = record.load({
                    type:'transferorder',
                    id:id,
                    isDynamic:true,
                });
                subsidiary = to_rec.getValue('subsidiary');
            }
            return subsidiary;
         }
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
         console.log('scriptContext.fieldId:'+scriptContext.fieldId);
         if(scriptContext.sublistId == 'info_list' && scriptContext.fieldId == 'custpage_sendquantity'){
            
             var quantity = currentRecord.getCurrentSublistValue({sublistId: 'info_list',fieldId: 'custpage_sendquantity'});
             var cansendquantity = currentRecord.getCurrentSublistValue({sublistId: 'info_list',fieldId: 'custpage_cansendquantity2'});
             var select = currentRecord.getCurrentSublistValue({sublistId: 'info_list',fieldId: 'sublist_select'});
             //console.log('quantity'+quantity);
             //console.log('cansendquantity'+cansendquantity);
 
             if(Number(quantity) > Number(cansendquantity)){
                 alert('送货数量不能大于'+cansendquantity);
                 if(select){
                     //var quantity = currentRecord.getCurrentSublistValue({sublistId: 'info_list',fieldId: 'custpage_sendquantity'});
                     currentRecord.setCurrentSublistValue({sublistId: 'info_list',fieldId: 'custpage_sendquantity',value: cansendquantity});
                 }
                 //currentRecord.setCurrentSublistValue({sublistId: 'info_list',fieldId: 'custpage_sendquantity',value: ''});
                 return true
             }
 
 
             if(!select && Number(quantity)>0){
                 currentRecord.setCurrentSublistValue({sublistId: 'info_list',fieldId: 'sublist_select',value: true});
             }/*else if(select){
                 currentRecord.setCurrentSublistValue({sublistId: 'info_list',fieldId: 'sublist_select',value: false});
             }*/
         }
 
         if(scriptContext.sublistId == 'info_list' && scriptContext.fieldId == 'sublist_select'){
             var select = currentRecord.getCurrentSublistValue({sublistId: 'info_list',fieldId: 'sublist_select'});
             var quantity = currentRecord.getCurrentSublistValue({sublistId: 'info_list',fieldId: 'custpage_sendquantity'});
             var cansendquantity = currentRecord.getCurrentSublistValue({sublistId: 'info_list',fieldId: 'custpage_cansendquantity2'});
             
             if(select && (!Number(quantity) || Number(quantity) <= 0)){
                 alert('送货数量必须大于0');
                 currentRecord.setCurrentSublistValue({sublistId: 'info_list',fieldId: 'sublist_select',value: false});
             }else if(!select){
                 currentRecord.setCurrentSublistValue({sublistId: 'info_list',fieldId: 'custpage_sendquantity',value: ''});
             }
             console.log('select'+select);
             if(quantity > cansendquantity){
                 alert('送货数量不能大于'+cansendquantity);
                 currentRecord.setCurrentSublistValue({sublistId: 'info_list',fieldId: 'custpage_sendquantity',value: '0'});
                 currentRecord.setCurrentSublistValue({sublistId: 'info_list',fieldId: 'sublist_select',value: false});
                 return true
             }
         }
         //获取勾选的行数
         var thisAllSelectLine = getSelectLine(currentRecord);
         document.getElementById('show_run_lable').value='已标记'+thisAllSelectLine+'条';
         return true;
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
        //  fieldChanged:fieldChanged,
         saveRecord:saveRecord,
         returnPage:returnPage,
         selectAll:selectAll,
         unselectAll:unselectAll
         //pass:pass,
         //refuse:refuse
     };
     
 });