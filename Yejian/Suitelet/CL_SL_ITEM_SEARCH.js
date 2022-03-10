/**
 * 货品查询
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
            try{
                var parameters = context.request.parameters;
                var form;
                if(context.request.method == 'GET'){
                    form = createForm(context,parameters);
                    if(parameters.item){
                        //对表单赋值
                        var obj = new Array();
                        form = setFieldToForm(form,parameters,obj);
                    }
                    context.response.writePage(form);
                }
            }catch (e){
                log.debug('error',e);
            }
        }
        function createForm(context,parameters) {
            var field_list = [
                {
                    "id":'custpage_item_arr',
                    "type":serverWidget.FieldType.TEXTAREA,
                    "label":'货品',
                    "source":'',
                    "group":'custpage_check'
                },
                {
                    "id":'custpage_jq',
                    "type":serverWidget.FieldType.CHECKBOX,
                    "label":'精确搜索',
                    "source":'',
                    "group":'custpage_check',
                },
                {
                    "id":'custpage_shuxing',
                    "type":serverWidget.FieldType.MULTISELECT,
                    "label":'属性',
                    "source":'customrecord_oiin_attribute_values',
                    "group":'custpage_check'
                },
            ]
            var sublist_field_list = [
                //flag:1  text；2  checkbox；3 edit text
                {
                    'id':'custpage_iternalid',
                    'type':serverWidget.FieldType.TEXT,
                    'label':'内部标识',
                    'flag':'1',
                },
                {
                    'id':'custpage_name',
                    'type':serverWidget.FieldType.TEXT,
                    'label':'名称',
                    'flag':'1',
                },
                {
                    'id':'custpage_dis_name',
                    'type':serverWidget.FieldType.TEXT,
                    'label':'显示名称',
                    'flag':'1',
                },
                {
                    'id':'custpage_sub_type',
                    'type':serverWidget.FieldType.TEXT,
                    'label':'子类型',
                    'flag':'1',
                },
                {
                    'id':'custpage_des',
                    'type':serverWidget.FieldType.TEXT,
                    'label':'说明',
                    'flag':'1',
                },
                {
                    'id':'custpage_sub_createdate',
                    'type':serverWidget.FieldType.TEXT,
                    'label':'起始时间',
                    'flag':'1',
                },
                {
                    'id':'custpage_base_price',
                    'type':serverWidget.FieldType.TEXT,
                    'label':'基本价格',
                    'flag':'1',
                },
                {
                    'id':'custpage_plan_shuifu',
                    'type':serverWidget.FieldType.TEXT,
                    'label':'税负计划',
                    'flag':'1',
                },
                {
                    'id':'custpage_product',
                    'type':serverWidget.FieldType.TEXT,
                    'label':'产品型号',
                    'flag':'1',
                },
                {
                    'id':'custpage_sku',
                    'type':serverWidget.FieldType.TEXT,
                    'label':'SKU',
                    'flag':'1',
                },
                {
                    'id':'custpage_brand',
                    'type':serverWidget.FieldType.TEXT,
                    'label':'品牌',
                    'flag':'1',
                },
                {
                    'id':'custpage_sub_shuxing',
                    'type':serverWidget.FieldType.TEXT,
                    'label':'属性',
                    'flag':'1',
                },
                {
                    'id':'custpage_wuliao_list',
                    'type':serverWidget.FieldType.TEXT,
                    'label':'物料清单',
                    'flag':'1',
                },
                {
                    'id':'custpage_product_des',
                    'type':serverWidget.FieldType.TEXT,
                    'label':'产品描述',
                    'flag':'1',
                },
                {
                    'id':'custpage_onhand_zk',
                    'type':serverWidget.FieldType.TEXT,
                    'label':'库存折扣',
                    'flag':'1',
                },
                {
                    'id':'custpage_onhand_price',
                    'type':serverWidget.FieldType.TEXT,
                    'label':'库存价',
                    'flag':'1',
                },
                {
                    'id':'custpage_move_zk',
                    'type':serverWidget.FieldType.TEXT,
                    'label':'调货折扣',
                    'flag':'1',
                },
                {
                    'id':'custpage_zh_price',
                    'type':serverWidget.FieldType.TEXT,
                    'label':'折后价格',
                    'flag':'1',
                },
                {
                    'id':'custpage_qjh_zk',
                    'type':serverWidget.FieldType.TEXT,
                    'label':'清洁号折扣',
                    'flag':'1',
                },
                {
                    'id':'custpage_qjh_price',
                    'type':serverWidget.FieldType.TEXT,
                    'label':'清洁号价格',
                    'flag':'1',
                },
                {
                    'id':'custpage_dh_zq',
                    'type':serverWidget.FieldType.TEXT,
                    'label':'调货周期',
                    'flag':'1',
                },
                {
                    'id':'custpage_dz_price',
                    'type':serverWidget.FieldType.TEXT,
                    'label':'定制价格',
                    'flag':'1',
                },
                {
                    'id':'custpage_one_price',
                    'type':serverWidget.FieldType.TEXT,
                    'label':'一口价',
                    'flag':'1',
                },
                {
                    'id':'custpage_product_jb',
                    'type':serverWidget.FieldType.TEXT,
                    'label':'产品级别',
                    'flag':'1',
                },
                {
                    'id':'custpage_open_price',
                    'type':serverWidget.FieldType.TEXT,
                    'label':'公开价格',
                    'flag':'1',
                },
                {
                    'id':'custpage_zd_price',
                    'type':serverWidget.FieldType.TEXT,
                    'label':'指导价格',
                    'flag':'1',
                },
                {
                    'id':'custpage_web_price',
                    'type':serverWidget.FieldType.TEXT,
                    'label':'网站价格',
                    'flag':'1',
                },
                {
                    'id':'custpage_web_zk',
                    'type':serverWidget.FieldType.TEXT,
                    'label':'网站折扣',
                    'flag':'1',
                },
                {
                    'id':'custpage_price_update',
                    'type':serverWidget.FieldType.TEXT,
                    'label':'价格更新时间',
                    'flag':'1',
                },
                {
                    'id':'custpage_zd_weight',
                    'type':serverWidget.FieldType.TEXT,
                    'label':'指导重量',
                    'flag':'1',
                },
                {
                    'id':'custpage_qc_price',
                    'type':serverWidget.FieldType.TEXT,
                    'label':'清仓价',
                    'flag':'1',
                },
                {
                    'id':'custpage_jcqc_qty',
                    'type':serverWidget.FieldType.TEXT,
                    'label':'基础清仓数量',
                    'flag':'1',
                },
                {
                    'id':'custpage_able_qc_qty',
                    'type':serverWidget.FieldType.TEXT,
                    'label':'可清仓数量',
                    'flag':'1',
                },
                {
                    'id':'custpage_able_web',
                    'type':serverWidget.FieldType.TEXT,
                    'label':'允许同步指导价格到网站',
                    'flag':'1',
                },
                {
                    'id':'custpage_able_gwc',
                    'type':serverWidget.FieldType.TEXT,
                    'label':'可以加入购物车',
                    'flag':'1',
                },
                {
                    'id':'custpage_memo',
                    'type':serverWidget.FieldType.TEXT,
                    'label':'备注',
                    'flag':'1',
                },
                {
                    'id':'custpage_ckxx',
                    'type':serverWidget.FieldType.TEXT,
                    'label':'参考信息',
                    'flag':'1',
                },
                {
                    'id':'custpage_weight_jz',
                    'type':serverWidget.FieldType.TEXT,
                    'label':'净重',
                    'flag':'1',
                },
                {
                    'id':'custpage_weight_mz',
                    'type':serverWidget.FieldType.TEXT,
                    'label':'毛重',
                    'flag':'1',
                },
                {
                    'id':'custpage_web_weight',
                    'type':serverWidget.FieldType.TEXT,
                    'label':'网站重量',
                    'flag':'1',
                },
                {
                    'id':'custpage_product_big_type',
                    'type':serverWidget.FieldType.TEXT,
                    'label':'产品大类',
                    'flag':'1',
                },
                {
                    'id':'custpage_web_type',
                    'type':serverWidget.FieldType.TEXT,
                    'label':'网站分类',
                    'flag':'1',
                },
                {
                    'id':'custpage_tj_5000',
                    'type':serverWidget.FieldType.TEXT,
                    'label':'体积/5000',
                    'flag':'1',
                },
                {
                    'id':'custpage_tj_6000',
                    'type':serverWidget.FieldType.TEXT,
                    'label':'体积/6000',
                    'flag':'1',
                },
                {
                    'id':'custpage_price_no',
                    'type':serverWidget.FieldType.TEXT,
                    'label':'零利润价',
                    'flag':'1',
                },
                {
                    'id':'custpage_price_cx',
                    'type':serverWidget.FieldType.TEXT,
                    'label':'促销价',
                    'flag':'1',
                },
                {
                    'id':'custpage_gpl',
                    'type':serverWidget.FieldType.TEXT,
                    'label':'GPL',
                    'flag':'1',
                },
                {
                    'id':'custpage_product_imp',
                    'type':serverWidget.FieldType.TEXT,
                    'label':'主产品',
                    'flag':'1',
                },
                {
                    'id':'custpage_select',
                    'type':serverWidget.FieldType.TEXT,
                    'label':'选项值',
                    'flag':'1',
                },
                {
                    'id':'custpage_product_line',
                    'type':serverWidget.FieldType.TEXT,
                    'label':'产品线',
                    'flag':'1',
                },

            ];
            /**form主体信息 */
            var form = serverWidget.createForm({
                title: '产品信息查询',
            });
            form.clientScriptModulePath = 'SuiteScripts/Client/CL_CS_VB_PARAMETERS.js';//关联客户端脚本
            //生成按钮
            // if(parameters.createdate || parameters.enddate){
            //     form.addSubmitButton({
            //         label: '查询业务员明细'
            //     });
            // }
            // else{
            //     form.addSubmitButton({
            //         label: '查询业务员明细'
            //     }).isDisabled = true;
            // }
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
                functionName:'refreshItem',
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
                var field = form.addField({
                    id:field_list[i].id,
                    type:field_list[i].type,
                    label:field_list[i].label,
                    source:field_list[i].source,
                    container:field_list[i].group
                });
                if(parameters.item && field_list[i].id == 'custpage_item_arr'){
                    field.defaultValue = parameters.item;
                }
                if(parameters.jq && field_list[i].id == 'custpage_jq'){
                    if(parameters.jq == true){
                        field.defaultValue = 'T';
                    }
                }
                if(parameters.sx && field_list[i].id == 'custpage_shuxing'){
                    field.defaultValue = parameters.sx;
                }
            }
            //子列表字段
            var sublist = form.addSublist({
                id:'custpage_sublist',
                type:serverWidget.SublistType.LIST,
                label:'查询信息'
            });
            // sublist.addMarkAllButtons();
            //  sublist.addRefreshButton();
            for(var j = 0;j < sublist_field_list.length;j++){
                if(sublist_field_list[j].flag == "1"){
                    // log.debug('id',sublist_field_list[j].id);
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
            var col = search_result.columns;
            var res = search_result.run().getRange(0,1000);
            log.debug('res',res.length + JSON.stringify(res));
            var sublist_info = form.getSublist('custpage_sublist');
            if(obj.length == 0) {
                var line = Number(0);
                for (var i = 0; i < res.length; i++) {
                    // log.debug('id',res[i].id);
                    if (res[i].id) {sublist_info.setSublistValue({id:'custpage_iternalid',value:res[i].id,line:line});}
                    if (res[i].getValue(col[0])) {sublist_info.setSublistValue({id:'custpage_name',value:res[i].getValue(col[0]),line:line});}
                    if (res[i].getValue(col[1])) {sublist_info.setSublistValue({id:'custpage_dis_name',value:res[i].getValue(col[1]),line:line});}
                    if (res[i].getValue(col[2])) {sublist_info.setSublistValue({id:'custpage_sub_type',value:res[i].getValue(col[2]),line:line});}
                    if (res[i].getValue(col[3])) {sublist_info.setSublistValue({id:'custpage_des',value:res[i].getValue(col[3]),line:line});}
                    if (res[i].getValue(col[4])) {sublist_info.setSublistValue({id:'custpage_sub_createdate',value:res[i].getValue(col[4]),line:line});}
                    if (res[i].getValue(col[5])) {sublist_info.setSublistValue({id:'custpage_base_price',value:res[i].getValue(col[5]),line:line});}
                    if (res[i].getText(col[6])) {sublist_info.setSublistValue({id:'custpage_plan_shuifu',value:res[i].getText(col[6]),line:line});}
                    if (res[i].getValue(col[7])) {sublist_info.setSublistValue({id:'custpage_product',value:res[i].getValue(col[7]),line:line});}
                    if (res[i].getValue(col[8])) {sublist_info.setSublistValue({id:'custpage_sku',value:res[i].getValue(col[8]),line:line});}
                    if (res[i].getText(col[9])) {sublist_info.setSublistValue({id:'custpage_brand',value:res[i].getText(col[9]),line:line});}
                    if (res[i].getValue(col[10])) {//多个属性
                        // var sx_str = '';
                        // for(var x = 0;x < res[i].getValue(col[10]).length;x++){
                        //     sx_str += res[i].getText(col[10])[x]
                        // }
                        sublist_info.setSublistValue({id:'custpage_sub_shuxing',value:res[i].getText(col[10]),line:line});
                    }
                    if (res[i].getValue(col[11])) {sublist_info.setSublistValue({id:'custpage_wuliao_list',value:res[i].getValue(col[11]),line:line});}
                    if (res[i].getValue(col[12])) {sublist_info.setSublistValue({id:'custpage_product_des',value:res[i].getValue(col[12]),line:line});}
                    if (res[i].getValue(col[13])) {sublist_info.setSublistValue({id:'custpage_onhand_zk',value:res[i].getValue(col[13]),line:line});}
                    if (res[i].getValue(col[14])) {sublist_info.setSublistValue({id:'custpage_onhand_price',value:res[i].getValue(col[14]),line:line});}
                    if (res[i].getValue(col[15])) {sublist_info.setSublistValue({id:'custpage_move_zk',value:res[i].getValue(col[15]),line:line});}
                    if (res[i].getValue(col[16])) {sublist_info.setSublistValue({id:'custpage_zh_price',value:res[i].getValue(col[16]),line:line});}
                    if (res[i].getValue(col[17])) {sublist_info.setSublistValue({id:'custpage_qjh_zk',value:res[i].getValue(col[17]),line:line});}
                    if (res[i].getValue(col[18])) {sublist_info.setSublistValue({id:'custpage_qjh_price',value:res[i].getValue(col[18]),line:line});}
                    if (res[i].getValue(col[19])) {sublist_info.setSublistValue({id:'custpage_dh_zq',value:res[i].getValue(col[19]),line:line});}
                    if (res[i].getValue(col[20])) {sublist_info.setSublistValue({id:'custpage_dz_price',value:res[i].getValue(col[20]),line:line});}
                    if (res[i].getValue(col[21])) {sublist_info.setSublistValue({id:'custpage_one_price',value:res[i].getValue(col[21]),line:line});}
                    if (res[i].getValue(col[22])) {sublist_info.setSublistValue({id:'custpage_product_jb',value:res[i].getValue(col[22]),line:line});}
                    if (res[i].getValue(col[23])) {sublist_info.setSublistValue({id:'custpage_open_price',value:res[i].getValue(col[23]),line:line});}
                    if (res[i].getValue(col[24])) {sublist_info.setSublistValue({id:'custpage_zd_price',value:res[i].getValue(col[24]),line:line});}
                    if (res[i].getValue(col[25])) {sublist_info.setSublistValue({id:'custpage_web_price',value:res[i].getValue(col[25]),line:line});}
                    if (res[i].getValue(col[26])) {sublist_info.setSublistValue({id:'custpage_web_zk',value:res[i].getValue(col[26]),line:line});}
                    if (res[i].getValue(col[27])) {sublist_info.setSublistValue({id:'custpage_price_update',value:res[i].getValue(col[27]),line:line});}
                    if (res[i].getValue(col[28])) {sublist_info.setSublistValue({id:'custpage_zd_weight',value:res[i].getValue(col[28]),line:line});}
                    if (res[i].getValue(col[29])) {sublist_info.setSublistValue({id:'custpage_qc_price',value:res[i].getValue(col[29]),line:line});}
                    if (res[i].getValue(col[30])) {sublist_info.setSublistValue({id:'custpage_jcqc_qty',value:res[i].getValue(col[30]),line:line});}
                    if (res[i].getValue(col[31])) {sublist_info.setSublistValue({id:'custpage_able_qc_qty',value:res[i].getValue(col[31]),line:line});}
                    if (res[i].getValue(col[32])) {sublist_info.setSublistValue({id:'custpage_able_web',value:res[i].getValue(col[32]),line:line});}
                    if (res[i].getValue(col[33])) {sublist_info.setSublistValue({id:'custpage_able_gwc',value:res[i].getValue(col[33]),line:line});}
                    if (res[i].getValue(col[34])) {sublist_info.setSublistValue({id:'custpage_memo',value:res[i].getValue(col[34]),line:line});}
                    if (res[i].getValue(col[35])) {sublist_info.setSublistValue({id:'custpage_ckxx',value:res[i].getValue(col[35]),line:line});}
                    if (res[i].getValue(col[36])) {sublist_info.setSublistValue({id:'custpage_weight_jz',value:res[i].getValue(col[36]),line:line});}
                    if (res[i].getValue(col[37])) {sublist_info.setSublistValue({id:'custpage_weight_mz',value:res[i].getValue(col[37]),line:line});}
                    if (res[i].getValue(col[38])) {sublist_info.setSublistValue({id:'custpage_web_weight',value:res[i].getValue(col[38]),line:line});}
                    if (res[i].getValue(col[39])) {sublist_info.setSublistValue({id:'custpage_product_big_type',value:res[i].getText(col[39]),line:line});}
                    if (res[i].getValue(col[40])) {sublist_info.setSublistValue({id:'custpage_web_type',value:res[i].getText(col[40]),line:line});}
                    if (res[i].getValue(col[41])) {sublist_info.setSublistValue({id:'custpage_tj_5000',value:res[i].getValue(col[41]),line:line});}
                    if (res[i].getValue(col[42])) {sublist_info.setSublistValue({id:'custpage_tj_6000',value:res[i].getValue(col[42]),line:line});}
                    if (res[i].getValue(col[43])) {sublist_info.setSublistValue({id:'custpage_price_no',value:res[i].getValue(col[43]),line:line});}
                    if (res[i].getValue(col[44])) {sublist_info.setSublistValue({id:'custpage_price_cx',value:res[i].getValue(col[44]),line:line});}
                    if (res[i].getValue(col[45])) {sublist_info.setSublistValue({id:'custpage_gpl',value:res[i].getValue(col[45]),line:line});}
                    if (res[i].getValue(col[46])) {sublist_info.setSublistValue({id:'custpage_product_imp',value:res[i].getText(col[46]),line:line});}
                    if (res[i].getValue(col[47])) {sublist_info.setSublistValue({id:'custpage_select',value:res[i].getText(col[47]),line:line});}
                    if (res[i].getValue(col[48])) {sublist_info.setSublistValue({id:'custpage_product_line',value:res[i].getValue(col[48]),line:line});}

                    line += Number(1);
                }
                // log.debug('all line',line);
            }

            return form;
        }
        function doSearch(params) {
            var mySearch = search.create({
                type:'item',
                columns:[
                    {name:'itemid',label: '名称'},
                    {name:'displayname',label: '显示名称'},
                    {name:'subtype',label: '子类型'},
                    {name:'salesdescription',label: '说明'},
                    {name:'custitem_dps_promotion_begin',label: '起始时间'},
                    {name:'baseprice',label: '基本价格'},
                    {name:'taxschedule',label: '税负计划'},
                    {name:'custitem1',label: '产品型号'},
                    {name:'custitem_sku',label: 'SKU'},
                    {name:'custitem2',label: '品牌'},
                    {name:'custitem3',label: '属性'},
                    {name:'custitem4',label: '物料清单'},
                    {name:'custitem5',label: '产品描述'},
                    {name:'custitem8',label: '库存折扣'},
                    {name:'custitem9',label: '库存价'},
                    {name:'custitem10',label: '调货折扣'},
                    {name:'custitem12',label: '折后价格'},
                    {name:'custitem13',label: '清洁号折扣'},
                    {name:'custitem14',label: '清洁号价格'},
                    {name:'custitem15',label: '调货周期'},
                    {name:'custitem16',label: '定制价格'},
                    {name:'custitem17',label: '一口价'},
                    {name:'custitem18',label: '产品级别'},
                    {name:'custitem19',label: '公开价格'},
                    {name:'custitem20',label: '指导价格'},
                    {name:'custitem21',label: '网站价格'},
                    {name:'custitem22',label: '网站折扣'},
                    {name:'custitem23',label: '价格更新时间'},
                    {name:'custitem24',label: '指导重量'},
                    {name:'custitem25',label: '清仓价'},
                    {name:'custitem26',label: '基础清仓数量'},
                    {name:'custitem27',label: '可用清仓数量'},
                    {name:'custitem28',label: '允许同步指导价格到网站'},
                    {name:'custitem_oiin_shopping_cart_available',label: '可以加入购物车'},
                    {name:'custitem30',label: '备注'},
                    {name:'custitem31',label: '参考信息'},
                    {name:'custitem32',label: '净重'},
                    {name:'custitem33',label: '毛重'},
                    {name:'custitem36',label: '网站重量'},
                    {name:'custitem38',label: '产品大类'},
                    {name:'custitem39',label: '网站分类'},
                    {name:'custitem40',label: '体积/5000'},
                    {name:'custitem41',label: '体积/6000'},
                    {name:'custitem42',label: '零利润价'},
                    {name:'custitem43',label: '促销价格'},
                    {name:'custitem_sl_gpl',label: 'GPL'},
                    {name:'custitem_oiin_main_sku',label: '主产品'},
                    {name:'custitem_oiin_sku_options',label: '选项值'},
                    {name:'custitem_product_line',label: '产品线'},
                ]
            });
            var filters = [];
            if(params.item){
                var or_filters = [];
                //将货品型号切割
                var no_arr = params.item.split('\n');
                log.debug('no_arr',no_arr);
                if(no_arr.length > 0){
                    for(var r = 0;r < no_arr.length;r++){
                        if(params.jq == true){
                            if(r == 0){
                                or_filters[or_filters.length] = ['custitem1','is',no_arr[r]];
                                // filters[filters.length] = 'AND';
                                // filters[filters.length] = ['itemid','is',no_arr[r]];
                            }else {
                                or_filters[or_filters.length] = 'OR';
                                or_filters[or_filters.length] = ['custitem1','is',no_arr[r]];
                            }
                        }else {
                            if(r == 0){
                                or_filters[or_filters.length] = ['custitem1','contains',no_arr[r]];
                            }else {
                                or_filters[or_filters.length] = 'OR';
                                or_filters[or_filters.length] = ['custitem1','contains',no_arr[r]];
                            }
                        }
                    }
                    log.debug('or_filters',or_filters);
                    filters[filters.length] = or_filters;
                }
            }
            if(params.sx){
                log.debug('sx',params.sx);
                if(filters.length > 0){
                    filters[filters.length] = 'AND';
                    filters[filters.length] = ['custitem3','anyof',params.sx];
                }else {
                    filters[filters.length] = ['custitem3','anyof',params.sx];
                }
            }
            if(filters.length > 0){
                filters[filters.length] = 'AND';
                filters[filters.length] = ['isinactive','is',false];
                // filters[filters.length] = 'AND';
                // filters[filters.length] = ['custrecordrlsj','isnotempty',[]];
                // filters[filters.length] = 'AND';
                // filters[filters.length] = ['custentityfirst_claim_so.mainline','is',true];//TODO：搜索结果里包含主线需要加主线条件
                mySearch.filterExpression = filters;
                log.debug('filterExpression',JSON.stringify(mySearch.filterExpression));
            }

            return mySearch;
        }
        return {
            onRequest: onRequest
        };

    });