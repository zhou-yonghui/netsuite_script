/**
 * @NApiVersion 2.1
 */
define(["N/url", "N/https", "N/currentRecord", "N/search"], function (
  url,
  https,
  currentRecord,
  search
) {
  function submitProcess() {
    window.onbeforeunload = function () {};
    var objCurrentRecord = currentRecord.get();
    var form_period_year = objCurrentRecord.getValue("form_period_year");
    var form_period_month = objCurrentRecord.getValue("form_period_month");

    //检查已创建结果
    if (existFirstItemFind(form_period_year, form_period_month) != null) {
      alert(
        form_period_year +
          "年" +
          form_period_month +
          "月报表已存在，不能重复操作"
      );
      return;
    }

    //创建后台任务
    var submitResponse;
    try {
      submitResponse = https.post({
        url: url.resolveScript({
          scriptId: "customscript_bsq_sl_up_submit",
          deploymentId: "customdeploy_bsq_sl_up_submit",
        }),
        body: {
          customScript: "customscript_bsq_mp_up_process",
          title: "未实现损益报表后台任务",
          scriptParam: JSON.stringify(
            (function () {
              return {
                custscript_submit_year: form_period_year,
                custscript_submit_month: form_period_month,
              };
            })()
          ),
        },
      });
    } catch (e) {
      log.error({
        title: "submit post exception",
        details: e.message + "," + e.stack,
      });
      return;
    }

    //显示后台进度
    if (submitResponse.code == 200) {
      location.href =
        "https://" +
        url.resolveDomain({
          hostType: url.HostType.APPLICATION,
        }) +
        url.resolveScript({
          scriptId: "customscript_bsq_sl_up_process_status",
          deploymentId: "customdeploy_bsq_sl_up_process_status",
        }) +
        "&taskId=" +
        submitResponse.body;
    } else {
      alert("创建后台任务失败，请稍后再试。");
    }
  }

  function existFirstItemFind(year, month) {
    var find = null;
    search
      .create({
        type: "customrecord_unrealized_profit",
        filters: [
          ["custrecord_year", "is", year],
          "AND",
          ["custrecord_month", "is", month],
        ],
      })
      .run()
      .each(function (result) {
        find = result;
        return false;
      });
    return find;
  }

  return {
    submitProcess: submitProcess,
  };
});
