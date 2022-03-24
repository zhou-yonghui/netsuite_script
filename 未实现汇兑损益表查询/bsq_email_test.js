/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(["N/email", "N/runtime", "N/ui/serverWidget"], /**
 * @param{email} email
 * @param{runtime} runtime
 * @param{serverWidget} serverWidget
 */ (email, runtime, serverWidget) => {
  /**
   * Defines the Suitelet script trigger point.
   * @param {Object} scriptContext
   * @param {ServerRequest} scriptContext.request - Incoming request
   * @param {ServerResponse} scriptContext.response - Suitelet response
   * @since 2015.2
   */
  const onRequest = (scriptContext) => {
    var request = scriptContext.request;
    var subjectValue = "test";
    var recipientValue = "";
    var messageValue = "test";
    var buttonLabel = "发送";
    var buttonDisabled = false;

    if (request.method == "POST") {
      var requestParameters = request.parameters;
      var subjectValue = requestParameters.subject;
      var recipientValue = requestParameters.recipient;
      var messageValue = requestParameters.message;
      var msg = {
        author: runtime.getCurrentUser().id,
        recipients: recipientValue,
        subject: subjectValue,
        body: messageValue,
      };
      email.send(msg);
      buttonLabel = "已" + buttonLabel;
      buttonDisabled = true;
    }

    var form = serverWidget.createForm({
      title: "邮件测试",
    });

    var subject = form.addField({
      id: "subject",
      type: serverWidget.FieldType.TEXT,
      label: "主题",
    });
    subject.isMandatory = true;
    // subject.updateLayoutType({
    //   layoutType: serverWidget.FieldLayoutType.OUTSIDE,
    // });
    // subject.updateBreakType({
    //   breakType: serverWidget.FieldBreakType.STARTROW,
    // });

    var recipient = form.addField({
      id: "recipient",
      type: serverWidget.FieldType.EMAIL,
      label: "收件人",
    });
    recipient.isMandatory = true;
    recipient.updateLayoutType({
      layoutType: serverWidget.FieldLayoutType.OUTSIDEBELOW,
    });
    recipient.updateBreakType({
      breakType: serverWidget.FieldBreakType.STARTROW,
    });

    var message = form.addField({
      id: "message",
      type: serverWidget.FieldType.TEXTAREA,
      label: "内容",
    });
    message.isMandatory = true;
    message.updateDisplaySize({
      height: 25,
      width: 100,
    });
    message.updateLayoutType({
      layoutType: serverWidget.FieldLayoutType.OUTSIDEBELOW,
    });
    message.updateBreakType({
      breakType: serverWidget.FieldBreakType.STARTROW,
    });

    form.updateDefaultValues({
      subject: subjectValue,
      recipient: recipientValue,
      message: messageValue,
    });

    var btn = form.addSubmitButton({
      label: buttonLabel,
    });
    btn.isDisabled = buttonDisabled;

    scriptContext.response.writePage(form);
  };

  return { onRequest };
});
