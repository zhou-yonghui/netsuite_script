/**
 * @LastEditors: zhouyh
 * @LastEditTime: 2022-01-13 09:59:40
 * @Description: 品牌记录名称去重
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define(['N/record','N/search','N/format','N/runtime'],
    function(record,search,format,runtime) {
        function beforeLoad(context) {

        }
        function beforeSubmit(context) {
            if(context.type == 'edit' || context.type == 'create'){
                var rec = context.newRecord;
                var name = rec.getValue('name');//名称
                //查询数据
                var mysearch = search.create({
                    type:'customrecord_hl_brand',
                    filters:[
                        ['name','is',name],
                    ],
                });
                var res = mysearch.run().getRange(0,1);
                if(res.length > 0){
                    if(context.type == 'edit'){
                        if(rec.id != res[0].id){
                            throw "和内部id为" + res[0].id + '的品牌记录名称相同，请检查';
                        }
                    }else{
                        throw "和内部id为" + res[0].id + '的品牌记录名称相同，请检查';
                    }
                }
            }
        }
        function afterSubmit(context) {

        }

        return {
            //  beforeLoad: beforeLoad,
            beforeSubmit: beforeSubmit,
            // afterSubmit: afterSubmit
        };
    });