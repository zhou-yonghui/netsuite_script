/**
 * 公共方法
 */
define(
	['N/record', 'N/search','N/runtime'],
	function(record, search,runtime) {

		/**
		 * @param options
		 * {
		 *     createBy:创建人(为空时 自动获取当前用户)
		 *     scene:推送场景 （查看：https://6797408-sb1.app.netsuite.com/app/common/custom/custrecordentrylist.nl?rectype=200）
		 *     request：请求信息
		 *	   response: 响应信息
		 *	   info:报错短信息（如果有明显的简短信息）
		 *	   handleStatus:后续处理状态(待处理、正在处理、已处理、错误处理)
		 *	   handleResult:后续处理结果
		 *	   pelStatus:成功状态(true、false)
		 *	   type:接口方向(IN、OUT)
		 * }
		 */
		function pushLog(options) {
			try {
				var userName = options.createBy;
				if (!userName) {
					var currentUser = runtime.getCurrentUser();
					userName = currentUser ? currentUser.id : null;
				}
				var logRec = record.create({
					type: "customrecord_hg_hs_push_err_log",
					isDynamic: true
				});
				if (options.scene) {
					logRec.setText("custrecord_hg_pel_scene",options.scene); // 推送场景
				}
				if (userName && userName != -4) {
					logRec.setValue("custrecord_hg_pel_create_by",userName);//操作人
				}
				logRec.setValue("custrecord_hg_pel_data",JSON.stringify(options.request));//请求信息
				logRec.setValue("custrecord_hg_pel_err_data",JSON.stringify(options.response));//响应信息
				logRec.setValue("custrecord_hg_pel_err_data_info",JSON.stringify(options.info));//报错短信息（如果有明显的简短信息）
				if (options.handleStatus) {
					logRec.setText("custrecord_hg_pel_handle_status",options.handleStatus);//后续处理状态
				}
				logRec.setValue("custrecord_hg_pel_handle_result",options.handleResult);//后续处理结果
				if (options.pelStatus) {
					logRec.setValue("custrecord_hg_pel_status",options.pelStatus);//成功状态
				}
				if (options.type) {
					logRec.setText("custrecord_interface_type",options.type);//接口方向
				}
				logRec.save()
				// log.debug("提交日志","暂时不保存日志")
			} catch (e) {
				log.debug("提交日志出错",e.message+","+ e.stack)
			}
		}

		return {
			pushLog: pushLog
		};
	});