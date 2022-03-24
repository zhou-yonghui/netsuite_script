/**
 * NS_UTIL_FUNCTION.js
 * @NModuleScope Public
 * @NApiVersion 2.x
 */
define(
	['N/https', 'N/search', 'N/runtime', 'N/url', 'N/record', '../utils/moment', 'N/task'],
	function (https, search, runtime, url, record, moment, task) {
		/**
		 * 根据提供的货币及日期得到系统设定里的汇率
		 */
		function getCurrencyExchangeRate(basecurrency, sourcecurrency, effectivedate) {
			var mySearch = search.create({
				type: search.Type.CURRENCY_EXCHANGE_RATE,
				columns: ['transactioncurrency', 'basecurrency', 'exchangerate', {
					name: 'effectivedate',
					sort: 'DESC'
				}]
			});
			var filters = [];
			if (sourcecurrency) {
				if (filters.length > 0) {
					filters[filters.length] = 'AND';
				}
				filters[filters.length] = ['transactioncurrency.symbol', 'is', sourcecurrency]
			}
			if (basecurrency) {
				if (filters.length > 0) {
					filters[filters.length] = 'AND';
				}
				filters[filters.length] = ['basecurrency.symbol', 'is', basecurrency]
			}
			if (effectivedate) {
				if (filters.length > 0) {
					filters[filters.length] = 'AND';
				}
				filters[filters.length] = ['effectivedate', 'onorbefore', effectivedate]
			} else {
				filters[filters.length] = 'AND';
				filters[filters.length] = ['effectivedate', 'onorbefore', 'today'];
			}

			log.debug({
				title: 'filters',
				details: JSON.stringify(filters)
			});
			if (filters.length > 0) {
				mySearch.filterExpression = filters;
			}
			var results = mySearch.run().getRange({
				start: 0,
				end: 1
			});
			log.debug({
				title: 'results',
				details: JSON.stringify(results)
			});
			if (results.length > 0) {
				return results[0].getValue('exchangerate')
			}
		}

		/*
		 * 得到当前用户的日期格式设定
		 */
		function getUserDateFormat() {
			var dateFormat = runtime.getCurrentUser().getPreference('DATEFORMAT');
			return dateFormat;
		}

		function commonSubmitMp(script, title, scriptParam, num) {
			var mySearch = search.create({
				type: 'script',
				columns: [],
				filters: [
					['scriptid', 'is', script]
				]
			});
			var results = mySearch.run().getRange({
				start: 0,
				end: 1
			});
			var scriptId = results[0].id;

			var rec = record.create({
				type: record.Type.SCRIPT_DEPLOYMENT,
				defaultValues: {
					script: scriptId //TODO
				},
				isDynamic: true
			});
			var now = moment.utc().format('YYYYMMDDHHmmssSSSS');
			rec.setValue('scriptid', '_' + now.toLowerCase());
			rec.setValue('title', title);
			var num_limit = num ? num : 1;
			rec.setValue('concurrencylimit', num_limit);//并发数量
			for (var i in scriptParam) {
				rec.setValue(i, scriptParam[i]);
			}
			rec.setValue('startdate', new Date());
			var recId2 = rec.save();
			var mrTask1 = task.create({
				taskType: task.TaskType.MAP_REDUCE,
				scriptId: scriptId,
				deploymentId: 'customdeploy_' + now,
			});

			var mrTaskId = mrTask1.submit();
			return mrTask1;
		}
		return {
			getUserDateFormat: getUserDateFormat,
			getCurrencyExchangeRate: getCurrencyExchangeRate,
			commonSubmitMp: commonSubmitMp
		};
	});