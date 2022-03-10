/**
 * 打印发货单pdf文件
 * 部分发货验证审核数量
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
 define(['N/record','N/search','N/format','N/runtime'],
 function(record,search,format,runtime) {
     function beforeLoad(context) {
         try{
             if(context.type == 'view'){
                 var form  = context.form;
                 //创建打印excel按钮
                 form.clientScriptFileId = 17;   //TODO:关联客户端脚本CL_CS_UNTIL.js的内部id
                 form.addButton({
                     id:'custpage_reportexcel',
                     label:'打印PDF',
                     functionName:'reportExcel()',
                 });
             }
             else if(context.type == 'create'){
                 var rec = context.newRecord;
                 var item_list = getBfSublist(rec);
                 if(item_list.length > 0){
                     rec.setValue('custbody_sl_bffhsh_qty_info',item_list[item_list.length - 1]);
                 }
             }
         }
         catch (e){
             log.debug('beforload error',e);
         }
     }
     function beforeSubmit(context) {
         try {
             if(context.type == 'create'){
                 var rec = context.newRecord;
                 var item_list = getBfSublist(rec);
                 var count = rec.getLineCount('item');
                 for(var i = 0;i < count;i++){
                     var item = rec.getSublistValue({
                         sublistId:'item',
                         fieldId:'item',
                         line:i,
                     });
                     var qty = rec.getSublistValue({
                         sublistId:'item',
                         fieldId:'quantity',
                         line:i,
                     });
                     for(var j = 0;j < item_list.length - 1;j++){
                         var line = Number(i) + Number(1);
                         if(item == item_list[j].item && qty > item_list[j].qty){
                             throw "请检查第" + line + "行发货数量，发货数量不能大于审核数量";
                         }
                     }
                 }
             }
         }
         catch (e){
             log.debug('beforsubmit error',e);
         }
     }
     function getBfSublist(rec) {
        var item_list = new Array();
        var str = '';
        var createdfrom = rec.getValue('createdfrom');
        var createdfrom_t = rec.getText('createdfrom');
        if(createdfrom_t.indexOf('SO') != -1){
            var columns = search.lookupFields({
                type:'salesorder',
                id:createdfrom,
                columns:[
                    'custbody_sl_bffh','custbody_sl_match_bffh'
                ]
            });
            log.debug('columns', columns);
            if(columns.custbody_sl_bffh == true && columns.custbody_sl_match_bffh.length > 0){
                var rec = record.load({
                    type:'customrecord_sl_bffhsh',
                    id:columns.custbody_sl_match_bffh[0].value,
                    isDynamic:true,
                });
                var count = rec.getLineCount('recmachcustrecord_sl_guanlian_topy');
                for(var i = 0;i < count;i++){
                    rec.selectLine('recmachcustrecord_sl_guanlian_topy',i);
                    var item_dis = rec.getCurrentSublistText({
                        sublistId:'recmachcustrecord_sl_guanlian_topy',
                        fieldId:'custrecord_sl_cp',
                    });
                    var item = rec.getCurrentSublistValue({
                        sublistId:'recmachcustrecord_sl_guanlian_topy',
                        fieldId:'custrecord_sl_cp',
                    });
                    var qty = rec.getCurrentSublistValue({
                        sublistId:'recmachcustrecord_sl_guanlian_topy',
                        fieldId:'custrecord_sl_qty_plan',
                    });
                    item_list.push({
                        "item":item,
                        "qty":qty,
                    });
                    str += '产品：' + item_dis + ',' + '审核数量：' + qty + ';'
                }
            }
        }
        item_list.push(str);
        return item_list;
     }
     function afterSubmit(context) {
         
     }

     return {
         beforeLoad: beforeLoad,
         beforeSubmit: beforeSubmit,
        //  afterSubmit: afterSubmit
     };
 });
