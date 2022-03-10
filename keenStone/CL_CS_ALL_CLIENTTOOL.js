/**
 * 跳转CS质检结果链接
 * @NApiVersion 2.0
 */
define(['N/http', 'N/record', 'N/url'],
    function(http, record, url) {
        return ({
            PurchaseOrderToZJ: function(id) {
                var domain = url.resolveDomain({
                    hostType: url.HostType.APPLICATION
                });
                location.href = "https://" + domain + "/app/common/custom/custrecordentry.nl?rectype=93&poId=" + id;
            },
        });
    });