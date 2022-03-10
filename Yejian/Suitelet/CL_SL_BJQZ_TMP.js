/**
 * 
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */
 define(['N/search', 'N/ui/serverWidget', 'N/runtime', 'N/record', 'N/file', 'N/redirect', 'N/task', 'N/query','N/http','N/format'],

 function(search, serverWidget, runtime, record, file, redirect, task, query, http,format) {

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
        log.debug('para',JSON.stringify(para));
        var recid = para.recordId;
        if(recid){
            var rec = record.load({
                type:'salesorder',
                id:recid,
                isDynamic:true,
            });
            rec.setValue('memo','测试脚本更改了订单状态');
            rec.setValue('orderstatus','B');//待履行
            var so_rec_id = rec.save();
            log.debug('soid',so_rec_id);
            context.response.write({output:'Y'});
        }
     }
     return {
         onRequest: onRequest
     };

 });