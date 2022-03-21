/**
 * @Author: zhouyh
 * @Date: 2022-03-21 15:02:33
 * @LastEditors: zhouyh
 * @LastEditTime: 2022-03-21 15:02:34
 * @Description: 允许用于提交CSV文件进行更新记录
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 *
 * filename: sl_hp_submit_csv_file_2_handle.js
 *
 */
 define(['N/record', 'N/search', 'N/ui', 'N/ui/serverWidget', "N/file", "N/runtime", "N/redirect", "N/config", "N/task", "N/url"],
 /**
  * @param{record} record
  * @param{search} search
  * @param{ui} ui
  * @param{serverWidget} serverWidget
  * @param {file} file
  * @param {runtime} runtime
  * @param {redirect} redirect
  * @param {config} config
  * @param {task} task
  * @param {url} url
  */
 function (record, search, ui, serverWidget, file, runtime, redirect, config, task, url) {

   /**
    * 根据user id获取最新的数据
    * @param userId
    * @param number
    * @returns {undefined}
    */
   function getHistoryDataShowByUserId(userId, number) {
     var ret_history_data_arr = [];
     var search_column_arr = [
       search.createColumn({ name: "internalid", sort: search.Sort.DESC, label: "Internal ID"}),
       search.createColumn({name: "custrecord_hp_scus_status", label: "HP_CSV处理状态"}),
       search.createColumn({name: "custrecord_hp_scus_file_id", label: "HP_CSV选择文件Id"}),
       search.createColumn({name: "custrecord_hp_scus_result", label: "HP_CSV处理结果"}),
       search.createColumn({name: "created", label: "Date Created"}),
       search.createColumn({name: "lastmodified", label: "Last Modified"})
     ];
     var customrecord_hp_submit_csv_update_statusSearchObj = search.create({
       type: "customrecord_hp_submit_csv_update_status",
       filters: [],
       columns: search_column_arr
     });
     var ret_index = 0;
     customrecord_hp_submit_csv_update_statusSearchObj.run().each(function(result){
       ret_index += 1;
       if (ret_index <= number) {
         ret_history_data_arr.push({
           "status": result.getText(search_column_arr[1]),
           "statusId": result.getValue(search_column_arr[1]),
           "fileId": result.getValue(search_column_arr[2]),
           "errMsg": result.getValue(search_column_arr[3]),
           "startDate": result.getValue(search_column_arr[4]),
           "endDate": result.getValue(search_column_arr[5]),
         });
         return true;
       }
     });
     return ret_history_data_arr;
   }

   /**
    * 根据文件的id获取文件的URL信息
    * @param history_10_data_arr
    * @returns {undefined}
    */
   function getFileUrlById(history_10_data_arr) {
     var ret_file_id_url_json = {};
     var search_file_arr = [];
     if (history_10_data_arr.length > 0) {
       for (var i = 0; i < history_10_data_arr.length; i++) {
         if (history_10_data_arr[i].fileId) {
           if (search_file_arr.length > 0) {search_file_arr.push("or")};
           search_file_arr.push(["internalid","anyof",history_10_data_arr[i].fileId]);
         }
       }
       // 根据file Id查询URL
       var file_column_arr = [
         search.createColumn({name: "internalid", label: "Internal ID"}),
         search.createColumn({name: "url", label: "URL"}),
         search.createColumn({ name: "name", label: "Name"})
       ];
       var fileSearchObj = search.create({
         type: "file",
         filters: search_file_arr,
         columns: file_column_arr
       });

       fileSearchObj.run().each(function(result){
         var ret_file_id = result.getValue(file_column_arr[0]);
         var ret_file_url = result.getValue(file_column_arr[1]);
         var ret_file_name = result.getValue(file_column_arr[2]);
         if (ret_file_id) {
           ret_file_id_url_json[ret_file_id] = {'url': ret_file_url, "name": ret_file_name};
         }
         return true;
       });
     }
     return ret_file_id_url_json;
   }

   /**
    * 添加历史信息
    * @param form
    * @returns {undefined}
    */
   function addHistoryForm(form) {

     var user_obj = runtime.getCurrentUser();
     var history_10_data_arr = getHistoryDataShowByUserId(user_obj.id, 10);
     // 根据文件id查询到文件的URL
     var file_id_url_json = getFileUrlById(history_10_data_arr);
     var info_sublist = form.addSublist({id: 'info_list', type: serverWidget.SublistType.LIST, label: '最新10条处理记录'});
     var listField1 = info_sublist.addField({id: 'sub_index', label: '序号', type: serverWidget.FieldType.TEXT});
     var listField2 = info_sublist.addField({id: 'sub_start_date', label: '开始时间', type: serverWidget.FieldType.TEXT});
     var listField3 = info_sublist.addField({id: 'sub_end_date', label: '结束时间', type: serverWidget.FieldType.TEXT});
     var listField4 = info_sublist.addField({id: 'sub_status', label: '处理结果', type: serverWidget.FieldType.TEXT});
     var listField5 = info_sublist.addField({id: 'sub_file_name', label: 'CSV文件名', type: serverWidget.FieldType.TEXT});
     var listField6 = info_sublist.addField({id: 'sub_file_url', label: 'CSV文件地址', type: serverWidget.FieldType.URL});
     var listField7 = info_sublist.addField({id: 'sub_err_msg', label: '异常信息', type: serverWidget.FieldType.TEXT});

     listField1.updateDisplayType({displayType: 'inline'});
     listField2.updateDisplayType({displayType: 'inline'});
     listField3.updateDisplayType({displayType: 'inline'});
     listField4.updateDisplayType({displayType: 'inline'});
     listField5.updateDisplayType({displayType: 'inline'});
     listField7.updateDisplayType({displayType: 'inline'});

     for (var i = 0; i < history_10_data_arr.length; i++) {
       info_sublist.setSublistValue({id: 'sub_index', line: i, value: String(i + 1)});
       if (history_10_data_arr[i].startDate) {
         info_sublist.setSublistValue({id: 'sub_start_date', line: i, value: history_10_data_arr[i].startDate});
       }
       if (history_10_data_arr[i].endDate && (history_10_data_arr[i].statusId == 3 || history_10_data_arr[i].statusId == 4)) {
         info_sublist.setSublistValue({id: 'sub_end_date', line: i, value: history_10_data_arr[i].endDate});
       }
       if (history_10_data_arr[i].status) {
         info_sublist.setSublistValue({id: 'sub_status', line: i, value: history_10_data_arr[i].status});
       }
       if (history_10_data_arr[i].fileId && file_id_url_json[history_10_data_arr[i].fileId]) {
         info_sublist.setSublistValue({id: 'sub_file_name', line: i, value: file_id_url_json[history_10_data_arr[i].fileId].name || ' '});
         info_sublist.setSublistValue({id: 'sub_file_url', line: i, value: file_id_url_json[history_10_data_arr[i].fileId].url || ' '});
       }
       if (history_10_data_arr[i].errMsg) {
         info_sublist.setSublistValue({id: 'sub_err_msg', line: i, value: history_10_data_arr[i].errMsg || ' '});
       }
     }

     return form;
   }

   /**
    * create header form and default value
    * @param context
    * @returns {undefined}
    */
   function createDefaultForm(context) {
     var ret_json = {};
     var form = serverWidget.createForm({title: '选择CSV提交处理'});
     form.addFieldGroup({id: 'custpage_operate_group', label: '选择区'});
     var csv_file = form.addField({id: 'custpage_operate_select_csv_file', type: 'file', label: '上传导入文件(CSV格式文件）'});
     csv_file.isMandatory = true;

     form.addSubmitButton({label: '开始处理'});

     // 显示历史十条处理数据
     form = addHistoryForm(form);

     ret_json.form = form;
     return ret_json;
   }

   /**
    * 查找文件夹
    */
   function searchFolderByUserName(userName){
     var folder = '';
     var mix_folder_name = "HpCSVImportFor_"+userName;

     var filters = [];
     var columns = [];
     filters.push(['name','is', mix_folder_name]);
     columns.push(search.createColumn({name: 'internalid'}));

     var thisSearch = search.create({type: 'folder', filters: filters, columns: columns});
     var thisResult = thisSearch.run().getRange({start: 0, end: 10});

     if(thisResult.length>0){
       folder = thisResult[0].getValue(columns[0]);
     } else {
       var folderRecord = record.create({type:'folder'});
       folderRecord.setValue('name', mix_folder_name);
       folder = folderRecord.save();
     }
     return folder;
   }

   /**
    * 创建带提示信息的form页面
    * @param show_msg
    * @returns {undefined}
    */
   function createFormWithMsg(show_msg) {
     var show_msg_form = serverWidget.createForm({title: '提示信息'});
     show_msg_form.addFieldGroup({id: 'custpage_show_msg_group', label: '信息'});
     var msg_field = show_msg_form.addField({id: 'custpage_operate_select_csv_file', type: serverWidget.FieldType.TEXT, label: '信息', container: 'custpage_show_msg_group'});
     msg_field.updateDisplayType({displayType: serverWidget.FieldDisplayType.INLINE});
     msg_field.defaultValue = show_msg;

     var output_url = url.resolveScript({
       scriptId: 'customscript_hp_sub_csv_file_handle_sl',
       deploymentId: 'customdeploy_hp_sub_csv_file_handle_sl',
       returnExternalUrl: false
     });
     show_msg_form.addButton({id: 'custpage_refresh', label: "返回", functionName: "window.open('" + output_url + "','_self');"});

     return show_msg_form;
   }

   /**
    * 检查导入CSV处理状态是否有未结束的状态
    * @returns {undefined}
    */
   function checkCSVRunStatus() {
     var ret_csv_status = "success";
     var customrecord_hp_submit_csv_update_statusSearchObj = search.create({
       type: "customrecord_hp_submit_csv_update_status",
       filters:
         [
           ["custrecord_hp_scus_status","anyof","1", "2"]
         ],
       columns:
         [
           search.createColumn({
             name: "internalid",
             sort: search.Sort.DESC,
             label: "Internal ID"
           }),
           search.createColumn({name: "custrecord_hp_scus_status", label: "HP_CSV处理状态"}),
           search.createColumn({name: "custrecord_hp_scus_file_id", label: "HP_CSV选择文件Id"}),
           search.createColumn({name: "custrecord_hp_scus_result", label: "HP_CSV处理结果"}),
           search.createColumn({name: "created", label: "Date Created"}),
           search.createColumn({name: "lastmodified", label: "Last Modified"})
         ]
     });
     var searchResultCount = customrecord_hp_submit_csv_update_statusSearchObj.runPaged().count;
     if (searchResultCount > 0) {
       ret_csv_status = "fail";
     }
     return ret_csv_status;
   }

   /**
    * Definition of the Suitelet script trigger point.
    *
    * @param {Object} context
    * @param {ServerRequest} context.request - Encapsulation of the incoming request
    * @param {ServerResponse} context.response - Encapsulation of the Suitelet response
    * @Since 2015.2
    */
   function onRequest(context) {
     try {
       if (context.request.method == 'GET') {
         // 检查是否有处理中的数据
         var run_flag = checkCSVRunStatus();
         if (run_flag == "fail") {
           var err_form = createFormWithMsg("数据处理中，请稍后");
           // 显示历史十条处理数据
           err_form = addHistoryForm(err_form);
           context.response.writePage(err_form);
         } else {
           // create header form and set default value from url params
           var ret_json = createDefaultForm(context);
           // create form field dynamic set value
           var form = ret_json.form;
           // return and show form
           context.response.writePage(form);
         }
       } else {
         // 获取上传CSV的信息
         var upload_csv_file = context.request.files.custpage_operate_select_csv_file;

         var file_type = upload_csv_file.fileType;
         var file_size = upload_csv_file.size;
         if (file_type == "CSV" && Number(file_size) <= Number(10*1024*1024)) {
           // 上传文件到系统中去
           var user_obj = runtime.getCurrentUser();
           var folder_id = searchFolderByUserName(user_obj.name);
           var uploadFile = context.request.files.custpage_operate_select_csv_file;
           // uploadFile.name = uploadFile.name;
           uploadFile.folder = folder_id; // 获取文件夹
           uploadFile.encoding = 'GB18030';
           var csv_file_id = uploadFile.save();

           // 创建状态处理记录
           var status_rec = record.create({ type : 'customrecord_hp_submit_csv_update_status'});
           status_rec.setValue("custrecord_hp_scus_status", 1); // 待处理
           status_rec.setValue("custrecord_hp_scus_file_id", csv_file_id);
           var status_rec_id = status_rec.save(true, true);
           log.debug("生成的状态处理记录id", status_rec_id);
           // 调用异步处理程序
           var createTask = task.create({
             taskType: task.TaskType.SCHEDULED_SCRIPT,
             scriptId: 'customscript_hp_csv_handle_rec_ss'
           });
           createTask.submit();
           redirect.toSuitelet({scriptId: 'customscript_hp_sub_csv_file_handle_sl',deploymentId: 'customdeploy_hp_sub_csv_file_handle_sl'});
         } else {
           // 校验不符合
           var err_msg = "校验出错：";
           if (file_type != "CSV") {
             err_msg += "上传文件类型是:"+file_type+",不是要求的CSV文件;"
           }
           if (Number(file_size) > Number(10*1024*1024)) {
             err_msg += "上传文件大小:"+file_size+"超过了10M"
           }
           var err_form = createFormWithMsg(err_msg);
           context.response.writePage(err_form);
         }
       }
     } catch (e) {
       log.error({title: "出错", details: JSON.stringify(e)});
       var err_form = createFormWithMsg(JSON.stringify(e.message));
       context.response.writePage(err_form);
     }
   }

   return {
     onRequest: onRequest
   };

 });

