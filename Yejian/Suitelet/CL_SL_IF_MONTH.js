/**
 * 2021/12/9 当月出货数量
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */
 define(['N/search', 'N/ui/serverWidget', 'N/runtime', 'N/record', 'N/file', 'N/redirect', 'N/task', 'N/query','N/http','N/format','N/currency'],

 function(search, serverWidget, runtime, record, file, redirect, task, query, http,format,currencyRate) {

     /**
      * Definition of the Suitelet script trigger point.
      *
      * @param {Object} context
      * @param {ServerRequest} context.request - Encapsulation of the incoming request
      * @param {ServerResponse} context.response - Encapsulation of the Suitelet response
      * @Since 2015.2
      */
     function onRequest(context) {
        log.debug('request.parameters',JSON.stringify(context.request.parameters));
        var parameters = context.request.parameters;
        log.debug('request.method',context.request.method);
        var form = createForm(context,parameters);
        if(context.request.method == 'GET'){
            //获取页面数据
            var all_data = getCheckSublistValue(context);
            //对表单赋值
            form = setFieldToForm(form,parameters,context.request.method);
            context.response.writePage(form);
        }
        else{
            log.debug('post parm',parameters);
            //获取页面数据
            var all_data = getCheckSublistValue(context);
            if(all_data.length > 0){
                //对表单赋值
                form = setFieldToForm(form,parameters,all_data,context.request.method);

                context.response.writePage(form);
            }
        }
     }
    function getCheckSublistValue(context) {
        log.debug('request',context.request);
        var all_data = new Object();
        var month_value = context.request.custpage_month;
        var start_date = context.request.custpage_createdate;
        var end_date = context.request.custpage_enddate;
        log.debug('month_value',month_value);
        all_data.month_value = month_value;
        all_data.start_date = start_date;
        all_data.end_date = end_date;


        log.debug('all_data',all_data);
        return all_data;
    }
     function createForm(context,parameters) {
         var field_list = [
             {
                 "id":'custpage_createdate',
                 "type":serverWidget.FieldType.DATE,
                 "label":'起始日期',
                 "source":'',
                 "group":'custpage_check'
             },
             {
                 "id":'custpage_enddate',
                 "type":serverWidget.FieldType.DATE,
                 "label":'结束日期',
                 "source":'',
                 "group":'custpage_check',
             },
             {
                "id":'custpage_month',
                "type":serverWidget.FieldType.SELECT,
                "label":'月份',
                "source":'',
                "group":'custpage_check'
             },
         ]
         var sublist_field_list = [
             //flag:1  text；2  checkbox；3 edit text
            {
                'id':'custpage_sku_num',
                'type':serverWidget.FieldType.TEXT,
                'label':'产品数量',
                'flag':'1',
            },
            {
                'id':'custpage_order_num',
                'type':serverWidget.FieldType.TEXT,
                'label':'订单数量',
                'flag':'1',
            },
         ];
         /**form主体信息 */
         var form = serverWidget.createForm({
             title: '每月出货统计表',
         });
         form.clientScriptModulePath = 'SuiteScripts/Client/CL_CS_VB_PARAMETERS.js';//关联客户端脚本
         //生成按钮
        // form.addSubmitButton({
        //     label: '查询'
        // });
         //查询按钮
         form.addButton({
             id:'custpage_check_button',
             label: '查询',
             functionName:'search'
         });
         //刷新按钮
         form.addButton({
             id:'custpage_refresh_button',
             label:'刷新',
             functionName:'refreshOrder',
         })
         //查询条件
         form.addFieldGroup({
             id: 'custpage_check',
             label: '查询条件',
         });
         //屏幕遮罩
         let hidden_field = form.addField({
            id: 'hidden_info',
            type: serverWidget.FieldType.INLINEHTML,
            label: '屏幕遮罩'
        });
        //hidden_field.updateDisplayType({displayType : serverWidget.FieldDisplayType.HIDDEN});
        // hidden_field.defaultValue =
        //     '<div id="timeoutblocker" style="position: absolute; z-index: 10000; top: 0px; left: 0px; height: 100%; width: 100%; margin: 5px 0px; background-color: rgb(155, 155, 155); opacity: 0.6;"><span style="width:100%;height:100%;line-height:700px;text-align:center;display:block;font-weight: bold; color: #ff4800">加载中，请稍候 ... </span></div>';
         //主体字段
         for(var i = 0;i < field_list.length;i++){
             var field;
             if(field_list[i].id == 'custpage_month'){
                field = form.addField({
                    id:field_list[i].id,
                    type:field_list[i].type,
                    label:field_list[i].label,
                    source:field_list[i].source,
                    container:field_list[i].group
                });
                if(parameters.month == 1){
                    field.addSelectOption({
                        value:'1',
                        text:'本月',
                        isSelected: true,
                    });
                }
                else{
                    field.addSelectOption({
                        value:'1',
                        text:'本月',
                    });
                }
                if(parameters.month == 2){
                    field.addSelectOption({
                        value:'2',
                        text:'上月',
                        isSelected: true,
                    });
                }
                else{
                    field.addSelectOption({
                        value:'2',
                        text:'上月',
                    });
                }
                if(parameters.month == 3){
                    field.addSelectOption({
                        value:'3',
                        text:'上上月',
                        isSelected: true
                    });
                }
                else{
                    field.addSelectOption({
                        value:'3',
                        text:'上上月'
                    });
                }
             }
             else{
                field = form.addField({
                    id:field_list[i].id,
                    type:field_list[i].type,
                    label:field_list[i].label,
                    source:field_list[i].source,
                    container:field_list[i].group
                });
             }
         }
         //子列表字段
         var sublist = form.addSublist({
            id:'custpage_sublist',
            type:serverWidget.SublistType.LIST,
            label:'查询信息'
         });
         sublist.addMarkAllButtons();
        //  sublist.addRefreshButton();
         for(var j = 0;j < sublist_field_list.length;j++){
            if(sublist_field_list[j].flag == "1" || sublist_field_list[j].flag == "2"){
                sublist.addField({
                    id:sublist_field_list[j].id,
                    type:sublist_field_list[j].type,
                    label:sublist_field_list[j].label,
                });
            }
            else if(sublist_field_list[j].flag == "3"){
                sublist.addField({
                    id:sublist_field_list[j].id,
                    type:sublist_field_list[j].type,
                    label:sublist_field_list[j].label,
                }).updateDisplayType({
                    displayType:serverWidget.FieldDisplayType.ENTRY,
                });
            }
         }

         return form;
     }
     function setFieldToForm(form,parameters,obj,method) {
        var search_result = doSearch(parameters,obj,method);
        var res = search_result.run().getRange(0,1000);
        log.debug('res',res.length + JSON.stringify(res));

        var out_data = getSumData(res,search_result.columns);
        var sublist_info = form.getSublist('custpage_sublist');
        
        sublist_info.setSublistValue({
            id:'custpage_sku_num',
            value:-out_data.qty_sum,
            line:0,
        });
        sublist_info.setSublistValue({
            id:'custpage_order_num',
            value:out_data.order_list.length,
            line:0,
        });
        
        
        return form;
     }
     function getSumData(res,col){
         var only_arr = new Array();
         var sum = Number(0);
         for(var i = 0;i < res.length;i++){
             if(only_arr.indexOf(res[i].getText('createdfrom')) == -1 && res[i].getText('createdfrom').indexOf('销售') != -1){
                only_arr.push(res[i].getText('createdfrom'));
             }
             sum += Number(res[i].getValue('quantity'));
         }
         log.debug('only_arr',only_arr);
         
         return { "order_list" : only_arr , "qty_sum" : sum};
     }
     function doSearch(params,obj,method) {
        var mySearch = search.create({
            type:'itemfulfillment',
            columns:[
                {name:'internalid',sort:search.Sort.ASC},
                'item',
                'quantity',
                'createdfrom',
            ]
        });
        var filters = [];
        //起始时间  ，结束时间
        log.debug('createdate enddate',params.createdate + '---' + params.enddate);
        if(params.createdate && params.enddate){
            if(filters.length > 0){
                filters[filters.length] = 'AND';
                filters[filters.length] = ['datecreated','onorafter',params.createdate];
                filters[filters.length] = 'AND';
                filters[filters.length] = ['datecreated','onorbefore',params.enddate];
            }
            else{
                filters[filters.length] = ['datecreated','onorafter',params.createdate];
                filters[filters.length] = 'AND';
                filters[filters.length] = ['datecreated','onorbefore',params.enddate];
            }
        }
        else if(params.createdate || params.enddate){
            if(params.createdate){
                if(filters.length > 0){
                    filters[filters.length] = 'AND';
                    filters[filters.length] = ['datecreated','on',params.createdate];
                }
                else{
                    filters[filters.length] = ['datecreated','on',params.createdate];
                }
            }
            if(params.enddate){
                if(filters.length > 0){
                    filters[filters.length] = 'AND';
                    filters[filters.length] = ['datecreated','on',params.enddate];
                }
                else{
                    filters[filters.length] = ['datecreated','on',params.enddate];
                }
            }
        }
        // else if(params.month == 1){
        //     filters[filters.length] = ['datecreated','within',['thismonth']];//本月
        // }
        else if(params.month == 2){
            filters[filters.length] = ['datecreated','within',['lastmonth']];//上月
        }
        else if(params.month == 3){
            filters[filters.length] = ['datecreated','within',['monthbeforelast']];//上上个月
        }else{
            filters[filters.length] = ['datecreated','within',['thismonth']];//本月
        }
        if(filters.length > 0){
            filters[filters.length] = 'AND';
            filters[filters.length] = ['mainline','is',false];
            filters[filters.length] = 'AND';
            filters[filters.length] = ['taxline','is',false];
            filters[filters.length] = 'AND';
            filters[filters.length] = ['account','anyof',231];      //1406 库存货品
            mySearch.filterExpression = filters;
            log.debug('filterExpression',JSON.stringify(mySearch.filterExpression));
        }
        
        return mySearch;
     }
     return {
         onRequest: onRequest
     };

 });