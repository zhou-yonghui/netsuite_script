/**
 * 新客户数统计
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
            // log.debug('request.parameters',JSON.stringify(context.request.parameters));
            var parameters = context.request.parameters;
            // log.debug('request.method',context.request.method);
            var form;
            if(context.request.method == 'GET'){
                form = createForm(context,parameters);
                // var role = runtime.getCurrentUser().role;
                // log.debug('role',role);
                // var role_flag = checkRole(role);
                // if(parameters.employee || parameters.createdate || parameters.enddate){
                //对表单赋值
                var obj = new Array();
                form = setFieldToForm(form,parameters,obj);
                // }
                context.response.writePage(form);
            }
            else{
                //获取页面数据
                var all_data = getCheckSublistValue(context);
                if(all_data.empArr.length > 0){
                    var detail_search = doSearch({"employee":all_data.empArr,"createdate":all_data.createdate,"enddate":all_data.enddate});
                    var col = detail_search.columns;
                    var res = detail_search.run().getRange(0,1000);
                    log.debug('res',res.length + JSON.stringify(res));
                    //跳转结果页面
                    form = createSoDetailForm(context);
                    form = setValueToDetailForm(form,res,col);
                    context.response.writePage(form);
                }
            }
        }
        function createSoDetailForm(context,all_data) {
            /**form明细行信息 */
            var form = serverWidget.createForm({
                title: '订单详情页面',
            });
            form.clientScriptModulePath = 'SuiteScripts/Client/CL_CS_VB_PARAMETERS.js';//关联客户端脚本
            //退回查询初始页面
            form.addButton({
                id:'custpage_refresh_button',
                label:'返回查询',
                functionName:'refresh',
            });
            var page_sublist = form.addSublist({ id: 'custpage_sublistid', type: 'staticlist', label: '订单详情' });
            page_sublist.addField({id:'custpage_sub_cus', type:serverWidget.FieldType.TEXT, label:'客户编号',});
            page_sublist.addField({id:'custpage_sub_country', type:serverWidget.FieldType.TEXT, label:'国家',});
            page_sublist.addField({id:'custpage_sub_big', type:serverWidget.FieldType.TEXT, label:'大洲',});
            page_sublist.addField({id:'custpage_sub_saler', type:serverWidget.FieldType.TEXT, label:'销售员',});
            page_sublist.addField({id:'custpage_sub_ordernum', type:serverWidget.FieldType.TEXT, label:'销售订单单号',});
            page_sublist.addField({id:'custpage_sub_firtime', type:serverWidget.FieldType.TEXT, label:'首次到款日期',});
            page_sublist.addField({id:'custpage_sub_dktz_no', type:serverWidget.FieldType.TEXT, label:'到款通知单号',});
            page_sublist.addField({id:'custpage_sub_is_w1', type:serverWidget.FieldType.TEXT, label:'是否W1',});

            return form;
        }
        function setValueToDetailForm(form,res,col){
            var sublist_info = form.getSublist('custpage_sublistid');
            var line = Number(0);
            for(var i = 0;i < res.length;i++){
                sublist_info.setSublistValue({
                    id:'custpage_sub_cus',
                    value:res[i].getValue(col[5]) || ' ',
                    line:line,
                });
                sublist_info.setSublistValue({
                    id:'custpage_sub_country',
                    value:res[i].getText(col[6]) || ' ',
                    line:line,
                });
                sublist_info.setSublistValue({
                    id:'custpage_sub_saler',
                    value:res[i].getText(col[1]) || ' ',
                    line:line,
                });
                sublist_info.setSublistValue({
                    id:'custpage_sub_ordernum',
                    value:res[i].getValue(col[4]) || ' ',
                    line:line,
                });
                sublist_info.setSublistValue({
                    id:'custpage_sub_firtime',
                    value:res[i].getValue(col[2]) || ' ',
                    line:line,
                });
                sublist_info.setSublistValue({
                    id:'custpage_sub_big',
                    value:res[i].getValue(col[7]) || ' ',
                    line:line,
                });
                sublist_info.setSublistValue({
                    id:'custpage_sub_dktz_no',
                    value:res[i].getText(col[3]) || ' ',
                    line:line,
                });
                var so_no = res[i].getValue(col[4]);
                if(so_no){
                    if(so_no.indexOf('W1') != -1 || so_no.indexOf('w1') != -1){
                        sublist_info.setSublistValue({
                            id:'custpage_sub_is_w1',
                            value:'是',
                            line:line,
                        });
                    }
                    else {
                        sublist_info.setSublistValue({
                            id:'custpage_sub_is_w1',
                            value:'否',
                            line:line,
                        });
                    }
                }
                line += Number(1);
            }
            return form;
        }
        function getCheckSublistValue(context) {
            var all_data = new Object();
            all_data.createdate = '';
            all_data.enddate = '';
            var empArr = new Array();
            var request = context.request;

            var count = request.getLineCount({group:'custpage_sublist'});
            log.debug('count',count);
            for(var i = 0;i < count;i++){
                var check = context.request.getSublistValue({ group: 'custpage_sublist', name: 'custpage_check_sub', line: i });
                var employee = context.request.getSublistValue({ group: 'custpage_sublist', name: 'custpage_sub_employee_id', line: i });
                var createdate = context.request.getSublistValue({ group: 'custpage_sublist', name: 'custpage_sub_createdate', line: i });
                var enddate = context.request.getSublistValue({ group: 'custpage_sublist', name: 'custpage_sub_enddate', line: i });
                if(check == 'T'){
                    empArr.push(employee);
                    if(!all_data.createdate){
                        all_data.createdate = createdate;
                        all_data.enddate = enddate;
                    }
                }
            }
            all_data.empArr = empArr;

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
                    "id":'custpage_employee',
                    "type":serverWidget.FieldType.SELECT,
                    "label":'业务员',
                    "source":'employee',
                    "group":'custpage_check'
                },
            ]
            var sublist_field_list = [
                //flag:1  text；2  checkbox；3 edit text
                {
                    'id':'custpage_check_sub',
                    'type':serverWidget.FieldType.CHECKBOX,
                    'label':'勾选',
                    'flag':'2',
                },
                {
                    'id':'custpage_sub_employee',
                    'type':serverWidget.FieldType.TEXT,
                    'label':'业务员',
                    'flag':'1',
                },
                {
                    'id':'custpage_num',
                    'type':serverWidget.FieldType.TEXT,
                    'label':'新客户数量',
                    'flag':'1',
                },
                {
                    'id':'custpage_sub_employee_id',
                    'type':serverWidget.FieldType.TEXT,
                    'label':'业务员内部id',
                    'flag':'2',
                },
                {
                    'id':'custpage_num_w',
                    'type':serverWidget.FieldType.TEXT,
                    'label':'新客户数量(w1)',
                    'flag':'1',
                },
                {
                    'id':'custpage_sub_createdate',
                    'type':serverWidget.FieldType.TEXT,
                    'label':'起始时间',
                    'flag':'2',
                },
                {
                    'id':'custpage_sub_enddate',
                    'type':serverWidget.FieldType.TEXT,
                    'label':'结束时间',
                    'flag':'2',
                },


            ];
            /**form主体信息 */
            var form = serverWidget.createForm({
                title: '新客户统计表',
            });
            form.clientScriptModulePath = 'SuiteScripts/Client/CL_CS_VB_PARAMETERS.js';//关联客户端脚本
            //生成按钮
            if(parameters.createdate || parameters.enddate){
                form.addSubmitButton({
                    label: '查询业务员明细'
                });
            }
            else{
                form.addSubmitButton({
                    label: '查询业务员明细'
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
            });
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
            hidden_field.defaultValue =
                '<div id="timeoutblocker" style="position: absolute; z-index: 10000; top: 0px; left: 0px; height: 100%; width: 100%; margin: 5px 0px; background-color: rgb(155, 155, 155); opacity: 0.6;"><span style="width:100%;height:100%;line-height:700px;text-align:center;display:block;font-weight: bold; color: #ff4800">加载中，请稍候 ... </span></div>';
            //主体字段
            for(var i = 0;i < field_list.length;i++){
                var field;
                if(field_list[i].id == 'custpage_employee'){
                    field = form.addField({
                        id:field_list[i].id,
                        type:field_list[i].type,
                        label:field_list[i].label,
                        source:field_list[i].source,
                        container:field_list[i].group
                    });
                    if(parameters.custpage_employee && field_list[i].id == 'custpage_employee'){
                        field.defaultValue = parameters.custpage_employee;
                    }
                }
                else if(field_list[i].id == 'custpage_createdate' || field_list[i].id == 'custpage_enddate'){
                    field = form.addField({
                        id:field_list[i].id,
                        type:field_list[i].type,
                        label:field_list[i].label,
                        source:field_list[i].source,
                        container:field_list[i].group
                    });
                    // field.isMandatory = true;
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
                else if(sublist_field_list[j].flag == "2"){
                    sublist.addField({
                        id:sublist_field_list[j].id,
                        type:sublist_field_list[j].type,
                        label:sublist_field_list[j].label,
                    }).updateDisplayType({
                        displayType:serverWidget.FieldDisplayType.HIDDEN,
                    });
                }
            }

            return form;
        }
        function setFieldToForm(form,parameters,obj) {
            var search_result = doSearch(parameters);
            var res = search_result.run().getRange(0,1000);
            log.debug('res',res.length + JSON.stringify(res));
            if(obj.length == 0){
                var out_data = getSumData(res,search_result.columns);
                var sublist_info = form.getSublist('custpage_sublist');
                var line = Number(0);
                for(var i = 0;i < out_data.length;i++){
                    if(out_data[i].employee){
                        sublist_info.setSublistValue({
                            id:'custpage_sub_employee',
                            value:out_data[i].employee,
                            line:line,
                        });
                    }
                    else{
                        sublist_info.setSublistValue({
                            id:'custpage_sub_employee',
                            value:'null',
                            line:line,
                        });
                    }

                    if(out_data[i].num){
                        sublist_info.setSublistValue({
                            id:'custpage_num',
                            value:out_data[i].num,
                            line:line,
                        });
                    }else{
                        sublist_info.setSublistValue({
                            id:'custpage_num',
                            value:'0',
                            line:line,
                        });
                    }
                    if(out_data[i].w1_num){
                        sublist_info.setSublistValue({
                            id:'custpage_num_w',
                            value:out_data[i].w1_num,
                            line:line,
                        });
                    }
                    else{
                        sublist_info.setSublistValue({
                            id:'custpage_num_w',
                            value:'0',
                            line:line,
                        });
                    }
                    if(out_data[i].employeeId){
                        sublist_info.setSublistValue({
                            id:'custpage_sub_employee_id',
                            value:out_data[i].employeeId,
                            line:line,
                        });
                    }else {
                        sublist_info.setSublistValue({
                            id:'custpage_sub_employee_id',
                            value:' ',
                            line:line,
                        });
                    }
                    if(parameters.createdate){
                        sublist_info.setSublistValue({
                            id:'custpage_sub_createdate',
                            value:parameters.createdate,
                            line:line,
                        });
                    }else {
                        sublist_info.setSublistValue({
                            id:'custpage_sub_createdate',
                            value:' ',
                            line:line,
                        });
                    }
                    if(parameters.enddate){
                        sublist_info.setSublistValue({
                            id:'custpage_sub_enddate',
                            value:parameters.enddate,
                            line:line,
                        });
                    }else {
                        sublist_info.setSublistValue({
                            id:'custpage_sub_enddate',
                            value:' ',
                            line:line,
                        });
                    }
                    line += Number(1);
                }
            }
            else{
                var deatails_arr = getDetailsData(res,obj,search_result.columns);
                var sublist_info = form.getSublist('custpage_sublist');
                var line = Number(0);
                for(var i = 0;i < deatails_arr.length;i++){
                    if(deatails_arr[i].employee){
                        sublist_info.setSublistValue({
                            id:'custpage_sub_employee',
                            value:deatails_arr[i].employee,
                            line:line,
                        });
                    }
                    else{
                        sublist_info.setSublistValue({
                            id:'custpage_sub_employee',
                            value:'null',
                            line:line,
                        });
                    }
                    if(deatails_arr[i].num){
                        sublist_info.setSublistValue({
                            id:'custpage_num',
                            value:deatails_arr[i].num,
                            line:line,
                        });
                    }else{
                        sublist_info.setSublistValue({
                            id:'custpage_num',
                            value:'0',
                            line:line,
                        });
                    }
                    if(deatails_arr[i].w1_num){
                        sublist_info.setSublistValue({
                            id:'custpage_num_w',
                            value:deatails_arr[i].w1_num,
                            line:line,
                        });
                    }
                    else{
                        sublist_info.setSublistValue({
                            id:'custpage_num_w',
                            value:'0',
                            line:line,
                        });
                    }
                    line += Number(1);
                }
            }

            return form;
        }
        function getDetailsData(res,obj,col){
            var deatails_arr = new Array();
            for(var i = 0;i < res.length;i++){
                if(res[i].getText('custrecord_sl_rlr') == obj.sublist_data[0].employe){
                    if(res[m].getValue(col[4]).indexOf('w1') != -1 || res[m].getValue(col[4]).indexOf('W1') != -1){
                        deatails_arr.push({
                            "customer":res[i].getText('custrecord_sl_kh'),
                            "employe":obj.sublist_data[0].employee,
                            "salesorder":res[i].getText('custrecord_sl_xsdd'),
                            "order_date":res[i].getValue('custrecordrlsj'),
                            "is_w1":true,
                        })
                    }else{
                        deatails_arr.push({
                            "customer":res[i].getText('custrecord_sl_kh'),
                            "employe":obj.sublist_data[0].employee,
                            "salesorder":res[i].getText('custrecord_sl_xsdd'),
                            "order_date":res[i].getValue('custrecordrlsj'),
                            "is_w1":false,
                        })
                    }
                }
            }
            return deatails_arr;
        }
        function getSumData(res,col){
            var only_emp_arr = new Array();
            var out_arr = new Array();
            for(var i = 0;i < res.length;i++){
                if(only_emp_arr.indexOf(res[i].getText(col[1])) == -1){
                    only_emp_arr.push(res[i].getText(col[1]));
                }
            }
            log.debug('only_emp_arr',only_emp_arr);
            for(var n = 0;n < only_emp_arr.length;n++){
                var num = Number(0);
                var w1_num = Number(0);
                var empId = '';
                for(var m = 0;m < res.length;m++){
                    if(only_emp_arr[n] == res[m].getText(col[1])){
                        num += Number(1);
                        empId = res[m].getValue(col[1]);
                        if(res[m].getValue(col[4]).indexOf('w1') != -1 || res[m].getValue(col[4]).indexOf('W1') != -1){
                            w1_num += Number(1);
                        }
                    }
                }
                out_arr.push({
                    "employee":only_emp_arr[n],
                    "employeeId":empId,
                    "num":num,
                    "w1_num":w1_num,
                });
            }
            log.debug('out_arr',out_arr);
            return out_arr;
        }
        function doSearch(params) {
            var mySearch = search.create({
                type:'customer',
                columns:[
                    'custentityfirst_claim_so',//首次认领的订单
                    'custentity_first_claim_salesman',//首次认领业务员
                    'custentity_sl_first_time',//首次认领到款日期
                    'custentity_notice_first_claim',//首次关联到款通知单
                    {name:'custbody_sl_bbaojiadan',join:'custentityfirst_claim_so'},//销售单号
                    'entityid',//客户ID
                    'custentity_sl_country',//国家
                    'custentity_sl_dazhou',//大洲
                ]
            });
            var filters = [];
            //起始时间  ，结束时间
            log.debug('createdate enddate',params.createdate + '---' + params.enddate);
            if(params.createdate && params.enddate){
                if(filters.length > 0){
                    filters[filters.length] = 'AND';
                    filters[filters.length] = ['custentity_sl_first_time','onorafter',params.createdate];
                    filters[filters.length] = 'AND';
                    filters[filters.length] = ['custentity_sl_first_time','onorbefore',params.enddate];
                }
                else{
                    filters[filters.length] = ['custentity_sl_first_time','onorafter',params.createdate];
                    filters[filters.length] = 'AND';
                    filters[filters.length] = ['custentity_sl_first_time','onorbefore',params.enddate];
                }
            }
            else{
                if(params.createdate){
                    if(filters.length > 0){
                        filters[filters.length] = 'AND';
                        filters[filters.length] = ['custentity_sl_first_time','on',params.createdate];
                    }
                    else{
                        filters[filters.length] = ['custentity_sl_first_time','on',params.createdate];
                    }
                }
                if(params.enddate){
                    if(filters.length > 0){
                        filters[filters.length] = 'AND';
                        filters[filters.length] = ['custentity_sl_first_time','on',params.enddate];
                    }
                    else{
                        filters[filters.length] = ['custentity_sl_first_time','on',params.enddate];
                    }
                }
                if(!params.createdate && !params.enddate){
                    filters[filters.length] = ['custentity_sl_first_time','within',['thismonth']];
                }
            }
            if(params.employee){
                if(filters.length > 0){
                    filters[filters.length] = 'AND';
                    filters[filters.length] = ['custentity_first_claim_salesman','anyof',params.employee];
                }
                else{
                    filters[filters.length] = ['custentity_first_claim_salesman','anyof',params.employee];
                }
            }
            if(filters.length > 0){
                filters[filters.length] = 'AND';
                filters[filters.length] = ['isinactive','is',false];
                // filters[filters.length] = 'AND';
                // filters[filters.length] = ['custrecordrlsj','isnotempty',[]];
                filters[filters.length] = 'AND';
                filters[filters.length] = ['custentityfirst_claim_so.mainline','is',true];//TODO：搜索结果里包含主线需要加主线条件
                mySearch.filterExpression = filters;
                log.debug('filterExpression',JSON.stringify(mySearch.filterExpression));
            }

            return mySearch;
        }
        return {
            onRequest: onRequest
        };

    });