/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(["../utils/moment", "N/ui/serverWidget"], /**
 * @param{action} action
 * @param{serverWidget} serverWidget
 */ (moment, serverWidget) => {
  /**
   * Defines the Suitelet script trigger point.
   * @param {Object} scriptContext
   * @param {ServerRequest} scriptContext.request - Incoming request
   * @param {ServerResponse} scriptContext.response - Suitelet response
   * @since 2015.2
   */
  const onRequest = (scriptContext) => {
    //表单
    var form = serverWidget.createForm({
      title: "未实现损益报表用户表单",
    });
    form.clientScriptModulePath = "./bsq_cs_unrealized_profit_form";

    //表单组
    var fieldGroup = form.addFieldGroup({
      id: "form_period_group",
      label: "请选择账期",
    });

    //年
    var year = form.addField({
      id: "form_period_year",
      label: "年度",
      type: serverWidget.FieldType.SELECT,
      container: "form_period_group",
    });
    addYears(year);

    //月
    var month = form.addField({
      id: "form_period_month",
      label: "月份",
      type: serverWidget.FieldType.SELECT,
      container: "form_period_group",
    });
    addMonth(month);

    //按钮
    var btn = form.addButton({
      id: "form_submit",
      label: "提交",
      functionName:
        "submitProcess(" +
        " function(){" +
        "   var btn=document.getElementById('form_submit');" +
        //"   btn.disabled=true;" +
        //"   btn.parentNode.parentNode.className='pgBntGDis';" +
        //"   btn.value='已'+btn.value" +
        "   btn.value='正在跳转...'" +
        " }()" +
        ")",
    });

    //输出
    scriptContext.response.writePage(form);
  };

  function addYears(year) {
    var need_time = moment(new Date(), "YYYY");
    var last_time = need_time.add(-1, "year");
    year.addSelectOption({
      value: last_time.format("YYYY"),
      text: last_time.format("YYYY"),
    });
    var time = moment(new Date(), "YYYY");
    for (var i = 0; i < 10; i++) {
      var m = time.format("YYYY");
      year.addSelectOption({
        value: m,
        text: m,
      });
      time.add(1, "year");
    }
    year.defaultValue = moment(new Date()).format("YYYY");
  }

  function addMonth(month) {
    for (var i = 1; i <= 12; i++) {
      month.addSelectOption({
        value: i,
        text: i,
      });
    }
    month.defaultValue = moment(new Date()).format("MM");
  }

  return { onRequest };
});
