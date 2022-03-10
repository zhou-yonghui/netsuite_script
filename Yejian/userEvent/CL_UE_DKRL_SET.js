/**
 * 到款通知单认领
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
 define(['N/record','N/search','N/format','N/runtime'],
 function(record,search,format,runtime) {
     function beforeLoad(context) {
        var rec = context.newRecord; 
        var para = context.request.parameters;
        if(context.type == 'view'){
            var form  = context.form;
            //返回通知单按钮
            form.clientScriptFileId = 17;   
            form.addButton({
                id:'custpage_reportexcel',
                label:'返回通知单',
                functionName:'returnDktz()',
            });
        }
        if(para.dk_id){
            rec.setValue('custrecord_cl_laiyuan_dktz',para.dk_id);
        }
     }
     function beforeSubmit(context) {

     }
     function afterSubmit(context) {
         try{
            if(context.type == 'create'){
                var rec = context.newRecord;
                var so_id = rec.getValue('custrecord_sl_xsddh');//销售订单
                var tz_id = rec.getValue('custrecord_cl_laiyuan_dktz');//来源通知单
                var id_out_arr = new Array();
                if(so_id){
                    var so_rec = record.load({
                        type:'salesorder',
                        id:so_id,
                        isDynamic:true
                    });
                    var id_arr = so_rec.getValue('custbody_sl_dkrl');
                    // log.debug('id_arr',id_arr + '--' + typeof(id_arr));
                    if(id_arr.length > 0){
                        id_out_arr = arrayAdd(id_arr,id_out_arr);
                        id_out_arr.push(context.newRecord.id);
                    }
                    else{
                        id_out_arr.push(context.newRecord.id);
                    }
                    so_rec.setValue('custbody_sl_dkrl',id_out_arr);
                    so_rec.save();
                    log.debug('销售单赋值结束');
                }
                //更改通知单状态
                if(tz_id && so_id){
                    record.submitFields({
                        type:'customrecord_sl_dktz_list',
                        id:tz_id,
                        values:{
                            custrecord_sl_dkzt:4,       //已认领
                            custrecordrlsj:format.parse({value:new Date(new Date().getTime()+(parseInt(new Date().getTimezoneOffset()/60) + 8)*3600*1000),type:format.Type.DATE}),
                        }
                    })
                }
            }
         }catch(e){
             log.debug('报错',e);
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
        //  beforeSubmit: beforeSubmit,
         afterSubmit: afterSubmit
     };
 });
