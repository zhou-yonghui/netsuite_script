/**
 * 打印报价单pdf文件
 * 系统报价单跳转预加载信息
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
             //预加载信息
             if(context.type == 'create'){
                 var rec = context.newRecord;
                 var para = context.request.parameters;
                 log.debug('para',para);
                 if(para.baojia_id){
                     var baojia_data = getBaojia(para.baojia_id);
                     log.debug('data',baojia_data);
                     //对记录赋值
                     rec.setValue('custrecord_sl_quo_or',baojia_data.danhao);//单号
                     rec.setValue('custrecord_sl_quo_cust',baojia_data.customer_info);//客户信息
                     rec.setValue('custrecord_sl_quo_currency',baojia_data.so_currency);//币种
                     rec.setValue('custrecord_sl_ywyyx',String(baojia_data.yw_email));//业务员邮箱
                     rec.setValue('custrecord_sl_quo_yymemo',baojia_data.yw_memo);//业务员备注
                     rec.setValue('custrecord_sl_ywy',baojia_data.yw);//业务员
                     rec.setValue('custrecord_sl_quo_baojyx',format.parse({type:format.Type.DATE,value:baojia_data.date}));//报价单日期
                     rec.setValue('custrecord_sl_quo_cust',baojia_data.zm_memo);//客户信息
                     rec.setValue('custrecord_sl_quo_sale',baojia_data.tk);//条款信息
                     rec.setValue('custrecord_sl_tkxlll',baojia_data.tk_info);//条款详细信息
                     // rec.setValue('custrecord_sl_quo_cpjehj',baojia_data.item_list[baojia_data.item_list.length - 1].sum);//产品金额合计
                     // rec.setValue('custrecord_sl_quo_ddze',baojia_data.item_list[baojia_data.item_list.length - 1].sum);//订单总额
                     rec.setValue('custrecord_sl_gsxx',getCompanyInfo());//公司信息
                     rec.setValue('custrecord_sl_mbyhxxxz',baojia_data.bank);//银行信息选择
                     rec.setValue('custrecord_sl_yhmbxxxx',baojia_data.bankInfo);//银行详细信息
                     var item_data = baojia_data.item_list;
                     for(var i = 0;i < item_data.length;i++){
                         rec.setSublistValue({
                             sublistId:'recmachcustrecord17',
                             fieldId:'custrecord15',
                             value:item_data[i].item,
                             line:i,
                         });
                         rec.setSublistValue({
                             sublistId:'recmachcustrecord17',
                             fieldId:'custrecord_sl_cpsl',
                             value:item_data[i].qty,
                             line:i,
                         });
                         rec.setSublistValue({
                             sublistId:'recmachcustrecord17',
                             fieldId:'custrecord_sl_hpdj1',
                             value:item_data[i].rate,
                             line:i,
                         });
                         rec.setSublistValue({
                             sublistId:'recmachcustrecord17',
                             fieldId:'custrecord_sl_hpxj',
                             value:item_data[i].amount,
                             line:i,
                         });
                         rec.setSublistValue({
                             sublistId:'recmachcustrecord17',
                             fieldId:'custrecord_sl_cpxh',
                             value:item_data[i].xinhao,
                             line:i,
                         });
                         rec.setSublistValue({
                             sublistId:'recmachcustrecord17',
                             fieldId:'custrecord_sl_ms',
                             value:item_data[i].des,
                             line:i,
                         });
                         rec.setSublistValue({
                             sublistId:'recmachcustrecord17',
                             fieldId:'custrecord_sl_sxhux',
                             value:item_data[i].attributes,
                             line:i,
                         });
                         rec.setSublistValue({
                             sublistId:'recmachcustrecord17',
                             fieldId:'custrecord_sl_jiaoqiww',
                             value:item_data[i].jiaoqi,
                             line:i,
                         });
                     }
                 }
             }
         }catch (e){
             log.debug('错误',e);
         }
     }
     function getCompanyInfo(employee){
         var rec = record.load({
             type:'customrecord_sl_shipperinformation',
             id:1,
             isDynamic:true,
         });
         // var addr = rec.getValue('custrecord_sl_shipper_address1') + ',' + rec.getValue('custrecord_sl_shipper_address2') + ',' + rec.getValue('custrecord_sl_shipper_address3') + ','
         //     + rec.getValue('custrecord_sl_city1') + ',' + rec.getValue('custrecord_sl_country_code') + '\n';
         // var name = rec.getValue('custrecord_sl_fullname') + '\n';
         var addr = rec.getValue('custrecord_sl_shipper_address1') + '\n';
         var addr2 = rec.getValue('custrecord_sl_shipper_address2') + '\n';
         var addr3 = rec.getValue('custrecord_sl_shipper_address3') + '\n';
         var company = rec.getValue('custrecord_sl_company_name') + '\n';
         var zip = rec.getValue('custrecord_sl_post_code') + '\n';
         var phone = rec.getValue('custrecord_sl_phone_number') + '\n';
         var email = rec.getValue('custrecord_sl_email_address') + '\n';
         var city = rec.getValue('custrecord_sl_city1') + '\n';
         var country_code = rec.getValue('custrecord_sl_country_code') + '\n';

         return company + addr + addr2 + addr3 + city + country_code + zip + phone + email;
     }
     function getBaojia(baojia_id) {
         if(baojia_id){
            var baojia_rec = record.load({type:'estimate',id:baojia_id,isDynamic:true,});
            var count = baojia_rec.getLineCount('item');
            var item_list = new Array();
            var sum = Number(0);
            for(var i = 0;i < count;i++){
                baojia_rec.selectLine('item',i);
                var item = baojia_rec.getCurrentSublistValue({
                    sublistId:'item',
                    fieldId:'item',
                });
                var xinhao = baojia_rec.getCurrentSublistValue({
                    sublistId:'item',
                    fieldId:'custcol_sl_cpxh',
                });
                var des = baojia_rec.getCurrentSublistValue({
                    sublistId:'item',
                    fieldId:'custcol_sl_spo_description',
                });
                // var qty = baojia_rec.getCurrentSublistValue({
                //     sublistId:'item',
                //     fieldId:'quantity',
                // });
                var rate = baojia_rec.getCurrentSublistValue({
                    sublistId:'item',
                    fieldId:'rate',
                });
                var amount = baojia_rec.getCurrentSublistValue({
                    sublistId:'item',
                    fieldId:'amount',
                });
                var qty = baojia_rec.getCurrentSublistValue({
                    sublistId:'item',
                    fieldId:'quantity',
                });
                var attributes = baojia_rec.getCurrentSublistValue({
                    sublistId:'item',
                    fieldId:'custcol_jyh_attributes',
                });
                var jiaoqi = baojia_rec.getCurrentSublistValue({
                    sublistId:'item',
                    fieldId:'custcol_sl_spo_jiaoqi',
                });
                sum += Number(rate) * Number(qty);
                item_list.push({
                    "item":item,
                    "xinhao":xinhao,
                    "des":des,
                    "qty":qty,
                    "rate":rate,
                    "amount":amount,
                    "attributes":attributes,
                    "jiaoqi":jiaoqi,
                    "sum" : sum,
                });

            }

            return {
                "danhao":baojia_rec.getValue('custbody_sl_bbaojiadan'),
                "customer_info":baojia_rec.getValue('custbody_sl_sozmmemo'),
                "so_currency":baojia_rec.getValue('custbody_sl_socurrency'),
                "yw_memo":baojia_rec.getValue('custbody_sl_spo_yewuymemo'),
                "date":baojia_rec.getValue('trandate'),
                "yw":baojia_rec.getValue('custbody_sl_spo_yyy'),
                "yw_t":baojia_rec.getText('custbody_sl_spo_yyy'),
                "yw_email":record.load({type:'employee',id:baojia_rec.getValue('custbody_sl_spo_yyy')}).getText('email'),
                "zm_memo":baojia_rec.getValue('custbody_sl_sozmmemo'),
                "tk":baojia_rec.getValue('custbody_sl_spo_tiaokxx'),
                "tk_info":baojia_rec.getValue('custbody_sl_tkxxxxxs'),
                "bank":baojia_rec.getValue('custbody_sl_spo_yhxx'),
                "bankInfo":baojia_rec.getValue('custbody_sl_yhxxxxxs'),
                "item_list":item_list,
            }
         }        
     }
     function beforeSubmit(context) {
        try{
            if(context.type == 'create' || context.type == 'edit'){
                var rec = context.newRecord;
                var count = rec.getLineCount('recmachcustrecord17');
                var inv_sum = Number(0);
                var fy_sum = Number(0);
                for(var i = 0;i < count;i++){
                    var item = rec.getSublistValue({
                        sublistId:'recmachcustrecord17',
                        fieldId:'custrecord15',
                        line:i,
                    });
                    var amount = rec.getSublistValue({
                        sublistId:'recmachcustrecord17',
                        fieldId:'custrecord_sl_hpxj',
                        line:i,
                    });
                    log.debug('amount',amount);
                    var item_flag = checkInventoryitem(item);
                    log.debug('item_flag',item_flag);
                    if(item_flag == 'Y'){
                        inv_sum += Number(amount);
                    }else {
                        fy_sum += Number(amount);
                    }
                }
                rec.setValue('custrecord_sl_quo_cpjehj',inv_sum);
                rec.setValue('custrecord_sl_fyhj',fy_sum);
                rec.setValue('custrecord_sl_quo_ddze',Number(fy_sum) + Number(inv_sum));
            }
        }catch (e){
            log.debug('befor error',e);
        }
     }
     function checkInventoryitem(item){
         if(item){
             var mysearch = search.create({
                 type:'inventoryitem',
                 filters:[
                     ['internalid','is',item]
                 ],
             });
             var res = mysearch.run().getRange(0,100);
             if(res.length > 0){
                 return 'Y';
             }
             else if(item == 134){
                 return 'N_134';
             }
             else if(item == 139){
                 return 'N_139'
             }
             else {
                 return 'N';
             }
         }
     }
     function afterSubmit(context) {
        if(context.type == 'create'){
            // var rec = record.load({type:'estimate',id:context.newRecord.id,isDynamic:true});
            // var customer = rec.getValue('entity');
            // var context_log = rec.getText('trandate') + '创建了报价单：' + rec.getValue('tranid');
            // var man = rec.getValue('custbody_sl_spo_yyy');
            // //向客户添加客户跟进记录子列表
            // var log_rec = record.create({
            //     type:'customrecord_cl_yejian_customer_log',
            //     isDynamic:true,
            // });
            // log_rec.setValue('	custrecord_cl_bj_id',context.newRecord.id);
            // log_rec.setValue('custrecord_cl_yj_employe',man);
            // log_rec.setValue('custrecord_cl_yj_customer_match',customer);
            // log_rec.setValue('custrecord_cl_yj_context',context_log);
            // var log_id = log_rec.save();
            // log.debug('log_id',log_id);
        }
     }

     return {
         beforeLoad: beforeLoad,
         beforeSubmit: beforeSubmit,
        //  afterSubmit: afterSubmit
     };
 });
