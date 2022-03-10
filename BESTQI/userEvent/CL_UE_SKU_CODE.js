/**
 * @Author: zhouyh
 * @Date: 2021-10-18 15:20:07
 * @LastEditors: zhouyh
 * @LastEditTime: 2021-12-29 15:18:34
 * @Description: 编码规则=spu + 规格 + 三流水号
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 */
 define(['N/record','N/search','N/format','N/runtime'],
 function(record,search,format,runtime) {
     function beforeLoad(context) {
        var rec = context.newRecord;
        rec.setValue('itemid','保存后赋值');//
     }
     function beforeSubmit(context) {
         if(context.type == 'create'){
            var rec = context.newRecord;
            var guige = rec.getValue('custitems_l_gg_list');//规格
            var spu = rec.getValue('custitemspu');//spu
            var g_code = getGuige(guige);
            var spu_code = getCode(spu,'custitemspu');
            if(g_code && spu_code){
                var liushui = getLiuShuiCode(guige,spu);
                log.debug('g_code spu_code liushui',g_code + '---' + spu_code + '---' + liushui);
                if(liushui){
                    rec.setValue('itemid',spu_code + g_code + liushui);
                }
            }
         }
     }
     function getGuige(id) {
         var ret = '';
         if(id){
             if(id == 1){ ret = 'L';}
             else if(id == 2){ ret = 'M';}
             else if(id == 3){ ret = 'S';}
             else if(id == 4){ ret = 'F';}
             else if(id == 5){ ret = 'K';}
             else if(id == 6){ ret = 'N';}
             else if(id == 7){ ret = 'Q';}
             else if(id == 8){ ret = 'T';}
             else if(id == 9){ ret = 'X';}
         }
         return ret;
     }
     function getCode(params,rec_type) {
         if(params && rec_type){
             var ret;
             if(rec_type == 'custitemspu'){
                ret = record.load({type:'customrecord_spu',id:params,isDynamic:true}).getValue('name');
             }
             return ret;
         }
     }
     function getLiuShuiCode(guige,spu) {
        var sku_code = '';
         if(guige && spu){
            var mysearch = search.create({
                type:'inventoryitem',             //库存货品
                filters:[
                    ['custitemspu','anyof',spu],
                    'AND',['custitems_l_gg_list','is',guige],
                ],
                columns:[
                    {name:'internalid',sort:search.Sort.DESC},
                    'itemid',
                ]
            });
            var col = mysearch.columns;
            var res = mysearch.run().getRange(0,1000);
            log.debug('相同属性的sku',JSON.stringify(res));
            if(res.length > 0){
                // var old_ls = Math.abs(res[0].getValue(col[1]).substr(9,3));
                // log.debug('old_ls',old_ls);
                // var num = Number(old_ls) + Number(1);
                var num = Number(res.length) + Number(1);
                if(num < 10){
                    sku_code = '00' + num;
                }
                else if(num < 100){
                    sku_code = '0' + num;
                }
                else if(num < 1000){
                    sku_code = num;
                }
            }
            else{
                sku_code = '001';
            }
            
         }
         log.debug('sku_code',sku_code);
         return sku_code;
     }
     function afterSubmit(context) {
         
     }

     return {
         beforeLoad: beforeLoad,
         beforeSubmit: beforeSubmit,
         afterSubmit: afterSubmit
     };
 });
