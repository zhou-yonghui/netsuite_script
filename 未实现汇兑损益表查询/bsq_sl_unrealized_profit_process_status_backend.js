/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(["N/task"], (task) => {
  /**
   * Defines the Suitelet script trigger point.
   * @param {Object} scriptContext
   * @param {ServerRequest} scriptContext.request - Incoming request
   * @param {ServerResponse} scriptContext.response - Suitelet response
   * @since 2015.2
   */
  const onRequest = (scriptContext) => {
    var mrTaskId = scriptContext.request.parameters.taskId;
    var taskStatus = task.checkStatus(mrTaskId);
    var resp = new Object();
    resp.percentage = taskStatus.getPercentageCompleted();
    resp.pendingMapCount = taskStatus.getPendingMapCount();
    resp.totalMapCount = taskStatus.getTotalMapCount();
    resp.totalReduceCount = taskStatus.getTotalReduceCount();
    resp.pendingReduceCount = taskStatus.getPendingReduceCount();
    resp.status = taskStatus.status;
    resp.stage = taskStatus.stage;
    scriptContext.response.write(JSON.stringify(resp));
  };

  return { onRequest };
});
