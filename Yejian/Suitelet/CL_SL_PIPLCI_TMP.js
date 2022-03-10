/**
 * 模板打印取值单
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
            log.debug('recid',recid);
            context.response.sendRedirect({
                type: http.RedirectType.RECORD,
                identifier: 'customrecord_sl_qu',
                // editMode:true,
                parameters: {"record_id":recid},
            });
        }
     }
     return {
         onRequest: onRequest
     };

 });