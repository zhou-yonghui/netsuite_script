/**
 * omsRequester.js
 * @NModuleScope Public
 * @NAmdConfig ./configuration.json
 * @NApiVersion 2.x
 */
define(
	['N/http','N/https', 'N/search','N/record'],
	function(http,https, search,record) {
		function getBaseUrl() {
			return getEnv() + '/api';
		}

		function getEnv() {
			var mySearch = search.create({
				type: 'customrecord_oms_env',
				columns: ['custrecord_home_url'],
				filters: [
					['custrecord_current_env', 'is', 'T']
				]
			});
			var results = mySearch.run().getRange({
				start: 0,
				end: 1
			});
			return results[0].getValue('custrecord_home_url');
		}

		function getToken() {
			var mySearch = search.create({
				type: 'customrecord_oms_env',
				columns: ['custrecord_oms_token'],
				filters: [
					['custrecord_current_env', 'is', 'T']
				]
			});
			var results = mySearch.run().getRange({
				start: 0,
				end: 1
			});
			return results[0].getValue('custrecord_oms_token');
		}
		function callToken() {
			var baseurl = getBaseUrl();
			var resp;
			if(baseurl.indexOf("https") > -1){
				resp = https.post({
					url: baseurl + "/poros-authcenter/oauth/token?grant_type=username&username=ns_user",
					headers: {
						"Authorization": 'Basic ' + "bnM6bnMtb21z",
						"Content-Type": 'application/json',
						"Accept": "*/*"
					},
					body:"token"
				});
			}else{
				resp = http.post({
					url: baseurl + "/poros-authcenter/oauth/token?grant_type=username&username=ns_user",
					headers: {
						"Authorization": 'Basic ' + "bnM6bnMtb21z",
						"Content-Type": 'application/json',
						"Accept": "*/*"
					},
					body:"token"
				});
			}
			try {
				if (resp.code == 200) {
					resp = JSON.parse(resp.body);
					if (resp.success) {
						return {
							returnCode: 0,
							returnObject: resp.data.accessToken
						};
					} else {
						return {
							returnCode: 1,
							returnObject: resp.msg
						};
					}
				} else {
					log.debug("获取token出错")
					return {
						returnCode: resp.code,
						returnObject: JSON.stringify(resp.body)
					};
				}
			} catch (e) {
				log.error({
					title: '获取TOKEN出错',
					details: e.message + ',' + e.stack
				});
				return {
					returnCode: 2,
					returnObject: e.message + ',' + e.stack
				};
			}
		}

		function numberGenerator(type, requestPayload) {
			var urlPath = '/numbering/generateNumber?numberingType=' + type;
			return callOmsRequest(urlPath, requestPayload, 'POST');
		}

		function callOmsRequest(urlPath, requestPayload, httpMethod) {
			var token;
			var tokenObj;
			token = getToken()
			if(!token){
				tokenObj = callToken();
				if(tokenObj.returnCode != '0'){
					return {
						returnCode: tokenObj.returnCode,
						returnObject: tokenObj.returnObject
					};
				}
				token = tokenObj.returnObject;
			}
			log.debug("token",token)
			var callobj = call(urlPath, requestPayload, httpMethod,token)
			if(callobj.returnCode == 401){
				tokenObj = callToken();
				if(tokenObj.returnCode != '0'){
					return {
						returnCode: tokenObj.returnCode,
						returnObject: tokenObj.returnObject
					};
				}
				token = tokenObj.returnObject;
				// 更新环境信息token
				pushToken(token);
				return call(urlPath, requestPayload, httpMethod,token)
			}else{
				return callobj;
			}
		}

		function call(urlPath, requestPayload, httpMethod,token){ // flag : 是否使用保留的token
			var resp;
			try {
				var baseUrl = getBaseUrl();
				if (httpMethod == 'GET') {
					if(baseUrl.indexOf("https") > -1){
						resp = https.get({
							url: baseUrl + urlPath,
							headers: {
								"Authorization": 'bearer ' + token,
								"Content-Type": 'application/json',
								"Accept": "*/*"
							}
						});
					}else{
						resp = http.get({
							url: baseUrl + urlPath,
							headers: {
								"Authorization": 'bearer ' + token,
								"Content-Type": 'application/json',
								"Accept": "*/*"
							}
						});
					}

				} else if (httpMethod == 'POST') {
					log.debug({
						title: 'url',
						details: baseUrl + urlPath
					})
					if(baseUrl.indexOf("https") > -1){
						resp = https.post({
							url: baseUrl + urlPath,
							headers: {
								"Authorization": 'bearer ' + token,
								"Content-Type": 'application/json',
								"Accept": "*/*"
							},
							body: JSON.stringify(requestPayload)
						});
					}else{
						resp = http.post({
							url: baseUrl + urlPath,
							headers: {
								"Authorization": 'bearer ' + token,
								"Content-Type": 'application/json',
								"Accept": "*/*"
							},
							body: JSON.stringify(requestPayload)
						});
					}

				}
				var body = JSON.parse(resp.body);
				log.debug("resp-->body",body)
				if (resp.code == 200) {
					if(body.code == 401){
						return {
							returnCode: 401,
							returnObject: body.msg,
							resp:resp
						};
					}
					if (body.success) {
						return {
							returnCode: 0,
							returnObject: body,
							resp:resp
						};
					} else {
						return {
							returnCode: 1,
							returnObject: body.msg,
							resp:resp
						};
					}
				} else {
					return {
						returnCode: body.code,
						returnObject: body,
						resp:resp
					};
				}
			} catch (e) {
				log.error({
					title: '请求接口出错',
					details: e.message + ',' + e.stack
				});
				return {
					returnCode: 2,
					returnObject: e.message + ',' + e.stack,
					resp:""
				};
			}
		}
		function pushToken(token){
			var mySearch = search.create({
				type: 'customrecord_oms_env',
				filters: [
					['custrecord_current_env', 'is', 'T']
				]
			});
			var results = mySearch.run().getRange({
				start: 0,
				end: 1
			});
			record.submitFields({
				type: "customrecord_oms_env",
				id: results[0].id,
				values: {
					custrecord_oms_token: token
				},
			});
		}
		return {
			getToken: getToken,
			callOmsRequest: callOmsRequest,
			numberGenerator: numberGenerator,
			getEnv: getEnv
		};
	});