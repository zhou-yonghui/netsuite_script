/**
 * 货品收据创建库存转移记录表
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
 define(['N/record','N/search','N/format','N/runtime','N/currency'],
 function(record,search,format,runtime,currencyRate) {
     function beforeLoad(context) {
        
     }
     function beforeSubmit(context) {

     }
     function afterSubmit(context) {
         if(context.type == 'create' || context.type == 'edit'){   
            var rec = record.load({
                type:'itemreceipt',
                id:context.newRecord.id,
                isDynamic:true,
            });
            var item_count = rec.getLineCount('item');
            var it_end_locaiton = rec.getValue('custbody_sl_yydbkw');//目的仓
            var yy_day = rec.getValue('custbody_sl_yydbsj');//预约调拨天数
            if(!yy_day){
                yy_day = 2;
            }
            for(var i = 0;i < item_count;i++){
                rec.selectLine('item',i);
                var is_it = rec.getCurrentSublistValue({
                    sublistId:'item',
                    fieldId:'custcol_sl_sfyydb',
                });
                if(is_it == true){
                    var it_item = rec.getCurrentSublistValue({
                        sublistId:'item',
                        fieldId:'item',
                    });
                    var it_num = rec.getCurrentSublistValue({
                        sublistId:'item',
                        fieldId:'custcol_sl_mryydbsl',
                    });
                    var it_start_locaiton = rec.getCurrentSublistValue({
                        sublistId:'item',
                        fieldId:'location',
                    });
                    log.debug('it_item it_num it_start_locaiton',it_item + '---' + it_num + '---' + it_start_locaiton);
                    //先验证是否已经创建记录
                    var data = getSame(context.newRecord.id,it_item);
                    log.debug('data',data);
                    if(data.flag == 'Y'){
                        //创建库存转移记录
                        var it_log_rec = record.create({
                            type:'customrecord_sl_it_rec',
                            isDynamic:true,
                        });
                        it_log_rec.setValue('custrecord_sl_from_ir',context.newRecord.id);//来源货品收据
                        it_log_rec.setValue('custrecord_sl_yy_day',yy_day);//预约天数
                        it_log_rec.setValue('custrecord_sl_start_location',it_start_locaiton);//起始仓
                        it_log_rec.setValue('custrecord_sl_end_location',it_end_locaiton);//目的仓
                        it_log_rec.setValue('custrecord_sl_item',it_item);//货品
                        it_log_rec.setValue('custrecord_sl_change_num',it_num);//转移数量
                        it_log_rec.setValue('custrecord_sl_wait_it',true);//等待调拨
                        it_log_rec.save();
                    }
                    else if(data.flag == 'N' && data.id != 'N'){
                        //更新库存转移记录表
                        var it_log_rec_up = record.load({
                            type:'customrecord_sl_it_rec',
                            id:data.id,
                            isDynamic:true,
                        });
                        var is_f = it_log_rec_up.getValue('custrecord_sl_wait_it');
                        log.debug('is_f it_num',is_f + '---' + it_num);
                        if(is_f == true){
                            it_log_rec_up.setValue('custrecord_sl_change_num',it_num);
                            it_log_rec_up.setValue('custrecord_sl_yy_day',yy_day);//预约天数
                            it_log_rec_up.setValue('custrecord_sl_start_location',it_start_locaiton);//起始仓
                            it_log_rec_up.setValue('custrecord_sl_end_location',it_end_locaiton);//目的仓
                            it_log_rec_up.save();
                        }
                    }
                }
            }
         }
     }
     function getSame(ir_id,item){
        if(ir_id && item){
            var flag = 'Y';
            var rec_log_id = 'N';
            var mysearch = search.create({
                type:'customrecord_sl_it_rec',
                filters:[
                    ['custrecord_sl_from_ir','anyof',ir_id]
                ],
                columns:[
                    'custrecord_sl_item'
                ]
            });
            var res = mysearch.run().getRange(0,1000);
            if(res.length > 0){
                for(var i = 0;i < res.length;i++){
                    if(res[i].getValue('custrecord_sl_item') == item){
                        flag = 'N';
                        rec_log_id = res[i].id;
                        break;
                    }
                }
            }
            return {
                "flag":flag,
                "id":rec_log_id,
            };
        }
     }
     return {
        //  beforeLoad: beforeLoad,
        //  beforeSubmit: beforeSubmit,
         afterSubmit: afterSubmit
     };
 });
