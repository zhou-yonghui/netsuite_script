define(
    ["N/search", "N/record", "N/format", "N/runtime", 'N/http', 'N/https',
        "../../config/const"],

    function (search, record, format, runtime,
              http, https, cuxConst) {


        /**
         * NS调用OMS通用接口
         * @param prefixUrl : 接口调用url后缀
         * @param requestBody : 报文
         * @param itfType : 接口类型(xxxx接口)
         * @param itfDirect : 接口方向(xxx->xxx)
         * @param itfSystem : 接口系统(xxx)
         */
        function invokeOmsWs(prefixUrl, requestBody, itfType, itfDirect, itfSystem) {
            var resp = {
                RETURN_CODE: cuxConst.RETURN_CODE.PENDING,
                RETURN_DATA: "",
                RETURN_MSG: ""
            };
            try {
                var omsItfRresp = getOmsToken();
                if (omsItfRresp.RETURN_CODE == cuxConst.RETURN_CODE.SUCCESS) {
                    var itfObj = omsItfRresp.RETURN_DATA;
                    if (typeof requestBody == "object") {
                        requestBody = JSON.stringify(requestBody);
                    }
                    var requestHead = {};
                    requestHead["Accept"] = "*/*";
                    requestHead["Content-Type"] = "application/json";
                    requestHead["Authorization"] = "Bearer " + itfObj.token;
                    if (itfObj.url.toLowerCase().indexOf("https://") > -1) {
                        var response = https.post({
                            url: (itfObj.url + prefixUrl),
                            headers: requestHead,
                            body: requestBody
                        });
                    } else {
                        var response = http.post({
                            url: (itfObj.url + prefixUrl),
                            headers: requestHead,
                            body: requestBody
                        });
                    }
                    //判断接口返回
                    if (response.code == "200") {
                        resp.RETURN_CODE = cuxConst.RETURN_CODE.SUCCESS;
                        resp.RETURN_DATA = response.body;
                    } else {
                        var errorMessage = "NON-200:NetSuite received a non-200 response code: "
                            + response.code
                            + "errorMessage:"
                            + response.body;
                        resp.RETURN_CODE = cuxConst.RETURN_CODE.ERROR;
                        resp.RETURN_MSG = errorMessage;
                    }
                } else {
                    resp.RETURN_CODE = cuxConst.RETURN_CODE.ERROR;
                    resp.RETURN_MSG = omsItfRresp.RETURN_MSG;
                }
            } catch (e) {
                var errordetails;
                var errorcode = e.name;
                switch (errorcode) {
                    case "SSS_REQUEST_TIME_EXCEEDED":
                        errordetails = "Connection closed because it has exceed the time out period (NetSuite has not received a response after 45 seconds on the request). Executing retry #: ";
                        break;
                    case "SSS_CONNECTION_TIME_OUT":
                        errordetails = "Connection closed because it has exceed the time out period (NetSuite has not received a response after 5 seconds on initial connection). Executing retry #: ";
                        break;
                    case "SSS_CONNECTION_CLOSED":
                        errordetails = "Connection closed because it was unresponsive. Executing retry #: ";
                        break;
                    case "SSS_INVALID_URL":
                        errordetails = "Connection closed because of an invalid URL.  The URL must be a fully qualified HTTP or HTTPS URL if it is referencing a non-NetSuite resource.  The URL cannot contain white space.";
                        break;
                    case "SSS_TIME_LIMIT_EXCEEDED":
                        errordetails = "NetSuite Suitescript execution time limit of 180 seconds exceeded. Exiting script.";
                        break;
                    case "SSS_USAGE_LIMIT_EXCEEDED":
                        errordetails = "NetSuite User Event Suitescript usage limit of 1000 units exceeded. Exiting script.";
                        break;
                    case "SSS_UNKNOWN_HOST":
                        errordetails = "The host you requested is unknown or unavailable";
                        break;
                    case "NON-200":
                        errordetails = e.toString();
                        break;
                    default:
                        errordetails = e + ".  Executing retry #: ";
                }
                resp.RETURN_CODE = cuxConst.RETURN_CODE.ERROR;
                resp.RETURN_MSG = errorcode + "," + errordetails;
            }
            // 接口信息插入接口历史表
            insertWsHis({
                systemFlag: itfSystem,
                direction: itfDirect,
                type: itfType,
                requestData: requestBody,
                responseData: resp.RETURN_DATA,
                status: resp.RETURN_CODE,
                errMsg: resp.RETURN_MSG,
                operator: "",
                memo: ""
            });
            return resp;
        }


        /**
         * 插入WS历史记录表
         *
         * @param options.systemFlag
         *            外围系统标示
         * @param options.direction
         *            接口方向，如 NS->汇联易
         * @param options.type
         *            类型，接口类型标识
         * @param options.requestData
         *            原始请求报文
         * @param options.responseData
         *            响应报文
         * @param options.status
         *            状态 1/2/3/4 <==> 成功/失败/处理中/等待处理
         * @param options.errMsg
         *            错误消息
         * @param options.operator
         *            String，操作人名字,默认取当前操作人
         * @returns options.memo 备注
         *
         */
        function insertWsHis(options) {
            var userName = options.operator;
            if (!userName) {
                var currentUser = runtime.getCurrentUser();
                userName = currentUser ? currentUser.name : null;
            }
            var d = new Date();
            var currentTime = format.format({
                value: d,
                type: "DATETIME",
                timezone: "Asia/Hong_Kong"
            });

            // 创建记录
            var rec = record.create({
                type: 'customrecord_hand_ws_history'
            });
            rec.setValue({
                fieldId: 'custrecord_hwh_system_flag',
                value: options.systemFlag
            });
            rec.setValue({
                fieldId: 'custrecord_hwh_direction',
                value: options.direction
            });
            rec.setValue({
                fieldId: 'custrecord_hwh_syn_time',
                value: currentTime
            });
            rec.setValue({
                fieldId: 'custrecord_hwh_type',
                value: options.type
            });
            rec.setValue({
                fieldId: 'custrecord_hwh_request_data',
                value: typeof options.requestData == "object" ? JSON
                        .stringify(options.requestData).substr(0, 999999)
                    : options.requestData.substr(0, 999999)
            });
            rec.setValue({
                fieldId: 'custrecord_hwh_response_data',
                value: typeof options.responseData == "object" ? JSON
                        .stringify(options.responseData).substr(0, 999999)
                    : options.responseData.substr(0, 999999)
            });
            rec.setValue({
                fieldId: 'custrecord_hwh_status',
                value: options.status
            });
            if (options.errMsg) {
                rec.setValue({
                    fieldId: 'custrecord_hwh_err_msg',
                    value: typeof options.errMsg == "object" ? JSON
                        .stringify(options.errMsg) : options.errMsg
                });
            }
            if (userName) {
                rec.setValue({
                    fieldId: 'custrecord_hwh_operator',
                    value: userName
                });
            }
            rec.setValue({
                fieldId: 'custrecord_hwh_memo',
                value: typeof options.memo == "object" ? JSON
                    .stringify(options.memo) : options.memo
            });
            rec.save();
        }


        /**
         * 获取token信息
         */
        function getOmsToken() {
            var resp = {
                RETURN_CODE: cuxConst.RETURN_CODE.PENDING,
                RETURN_DATA: {},
                RETURN_MSG: ""
            };
            try {
                var itfObj = {};
                var mySearch = search.create({
                    type: 'customrecord_oms_env',
                    columns: [{
                        name: "custrecord_home_url"
                    }, {
                        name: "custrecord_current_env"
                    }, {
                        name: "custrecord_oms_token"
                    }]
                });
                mySearch.filters.push(search.createFilter({
                    name: "custrecord_current_env",
                    operator: search.Operator.IS,
                    values: true
                }));
                mySearch.run().each(function (result) {
                    itfObj.url = result.getValue({
                        name: "custrecord_home_url"
                    });
                    itfObj.token = result.getValue({
                        name: "custrecord_oms_token"
                    });
                });
                resp.RETURN_CODE = cuxConst.RETURN_CODE.SUCCESS;
                resp.RETURN_DATA = itfObj;
            } catch (e) {
                resp.RETURN_CODE = cuxConst.RETURN_CODE.ERROR;
                resp.RETURN_MSG = "获取接口信息失败:" + e.message;
            }
            return resp;
        }

        return {
            invokeOmsWs: invokeOmsWs,
            insertWsHis: insertWsHis
        };

    });
