/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 * @Description 自定义库存调整单sl 1
 */
define(["N/log","../dao/cux_inv_adjust_dao"],

    function (log,dao) {

        /**
         * Definition of the Suitelet script trigger point.
         *
         * @param {Object} context
         * @param {ServerRequest} context.request - Encapsulation of the incoming request
         * @param {ServerResponse} context.response - Encapsulation of the Suitelet response
         * @Since 2015.2
         */
        function onRequest(context) {
          log.debug("11",11);
            var request = context.request;
            var response = context.response;
            var method = request.method;
            var parameters = request.parameters;
            var action = parameters.action;
            if (method == 'POST') {
                if (action == 'doLockBtn') {
                    var id = parameters.id;
                   log.debug("id",id);
                    var resp = dao.doLockProcess(id);
                    log.debug("resp",resp);
                    response.write(JSON.stringify(resp));
                }
            }
        }

        return {
            onRequest: onRequest
        };

    });
