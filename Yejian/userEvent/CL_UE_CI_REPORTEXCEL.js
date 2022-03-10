/**
 * 取值模板打印PDF文件
 * 从销售订单或者系统报价单跳转至模板打印取值单，预先加载跳转前记录信息
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
 define(['N/record','N/search','N/format','N/runtime'],
 function(record,search,format,runtime) {
     function beforeLoad(context) {
         try{
             var set_flag = 'N';
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
             //预加载信息
             if(context.type == 'create'){
                 var rec = context.newRecord;
                 var para = context.request.parameters;
                 log.debug('para',para);
                 var itemList = new Array();
                 var otheritemList = new Array();//费用货品
                 if(para.record_id && para.record_type){
                     /**********简化合并 */
                     var source_rec;
                     if(para.record_type == 'estimate'){
                         source_rec = record.load({
                             type:'estimate',
                             id:para.record_id,
                             isDynamic:true,
                         });
                     }else if(para.record_type == 'salesorder'){
                         source_rec = record.load({
                             type:'salesorder',
                             id:para.record_id,
                             isDynamic:true,
                         });
                     }
                     var source_rec_count = source_rec.getLineCount('item');
                     for(var n = 0;n < source_rec_count;n++){
                         source_rec.selectLine('item',n);
                         var item_dis = source_rec.getCurrentSublistText({
                             sublistId:'item',
                             fieldId:'item',
                         });
                         var item_id = source_rec.getCurrentSublistValue({
                             sublistId:'item',
                             fieldId:'item',
                         })
                         var item_rate = source_rec.getCurrentSublistValue({
                             sublistId:'item',
                             fieldId:'rate',
                         });
                         var item_qty = source_rec.getCurrentSublistValue({
                             sublistId:'item',
                             fieldId:'quantity',
                         });
                         var item_total_amount = source_rec.getCurrentSublistValue({
                             sublistId:'item',
                             fieldId:'amount',
                         });
                         var description = source_rec.getCurrentSublistValue({
                             sublistId:'item',
                             fieldId:'description',
                         });
                         var weight = source_rec.getCurrentSublistValue({
                             sublistId:'item',
                             fieldId:'custcol_sl_spo_danjianzl',    //单位重量
                         });
                         var jiaoqi = source_rec.getCurrentSublistValue({
                             sublistId:'item',
                             fieldId:'custcol_sl_spo_jiaoqi',
                         });
                         var type = source_rec.getCurrentSublistValue({
                             sublistId:'item',
                             fieldId:'custcol_sl_cpxh',
                         });
                         var item_flag = checkItemType(item_id);
                         log.debug('item_flag',item_flag);
                         if(item_flag == 'otherchargeitem'){
                             otheritemList.push({"item":item_id,"itemDisplay":item_dis,"rate":item_rate,"qty":item_qty,"amount":item_total_amount,"description":description,"weight":weight,"type":type,"jiaoqi":jiaoqi});
                             set_flag = 'Y';
                         }else if(item_flag == 'item'){
                             itemList.push({"item":item_id,"itemDisplay":item_dis,"rate":item_rate,"qty":item_qty,"amount":item_total_amount,"description":description,"weight":weight,"type":type,"jiaoqi":jiaoqi});
                             set_flag = 'Y';
                         }
                     }
                     if(set_flag == 'Y'){
                         //对记录赋值
                         setValueToModeTmp(rec,source_rec,itemList,otheritemList,para);
                     }
                 }
             }
         }catch (e){
             log.debug('错误',e);
         }
     }
     function checkItemType(item){
        var otheritem_search = search.create({
            type:'otherchargeitem',             //TODO：费用货品类型
            columns:['name','internalid'],
            filters:[['internalid','is',item]]
        });
        var otheritem_res = otheritem_search.run().getRange(0,1);
        log.debug('otheritem_res',JSON.stringify(otheritem_res));
        if(otheritem_res.length > 0){
            return 'otherchargeitem';
        }else{
            return 'item';
        }
     }
     function setValueToModeTmp(rec,source_record,itemList,otheritemList,para) {
         log.debug('itemList',itemList);
         log.debug('otheritemList',otheritemList);
        //对主体字段赋值
         if(source_record.getValue('memo')){
             rec.setValue('name',source_record.getValue('memo'));//REMARK
         }
         if(source_record.getValue('custbody_sl_sozmmemo')){
             rec.setValue('custrecord_sl_qu_customerinfo',source_record.getValue('custbody_sl_sozmmemo'));//Customer Info
         }
         if(source_record.getValue('entity')){
             rec.setValue('custrecord18',source_record.getValue('entity'));//客户
         }
         rec.setValue('custrecord_sl_qu_amount',source_record.getValue('total'));//AMOUNT
         if(source_record.getValue('currency')){
             rec.setValue('custrecord_sl_print_currency',source_record.getValue('currency'));//币种
         }
         rec.setValue('custrecord_sl_qu_supplier',getCompanyInfo() || '');//SUPPLIER
         rec.setValue('custrecord_sl_so_no',para.record_id);//销售订单
         rec.setValue('custrecord_sl_qu_pino',source_record.getValue('custbody_sl_bbaojiadan'));//PI NO
         rec.setValue('custrecord_sl_mbdyyhxx',source_record.getValue('custbody_sl_spo_yhxx'));//银行信息
         rec.setValue('custrecord_sl_mbyhxxmx',source_record.getValue('custbody_sl_yhxxxxxs'));//银行明细
         rec.setValue('custrecord_sl_tkxxdyb',source_record.getValue('custbody_sl_spo_tiaokxx'));//条款信息
         rec.setValue('custrecord_sl_mbtkxxmx',source_record.getValue('custbody_sl_tkxxxxxs'));//条款明细

        //对产品信息明细行赋值
        log.debug('itemList',itemList);
        for(var j = 0;j < itemList.length;j++){
            rec.setSublistValue({
                sublistId:'recmachcustrecord_sl_qu_sub',
                fieldId:'custrecord_sl_qu_mxt', //货品
                value:itemList[j].item,
                line:j,
            });
            rec.setSublistValue({
                sublistId:'recmachcustrecord_sl_qu_sub',
                fieldId:'custrecord_sl_qu_shul',  //数量
                value:itemList[j].qty,
                line:j,
            });
            rec.setSublistValue({
                sublistId:'recmachcustrecord_sl_qu_sub',
                fieldId:'custrecord_sl_qu_danjj',  //单价
                value:itemList[j].rate,
                line:j,
            });
            rec.setSublistValue({
                sublistId:'recmachcustrecord_sl_qu_sub',
                fieldId:'custrecord_sl_qu_total',  //total price
                value:itemList[j].amount,
                line:j,
            });
            rec.setSublistValue({
                sublistId:'recmachcustrecord_sl_qu_sub',
                fieldId:'custrecord_sl_weight_e',  //
                value:itemList[j].weight,
                line:j,
            });
            rec.setSublistValue({
                sublistId:'recmachcustrecord_sl_qu_sub',
                fieldId:'custrecord_sl_qu_xh',  //
                value:itemList[j].type,
                line:j,
            });
            rec.setSublistValue({
                sublistId:'recmachcustrecord_sl_qu_sub',
                fieldId:'custrecord_sl_msw',  //
                value:itemList[j].description,
                line:j,
            });
            rec.setSublistValue({
                sublistId:'recmachcustrecord_sl_qu_sub',
                fieldId:'custrecord_sl_jiaoqiw',  //
                value:itemList[j].jiaoqi,
                line:j,
            });
        }
        //对费用货品明细进行赋值
         log.debug('otheritemList',otheritemList);
        for(var m = 0;m < otheritemList.length;m++){
            rec.setSublistValue({
                sublistId:'recmachcustrecord_cl_match',
                fieldId:'custrecord15',
                value:otheritemList[m].item,
                line:m,
            });
            rec.setSublistValue({
                sublistId:'recmachcustrecord_cl_match',
                fieldId:'custrecord_sl_cpsl',
                value:otheritemList[m].qty,
                line:m
            })
            rec.setSublistValue({
                sublistId:'recmachcustrecord_cl_match',
                fieldId:'custrecord_sl_hpdj1',
                value:otheritemList[m].rate,
                line:m
            })
            rec.setSublistValue({
                sublistId:'recmachcustrecord_cl_match',
                fieldId:'custrecord_sl_hpxj',
                value:otheritemList[m].amount,
                line:m
            });
            rec.setSublistValue({
                sublistId:'recmachcustrecord_cl_match',
                fieldId:'custrecord_sl_ms',
                value:otheritemList[m].type,
                line:m
            });
        }
     }
     function getCompanyInfo(){
        var rec = record.load({
            type:'customrecord_sl_shipperinformation',
            id:1,
            isDynamic:true,
        });
        var addr = rec.getValue('custrecord_sl_shipper_address1') + ',' + rec.getValue('custrecord_sl_shipper_address2') + ',' + rec.getValue('custrecord_sl_shipper_address3') + ','
            + rec.getValue('custrecord_sl_city1') + ',' + rec.getValue('custrecord_sl_country_code') + '\n';
        // var name = rec.getValue('custrecord_sl_fullname') + '\n';
        var company = rec.getValue('custrecord_sl_company_name') + '\n';
        var zip = rec.getValue('custrecord_sl_post_code') + '\n';
        var phone = rec.getValue('custrecord_sl_phone_number') + '\n';
        var email = rec.getValue('custrecord_sl_email_address');

        return company + addr + zip + phone + email;

     }
     function getInvoice(number){
         if(number){
             var mysearch = search.create({
                 type:'invoice',
                 filters:[
                     ['tranid','is',number],
                 ],
                 columns:[
                     'custbody_sl_spo_yyy'
                 ]
             });
             var res = mysearch.run().getRange(0,1);
             if(res.length > 0){
                 return res[0].getText('custbody_sl_spo_yyy');
             }
         }
     }
     function beforeSubmit(context) {
        if(context.type == 'create' || context.type == 'edit'){
            var sum = Number(0);
            var rec = context.newRecord;
            var ky_sum = Number(0);
            var kd_sum = Number(0);
            //产品信息
            var count = rec.getLineCount('recmachcustrecord_sl_qu_sub');
            for(var i = 0;i < count;i++){
                var dimension = rec.getSublistValue({
                    sublistId:'recmachcustrecord_sl_qu_sub',
                    fieldId:'custrecord_sl_qu_dimension',
                    line:i,
                });
                var rate = rec.getSublistValue({
                    sublistId:'recmachcustrecord_sl_qu_sub',
                    fieldId:'custrecord_sl_qu_danjj',
                    line:i,
                });
                var qty = rec.getSublistValue({
                    sublistId:'recmachcustrecord_sl_qu_sub',
                    fieldId:'custrecord_sl_qu_shul',
                    line:i,
                });
                sum += Number(rate) * Number(qty);
                if(dimension.indexOf('*') != -1){
                    var dimension_arr = dimension.split('*');
                    rec.setSublistValue({
                        sublistId:'recmachcustrecord_sl_qu_sub',
                        fieldId:'custrecord_sl_qu_koyuntj',        //空运= dimension/6000
                        value: (Number(dimension_arr[0]) * Number(dimension_arr[1]) * Number(dimension_arr[2])/6000).toFixed(4),
                        line:i,
                    });
                    rec.setSublistValue({
                        sublistId:'recmachcustrecord_sl_qu_sub',
                        fieldId:'custrecord_sl_qu_kuaidtj',     //快递= dimension/5000
                        value:(Number(dimension_arr[0]) * Number(dimension_arr[1]) * Number(dimension_arr[2])/5000).toFixed(4),
                        line:i,
                    });
                    ky_sum += Number(dimension_arr[0]) * Number(dimension_arr[1]) * Number(dimension_arr[2])/6000;
                    kd_sum += Number(dimension_arr[0]) * Number(dimension_arr[1]) * Number(dimension_arr[2])/5000;
                }
            }
            //费用信息
            var fy_count  = rec.getLineCount('recmachcustrecord_cl_match');
            for(var j = 0;j < fy_count;j++){
                var fy_rate = rec.getSublistValue({
                    sublistId:'recmachcustrecord_cl_match',
                    fieldId:'custrecord_sl_hpdj1',
                    line:j,
                });
                var fy_qty = rec.getSublistValue({
                    sublistId:'recmachcustrecord_cl_match',
                    fieldId:'custrecord_sl_cpsl',
                    line:j,
                });
                if(j == 0){
                    rec.setSublistValue({
                        sublistId: 'recmachcustrecord_cl_match',
                        fieldId: 'custrecord_sl_hpxj',
                        value: Number(fy_rate) * Number(fy_qty),
                        line:j,
                    });
                }
                sum += Number(fy_rate) * Number(fy_qty);
            }
            log.debug('sum',sum);
            //AMOUNT
            rec.setValue('custrecord_sl_qu_amount',sum.toFixed(4));

            rec.setValue('custrecord_sl_qu_hejikuaidtjz',kd_sum.toFixed(4));
            rec.setValue('custrecord_sl_qu_hejikoyunhej',ky_sum.toFixed(4));
        }
     }
     function afterSubmit(context) {
         try{
             if(context.type == 'create'){
                 var id_out_arr = new Array();
                 var rec = context.newRecord;
                 var rec_id = rec.getValue('custrecord_sl_so_no');
                 var mysearch;
                 if(rec_id){
                     mysearch = search.create({
                         type:'estimate',
                         filters:[
                             ['internalid','anyof',rec_id]
                         ],
                         columns:[
                             'custbody_associative_template_printing'
                         ]
                     });
                 }
                 var res = mysearch.run().getRange(0,1);
                 log.debug('报价单',JSON.stringify(res));
                 if(res.length > 0){
                     if(res[0].getValue('custbody_associative_template_printing').length > 0){
                         id_out_arr = arrayAdd(res[0].getValue('custbody_associative_template_printing').length,id_out_arr);
                         id_out_arr.push(rec.id);
                     }
                     else{
                         id_out_arr.push(rec.id);
                     }
                    record.submitFields({
                        type:'estimate',
                        id:rec_id,
                        values:{
                            custbody_associative_template_printing:id_out_arr,
                        }
                    });
                 }else {
                     mysearch = search.create({
                         type:'salesorder',
                         filters:[
                             ['internalid','anyof',rec_id]
                         ],
                         columns:[
                             'custbody_associative_template_printing'
                         ]
                     });
                     var so_res = mysearch.run().getRange(0,1);
                     log.debug('销售单',JSON.stringify(so_res));
                     if(so_res.length > 0){
                         if(so_res[0].getValue('custbody_associative_template_printing').length > 0){
                             id_out_arr = arrayAdd(so_res[0].getValue('custbody_associative_template_printing'),id_out_arr);
                             id_out_arr.push(rec.id);
                         }
                         else{
                             id_out_arr.push(rec.id);
                         }
                         record.submitFields({
                             type:'salesorder',
                             id:rec_id,
                             values:{
                                 custbody_associative_template_printing:id_out_arr,
                             }
                         });
                     }
                 }

             }
         }catch (e){
             log.debug('after',e);
         }
     }
     function arrayAdd(array_orgin,array_out) {
         if(array_orgin.length > 0){
             for(var i = 0;i < array_orgin.length;i++){
                 array_out.push(array_orgin[i]);
             }
             return array_out;
         }
     }
     return {
         beforeLoad: beforeLoad,
         beforeSubmit: beforeSubmit,
         afterSubmit: afterSubmit
     };
 });
