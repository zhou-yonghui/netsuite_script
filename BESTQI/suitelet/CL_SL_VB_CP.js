/**
 * 供应商账单提交付款界面
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */
define(['N/search', 'N/ui/serverWidget', 'N/runtime', 'N/record', 'N/file', 'N/redirect', 'N/task', 'N/query','N/http','N/format','N/currency', "../utils/NS_UTIL_FUNCTION",'SuiteScripts/utils/moment.js'],

    function(search, serverWidget, runtime, record, file, redirect, task, query, http,format,currencyRate,NS_UTIL_FUNCTION,moment) {

        /**
         * Definition of the Suitelet script trigger point.
         *
         * @param {Object} context
         * @param {ServerRequest} context.request - Encapsulation of the incoming request
         * @param {ServerResponse} context.response - Encapsulation of the Suitelet response
         * @Since 2015.2
         */
        function onRequest(context) {
            try{
                var parameters = context.request.parameters;
                // log.debug('request.method',context.request.method);
                //获取当前登录用户信息
                var user = runtime.getCurrentUser().id;
                //获取当前导入状态
                var empField = search.lookupFields({ type: 'employee', id: user, columns: ['custentity_sl_supplier_reconciliation_st', 'custentity_sl_supplier_reconciliation_n'] });
                var form;
                if(context.request.method == 'GET'){
                    if(empField.custentity_sl_supplier_reconciliation_st == '' || empField.custentity_sl_supplier_reconciliation_st[0].value == 1){
                        var role = runtime.getCurrentUser().role;
                        log.debug('role',role);
                        var role_flag = checkRole(role);
                        form = createForm(context,parameters);
                        if(parameters.gys || parameters.createdate || parameters.enddate || parameters.cur || parameters.sub || parameters.acc){
                            //对表单赋值
                            form = setFieldToForm(form,parameters,role_flag,role);
                        }
                    }
                    else if(empField.custentity_sl_supplier_reconciliation_st[0].value == 2){
                        form = createCreateingForm();
                    }
                    else if(empField.custentity_sl_supplier_reconciliation_st[0].value == 3){
                        //跳转结果页面
                        form = createFormToVendorPayment(context,empField);
                        record.submitFields({
                            type: 'employee',
                            id: user,
                            values: {
                                custentity_sl_supplier_reconciliation_st: 1,
                                custentity_sl_supplier_reconciliation_n: ''
                            }
                        });
                    }
                    context.response.writePage(form);
                }
                else if(context.request.method == 'POST'){
                    // log.debug('post parm',parameters);
                    //获取页面数据
                    var all_data = getCheckSublistValue(context);
                    if(all_data.sublist_data.length > 0){
                        var mrTask = task.create({
                            taskType: task.TaskType.MAP_REDUCE,
                            scriptId: 320,    //正式环境
                            // scriptId:342,          // 测试环境
                            deploymentId : 'customdeploy_cl_mp_vb_createvp',
                        });
                        mrTask.params = {'custscript_deatail_info' : all_data,'custscript_user' : user};
                        mrTask.submit();
                        /************/
                        record.submitFields({
                            type: 'employee',
                            id: user,
                            values: {
                                custentity_ch_to_dg_status: 2,
                                // custentity_ch_to_dg_info: ''
                            }
                        });
                    }
                    /*************跳转suitelet初始页面***/
                    redirect.toSuitelet({
                        scriptId:'customscript_cl_sl_vb_cp',
                        deploymentId: 'customdeploy_cl_sl_vb_cp',
                    });
                }
            }catch (e) {
                log.debug('生成账单付款报错',e);
                var error_info = '';
                var error_form;
                if(e.name == 'MAP_REDUCE_ALREADY_RUNNING'){
                    error_form = createCreateingForm();
                }
                else {
                    error_info = e.message;
                    error_form = createErrorForm(error_info);
                }
                context.response.writePage(error_form);
            }
        }
        //错误页面
        function createErrorForm(error_info) {
            var form = serverWidget.createForm({ title: '错误信息'});
            form.clientScriptModulePath = 'SuiteScripts/client/CL_CS_VB_PARAMETERS.js';//关联客户端脚本
            form.addButton({ id: 'custpage_search_data', label: '跳转初始页面', functionName: 'refresh' });
            form.addField({ id: 'custpage_label', type: 'label', label: '<p style="color: blue;">'+error_info +'</p>' });
            return form;
        }
        //正在生成页面
        function createCreateingForm() {
            var form = serverWidget.createForm({ title: '正在生成中', hideNavBar: false });
            form.clientScriptModulePath = 'SuiteScripts/client/CL_CS_VB_PARAMETERS.js';//关联客户端脚本
            form.addButton({ id: 'custpage_search_data', label: '刷新', functionName: 'refresh' });
            form.addField({ id: 'custpage_label', type: 'label', label: '<p style="color: blue;">正在生成，请刷新页面查看结果</p>', });
            return form;
        }
        function createFormToVendorPayment(context,empField) {
            var ret = JSON.parse(empField.custentity_sl_supplier_reconciliation_n);
            var wo_url;
            var field_list = [
                {
                    "id":'custpage_result_info',
                    "type":serverWidget.FieldType.LABEL,
                    "label":'<a target="_blank"><p style="color: blue;">生成单据成功</P></a>',
                },
                {
                    "id":'custpage_result_info_2',
                    "type":serverWidget.FieldType.LABEL,
                    "label":'<a target="_blank"><p style="color: blue;">生成单据失败:'+ ret.result +'</P></a>',
                },
                {
                    "id":'custpage_result_info_3',
                    "type":serverWidget.FieldType.LABEL,
                    "label":'<a target="_blank"><p style="color: blue;">生成单据失败:没有勾选数据</P></a>',
                },
            ]
            // if(){
            /**form主体信息 */
            var form = serverWidget.createForm({
                title: '供应商账单生成结果页面',
            });
            form.clientScriptModulePath = 'SuiteScripts/client/CL_CS_VB_PARAMETERS.js';//关联客户端脚本
            for(var i = 0;i < field_list.length;i++){
                if(ret.flag == '1' && field_list[i].id == 'custpage_result_info'){
                    field = form.addField({
                        id:field_list[i].id,
                        type:field_list[i].type,
                        label:field_list[i].label,
                    });
                    break;
                }else if(ret.flag == '2' && field_list[i].id == 'custpage_result_info_2'){
                    field = form.addField({
                        id:field_list[i].id,
                        type:field_list[i].type,
                        label:field_list[i].label,
                    });
                    break;
                }
                else if(ret.flag == '3' && field_list[i].id == 'custpage_result_info_3'){
                    field = form.addField({
                        id:field_list[i].id,
                        type:field_list[i].type,
                        label:field_list[i].label,
                    });
                    break;
                }
            }
            form.addButton({id:'custpage_refresh_button', label:'跳转初始页', functionName:'refresh',});
            var page_sublist = form.addSublist({ id: 'custpage_sublistid', type: 'staticlist', label: '生成结果' });
            var wo_field = page_sublist.addField({ id: 'custpage_line_ack', type: 'text', label: '生成的供应商付款单号' });
            wo_field.updateDisplayType({ displayType: 'readonly' });
            if(ret.flag == '1'){
                wo_url = '<a href="https://6797408-sb1.app.netsuite.com/app/accounting/transactions/vendpymt.nl?id='+ ret.result +'&whence="><p style="color: blue;">'+ ret.tranid + '</P></a>';
            }
            else if(ret.flag == '2' || ret.flag == '3'){
                wo_url = '未生成';
            }
            page_sublist.setSublistValue({ id: 'custpage_line_ack', line: 0, value: wo_url });
            // }
            return form;
        }
        function getCheckSublistValue(context) {
            var all_data = new Object();
            var sublist_data = new Array();
            var vendor = context.request.parameters.custpage_vendor;
            var currency = context.request.parameters.custpage_currency;
            var apaccount = context.request.parameters.custpage_account;
            var subsidiary = context.request.parameters.custpage_subsidiary;
            var inv_num = context.request.parameters.custpage_invoice;
            var count = context.request.getLineCount({group:'custpage_sublist'});
            log.debug('count',count);
            for(var i = 0;i < count;i++){
                var obj = new Object();
                var check = context.request.getSublistValue({ group: 'custpage_sublist', name: 'custpage_check_sub', line: i });
                if(check == 'T'){
                    var vb_id = context.request.getSublistValue({ group: 'custpage_sublist', name: 'custpage_internalid', line: i });
                    var zk_amount = context.request.getSublistValue({ group: 'custpage_sublist', name: 'custpage_amount_zk', line: i });
                    var pay_amount = context.request.getSublistValue({ group: 'custpage_sublist', name: 'custpage_amount_pay', line: i });
                    obj.vb_id = vb_id;
                    obj.zk_amount = zk_amount;
                    obj.pay_amount = pay_amount;
                }
                sublist_data.push(obj);
            }
            all_data.entity = vendor;
            all_data.currency = currency;
            all_data.apaccount = apaccount;
            all_data.inv_num = inv_num;
            all_data.subsidiary = subsidiary;
            all_data.sublist_data = sublist_data;

            log.debug('all_data',all_data);
            return all_data;
        }
        function getVendorPayment(all_data,user) {
            var ret = new Object();
            if(all_data.sublist_data.length > 0){//.sublist_data.length > 0
                var vendor_col = search.lookupFields({
                    type:'vendor',
                    id:all_data.entity,
                    columns:['custentity_rm_supplier_type','defaultvendorpaymentaccount'],
                });
                var subsidiary_col = search.lookupFields({
                    type:'subsidiary',
                    id:all_data.subsidiary,
                    columns:['custrecord_default_usd_payaccount','custrecord_default_cny_payaccount']
                });
                log.debug('vendor_col',JSON.stringify(vendor_col));
                try{
                    var vp_rec = record.create({
                        type:'vendorpayment',
                        isDynamic:true,
                    });
                    if(vendor_col.custentity_rm_supplier_type[0].value == 1){//外部采购供应商
                        // vp_rec.setText('customform','BSQ-付款申请（货款）');
                        // vp_rec.setValue('customform',130);//test
                        vp_rec.setValue('customform',150);
                    }
                    else if(vendor_col.custentity_rm_supplier_type[0].value == 2){//物流供应商
                        // vp_rec.setText('customform','BSQ-付款申请（物流费）');
                        // vp_rec.setValue('customform',132);
                        vp_rec.setValue('customform',151);
                    }
                    else if(vendor_col.custentity_rm_supplier_type[0].value == 4){//内部交易供应商
                        // vp_rec.setText('customform','BSQ-付款申请（内部交易）');
                        // vp_rec.setValue('customform',133);
                        vp_rec.setValue('customform',152);
                    }
                    else{
                        // vp_rec.setText('customform','BSQ-付款申请（其他）');
                        // vp_rec.setValue('customform',129);
                        vp_rec.setValue('customform',153);
                    }
                    vp_rec.setValue('entity',all_data.entity);//收款人
                    vp_rec.setValue('subsidiary',all_data.subsidiary);//子公司
                    vp_rec.setValue('apacct',all_data.apaccount);//A/P科目
                    vp_rec.setValue('currency',all_data.currency);//币种
                    if(all_data.currency == 1){//人民币
                        vp_rec.setValue('account',subsidiary_col.custrecord_default_cny_payaccount[0].value);
                    }
                    else if(all_data.currency == 2){//美元
                        vp_rec.setValue('account',subsidiary_col.custrecord_default_usd_payaccount[0].value);
                    }
                    // else{
                    //     vp_rec.setValue('account',vendor_col.defaultvendorpaymentaccount[0].value);//科目：取自供应商默认供应商付款账户
                    // }
                    vp_rec.setValue('custbody_invoice_addvalue',all_data.inv_num);//发票
                    // vp_rec.setValue('custbody_script_submit',true);//脚本用提交，提交至下一审批人
                    // vp_rec.setValue('approvalstatus',2);//批准
                    var vp_count = vp_rec.getLineCount('apply');
                    log.debug('vp-count',vp_count);
                    for(var i = 0;i < vp_count;i++){
                        vp_rec.selectLine('apply',i);
                        var vb_id = vp_rec.getCurrentSublistValue({
                            sublistId:'apply',
                            fieldId:'internalid'
                        });
                        // log.debug('vb_id',vb_id);
                        for(var j = 0;j < all_data.sublist_data.length;j++){
                            if(vb_id == all_data.sublist_data[j].vb_id){
                                vp_rec.setCurrentSublistValue({
                                    sublistId:'apply',
                                    fieldId:'disc',
                                    value:all_data.sublist_data[j].zk_amount,
                                });
                                vp_rec.setCurrentSublistValue({
                                    sublistId:'apply',
                                    fieldId:'amount',
                                    value:all_data.sublist_data[j].pay_amount,
                                });
                                vp_rec.setCurrentSublistValue({
                                    sublistId:'apply',
                                    fieldId:'apply',
                                    value:true,
                                });
                                vp_rec.commitLine('apply');
                            }
                        }
                    }
                    var id = vp_rec.save();
                    log.debug('单据生成',id);

                    ret.result = id;
                    ret.flag = '1';
                    // ret.tranid = search.lookupFields({ type: 'vendorpayment', id: id, columns: ['transactionnumber'] }).transactionnumber[0].text;
                    ret.tranid = record.load({type:'vendorpayment',id:id,isDynamic:true}).getText('transactionnumber');
                }
                catch(e){
                    ret.result = e.message;
                    ret.flag = '2';
                    ret.tranid = '';
                }
            }else{
                ret.result = '没勾选明细行';
                ret.flag = '3';
                ret.tranid = '';
            }
            //将信息写入当前用户供应商账单相关自定义字段
            record.submitFields({
                type: 'employee',
                id: user,
                values: {
                    custentity_sl_supplier_reconciliation_st: 3,
                    custentity_sl_supplier_reconciliation_n: JSON.stringify(ret)
                }
            });
            return ret;
        }
        function checkRole(role_id) {
            log.debug('role_id',role_id);
            var flag = 'N';
            if(role_id){
                // //BSQ_仓储专员”“BSQ_仓储主管”“BSQ_关务经理”“BSQ_报关员”“BSQ_物流专员”“BSQ_物流主管”“BSQ_物流经理
                // var role_arr = [1040,1041,1043,1042,1050,1038,1046];
                var role_arr = [1059,1058,1056,1049,1048,1047,1046]
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
                    "id":'custpage_s_duedate',
                    "type":serverWidget.FieldType.DATE,
                    "label":'起始到期日期',
                    "source":'',
                    "group":'custpage_check',
                },
                {
                    "id":'custpage_e_duedate',
                    "type":serverWidget.FieldType.DATE,
                    "label":'结束到期日期',
                    "source":'',
                    "group":'custpage_check',
                },
                {
                    "id":'custpage_vendor',
                    "type":serverWidget.FieldType.SELECT,
                    "label":'供应商',
                    "source":'vendor',
                    "group":'custpage_check'
                },
                {
                    "id":'custpage_subsidiary',
                    "type":serverWidget.FieldType.SELECT,
                    "label":'附属公司',
                    "source":'subsidiary',
                    "group":'custpage_check'
                },
                {
                    "id":'custpage_currency',
                    "type":serverWidget.FieldType.SELECT,
                    "label":'币种',
                    "source":'currency',
                    "group":'custpage_check'
                },
                {
                    "id":'custpage_account',
                    "type":serverWidget.FieldType.SELECT,
                    "label":'A/P科目',
                    "source":'account',
                    "group":'custpage_check'
                },
                {
                    "id":'custpage_memo',
                    "type":serverWidget.FieldType.TEXTAREA,
                    "label":'A/P科目填写说明',
                    "source":'',
                    "group":'custpage_check'
                },
                {
                    "id":'custpage_invoice',
                    "type":serverWidget.FieldType.TEXT,
                    "label":'发票号码',
                    // "source":'currency',
                    "group":'custpage_value'
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
                    'id':'custpage_sub_subsidiary',
                    'type':serverWidget.FieldType.TEXT,
                    'label':'子公司',
                    'flag':'1',
                },
                {
                    'id':'custpage_vendor',
                    'type':serverWidget.FieldType.TEXT,
                    'label':'供应商',
                    'flag':'1',
                },
                {
                    'id':'custpage_vendor_ratio',
                    'type':serverWidget.FieldType.TEXT,
                    'label':'供应商预付比例',
                    'flag':'1',
                },
                {
                    'id':'custpage_orderdate',
                    'type':serverWidget.FieldType.TEXT,
                    'label':'日期',
                    'flag':'1',
                },
                {
                    'id':'custpage_duedate',
                    'type':serverWidget.FieldType.TEXT,
                    'label':'到期日期',
                    'flag':'1',
                },
                {
                    'id':'custpage_internalid',
                    'type':serverWidget.FieldType.TEXT,
                    'label':'内部标识',
                    'flag':'1',
                },
                {
                    'id':'custpage_ordercode',
                    'type':serverWidget.FieldType.TEXT,
                    'label':'文件编号',
                    'flag':'1',
                },
                {
                    'id':'custpage_po_code',
                    'type':serverWidget.FieldType.TEXT,
                    'label':'采购单号',
                    'flag':'1',
                },
                {
                    'id':'custpage_status',
                    'type':serverWidget.FieldType.TEXT,
                    'label':'状态',
                    'flag':'1',
                },
                {
                    'id':'custpage_sub_currency',
                    'type':serverWidget.FieldType.TEXT,
                    'label':'货币',
                    'flag':'1',
                },
                {
                    'id':'custpage_item_num',
                    'type':serverWidget.FieldType.TEXT,
                    'label':'货品',
                    'flag':'1',
                },
                {
                    'id':'custpage_qty',
                    'type':serverWidget.FieldType.TEXT,
                    'label':'数量',
                    'flag':'1',
                },
                {
                    'id':'custpage_item_notax_price',
                    'type':serverWidget.FieldType.TEXT,
                    'label':'不含税单价',
                    'flag':'1',
                },
                {
                    'id':'custpage_taxcode',
                    'type':serverWidget.FieldType.TEXT,
                    'label':'税率',
                    'flag':'1',
                },
                {
                    'id':'custpage_amount_notax',
                    'type':serverWidget.FieldType.TEXT,
                    'label':'不含税总金额',
                    'flag':'1',
                },
                {
                    'id':'custpage_amount_tax',
                    'type':serverWidget.FieldType.TEXT,
                    'label':'含税总金额',
                    'flag':'1',
                },
                {
                    'id':'custpage_amount_sy',
                    'type':serverWidget.FieldType.FLOAT,
                    'label':'剩余未付金额',
                    'flag':'1',
                },
                {
                    'id':'custpage_amount_zk',
                    'type':serverWidget.FieldType.FLOAT,
                    'label':'折扣金额',
                    'flag':'3',
                },
                {
                    'id':'custpage_amount_pay',
                    'type':serverWidget.FieldType.FLOAT,
                    'label':'付款金额',
                    'flag':'3',
                },
            ];
            /**form主体信息 */
            var form = serverWidget.createForm({
                title: '供应商对账',
            });
            form.clientScriptModulePath = 'SuiteScripts/client/CL_CS_VB_PARAMETERS.js';//关联客户端脚本
            //生成按钮
            if(parameters.gys && parameters.sub && parameters.cur && parameters.acc){
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
            //付款字段
            form.addFieldGroup({
                id: 'custpage_value',
                label: '付款字段',
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
                if(field_list[i].id == 'custpage_vendor' || field_list[i].id == 'custpage_subsidiary' || field_list[i].id == 'custpage_currency' || field_list[i].id == 'custpage_account'){
                    field = form.addField({
                        id:field_list[i].id,
                        type:field_list[i].type,
                        label:field_list[i].label,
                        source:field_list[i].source,
                        container:field_list[i].group
                    });
                    field.isMandatory = true;
                    if(parameters.gys && field_list[i].id == 'custpage_vendor'){
                        field.defaultValue = parameters.gys;
                    }
                    else if(parameters.sub && field_list[i].id == 'custpage_subsidiary'){
                        field.defaultValue = parameters.sub;
                    }
                    else if(parameters.cur && field_list[i].id == 'custpage_currency'){
                        field.defaultValue = parameters.cur;
                    }
                    else if(parameters.acc && field_list[i].id == 'custpage_account'){
                        field.defaultValue = parameters.acc;
                    }
                    else if(parameters.createdate && field_list[i].id == 'custpage_createdate'){
                        log.debug('parameters.createdate',parameters.createdate);
                        field.defaultValue = parameters.createdate;
                    }
                    else if(parameters.enddate && field_list[i].id == 'custpage_enddate'){
                        field.defaultValue = parameters.enddate;
                    }
                }
                else if(field_list[i].id == 'custpage_memo'){
                    field = form.addField({
                        id:field_list[i].id,
                        type:field_list[i].type,
                        label:field_list[i].label,
                        source:field_list[i].source,
                        container:field_list[i].group
                    });
                    field.updateDisplayType({
                        displayType : serverWidget.FieldDisplayType.READONLY,
                    });
                    field.updateDisplaySize({
                        height : 5,
                        width : 100
                    });
                    field.defaultValue = '如果是采购货款，则选{2202.01 应付账款 : 应付货款}；' +
                        '如果是物流费用，则选{2202.02 应付账款 : 物流款}；' +
                        '如果是内部交易，则选{1122.08 应收账款 : 内部关联方}。' +
                        '最终以账单上显示的【科目】为准，账单上的【科目】为什么，提交账单付款就要选什么科目';
                }
                else{
                    field = form.addField({
                        id:field_list[i].id,
                        type:field_list[i].type,
                        label:field_list[i].label,
                        source:field_list[i].source,
                        container:field_list[i].group
                    });
                    if(field_list[i].id == 'custpage_invoice' && parameters.iv){
                        field.defaultValue = parameters.iv;
                    }
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
        function setFieldToForm(form,parameters,role_flag,role) {
            var search_result = doSearch(parameters,role_flag,role);
            var res = search_result.run().getRange(0,1000);
            // log.debug('res',res.length + JSON.stringify(res));
            //获取未付金额
            var amount_ret = getFxamountremaining(res,parameters);
            // log.debug('amount_ret',amount_ret);
            var search_col = search_result.columns;
            var sublist_info = form.getSublist('custpage_sublist');
            var line = Number(0);
            for(var i = 0;i < res.length;i++){
                var amount = Number(0);
                var dueDate = '';
                for(j = 0;j < amount_ret.length;j++){
                    if(amount_ret[j].id == res[i].id){
                        amount = amount_ret[j].fxamountremaining;
                        dueDate = amount_ret[j].duedate;
                    }
                }
                if(res[i].getValue(search_col[16]) != 'pendingApproval' && amount != 0){
                    if(res[i].getValue(search_col[0])){
                        sublist_info.setSublistValue({
                            id:'custpage_sub_subsidiary',
                            value:res[i].getText(search_col[0]),
                            line:line,
                        });
                    }

                    if(res[i].getValue(search_col[1])){
                        sublist_info.setSublistValue({
                            id:'custpage_vendor',
                            value:res[i].getText(search_col[1]),
                            line:line,
                        });
                    }
                    if(res[i].getValue(search_col[18])){
                        sublist_info.setSublistValue({
                            id:'custpage_vendor_ratio',
                            value:res[i].getValue(search_col[18]),
                            line:line,
                        });
                    }
                    else {
                        sublist_info.setSublistValue({
                            id:'custpage_vendor_ratio',
                            value:'null',
                            line:line,
                        });
                    }
                    if(res[i].getValue(search_col[2])){
                        sublist_info.setSublistValue({
                            id:'custpage_orderdate',
                            value:res[i].getValue(search_col[2]),
                            line:line,
                        });
                    }
                    if(dueDate){
                        sublist_info.setSublistValue({
                            id:'custpage_duedate',
                            value:dueDate,
                            line:line,
                        });
                    }
                    if(res[i].id){
                        sublist_info.setSublistValue({
                            id:'custpage_internalid',
                            value:res[i].id,
                            line:line,
                        });
                    }
                    if(res[i].getValue(search_col[3])){
                        sublist_info.setSublistValue({
                            id:'custpage_ordercode',
                            value:res[i].getValue(search_col[3]),
                            line:line,
                        });
                    }

                    if(res[i].getValue(search_col[4])){
                        sublist_info.setSublistValue({
                            id:'custpage_po_code',
                            value:res[i].getText(search_col[4]),
                            line:line,
                        });
                    }

                    if(res[i].getValue(search_col[5])){
                        sublist_info.setSublistValue({
                            id:'custpage_status',
                            value:res[i].getValue(search_col[5]),
                            line:line,
                        });
                    }
                    if(res[i].getValue(search_col[7])){
                        sublist_info.setSublistValue({
                            id:'custpage_sub_currency',
                            value:res[i].getText(search_col[7]),
                            line:line,
                        });
                    }
                    if(res[i].getValue(search_col[6])){
                        sublist_info.setSublistValue({
                            id:'custpage_item_num',
                            value:res[i].getText(search_col[6]),
                            line:line,
                        })
                    }
                    if(res[i].getValue(search_col[9])){
                        sublist_info.setSublistValue({
                            id:'custpage_item_notax_price',
                            value:res[i].getValue(search_col[9]),
                            line:line,
                        })
                    }
                    if(res[i].getValue(search_col[8])){
                        sublist_info.setSublistValue({
                            id:'custpage_qty',
                            value:-res[i].getValue(search_col[8]),
                            line:line,
                        })
                    }
                    if(res[i].getValue(search_col[10])){
                        sublist_info.setSublistValue({
                            id:'custpage_taxcode',
                            value:res[i].getValue(search_col[10]),
                            line:line,
                        })
                    }
                    if(res[i].getValue(search_col[11]) && res[i].getValue(search_col[15]) == 'VendBill'){
                        sublist_info.setSublistValue({
                            id:'custpage_amount_notax',
                            value:Math.abs(res[i].getValue(search_col[11])),
                            line:line,
                        })
                    }else if(res[i].getValue(search_col[11]) && res[i].getValue(search_col[15]) != 'VendBill'){
                        sublist_info.setSublistValue({
                            id:'custpage_amount_notax',
                            value:-Math.abs(res[i].getValue(search_col[11])),
                            line:line,
                        })
                    }
                    if(res[i].getValue(search_col[15]) == 'VendBill'){  //通过搜索来获取剩余金额
                        sublist_info.setSublistValue({
                            id:'custpage_amount_sy',
                            value:Math.abs(amount),
                            line:line,
                        });
                        sublist_info.setSublistValue({
                            id:'custpage_amount_pay',             //付款金额
                            value:amount,
                            line:line,
                        });
                        if(res[i].getValue(search_col[12])){
                            sublist_info.setSublistValue({
                                id:'custpage_amount_tax',
                                value:Math.abs(res[i].getValue(search_col[12])),
                                line:line,
                            })
                        }
                    }else if(res[i].getValue(search_col[15]) != 'VendBill'){
                        sublist_info.setSublistValue({
                            id:'custpage_amount_sy',
                            value:-Math.abs(amount),
                            line:line,
                        });
                        sublist_info.setSublistValue({
                            id:'custpage_amount_pay',             //付款金额
                            value:-amount,
                            line:line,
                        });
                        if(res[i].getValue(search_col[12])){
                            sublist_info.setSublistValue({
                                id:'custpage_amount_tax',
                                value:-Math.abs(res[i].getValue(search_col[12])),
                                line:line,
                            })
                        }
                    }
                    sublist_info.setSublistValue({
                        id:'custpage_amount_zk',           //折扣金额默认为0
                        value:0,
                        line:line,
                    });
                    line += Number(1);
                }
            }

            return form;
        }
        function getFxamountremaining(res,parameters) {
            if(res.length > 0){
                var id_arr = new Array();
                var ret = new Array();
                for(var i = 0;i < res.length;i++){
                    id_arr.push(res[i].id);
                }
                // log.debug('id_arr',id_arr);
                var mysearch = search.create({
                    type:'transaction',
                    filters:[
                        ['type','anyof',["VendCred", "VendBill"]],
                        'AND',['mainline','is',true],
                        'AND',['taxline','is',false],
                        'AND',['internalid','anyof',id_arr],
                    ],
                    columns:[
                        {name:'fxamountremaining',type:'currency',label:'余额(外币)'},
                        {name:'fxamountpaid',type:'currency',label:'已付金额(外币)'},
                        {name:"duedate",type:"date",label:'到期日期'},
                    ]
                });
                var res_amount = mysearch.run().getRange(0,1000);
                // log.debug('未付金额搜索',JSON.stringify(res_amount));
                if(res_amount.length > 0){
                    for(var j = 0;j < res_amount.length;j++){
                        ret.push({
                            "id":res_amount[j].id,
                            "fxamountremaining":res_amount[j].getValue('fxamountremaining'),
                            "duedate" : res_amount[j].getValue('duedate'),
                        });
                    }
                }
                return ret;
            }
        }
        //  function doSearch() {
        //      var mysearch = search.load('customsearch_bill_finance');
        //      return mysearch;
        //  }
        function doSearch(params,role_flag,role) {
            var mySearch = search.create({
                type:'transaction',
                columns:[
                    {name:'subsidiarynohierarchy',type:'select',label:"子公司(无层级)"},
                    {name:'mainname',type:'select',label:'供应商'},
                    {name:'trandate',type:'date',label:'日期'},
                    {name:'tranid',type:'text',label:'文件号码'},
                    {name:'createdfrom',type:'select',label:'采购订单'},
                    {name:'statusref',type:'select',label:'状态'},
                    {name:'item',type:'select',label:'货品'},
                    {name:'currency',type:'select',label:'货币'},
                    {name:'quantity',type:'float',label:'数量'},
                    {name:'fxrate',type:"currency2",label:'不含税单价'},
                    {name:'rate',type:'currency',label:'税率',join:'taxItem'},
                    {name:'fxamount',type:'currency',label:'不含税总金额'},
                    {name:'formulanumeric',type:'float',label:'含税总金额',formula:"{fxamount}*(1+{taxitem.rate}/100)"}, //TODO:搜索结果用公式
                    {name:'fxamountremaining',type:'currency',label:'余额(外币)'},
                    {name:'accountmain',label:'ap科目'},
                    {name:'type',label:'类型'},
                    {name:'status',label:'状态'},
                    {name:'custentity_rm_supplier_type',type:'select',join:'vendor',label:'供应商类型'},
                    {name:'custentity_hl_bsq_prepayment_ratio',join:'vendor',label: '供应商预付比例'},
                    {name:'duedate',type:'date',label:'到期日期'},
                ]
            });
            var filters = [];
            //供应商
            if(params.gys){
                filters[filters.length] = ['mainname','anyof',params.gys];
            }
            //起始时间  ，结束时间
            log.debug('createdate enddate',params.createdate + '---' + params.enddate);
            if(params.createdate && params.enddate){
                if(filters.length > 0){
                    filters[filters.length] = 'AND';
                    filters[filters.length] = ['trandate','onorafter',params.createdate];
                    filters[filters.length] = 'AND';
                    filters[filters.length] = ['trandate','onorbefore',params.enddate];
                }
                else{
                    filters[filters.length] = ['trandate','onorafter',params.createdate];
                    filters[filters.length] = 'AND';
                    filters[filters.length] = ['trandate','onorbefore',params.enddate];
                }
            }
            else{
                if(params.createdate){
                    if(filters.length > 0){
                        filters[filters.length] = 'AND';
                        filters[filters.length] = ['trandate','on',params.createdate];
                    }
                    else{
                        filters[filters.length] = ['trandate','on',params.createdate];
                    }
                }
                if(params.enddate){
                    if(filters.length > 0){
                        filters[filters.length] = 'AND';
                        filters[filters.length] = ['trandate','on',params.enddate];
                    }
                    else{
                        filters[filters.length] = ['trandate','on',params.enddate];
                    }
                }
            }
            if(params.sduedate && params.eduedate){
                if(filters.length > 0){
                    filters[filters.length] = 'AND';
                    filters[filters.length] = ['duedate','onorafter',params.sduedate];
                    filters[filters.length] = 'AND';
                    filters[filters.length] = ['duedate','onorbefore',params.eduedate];
                }
                else{
                    filters[filters.length] = ['duedate','onorafter',params.sduedate];
                    filters[filters.length] = 'AND';
                    filters[filters.length] = ['duedate','onorbefore',params.eduedate];
                }
            }
            else{
                if(params.sduedate){
                    if(filters.length > 0){
                        filters[filters.length] = 'AND';
                        filters[filters.length] = ['duedate','on',params.sduedate];
                    }
                    else{
                        filters[filters.length] = ['duedate','on',params.sduedate];
                    }
                }
                if(params.eduedate){
                    if(filters.length > 0){
                        filters[filters.length] = 'AND';
                        filters[filters.length] = ['duedate','on',params.eduedate];
                    }
                    else{
                        filters[filters.length] = ['duedate','on',params.eduedate];
                    }
                }
            }
            //子公司
            if(params.sub){
                if(filters.length > 0){
                    filters[filters.length] = "AND";
                    filters[filters.length] = ['subsidiary','anyof',params.sub];
                }
                else{
                    filters[filters.length] = ['subsidiary','anyof',params.sub];
                }
            }
            //币种
            if(params.cur){
                if(filters.length > 0){
                    filters[filters.length] = "AND";
                    filters[filters.length] = ['currency','anyof',params.cur];
                }
                else{
                    filters[filters.length] = ['currency','anyof',params.cur];
                }
            }
            //科目
            if(params.acc){
                if(filters.length > 0){
                    filters[filters.length] = "AND";
                    filters[filters.length] = ['accountmain','anyof',params.acc];
                }
                else{
                    filters[filters.length] = ['accountmain','anyof',params.acc];
                }
            }
            //物流供应商类型
            if(role_flag){
                log.debug('filters role',role_flag);
                if(role != 3){ //非管理员要区分是否物流供应商
                    if(role_flag == 'Y'){
                        // search.createFilter({name:"custentity_rm_supplier_type",operator: search.Operator.ANYOF,join:'vendor',values:['4']});//TODO:filterExpression和createFilter合并使用
                        filters[filters.length] = 'AND';
                        filters[filters.length] = ['vendor.custentity_rm_supplier_type','anyof',2];
                    }
                    else if(role_flag == 'N'){
                        // search.createFilter({name:"custentity_rm_supplier_type",operator: search.Operator.NONEOF,join:'vendor',values:['4']});
                        filters[filters.length] = 'AND';
                        filters[filters.length] = ['vendor.custentity_rm_supplier_type','noneof',2];
                    }
                }
            }
            if(filters.length > 0){
                filters[filters.length] = 'AND';
                filters[filters.length] = ['type','anyof',["VendBill","VendCred"]];
                filters[filters.length] = 'AND';
                filters[filters.length] = ['mainline','is',false];      //主线
                // filters[filters.length] = ['mainline','any',[]];
                filters[filters.length] = 'AND';
                filters[filters.length] = ['posting','is',true];          //过账
                // filters[filters.length] = 'AND';
                // filters[filters.length] = ['status','anyof',["VendBill:A"]],
                filters[filters.length] = 'AND';
                filters[filters.length] = ['taxline','is',false];        //税行
                mySearch.filterExpression = filters;
                log.debug('filterExpression',JSON.stringify(mySearch.filterExpression));
            }

            return mySearch;
        }
        return {
            onRequest: onRequest
        };

    });