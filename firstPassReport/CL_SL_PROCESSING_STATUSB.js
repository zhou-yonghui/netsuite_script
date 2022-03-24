/**
 * \ *
 * 
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 */

define(['N/task'],
	function(task) {
		function onRequest(context) {
			var mrTaskId = context.request.parameters.taskId;
			var taskStatus = task.checkStatus(mrTaskId);
			log.debug({
				title: 'taskStatus',
				details: JSON.stringify(taskStatus)
			});
			var resp = new Object();
			resp.percentage = taskStatus.getPercentageCompleted();
			resp.pendingMapCount = taskStatus.getPendingMapCount();
			resp.totalMapCount = taskStatus.getTotalMapCount();
			resp.totalReduceCount = taskStatus.getTotalReduceCount();
			resp.pendingReduceCount = taskStatus.getPendingReduceCount();
			resp.status = taskStatus.status;
			resp.stage = taskStatus.stage;
			context.response.write(JSON.stringify(resp));
		}

		return {
			onRequest: onRequest
		};
	});