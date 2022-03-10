/**
 * @NApiVersion 2.0
 * @NModuleScope public
 */
define(
		[ "N/search", "N/record", "N/url", "../reportScript/handlebars.min" ],
		function(search, record, url, Handlebars) {
			// 显示进度的样式
			var gHitHtml = '<div id="reportProgress" style="margin-top:15px;font-size:14px;color:#4d5f79;font-weight:bold;">MSG_BODY</div>';

			/**
			 * 根据folder的内部标识和文件名称获得文件的url
			 */
			function getFileUrl(folderId, fileName) {
				var rt = new Object();
				rt["folder"] = "/app/common/media/mediaitemfolders.nl?folder="
						+ folderId;
				var filters = [];
				if (fileName) {
					filters[0] = search.createFilter({
						name : 'name',
						operator : search.Operator.IS,
						values : fileName
					});
				} else {
					return rt;
				}
				filters[1] = search.createFilter({
					name : 'folder',
					operator : search.Operator.IS,
					values : folderId
				});

				var columns = [];
				columns.push(search.createColumn({
					name : 'internalid'
				}));
				columns.push(search.createColumn({
					name : 'url'
				}));

				var mySearch = search.create({
					type : "file",
					columns : columns,
					filters : filters
				});

				mySearch.run().each(function(result) {
					var url = result.getValue({
						name : 'url'
					});
					rt["url"] = url;
					return true;
				});
				return rt;
			}

			/**
			 * Client Script Use Only 显示Map/reduce脚本的运行状态
			 */
			function showReportProcess() {
				var eTaskId = document.getElementById("custpage_rtp_task_id");
				if (eTaskId) {
					window.taskId = eTaskId.value;
					window.reportProgress = document
							.getElementById("reportProgress");
					window.reportUrl = url.resolveScript({
						scriptId : "customscript_customer_task_util_sl",
						deploymentId : "customdeploy_customer_task_util_sl"
					});
					try {
						window.folderId = document
								.getElementById("custpage_folder_id").value;
						window.fileName = document
								.getElementById("custpage_file_name").value;
					} catch (e) {

					}
					window.index = 0;
				}

				if (window.taskId && window.reportProgress && window.reportUrl) {
					window.reportUrl = window.reportUrl
							+ "&action=getPercentageCompleted&taskId="
							+ window.taskId;
					window.processTimer = window.setInterval(function() {
						var req = getAjax(window.reportUrl).responseText;
						var taskStatus;
						try {
							taskStatus = JSON.parse(req);
						} catch (e) {
							console.info(req);
							return;
						}

						var status = taskStatus.status;
						var stage = taskStatus.stage;
						var percent = taskStatus.percent;
						var html = "";
						var endFlag = false;
						if (status == "PROCESSING") {
							html = "请求正在执行中,请稍后...当前节点" + stage + ",进度  "
									+ percent + "%";
						} else if (status == "COMPLETE") {
							html = "请求执行成功。";

							if (window.folderId) {
								var urls = getFileUrl(window.folderId,
										window.fileName);
								html += '您可以<a href="' + urls["folder"]
										+ '">点此</a>查看目录';
								if (urls["url"]) {
									html += ',也可以查看此次请求生成的文件:<br><a href="'
											+ urls["url"] + '">'
											+ window.fileName + '</a>'
								}
							}

							endFlag = true;
						} else if (status == "FAILED") {
							html = "请求执行失败，请查看日志";
							endFlag = true;
						} else {
							html = "等待请求执行..";
						}
						window.reportProgress.innerHTML = html;
						if (endFlag) {
							clearInterval(window.processTimer);
						} else {
							window.index++;
						}
					}, 1000);

				}
			}

			/**
			 * 添加显示进程的组件
			 */
			function addProgressFields(op) {
				var form = op.form;
				form.addFieldGroup({
					id : 'custpage_progress_group',
					label : '运行进度'
				});
				var progress = form.addField({
					id : 'custpage_progress',
					type : 'inlinehtml',
					label : "label",
					container : 'custpage_progress_group'
				}).updateDisplayType({
					displayType : 'inline'
				}).updateDisplaySize({
					height : 25,
					width : 200
				}).updateLayoutType({
					layoutType : 'normal'
				});
				var html = gHitHtml;
				if (op.errMsg) {
					progress.defaultValue = html.replace('MSG_BODY', op.errMsg);
				} else {
					var msgBody = '请求正在运行，请勿刷新界面';
					progress.defaultValue = html.replace('MSG_BODY', msgBody);

					// 1-添加MR脚本的taskId
					form.addField({
						id : 'custpage_rtp_task_id',
						type : 'text',
						label : "rtpTaskId"
					}).updateDisplayType({
						displayType : 'hidden'
					}).defaultValue = op.taskId;

					// 2-添加folder的id
					form.addField({
						id : 'custpage_folder_id',
						type : 'text',
						label : "pathId"
					}).updateDisplayType({
						displayType : 'hidden'
					}).defaultValue = op.folderId;

					// 3-添加预计生成的文件名
					form.addField({
						id : 'custpage_file_name',
						type : 'text',
						label : "pathId"
					}).updateDisplayType({
						displayType : 'hidden'
					}).defaultValue = op.fileName;
				}
				return form;
			}

			/**
			 * 获得已排程运行脚本状态页URL
			 * 
			 * @param customdeployId
			 * @returns
			 */
			function getScheduledScriptStatusPage(customdeployId) {
				try {
					var filters = [];
					filters[0] = search.createFilter({
						name : 'scriptid',
						operator : search.Operator.IS,
						values : customdeployId
					});

					var columns = [];
					columns.push(search.createColumn({
						name : 'internalid'
					}));

					var scriptSearch = search.create({
						type : search.Type.SCRIPT_DEPLOYMENT,
						columns : columns,
						filters : filters
					});

					var pageUrl = "";
					scriptSearch.run().each(function(result) {
						var id = result.getValue({
							name : 'internalid'
						});
						var rec = record.load({
							type : record.Type.SCRIPT_DEPLOYMENT,
							id : id
						});
						pageUrl = rec.getValue({
							fieldId : 'instancestatuspage'
						});
						return false;
					});
					var scheme = 'https://';
					var host = url.resolveDomain({
						hostType : url.HostType.APPLICATION
					});
					pageUrl = pageUrl.replace("http://", "").replace(
							"https://", "");
					return pageUrl;

				} catch (e) {
					return null;
				}
			}

			/**
			 * 根据路径获得文件夹的ID
			 * 
			 * @param path
			 *            eg: SuiteScripts/dp-liquimoly/salesOrder
			 * @returns
			 */
			function getFolderId(path) {
				try {
					var paths = path.split("/");
					if (!paths || paths.length < 1 || !paths[0]
							|| !paths[paths.length - 1])
						return null;

					var filters = [];
					for (var i = 0; i < paths.length; i++) {
						if (i > 0) {
							filters.push("or");
						}
						var filter = [ "name", search.Operator.IS, paths[i] ];
						filters.push(filter);
					}

					var columns = [];
					columns.push(search.createColumn({
						name : 'internalid'
					}));
					columns.push(search.createColumn({
						name : 'parent'
					}));
					columns.push(search.createColumn({
						name : 'name'
					}));

					var folderSearch = search.create({
						type : search.Type.FOLDER,
						columns : columns,
						filters : filters
					});
					var nodes = new Object();
					var count = 0;
					folderSearch.run().each(function(result) {
						var id = result.getValue({
							name : 'internalid'
						});
						var name = result.getValue({
							name : 'name'
						});
						var parent = result.getValue({
							name : 'parent'
						});
						var row = new Object();
						row["name"] = name;
						row["parent"] = parent;
						nodes[id] = row;
						count++;
						return true;
					});
					// 根节点
					var nodePath;
					for (key in nodes) {
						var node = nodes[key];
						if (node["name"] == paths[0] && !node["parent"]) {
							nodePath = key;
							break;
						}
					}
					for (var i = 1; i < paths.length; i++) {
						var findFlag = false;
						var intd = 0;
						for (key in nodes) {
							var node = nodes[key];
							if (node["name"] == paths[i]
									&& node["parent"] == nodePath) {
								nodePath = key;
								findFlag = true;
								break;
							}
							intd++;
						}
						if (!findFlag)
							return null;

					}
					return nodePath;
				} catch (e) {
					return e;
				}
			}

			/**
			 * handlebars编译并加载对象
			 * 
			 * @param html
			 * @param page_object
			 * @returns
			 */
			function renderPage(html, page_object) {
				var template = Handlebars.compile(html);
				return template(page_object);
			}
			
			/**
			 * handlebars编译并加载对象
			 * 
			 * @param html
			 * @param page_object
			 * @returns
			 */
			function renderPageHgh(html, page_object) {
				Handlebars.registerHelper("compare",function(x1,x2,options){
					if(x1==x2){
					　　　//满足条件执行
					　　　return options.fn(this);
					}
					return options.inverse(this)
				});
				var template = Handlebars.compile(html);
				return template(page_object);
			}

			/**
			 * 获得报表的后缀名，如 _20180101123028.xls *
			 * 
			 * @returns
			 */
			function getSuffixName(ext) {
				var date = getDateByTimeZone(8);// 获取东八区的时间
				var year = date.getFullYear();
				var month = date.getMonth() + 1;
				month = month < 10 ? "0" + month : month;
				var day = date.getDate();
				day = day < 10 ? "0" + day : day;
				var hour = date.getHours();
				hour = hour < 10 ? "0" + hour : hour;
				var minute = date.getMinutes();
				minute = minute < 10 ? "0" + minute : minute;
				var second = date.getSeconds();
				second = second < 10 ? "0" + second : second;
				var t = "_" + year + month + day + hour + minute + second + '.'
						+ ext;
				return t;
			}

			/**
			 * 获取该时区的时间
			 * 
			 * @param timeZone：时区，东为正，西为负
			 * @returns Date
			 */
			function getDateByTimeZone(timeZone) {
				var d = new Date();
				var localTime = d.getTime();
				var localOffset = d.getTimezoneOffset() * 60000;
				var utc = localTime + localOffset;
				var offset = timeZone;
				var calctime = utc + (3600000 * offset);
				var nd = new Date(calctime);
				return nd;
			}

			/**
			 * @returns YYYY-MM-DD HH24:Mi:DD
			 */
			function getFormatedTime(date) {
				var year = date.getFullYear();
				var month = date.getMonth() + 1;
				month = month < 10 ? "0" + month : month;
				var day = date.getDate();
				day = day < 10 ? "0" + day : day;
				var hour = date.getHours();
				hour = hour < 10 ? "0" + hour : hour;
				var minute = date.getMinutes();
				minute = minute < 10 ? "0" + minute : minute;
				var second = date.getSeconds();
				second = second < 10 ? "0" + second : second;
				return (year + "-" + month + "-" + day + " " + hour + ':'
						+ minute + ':' + second)
			}

			/**
			 * GET方式调用AJAX --by tao.mei@20171122
			 * 
			 * @param url
			 * @returns
			 */
			function getAjax(url) {
				if (window.XMLHttpRequest) {
					var oAjax = new XMLHttpRequest();
				} else {
					var oAjax = new ActiveXObject("Microsoft.XMLHTTP");// IE6浏览器创建ajax对象
				}
				oAjax.open("GET", url, false);// 把要读取的参数的传过来
				oAjax.send(null);
				var rt = new Object();
				rt['status'] = oAjax.status;
				rt['responseText'] = oAjax.responseText;
				return rt;

			}

			/**
			 * Post方式调用AJAX --by tao.mei@20171122
			 * 
			 * @param url
			 * @param params
			 *            格式 name=jack&age=18
			 * @returns
			 */
			function postAjax(url, params) {
				if (window.XMLHttpRequest) {
					var oAjax = new XMLHttpRequest();
				} else {
					var oAjax = new ActiveXObject("Microsoft.XMLHTTP");// IE6浏览器创建ajax对象
				}
				oAjax.open("POST", url, false);// 把要读取的参数的传过来
				oAjax.setRequestHeader("Content-type",
						"application/x-www-form-urlencoded");
				oAjax.send(params);
				var rt = new Object();
				rt['status'] = oAjax.status;
				rt['responseText'] = oAjax.responseText;
				return rt;

			}
			
			/**
		     * 获得文件夹下的文件ID
		     */
		    function getFileIds(folderId, fileName) {
		        var rt = new Object();
		        var filters = [];
		        filters.push(search.createFilter({
		            name : 'folder',
		            operator : search.Operator.IS,
		            values : folderId
		        }));
		        if (fileName) {
		            filters.push(search.createFilter({
		                name : 'name',
		                operator : search.Operator.IS,
		                values : fileName
		            }));
		        }

		        var columns = [];
		        columns.push(search.createColumn({
		            name : 'internalid'
		        }));
		        columns.push(search.createColumn({
		            name : 'url'
		        }));
		        columns.push(search.createColumn({
		            name : 'name'
		        }));

		        var mySearch = search.create({
		            type : "file",
		            columns : columns,
		            filters : filters
		        });

		        mySearch.run().each(function(result) {
		            var id = result.id;
		            var name = result.getValue("name");
		            rt[id] = name;
		            return true;
		        });
		        return rt;
		    }

			return {
				getFolderId : getFolderId,
				getScheduledScriptStatusPage : getScheduledScriptStatusPage,
				getSuffixName : getSuffixName,
				renderPage : renderPage,
				getDateByTimeZone : getDateByTimeZone,
				showReportProcess : showReportProcess,
				getFormatedTime : getFormatedTime,
				getAjax : getAjax,
				postAjax : postAjax,
				getFileUrl : getFileUrl,
				addProgressFields : addProgressFields,
				renderPageHgh : renderPageHgh,
				getFileIds : getFileIds
			};

		});
