/**
 * @LastEditors: zhouyh
 * @LastEditTime: 2022-01-04 17:21:48
 * @Description: 到款通知单认领
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 */
 define(['N/search', 'N/ui/serverWidget', 'N/runtime', 'N/record', 'N/file', 'N/redirect', 'N/task', 'N/query','N/http','N/format','N/currency'],

 function(search, serverWidget, runtime, record, file, redirect, task, query, http,format,nsCurrency) {

     /**
      * Definition of the Suitelet script trigger point.
      *
      * @param {Object} context
      * @param {ServerRequest} context.request - Encapsulation of the incoming request
      * @param {ServerResponse} context.response - Encapsulation of the Suitelet response
      * @Since 2015.2
      */
     function onRequest(context) {
         var para = context.request.parameters;
         var output_flag = 'N';
         try{
             /******************调用mp脚本************************/
             // var mrTask;
             // mrTask = task.create({
             //     taskType: task.TaskType.MAP_REDUCE,
             //     scriptId:179,
             //     deploymentId : 'customdeploy_cl_mp_dkrl_do',       //到款通知认领
             // });
             // mrTask.params = {'custscript_recid' : para.recordId,'custscript_soid' : para.soId,'custscript_rectype':para.recordType,'custscript_usd':para.usd};
             // var mrTask_id = mrTask.submit();
             // if(mrTask_id){
             //     //标记到款通知脚本执行中
             //     record.submitFields({
             //         type:para.recordType,
             //         id:para.recordId,
             //         values:{
             //             // custrecord_sl_dkzt:4,       //已认领
             //             // custrecord_sl_yrl: true,
             //             custrecord_cl_script_do:true,//脚本执行中
             //         }
             //     });
             //
             //     //回传订柜计划信息
             //     output_flag = 'Y';
             // }
             /*********************直接处理************************/
             //到款通知id
             var recid = para.recordId;
             //到款通知类型
             var recordType = para.recordType;
             //关联销售订单id
             var soId = para.soId;
             //净美元
             var usd = para.usd;

             //操作
             dkrlDo({"recid":recid,"soId":soId,"usd":usd,"recordType":recordType});

             output_flag = 'Y';

         }catch (e) {
             log.debug('创建脚本部署错误',e);
             //
             output_flag = e.name;
         }
         if(output_flag != 'Y'){
             context.response.write({output:output_flag});
         }
         else{
             context.response.write({output:"Y"});
         }

         /***********************************************/
     }
     function dkrlDo(allData){
         var recid = allData.recid;
         var recordType = allData.recordType;
         var soId = allData.soId;
         var usd = allData.usd;
         if(recid){
             log.debug('recid',recid);
             record.submitFields({
                 type:recordType,
                 id:recid,
                 values:{
                     custrecord_sl_dkzt:4,       //已认领
                     custrecord_sl_yrl: true,
                     custrecord_cl_script_do:true,//脚本执行中
                 }
             });
             //回写金额到销售订单
             try{
                 var so_rec = record.load({
                     type:'salesorder',
                     id:soId,
                     isDynamic:true,
                 });
                 var dk_arr = so_rec.getValue('custbody_source_arrival_notice');
                 var dk_usd = so_rec.getValue('custbody_sl_soamm');//回款金额
                 if(!dk_usd){
                     dk_usd = Number(0);
                 }
                 if(usd){
                     record.submitFields({
                         type:'salesorder',
                         id:soId,
                         values:{
                             custbody_sl_soamm:(Number(dk_usd) + Number(usd)).toFixed(2),
                         }
                     });
                 }
                 dk_arr.push(recid);
                 if(dk_arr.length > 0){
                     record.submitFields({
                         type:'salesorder',
                         id:soId,
                         values:{
                             custbody_source_arrival_notice:dk_arr,
                         }
                     });
                 }
             }
             catch (e){
                 log.debug('so error',e);
             }
             var rec = record.load({type:'customrecord_sl_dktz_list',id:recid,isDynamic:true});
             var status = rec.getValue('custrecord_sl_dkzt');
            log.debug('status',status);
            var old_ck = rec.getValue('custrecord_customer_deposit_slip');
            var old_gh = rec.getValue('custrecord_purchase_settlement');
            var so_id = rec.getValue('custrecord_sl_xsdd');
            log.debug('so_id',so_id);
            log.debug('old_ck old_gh',old_ck + '---' + old_gh);
             //创建客户存款、购汇单
             try{
                 if(!old_ck && status == 4){//已认领
                     var dk_currency = rec.getValue('custrecord_sl_dktz_bz');//到款币种
                     var so_data = getSo(so_id);
                     log.debug('so-data',so_data);
                     if(so_data != 'null'){
                         var customer_data = getCustomer(so_data.entity);
                         var customer = rec.getValue('custrecord_sl_kh');
                         var rate = rec.getValue('custrecord_dktz_exchange_rate');//汇率
                         var dk_date = rec.getValue('custrecord19');//到款日期
                         var dk_usd_amount = rec.getValue('custrecord_sl_dkmj');//到款净美元
                         var pay_type = rec.getValue('custrecord_sl_fkfs');//付款方式
                         var dk_amount = rec.getValue('custrecord_sl_dkje');//到款金额
                         var kx_memo = rec.getValue('custrecord_sl_kxsm');//款项说明
                         //创建客户存款单
                         var c_id;
                         var g_id;
                         if(dk_currency == 2){//到款币种为USD
                             // if(!old_ck){
                             c_id = createCustomerdeposit(recid,so_data,so_id,rate,dk_date,customer_data,dk_usd_amount,pay_type,dk_currency,kx_memo);
                             submitCk(rec,c_id);
                             // doSome(c_id,so_id,so_data,dk_date);
                             // }
                             // else{
                             //     doSome(old_ck,so_id,so_data,dk_date);
                             // }
                         }
                         else{
                             // if(!old_ck){
                             c_id = createCustomerdeposit(recid,so_data,so_id,rate,dk_date,customer_data,dk_usd_amount,pay_type,dk_currency,kx_memo);
                             submitCk(rec,c_id);
                             // if(!old_gh){
                             g_id = createGhRec(recid,dk_date,pay_type,dk_currency,dk_usd_amount,dk_amount,rate,rec);
                             submitGh(rec,g_id);
                             // }
                             //发票核销
                             // doSome(c_id,so_id,so_data,dk_date);
                             // }
                             // else{
                             //     if(!old_gh){
                             //         g_id = createGhRec(recid,dk_date,pay_type,dk_currency,dk_usd_amount,dk_amount,rate,rec);
                             //         submitGh(rec,g_id);
                             //         //发票核销
                             //         doSome(old_ck,so_id,so_data,dk_date);
                             //     }
                             // }
                         }
                         log.debug('c_id g_id',c_id + '====' + g_id);
                     }
                 }
            }catch (e){
                log.debug('创建购汇、客户存款报错',e);
            }
            try{
                //取消正在执行中
                record.submitFields({
                    type:recordType,
                    id:recid,
                    values:{
                        custrecord_cl_script_do:false,//脚本执行中
                        custrecord_sl_daid:false,//待定
                    }
                });
            }catch(e){
                log.debug('到款认领单操作',e);
            }
            try{
                //关联客户
                record.submitFields({
                    type:'customer',
                    id:rec.getValue('custrecord_sl_kh'),
                    values:{
                        custentityfirst_claim_so:soId,//首次关联销售订单
                        custentity_first_claim_salesman:rec.getValue('custrecord_sl_rlr'),//首次关联业务员
                        custentity_sl_first_time:format.parse({value:rec.getValue('custrecordrlsj'),type:format.Type.DATE,}),
                        custentity_notice_first_claim:recid,
                    }
                });
            }catch(e){
                log.debug('回写客户操作',e);
            }
            try{
            //到款通知单回写销售订单
            if(!old_ck && status == 4 && so_id){
                //取消到款通知关联
                var soRec = record.load({
                    type:'salesorder',
                    id:soId,
                    isDynamic:true,
                });
                // var dk_arr = soRec.getValue('custbody_source_arrival_notice');
                // for(var d = 0;d < dk_arr.length;d++){
                //     if(recid == dk_arr[d]){
                //         dk_arr.splice(d,1);
                //     }
                // }
                // log.debug('dk_arr',dk_arr);
                // soRec.setValue('custbody_source_arrival_notice',dk_arr);
                soRec.setValue('custbody_oiin_so_claimed',true);//订单已认领;
                soRec.setValue('custbody_oiin_so_unclaimed_order',false);//未认领订单
                soRec.save({ignoreMandatoryFields: true});
            }
            }catch(e){
                log.debug('回写销售订单操作',e);
            }
            
         }
     }
     function createGhRec(dk_id,dk_date,pay_type,dk_currency,dk_usd_amount,dk_amount,rate,recDk) {
         try{
             var rec = record.create({
                 type:'customrecord_hg_bank_transfer_order',
                 isDynamic:true,
             });
             rec.setValue('custrecord_hg_bank_transfer_subsidiary',1);//主体公司:默认母公司
             rec.setValue('custrecord_hg_bank_transfer_date',dk_date);//交易时间
             rec.setValue('custrecord_hg_bank_transfer_account_hd',823);//汇兑损益科目
             rec.setValue('custrecord_hg_bank_transfer_from_account',834);//支付科目
             rec.setValue('custrecord_hg_bank_transfer_to_account',getPayAccount(pay_type,dk_currency));//购进科目
             rec.setValue('custrecord_hg_bank_transfer_amount_f',dk_usd_amount);//支付金额
             rec.setValue('custrecord_hg_bank_transfer_amount_t',dk_amount);//购进金额
             rec.setValue('custrecord_hg_bank_transfer_gh_rate',rate);//购汇汇率
             rec.setValue('custrecord_source_arrival_notice2',dk_id);//来源到款通知单
             rec.setValue('custrecord_hg_bank_transfer_currency_t',dk_currency);//购进币种
             var zf_rate = getCurrencyNsRate(recDk,2,1);//支付币种汇率（本位币）
             var gj_rate = getCurrencyNsRate(recDk,dk_currency,1);//购进币种汇率（本位币）
             log.debug('zf_rate gj_rate',zf_rate + '---' + gj_rate);
             var jz_rate;
             rec.setValue('custrecord_hg_bank_transfer_zb_rate',zf_rate.toFixed(4));//支付币种汇率（本位币）
             rec.setValue('custrecord_hg_bank_transfer_bz_rate',gj_rate.toFixed(4));//购进币种汇率（本位币）
             rec.setValue('custrecord_hg_bank_transfer_amount_fz',(Number(dk_usd_amount) * Number(zf_rate)).toFixed(2));//中转科目金额（支付）
             rec.setValue('custrecord_hg_bank_transfer_amount_tz',((Number(dk_usd_amount) * Number(zf_rate))/Number(gj_rate)).toFixed(2));//中转科目金额（购进）
             if(dk_currency != 2 && dk_currency != 1){
                 jz_rate = Number(zf_rate)/Number(gj_rate);
                 rec.setValue('custrecord_hg_bank_transfer_type',1);//购进及支付币种均与公司本位币不一致
                 rec.setValue('custrecord_hg_bank_transfer_jz_rate',jz_rate.toFixed(4));//记账汇率
                 rec.setValue('custrecord_hg_bank_transfer_amount_hs',((Number(dk_usd_amount) * Number(zf_rate))/(Number(gj_rate) * zf_rate)).toFixed(2));//换算本位币金额
             }
             else if(dk_currency == 1){
                 jz_rate = getCurrencyNsRate(recDk,2,1);
                 rec.setValue('custrecord_hg_bank_transfer_type',3);//仅购进币种与公司本位币一致
                 rec.setValue('custrecord_hg_bank_transfer_jz_rate',jz_rate.toFixed(4));//记账汇率
                 rec.setValue('custrecord_hg_bank_transfer_amount_hs',(Number(dk_amount) * Number(jz_rate)).toFixed(2));//换算本位币金额
             }
             log.debug('记账汇率',jz_rate);
             if(jz_rate > rate){
                 rec.setValue('custrecord_hg_bank_transfer_type_sub',2);//汇损
             }
             else if(jz_rate < rate){
                 rec.setValue('custrecord_hg_bank_transfer_type_sub',1);//	汇益
             }
             var g_id = rec.save();
             log.debug('g_id',g_id);

             return g_id;
         } catch(e){
             log.debug('创建购汇单报错',e);
         }
     }
     function getCurrencyNsRate(recDk,source_currency,target_currency){
         var exchange_rate = nsCurrency.exchangeRate({
             source: source_currency,
             target: target_currency,
             date: new Date(recDk.getValue('custrecord19'))
         });

         return exchange_rate;
     }
     function getPayAccount(pay_type,dk_currency) {
         if(pay_type){
             var mysearch = search.create({
                 type:'customrecord_payment_method_account',
                 filters:[
                     ['custrecord_payment_methods_list','anyof',pay_type],
                     'AND',['custrecord_payment_currency','is',dk_currency],
                 ],
                 columns:[
                     'custrecord_payment_account',
                 ]
             });
             var res = mysearch.run().getRange(0,1);
             log.debug('付款方式科目搜索结果',JSON.stringify(res));
             if(res.length > 0){
                 return res[0].getValue('custrecord_payment_account');
             }
         }
     }
     function doSome(c_id,so_id,so_data,dk_date) {
         var ce_amount = Number(0);
         var so_hk_amount = so_data.hk_sum_amount;//销售到款净金额
         var so_total_zmount = so_data.total;//销售订单总额
         var inv_arr = new Array();
         if(!so_hk_amount){
             so_hk_amount = Number(0);
         }
         //判断差额,回款金额小于销售金额，是否<=配置表的“自动核销判断差额（30USD）”，销售订单默认是USD币种；如果是，先创建贷项，再贷项勾选应用发票核销
         log.debug('so_hk_amount so_total_zmount',so_hk_amount+ '--- ' + so_total_zmount);
         if(Number(so_hk_amount)  < Number(so_total_zmount) && Number(so_total_zmount) - Number(so_hk_amount) < 30){
             log.debug('so_id',so_id);
             // var invoice_search = search.create({
             //     type:'invoice',
             //     filters:[
             //         ['status','anyof',['CustInvc:A']],
             //         // ['status','is','未结'],
             //         'AND',['createdfrom','anyof',so_id],
             //         "AND",['mainline','is',true],
             //     ],
             //     columns:[
             //         'entity','trandate','createdfrom',
             //     ]
             // });
             // var inv_res = invoice_search.run().getRange(0,1000);
             // log.debug('销售订单关联的未结发票',JSON.stringify(inv_res));
             //加载未结搜索
             var invoice_search = search.load('customsearch_open_invoice');
             var inv_col = invoice_search.columns;
             var inv_res = invoice_search.run().getRange(0,1000);
             // log.debug('未结发票',JSON.stringify(inv_res));
             if(inv_res.length > 0){
                 for(var i = 0;i < inv_res.length;i++){
                     log.debug('so_id soinvid invid',so_id + '---' + inv_res[i].getValue(inv_col[0]) + '---' + inv_res[i].id);
                     if(Number(inv_res[i].getValue(inv_col[0])) == Number(so_id)){
                         log.debug('inv_res[i].id',inv_res[i].id);
                         inv_arr.push(inv_res[i].id);
                     }
                 }
                 log.debug('inv_arr',inv_arr);
                 //创建贷项核销发票
                 ce_amount = so_total_zmount - so_hk_amount;
                 var cr_memo_id = createCreditMemo(so_data,so_id,inv_arr,ce_amount);
                 log.debug('cr_memo_id',cr_memo_id);
             }
         }
         //回款金额大于订单金额
         else if(Number(so_hk_amount) > Number(so_total_zmount)){
             //差额类型为空
             if(so_data.ce_type == null || so_data.ce_type == ''){
                 if(Number(so_hk_amount) - Number(so_total_zmount) < 30){
                     ce_amount = Number(so_hk_amount) - Number(so_total_zmount);
                     var inv_id = createFyInvoice(so_data,so_id,dk_date,ce_amount);
                     if(inv_id){
                         // inv_arr.push(inv_id);
                         var ret = hxInvoice(c_id,inv_id);
                         log.debug('存款应用程序id',ret);
                     }
                 }
             }
             else if(so_data == '作为余额'){

             }
             else if(so_data == '作为效益'){
                 ce_amount = Number(so_hk_amount) - Number(so_total_zmount);
                 var inv_id = createFyInvoice(so_data,so_id,dk_date,ce_amount);
                 if(inv_id){
                     // inv_arr.push(inv_id);
                     var ret = hxInvoice(c_id,inv_id);
                     log.debug('存款应用程序id',ret);
                 }
             }
         }




         // //相等直接核销销售发票
         // if(ce_amount == 0){
         //     var ret = hxInvoice(c_id,inv_arr);
         //     log.debug('存款应用程序核销销售订单',ret);
         // }
         // //判断差额是否<=配置表的“自动核销判断差额（30USD）”，如果是，先创建贷项，再贷项勾选应用发票核销
         // else if(ce_amount < 30){
         //     var inv_id = createFyInvoice(so_data,so_id,dk_date,ce_amount);
         //     if(inv_id){
         //         inv_arr.push(inv_id);
         //         var ret = hxInvoice(c_id,inv_arr);
         //         log.debug('存款应用程序核销销售和新增费用发票',ret);
         //     }
         // }

     }
     function hxInvoice(c_id,inv_id) {
         if(c_id){
             //客户存款转存款应用程序，然后应用程序核销发票
             var depositapplication_rec = record.transform({
                 fromType: 'customerdeposit',
                 fromId: c_id,
                 toType: 'depositapplication',
                 isDynamic: true,
             });
             var count = depositapplication_rec.getLineCount('apply');
             for(var i = 0; i < count;i++){
                 depositapplication_rec.selectLine('apply',i);
                 var internalid = depositapplication_rec.getCurrentSublistValue({
                     sublistId:'apply',
                     fieldId:'internalid'
                 });
                 var currency = depositapplication_rec.getCurrentSublistValue({
                     sublistId:'apply',
                     fieldId:'currency',
                 });
                 // for(var j = 0;j < inv_arr.length;j++){
                 log.debug('internalid inv_id',internalid + '---' + inv_id);
                 if(internalid == inv_id){
                     depositapplication_rec.setCurrentSublistValue({
                         sublistId:'apply',
                         fieldId:'apply',
                         value: true,
                     });
                     depositapplication_rec.commitLine('apply');
                 }
                 // }
             }
             var dep_app_id = depositapplication_rec.save();
             return dep_app_id;
         }
     }
     function createFyInvoice(so_data,so_id,dk_date,ce_amount) {
         var inv_rec = record.create({
             type:'invoice',
             isDynamic:true,
         });
         inv_rec.setValue('entity',so_data.entity);
         inv_rec.setValue('trandate',format.parse({type:format.Type.DATE,value:dk_date}));//
         inv_rec.setValue('memo','收款差额生成费用发票');
         inv_rec.setValue('custbody_sales_order',so_id);
         inv_rec.setValue('department',so_data.department);
         inv_rec.setValue('location',so_data.location);
         inv_rec.setValue('class',so_data.class);
         inv_rec.setValue('custbody_sl_bbaojiadan',so_data.baojiadan);
         inv_rec.setValue('custbody_sl_sopayway',so_data.pay_type);
         inv_rec.setValue('memo','收款差额生成费用发票');
         //明细行
         inv_rec.selectLine('item',0);
         inv_rec.setCurrentSublistValue({
             sublistId:'item',
             fieldId:'item',
             value:145,                   //手续费
         });
         inv_rec.setCurrentSublistValue({
             sublistId:'item',
             fieldId:'rate',
             value:ce_amount,
         });
         inv_rec.setCurrentSublistValue({
             sublistId:'item',
             fieldId:'quantity',
             value:1,
         });
         inv_rec.setCurrentSublistValue({
             sublistId:'item',
             fieldId:'taxcode',
             value:144,
         });
         inv_rec.commitLine('item');

         var inv_id = inv_rec.save();

         return inv_id;
     }
     function createCreditMemo(so_data,so_id,inv_arr,ce_amount){
         var cr_memo_rec = record.create({
             type:'creditmemo',
             isDynamic:true,
         });
         cr_memo_rec.setText('customform','傲英贷项通知单');
         cr_memo_rec.setValue('entity',so_data.entity);
         cr_memo_rec.setValue('custbody_sales_order',so_id);
         cr_memo_rec.setValue('department',so_data.department);
         cr_memo_rec.setValue('location',so_data.location);
         cr_memo_rec.setValue('class',so_data.class);
         cr_memo_rec.setValue('custbody_sl_so_innumber',so_data.wd_num);
         cr_memo_rec.setValue('custbody_sl_bbaojiadan',so_data.baojiadan);
         cr_memo_rec.setValue('custbody_sl_sopayway',so_data.pay_type);
         cr_memo_rec.setValue('memo','收款差额生成贷项通知单');
         //货品明细
         cr_memo_rec.selectNewLine('item',0);
         cr_memo_rec.setCurrentSublistValue({
             sublistId:'item',
             fieldId:'item',
             value:145,             //手续费
         });
         cr_memo_rec.setCurrentSublistValue({
             sublistId:'item',
             fieldId:'rate',
             value:ce_amount,
         });
         cr_memo_rec.setCurrentSublistValue({
             sublistId:'item',
             fieldId:'quantity',
             value:1,
         });
         cr_memo_rec.setCurrentSublistValue({
             sublistId:'item',
             fieldId:'taxcode',
             value:144,              //VAT_0
         });
         cr_memo_rec.setCurrentSublistValue({
             sublistId:'item',
             fieldId:'location',
             value:so_data.location,
         });
         cr_memo_rec.setCurrentSublistValue({
             sublistId:'item',
             fieldId:'department',
             value:so_data.department,
         });
         cr_memo_rec.commitLine('item');
         //应用明细
         var apply_count = cr_memo_rec.getLineCount('apply');
         log.debug('inv_arr',inv_arr);
         for(var i = 0;i < apply_count;i++){
             cr_memo_rec.selectLine('apply',i);
             var trantype = cr_memo_rec.getCurrentSublistValue({
                 sublistId:'apply',
                 fieldId:'trantype',
             });
             if(trantype == 'CustInvc'){
                 var doc = cr_memo_rec.getCurrentSublistValue({
                     sublistId:'apply',
                     fieldId:'doc',
                 });
                 log.debug('doc',doc);
                 for(var j = 0;j < inv_arr.length;j++){
                     if(doc == inv_arr[j]){
                         cr_memo_rec.setCurrentSublistValue({
                             sublistId:'apply',
                             fieldId:'amount',
                             value:ce_amount,
                         });
                         cr_memo_rec.setCurrentSublistValue({
                             sublistId:'apply',
                             fieldId:'apply',
                             value:true,
                         });
                         cr_memo_rec.commitLine('apply');
                     }
                 }
             }
         }

         var cr_memo_id = cr_memo_rec.save();
         return cr_memo_id;
     }
     function submitCk(rec,c_id) {
         if(c_id){
             record.submitFields({
                 type:'customrecord_sl_dktz_list',
                 id:rec.id,
                 values:{
                     custrecord_customer_deposit_slip:c_id,//客户存款单
                 }
             });
         }
     }
     function submitGh(rec,g_id) {
         if(g_id){
             record.submitFields({
                 type:'customrecord_sl_dktz_list',
                 id:rec.id,
                 values:{
                     custrecord_purchase_settlement:g_id,//购汇单
                 }
             });
         }
     }
     function createCustomerdeposit(dk_id,so_data,so_id,rate,dk_date,customer_data,dk_usd_amount,pay_type,dk_currency,kx_memo) {
         log.debug('com in');
         try{
             var rec = record.create({
                 type:'customerdeposit',
                 isDynamic:true,
             });
             rec.setText('currency','USD');//货币,默认美金
             rec.setValue('customer',so_data.entity);//客户
             rec.setValue('salesorder',so_id);//销售订单
             rec.setValue('exchangerate',rate);//汇率
             rec.setValue('trandate',format.parse({type:format.Type.DATE,value:dk_date}));//日期
             rec.setValue('department',so_data.department);//部门
             rec.setValue('location',so_data.location);//地点
             rec.setValue('class',so_data.class);//类别
             // rec.setValue('aracct',customer_data.bank_account);//应收款项账户
             rec.setValue('memo',kx_memo);//备注
             if(dk_currency == 2){
                 rec.setValue('account',getPayAccount(pay_type,dk_currency));//科目
             }
             else{
                 rec.setValue('account',834);//虚拟美金银行科目
             }
             rec.setValue('payment',dk_usd_amount);//支付金额
             rec.setValue('custbody_source_arrival_notice',dk_id);//来源到款通知
             rec.setValue('custbody_sl_sopayway',pay_type);//付款方式

             var c_id = rec.save();
             log.debug('c_id',c_id);

             return c_id;
         }catch(e){
             log.debug('创建客户存款失败',e);
         }
     }
     function getCustomer(customer_id) {
         if(customer_id){
             var rec = record.load({
                 type:'customer',
                 id:customer_id,
                 isDynamic:true,
             });
             return {
                 "bank_account":rec.getValue('custentity_account'),
             }
         }
     }
     function getSo(so_id) {
         if(so_id){
             var rec = record.load({
                 type:'salesorder',
                 id:so_id,
                 isDynamic:true,
             });
             return{
                 "currency":rec.getValue('currency'),
                 "department":rec.getValue('department'),
                 "location":rec.getValue('location'),
                 "class":rec.getValue('class'),
                 "entity":rec.getValue('entity'),
                 "baojiadan":rec.getValue('custbody_sl_bbaojiadan'), //报价单号
                 "wd_num":rec.getValue('custbody_sl_so_innumber'),   //网单号
                 "pay_type":rec.getValue('custbody_sl_sopayway'),     //付款方式
                 "total":rec.getValue('total'),          //总计
                 "hk_sum_amount":rec.getValue('custbody_sl_soamm'),      //回款金额
                 "ce_type":rec.getText('custbody_difference_type'),   //差额类型
             }
         }
         else{
             return 'null';
         }
     }
     function doArr(orgin_arr,id){
         var out_arr = new Array();
         for(var i = 0;i < orgin_arr.length;i++){
             out_arr.push(orgin_arr[i]);
         }
         out_arr.push(id);
         return out_arr;
     }
     function createScriptRec(id){
         if(id){
             var do_rec = record.create({
                 type:'customrecord_cl_dktz_script_do',
             });
             do_rec.setValue('custrecord25',id);
             do_rec.setValue('custrecord26',true);
             var do_rec_id = do_rec.save();
             return do_rec_id;
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
         onRequest: onRequest
     };

 });