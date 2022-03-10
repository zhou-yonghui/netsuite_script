/**
 * 发票应付申请表
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */
define(['N/search', 'N/ui/serverWidget', 'N/runtime', 'N/record', 'N/file', 'N/redirect', 'N/task', 'N/query','N/http','N/format','N/currency','SuiteScripts/handlebars.min','N/encode','N/render'],

    function(search, serverWidget, runtime, record, file, redirect, task, query, http,format,currencyRate,Handlebars,encode,render) {

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
            if(context.request.method == 'GET'){
                var form = createForm(context,parameters);
                // var role = runtime.getCurrentUser().role;
                // log.debug('role',role);
                // var role_flag = checkRole(role);
                // if(parameters.employee || parameters.createdate || parameters.enddate){
                //对表单赋值
                form = setFieldToForm(form,parameters);
                // }
                context.response.writePage(form);
            }
            else{
                // log.debug('post parm',parameters);
                //获取页面数据
                var all_data = getCheckSublistValue(context);
                var ret = printExcel(all_data);
                if(ret){
                    //跳转结果页面
                    var form = createSuccessForm(context,ret);

                    context.response.writePage(form);
                }
            }
        }
        function printExcel(all_data){
            var ret = new Object();
            var xml_id = 914;
            //加载xml文件
            var excelModel = file.load({
                id:xml_id,
            });
            var beijing = new Date(new Date().getTime()+(parseInt(new Date().getTimezoneOffset()/60) + 8)*3600*1000);//北京时间
            var month = Number(beijing.getMonth()) + Number(1);
            log.debug('month',month);
            var file_name = beijing.getFullYear() + month + beijing.getDate() + beijing.getTime();
            var file_type = 'inv';
            //输出excel
            var template = Handlebars.compile(excelModel.getContents());
            var xlsXML = template();//TODO:template()能传入一个参数，此参数传入xml
            var strXmlEncoded = encode.convert({
                string : xlsXML,
                inputEncoding : encode.Encoding.UTF_8,
                outputEncoding : encode.Encoding.BASE_64
            });
            var objXlsFile = file.create({
                name : file_type + file_name + '.xls',
                fileType : file.Type.EXCEL,
                contents : strXmlEncoded
            });
            objXlsFile.folder = 14;
            var intFileId = objXlsFile.save();
            log.debug('intFileId',intFileId);
            ret.intFileId = intFileId;
            ret.flag = 1;
            ret.name = file_type + file_name + '.xls';

            return ret;
        }
        function createSuccessForm(context,ret) {
            var wo_url;
            var field_list = [
                {
                    "id":'custpage_result_info',
                    "type":serverWidget.FieldType.LABEL,
                    "label":'<a target="_blank"><h2 style="color: blue;">生成成功</h2></a>',
                },
                {
                    "id":'custpage_result_info_2',
                    "type":serverWidget.FieldType.LABEL,
                    "label":'<a target="_blank"><p style="color: blue;">生成失败:'+ ret.result +'</P></a>',
                },
                {
                    "id":'custpage_result_info_3',
                    "type":serverWidget.FieldType.LABEL,
                    "label":'<a target="_blank"><p style="color: blue;">生成失败:没有勾选数据</P></a>',
                },
            ]
            // if(){
            /**form主体信息 */
            var form = serverWidget.createForm({
                title: '发票打印结果页面',
            });
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
            var page_sublist = form.addSublist({ id: 'custpage_sublistid', type: 'staticlist', label: '生成结果' });
            var wo_field = page_sublist.addField({ id: 'custpage_line_ack', type: 'text', label: '文件存放的文件夹' });
            wo_field.updateDisplayType({ displayType: 'readonly' });
            var excel_field = page_sublist.addField({ id: 'custpage_file_name', type: 'text', label: '文件名' });
            var file_name;
            if(ret.flag == '1'){
                wo_url = '<a href="https://7373203.app.netsuite.com/app/common/media/mediaitem.nl?id='+ ret.intFileId +'&whence="><p style="color: blue;">'+ ret.name +'</P></a>';
                file_name = ret.name;
            }
            else if(ret.flag == '2' || ret.flag == '3'){
                wo_url = '未生成';
            }
            page_sublist.setSublistValue({ id: 'custpage_line_ack', line: 0, value: wo_url });
            page_sublist.setSublistValue({ id: 'custpage_file_name', line: 0, value: file_name });
            // }
            return form;
        }
        function getCheckSublistValue(context) {
            var all_data = new Object();
            var sublist_data = new Array();
            var count = context.request.getLineCount({group:'custpage_sublist'});
            log.debug('count',count);
            for(var i = 0;i < count;i++){
                var obj = new Object();
                var check = context.request.getSublistValue({ group: 'custpage_sublist', name: 'custpage_check_sub', line: i });
                if(check == 'T'){
                    var employe = context.request.getSublistValue({ group: 'custpage_sublist', name: 'custpage_sub_employee', line: i });
                    obj.employe = employe;
                }
                sublist_data.push(obj);
            }
            all_data.sublist_data = sublist_data;

            log.debug('all_data',all_data);
            return all_data;
        }
        function createForm(context,parameters) {
            var field_list = [

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
                    'id':'custpage_brand',
                    'type':serverWidget.FieldType.TEXT,
                    'label':'品牌',
                    'flag':'1',
                },
                {
                    'id':'custpage_sku',
                    'type':serverWidget.FieldType.TEXT,
                    'label':'产品名称',
                    'flag':'1',
                },
                {
                    'id':'custpage_po_vendor',
                    'type':serverWidget.FieldType.TEXT,
                    'label':'供应商',
                    'flag':'1',
                },
                {
                    'id':'custpage_price_org',
                    'type':serverWidget.FieldType.TEXT,
                    'label':'单价（原币）',
                    'flag':'1',
                },
                {
                    'id':'custpage_po_date',
                    'type':serverWidget.FieldType.TEXT,
                    'label':'采购日期',
                    'flag':'1',
                },
                {
                    'id':'custpage_num',
                    'type':serverWidget.FieldType.TEXT,
                    'label':'数量',
                    'flag':'1',
                },
                {
                    'id':'custpage_xiaoji',
                    'type':serverWidget.FieldType.TEXT,
                    'label':'小计',
                    'flag':'1',
                },
                {
                    'id':'custpage_currency',
                    'type':serverWidget.FieldType.TEXT,
                    'label':'币种',
                    'flag':'1',
                },
                {
                    'id':'custpage_gpl',
                    'type':serverWidget.FieldType.TEXT,
                    'label':'GPL',
                    'flag':'1',
                },
            ];
            /**form主体信息 */
            var form = serverWidget.createForm({
                title: '应付申请表',
            });
            form.clientScriptModulePath = 'SuiteScripts/Client/CL_CS_INV.js';//关联客户端脚本
            //生成按钮
            form.addSubmitButton({
                label: '打印'
            });

            //  //查询按钮
            //  form.addButton({
            //      id:'custpage_check_button',
            //      label: '查询',
            //      functionName:'search'
            //  });
            //  //刷新按钮
            //  form.addButton({
            //      id:'custpage_refresh_button',
            //      label:'刷新',
            //      functionName:'refresh',
            //  })
            //查询条件
            //  form.addFieldGroup({
            //      id: 'custpage_check',
            //      label: '查询条件',
            //  });
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
                    field.isMandatory = true;
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
        function setFieldToForm(form,parameters,obj) {
            var search_result = doSearch(parameters);
            log.debug('search_result',search_result.length+search_result);
            var out_data = getSumData(search_result);
            log.debug('out_data',out_data.length+JSON.stringify(out_data));
            var sublist_info = form.getSublist('custpage_sublist');
            var line = Number(0);
            for(var i = 0;i < search_result.length;i++){
                var vendor = 'null';
                var date = 'null';
                var flag = 'N';
                for(var j = 0;j < out_data.length;j++){
                    if(search_result[i].id == out_data[j].id){
                        vendor = out_data[j].po_vendor;
                        date = out_data[j].po_date;
                        flag = 'Y';
                    }
                }
                // log.debug('vendor date',vendor + '--' + date);
                if(flag == 'Y'){
                    sublist_info.setSublistValue({
                        id:'custpage_po_vendor',
                        value:vendor,
                        line:line,
                    });
                    sublist_info.setSublistValue({
                        id:'custpage_po_date',
                        value:date,
                        line:line,
                    });

                    if(search_result[i].brand){
                        sublist_info.setSublistValue({
                            id:'custpage_brand',
                            value:search_result[i].brand,
                            line:line,
                        });
                    }
                    else{
                        sublist_info.setSublistValue({
                            id:'custpage_brand',
                            value:' ',
                            line:line,
                        });
                    }
                    sublist_info.setSublistValue({
                        id:'custpage_price_org',
                        value:search_result[i].price_orgin,
                        line:line,
                    });
                    sublist_info.setSublistValue({
                        id:'custpage_num',
                        value:search_result[i].qty,
                        line:line,
                    });
                    sublist_info.setSublistValue({
                        id:'custpage_sku',
                        value:search_result[i].sku_name,
                        line:line,
                    });
                    if(search_result[i].xiaoji_orgin){
                        sublist_info.setSublistValue({
                            id:'custpage_xiaoji',
                            value:search_result[i].xiaoji_orgin,
                            line:line,
                        });
                    }
                    else{
                        sublist_info.setSublistValue({
                            id:'custpage_xiaoji',
                            value:' ',
                            line:line,
                        });
                    }
                    if(search_result[i].currency){
                        sublist_info.setSublistValue({
                            id:'custpage_currency',
                            value:search_result[i].currency,
                            line:line,
                        });
                    }else{
                        sublist_info.setSublistValue({
                            id:'custpage_currency',
                            value:' ',
                            line:line,
                        });
                    }
                    if(search_result[i].gpl){
                        sublist_info.setSublistValue({
                            id:'custpage_gpl',
                            value:search_result[i].gpl,
                            line:line,
                        });
                    }else{
                        sublist_info.setSublistValue({
                            id:'custpage_gpl',
                            value:' ',
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
                            "employe":obj.sublist_data[0].employe,
                            "salesorder":res[i].getText('custrecord_sl_xsdd'),
                            "order_date":res[i].getValue('custrecordrlsj'),
                            "is_w1":true,
                        })
                    }else{
                        deatails_arr.push({
                            "customer":res[i].getText('custrecord_sl_kh'),
                            "employe":obj.sublist_data[0].employe,
                            "salesorder":res[i].getText('custrecord_sl_xsdd'),
                            "order_date":res[i].getValue('custrecordrlsj'),
                            "is_w1":false,
                        })
                    }
                }
            }
            return deatails_arr;
        }
        function getSumData(result){
            var out_arr = new Array();
            if(result.length > 0){
                for(var i = 0;i < result.length;i++){
                    if(result[i].po_id){
                        var po_rec = record.load({
                            type:'purchaseorder',
                            id:result[i].po_id,
                            isDynamic:true,
                        });
                        out_arr.push({
                            "id":result[i].id,
                            "po_date":po_rec.getText('trandate'),
                            "po_vendor":po_rec.getText('entity'),
                        });
                    }
                }
            }

            return out_arr;
        }
        function doSearch(params) {
            var item_arr = new Array();
            var num = Number(0);
            var inv_search = search.create({
                type:'invoice',
                filters:[
                    ["status",'anyof',['CustInvc:A']],
                    'AND',['mainline','is',true]
                ],
            });
            var inv_res = inv_search.run().getRange(0,1000);
            for(var i = 0;i < inv_res.length;i++){
                // var list_arr = new Array();
                var inv_rec = record.load({
                    type:'invoice',
                    id:inv_res[i].id,
                    isDynamic:true,
                });
                var currency = inv_rec.getText('currency');
                var item_count = inv_rec.getLineCount('item');
                for(var j = 0;j < item_count;j++){
                    inv_rec.selectLine('item',j);
                    var sku_name = inv_rec.getCurrentSublistText({
                        sublistId:'item',
                        fieldId:'item',   //货品
                    });
                    var brand = inv_rec.getCurrentSublistText({
                        sublistId:'item',
                        fieldId:'custcol_y_so_brand',   //品牌
                    });
                    var price_orgin = inv_rec.getCurrentSublistValue({
                        sublistId:'item',
                        fieldId:'rate',   //单价
                    });
                    var qty = inv_rec.getCurrentSublistValue({
                        sublistId:'item',
                        fieldId:'quantity',   //数量
                    });
                    var gpl = inv_rec.getCurrentSublistText({
                        sublistId:'item',
                        fieldId:'custcol_y_so_gpl',   //gpl
                    });
                    var xiaoji_orgin = inv_rec.getCurrentSublistValue({
                        sublistId:'item',
                        fieldId:'custcol_sl_spo_xiaoj',   //小计
                    });
                    var po_id = inv_rec.getCurrentSublistValue({
                        sublistId:'item',
                        fieldId:'custcol_sl_po_id',   //采购订单
                    });
                    item_arr.push({
                        "id":num,
                        "currency":currency,
                        "sku_name":sku_name,
                        "brand":brand,
                        "price_orgin":price_orgin,
                        "qty":qty,
                        "gpl":gpl,
                        "xiaoji_orgin":xiaoji_orgin,
                        "po_id":po_id,
                        "inv_id":inv_res[i].id,
                    })
                    num += Number(1);
                }
                // item_arr.push(list_arr);
            }

            return item_arr;
        }
        return {
            onRequest: onRequest
        };

    });