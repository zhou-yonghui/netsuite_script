/**
 * @Author: zhouyh
 * @Date: 2021-10-18 10:51:24
 * @LastEditors: zhouyh
 * @LastEditTime: 2021-12-28 17:41:26
 * @Description: 编码规则 = spu编码 + 规格尺寸 + 三位流水号
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 */
 define(['N/record','N/search','N/format','N/runtime'],
 function(record,search,format,runtime) {
     function beforeLoad(context) {
        var rec = context.newRecord;
        rec.setValue('name','保存后赋值');//
     }
     function beforeSubmit(context) {
         if(context.type == 'create' || context.type == 'edit'){
            var rec = context.newRecord;
            var spu_code;
            var flag;
            var pinpai = rec.getValue('custrecord_bsq_brand');//品牌
            var guige = rec.getValue('custrecord_specification_and_size');//规格
            var type = rec.getValue('custrecord_sl_subclass_name');//类型（小类）
            var type_t = rec.getValue('custrecord_bsq_type_subclass');//小类简称
            var number = rec.getValue('custrecord_bsq_serial_number');//序列号
            var big_type = rec.getValue('custrecord_sl_ss_dl');//大类
            var liushui = getNumber(pinpai,type,big_type);
            if(big_type && pinpai && type){
                spu_code = getCode(big_type,'custrecord_sl_ss_dl') + type_t + liushui + getCode(pinpai,'custrecord_bsq_brand');
            }
            else{
                throw "大类、小类、品牌必填";
            }
            log.debug(spu_code);
            if(context.type == 'create'){
                // flag = getSpu(spu_code,'create');
                if(spu_code){
                    rec.setValue('name',spu_code);//名称
                }
            }
            // else if(context.type == 'edit'){
            //     flag = getSpu(spu_code,'edit');
            // }
         }
     }
     function getNumber(pinpai,type,big_type) {
         var ret_num = '01';
         if(big_type && pinpai && type){
             var mysearch = search.create({
                 type:'customrecord_spu',
                 filters:[
                     ['custrecord_sl_subclass_name','is',type],
                     'AND',['custrecord_sl_ss_dl','is',big_type],
                     'AND',['custrecord_bsq_brand','is',pinpai],
                 ],
                 columns:[
                     'name',
                     {name:'internalid',sort:search.Sort.DESC}
                 ]
             });
             var res = mysearch.run().getRange(0,1000);
             log.debug('同一属性spu搜索',JSON.stringify(res));
             if(res.length > 0){
                 var num = Number(res.length);
                 num = Number(num) + Number(1);
                 if(num < 10){
                     ret_num = '0' + num;
                 }
                 else if(num < 100){
                     ret_num = num;
                 }
             }
         }

         return ret_num;
     }
     function getCode(params,rec_type) {
         log.debug('para rec_type',params + '---' + rec_type);
         if(params && rec_type){
             if(rec_type == 'custrecord_bsq_brand'){
                return record.load({type:'customrecord_hl_brand',id:params,isDynamic:true}).getValue('custrecord_brand_abbreviation');//品牌缩写
             }
             else if(rec_type == 'custrecord_specification_and_size'){
                 if(params == 1){
                     return 'L';
                 }else if(params == 2){
                     return 'M';
                 }else if(params == 3){
                     return 'S';
                 }
             }else if(rec_type == 'custrecord_bsq_type_subclass'){
                 return record.load({type:'customrecord_hl_subcategory',id:params,isDynamic:true}).getValue('name');
             }
             else if(rec_type == 'custrecord_sl_ss_dl'){
                return record.load({type:'customrecord_rm_record_category',id:params,isDynamic:true}).getValue('custrecord_sl_dl_dl');
             }
         }
     }
     function getSpu(spu_code,flag) {
        var mysearch = search.create({
            type:'customrecord_spu',
            filters:[['name','is',spu_code]],
        });
        var res = mysearch.run().getRange(0,100);
        if(flag == 'create'){
            if(res.length > 0){
                return 'N';
            }else{
                return 'Y';
            }
        }
        else if(flag == 'edit'){
            if(res.length > 1){
                return 'N';
            }else{
                return 'Y';
            }
        }
     }
     function afterSubmit(context) {
         
     }

     return {
         beforeLoad: beforeLoad,
         beforeSubmit: beforeSubmit,
         afterSubmit: afterSubmit
     };
 });
