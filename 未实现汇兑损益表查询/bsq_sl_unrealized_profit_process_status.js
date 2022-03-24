/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(["N/url", "N/redirect", "N/search", "N/ui/serverWidget", "N/file"], (
  url,
  redirect,
  search,
  serverWidget,
  file
) => {
  /**
   * Defines the Suitelet script trigger point.
   * @param {Object} scriptContext
   * @param {ServerRequest} scriptContext.request - Incoming request
   * @param {ServerResponse} scriptContext.response - Suitelet response
   * @since 2015.2
   */
  const onRequest = (scriptContext) => {
    var params = scriptContext.request.parameters;
    var mrTaskId = params.taskId;
    var recordUri =
      "https://6797408.app.netsuite.com/app/common/custom/custrecordentrylist.nl?rectype=245&whence=";

    var form = serverWidget.createForm({
      title: "创建未实现损益方案报表-任务状态",
    });
    var statusfields = form.addField({
      id: "custpage_statusfields",
      type: serverWidget.FieldType.INLINEHTML,
      label: "Status Fields",
    });

    var backendUri = url.resolveScript({
      scriptId: "customscript_bsq_sl_up_ps_backend",
      deploymentId: "customdeploy_bsq_sl_up_ps_backend",
    });

    var htmlFile = file.load(
      "SuiteScripts/unrealizedProfitReport/bsq_ui_unrealized_profit_process_status.html"
    );

    var content = htmlFile.getContents();
    content = content.replace(/\{taskIdString\}/g, mrTaskId);
    content = content.replace(/\{backendUri\}/g, backendUri);
    content = content.replace(/\{recordUri\}/g, recordUri);
    statusfields.defaultValue = content;

    scriptContext.response.writePage(form);
  };

  return { onRequest };
});
