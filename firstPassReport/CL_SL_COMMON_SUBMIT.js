/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 */

define(['N/search', 'N/record', 'N/task', '../utils/moment'],
	function(search, record, task, moment) {
		function onRequest(context) {
			try {
				log.debug({
					title: 'context',
					details: JSON.stringify(context)
				});
				var scriptParam = context.request.parameters.scriptParam;
				var scriptParam = JSON.parse(scriptParam);
				var customScript = context.request.parameters.customScript;
				var title = context.request.parameters.title;

				var mySearch = search.create({
					type: 'script',
					columns: [],
					filters: [
						['scriptid', 'is', customScript]
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
				var now = moment.utc().format('YYYYMMDDHHmmss');
				rec.setValue('scriptid', '_' + now.toLowerCase());
				rec.setValue('title', title);
				for (var i in scriptParam) {
					log.debug({
						title: 'i',
						details: JSON.stringify(i)
					});
					log.debug({
						title: 'scriptParam[i]',
						details: JSON.stringify(scriptParam[i])
					});
					rec.setValue(i, scriptParam[i]);
				}
				// rec.setValue('custscript_lp_id', pid);
				rec.setValue('priority', 1);
				rec.setValue('concurrencylimit', 8);
				rec.setValue('startdate', new Date());
				var recId2 = rec.save();
				var mrTask1 = task.create({
					taskType: task.TaskType.MAP_REDUCE,
					scriptId: scriptId,
					deploymentId: 'customdeploy_' + now,
				});

				var mrTaskId = mrTask1.submit();
				context.response.write(mrTaskId);
			} catch (e) {
				log.error({
					title: 'netsuite error',
					details: e.message + ',' + e.stack
				});
			}
		}

		return {
			onRequest: onRequest
		};
	});