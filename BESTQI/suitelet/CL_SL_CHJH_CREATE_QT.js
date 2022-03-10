/**
 *@NApiVersion 2.x
 *@NScriptType Suitelet
 *出货计划转质检单
 */
 define(['N/search', 'N/ui/serverWidget', 'N/runtime', 'N/redirect', 'N/record', "../utils/NS_UTIL_FUNCTION"], function (search, ui, runtime, redirect, record, NS_UTIL_FUNCTION) {

    function onRequest(context) {
        try {
            var response = context.response;
            var request = context.request;
            var method = request.method;
            var params = request.parameters; //参数
            //在方法中去做UI的初始化并判断GET/POST
            showResult(method, params, response, request);
        } catch (e) {
            log.debug('e', e)
        }
    }

    function showResult(method, params, response, request) {
        //获取当前登录用户信息
        var user = runtime.getCurrentUser().id;
        //获取当前导入状态
        var empField = search.lookupFields({ type: 'employee', id: user, columns: ['custentity_ch_to_qt_status', 'custentity_ch_to_qt_info'] });
        var page_turning = {};
        var currentPage = params.currentPage;
        if (!currentPage || currentPage == 0 || currentPage < 0) {
            currentPage = 1; //当前页
        }
        var sizePage = params.pagesize;
        if (!sizePage || sizePage == 0 || sizePage < 0) {
            sizePage = 20; //当前条数
        }
        page_turning.currentPage = currentPage;
        page_turning.sizePage = sizePage;
        if (method == 'GET') {
            var page_form = '';
            if (empField.custentity_ch_to_qt_status == '' || empField.custentity_ch_to_qt_status[0].value == 1) {
                var result = getNeedData(params, page_turning);//获取数据
                log.debug('result', result);
                page_form = createForm(params, page_turning, result);
                page_form = setFormValue(page_form, result);//渲染结果
            } else if (empField.custentity_ch_to_qt_status[0].value == 2) { //正在生成
                page_form = createCreateingForm();
            } else if (empField.custentity_ch_to_qt_status[0].value == 3) { //生成成功
                page_form = createSuccessForm(empField);
                record.submitFields({
                    type: 'employee',
                    id: user,
                    values: {
                        custentity_ch_to_qt_status: 1,
                        custentity_ch_to_qt_info: ''
                    }
                });
            }
            response.writePage(page_form);
        } else {
            //获取页面勾选数据
            var alldatas_arr = get_all_datas(request);
            var tosch = {};
            tosch.user = user;
            tosch.info = alldatas_arr;
            log.debug('tosch', tosch);
            // 调用异步处理程序
            var scriptParam = {};
            scriptParam.custscript_chqt_info = JSON.stringify(tosch);
            // scriptParam.custscript_user_id = runtime.getCurrentUser().id;
            NS_UTIL_FUNCTION.commonSubmitMp('customscript_cl_mp_chjh_create_qt', '出货计划转质检数据处理', scriptParam, 2);

            record.submitFields({
                type: 'employee',
                id: user,
                values: {
                    custentity_ch_to_qt_status: 2
                }
            });

            redirect.toSuitelet({
                scriptId: 'customscript_cl_sl_chjh_create_qt',
                deploymentId: 'customdeploy_cl_sl_chjh_create_qt',
            });
        }
    }

    //创建Form
    function createForm(params, page_turning, result) {
        var form = ui.createForm({ title: '出货计划生成质检单' });
        form.clientScriptFileId = 713;
        //按钮
        form.addSubmitButton({ label: '提交' });
        form.addButton({ id: 'search_data', label: '搜索', functionName: 'Select' });
        //分组
        form.addFieldGroup({ id: 'search_group', label: '查询条件' });
        var search_po_num = form.addField({ id: 'search_po_num', type: ui.FieldType.MULTISELECT, source: 'purchaseorder', label: '采购订单号', container: 'search_group' });
        search_po_num.defaultValue = params.search_po_num ? params.search_po_num.split(',') : '';
        var search_ch_num = form.addField({ id: 'search_ch_num', type: ui.FieldType.MULTISELECT, source: 'customrecord_wl_plan_detail', label: '出货计划', container: 'search_group' });
        search_ch_num.defaultValue = params.search_ch_num ? params.search_ch_num.split(',') : '';
        var search_item_ids = form.addField({ id: 'search_item_ids', type: ui.FieldType.MULTISELECT, source: 'item', label: 'SKU', container: 'search_group' });
        search_item_ids.defaultValue = params.search_item_ids ? params.search_item_ids.split(',') : '';
        //子列表
        form.addFieldGroup({ id: 'page_information', label: '分页信息' });
        //创建翻页字段
        var field_currentPage = form.addField({ id: 'custpage_currentpage', type: 'integer', label: '当前页', container: 'page_information' });
        field_currentPage.updateDisplaySize({ height: 15, width: 2 });
        field_currentPage.updateLayoutType({ layoutType: 'startrow' });
        field_currentPage.defaultValue = page_turning.currentPage;
        var field_totalPage = form.addField({ id: 'custpage_totalpage', type: 'integer', label: '总页数', container: 'page_information' });
        //总页数不可编辑
        field_totalPage.updateDisplaySize({ height: 15, width: 2 });
        field_totalPage.updateDisplayType({ displayType: 'disabled' });
        field_totalPage.updateLayoutType({ layoutType: 'endrow' });
        if (typeof (result.allpage) == 'undefined') {
            result.allpage = 1;
        }
        field_totalPage.defaultValue = result.allpage;
        var field_PageSize = form.addField({ id: 'custpage_pagesize', type: 'select', label: '每页条数', container: 'page_information' });
        field_PageSize.addSelectOption({ value: '20', text: '20' });
        field_PageSize.addSelectOption({ value: '50', text: '50' });
        field_PageSize.addSelectOption({ value: '100', text: '100' });
        field_PageSize.addSelectOption({ value: '200', text: '200' });
        field_PageSize.updateLayoutType({ layoutType: 'startrow' });
        field_PageSize.defaultValue = page_turning.sizePage;

        var info_sublist = form.addSublist({ id: 'info_list', type: ui.SublistType.LIST, label: '列表' });
        info_sublist.addButton({ id: 'custpage_sublistbuttonId1', label: '上一页', functionName: 'nextPage(' + (Number(page_turning.currentPage) - 1) + ',' + result.allpage + ')' });
        info_sublist.addButton({ id: 'custpage_sublistbuttonId', label: '下一页', functionName: 'nextPage(' + (Number(page_turning.currentPage) + 1) + ',' + result.allpage + ')' });
        info_sublist.addMarkAllButtons();
        info_sublist.addField({ id: 'custpage_line_checkbox', type: ui.FieldType.CHECKBOX, label: '选择' });
        info_sublist.addField({ id: 'bill_num', type: ui.FieldType.SELECT, source: 'customrecord_wl_plan_detail', label: '出货计划单号' }).updateDisplayType({ displayType: 'inline' });
        info_sublist.addField({ id: 'bill_detail_num', type: ui.FieldType.SELECT, source: 'customrecord_wl_plan_list', label: '出货计划明细单号' }).updateDisplayType({ displayType: 'inline' });
        info_sublist.addField({ id: 'po_num', type: ui.FieldType.SELECT, source: 'purchaseorder', label: '采购单号' }).updateDisplayType({ displayType: 'inline' });
        info_sublist.addField({ id: 'supplier_name', type: ui.FieldType.SELECT, source: 'vendor', label: '供应商名称' }).updateDisplayType({ displayType: 'inline' });
        info_sublist.addField({ id: 'po_date', type: ui.FieldType.DATE, label: '采购订单日期' });
        info_sublist.addField({ id: 'item_name', type: ui.FieldType.SELECT, source: 'item', label: '货品名称' }).updateDisplayType({ displayType: 'inline' });
        info_sublist.addField({ id: 'po_quantity', type: ui.FieldType.INTEGER, label: '采购订单数量' });
        info_sublist.addField({ id: 'ch_quantity', type: ui.FieldType.INTEGER, label: '计划发运数量' });
        info_sublist.addField({ id: 'inspected_quantity', type: ui.FieldType.INTEGER, label: '已质检数量' });
        var qt_quantity = info_sublist.addField({ id: 'qt_quantity', type: ui.FieldType.INTEGER, label: '本次质检数量' }).updateDisplayType({ displayType: 'entry' });
        qt_quantity.isMandatory = true;
      	/**2021/11/22添加字段*/
      	var qt_date =  info_sublist.addField({ id: 'custpage_qt_date', type: ui.FieldType.DATE, label: '预计质检日期' }).updateDisplayType({ displayType: 'entry' });
          qt_date.isMandatory = true;
      	// info_sublist.addField({ id: 'custpage_qt_qty', type: ui.FieldType.INTEGER, label: '要求质检数量' }).updateDisplayType({ displayType: 'entry' });
        var po_memo = info_sublist.addField({ id: 'custpage_po_memo', type: ui.FieldType.TEXT, label: '采购备注' }).updateDisplayType({ displayType: 'entry' });
        po_memo.isMandatory = true;
        return form;
    }

    //获取数据
    function getNeedData(params, page_turning) {
        var ret = {};
        var allpage = 1;
        var filters = [];
        filters.push(['custrecord_hl_bsq_plan_title.isinactive', 'is', false]);
        filters.push('and');
        filters.push(['formulanumeric: {custrecord_hl_bsq_plan_po_qty} - {custrecord_inspected_quantity}', 'greaterthan', 0]);
        filters.push('and');
        filters.push(['custrecord_hl_bsq_plan_po_number.mainline', 'is', true]);
        if (params.search_po_num) {
            var po_num_arr = params.search_po_num.split(',');
            filters.push('and');
            filters.push(['custrecord_hl_bsq_plan_po_number', 'anyof', po_num_arr]);
        }
        if (params.search_ch_num) {
            var ch_num_arr = params.search_ch_num.split(',');
            filters.push('and');
            filters.push(['custrecord_hl_bsq_plan_title', 'anyof', ch_num_arr]);
        }
        if (params.search_item_ids) {
            var item_ids = params.search_item_ids.split(',');
            filters.push('and');
            filters.push(['custrecord_hl_bsq_plan_sku', 'anyof', item_ids]);
        }
        var search_rec = search.create({
            type: 'customrecord_wl_plan_list',
            filters: filters,
            columns: [
                { name: 'custrecord_hl_bsq_plan_title', sort: 'DESC' },
                'custrecord_hl_bsq_plan_po_number',
                'custrecord_hl_bsq_plan_supplier',
                { name: 'trandate', join: 'custrecord_hl_bsq_plan_po_number' },
                'custrecord_hl_bsq_plan_sku',
                'custrecord_hl_bsq_plan_po_qty',
                'custrecord_inspected_quantity'
            ]
        });
        var res = search_rec.runPaged({ pageSize: page_turning.sizePage });
        var totalcount = res.count; //总数量
        log.debug('totalcount', totalcount);
        if (totalcount > 0) {
            if (totalcount > page_turning.sizePage) {
                allpage = Math.ceil(totalcount / page_turning.sizePage);
            }
            var currentPage2 = page_turning.currentPage - 1;
            //PagedData.fetch（选项）-- 此方法检索指定页面范围内的数据
            var searchResults = res.fetch({ index: currentPage2 }); //搜索第f页的数据
            var searchResult = searchResults.data; //分页搜索的结果
            ret.columns = search_rec.columns;
            ret.datas = searchResult;
            ret.allpage = allpage;
        }
        return ret;
    }

    //渲染结果                  
    function setFormValue(page_form, result) {
        var data_arr = result.datas;
        var columns = result.columns;
        var page_sublist = page_form.getSublist('info_list');
        if (data_arr && data_arr.length > 0) {
            for (var i = 0; i < data_arr.length; i++) {
                data_arr[i].getValue(columns[0]) ? page_sublist.setSublistValue({ id: 'bill_num', line: i, value: data_arr[i].getValue(columns[0]) || '' }) : '';
                data_arr[i].id ? page_sublist.setSublistValue({ id: 'bill_detail_num', line: i, value: data_arr[i].id || '' }) : '';
                data_arr[i].getValue(columns[1]) ? page_sublist.setSublistValue({ id: 'po_num', line: i, value: data_arr[i].getValue(columns[1]) || '' }) : '';
                data_arr[i].getValue(columns[2]) ? page_sublist.setSublistValue({ id: 'supplier_name', line: i, value: data_arr[i].getValue(columns[2]) || '' }) : '';
                data_arr[i].getValue(columns[3]) ? page_sublist.setSublistValue({ id: 'po_date', line: i, value: data_arr[i].getValue(columns[3]) || '' }) : '';
                data_arr[i].getValue(columns[4]) ? page_sublist.setSublistValue({ id: 'item_name', line: i, value: data_arr[i].getValue(columns[4]) || '' }) : '';
                data_arr[i].getValue(columns[5]) ? page_sublist.setSublistValue({ id: 'ch_quantity', line: i, value: data_arr[i].getValue(columns[5]) || 0 }) : '';
                data_arr[i].getValue(columns[5]) ? page_sublist.setSublistValue({ id: 'po_quantity', line: i, value: data_arr[i].getValue(columns[5]) || 0 }) : '';
                data_arr[i].getValue(columns[6]) ? page_sublist.setSublistValue({ id: 'inspected_quantity', line: i, value: data_arr[i].getValue(columns[6]) || 0 }) : page_sublist.setSublistValue({ id: 'inspected_quantity', line: i, value: Number(0).toFixed() });
                page_sublist.setSublistValue({ id: 'qt_quantity', line: i, value: (data_arr[i].getValue(columns[5]) - (data_arr[i].getValue(columns[6]) ? data_arr[i].getValue(columns[6]) : 0)).toFixed() || Number(0).toFixed() });
            }
        }
        return page_form;
    }

    //获取页面勾选数据
    function get_all_datas(req) {
        var ret_arr = [];
        var count = req.getLineCount({ group: 'info_list' });
        for (var i = 0; i < count; i++) {
            var check_box = req.getSublistValue({ group: 'info_list', name: 'custpage_line_checkbox', line: i });
            if (check_box == 'T' || check_box == true) {
                var data = {};
                data.bill_num = req.getSublistValue({ group: 'info_list', name: 'bill_num', line: i });
                data.po_num = req.getSublistValue({ group: 'info_list', name: 'po_num', line: i });
                data.supplier_name = req.getSublistValue({ group: 'info_list', name: 'supplier_name', line: i });
                data.item_name = req.getSublistValue({ group: 'info_list', name: 'item_name', line: i });
                data.qt_quantity = req.getSublistValue({ group: 'info_list', name: 'qt_quantity', line: i });
                data.po_quantity = req.getSublistValue({ group: 'info_list', name: 'po_quantity', line: i });
                data.bill_detail_num = req.getSublistValue({ group: 'info_list', name: 'bill_detail_num', line: i });
                /***2021/11/22 添加获取明细行数据 */
                data.qt_date = req.getSublistValue({ group: 'info_list', name: 'custpage_qt_date', line: i });
                // data.qt_qty = req.getSublistValue({ group: 'info_list', name: 'custpage_qt_qty', line: i });
                data.po_memo = req.getSublistValue({ group: 'info_list', name: 'custpage_po_memo', line: i });
                ret_arr.push(data);
            }
        }
        return ret_arr;
    }

    //正在生成页面
    function createCreateingForm() {
        var page_form = ui.createForm({ title: '正在生成中', hideNavBar: false });
        page_form.clientScriptFileId = 713;
        page_form.addButton({ id: 'custpage_search_data', label: '刷新', functionName: 'refreshBoundary' });
        page_form.addField({ id: 'custpage_label', type: 'label', label: '<p style="color: red;">正在生成，请刷新页面查看结果</p>', });
        return page_form;
    }

    //生成成功页面
    function createSuccessForm(empField) {
        if (empField.custentity_ch_to_qt_info) {
            var info = JSON.parse(empField.custentity_ch_to_qt_info);
        }
        log.debug('info', info);
        var page_form = ui.createForm({ title: '生成完成！', hideNavBar: false });
        page_form.clientScriptFileId = 713;
        page_form.addButton({ id: 'custpage_search_data', label: '刷新', functionName: 'refreshBoundary' });
        if (info) {
            if (info.fail == 0 || info.fail == '0') {
                page_form.addField({ id: 'custpage_label', type: 'label', label: '<p style="color: green;">提交创建的质检单数量为：' + info.length + '张；<br/>已成功创建的质检单数量为:' + info.success + '张;<br/>已失败的质检单数量为:' + info.fail + '张;<br/>刷新后返回筛选页面。</p>', });
            } else {
                page_form.addField({ id: 'custpage_label', type: 'label', label: '<p style="color: red;">提交创建的质检单数量为：' + info.length + '张；<br/>已成功创建的质检单数量为:' + info.success + '张;<br/>已失败的质检单数量为:' + info.fail + '张;<br/>刷新后返回筛选页面。</p>', });
            }
        }
        var page_sublist = page_form.addSublist({ id: 'custpage_sublistid', type: 'staticlist', label: 'Results' });
        var wo_field = page_sublist.addField({ id: 'custpage_line_ack', type: 'text', label: '生成的质检单' });
        wo_field.updateDisplayType({ displayType: 'readonly' });
        page_sublist.addField({ id: 'custpage_line_msg', type: 'text', label: '报错信息' });
        if (info && info.resultarr && info.resultarr.length > 0) {
            for (var i = 0; i < info.resultarr.length; i++) {
                var wo_url = '<a href="https://6797408-sb1.app.netsuite.com/app/common/custom/custrecordentry.nl?rectype=53&id=' + info.resultarr[i][0] + '&whence=" target="_blank"><p style="color: red;">' + info.resultarr[i][1] + '</p></a>';
                page_sublist.setSublistValue({ id: 'custpage_line_ack', line: i, value: wo_url });
            }
        }
        if (info && info.errorarr && info.errorarr.length > 0) {
            for (var int = 0; int < info.errorarr.length; int++) {
                log.debug('info.errorarr', info.errorarr[int]);
                page_sublist.setSublistValue({ id: 'custpage_line_msg', line: info.resultarr.length + int, value: info.errorarr[int] });
            }
        }
        return page_form;
    }

    return {
        onRequest: onRequest
    }
});
