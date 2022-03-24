/**
 * \ *
 * 
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 */

define(['N/search', 'N/ui/serverWidget', 'N/file', 'N/url', 'N/redirect'],
	function(search, ui, file, url, redirect) {
		function onRequest(context) {
			var pid = context.request.parameters.pid;
			var recordType = context.request.parameters.recordType;
			var goToSearchResult = context.request.parameters.goToSearchResult;
			var mrTaskId = context.request.parameters.taskId;

			if (recordType == 'SEARCH') {
				var recordUri = url.resolveScript({
					scriptId: 'customscript_cl_sl_processing_status',
					deploymentId: 'customdeploy_cl_sl_processing_status'
				});
				recordUri += "&pid=" + pid + "&recordType=" + recordType + "&goToSearchResult=T";
			} else {
				var recordUri = url.resolveRecord({
					recordType: recordType,
					recordId: pid,
					isEditMode: false
				});
			}
			if (recordType == 'SEARCH' && goToSearchResult == 'T') {
				redirect.toSavedSearchResult(search.load(pid).id);
			}


			var form = ui.createForm({
				title: '任务状态'
			});
			var statusfields = form.addField({
				id: 'custpage_statusfields',
				type: ui.FieldType.INLINEHTML,
				label: 'Status Fields'
			});

			var backendUri = url.resolveScript({
				scriptId: 'customscript_cl_sl_processing_statusb',
				deploymentId: 'customdeploy_cl_sl_processing_statusb'
			});

			var htmlFile = file.load('SuiteScripts/firstPassReport/CL_PROCESSING_STATUS.html')
			var content = htmlFile.getContents();
			content = content.replace(/\{taskIdString\}/g, mrTaskId);
			content = content.replace(/\{backendUri\}/g, backendUri);
			content = content.replace(/\{recordUri\}/g, recordUri);
			statusfields.defaultValue = content;

			context.response.writePage(form);
		}

		return {
			onRequest: onRequest
		};
	});