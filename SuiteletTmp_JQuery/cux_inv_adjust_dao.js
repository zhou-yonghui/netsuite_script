/**
 * @Description 自定义库存调整单dao
 */
define(["N/log", "N/search", "N/record", "../../../../config/const", "N/format",
		"../../../../lib/custom/customer_date_util", "../../../../config/url",
		"../../../../lib/custom/customer_ws_util"],

	function (log, search, record, cuxConst, format,
			  dateUtil, cuxUrl, wsUtil) {

		/**
		 * 处理锁库操作
		 * @param id : 单据id
		 */
		function doLockProcess(id) {
			var resp = {
				RETURN_CODE: cuxConst.RETURN_CODE.PENDING,
				RETURN_MSG: ""
			}
			try {
				//1.获取库存调整单行信息
				var lineResp = getInvAdjustLine(id);
				if (lineResp.RETURN_CODE == cuxConst.RETURN_CODE.SUCCESS) {
					var adjustObj = lineResp.RETURN_DATA;
					//2.判断当前单据是否已经锁库
					var lockFlagResp = getLockFlag(adjustObj);
					if (lockFlagResp.RETURN_CODE == cuxConst.RETURN_CODE.SUCCESS) {
						//3.锁库
						var lockResp = doLock(adjustObj);
						if (lockResp.RETURN_CODE == cuxConst.RETURN_CODE.SUCCESS) {
							var lockId = lockResp.RETURN_DATA;
							//4.调用接口
							var invokeResp = doInvokeInterface(adjustObj);
							if (invokeResp.RETURN_CODE == cuxConst.RETURN_CODE.SUCCESS) {
								//5.更新单据
								var updateRresp = doUpdateAdjust(adjustObj, lockId);
								if (updateRresp.RETURN_CODE == cuxConst.RETURN_CODE.SUCCESS) {
									resp.RETURN_CODE = cuxConst.RETURN_CODE.SUCCESS;
								} else {
									//更新失败删除创建的保留单
									var deleteResp = doDelete(lockId);
									if (deleteResp.RETURN_CODE == cuxConst.RETURN_CODE.SUCCESS) {
										//删除成功，这里返回更新失败的信息
										resp.RETURN_CODE = cuxConst.RETURN_CODE.ERROR;
										resp.RETURN_MSG = updateRresp.RETURN_MSG;
									} else {
										//删除失败则拼接错误信息到更新失败信息中
										resp.RETURN_CODE = cuxConst.RETURN_CODE.ERROR;
										resp.RETURN_MSG = updateRresp.RETURN_MSG + "\n" + deleteResp.RETURN_MSG;
									}
								}
							} else {
								//调用失败删除创建的保留单
								var deleteResp = doDelete(lockId);
								if (deleteResp.RETURN_CODE == cuxConst.RETURN_CODE.SUCCESS) {
									//删除成功，这里返回更新失败的信息
									resp.RETURN_CODE = cuxConst.RETURN_CODE.ERROR;
									resp.RETURN_MSG = invokeResp.RETURN_MSG;
								} else {
									//删除失败则拼接错误信息到更新失败信息中
									resp.RETURN_CODE = cuxConst.RETURN_CODE.ERROR;
									resp.RETURN_MSG = invokeResp.RETURN_MSG + "\n" + deleteResp.RETURN_MSG;
								}
							}
						} else {
							resp.RETURN_CODE = cuxConst.RETURN_CODE.ERROR;
							resp.RETURN_MSG = lockResp.RETURN_MSG;
						}
					} else {
						resp.RETURN_CODE = cuxConst.RETURN_CODE.ERROR;
						resp.RETURN_MSG = lockFlagResp.RETURN_MSG;
					}
				} else {
					resp.RETURN_CODE = cuxConst.RETURN_CODE.ERROR;
					resp.RETURN_MSG = lineResp.RETURN_MSG;
				}
			} catch (e) {
				resp.RETURN_CODE = cuxConst.RETURN_CODE.ERROR;
				resp.RETURN_MSG = "处理锁库操作失败:" + e.message;
			}
			return resp;
		}

		/**
		 * 调用接口
		 */
		function doInvokeInterface(adjustObj) {
			var resp = {
				RETURN_CODE: cuxConst.RETURN_CODE.PENDING,
				RETURN_MSG: ""
			};
			try {
				var itfObj = cuxUrl.OMS_OTHER_OUTBOUND;
				//组装报文
				var requestBody = {};
				requestBody["id"] = adjustObj.adjustId;
				requestBody["tranid"] = adjustObj.adjustName;
           requestBody["createdfrom"] = adjustObj.createdfrom;
				requestBody["entity"] = adjustObj.vendor;
				requestBody["orderstatus"] = adjustObj.status;
				requestBody["trandate"] = adjustObj.adjustDate;
				requestBody["po_type"] = adjustObj.adjustType;
				requestBody["poreturn_reasondes"] = adjustObj.poreturn_reasondes;
				requestBody["tuikuan"] = adjustObj.tuikuan;
				requestBody["memo"] = adjustObj.memo;
				requestBody["subsidiary"] = adjustObj.subsidiary;
				requestBody["location"] = adjustObj.location;
				requestBody["department"] = adjustObj.dept;
				requestBody["poItems"] = [];
				var line = adjustObj.line;
				for (var i = 0; i < line.length; i++) {
					requestBody["poItems"].push({
						item: line[i].item,
						unitPrice: line[i].unitPrice,
						quantity: line[i].quantity
					});
				}
				log.debug("源数据", adjustObj);
				log.debug("传递报文", requestBody);
				var invokeResp = wsUtil.invokeOmsWs(itfObj.ITF_URL, requestBody, itfObj.ITF_NAME, itfObj.ITF_DIRECTION,
					itfObj.ITF_SYSTEM);
				log.debug("invokeResp", invokeResp);
				if (invokeResp.RETURN_CODE == cuxConst.RETURN_CODE.SUCCESS) {
					var invokeObj = invokeResp.RETURN_DATA;
					if(typeof invokeObj != "object"){
						invokeObj = JSON.parse(invokeObj);
					}
					if(invokeObj.status){
						resp.RETURN_CODE = cuxConst.RETURN_CODE.SUCCESS;
					}else{
						resp.RETURN_CODE = cuxConst.RETURN_CODE.ERROR;
						resp.RETURN_MSG = invokeObj.result;
					}
				} else {
					resp.RETURN_CODE = cuxConst.RETURN_CODE.ERROR;
					resp.RETURN_MSG = invokeResp.RETURN_MSG;
				}
			} catch (e) {
				resp.RETURN_CODE = cuxConst.RETURN_CODE.ERROR;
				resp.RETURN_MSG = "处理接口调用失败:" + e.message;
			}
			return resp;
		}

		/**
		 * 删除保留单
		 */
		function doDelete(lockId) {
			var resp = {
				RETURN_CODE: cuxConst.RETURN_CODE.PENDING,
				RETURN_MSG: ""
			};
			try {
				var recId = record.delete({
					type: 'inventorystatuschange',
					id: lockId,
				});
				resp.RETURN_CODE = cuxConst.RETURN_CODE.SUCCESS;
			} catch (e) {
				resp.RETURN_CODE = cuxConst.RETURN_CODE.ERROR;
				resp.RETURN_MSG = "删除保留单失败:" + e.message;
			}
			return resp;
		}

		/**
		 * 更新单据
		 */
		function doUpdateAdjust(adjustObj, lockId) {
			var resp = {
				RETURN_CODE: cuxConst.RETURN_CODE.PENDING,
				RETURN_MSG: ""
			};
			try {
				var rec = record.load({
					type: "customrecord_hx_record_predocument",
					id: adjustObj.adjustId,
					isDynamic: true
				});
				//关联锁库单
				rec.setValue({
					fieldId: "custrecord_link_lock_number",
					value: lockId
				});
				var lineCount = rec.getLineCount({
					sublistId: 'recmachcustrecord_adjust_link'
				});
				var line = adjustObj.line;
				for (var i = 0; i < lineCount; i++) {
					rec.selectLine({
						sublistId: 'recmachcustrecord_adjust_link',
						line: i
					});
					var lineId = rec.getCurrentSublistValue({
						sublistId: 'recmachcustrecord_adjust_link',
						fieldId: 'id'
					});
					for (var j = 0; j < line.length; j++) {
						if (lineId == line[j].lineId) {
							//保留数量
							rec.setCurrentSublistValue({
								sublistId: 'recmachcustrecord_adjust_link',
								fieldId: 'custrecord_hx_field_predoc_bcsl',
								value: line[j].quantity
							});
							break;
						}
					}
					rec.commitLine({
						sublistId: 'recmachcustrecord_adjust_link'
					});
				}
				var recId = rec.save();
				resp.RETURN_CODE = cuxConst.RETURN_CODE.SUCCESS;
			} catch (e) {
				resp.RETURN_CODE = cuxConst.RETURN_CODE.ERROR;
				resp.RETURN_MSG = "更新单据失败:" + e.message;
			}
			return resp;
		}

		/**
		 * 锁库
		 */
		function doLock(adjustObj) {
			var resp = {
				RETURN_CODE: cuxConst.RETURN_CODE.PENDING,
				RETURN_DATA: "",
				RETURN_MSG: ""
			};
			try {
				var rec = record.create({
					type: 'inventorystatuschange',
					isDynamic: true
				});
				//子公司
				rec.setValue({
					fieldId: 'subsidiary',
					value: adjustObj.subsidiary
				});
				//地点
				rec.setValue({
					fieldId: 'location',
					value: adjustObj.location
				});
				//日期
				rec.setValue({
					fieldId: 'trandate',
					value: format.parse({
						value: dateUtil.getDateByTimeZone(8),
						type: format.Type.DATE
					})
				});
				//上一个状态 --good
				rec.setValue({
					fieldId: 'previousstatus',
					value: cuxConst.INV_CHANGE_STATUS.GOOD
				});
				//修订状态--hold
				rec.setValue({
					fieldId: 'revisedstatus',
					value: cuxConst.INV_CHANGE_STATUS.HOLD
				});
				//关联单据(调整单)
				rec.setValue({
					fieldId: 'custbody_adjust_link_doc',
					value: adjustObj.adjustId
				});
				var line = adjustObj.line;
				for (var i = 0; i < line.length; i++) {
					rec.selectNewLine({
						sublistId: 'inventory'
					});
					//货品
					rec.setCurrentSublistValue({
						sublistId: 'inventory',
						fieldId: 'item',
						value: line[i].item
					});
					//数量
					rec.setCurrentSublistValue({
						sublistId: 'inventory',
						fieldId: 'quantity',
						value: line[i].quantity
					});
					rec.commitLine({
						sublistId: 'inventory'
					});
				}
				var recId = rec.save();
				resp.RETURN_CODE = cuxConst.RETURN_CODE.SUCCESS;
				resp.RETURN_DATA = recId;
			} catch (e) {
				resp.RETURN_CODE = cuxConst.RETURN_CODE.ERROR;
				resp.RETURN_MSG = "锁库失败:" + e.message;
			}
			return resp;
		}

		/**
		 * 判断当前单据是否已经关联了库存状态变化
		 */
		function getLockFlag(adjustObj) {
			var resp = {
				RETURN_CODE: cuxConst.RETURN_CODE.PENDING,
				RETURN_MSG: ""
			};
			try {
				var linkCount = 0;
				var linkMessage = "";
				var mySearch = search.create({
					type: 'inventorystatuschange',
					columns: [{
						name: "tranid"
					}, {
						name: "custbody_adjust_link_doc"
					}]
				});
				mySearch.filters.push(search.createFilter({
					name: "custbody_adjust_link_doc",
					operator: search.Operator.ANYOF,
					values: adjustObj.adjustId
				}));
				mySearch.filters.push(search.createFilter({
					name: "mainline",
					operator: search.Operator.IS,
					values: true
				}));
				var startIndex = 0;
				var result = mySearch.run().getRange({
					start: startIndex,
					end: startIndex + 1000
				});
				for (var i = 0; i < result.length; i++) {
					var tranid = result[i].getValue({
						name: 'tranid'
					});
					if (linkMessage) {
						linkMessage = "重复锁库,对应锁库单号:" + tranid + ";";
					} else {
						linkMessage = linkMessage + "\n" + "重复锁库,对应锁库单号:" + tranid + ";";
					}
					linkCount++;
				}
				if (linkCount == 0) {
					resp.RETURN_CODE = cuxConst.RETURN_CODE.SUCCESS;
				} else {
					resp.RETURN_CODE = cuxConst.RETURN_CODE.ERROR;
					resp.RETURN_MSG = linkMessage;
				}
			} catch (e) {
				resp.RETURN_CODE = cuxConst.RETURN_CODE.ERROR;
				resp.RETURN_MSG = "判断当前单据是否锁库失败:" + e.message;
			}
			return resp;
		}

		/**
		 * 获取当前单据库存调整行信息
		 */
		function getInvAdjustLine(id) {
			var resp = {
				RETURN_CODE: cuxConst.RETURN_CODE.PENDING,
				RETURN_DATA: {},
				RETURN_MSG: ""
			};
			try {
				var adjustObj = {};
				var rtn = {};
				var mySearch = search.create({
					type: 'customrecord_hx_record_predocument',
					columns: [{
						name: "name"
					}, {
						name: "custrecord_hx_field_predoc_date"
					}, {
						name: "custrecord_hx_field_predoc_po"
					}, {
						name: "custrecord_hx_field_predoc_subsidiary"
					}, {
						name: "custrecord_hx_field_predoc_location"
					}, {
						name: "internalid",
						join: "custrecord_adjust_link"
					}, {
						name: "custrecord_hx_field_predoc_item",
						join: "custrecord_adjust_link"
					}, {
						name: "custrecord_hx_field_predoc_quantity",
						join: "custrecord_adjust_link"
					}, {
						name: "custrecord_hx_field_predoc_kh"
					}, {
						name: "custrecord_hx_field_predoc_status"
					}, {
						name: "custrecord_hx_field_predoc_bz"
					}, {
						name: "custrecord_hx_field_predoc_bm"
					}, {
						name: "custrecord_hx_field_predoc_supplier"
					}, {
						name: "custrecord_hx_field_predoc_reason"
					}, {
						name: "custrecord_hx_field_predoc_type"
					}, {
						name: "custrecord_hx_field_predoc_price",
						join : "custrecord_adjust_link"
					},{
						name : "custrecord_hx_field_predoc_no_return"
					}]
				});
				mySearch.filters.push(search.createFilter({
					name: "internalid",
					operator: search.Operator.ANYOF,
					values: id
				}));
				var startIndex = 0;
				var result = mySearch.run().getRange({
					start: startIndex,
					end: startIndex + 1000
				});
				for (var i = 0; i < result.length; i++) {
					//单据Id
					var adjustId = result[i].id;
					//单据编号
					var adjustName = result[i].getValue({
						name: 'name'
					});
					//获取采购单号
                    var createdfrom = result[i].getValue({
                        name: 'custrecord_hx_field_predoc_po'
                    });
                    try {
                        if( createdfrom!=null&&createdfrom!="" ){
                            var recBill = record.load({
                                type: "purchaseorder",
                                id: createdfrom
                            });
                            createdfrom = recBill.getValue("tranid"); // po 单号
                        }
                    } catch (e) {
                        log.error({
                            title: "错误！！",
                            details: e.message + "," + e.stack,
                        })
                    }
					//单据日期
					var adjustDate = result[i].getValue({
						name: 'custrecord_hx_field_predoc_date'
					});
					adjustDate = adjustDate.replace(/\//g, '-');
					//子公司
					var subsidiary = result[i].getValue({
						name: 'custrecord_hx_field_predoc_subsidiary'
					});
					//地点
					var location = result[i].getValue({
						name: 'custrecord_hx_field_predoc_location'
					});
					//供应商
					var vendor = result[i].getValue({
						name: 'custrecord_hx_field_predoc_supplier'
					});
					//状态
					var status = result[i].getValue({
						name: 'custrecord_hx_field_predoc_status'
					});
					//备注
					var memo = result[i].getValue({
						name: 'custrecord_hx_field_predoc_bz'
					});
					//是否退款不退货
					var tuikuan = result[i].getValue({
						name: 'custrecord_hx_field_predoc_no_return'
					});
					//部门
					var dept = result[i].getValue({
						name: 'custrecord_hx_field_predoc_bm'
					});
					//退货理由
					var poreturn_reasondes = result[i].getValue({
						name: 'custrecord_hx_field_predoc_reason'
					});
					//退货类型
					var adjustType = result[i].getText({
						name: 'custrecord_hx_field_predoc_type'
					});
					//行内部标识
					var lineId = result[i].getValue({
						name: "internalid",
						join: "custrecord_adjust_link"
					});
					//调整货品
					var item = result[i].getValue({
						name: "custrecord_hx_field_predoc_item",
						join: "custrecord_adjust_link"
					});
					//调整数量
					var quantity = result[i].getValue({
						name: "custrecord_hx_field_predoc_quantity",
						join: "custrecord_adjust_link"
					});
					//单价
					var unitPrice = result[i].getValue({
						name: "custrecord_hx_field_predoc_price",
						join: "custrecord_adjust_link"
					});
					if (rtn[adjustId]) {
						rtn[adjustId]["line"].push({
							lineId: lineId,
							item: item,
							quantity: quantity
						});
					} else {
						rtn[adjustId] = {};
						rtn[adjustId]["adjustId"] = adjustId;
						rtn[adjustId]["adjustName"] = adjustName;
						rtn[adjustId]["createdfrom"] = createdfrom;
						rtn[adjustId]["adjustDate"] = adjustDate;
						rtn[adjustId]["subsidiary"] = subsidiary;
						rtn[adjustId]["location"] = location;
						rtn[adjustId]["vendor"] = vendor;
						rtn[adjustId]["status"] = status;
						rtn[adjustId]["memo"] = memo;
						rtn[adjustId]["tuikuan"] = tuikuan;
						rtn[adjustId]["dept"] = dept;
						rtn[adjustId]["poreturn_reasondes"] = poreturn_reasondes;
						rtn[adjustId]["adjustType"] = adjustType;
						rtn[adjustId]["line"] = [];
						rtn[adjustId]["line"].push({
							lineId: lineId,
							item: item,
							unitPrice: unitPrice,
							quantity: quantity
						});
					}
				}
				for (var key in rtn) {
					adjustObj = rtn[key];
				}
				resp.RETURN_CODE = cuxConst.RETURN_CODE.SUCCESS;
				resp.RETURN_DATA = adjustObj;
			} catch (e) {
				resp.RETURN_CODE = cuxConst.RETURN_CODE.ERROR;
				resp.RETURN_MSG = "获取行信息失败:" + e.message;
			}
			return resp;
		}

		return {
			doLockProcess: doLockProcess
		};

	});
