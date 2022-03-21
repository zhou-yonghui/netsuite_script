/**
 * 到款通知单退款明细生成客户退款
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
 define(['N/record','N/search','N/format','N/runtime','N/currency'],
 function(record,search,format,runtime,nsCurrency) {
     function beforeLoad(context) {
         try{
             if(context.type == 'create'){
                 var rec = context.newRecord;
                 var dk_id = rec.getValue('custrecordassociate_payment_notice');
                 if(dk_id){
                     var dkRec = record.load({
                         type:'customrecord_sl_dktz_list',
                         id:dk_id,
                         isDynamic:true,
                     });
                     rec.setValue('custrecord_refund_currency',dkRec.getValue('custrecord_sl_dktz_bz') || '');//到款币种
                     rec.setValue('custrecord_refund_method',dkRec.getValue('custrecord_sl_fkfs') || '');//退款方式
                 }
             }
         }catch (e){
             log.debug('load',e);
         }
     }
     function beforeSubmit(context) {
         var rec = context.newRecord;
         if(context.type == 'create' || context.type == 'edit' || context.type == 'delete') {
             var customerRefund = rec.getValue('custrecord_customer_refund');
             var refundGh = rec.getValue('custrecord_refund_purchase_order');
             if((customerRefund || refundGh) && context.type == 'delete'){
                 throw "删除退款之前先删除客户退款单和退款购汇单";
             }
             else {
                 try{
                     var dk_id = rec.getValue('custrecordassociate_payment_notice');
                     if (dk_id) {
                         var tk_a = rec.getValue('custrecord_refund_amount');
                         var old_a;
                         if (context.type == 'create') {
                             old_a = getTkAll(dk_id, 'create');
                         } else if (context.type == 'edit') {
                             old_a = getTkAll(dk_id, 'edit', rec.id);
                         } else if (context.type == 'delete') {
                             tk_a = getTkAll(dk_id, 'edit', rec.id);
                             log.debug('退款金额', tk_a);
                         }
                         if (old_a && context.type != 'delete') {
                             tk_a = Number(old_a) + Number(tk_a);
                         }
                         if (!tk_a) {
                             tk_a = Number(0);
                         }
                         //回写到款通知
                         var dkRec = record.load({
                             type: 'customrecord_sl_dktz_list',
                             id: dk_id,
                             isDynamic: true,
                         });
                         var dk_amount = dkRec.getValue('custrecord_sl_dkje');
                         var rate = dkRec.getValue('custrecord_dktz_exchange_rate');
                         var so_id = dkRec.getValue('custrecord_sl_xsdd');
                         var dk_j_usd = dkRec.getValue('custrecord_sl_dkmj');
                         //
                         log.debug('dk tk', dk_amount + '---' + tk_a);
                         if (dk_amount && rate) {
                             dkRec.setValue('custrecord_sl_dkmj', ((Number(dk_amount) - Number(tk_a)) / Number(rate)).toFixed(2));
                         }
                         if (tk_a > 0) {
                             dkRec.setValue('custrecord_sl_tkje', tk_a.toFixed(2));//退款金额
                         } else if (tk_a == 0) {
                             dkRec.setValue('custrecord_sl_tkje', '0.00');//退款金额
                         }
                         dkRec.save();
                         //回款净美元到销售
                         var so_rec = record.load({
                             type: 'salesorder',
                             id: so_id,
                             isDynamic: true,
                         });
                         var dk_usd = so_rec.getValue('custbody_sl_soamm');//回款金额
                         if (!dk_usd) {
                             dk_usd = Number(0);
                         }
                         if (dk_amount && rate) {
                             if (!dk_j_usd) {
                                 dk_j_usd = Number(0);
                             }
                             record.submitFields({
                                 type: 'salesorder',
                                 id: so_id,
                                 values: {
                                     custbody_sl_soamm: (Number(dk_usd) - Number(dk_j_usd) + (Number(dk_amount) - Number(tk_a)) / Number(rate)).toFixed(2),
                                 }
                             });
                         }
                     }
                 }catch (e){
                     log.debug('befor',e);
                 }
             }
         }
     }
     function getTkAll(dk_id,flag,id){
         var sum = Number(0);
         if(dk_id){
             var mysearch;
             if(flag == 'create'){
                 mysearch = search.create({
                     type:'customrecord_refund_amount_details',
                     filters:[
                         ['custrecordassociate_payment_notice','anyof',dk_id]
                     ],
                     columns:[
                         'custrecord_refund_amount',    //退款金额
                     ]
                 });
             }
             else if(flag == 'edit'){
                 mysearch = search.create({
                     type:'customrecord_refund_amount_details',
                     filters:[
                         ['custrecordassociate_payment_notice','anyof',dk_id],
                         'AND',['internalid','noneof',id]
                     ],
                     columns:[
                         'custrecord_refund_amount',    //退款金额
                     ]
                 });
             }
             var res = mysearch.run().getRange(0,1000);
             if(res.length > 0){
                 for(var i = 0;i < res.length;i++){
                     sum += Number(res[i].getValue('custrecord_refund_amount'));
                 }
             }
         }
         log.debug('sum',sum);
         return sum;
     }
     function afterSubmit(context) {
         //创建退款和购汇
         try{
             if(context.type == 'create'){
                 var rec = record.load({type:'customrecord_refund_amount_details',id:context.newRecord.id,isDynamic:true});
                 var cr = rec.getValue('custrecord_customer_refund');
                 var gh = rec.getValue('custrecord_refund_purchase_order');
                 var rf_amount = rec.getValue('custrecord_refund_amount');
                 var refund_currency = rec.getValue('custrecord_refund_currency');//退款币种
                 var flag = 'N';
                 if(refund_currency == 2 && !cr){
                     flag = 'Y_1';
                 }
                 else if(refund_currency != 2 && !cr){
                     flag = 'Y_2';
                 }
                 else if(refund_currency != 2 && !gh){
                     flag = 'Y_3'
                 }
                 if(flag != 'N'){
                     var dk_id = rec.getValue('custrecordassociate_payment_notice');//关联到款通知单
                     if(dk_id){
                         var dk_rec = record.load({type:'customrecord_sl_dktz_list',id:dk_id,isDynamic:true});
                         var so_id = dk_rec.getValue('custrecord_sl_xsdd');
                         var so_data = getSo(so_id);
                         log.debug('so-data',so_data);
                         if(so_data != 'null'){
                             var pay_type = dk_rec.getValue('custrecord_sl_fkfs');//付款方式
                             var de_id = dk_rec.getValue('custrecord_customer_deposit_slip');//客户存款单
                             var dk_currency = dk_rec.getValue('custrecord_sl_dktz_bz');//到款币种
                             // var dk_currency_t = dk_rec.getValue('custrecord_sl_dktz_bz');
                             var dk_refund_amount = dk_rec.getValue('custrecord_sl_tkje');//退款金额
                             var dk_jmy = dk_rec.getValue('custrecord_sl_dkmj');//净美元
                             var rate = dk_rec.getValue('custrecord_dktz_exchange_rate');//汇率
                             //退款明细字段
                             var refund_type = rec.getValue('custrecord_type_of_refund');//退款类型
                             var refund_amount = (Number(rec.getValue('custrecord_refund_amount'))/Number(rate)).toFixed(2);//退款金额
                             var refund_date = rec.getValue('custrecord_refund_date1');//退款日期
                             if(refund_currency == 2 && flag == 'Y_1'){
                                 //创建退款
                                 var ret = createCustomerRefund(so_data,refund_date,pay_type,refund_type,de_id,refund_amount,dk_id,so_id);
                                 log.debug('ret',ret);
                                 if(ret != 'false'){
                                     rec.setValue('custrecord_customer_refund',ret);
                                     rec.save();
                                     log.debug('创建客户退款成功');
                                 }
                             }
                             else{
                                 if(flag == 'Y_2'){
                                     //创建退款
                                     var ret = createCustomerRefund(so_data,refund_date,pay_type,refund_type,de_id,refund_amount,dk_id,so_id);
                                     if(ret != 'false'){
                                         var g_id = createGhRec(rec,refund_date,pay_type,dk_currency,dk_refund_amount,dk_jmy,rate,dk_id,dk_rec,rf_amount);
                                         if(g_id){
                                             rec.setValue('custrecord_customer_refund',ret);
                                             rec.setValue('custrecord_refund_purchase_order',g_id);
                                             rec.save();
                                         }
                                         else{
                                             rec.setValue('custrecord_customer_refund',ret);
                                             rec.save();
                                         }
                                         log.debug('创建成功');
                                     }
                                 }
                                 else if(flag == 'Y_3'){
                                     var g_id = createGhRec(rec,refund_date,pay_type,dk_currency,dk_refund_amount,dk_jmy,rate,dk_id,dk_rec,rf_amount);
                                     if(g_id){
                                         rec.setValue('custrecord_refund_purchase_order',g_id);
                                         rec.save();
                                     }
                                 }

                             }
                         }
                     }
                 }
             }
         }catch(e){
             log.debug('创建退款和购汇错误',e);
         }
     }
     function createGhRec(recTk,refund_date,pay_type,dk_currency,dk_refund_amount,dk_jmy,rate,dk_id,dk_rec,rf_amount){
         try{
             var zf_cny_rate = getCurrencyNsRate(recTk,dk_currency,1);//支付币种汇率（本位币）
             var gj_cny_rate = getCurrencyNsRate(recTk,2,1);//购进币种汇率（本位币）
             var jz_rate;
             if(dk_currency != 2 && dk_currency != 1){
                 jz_rate = Number(zf_cny_rate)/Number(gj_cny_rate);
             }
             else if(dk_currency == 1){
                 jz_rate = getCurrencyNsRate(recTk,2,1);
             }
             var rec = record.create({
                 type:'customrecord_hg_bank_transfer_order',
                 isDynamic:true,
             });
             rec.setValue('custrecord_hg_bank_transfer_subsidiary',1);//主体公司:默认母公司
             rec.setValue('custrecord_hg_bank_transfer_date',refund_date);//交易时间
             rec.setValue('custrecord_hg_bank_transfer_account_hd',823);//汇兑损益科目
             rec.setValue('custrecord_hg_bank_transfer_from_account',getPayAccount(pay_type,dk_currency));//支付科目
             rec.setValue('custrecord_hg_bank_transfer_to_account',834);//购进科目
             rec.setValue('custrecord_hg_bank_transfer_amount_f',rf_amount);//支付金额
             rec.setValue('custrecord_hg_bank_transfer_amount_t',(Number(rf_amount)/Number(rate)).toFixed(2));//购进金额
             rec.setValue('custrecord_hg_bank_transfer_gh_rate',(Number(1)/Number(rate)).toFixed(4));//购汇汇率
             rec.setValue('custrecord_source_arrival_notice2',dk_id);//来源到款通知单
             rec.setValue('custrecord_hg_bank_transfer_currency_f',dk_currency);//支付币种
             rec.setValue('custrecord_hg_bank_transfer_currency_t',2);//购进币种，退款时购进币种是USD
             if(dk_currency == 1){//仅支付币种与本位币一致
                 rec.setValue('custrecord_hg_bank_transfer_type',2);//类型
                 rec.setValue('custrecord_hg_bank_transfer_amount_hs',(rf_amount * jz_rate).toFixed(2));//换算本位币金额
             }
            //  else if(){ //仅购进币种与本位币一致,购进币种为usd

            //  }
             else if(dk_currency != 1){//支付币种与购进币种都和本位币不一致
                 rec.setValue('custrecord_hg_bank_transfer_type',1);//类型
                 rec.setValue('custrecord_hg_bank_transfer_amount_hs',(Number(rf_amount)/Number(gj_cny_rate)).toFixed(2));//换算本位币金额
             }
             if(jz_rate != 'null'){
                 rec.setValue('custrecord_hg_bank_transfer_jz_rate',(jz_rate).toFixed(4));//记账汇率
             }
             if(zf_cny_rate != 'null'){
                 rec.setValue('custrecord_hg_bank_transfer_zb_rate',(zf_cny_rate.toFixed(4)));//支付汇率（本位币）
                 rec.setValue('custrecord_hg_bank_transfer_amount_fz',(rf_amount * zf_cny_rate).toFixed(2));//中转科目金额（支付）
             }
             if(gj_cny_rate != 'null'){
                 rec.setValue('custrecord_hg_bank_transfer_bz_rate',(gj_cny_rate).toFixed(4));//购进汇率（本位币)
                 rec.setValue('custrecord_hg_bank_transfer_amount_tz',(Number(rf_amount * zf_cny_rate)/Number(gj_cny_rate)).toFixed(2));//中转科目金额（购进）
             }
             if(jz_rate > rate){
                 rec.setValue('custrecord_hg_bank_transfer_type_sub',2);//	汇损
             }
             else if(jz_rate < rate){
                 rec.setValue('custrecord_hg_bank_transfer_type_sub',1);//	汇益
             }


             var g_id = rec.save();
             log.debug('g_id',g_id);

             return g_id;
         }catch(e){
             log.debug('创建购汇单失败',e);
         }
     }
     function getCurrencyNsRate(recTk,source_currency,target_currency){
         var exchange_rate = nsCurrency.exchangeRate({
             source: source_currency,
             target: target_currency,
             date: new Date(recTk.getValue('custrecord_refund_date1'))
         });

         return exchange_rate;
     }
     function getDayExchangerate(one_currency,two_currency) {
         //
         if(one_currency && two_currency){
             var one_rate = Number(1);
             var two_rate = Number(1);
             if(one_currency != 1){//CNY
                 var mysearch = search.create({
                     type:'customrecord_real_time_exchange_rate',
                     filters:[
                         ['custrecord_rte_rate_currency','is',one_currency]
                     ],
                     columns:[
                         'custrecord_rte_rates'
                     ]
                 });
                 var res = mysearch.run().getRange(0,1);
                 if(res.length > 0){
                     one_rate = res[0].getValue('custrecord_rte_rates');
                 }
             }
             if(two_currency){
                 var mysearch_usd = search.create({
                     type:'customrecord_real_time_exchange_rate',
                     filters:[
                         ['custrecord_rte_rate_currency','is',two_currency]
                     ],
                     columns:[
                         'custrecord_rte_rates'
                     ]
                 });
                 var res_usd = mysearch_usd.run().getRange(0,1);
                 if(res_usd.length > 0){
                     two_rate = res_usd[0].getValue('custrecord_rte_rates');
                 }
             }

             return (Number(one_rate)/Number(two_rate)).toFixed(4);
         }
     }
     function createCustomerRefund(so_data,refund_date,pay_type,refund_type,de_id,refund_amount,dk_id,so_id) {
         var save_flag = 'N';
         var rec = record.create({
             type:'customerrefund',
             isDynamic:true,
         });
         rec.setValue('customer',so_data.entity);//客户
         rec.setValue('currency',so_data.currency);//货币
         rec.setValue('custbody_sales_order',so_id);//销售订单
         //  rec.setValue('exchangerate',);//汇率，系统当天
         var customer_data = getCustomer(so_data.entity);
         if(refund_type == 1 && customer_data != 'null'){//退货退款
             rec.setValue('aracct',customer_data.receivablesaccount);//
             rec.setValue('account',834);//科目，USD
         }
         else if(refund_type == 4 && customer_data != 'null'){//退预收款
             rec.setValue('aracct',customer_data.receivablesaccount);//
             rec.setValue('account',834);//
         }
         rec.setValue('trandate',format.parse({type:format.Type.DATE,value:refund_date}));//日期
         rec.setValue('department',so_data.department);//部门
         rec.setValue('location',so_data.location);//地点
         rec.setValue('class',so_data.class);//类别
         rec.setValue('custbody_sl_sopayway',pay_type);//付款方式
         rec.setText('custbody_cseg_cn_cfi','销售商品、提供劳务收到的现金');//中国现金流量表项
         rec.setValue('custbody_source_arrival_notice',dk_id);//来源到款通知单
         var count_apply = rec.getLineCount('apply');//贷记
         var count_deposit = rec.getLineCount('deposit');//存款
         log.debug('refund_type',refund_type);
         if(count_apply > 0 && refund_type == 1){
             //获取贷项通知单
             var cm_arr = getCm(so_id);
             log.debug('cm_arr',cm_arr);
             for(var i = 0;i < count_apply;i++){
                 rec.selectLine('apply',i);
                 var trantype = rec.getCurrentSublistValue({
                     sublistId:'apply',
                     fieldId:'trantype',
                 });
                 var internalid = rec.getCurrentSublistValue({
                     sublistId:'apply',
                     fieldId:'internalid',
                 });
                 log.debug('trantype internalid',trantype + '--' + internalid);
                 for(var n = 0;n < cm_arr.length;n++){
                     if(trantype == 'CustCred'){//贷记
                         // log.debug('cm_arr[' + n + ']',cm_arr[n]);
                         if(internalid == cm_arr[n]){
                             log.debug('refund_amount',refund_amount);
                             rec.setCurrentSublistValue({
                                 sublistId:'apply',
                                 fieldId:'amount',
                                 value:refund_amount
                             });
                             // rec.setCurrentSublistValue({
                             //     sublistId:'apply',
                             //     fieldId:'apply',
                             //     value:true,
                             // });
                             rec.commitLine('apply');
                             save_flag = 'Y';
                         }
                     }
                 }
             }
         }
         if(count_deposit > 0 && refund_type == 4){
             for(var j = 0;j < count_deposit;j++){
                 rec.selectLine('deposit',j);
                 // var trantype = rec.getCurrentSublistValue({
                 //     sublistId:'deposit',
                 //     fieldId:'trantype',
                 // });
                 // var internalid = rec.getCurrentSublistValue({
                 //     sublistId:'deposit',
                 //     fieldId:'internalid',
                 // });
                 // var amount = rec.getCurrentSublistValue({
                 //     sublistId:'deposit',
                 //     fieldId:'amount'
                 // });
                 // var url = rec.getCurrentSublistValue({
                 //     sublistId:'deposit',
                 //     fieldId:'url',
                 // });
                 var doc = rec.getCurrentSublistValue({
                     sublistId:'deposit',
                     fieldId:'doc',           //TODO：客户退款的付款应用里面doc字段是客户付款的内部id
                 })
                 // log.debug('deposit :de_id  doc',de_id + '--' + doc);
                 // if(trantype == 'DepAppl'){//存款
                 if(doc == de_id){
                     rec.setCurrentSublistValue({
                         sublistId:'deposit',
                         fieldId:'amount',
                         value:refund_amount
                     });
                     // rec.setCurrentSublistValue({
                     //     sublistId:'deposit',
                     //     fieldId:'apply',
                     //     value:true,
                     // });
                     rec.commitLine('deposit');
                     save_flag = 'Y';
                 }
                 // }
             }
         }
         if(save_flag == 'Y'){
             var cr_id = rec.save();

             return cr_id;
         }
         else{
             return 'false';
         }
     }
     function getCm(so_id) {
         var ra_arr = new Array();
         var cm_arr = new Array();
         if(so_id){
             var ra_search = search.create({
                 type:'returnauthorization',
                 filters:[
                     ['createdfrom','anyof',so_id],
                     'AND',['status','anyof',['RtnAuth:G']],   //已退款
                     'AND',['mainline','is',true]
                 ]
             });
             var ra_res = ra_search.run().getRange(0,1000);
             log.debug('已退款的退货授权单',JSON.stringify(ra_res));
             if(ra_res.length > 0){
                 for(var i = 0;i < ra_res.length;i++){
                     ra_arr.push(ra_res[i].id);
                 }
                 var cm_search = search.create({
                     type:'creditmemo',
                     filters:[
                         ['createdfrom','anyof',ra_arr],
                         'AND',['status','anyof',['CustCred:A']],   //待核销
                         'AND',['mainline','is',true]
                     ]
                 });
                 var cm_res = cm_search.run().getRange(0,1000);
                 log.debug('待核销贷项通知单',JSON.stringify(cm_res));
                 for(var j = 0;j < cm_res.length;j++){
                     cm_arr.push(cm_res[j].id);
                 }
             }
         }
         return cm_arr;
     }
     function getCustomer(customer_id) {
         if(customer_id){
             var rec = record.load({
                 type:'customer',
                 id:customer_id,
                 isDynamic:true,
             });

             return {
                 "receivablesaccount":rec.getValue('receivablesaccount'),
             }
         }
         else{
             return 'null'
         }
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
             }
         }
         else{
             return 'null';
         }
     }
     return {
         beforeLoad: beforeLoad,
         beforeSubmit: beforeSubmit,
         afterSubmit: afterSubmit
     };
 });
