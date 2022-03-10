/**
 * 提供基础公用方法
 *
 * @NApiVersion 2.x
 * @NModuleScope Public
 */
define(
	[ 'N/search', 'N/format', 'N/runtime', 'N/record',],

	function(search, format, runtime, record) {


		/**
		 * Post方式调用AJAX
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


		return    {
			postAjax : postAjax,
		};

	});