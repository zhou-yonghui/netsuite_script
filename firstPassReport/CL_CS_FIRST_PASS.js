/**
 *@NApiVersion 2.x
 */
define(['N/url', 'N/https', 'N/currentRecord', 'N/search'], function (url, https, currentRecord, search) {

    function submitJournal() {
        window.onbeforeunload = function () { };
        var curRec = currentRecord.get();
        var year = curRec.getValue('custpage_year');
        var month = curRec.getValue('custpage_month');
        var bill_data = getData(year, month);
        if (bill_data) {
            alert('本月已进行结转，不能重复操作');
            return;
        }
        // var item = curRec.getValue('custpage_item');
        var scriptParam = new Object();
        scriptParam.custscript_need_year = year;
        scriptParam.custscript_need_month = month;
        // scriptParam.custscript_need_item = item;
        commonSubmitMp('customscript_cl_mp_first_pass', '头程月末结转报表数据处理', scriptParam, 'customsearch_freight_month_search', 'SEARCH');
    }

    function getData(year, month) {
        var bill_id;
        search.create({
            type: 'customrecord_freight_month',
            filters:
                [
                    ['isinactive', 'is', 'F'],
                    'AND',
                    ['custrecord_year77', 'is', year],
                    'AND',
                    ['custrecord_month77', 'is', month]
                ]
        }).run().each(function (result) {
            bill_id = result.id;
            return false;
        });
        return bill_id;
    }

    function commonSubmitMp(script, title, scriptParam, resultId, resultType) {
        var submitMp = url.resolveScript({
            scriptId: 'customscript_cl_sl_common_submit',
            deploymentId: 'customdeploy_cl_sl_common_submit'
        });

        var resp = https.post({
            url: submitMp,
            body: {
                customScript: script,
                title: title,
                scriptParam: JSON.stringify(scriptParam)
            }
        });
        if (resp.code == 200) {
            var domain = url.resolveDomain({
                hostType: url.HostType.APPLICATION
            });
            var mapReduceProcessingStatus = url.resolveScript({
                scriptId: 'customscript_cl_sl_processing_status',
                deploymentId: 'customdeploy_cl_sl_processing_status'
            });
            location.href = "https://" + domain + mapReduceProcessingStatus + "&pid=" +
                resultId + "&recordType=" + resultType + "&taskId=" + resp.body;
        } else {
            alert('提交Map/reduce失败，可能有其它人同步在操作，请稍后再试！');
        }
    }

    return {
        submitJournal: submitJournal
    }
});
