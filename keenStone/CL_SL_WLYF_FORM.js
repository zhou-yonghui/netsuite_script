/**
 * 物流运费生成账单
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
        var form = createForm(context,parameters);
        log.debug('request.method',context.request.method);
        if(context.request.method == 'GET'){
            if(parameters.wls || parameters.cur || parameters.createdate || parameters.enddate){
                //对表单赋值
                form = setFieldToForm(form,parameters);
            }
            context.response.writePage(form);
        }
        else{
            //跳转suitelet初始页面
            redirect.toSuitelet({
                scriptId:'customscript_cl_sl_wlfy_to_bill',
                deploymentId: 'customdeploycl_sl_wlyf_to_bill',
            })
            // context.response.writePage(form);
        }
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
                 "label":'结束时间',
                 "source":'',
                 "group":'custpage_check',
             },
             {
                "id":'custpage_wlgys_1',
                "type":serverWidget.FieldType.SELECT,
                "label":'物流供应商',
                "source":'customrecord_cs_cyr_code',//聪石承运人
                "group":'custpage_check'
            },
            {
                "id":'custpage_currency',
                "type":serverWidget.FieldType.SELECT,
                "label":'货币',
                "source":'currency',
                "group":'custpage_check'
            },
            {
                "id":'custpage_memo',
                "type":serverWidget.FieldType.TEXTAREA,
                "label":'账单备注',
                "source":'',
                "group":'custpage_vb_memo'
            },
         ]
         var sublist_field_list = [
            {
                'id':'custpage_check_sub',
                'type':serverWidget.FieldType.CHECKBOX,
                'label':'勾选',
            },
            {
                'id':'custpage_yl_id',
                'type':serverWidget.FieldType.TEXT,
                'label':'预录单id',
            },
            {
                'id':'custpage_ordertype',
                'type':serverWidget.FieldType.TEXT,
                'label':'单据类型',
            },
            {
                'id':'custpage_orderdate',
                'type':serverWidget.FieldType.TEXT,
                'label':'订单创建时间',
            },
            {
                'id':'custpage_ordernumber',
                'type':serverWidget.FieldType.TEXT,
                'label':'单据编号',
            },
            {
                'id':'custpage_ordercurrency',
                'type':serverWidget.FieldType.TEXT,
                'label':'货币',
            },
            {
                'id':'custpage_ordernumber_id',
                'type':serverWidget.FieldType.TEXT,
                'label':'单据内部id',
            },
            {
                'id':'custpage_wlgys',
                'type':serverWidget.FieldType.TEXT,
                'label':'物流供应商',
            },
            {
                'id':'custpage_invoice_num',
                'type':serverWidget.FieldType.TEXT,
                'label':'发票号',
            },
            {
                'id':'custpage_item_num',
                'type':serverWidget.FieldType.TEXT,
                'label':'货件编号',
            },
            {
                'id':'custpage_sub',
                'type':serverWidget.FieldType.TEXT,
                'label':'子公司', 
            },
            {
                'id':'custpage_gs',
                'type':serverWidget.FieldType.TEXT,
                'label':'关税',
            },
            {
                'id':'custpage_yf',
                'type':serverWidget.FieldType.TEXT,
                'label':'运费',
            },
            {
                'id':'custpage_bgf',
                'type':serverWidget.FieldType.TEXT,
                'label':'报关费',
            },
            {
                'id':'custpage_qgf',
                'type':serverWidget.FieldType.TEXT,
                'label':'清关费',
            },
         ];
         /**form主体信息 */
         var form = serverWidget.createForm({
             title: '物流费用--请款',
         });
         form.clientScriptModulePath = 'SuiteScripts/clients/CL_CS_WLYF_PARAMETERS.js';//关联客户端脚本
         //生成按钮
         if(parameters.wls || parameters.createdate || parameters.enddate || parameters.cur){
            form.addSubmitButton({
                label: '生成'
             });
         }
         else{
            form.addSubmitButton({
                label: '生成'
             }).isDisabled = true;
         }
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
             functionName:'refresh',
         })
         //查询条件
         form.addFieldGroup({
             id: 'custpage_check',
             label: '查询条件',
         });
         //账单备注
         form.addFieldGroup({
            id: 'custpage_vb_memo',
            label: '账单备注',
         });
         //主体字段
         for(var i = 0;i < field_list.length;i++){
             if(field_list[i].id == 'custpage_currency' || field_list[i].id == 'custpage_wlgys_1'){
                var field = form.addField({
                    id:field_list[i].id,
                    type:field_list[i].type,
                    label:field_list[i].label,
                    source:field_list[i].source,
                    container:field_list[i].group
                });
                if(parameters.cur && field_list[i].id == 'custpage_currency'){
                    field.defaultValue = parameters.cur;
                }else if(!parameters.cur && field_list[i].id == 'custpage_currency'){
                    field.defaultValue = 2;//默认usd
                }
                if(parameters.wls && field_list[i].id == 'custpage_wlgys_1'){
                    field.defaultValue = parameters.wls;
                }
             }else{
                form.addField({
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
                sublist.addField({
                    id:sublist_field_list[j].id,
                    type:sublist_field_list[j].type,
                    label:sublist_field_list[j].label,
                });
            //  if(sublist_field_list[j].id != 'custpage_ordernumber_id' || sublist_field_list[j].id != 'custpage_yl_id'){
            //     sublist.addField({
            //         id:sublist_field_list[j].id,
            //         type:sublist_field_list[j].type,
            //         label:sublist_field_list[j].label,
            //     });
            //  }else{
            //     sublist.addField({
            //         id:sublist_field_list[j].id,
            //         type:sublist_field_list[j].type,
            //         label:sublist_field_list[j].label,
            //     }).updateDisplayType({displayType:serverWidget.FieldDisplayType.HIDDEN});
            //  }
         }

         return form;
     }
     function setFieldToForm(form,parameters) {
        var search_result = doSearch(parameters);
        var res = search_result.run().getRange(0,1000);
        log.debug('res',res.length + JSON.stringify(res));
        var search_col = search_result.columns;
        var sublist_info = form.getSublist('custpage_sublist');
        var line = Number(0);
        for(var i = 0;i < res.length;i++){
            // log.debug('poid matchvb',res[i].getValue(search_col[1]) + '---' + res[i].getValue(search_col[7]));
            if(!res[i].getValue(search_col[7]) && res[i].getValue(search_col[1])){
                // log.debug('res.id',res[i].id);
                if(res[i].id){
                    sublist_info.setSublistValue({
                        id:'custpage_yl_id',
                        value:res[i].id,
                        line:line,
                    });
                }

                if(res[i].getValue(search_col[0])){
                    sublist_info.setSublistValue({
                        id:'custpage_ordertype',
                        value:res[i].getText(search_col[0]),
                        line:line,
                    });
                }
                
                if(res[i].getValue(search_col[1])){
                    sublist_info.setSublistValue({
                        id:'custpage_ordernumber',
                        value:res[i].getText(search_col[1]),
                        line:line,
                    });
                    sublist_info.setSublistValue({
                        id:'custpage_ordernumber_id',
                        value:res[i].getValue(search_col[1]),
                        line:line,
                    });
                }else{
                    sublist_info.setSublistValue({
                        id:'custpage_ordernumber',
                        value:'暂无单号',
                        line:line,
                    });
                    sublist_info.setSublistValue({
                        id:'custpage_ordernumber_id',
                        value:'暂无单号',
                        line:line,
                    });
                }
                if(res[i].getValue(search_col[8])){
                    sublist_info.setSublistValue({
                        id:'custpage_orderdate',
                        value:res[i].getValue(search_col[8]),
                        line:line,
                    })
                }
                
                if(res[i].getValue(search_col[2])){
                    sublist_info.setSublistValue({
                        id:'custpage_wlgys',
                        value:res[i].getText(search_col[2]),
                        line:line,
                    });
                }
                if(res[i].getValue(search_col[3])){
                    sublist_info.setSublistValue({
                        id:'custpage_gs',
                        value:res[i].getValue(search_col[3]),
                        line:line,
                    });
                }
                
                if(res[i].getValue(search_col[4])){
                    sublist_info.setSublistValue({
                        id:'custpage_yf',
                        value:res[i].getValue(search_col[4]),
                        line:line,
                    });
                }
                
                if(res[i].getValue(search_col[5])){
                    sublist_info.setSublistValue({
                        id:'custpage_bgf',
                        value:res[i].getValue(search_col[5]),
                        line:line,
                    });
                }
                if(res[i].getValue(search_col[6])){
                    sublist_info.setSublistValue({
                        id:'custpage_qgf',
                        value:res[i].getValue(search_col[6]),
                        line:line,
                    });
                }
                if(res[i].getValue(search_col[9])){
                    sublist_info.setSublistValue({
                        id:'custpage_invoice_num',
                        value:res[i].getValue(search_col[9]),
                        line:line,
                    })
                }
                if(res[i].getValue(search_col[10])){
                    sublist_info.setSublistValue({
                        id:'custpage_item_num',
                        value:res[i].getValue(search_col[10]),
                        line:line,
                    })
                }
                if(res[i].getText(search_col[11])){
                    sublist_info.setSublistValue({
                        id:'custpage_sub',
                        value:res[i].getText(search_col[11]),
                        line:line,
                    })
                }
                if(res[i].getText(search_col[12])){
                    sublist_info.setSublistValue({
                        id:'custpage_ordercurrency',
                        value:res[i].getText(search_col[12]),
                        line:line,
                    })
                }
                line += Number(1);
            }
        }

        return form;
     }
     function doSearch(params) {
        var mySearch = search.create({
            type:'customrecord_cs_yldmx_c1',
            columns:[
                'custrecord_cs_dj_type_1',
                'custrecord_cs_dh_c1',
                'custrecord_cs_wlgys_c1','custrecord_cs_gs_c1',
                'custrecord_cs_yf_c1','custrecordcustrecord_cs_wlyf_bgf_c1','custrecord_cs_qgf_c1','custrecord_cs_wuly_zd',
                {name:'trandate',join:'custrecord_cs_dh_c1'},   //TODO：字段关联的记录信息
                'custrecord_cs_fph_c1','custrecord_cs_hjbh_c1',
                {name:'subsidiary',join:'custrecord_cs_dh_c1'},
                {name:'currency',join:'custrecord_cs_dh_c1'},
            ]
        });
        var filters = [];
        if(params.wls){
            filters[filters.length] = ['custrecord_cs_wlgys_c1','anyof',params.wls];
        }
        if(params.cur){
            if(filters.length > 0){
                filters[filters.length] = 'AND';
                filters[filters.length] = ['custrecord_cs_dh_c1.currency','anyof',params.cur];
            }
            else{
                filters[filters.length] = ['custrecord_cs_dh_c1.currency','anyof',params.cur];
            }
        }else{
            if(filters.length > 0){
                filters[filters.length] = 'AND';
                filters[filters.length] = ['custrecord_cs_dh_c1.currency','anyof',2];//默认USD
            }
            else{
                filters[filters.length] = ['custrecord_cs_dh_c1.currency','anyof',2];
            }
        }
        log.debug('createdate enddate',params.createdate + '---' + params.enddate);
        var date_arr = new Array();
        if(params.createdate && params.enddate){
            // date_arr.push(params.createdate,params.enddate);
            if(filters.length > 0){
                filters[filters.length] = 'AND';
                filters[filters.length] = ['custrecord_cs_dh_c1.trandate','onorafter',params.createdate];//字段关联记录的字段作为搜索条件
                filters[filters.length] = 'AND';
                filters[filters.length] = ['custrecord_cs_dh_c1.trandate','onorbefore',params.enddate];
            }
            else{
                filters[filters.length] = ['custrecord_cs_dh_c1.trandate','onorafter',params.createdate];
                filters[filters.length] = 'AND';
                filters[filters.length] = ['custrecord_cs_dh_c1.trandate','onorbefore',params.enddate];
            }
        }
        else{
            if(params.createdate){
                if(filters.length > 0){
                    filters[filters.length] = 'AND';
                    filters[filters.length] = ['custrecord_cs_dh_c1.trandate','on',params.createdate];
                }
                else{
                    filters[filters.length] = ['custrecord_cs_dh_c1.trandate','on',params.createdate];
                }
            }
            if(params.enddate){
                if(filters.length > 0){
                    filters[filters.length] = 'AND';
                    filters[filters.length] = ['custrecord_cs_dh_c1.trandate','on',params.enddate];
                }
                else{
                    filters[filters.length] = ['custrecord_cs_dh_c1.trandate','on',params.enddate];
                }
            }
        }
        // filters[filters.length] = ['custrecord_cs_wuly_zd','anyof','@NONE'];
        // filters[filters.length] = 'AND';
        // filters[filters.length] = ['custrecord_cs_dh_c1','noneof','@NONE']
        if(filters.length > 0){
            filters[filters.length] = 'AND';
            filters[filters.length] = ['custrecord_cs_dh_c1.mainline','is',true];
            mySearch.filterExpression = filters;
            log.debug('filterExpression',JSON.stringify(mySearch.filterExpression));
        }
        
        return mySearch;
     }
     return {
         onRequest: onRequest
     };

 });