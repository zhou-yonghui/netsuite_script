/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(["N/search", "N/record", "N/task", "../utils/moment"], (
  search,
  record,
  task,
  moment
) => {
  /**
   * Defines the Suitelet script trigger point.
   * @param {Object} scriptContext
   * @param {ServerRequest} scriptContext.request - Incoming request
   * @param {ServerResponse} scriptContext.response - Suitelet response
   * @since 2015.2
   */
  const onRequest = (scriptContext) => {
    //接收输入
    var requestParams = scriptContext.request.parameters;
    var customScript = requestParams.customScript;
    if (customScript == null) {
      scriptContext.response.write("接收错误：表单信息为空。");
      return;
    }
    var title = requestParams.title;
    var scriptParam = JSON.parse(requestParams.scriptParam);

    //查询脚本
    var scriptSearch = search.create({
      type: "script",
      columns: [],
      filters: [["scriptid", "is", customScript]],
    });
    var scriptSearchResult = scriptSearch.run().getRange({
      start: 0,
      end: 1,
    });
    var scriptId = scriptSearchResult[0].id;

    //创建脚本运用
    var recordScript = record.create({
      type: record.Type.SCRIPT_DEPLOYMENT,
      defaultValues: {
        script: scriptId,
      },
      isDynamic: true,
    });
    var now = moment.utc().format("YYYYMMDDHHmmss");
    recordScript.setValue("scriptid", "_" + now.toLowerCase());
    recordScript.setValue("title", title);
    for (var mp_param in scriptParam) {
      recordScript.setValue(mp_param, scriptParam[mp_param]);
    }
    recordScript.setValue("startdate", new Date());
    recordScript.setValue("concurrencylimit", 10);
    var recordScriptId = recordScript.save();

    //创建任务
    var map_reduce_task = task.create({
      taskType: task.TaskType.MAP_REDUCE,
      scriptId: scriptId,
      deploymentId: "customdeploy_" + now,
    });
    var map_reduce_task_id = map_reduce_task.submit();

    //返回任务编号
    log.debug("map_reduce_task_id", map_reduce_task_id);
    scriptContext.response.write(map_reduce_task_id);
  };

  return { onRequest };
});
