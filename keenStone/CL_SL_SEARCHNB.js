/**
 * 查询内部交易价和报关价
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
        var form = createForm(context);
        if(context.request.method == 'GET'){
            context.response.writePage(form);
        }
        else{
            log.debug('post context',JSON.stringify(context.request.parameters));
            var parameters = context.request.parameters;
            var sku_info = saveSearchDo('customsearch_cs_hp_kfy_c1',parameters);//sku信息
            var po_info = saveSearchDo('customsearch_cs_csddylb_s1_4_2_2',parameters);
            var nb_tran_info = saveSearchDo('customsearch_cs_nbjybl_c1',parameters);
            //对表单赋值
            setFieldToForm(form,parameters,sku_info,po_info,nb_tran_info);

            context.response.writePage(form);
        }
     }
     function saveSearchDo(searchid,params) {//TODO：加载超过4000条数据的保存搜索
        var mySearch = search.load(searchid);
        var col = mySearch.columns; 
        var results = mySearch.run().getRange({
            start: 0,
            end: 1000
        });
        var alls = [];
        var j = 1;
        log.debug({
            title: '初始results.length',
            details: results.length
        });
        log.debug('searchid para.sku',searchid + '---' + params.custpage_sku );
        while (results.length > 0 && j < 10) {
            for (var i = 0; i < results.length; i++) {
                var result = results[i];
                var tmp = new Object();
                if(searchid == 'customsearch_cs_hp_kfy_c1' && params.custpage_sku == result.id){      //货品
                    log.debug('itemJson',JSON.stringify(result));
                    tmp.displayname = result.getValue(col[1]);
                    tmp.type = result.getText(col[2]);
                    tmp.unitstype = result.getText(col[3]);
                    tmp.guige = result.getValue(col[4]);
                    tmp.sku = result.id;
                    alls[alls.length] = tmp;
                }
                else if(searchid == 'customsearch_cs_csddylb_s1_4_2_2' && params.custpage_sku == result.getValue(col[2]) && params.custpage_po == result.id){//采购价目表
                    tmp.poprice = result.getValue(col[5]);
                    tmp.pocurrencytext = result.getText(col[6]);
                    tmp.pocurrency = result.getValue(col[6]);
                    alls[alls.length] = tmp;
                    break;     //同采购有多行货品单价相同，采购价相同只取一行就可
                }
                else if(searchid == 'customsearch_cs_nbjybl_c1' && params.custpage_buyer == result.getValue(col[0]) && params.custpage_seller == result.getValue(col[1])){//内部交易加成比例
                    log.debug('neibuJson',JSON.stringify(result));
                    tmp.nbcurrencytext = result.getText('custrecord_cs_zyfsgs_jyhb');
                    tmp.nbcurrency = result.getValue('custrecord_cs_zyfsgs_jyhb');
                    tmp.jybl = result.getValue('custrecord_cs_jjl_record');
                    alls[alls.length] = tmp;
                }
            }
            results = mySearch.run().getRange({
                start: 0 + j * 1000,
                end: 1000 + j * 1000
            });
            j++;
        }
        log.debug('alls',JSON.stringify(alls));
        return alls;
     }
     function createForm(context) {
         var sublist_field_list = [
            {
                'id':'custpage_sku',
                'type':serverWidget.FieldType.MULTISELECT,
                'label':'SKU',
                'group':'custpage_check',
                // 'source':record.Type.ASSEMBLY_ITEM,
                'source':'item',                 
            },
            {
                'id':'custpage_po',
                'type':serverWidget.FieldType.MULTISELECT,
                'label':'PO号',
                'group':'custpage_check',
                'source':record.Type.PURCHASE_ORDER
            },
            {
                'id':'custpage_skudisplay',
                'type':serverWidget.FieldType.TEXTAREA,
                'label':'货品名称',
                'group':'custpage_iteminfo',
                'source':'',
            },
            {
                'id':'custpage_type',
                'type':serverWidget.FieldType.SELECT,
                'label':'类型',
                'group':'custpage_iteminfo',
                'source':'',
            },
            {
                'id':'custpage_unit',
                'type':serverWidget.FieldType.TEXT,
                'label':'单位',
                'group':'custpage_iteminfo',
                'source':''
            },
            {
                'id':'custpage_specification',        
                'type':serverWidget.FieldType.TEXT,
                'label':'规格',
                'group':'custpage_iteminfo',
                'source':''
            },
            {
                'id':'custpage_buyer',
                'type':serverWidget.FieldType.MULTISELECT,
                'label':'买方',
                'group':'custpage_check',
                'source':record.Type.CUSTOMER,
            },
            {
                'id':'custpage_seller',
                'type':serverWidget.FieldType.MULTISELECT,
                'label':'卖方',
                'group':'custpage_check',
                'source':record.Type.VENDOR,
            },
            {
                'id':'custpage_jiaprice',
                'type':serverWidget.FieldType.TEXT,
                'label':'加价比例',
                'group':'custpage_poinfo',
                'source':''
            },
            {
                'id':'custpage_poprice',
                'type':serverWidget.FieldType.TEXT,
                'label':'采购价',
                'group':'custpage_poinfo',
                'source':''
            },
            {
                'id':'custpage_pocurrency',
                'type':serverWidget.FieldType.TEXT,
                'label':'采购币种',
                'group':'custpage_poinfo',
                'source':''
            },
            {
                'id':'custpage_nbtrancurrency',
                'type':serverWidget.FieldType.TEXT,
                'label':'内部交易币种',
                'group':'custpage_bginfo',
                'source':''
            },
            {
                'id':'custpage_nbprice',
                'type':serverWidget.FieldType.TEXT,
                'label':'内部交易价',
                'group':'custpage_bginfo',
                'source':''
            },
            {
                'id':'custpage_bgcurrency',
                'type':serverWidget.FieldType.MULTISELECT,
                'label':'报关币种',
                'group':'custpage_check',
                'source':record.Type.CURRENCY,
            },
            {
                'id':'custpage_rate',
                'type':serverWidget.FieldType.TEXT,
                'label':'汇率',
                'group':'custpage_poinfo',
                'source':''
            },
            {
                'id':'custpage_bgprice',
                'type':serverWidget.FieldType.TEXT,
                'label':'报关价',
                'group':'custpage_bginfo',
                'source':''
            },
            {
                'id':'cutpage_bgcurrency_text',
                'type':serverWidget.FieldType.TEXT,
                'label':'报关币种',
                'group':'custpage_bginfo',
                'source':''
            }
         ];
         /**form主体信息 */
         var form = serverWidget.createForm({
             title: '内部交易查询页面',
         });
         //按钮
         form.addSubmitButton({
             label: '查询'
         });
         form.addResetButton({
             label: '重置'
         });
         //查询条件
         form.addFieldGroup({
             id: 'custpage_check',
             label: '查询条件',
         });
         //货品信息
         form.addFieldGroup({
             id: 'custpage_iteminfo',
             label: '货品信息',
         });
         //采购信息
         form.addFieldGroup({
             id: 'custpage_poinfo',
             label: '采购信息',
         });
         //报关信息
         form.addFieldGroup({
             id:'custpage_bginfo',
             label:'报关信息'
         });
         //主体字段
         for(var i = 0;i < sublist_field_list.length;i++){
             var field = sublist_field_list[i];
             //处理下拉列表字段
             if(field.type == serverWidget.FieldType.SELECT){
                //类型字段下拉列表
                var type = form.addField({
                    id: field.id,
                    label: field.label,
                    type: field.type,
                    source: field.source,
                    container: field.group,
                });
                type.addSelectOption({
                    value: '0',
                    text: '库存货品',
                    // isSelected: true,
                });
                type.addSelectOption({
                    value: '1',
                    text: '装配件/物料清单',
                    // isSelected: true,
                });
                type.addSelectOption({
                    value: '2',
                    text: '项目组',
                    // isSelected: true,
                });
                type.addSelectOption({
                    value:'3',
                    text:'',
                    isSelected: true,
                });
             }
             else{
                if(field.type != serverWidget.FieldType.MULTISELECT && field.id != 'custpage_bgprice' && field.id != 'cutpage_bgcurrency_text'){ //非搜索条件字段默认不可编辑
                    form.addField({
                        id: field.id,
                        label: field.label,
                        type: field.type,
                        source: field.source,
                        container: field.group,
                    }).updateDisplayType({
                        displayType:serverWidget.FieldDisplayType.DISABLED,
                    });
                }
                else{
                    //搜索条件字段
                    form.addField({
                        id: field.id,
                        label: field.label,
                        type: field.type,
                        source: field.source,
                        container: field.group,
                    });
                }
             }
         }


         return form;
     }
     function setFieldToForm(form,params,sku_info,po_info,nb_tran_info) {
        // po_info = [{"poprice":"56.16814159","pocurrency":"1","pocurrencytext":"CNY"}];//TODO：测试
        //货品信息
        if(sku_info.length > 0){
            // form.getField('custpage_sku').defaultValue = sku_info[0].sku;
            form.getField('custpage_skudisplay').defaultValue = sku_info[0].displayname;
            if(sku_info[0].type == '库存货品'){
                form.getField('custpage_type').defaultValue = 0;
            }else if(sku_info[0].type == '装配件/物料清单'){
                form.getField('custpage_type').defaultValue = 1;
            }else{
                form.getField('custpage_type').defaultValue = 2;
            }
            form.getField('custpage_unit').defaultValue = sku_info[0].unitstype;
            form.getField('custpage_specification').defaultValue = sku_info[0].guige;
        }
        //采购信息
        if(po_info.length > 0){
            form.getField('custpage_poprice').defaultValue = po_info[0].poprice;
            form.getField('custpage_pocurrency').defaultValue = po_info[0].pocurrencytext;
        }
        if(nb_tran_info.length > 0){
            form.getField('custpage_nbtrancurrency').defaultValue = nb_tran_info[0].nbcurrencytext;
            form.getField('custpage_jiaprice').defaultValue = nb_tran_info[0].jybl;
        }
        //报关信息
        if(po_info.length > 0 && nb_tran_info.length > 0){
            var nb_tran_price = getRatePrice(po_info[0].pocurrency,nb_tran_info[0].nbcurrency,po_info[0].poprice,nb_tran_info[0].jybl);
            var baoguan_price = getRatePrice(po_info[0].pocurrency,params.custpage_bgcurrency,po_info[0].poprice,nb_tran_info[0].jybl);
            form.getField('custpage_nbprice').defaultValue = nb_tran_price.amount_rate;
            form.getField('custpage_bgprice').defaultValue = baoguan_price.amount_rate;
            form.getField('custpage_rate').defaultValue = nb_tran_price.rate;//内部交易汇率
        }
        if(params.custpage_bgcurrency){
            form.getField('cutpage_bgcurrency_text').defaultValue = getCurrencyDisplay(params.custpage_bgcurrency);
        }
        return form;
     }
     function getCurrencyDisplay(currencyId) {
         log.debug('currencyId',currencyId);
         if(currencyId){
            //  var columns = search.lookupFields({
            //      type:'currency',
            //      id:currencyId,
            //      columns:['name']
            //  });
            //  log.debug('currencycolumns',columns);
            var mysearch = search.create({
                type:search.Type.CURRENCY,
                filters:[['internalid','is',currencyId]],
                columns:['name']
            });
            var res = mysearch.run().getRange(0,1);
            log.debug('res',JSON.stringify(res));
            if(res.length > 0){
                return res[0].getValue('name');
            }
         }
     }
     function getRatePrice(source,target,price,bilv) {
         var res = new Object();
         if(source && target){
            var rate = currencyRate.exchangeRate({
                date: new Date(),
                source: source,
                target: target,
            });
            log.debug('rate',rate);
            res.rate = rate;
            if(price && rate){
               var amount_rate = Number(price) * (1 + Number(bilv.split('%')[0])/100) * Number(rate);
               res.amount_rate = amount_rate;
            }
            else{
                res.amount_rate = '';
            }
         }else{
            res.rate = '';
            res.amount_rate = '';
         }
         return res;
     }
     return {
         onRequest: onRequest
     };

 });