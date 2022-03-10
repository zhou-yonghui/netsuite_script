/**
 * 订柜计划启动脚本
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */
 define(['N/search', 'N/ui/serverWidget', 'N/runtime', 'N/record', 'N/file', 'N/redirect', 'N/task', 'N/query','N/http','N/format','SuiteScripts/utils/moment.js'],

 function(search, serverWidget, runtime, record, file, redirect, task, query, http,format,moment) {

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
        if(para.flag && para.dgId){
            log.debug('flag dgId',para.flag + '---' + para.dgId);
            try{
                // //创建生成内部交易的脚本部署
                // var rec = record.create({
                //     type: record.Type.SCRIPT_DEPLOYMENT,
                //     defaultValues: {
                //         // script: 221      //订柜计划生成内部交易的脚本内部id,正式环境
                //         script:145,          // 测试环境
                //     },
                //     isDynamic: true
                // });
                // var now = moment.utc().format('YYYYMMDDHHmmss') + para.dgId;
                // rec.setValue('scriptid','_' + now.toLowerCase());
                // rec.setValue('title', '订柜计划生成内部交易');
                // rec.setValue('startdate', new Date());
                // var recId = rec.save();
                // log.debug('recId',recId);
                // //log.debug('deployid','customdeploy_' + now);
                // var deploymentId = 'customdeploy_' + now;
                // log.debug('deployid',deploymentId);
                //启动map脚本
                var mrTask;
                if(para.flag == 2){//发运
                    mrTask = task.create({
                        taskType: task.TaskType.MAP_REDUCE,
                        scriptId: 86,    //正式环境
                        // scriptId:145,          // 测试环境
                        // deploymentId: deploymentId,
                        deploymentId : 'customdeploy_cl_mp_dgjh_do_mp',       //订柜计划生成内部交易
                    });
                    mrTask.params = {'custscript_cl_dgid' : para.dgId,'custscript_cl_button_flag' : para.flag};
                }
                else if(para.flag == 1){//外部采购
                    mrTask = task.create({
                        taskType: task.TaskType.MAP_REDUCE,
                        scriptId: 89,    //正式环境
                        // scriptId:274,          // 测试环境
                        // deploymentId: deploymentId,
                        deploymentId : 'customdeploy_cl_mp_dgjh_wbpo',       //订柜计划外部PO
                    });
                    mrTask.params = {'custscript_cl_dgid_wbpo' : para.dgId,'custscriptcl_button_flag_wbpo' : para.flag};
                }
                else if(para.flag == 3){//收货
                    mrTask = task.create({
                        taskType: task.TaskType.MAP_REDUCE,
                        scriptId: 87,    //正式环境
                        // scriptId:276,          // 测试环境
                        // deploymentId: deploymentId,
                        deploymentId : 'customdeploy_cl_mp_dgjh_received',       //订柜计划收货
                    });
                    mrTask.params = {'custscript_cl_dgid_received' : para.dgId,'custscript_cl_button_flag_received' : para.flag};
                }
                else if(para.flag == 4){//发货
                    mrTask = task.create({
                        taskType: task.TaskType.MAP_REDUCE,
                        scriptId: 90,    //正式环境
                        // scriptId:275,          // 测试环境
                        // deploymentId: deploymentId,
                        deploymentId : 'customdeploy_cl_mp_dgjh_ship',       //订柜计划发货
                    });
                    mrTask.params = {'custscript_cl_dgid_ship' : para.dgId,'custscript_cl_button_flag_ship' : para.flag};
                }

                var mrTask_id = mrTask.submit();
                if(mrTask_id){
                    //创建mp脚本执行记录
                    var mp_log_rec_id = createMpLogRecord(para.dgId);
                    log.debug('mp_log_rec_id',mp_log_rec_id);
                    //回传订柜计划信息
                    output_flag = 'Y';
                }
            }catch(e){
                log.debug('创建脚本部署错误',e);
                //回传订柜计划信息
                output_flag = e.name;
            }
        }
        if(output_flag != 'Y'){
            context.response.write({output:output_flag});
        }
        else{
            context.response.write({output:"Y"});
        }
    }
    function createMpLogRecord(dgId) {
        if(dgId){
            var flag = getSameLogRecord(dgId);
            log.debug('创建mp脚本执行记录flag',flag);
            if(flag == 'Y'){
                var rec = record.create({
                    type:'customrecord_sl_dg_sc_re',
                    isDynamic:true,
                });
                rec.setValue('custrecord_sl_dg_number',dgId);//订柜计划
                rec.setValue('custrecord_sl_cj_person',runtime.getCurrentUser().id);//创建人
                rec.setValue('custrecord_sl_zx_result',2);//执行结果
                var rec_id = rec.save();
                
                return rec_id;
            }
        }
    }
    function getSameLogRecord(dgId) {
        var flag = 'N';
        if(dgId){
            var mysearch = search.create({
                type:'customrecord_sl_dg_sc_re',
                filters:[
                    ['custrecord_sl_dg_number','anyof',dgId],
                    'AND',['custrecord_sl_zx_result','is',2],        //执行中
                ]
            });
            var res = mysearch.run().getRange(0,1000);
            if(res.length == 0){
                flag = 'Y';
            }
        }
        return flag;
    }
     return {
         onRequest: onRequest
     };

 });